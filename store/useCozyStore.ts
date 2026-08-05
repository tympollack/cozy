import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PrivacyTier = 'random' | 'geofenced';

/** Canonical vibe statuses — mirrors the DB CHECK constraint. */
export type VibeStatus = 'sunshine' | 'neutral' | 'raincloud';

/** A single sticker attached to a post, as returned by fetch_feed. */
export interface PostSticker {
  id: string;
  sticker_url: string;
  cost: number;
  /** Fraction of opacity lost per day (e.g. 0.05 = 5%/day). */
  decay_rate_per_day: number;
  placed_at: string;
  /** Reset to NOW() on every Re-Up — the decay baseline. */
  last_reup_at: string;
  placed_by_user_id: string;
  /** Horizontal center position as % of the post container width. */
  x_percent: number;
  /** Vertical center position as % of the post container height. */
  y_percent: number;
  /** CSS rotation in degrees. */
  rotation_degrees: number;
}

export interface ItemPin {
  id: string;
  user_id: string;
  x_percent: number;
  y_percent: number;
  title: string;
  url: string;
}

/** Shape of a single post returned by the feed action (privacy-safe). */
export interface FeedPost {
  id: string;
  user_id: string;
  light_img_url: string;
  dark_img_url: string;
  /** Geohash precision 4 (~45km cell). Never exact coordinates. */
  obfuscated_location_hash: string | null;
  cheer_count: number;
  /** Whether the current user has already cheered this post. */
  has_cheered: boolean;
  /** True if the post owner has been flagged by moderation. */
  is_toxic: boolean;
  /** Stickers currently attached to this post. */
  stickers: PostSticker[];
  /** Pins currently attached to this post. */
  item_pins: ItemPin[];
  created_at: string;
  claimed_by_user_id?: string | null;
  verification_status?: string;
  shell_slot?: string | null;
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

/** A user's own post as returned by get_user_posts. */
export type UserPost = Omit<FeedPost, 'has_cheered' | 'is_toxic'>;

interface CozyState {
  // --- Economy ---
  points: number;
  addPoints: (n: number) => void;
  setPoints: (n: number) => void;

  // --- Onboarding ---
  hasSeenOnboarding: boolean;
  completeOnboarding: () => void;

  // --- Feed ---
  feed: FeedPost[];
  feedCursor: string | null;
  setFeed: (posts: FeedPost[]) => void;
  appendFeed: (posts: FeedPost[]) => void;
  removeFromFeed: (id: string) => void;
  setFeedCursor: (cursor: string | null) => void;
  markCheered: (postId: string) => void;
  /** Optimistically update a single sticker's last_reup_at after a re-up. */
  updateStickerReup: (postId: string, stickerId: string, newReupAt: string) => void;

  // --- Profile ---
  userPosts: UserPost[];
  setUserPosts: (posts: UserPost[]) => void;

  // --- Groups ---
  /** UUID of the group (pool) this user currently belongs to. Null for solo users. */
  groupId: string | null;
  /**
   * Emotional status for the Vibe Check mechanic.
   * Mirrors the DB CHECK constraint: 'sunshine' | 'neutral' | 'raincloud'.
   */
  vibeStatus: VibeStatus;
  /**
   * The group's shared pooled_points balance.
   * Null when the user has no group (solo).
   */
  groupPoints: number | null;
  setGroupId: (id: string | null) => void;
  setVibeStatus: (status: VibeStatus) => void;
  setGroupPoints: (n: number | null) => void;
  /** Optimistically increment the group pool after a co-op bonus cheer. */
  addGroupPoints: (n: number) => void;

  // --- Group notifications ---
  /**
   * Per-group notification opt-in map.
   * Key: group UUID — Value: true (enabled) | false (muted).
   * Groups absent from the map default to enabled (opt-out model).
   */
  groupNotifications: Record<string, boolean>;
  /** Toggle notifications on/off for a specific group. */
  toggleGroupNotifications: (groupId: string) => void;
  /** Returns whether notifications are enabled for a group (defaults to true). */
  isGroupNotificationsEnabled: (groupId: string) => boolean;
  /** Remove a group's notification preference (e.g. after leaving the group). */
  clearGroupNotificationPref: (groupId: string) => void;
}

// ---------------------------------------------------------------------------
// Store
// Wrapped in `persist` middleware so the point balance survives page refreshes
// via localStorage. The feed is ephemeral — reset on mount.
// ---------------------------------------------------------------------------

export const useCozyStore = create<CozyState>()(
  persist(
    (set, get) => ({
      // --- Economy ---
      points: 0,
      addPoints: (n) => set((s) => ({ points: s.points + n })),
      setPoints: (n) => set({ points: n }),

      // --- Onboarding ---
      hasSeenOnboarding: false,
      completeOnboarding: () => set({ hasSeenOnboarding: true }),

      // --- Feed ---
      feed: [],
      feedCursor: null,
      setFeed: (posts) => set({ feed: posts }),
      appendFeed: (posts) =>
        set((s) => ({
          feed: [
            ...s.feed,
            // Deduplicate by id in case of overlapping cursors
            ...posts.filter((p) => !s.feed.some((existing) => existing.id === p.id)),
          ],
        })),
      removeFromFeed: (id) =>
        set((s) => ({ feed: s.feed.filter((p) => p.id !== id) })),
      setFeedCursor: (cursor) => set({ feedCursor: cursor }),
      markCheered: (postId) =>
        set((s) => ({
          feed: s.feed.map((p) =>
            p.id === postId
              ? { ...p, has_cheered: true, cheer_count: p.cheer_count + 1 }
              : p
          ),
        })),
      updateStickerReup: (postId, stickerId, newReupAt) =>
        set((s) => ({
          feed: s.feed.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  stickers: p.stickers.map((st) =>
                    st.id === stickerId
                      ? { ...st, last_reup_at: newReupAt }
                      : st
                  ),
                }
              : p
          ),
        })),

      // --- Profile ---
      userPosts: [],
      setUserPosts: (posts) => set({ userPosts: posts }),

      // --- Groups ---
      groupId: null,
      vibeStatus: 'neutral',
      groupPoints: null,
      setGroupId: (id) => set({ groupId: id }),
      setVibeStatus: (status) => set({ vibeStatus: status }),
      setGroupPoints: (n) => set({ groupPoints: n }),
      addGroupPoints: (n) =>
        set((s) => ({
          // Guard: if the user is solo (groupPoints is null), the co-op
          // bonus should never be dispatched, but we protect defensively.
          groupPoints: s.groupPoints !== null ? s.groupPoints + n : null,
        })),

      // --- Group notifications ---
      groupNotifications: {},
      toggleGroupNotifications: (groupId) =>
        set((s) => ({
          groupNotifications: {
            ...s.groupNotifications,
            // Absent keys default to true (enabled), so first toggle → false (muted).
            [groupId]: !(s.groupNotifications[groupId] ?? true),
          },
        })),
      isGroupNotificationsEnabled: (groupId) =>
        // Read current state without subscribing — safe to call outside React.
        get().groupNotifications[groupId] ?? true,
      clearGroupNotificationPref: (groupId) =>
        set((s) => {
          const next = { ...s.groupNotifications };
          delete next[groupId];
          return { groupNotifications: next };
        }),
    }),
    {
      name: 'cozy-store',
      storage: createJSONStorage(() => localStorage),
      // Persist economy, onboarding, group, and notification prefs.
      // Feed is intentionally excluded — it must re-fetch fresh on mount.
      partialize: (state) => ({
        points: state.points,
        hasSeenOnboarding: state.hasSeenOnboarding,
        groupId: state.groupId,
        vibeStatus: state.vibeStatus,
        groupPoints: state.groupPoints,
        groupNotifications: state.groupNotifications,
      }),
    }
  )
);

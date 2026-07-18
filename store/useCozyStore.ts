import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PrivacyTier = 'random' | 'geofenced';

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
  created_at: string;
  claimed_by_user_id?: string | null;
  verification_status?: string;
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
}

// ---------------------------------------------------------------------------
// Store
// Wrapped in `persist` middleware so the point balance survives page refreshes
// via localStorage. The feed is ephemeral — reset on mount.
// ---------------------------------------------------------------------------

export const useCozyStore = create<CozyState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'cozy-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist the economy and onboarding state — not the feed (it should re-fetch fresh)
      partialize: (state) => ({ 
        points: state.points,
        hasSeenOnboarding: state.hasSeenOnboarding
      }),
    }
  )
);

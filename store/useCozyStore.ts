import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PrivacyTier = 'random' | 'geofenced';

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
  created_at: string;
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface CozyState {
  // --- Economy ---
  points: number;
  addPoints: (n: number) => void;
  setPoints: (n: number) => void;

  // --- Feed ---
  feed: FeedPost[];
  feedCursor: string | null;
  setFeed: (posts: FeedPost[]) => void;
  appendFeed: (posts: FeedPost[]) => void;
  removeFromFeed: (id: string) => void;
  setFeedCursor: (cursor: string | null) => void;
  markCheered: (postId: string) => void;
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
    }),
    {
      name: 'cozy-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist the economy — not the feed (it should re-fetch fresh)
      partialize: (state) => ({ points: state.points }),
    }
  )
);

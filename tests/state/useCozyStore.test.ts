import { describe, it, expect, beforeEach } from 'vitest';
import { useCozyStore, FeedPost, UserPost } from '@/store/useCozyStore';

describe('Zustand State Machine (Scope B - useCozyStore)', () => {
  beforeEach(() => {
    localStorage.clear();
    useCozyStore.setState({
      points: 0,
      hasSeenOnboarding: false,
      hasSeenStickerTutorial: false,
      feed: [],
      feedCursor: null,
      userPosts: [],
      expansionTier: 1,
      milestoneTokens: 0,
      themesUnlocked: false,
      groupId: null,
      vibeStatus: 'neutral',
      lastVibeCheckDate: null,
      groupPoints: null,
      groupNotifications: {},
    });
  });

  describe('Points & Economy State', () => {
    it('initializes with 0 points and updates via setPoints and addPoints', () => {
      const store = useCozyStore.getState();
      expect(store.points).toBe(0);

      store.setPoints(50);
      expect(useCozyStore.getState().points).toBe(50);

      store.addPoints(15);
      expect(useCozyStore.getState().points).toBe(65);
    });
  });

  describe('Onboarding & Tutorial Flags', () => {
    it('marks onboarding and sticker tutorials as completed', () => {
      const store = useCozyStore.getState();
      expect(store.hasSeenOnboarding).toBe(false);
      expect(store.hasSeenStickerTutorial).toBe(false);

      store.completeOnboarding();
      expect(useCozyStore.getState().hasSeenOnboarding).toBe(true);

      store.completeStickerTutorial();
      expect(useCozyStore.getState().hasSeenStickerTutorial).toBe(true);
    });
  });

  describe('Feed State & Optimistic Cheering / Stickers', () => {
    const mockPost: FeedPost = {
      id: 'post-abc-1',
      user_id: 'user-1',
      light_img_url: '/img-light.jpg',
      dark_img_url: '/img-dark.jpg',
      obfuscated_location_hash: '9q8y',
      cheer_count: 3,
      has_cheered: false,
      is_toxic: false,
      stickers: [
        {
          id: 'sticker-1',
          sticker_url: '/sticker.png',
          cost: 50,
          decay_rate_per_day: 0.05,
          placed_at: '2026-08-01T00:00:00Z',
          last_reup_at: '2026-08-01T00:00:00Z',
          placed_by_user_id: 'user-2',
          x_percent: 50,
          y_percent: 50,
          rotation_degrees: 0,
        },
      ],
      item_pins: [],
      created_at: '2026-08-01T00:00:00Z',
    };

    it('sets, appends and deduplicates feed posts, manages cursor', () => {
      const store = useCozyStore.getState();
      store.setFeed([mockPost]);
      expect(useCozyStore.getState().feed).toHaveLength(1);

      store.setFeedCursor('cursor_page_2');
      expect(useCozyStore.getState().feedCursor).toBe('cursor_page_2');

      store.appendFeed([mockPost]);
      expect(useCozyStore.getState().feed).toHaveLength(1);

      const mockPost2: FeedPost = { ...mockPost, id: 'post-abc-2' };
      store.appendFeed([mockPost2]);
      expect(useCozyStore.getState().feed).toHaveLength(2);
    });

    it('optimistically marks a post as cheered and increments cheer_count', () => {
      useCozyStore.getState().setFeed([mockPost]);

      useCozyStore.getState().markCheered('post-abc-1');

      const updated = useCozyStore.getState().feed.find((p) => p.id === 'post-abc-1');
      expect(updated?.has_cheered).toBe(true);
      expect(updated?.cheer_count).toBe(4);
    });

    it('optimistically updates sticker reup timestamp in feed post', () => {
      useCozyStore.getState().setFeed([mockPost]);

      const newTimestamp = '2026-08-27T12:00:00Z';
      useCozyStore.getState().updateStickerReup('post-abc-1', 'sticker-1', newTimestamp);

      const post = useCozyStore.getState().feed[0];
      expect(post.stickers[0].last_reup_at).toBe(newTimestamp);
    });

    it('removes post from feed on dismiss/moderation', () => {
      useCozyStore.getState().setFeed([mockPost]);
      expect(useCozyStore.getState().feed).toHaveLength(1);

      useCozyStore.getState().removeFromFeed('post-abc-1');
      expect(useCozyStore.getState().feed).toHaveLength(0);
    });
  });

  describe('User Profile Posts', () => {
    it('sets user profile posts', () => {
      const mockUserPost: UserPost = {
        id: 'up-1',
        user_id: 'me',
        light_img_url: 'light.jpg',
        dark_img_url: 'dark.jpg',
        obfuscated_location_hash: '9q8y',
        cheer_count: 10,
        stickers: [],
        item_pins: [],
        created_at: '2026-08-01T00:00:00Z',
      };

      useCozyStore.getState().setUserPosts([mockUserPost]);
      expect(useCozyStore.getState().userPosts).toHaveLength(1);
    });
  });

  describe('Progressive Expansion & Themes', () => {
    it('manages expansion tiers and milestone tokens', () => {
      const store = useCozyStore.getState();
      store.setExpansionTier(2);
      expect(useCozyStore.getState().expansionTier).toBe(2);

      store.setMilestoneTokens(50);
      expect(useCozyStore.getState().milestoneTokens).toBe(50);

      store.addMilestoneTokens(100);
      expect(useCozyStore.getState().milestoneTokens).toBe(150);

      store.setThemesUnlocked(true);
      expect(useCozyStore.getState().themesUnlocked).toBe(true);
    });
  });

  describe('Group State Machine & Notifications', () => {
    it('updates group id, vibe status, and group points', () => {
      const store = useCozyStore.getState();
      store.setGroupId('group-cozy-cottage');
      store.setVibeStatus('sunshine');
      store.setGroupPoints(120);

      expect(useCozyStore.getState().groupId).toBe('group-cozy-cottage');
      expect(useCozyStore.getState().vibeStatus).toBe('sunshine');
      expect(useCozyStore.getState().groupPoints).toBe(120);

      store.addGroupPoints(5);
      expect(useCozyStore.getState().groupPoints).toBe(125);
    });

    it('guards group points addition when group is null', () => {
      const store = useCozyStore.getState();
      store.setGroupPoints(null);
      store.addGroupPoints(10);
      expect(useCozyStore.getState().groupPoints).toBeNull();
    });

    it('manages per-group notification preferences with opt-out default', () => {
      const store = useCozyStore.getState();
      const gId = 'grp-1234';

      expect(store.isGroupNotificationsEnabled(gId)).toBe(true);

      store.toggleGroupNotifications(gId);
      expect(useCozyStore.getState().isGroupNotificationsEnabled(gId)).toBe(false);

      store.toggleGroupNotifications(gId);
      expect(useCozyStore.getState().isGroupNotificationsEnabled(gId)).toBe(true);

      store.clearGroupNotificationPref(gId);
      expect(useCozyStore.getState().groupNotifications[gId]).toBeUndefined();
    });
  });

  describe('Daily Atmospheric Vibe Tracking & Rollover', () => {
    it('returns isVibeCheckDue = true when lastVibeCheckDate is null', () => {
      expect(useCozyStore.getState().lastVibeCheckDate).toBeNull();
      expect(useCozyStore.getState().isVibeCheckDue()).toBe(true);
    });

    it('returns isVibeCheckDue = true when lastVibeCheckDate is from yesterday', () => {
      const store = useCozyStore.getState();
      store.setLastVibeCheckDate('2026-08-01');
      expect(store.isVibeCheckDue()).toBe(true);
    });

    it('returns isVibeCheckDue = false when checked in today', () => {
      const todayISO = new Date().toISOString().slice(0, 10);
      const store = useCozyStore.getState();
      store.setLastVibeCheckDate(todayISO);
      expect(store.isVibeCheckDue()).toBe(false);
    });

    it('automatically stamps lastVibeCheckDate when setVibeStatus is called', () => {
      const todayISO = new Date().toISOString().slice(0, 10);
      const store = useCozyStore.getState();
      store.setVibeStatus('raincloud');
      expect(useCozyStore.getState().vibeStatus).toBe('raincloud');
      expect(useCozyStore.getState().lastVibeCheckDate).toBe(todayISO);
      expect(useCozyStore.getState().isVibeCheckDue()).toBe(false);
    });
  });
});

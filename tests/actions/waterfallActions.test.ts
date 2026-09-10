import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setRaincloudCascade,
  sendPorchWarmth,
  getPorchDigest,
} from '@/app/actions/waterfallActions';

const mockGetUser = vi.fn();
const mockUpdateVibe = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/app/actions/vibeActions', () => ({
  updateVibeStatus: (...args: unknown[]) => mockUpdateVibe(...args),
}));

vi.mock('@/lib/supabase', () => ({
  createServerClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
  createServiceClient: () => ({
    schema: () => ({
      from: (table: string) => ({
        select: (...args: unknown[]) => mockSelect(table, ...args),
        insert: (...args: unknown[]) => mockInsert(...args),
        update: (...args: unknown[]) => mockUpdate(...args),
      }),
    }),
  }),
}));

// Helper: default group_members chain — sender + recipient share 'group-shared'
function groupMembersChain(hasSharedGroup = true) {
  return {
    eq: vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: hasSharedGroup ? { group_id: 'group-shared' } : null,
          }),
        }),
      }),
      // For recipient group lookup sub-query
      maybeSingle: vi.fn().mockResolvedValue({ data: [{ group_id: 'group-shared' }] }),
    }),
  };
}

describe('Waterfall Engine & Porch Actions (waterfallActions.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    // Default select mock handles all tables in the happy path
    mockSelect.mockImplementation((table: string) => {
      if (table === 'group_members') return groupMembersChain(true);
      if (table === 'users') {
        return {
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { display_name: 'Kind Neighbor', points: 0 } }),
          }),
        };
      }
      if (table === 'porch_items') {
        // Default: count=1 (first gift of the day), and order for digest
        return {
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ count: 1 }),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'porch-item-1',
                  sender_id: 'sender-1',
                  sender_name: 'Robin',
                  item_type: 'tea',
                  message: 'Warm herbal tea for your porch.',
                  created_at: '2026-08-27T10:00:00Z',
                },
              ],
              error: null,
            }),
          }),
        };
      }
      return { eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) };
    });
  });

  // ---------------------------------------------------------------------------
  // setRaincloudCascade
  // ---------------------------------------------------------------------------
  describe('setRaincloudCascade', () => {
    it('returns error when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth error') });
      const res = await setRaincloudCascade();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Authentication required/i);
    });

    it('returns error when updateVibeStatus fails', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-raincloud' } }, error: null });
      mockUpdateVibe.mockResolvedValue({ success: false, error: 'Vibe status update failed' });

      const res = await setRaincloudCascade();
      expect(res.success).toBe(false);
      expect(res.error).toBe('Vibe status update failed');
    });

    it('activates raincloud and sets Primary Anchor Buddy for immediate T=0 check-in', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-raincloud' } }, error: null });
      mockUpdateVibe.mockResolvedValue({
        success: true,
        groupPeers: [
          { userId: 'anchor-1', displayName: 'Sam (Anchor)' },
          { userId: 'peer-2', displayName: 'Taylor' },
        ],
      });

      const res = await setRaincloudCascade('anchor-1');
      expect(res.success).toBe(true);
      expect(res.anchorBuddyId).toBe('anchor-1');
      expect(res.groupPeersCount).toBe(2);
      expect(res.message).toMatch(/Quiet check-in sent to Sam \(Anchor\)/i);
    });

    it('handles scenario when user has no peers', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-raincloud' } }, error: null });
      mockUpdateVibe.mockResolvedValue({ success: true, groupPeers: [] });

      const res = await setRaincloudCascade();
      expect(res.success).toBe(true);
      expect(res.message).toMatch(/campmates will see soft porch updates/i);
    });
  });

  // ---------------------------------------------------------------------------
  // sendPorchWarmth
  // ---------------------------------------------------------------------------
  describe('sendPorchWarmth', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'sender-user' } }, error: null });
    });

    it('deposits a quiet warmth gift on neighbor porch', async () => {
      const res = await sendPorchWarmth('recipient-user', 'blanket', 'Cozy blanket for your rest.');
      expect(res.success).toBe(true);
    });

    it('awards +2 warmth points to sender on first gift of the day (count === 1)', async () => {
      const res = await sendPorchWarmth('recipient-user', 'flower');
      expect(res.success).toBe(true);
      expect(res.senderPoints).toBe(2); // 0 base + PORCH_GIFT_SENDER_POINTS(2)
    });

    it('does not award points when sender has already gifted today (count > 1)', async () => {
      mockSelect.mockImplementation((table: string) => {
        if (table === 'group_members') return groupMembersChain(true);
        if (table === 'users') {
          return { eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { display_name: 'Sender', points: 10 } }) }) };
        }
        // count=3 means already gifted earlier today
        return { eq: vi.fn().mockReturnValue({ gte: vi.fn().mockResolvedValue({ count: 3 }) }) };
      });

      const res = await sendPorchWarmth('recipient-user', 'tea');
      expect(res.success).toBe(true);
      expect(res.senderPoints).toBeUndefined(); // no points awarded
    });

    it('rejects self-sends', async () => {
      // recipientUserId === user.id ('sender-user')
      const res = await sendPorchWarmth('sender-user');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/cannot send a porch gift to yourself/i);
    });

    it('rejects gifts to non-campmates not sharing any group', async () => {
      mockSelect.mockImplementation((table: string) => {
        if (table === 'group_members') return groupMembersChain(false); // no shared group
        return { eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) };
      });

      const res = await sendPorchWarmth('stranger-user');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/campmates in your group/i);
    });

    it('falls back to memory store when database insertion returns error', async () => {
      mockInsert.mockResolvedValueOnce({ error: { message: 'Table does not exist' } });
      const res = await sendPorchWarmth('recipient-user', 'tea');
      expect(res.success).toBe(true);
    });

    it('falls back to memory store when database insertion throws', async () => {
      mockInsert.mockRejectedValueOnce(new Error('DB crashed'));
      const res = await sendPorchWarmth('recipient-user', 'candle');
      expect(res.success).toBe(true);
    });

    it('returns error when recipientUserId is missing', async () => {
      const res = await sendPorchWarmth('');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Recipient user ID is required/i);
    });
  });

  // ---------------------------------------------------------------------------
  // getPorchDigest
  // ---------------------------------------------------------------------------
  describe('getPorchDigest', () => {
    it('retrieves porch items and generates soft consolidated digest', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });

      const digest = await getPorchDigest('user-me');
      expect(digest.success).toBe(true);
      expect(digest.items).toHaveLength(1);
      expect(digest.items[0].senderName).toBe('Robin');
      expect(digest.digestText).toMatch(/1 campmate left cozy thoughts on your porch/i);
    });

    it('returns error when user is not found and no targetUserId provided', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const res = await getPorchDigest();
      expect(res.success).toBe(false);
      expect(res.error).toBe('User required');
    });

    it('falls back to memory store when database query errors', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
      mockSelect.mockReturnValueOnce({
        eq: () => ({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Table not found' } }),
        }),
      });

      const res = await getPorchDigest('user-me');
      expect(res.success).toBe(true);
    });
  });
});

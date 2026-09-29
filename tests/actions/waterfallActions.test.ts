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
const mockRpc = vi.fn();

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
      rpc: (...args: unknown[]) => mockRpc(...args),
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
    mockRpc.mockResolvedValue({
      data: { awarded: true, new_points: 2, gifts_today: 1 },
      error: null,
    });

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

    it('deposits a quiet warmth gift on neighbor porch via send_porch_gift_atomic RPC', async () => {
      const res = await sendPorchWarmth('recipient-user', 'blanket', 'Cozy blanket for your rest.');
      expect(res.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('send_porch_gift_atomic', expect.objectContaining({
        p_sender_id: 'sender-user',
        p_recipient_id: 'recipient-user',
        p_item_type: 'blanket',
        p_message: 'Cozy blanket for your rest.',
      }));
    });

    it('awards +2 warmth points to sender on first gift of the day (RPC awarded = true)', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { awarded: true, new_points: 2, gifts_today: 1 },
        error: null,
      });

      const res = await sendPorchWarmth('recipient-user', 'flower');
      expect(res.success).toBe(true);
      expect(res.senderPoints).toBe(2);
      expect(mockRpc).toHaveBeenCalledWith('send_porch_gift_atomic', expect.objectContaining({
        p_sender_id: 'sender-user',
        p_recipient_id: 'recipient-user',
        p_item_type: 'flower',
      }));
    });

    it('does not award points when sender has already gifted today (RPC awarded = false)', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { awarded: false, new_points: null, gifts_today: 2 },
        error: null,
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

    it('falls back to memory store when database RPC returns error', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Function send_porch_gift_atomic does not exist' } });
      const res = await sendPorchWarmth('recipient-user', 'tea');
      expect(res.success).toBe(true);
      expect(res.senderPoints).toBeUndefined();
    });

    it('falls back to memory store when database RPC throws', async () => {
      mockRpc.mockRejectedValueOnce(new Error('DB crashed'));
      const res = await sendPorchWarmth('recipient-user', 'candle');
      expect(res.success).toBe(true);
      expect(res.senderPoints).toBeUndefined();
    });

    it('returns error when recipientUserId is missing', async () => {
      const res = await sendPorchWarmth('');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Recipient user ID is required/i);
    });

    // Verifies application action orchestration across sendPorchWarmth and getPorchDigest.
    // Database stored procedure contracts & atomic point awards are tested in tests/contracts/databaseContracts.test.ts.
    it('persists warmth gift across delivery and appearance in recipient porch digest', async () => {
      // Simulate stateful storage across RPC insert and getPorchDigest read
      const simulatedPorchItems: Array<{
        id: string;
        recipient_id: string;
        sender_id: string;
        sender_name: string;
        item_type: string;
        message: string;
        created_at: string;
      }> = [];

      mockRpc.mockImplementation((fnName: string, args: Record<string, unknown>) => {
        if (fnName === 'send_porch_gift_atomic') {
          const item = {
            id: 'simulated-porch-item-123',
            recipient_id: args.p_recipient_id as string,
            sender_id: args.p_sender_id as string,
            sender_name: (args.p_sender_name as string) || 'Robin',
            item_type: args.p_item_type as string,
            message: args.p_message as string,
            created_at: (args.p_created_at as string) || new Date().toISOString(),
          };
          simulatedPorchItems.unshift(item);
          return Promise.resolve({
            data: { awarded: true, new_points: 2, gifts_today: 1 },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      mockSelect.mockImplementation((table: string) => {
        if (table === 'group_members') return groupMembersChain(true);
        if (table === 'users') {
          return {
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { display_name: 'Robin' } }),
            }),
          };
        }
        if (table === 'porch_items') {
          return {
            eq: vi.fn().mockImplementation((_col: string, val: string) => ({
              order: vi.fn().mockImplementation(() =>
                Promise.resolve({
                  data: simulatedPorchItems.filter((i) => i.recipient_id === val),
                  error: null,
                })
              ),
            })),
          };
        }
        return { eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) };
      });

      // 1. Sender deposits a porch gift
      const sendRes = await sendPorchWarmth('recipient-user', 'cocoa', 'Hot cocoa for a chilly evening.');
      expect(sendRes.success).toBe(true);
      expect(sendRes.senderPoints).toBe(2);

      // 2. Recipient views their porch digest
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'recipient-user' } }, error: null });
      const digestRes = await getPorchDigest('recipient-user');

      expect(digestRes.success).toBe(true);
      expect(digestRes.items).toHaveLength(1);
      expect(digestRes.items[0]).toMatchObject({
        senderId: 'sender-user',
        senderName: 'Robin',
        itemType: 'cocoa',
        message: 'Hot cocoa for a chilly evening.',
      });
      expect(digestRes.digestText).toMatch(/1 campmate left cozy thoughts on your porch/i);
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

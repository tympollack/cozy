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
      from: () => ({
        select: (...args: unknown[]) => mockSelect(...args),
        insert: (...args: unknown[]) => mockInsert(...args),
      }),
    }),
  }),
}));

describe('Waterfall Engine & Porch Actions (waterfallActions.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({
      eq: () => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: { display_name: 'Kind Neighbor' } }),
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
    });
    mockInsert.mockResolvedValue({ error: null });
  });

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
      mockUpdateVibe.mockResolvedValue({
        success: true,
        groupPeers: [],
      });

      const res = await setRaincloudCascade();
      expect(res.success).toBe(true);
      expect(res.message).toMatch(/campmates will see soft porch updates/i);
    });
  });

  describe('sendPorchWarmth', () => {
    it('deposits a quiet warmth gift on neighbor porch', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'sender-user' } }, error: null });
      const res = await sendPorchWarmth('recipient-user', 'blanket', 'Cozy blanket for your rest.');
      expect(res.success).toBe(true);
    });

    it('falls back to memory store when database insertion returns error or throws', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'sender-user' } }, error: null });
      mockInsert.mockResolvedValueOnce({ error: { message: 'Table does not exist' } });

      const res1 = await sendPorchWarmth('recipient-user', 'tea');
      expect(res1.success).toBe(true);

      mockInsert.mockRejectedValueOnce(new Error('DB crashed'));
      const res2 = await sendPorchWarmth('recipient-user', 'crystal');
      expect(res2.success).toBe(true);
    });

    it('returns error when recipientUserId is missing', async () => {
      const res = await sendPorchWarmth('');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Recipient user ID is required/i);
    });
  });

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

    it('falls back to memory store when database query errors or throws', async () => {
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

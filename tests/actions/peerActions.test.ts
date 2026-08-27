import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendCallingCard,
  acceptCallingCard,
  declineCallingCard,
  getPeerStatus,
  getPendingCallingCards,
} from '@/app/actions/peerActions';

// Mock Supabase server client
const mockRpc = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase', () => ({
  createServerClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
    schema: () => ({
      rpc: mockRpc,
    }),
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Peer Support Actions (peerActions.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendCallingCard', () => {
    it('returns error when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth error') });
      const result = await sendCallingCard('recipient-1');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Authentication required/i);
    });

    it('successfully sends calling card and returns updated point balance', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-sender' } }, error: null });
      mockRpc.mockResolvedValue({ data: 95, error: null });

      const result = await sendCallingCard('recipient-1', '/profile/recipient-1');
      expect(result.success).toBe(true);
      expect(result.newPoints).toBe(95);
      expect(mockRpc).toHaveBeenCalledWith('send_calling_card', {
        p_requester_id: 'user-sender',
        p_recipient_id: 'recipient-1',
      });
    });

    it('handles known RPC constraint errors (insufficient points, already sent, self-send, unexpected error)', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-sender' } }, error: null });

      // Insufficient points
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Insufficient points' } });
      const res1 = await sendCallingCard('recipient-1');
      expect(res1.success).toBe(false);
      expect(res1.error).toMatch(/at least 5 points/i);

      // Already pending
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'unique constraint uq_cozy_peers' } });
      const res2 = await sendCallingCard('recipient-1');
      expect(res2.success).toBe(false);
      expect(res2.error).toMatch(/already have a Calling Card/i);

      // Self-send
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'cannot send to yourself' } });
      const res3 = await sendCallingCard('user-sender');
      expect(res3.success).toBe(false);
      expect(res3.error).toMatch(/cannot send a Calling Card to yourself/i);

      // Generic unexpected RPC error
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Database crashed' } });
      const res4 = await sendCallingCard('recipient-1');
      expect(res4.success).toBe(false);
      expect(res4.error).toMatch(/Something went wrong/i);
    });
  });

  describe('acceptCallingCard', () => {
    it('returns error when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth error') });
      const result = await acceptCallingCard('peer-1');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Authentication required/i);
    });

    it('successfully accepts calling card and awards +5 points', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-recipient' } }, error: null });
      mockRpc.mockResolvedValue({ data: 105, error: null });

      const result = await acceptCallingCard('peer-record-99', '/profile');
      expect(result.success).toBe(true);
      expect(result.newPoints).toBe(105);
      expect(mockRpc).toHaveBeenCalledWith('respond_to_calling_card', {
        p_peer_id: 'peer-record-99',
        p_recipient_id: 'user-recipient',
        p_action: 'accepted',
      });
    });

    it('returns error when card is already responded to or unhandled error occurs', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-recipient' } }, error: null });
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Card not found or already responded' } });

      const result = await acceptCallingCard('peer-record-99');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/already been responded to/i);

      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Unhandled DB error' } });
      const res2 = await acceptCallingCard('peer-record-99');
      expect(res2.success).toBe(false);
      expect(res2.error).toMatch(/Something went wrong/i);
    });
  });

  describe('declineCallingCard', () => {
    it('returns error when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth error') });
      const result = await declineCallingCard('peer-1');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Authentication required/i);
    });

    it('successfully declines calling card without adjusting points', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-recipient' } }, error: null });
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await declineCallingCard('peer-record-99');
      expect(result.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('respond_to_calling_card', {
        p_peer_id: 'peer-record-99',
        p_recipient_id: 'user-recipient',
        p_action: 'declined',
      });
    });

    it('handles decline error when card is not found or already responded to', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-recipient' } }, error: null });
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
      const res1 = await declineCallingCard('peer-1');
      expect(res1.success).toBe(false);
      expect(res1.error).toMatch(/already been responded to/i);

      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Internal DB crash' } });
      const res2 = await declineCallingCard('peer-1');
      expect(res2.success).toBe(false);
      expect(res2.error).toMatch(/Something went wrong/i);
    });
  });

  describe('getPeerStatus', () => {
    it('returns "none" if viewerId is null or identical to targetId', async () => {
      expect(await getPeerStatus(null, 'target-1')).toBe('none');
      expect(await getPeerStatus('user-1', 'user-1')).toBe('none');
    });

    it('queries database RPC and returns peer status', async () => {
      mockRpc.mockResolvedValue({ data: 'accepted', error: null });
      const status = await getPeerStatus('viewer-1', 'target-2');
      expect(status).toBe('accepted');
    });

    it('handles RPC error by returning "none"', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC Error' } });
      const status = await getPeerStatus('viewer-1', 'target-2');
      expect(status).toBe('none');
    });
  });

  describe('getPendingCallingCards', () => {
    it('fetches and maps pending calling cards', async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            peer_id: 'peer-1',
            requester_id: 'req-1',
            requester_name: 'Maya',
            sent_at: '2026-08-27T10:00:00Z',
          },
        ],
        error: null,
      });

      const cards = await getPendingCallingCards('recipient-1');
      expect(cards).toHaveLength(1);
      expect(cards[0]).toEqual({
        peerId: 'peer-1',
        requesterId: 'req-1',
        requesterName: 'Maya',
        sentAt: '2026-08-27T10:00:00Z',
      });
    });

    it('returns empty array when RPC returns error or null data', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB Error' } });
      expect(await getPendingCallingCards('rec-1')).toEqual([]);

      mockRpc.mockResolvedValueOnce({ data: null, error: null });
      expect(await getPendingCallingCards('rec-1')).toEqual([]);
    });
  });
});

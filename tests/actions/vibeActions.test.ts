import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateVibeStatus, getPrivateNotes } from '@/app/actions/vibeActions';

const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockServiceRpc = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/supabase', () => ({
  createServerClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
    schema: () => ({
      rpc: (...args: unknown[]) => mockRpc(...args),
    }),
  }),
  createServiceClient: () => ({
    schema: () => ({
      rpc: (...args: unknown[]) => mockServiceRpc(...args),
      from: () => ({
        select: (...args: unknown[]) => mockSelect(...args),
        update: (...args: unknown[]) => mockUpdate(...args),
      }),
    }),
  }),
}));

describe('Atmospheric Vibe Actions (vibeActions.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-vibe-1' } }, error: null });
    mockRpc.mockResolvedValue({
      data: [{ peer_user_id: 'peer-1', peer_name: 'Jordan' }],
      error: null,
    });
    mockServiceRpc.mockResolvedValue({ data: { success: true }, error: null });
    mockSelect.mockReturnValue({
      eq: () => ({
        limit: () => ({
          maybeSingle: () => Promise.resolve({ data: { group_id: 'group-123' }, error: null }),
        }),
        order: () => Promise.resolve({
          data: [
            {
              id: 'note-1',
              sender_id: 'sender-1',
              sender_name: 'Robin',
              recipient_id: 'user-vibe-1',
              message: 'Sending you cozy vibes! ☕',
              created_at: new Date().toISOString(),
              delivered_to_porch: true,
            },
          ],
          error: null,
        }),
      }),
    });
    mockUpdate.mockReturnValue({
      eq: () => Promise.resolve({ data: null, error: null }),
    });
  });

  it('updates vibe status to sunshine', async () => {
    const res = await updateVibeStatus('sunshine');
    expect(res.success).toBe(true);
    expect(res.groupPeers).toHaveLength(1);
    expect(mockRpc).toHaveBeenCalledWith('update_vibe_status', {
      p_user_id: 'user-vibe-1',
      p_status: 'sunshine',
    });
    expect(mockServiceRpc).not.toHaveBeenCalled();
  });

  it('updates vibe status to raincloud and triggers process_raincloud_waterfall RPC', async () => {
    const res = await updateVibeStatus('raincloud', 'group-123');
    expect(res.success).toBe(true);
    expect(mockServiceRpc).toHaveBeenCalledWith('process_raincloud_waterfall', {
      p_target_user_id: 'user-vibe-1',
      p_group_id: 'group-123',
    });
  });

  it('fetches private notes delivered to porch', async () => {
    const notes = await getPrivateNotes('user-vibe-1');
    expect(notes).toHaveLength(1);
    expect(notes[0].message).toBe('Sending you cozy vibes! ☕');
    expect(notes[0].senderName).toBe('Robin');
  });
});

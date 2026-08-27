import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendPeerSupport } from '@/app/actions/supportActions';

const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockInsert = vi.fn();
const mockSchemaRpc = vi.fn();

vi.mock('@/lib/supabase', () => ({
  createServerClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
    rpc: mockRpc,
    schema: () => ({
      rpc: mockSchemaRpc,
      from: () => ({
        insert: mockInsert,
      }),
    }),
  }),
}));

describe('Enhanced Peer Support Actions (supportActions.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth error') });
    await expect(sendPeerSupport('user-target', 'brew')).rejects.toThrow('Unauthorized');
  });

  it('throws error when attempting to send peer support to self', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
    await expect(sendPeerSupport('user-me', 'brew')).rejects.toThrow('Cannot send peer support to yourself');
  });

  it('successfully sends Warm Brew via RPC with +5 points', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
    mockRpc.mockResolvedValue({ error: null });

    const res = await sendPeerSupport('user-neighbor', 'brew');
    expect(res.success).toBe(true);
    expect(res.pointsAwarded).toBe(5);
  });

  it('falls back to schema-qualified RPC if root RPC fails on Warm Brew', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
    mockRpc.mockResolvedValue({ error: { message: 'Root RPC not found' } });
    mockSchemaRpc.mockResolvedValue({ error: { message: 'Schema notice' } });

    const res = await sendPeerSupport('user-neighbor', 'brew');
    expect(res.success).toBe(true);
    expect(res.pointsAwarded).toBe(5);
  });

  it('successfully sends Comfort Sticker cheer', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
    const res = await sendPeerSupport('user-neighbor', 'sticker', '🧸');
    expect(res.success).toBe(true);
    expect(res.pointsAwarded).toBe(5);
  });

  it('delivers Private Note to recipient porch holding pen without intrusive alerts', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
    mockInsert.mockResolvedValue({ error: null });

    const res = await sendPeerSupport('user-neighbor', 'note', 'Take all the rest you need today! 💛');
    expect(res.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith({
      sender_id: 'user-me',
      recipient_id: 'user-neighbor',
      message: 'Take all the rest you need today! 💛',
      delivered_to_porch: true,
    });
  });

  it('handles note insert error gracefully and still returns success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
    mockInsert.mockResolvedValue({ error: { message: 'Table does not exist' } });

    const res = await sendPeerSupport('user-neighbor', 'note', 'Warm hugs');
    expect(res.success).toBe(true);
  });
});

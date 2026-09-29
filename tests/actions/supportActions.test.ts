import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendPeerSupport } from '@/app/actions/supportActions';

const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockInsert = vi.fn();
const mockSchemaRpc = vi.fn();
const mockServiceSelect = vi.fn();
const mockServiceUpdate = vi.fn();

vi.mock('@/lib/supabase', () => ({
  createServerClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
    rpc: mockRpc,
    schema: () => ({
      rpc: mockSchemaRpc,
    }),
  }),
  createServiceClient: () => ({
    schema: () => ({
      from: () => ({
        select: (...args: unknown[]) => mockServiceSelect(...args),
        update: (...args: unknown[]) => mockServiceUpdate(...args),
        insert: (...args: unknown[]) => mockInsert(...args),
      }),
    }),
  }),
}));

describe('Enhanced Peer Support Actions (supportActions.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServiceSelect.mockReturnValue({
      eq: () => ({
        single: vi.fn().mockResolvedValue({ data: { points: 100, display_name: 'Kind Neighbor' } }),
        maybeSingle: vi.fn().mockResolvedValue({ data: { points: 100, display_name: 'Kind Neighbor' } }),
      }),
    });
    mockServiceUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockInsert.mockResolvedValue({ error: null });
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

  it('successfully sends Comfort Sticker cheer and awards points to recipient', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
    const res = await sendPeerSupport('user-neighbor', 'sticker', '🧸');
    expect(res.success).toBe(true);
    expect(res.pointsAwarded).toBe(5);
  });

  it('delivers Private Note with sender name, timestamp, and delivered_to_porch flag', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });

    const res = await sendPeerSupport('user-neighbor', 'note', 'Take all the rest you need today! 💛');
    expect(res.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        sender_id: 'user-me',
        sender_name: 'Kind Neighbor',
        recipient_id: 'user-neighbor',
        message: 'Take all the rest you need today! 💛',
        delivered_to_porch: true,
        created_at: expect.any(String),
      })
    );
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-neighbor',
        type: 'peer_checkin',
        title: '💌 Private Supportive Note',
        message: 'Kind Neighbor left a warm note on your porch.',
      })
    );
  });

  it('returns failure when note text is empty or toxic', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });

    const res1 = await sendPeerSupport('user-neighbor', 'note', '');
    expect(res1.success).toBe(false);
    expect(res1.error).toMatch(/write a warm note/i);

    const res2 = await sendPeerSupport('user-neighbor', 'note', 'You are horrible');
    expect(res2.success).toBe(false);
    expect(res2.error).toMatch(/warm, uplifting messages only/i);
  });

  it('returns failure when note database insertion fails with non-schema error and aborts notification', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
    mockInsert.mockResolvedValue({ error: { message: 'Database disk full' } });

    const res = await sendPeerSupport('user-neighbor', 'note', 'Warm hugs');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Could not deliver note to porch/i);
    // Should NOT send fallback notification on disk/constraint failure
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('delivers note via fallback notification when private_notes table is missing from schema cache', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
    mockInsert.mockImplementation((record: Record<string, unknown>) => {
      if (record?.delivered_to_porch) {
        return Promise.resolve({ error: { message: "Could not find the table 'cozy.private_notes' in the schema cache" } });
      }
      return Promise.resolve({ error: null });
    });

    const res = await sendPeerSupport('user-neighbor', 'note', 'Hope you have a warm evening! ✨');
    expect(res.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-neighbor',
        type: 'peer_checkin',
        message: 'Kind Neighbor left a warm note on your porch.',
        metadata: expect.objectContaining({
          note_text: 'Hope you have a warm evening! ✨',
        }),
      })
    );
  });
});

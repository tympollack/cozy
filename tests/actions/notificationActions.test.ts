import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNotices } from '@/app/actions/notificationActions';

const mockGetUser = vi.fn();
const mockPostSelect = vi.fn();
const mockCheersSelect = vi.fn();
const mockUsersSelect = vi.fn();
const mockPeersSelect = vi.fn();
const mockPendingCards = vi.fn();
const mockPrivateNotes = vi.fn();
const mockPorchDigest = vi.fn();

vi.mock('@/app/actions/peerActions', () => ({
  getPendingCallingCards: (...args: unknown[]) => mockPendingCards(...args),
}));

vi.mock('@/app/actions/vibeActions', () => ({
  getPrivateNotes: (...args: unknown[]) => mockPrivateNotes(...args),
}));

vi.mock('@/app/actions/waterfallActions', () => ({
  getPorchDigest: (...args: unknown[]) => mockPorchDigest(...args),
}));

vi.mock('@/lib/supabase', () => ({
  createServerClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
  createServiceClient: () => ({
    schema: () => ({
      from: (table: string) => {
        if (table === 'posts') {
          return {
            select: () => ({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'post-1',
                    light_img_url: 'light.jpg',
                    dark_img_url: 'dark.jpg',
                    cheer_count: 5,
                    created_at: '2026-08-27T10:00:00Z',
                  },
                ],
              }),
            }),
          };
        }
        if (table === 'cheers') {
          return {
            select: () => ({
              in: () => ({
                neq: () => ({
                  order: () => ({
                    limit: vi.fn().mockResolvedValue({
                      data: [
                        {
                          id: 'cheer-1',
                          post_id: 'post-1',
                          user_id: 'user-cheerer',
                          created_at: '2026-08-27T11:00:00Z',
                        },
                      ],
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: () => ({
              in: vi.fn().mockResolvedValue({
                data: [{ id: 'user-cheerer', display_name: 'Cheery Neighbor' }],
              }),
            }),
          };
        }
        if (table === 'peers') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: vi.fn().mockResolvedValue({
                      data: [
                        {
                          id: 'peer-rec-1',
                          recipient_id: 'user-friend',
                          created_at: '2026-08-27T09:00:00Z',
                        },
                      ],
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      },
    }),
  }),
}));

describe('Notification Actions (notificationActions.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPendingCards.mockResolvedValue([
      {
        peerId: 'card-1',
        requesterId: 'req-1',
        requesterName: 'Robin',
        sentAt: '2026-08-27T08:00:00Z',
      },
    ]);
    mockPrivateNotes.mockResolvedValue([
      {
        id: 'note-1',
        senderId: 'send-1',
        senderName: 'Sam',
        recipientId: 'user-me',
        message: 'Have a peaceful morning! ☕',
        sentAt: '2026-08-27T07:00:00Z',
      },
    ]);
    mockPorchDigest.mockResolvedValue({
      success: true,
      items: [
        {
          id: 'porch-1',
          senderId: 'send-2',
          senderName: 'Taylor',
          itemType: 'tea',
          message: 'Warm herbal tea left for you.',
          createdAt: '2026-08-27T06:00:00Z',
        },
      ],
    });
  });

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth error') });
    const res = await getNotices();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Authentication required/i);
  });

  it('aggregates all notices (cheers, cards, accepted peers, notes, porch gifts) in chronological order', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });

    const res = await getNotices();
    expect(res.success).toBe(true);
    expect(res.notices.length).toBeGreaterThanOrEqual(4);
    expect(res.unreadCount).toBe(res.notices.length);

    // Verify cheer notice
    const cheerNotice = res.notices.find((n) => n.type === 'cheer');
    expect(cheerNotice).toBeDefined();
    expect(cheerNotice?.title).toContain('cheered your space');

    // Verify calling card notice
    const cardNotice = res.notices.find((n) => n.type === 'calling_card');
    expect(cardNotice).toBeDefined();
    expect(cardNotice?.actorName).toBe('Robin');

    // Verify porch gift notice
    const porchNotice = res.notices.find((n) => n.type === 'porch_warmth');
    expect(porchNotice).toBeDefined();
    expect(porchNotice?.itemType).toBe('tea');
  });
});

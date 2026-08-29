import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserNotifications,
  markNotificationAsRead,
  triggerDailyTaskNudge,
  receiveAdminBroadcast,
  processRaincloudWaterfallAction,
  getNotices,
} from '@/app/actions/notificationActions';

const mockGetUser = vi.fn();
const mockPendingCards = vi.fn();
const mockPrivateNotes = vi.fn();
const mockPorchDigest = vi.fn();

let mockNotificationsDb: Array<{
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}> = [];

let mockPostsDb: Array<{
  id: string;
  user_id: string;
  light_img_url: string;
  dark_img_url: string;
  cheer_count: number;
  created_at: string;
}> = [];

let mockUsersDb: Array<{
  id: string;
  display_name: string;
}> = [];

let mockRpcResult: any = null;

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
    schema: (schemaName: string) => ({
      rpc: (rpcName: string, params: any) => {
        if (rpcName === 'process_raincloud_waterfall') {
          return Promise.resolve({ data: mockRpcResult, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      from: (table: string) => {
        if (table === 'notifications') {
          return {
            select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
              let filtered = [...mockNotificationsDb];
              const queryObj: any = {
                eq: (col: string, val: any) => {
                  filtered = filtered.filter((r: any) => r[col] === val);
                  return queryObj;
                },
                gte: (col: string, val: any) => {
                  filtered = filtered.filter((r: any) => new Date(r[col]).getTime() >= new Date(val).getTime());
                  return queryObj;
                },
                order: (_col: string, _opts: any) => queryObj,
                limit: (lim: number) => {
                  if (opts?.head) {
                    return Promise.resolve({ count: filtered.length, data: null, error: null });
                  }
                  return Promise.resolve({ data: filtered.slice(0, lim), count: filtered.length, error: null });
                },
              };
              if (opts?.head) {
                queryObj.then = (resolve: any) => resolve({ count: filtered.length, data: null, error: null });
              } else {
                queryObj.then = (resolve: any) => resolve({ data: filtered, count: filtered.length, error: null });
              }
              return queryObj;
            },
            insert: (records: any) => {
              const toInsert = Array.isArray(records) ? records : [records];
              toInsert.forEach((rec, idx) => {
                mockNotificationsDb.push({
                  id: rec.id || `notif-${Date.now()}-${idx}`,
                  ...rec,
                });
              });
              return Promise.resolve({ error: null });
            },
            update: (updates: any) => ({
              eq: (col1: string, val1: any) => ({
                eq: (col2: string, val2: any) => {
                  mockNotificationsDb = mockNotificationsDb.map((n: any) => {
                    if (n[col1] === val1 && n[col2] === val2) {
                      return { ...n, ...updates };
                    }
                    return n;
                  });
                  return Promise.resolve({ error: null });
                },
              }),
            }),
          };
        }

        if (table === 'posts') {
          return {
            select: () => {
              let filtered = [...mockPostsDb];
              const queryObj: any = {
                eq: (col: string, val: any) => {
                  filtered = filtered.filter((r: any) => r[col] === val);
                  return queryObj;
                },
                gte: (col: string, val: any) => {
                  filtered = filtered.filter((r: any) => new Date(r[col]).getTime() >= new Date(val).getTime());
                  return queryObj;
                },
                limit: (lim: number) => Promise.resolve({ data: filtered.slice(0, lim), error: null }),
              };
              queryObj.then = (resolve: any) => resolve({ data: filtered, error: null });
              return queryObj;
            },
          };
        }

        if (table === 'users') {
          return {
            select: () => {
              const queryObj: any = {
                in: (col: string, vals: any[]) => {
                  const filtered = mockUsersDb.filter((u: any) => vals.includes(u[col]));
                  return Promise.resolve({ data: filtered, error: null });
                },
              };
              queryObj.then = (resolve: any) => resolve({ data: mockUsersDb, error: null });
              return queryObj;
            },
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
    mockNotificationsDb = [];
    mockPostsDb = [];
    mockUsersDb = [
      { id: 'user-1', display_name: 'Alice' },
      { id: 'user-2', display_name: 'Bob' },
      { id: 'user-me', display_name: 'Cozy Me' },
    ];
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

  describe('getUserNotifications', () => {
    it('returns error when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth error') });
      const res = await getUserNotifications();
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Authentication required/i);
    });

    it('fetches unread and recent notifications from cozy.notifications', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
      mockNotificationsDb = [
        {
          id: 'notif-1',
          user_id: 'user-me',
          type: 'daily_task',
          title: 'Daily Space Reset',
          message: 'Time for your daily space reset!',
          metadata: { action_url: '/camera' },
          is_read: false,
          created_at: '2026-08-28T12:00:00Z',
        },
        {
          id: 'notif-2',
          user_id: 'user-me',
          type: 'peer_checkin',
          title: '🌧️ Raincloud Check-In',
          message: 'Alice is sitting under a raincloud.',
          metadata: { peer_id: 'user-1' },
          is_read: true,
          created_at: '2026-08-28T10:00:00Z',
        },
      ];

      const res = await getUserNotifications();
      expect(res.success).toBe(true);
      expect(res.notifications).toHaveLength(2);
      expect(res.unreadCount).toBe(1);
      expect(res.notifications[0].title).toBe('Daily Space Reset');
      expect(res.notifications[0].isRead).toBe(false);
    });
  });

  describe('markNotificationAsRead', () => {
    it('updates is_read = true for the user notification', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
      mockNotificationsDb = [
        {
          id: 'notif-1',
          user_id: 'user-me',
          type: 'daily_task',
          title: 'Daily Space Reset',
          message: 'Time for your daily space reset!',
          is_read: false,
          created_at: '2026-08-28T12:00:00Z',
        },
      ];

      const res = await markNotificationAsRead('notif-1');
      expect(res.success).toBe(true);
      expect(mockNotificationsDb[0].is_read).toBe(true);
    });
  });

  describe('triggerDailyTaskNudge', () => {
    it('creates daily_task notification when room capture is incomplete today', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
      mockPostsDb = [];
      mockNotificationsDb = [];

      const res = await triggerDailyTaskNudge();
      expect(res.success).toBe(true);
      expect(res.nudged).toBe(true);
      expect(res.message).toContain('daily space reset');
      expect(mockNotificationsDb).toHaveLength(1);
      expect(mockNotificationsDb[0].type).toBe('daily_task');
      expect(mockNotificationsDb[0].user_id).toBe('user-me');
    });

    it('does not duplicate nudge if post was already created today', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
      mockPostsDb = [
        {
          id: 'post-today',
          user_id: 'user-me',
          light_img_url: 'light.jpg',
          dark_img_url: 'dark.jpg',
          cheer_count: 0,
          created_at: new Date().toISOString(),
        },
      ];

      const res = await triggerDailyTaskNudge();
      expect(res.success).toBe(true);
      expect(res.nudged).toBe(false);
      expect(res.message).toMatch(/already logged today/i);
      expect(mockNotificationsDb).toHaveLength(0);
    });

    it('does not duplicate nudge if daily_task notification already sent today', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
      mockPostsDb = [];
      mockNotificationsDb = [
        {
          id: 'nudge-today',
          user_id: 'user-me',
          type: 'daily_task',
          title: 'Daily Space Reset',
          message: 'Time for your daily space reset!',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];

      const res = await triggerDailyTaskNudge();
      expect(res.success).toBe(true);
      expect(res.nudged).toBe(false);
      expect(res.message).toMatch(/already sent today/i);
    });
  });

  describe('receiveAdminBroadcast', () => {
    it('fans out admin broadcast notification to target users', async () => {
      const payload = {
        broadcast_id: 'broadcast-101',
        title: '🍂 Autumn Festival Announcement',
        message: 'New dollhouse furniture packs have arrived!',
        target_scope: 'all',
      };

      const res = await receiveAdminBroadcast(payload);
      expect(res.success).toBe(true);
      expect(res.count).toBe(3);
      expect(mockNotificationsDb).toHaveLength(3);
      expect(mockNotificationsDb[0].type).toBe('admin_broadcast');
      expect(mockNotificationsDb[0].title).toBe('🍂 Autumn Festival Announcement');
      expect(mockNotificationsDb[0].metadata?.broadcast_id).toBe('broadcast-101');
    });

    it('validates required payload parameters', async () => {
      const res = await receiveAdminBroadcast({ broadcast_id: '', title: '', message: '' });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/required/i);
    });
  });

  describe('processRaincloudWaterfallAction', () => {
    it('executes the Serene Cascade waterfall RPC', async () => {
      mockRpcResult = {
        success: true,
        status: 'notified',
        notified_user_id: 'user-2',
        notified_name: 'Bob',
        message: 'Nudged Bob in Serene Cascade.',
      };

      const res = await processRaincloudWaterfallAction('user-1', 'group-100');
      expect(res.success).toBe(true);
      expect(res.status).toBe('notified');
      expect(res.message).toContain('Nudged Bob');
    });
  });

  describe('getNotices (backwards compatibility)', () => {
    it('aggregates notices (cheers, cards, accepted peers, notes, porch gifts) in chronological order', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-me' } }, error: null });
      mockPostsDb = [
        {
          id: 'post-1',
          user_id: 'user-me',
          light_img_url: 'light.jpg',
          dark_img_url: 'dark.jpg',
          cheer_count: 5,
          created_at: '2026-08-27T10:00:00Z',
        },
      ];

      const res = await getNotices();
      expect(res.success).toBe(true);
      expect(res.notices.length).toBeGreaterThanOrEqual(4);
      expect(res.unreadCount).toBe(res.notices.length);

      const cheerNotice = res.notices.find((n) => n.type === 'cheer');
      expect(cheerNotice).toBeDefined();
      expect(cheerNotice?.title).toContain('cheered your space');
    });
  });
});

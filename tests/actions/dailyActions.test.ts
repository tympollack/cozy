import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkDailyResetStatus, submitDailySpaceReset } from '@/app/actions/dailyActions';

const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockRecordTransaction = vi.fn();

// Mock Supabase & Ledger
vi.mock('@/app/actions/ledgerActions', () => ({
  recordPointTransaction: (...args: unknown[]) => mockRecordTransaction(...args),
}));

let mockPostsTable: Array<Record<string, unknown>> = [];
let mockUsersTable: Record<string, { points: number }> = {};
let mockGroupsTable: Record<string, { pooled_points: number }> = {};
let mockGroupMembersTable: Array<{ user_id: string; group_id: string }> = [];
let mockTransactionsTable: Array<{ id: string; user_id: string; transaction_type: string }> = [];

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
      from: (tableName: string) => ({
        select: (cols: string) => ({
          eq: (col1: string, val1: unknown) => ({
            gte: () => ({
              order: () => Promise.resolve({
                data: mockPostsTable.filter((p) => p[col1] === val1),
                error: null,
              }),
            }),
            eq: (col2: string, val2: unknown) => {
              if (tableName === 'transactions') {
                return {
                  gte: () => ({
                    limit: () => Promise.resolve({
                      data: mockTransactionsTable.filter((t) => t.user_id === val1 && t.transaction_type === val2),
                      error: null,
                    }),
                  }),
                };
              }
              return {
                maybeSingle: () => {
                  const found = mockPostsTable.find((p) => p[col1] === val1 && p[col2] === val2);
                  return Promise.resolve({ data: found || null, error: null });
                },
              };
            },
            single: () => {
              if (tableName === 'users') {
                const user = mockUsersTable[val1 as string];
                return Promise.resolve({ data: user ? { points: user.points } : null, error: user ? null : { message: 'User not found' } });
              }
              if (tableName === 'groups') {
                const group = mockGroupsTable[val1 as string];
                return Promise.resolve({ data: group ? { pooled_points: group.pooled_points } : null, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            },
            limit: () => {
              if (tableName === 'group_members') {
                return Promise.resolve({
                  data: mockGroupMembersTable.filter((m) => m.user_id === val1),
                  error: null,
                });
              }
              return Promise.resolve({ data: [], error: null });
            },
            then: (resolve: (val: unknown) => void) => {
              if (tableName === 'group_members') {
                return Promise.resolve({
                  data: mockGroupMembersTable.filter((m) => m.user_id === val1),
                  error: null,
                }).then(resolve);
              }
              return Promise.resolve({ data: [], error: null }).then(resolve);
            },
          }),
        }),
        update: (data: Record<string, unknown>) => ({
          eq: (col: string, val: string) => {
            if (tableName === 'users' && data.points !== undefined) {
              if (mockUsersTable[val]) {
                mockUsersTable[val].points = data.points as number;
              } else {
                mockUsersTable[val] = { points: data.points as number };
              }
            }
            if (tableName === 'groups' && data.pooled_points !== undefined) {
              if (mockGroupsTable[val]) {
                mockGroupsTable[val].pooled_points = data.pooled_points as number;
              } else {
                mockGroupsTable[val] = { pooled_points: data.pooled_points as number };
              }
            }
            return Promise.resolve({ data: null, error: null });
          },
        }),
      }),
    }),
  }),
}));

describe('Daily Task & Habit Engine (dailyActions.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPostsTable = [];
    mockUsersTable = { 'user-123': { points: 100 } };
    mockGroupsTable = { 'group-abc': { pooled_points: 200 } };
    mockGroupMembersTable = [{ user_id: 'user-123', group_id: 'group-abc' }];
    mockTransactionsTable = [];
    mockRecordTransaction.mockResolvedValue(true);
    mockRpc.mockResolvedValue({ data: { personal_points: 125, groups_updated: 1 }, error: null });
  });

  describe('checkDailyResetStatus', () => {
    it('returns error when user is unauthenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth error') });
      const result = await checkDailyResetStatus();
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Authentication required/i);
    });

    it('returns hasResetToday = false when no posts submitted today', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
      mockPostsTable = [];

      const result = await checkDailyResetStatus();
      expect(result.success).toBe(true);
      expect(result.hasResetToday).toBe(false);
      expect(result.hasLight).toBe(false);
      expect(result.hasDark).toBe(false);
      expect(result.isDualMode).toBe(false);
    });

    it('identifies single light room post submitted today', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
      mockPostsTable = [
        {
          id: 'post-1',
          user_id: 'user-123',
          light_img_url: 'https://r2.cozy.dev/light-1.webp',
          dark_img_url: null,
          created_at: new Date().toISOString(),
        },
      ];

      const result = await checkDailyResetStatus();
      expect(result.success).toBe(true);
      expect(result.hasResetToday).toBe(true);
      expect(result.hasLight).toBe(true);
      expect(result.hasDark).toBe(false);
      expect(result.isDualMode).toBe(false);
      expect(result.latestPost?.id).toBe('post-1');
    });

    it('identifies dual mode post submitted today (Light & Dark)', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
      mockPostsTable = [
        {
          id: 'post-dual',
          user_id: 'user-123',
          light_img_url: 'https://r2.cozy.dev/light-dual.webp',
          dark_img_url: 'https://r2.cozy.dev/dark-dual.webp',
          created_at: new Date().toISOString(),
        },
      ];

      const result = await checkDailyResetStatus();
      expect(result.success).toBe(true);
      expect(result.hasResetToday).toBe(true);
      expect(result.hasLight).toBe(true);
      expect(result.hasDark).toBe(true);
      expect(result.isDualMode).toBe(true);
      expect(result.latestPost?.id).toBe('post-dual');
    });
  });

  describe('submitDailySpaceReset', () => {
    it('returns error when caller is unauthenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth error') });
      const result = await submitDailySpaceReset('post-1');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Authentication required/i);
    });

    it('returns error when post is not found or owned by someone else', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
      mockPostsTable = []; // Not found

      const result = await submitDailySpaceReset('non-existent-post');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Post not found or unauthorized/i);
    });

    it('rejects space posts created on previous days', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
      const yesterday = new Date(Date.now() - 86400000 * 2).toISOString();
      mockPostsTable = [
        {
          id: 'post-old',
          user_id: 'user-123',
          light_img_url: 'https://r2.cozy.dev/light-old.webp',
          dark_img_url: null,
          created_at: yesterday,
        },
      ];

      const result = await submitDailySpaceReset('post-old');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Daily space reset requires a space uploaded today/i);
    });

    it('rejects duplicate redemption when daily reset already claimed today', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
      mockPostsTable = [
        {
          id: 'post-today',
          user_id: 'user-123',
          light_img_url: 'https://r2.cozy.dev/light.webp',
          dark_img_url: null,
          created_at: new Date().toISOString(),
        },
      ];
      // Seed existing transaction
      mockTransactionsTable = [{ id: 'tx-1', user_id: 'user-123', transaction_type: 'daily_space_reset' }];

      const result = await submitDailySpaceReset('post-today');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Daily space reset already claimed for today/i);
    });

    it('awards +25 points for single mode upload and updates ledger', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
      mockPostsTable = [
        {
          id: 'post-single',
          user_id: 'user-123',
          light_img_url: 'https://r2.cozy.dev/light.webp',
          dark_img_url: null,
          created_at: new Date().toISOString(),
        },
      ];

      const result = await submitDailySpaceReset('post-single');
      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(25);
      expect(result.isDualMode).toBe(false);
      expect(result.newPersonalPoints).toBe(125);
      expect(mockRecordTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          amount: 25,
          transactionType: 'daily_space_reset',
        })
      );
    });

    it('awards +50 points for dual mode upload (Light & Dark) and updates balances', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
      mockPostsTable = [
        {
          id: 'post-dual',
          user_id: 'user-123',
          light_img_url: 'https://r2.cozy.dev/light.webp',
          dark_img_url: 'https://r2.cozy.dev/dark.webp',
          created_at: new Date().toISOString(),
        },
      ];

      const result = await submitDailySpaceReset('post-dual');
      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(50);
      expect(result.isDualMode).toBe(true);
      expect(result.newPersonalPoints).toBe(150);
      expect(mockRecordTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          amount: 50,
          transactionType: 'daily_space_reset',
        })
      );
    });
  });
});

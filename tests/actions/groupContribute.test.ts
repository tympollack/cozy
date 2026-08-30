import { describe, it, expect, vi, beforeEach } from 'vitest';
import { contributeToGroup } from '@/app/actions/groupActions';

const mockGetUser = vi.fn();
const mockServiceFrom = vi.fn();
const mockRpc = vi.fn();
const mockRecordPointTransaction = vi.fn();

vi.mock('@/app/actions/ledgerActions', () => ({
  recordPointTransaction: (...args: unknown[]) => mockRecordPointTransaction(...args),
}));

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
      from: (...args: unknown[]) => mockServiceFrom(...args),
    }),
  }),
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: any[]) => any) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

describe('contributeToGroup Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid point contribution amounts', async () => {
    const resZero = await contributeToGroup('grp_1', 0);
    expect(resZero.success).toBe(false);
    expect(resZero.error).toContain('positive whole number');

    const resDecimal = await contributeToGroup('grp_1', 5.5);
    expect(resDecimal.success).toBe(false);
  });

  it('rejects contribution when user is unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });
    const res = await contributeToGroup('grp_1', 10);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Authentication required');
  });

  it('rejects contribution if user is not a group member', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user_alice' } }, error: null });

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'group_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await contributeToGroup('grp_1', 10);
    expect(res.success).toBe(false);
    expect(res.error).toContain('must be a group member');
  });

  it('rejects contribution when user has insufficient personal points', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user_alice' } }, error: null });

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'group_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: { points: 5 }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await contributeToGroup('grp_1', 10);
    expect(res.success).toBe(false);
    expect(res.error).toContain("don't have enough points");
    expect(res.error).toContain('Available: 5 pts');
  });

  it('successfully executes contribution, deducts personal points, increments group bank, and logs ledger transaction', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user_alice' } }, error: null });

    const mockUpdateUser = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const mockUpdateGroup = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    mockRpc.mockResolvedValue({ error: new Error('RPC function missing on staging') });

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'group_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: { points: 100 }, error: null }),
            }),
          }),
          update: mockUpdateUser,
        };
      }
      if (table === 'groups') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: { pooled_points: 250 }, error: null }),
            }),
          }),
          update: mockUpdateGroup,
        };
      }
      return {};
    });

    const res = await contributeToGroup('grp_1', 25);

    expect(res.success).toBe(true);
    expect(res.newPersonalPoints).toBe(75);
    expect(res.newPooledPoints).toBe(275);

    // Verify user deducted 25 points
    expect(mockUpdateUser).toHaveBeenCalledWith({ points: 75 });
    // Verify group received 25 points
    expect(mockUpdateGroup).toHaveBeenCalledWith({ pooled_points: 275 });
    // Verify ledger record
    expect(mockRecordPointTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_alice',
        amount: -25,
        transactionType: 'group_contribution',
      })
    );
  });
});

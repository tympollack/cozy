import { describe, it, expect, vi, beforeEach } from 'vitest';
import { contributeToGroup } from '@/app/actions/groupActions';

const mockGetUser = vi.fn();
const mockSchemaRpc = vi.fn();
const mockRootRpc = vi.fn();
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
      rpc: (...args: unknown[]) => mockSchemaRpc(...args),
    }),
    rpc: (...args: unknown[]) => mockRootRpc(...args),
  }),
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: any[]) => any) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

describe('contributeToGroup Atomic Server Action & Concurrency Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid point contribution amounts', async () => {
    const resZero = await contributeToGroup('grp_1', 0);
    expect(resZero.success).toBe(false);
    expect(resZero.error).toContain('positive whole number');

    const resNegative = await contributeToGroup('grp_1', -10);
    expect(resNegative.success).toBe(false);

    const resDecimal = await contributeToGroup('grp_1', 5.5);
    expect(resDecimal.success).toBe(false);
  });

  it('rejects contribution when user is unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });
    const res = await contributeToGroup('grp_1', 10);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Authentication required');
  });

  it('returns domain error when user is not a group member without performing fallback writes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user_alice' } }, error: null });
    mockSchemaRpc.mockResolvedValue({
      data: null,
      error: { message: 'User is not a member of the specified group' },
    });

    const res = await contributeToGroup('grp_1', 10);

    expect(res.success).toBe(false);
    expect(res.error).toBe('You must be a group member to contribute.');
    expect(mockRecordPointTransaction).not.toHaveBeenCalled();
  });

  it('returns domain error when user has insufficient points without partial deduction', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user_alice' } }, error: null });
    mockSchemaRpc.mockResolvedValue({
      data: null,
      error: { message: 'Insufficient points for contribution' },
    });

    const res = await contributeToGroup('grp_1', 500);

    expect(res.success).toBe(false);
    expect(res.error).toBe("You don't have enough points for that contribution.");
    expect(mockRecordPointTransaction).not.toHaveBeenCalled();
  });

  it('executes atomic RPC transaction and returns authoritative returned balances', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user_alice' } }, error: null });
    mockSchemaRpc.mockResolvedValue({
      data: [{ new_personal_points: 60, new_pooled_points: 340 }],
      error: null,
    });

    const res = await contributeToGroup('grp_1', 40);

    expect(res.success).toBe(true);
    expect(res.newPersonalPoints).toBe(60);
    expect(res.newPooledPoints).toBe(340);

    // Verify ledger record
    expect(mockRecordPointTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_alice',
        amount: -40,
        transactionType: 'group_contribution',
      })
    );
  });

  it('falls back to public schema RPC alias if schema("cozy") is not exposed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user_alice' } }, error: null });
    mockSchemaRpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find function contribute_points in schema cozy' },
    });
    mockRootRpc.mockResolvedValue({
      data: [{ new_personal_points: 80, new_pooled_points: 120 }],
      error: null,
    });

    const res = await contributeToGroup('grp_1', 20);

    expect(res.success).toBe(true);
    expect(res.newPersonalPoints).toBe(80);
    expect(res.newPooledPoints).toBe(120);
    expect(mockRootRpc).toHaveBeenCalledWith('contribute_points', {
      p_user_id: 'user_alice',
      p_group_id: 'grp_1',
      p_points: 20,
    });
  });

  it('handles overlapping concurrent contributions atomically', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user_alice' } }, error: null });

    let currentPersonal = 100;
    let currentPooled = 200;

    mockSchemaRpc.mockImplementation(async (_fn: string, payload: { p_points: number }) => {
      if (currentPersonal < payload.p_points) {
        return { data: null, error: { message: 'Insufficient points' } };
      }
      currentPersonal -= payload.p_points;
      currentPooled += payload.p_points;
      return {
        data: [{ new_personal_points: currentPersonal, new_pooled_points: currentPooled }],
        error: null,
      };
    });

    // Simulate 2 simultaneous requests of 30 pts from 100 balance
    const [res1, res2] = await Promise.all([
      contributeToGroup('grp_1', 30),
      contributeToGroup('grp_1', 30),
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    // Personal balance went from 100 -> 70 -> 40
    expect(currentPersonal).toBe(40);
    expect(currentPooled).toBe(260);

    // Third overlapping request of 50 pts exceeds remaining 40 balance
    const res3 = await contributeToGroup('grp_1', 50);
    expect(res3.success).toBe(false);
    expect(res3.error).toBe("You don't have enough points for that contribution.");
    // Balance remained 40 without being overdrawn
    expect(currentPersonal).toBe(40);
  });
});

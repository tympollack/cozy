import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTransactionHistory, recordPointTransaction } from '@/app/actions/ledgerActions';

const mockGetUser = vi.fn();
const mockServiceFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  createServerClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
  createServiceClient: () => ({
    schema: () => ({
      from: (...args: unknown[]) => mockServiceFrom(...args),
    }),
  }),
}));

describe('Ledger Actions (ledgerActions.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns authentication error when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });

    const result = await getTransactionHistory();
    expect(result.success).toBe(false);
    expect(result.transactions).toHaveLength(0);
    expect(result.error).toContain('Authentication required');
  });

  it('retrieves paginated transaction history and balance for authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user_alice' } },
      error: null,
    });

    const mockTransactions = [
      {
        id: 'tx_1',
        user_id: 'user_alice',
        amount: 50,
        transaction_type: 'upload_reward',
        description: 'Shared dual Light & Dark spaces (+50 pts)',
        created_at: new Date().toISOString(),
      },
      {
        id: 'tx_2',
        user_id: 'user_alice',
        amount: -30,
        transaction_type: 'sticker_purchase',
        description: 'Purchased "Warm Mug" sticker',
        created_at: new Date().toISOString(),
      },
    ];

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { points: 120 } }),
            }),
          }),
        };
      }
      if (table === 'point_transactions') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: vi.fn().mockResolvedValue({
                  data: mockTransactions,
                  count: 2,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await getTransactionHistory(20, 0);

    expect(result.success).toBe(true);
    expect(result.currentPoints).toBe(120);
    expect(result.transactions).toHaveLength(2);
    expect(result.totalCount).toBe(2);
    expect(result.hasMore).toBe(false);
  });

  it('auto-provisions genesis initial balance transaction when user has points but 0 transactions', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user_bob' } },
      error: null,
    });

    const mockGenesisTx = {
      id: 'tx_genesis',
      user_id: 'user_bob',
      amount: 75,
      transaction_type: 'welcome_bonus',
      description: 'Cozy Welcome & Initial Balance',
      created_at: new Date().toISOString(),
    };

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { points: 75 } }),
            }),
          }),
        };
      }
      if (table === 'point_transactions') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: vi.fn().mockResolvedValue({
                  data: [],
                  count: 0,
                  error: null,
                }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: mockGenesisTx,
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await getTransactionHistory(20, 0);

    expect(result.success).toBe(true);
    expect(result.currentPoints).toBe(75);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].transaction_type).toBe('welcome_bonus');
    expect(result.transactions[0].amount).toBe(75);
  });

  it('records transaction via recordPointTransaction helper', async () => {
    const insertedTx = {
      id: 'tx_new',
      user_id: 'user_carol',
      amount: 15,
      transaction_type: 'challenge_complete',
      description: 'Completed group challenge',
      created_at: new Date().toISOString(),
    };

    mockServiceFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: insertedTx, error: null }),
        }),
      }),
    });

    const res = await recordPointTransaction({
      userId: 'user_carol',
      amount: 15,
      transactionType: 'challenge_complete',
      description: 'Completed group challenge',
    });

    expect(res).toEqual(insertedTx);
  });
});

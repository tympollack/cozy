import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  awardStarterSandboxBonusAction,
  saveUserFocusNookAction,
} from '@/app/actions/onboardingActions';

const mockGetUser = vi.fn();
const mockRecordPointTransaction = vi.fn();

let mockUsersDb: Array<{
  id: string;
  points: number;
  hub_preferences?: Record<string, unknown>;
}> = [];

vi.mock('@/app/actions/ledgerActions', () => ({
  recordPointTransaction: (...args: unknown[]) => mockRecordPointTransaction(...args),
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
        if (table === 'users') {
          return {
            select: () => ({
              eq: (field: string, val: string) => ({
                maybeSingle: async () => {
                  const u = mockUsersDb.find((user) => (user as any)[field] === val);
                  return { data: u || null, error: null };
                },
              }),
            }),
            update: (updates: Record<string, unknown>) => ({
              eq: async (field: string, val: string) => {
                const u = mockUsersDb.find((user) => (user as any)[field] === val);
                if (u) {
                  Object.assign(u, updates);
                }
                return { error: null };
              },
            }),
          };
        }
        return {};
      },
    }),
  }),
}));

describe('onboardingActions server suite', () => {
  beforeEach(() => {
    mockUsersDb = [{ id: 'user-onboard-1', points: 10, hub_preferences: {} }];
    mockRecordPointTransaction.mockReset();
    mockGetUser.mockReset();
  });

  describe('awardStarterSandboxBonusAction', () => {
    it('returns guestMode success when unauthenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const res = await awardStarterSandboxBonusAction();

      expect(res.success).toBe(true);
      expect(res.guestMode).toBe(true);
      expect(res.pointsAwarded).toBe(50);
      expect(mockRecordPointTransaction).not.toHaveBeenCalled();
    });

    it('awards 50 points, updates user balance and writes to ledger when authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-onboard-1' } },
        error: null,
      });

      const res = await awardStarterSandboxBonusAction();

      expect(res.success).toBe(true);
      expect(res.guestMode).toBe(false);
      expect(res.pointsAwarded).toBe(50);
      expect(res.newBalance).toBe(60);

      expect(mockUsersDb[0].points).toBe(60);
      expect(mockRecordPointTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-onboard-1',
          amount: 50,
          transactionType: 'onboarding_sandbox',
        })
      );
    });
  });

  describe('saveUserFocusNookAction', () => {
    it('returns invalid nook error if invalid input provided', async () => {
      const res = await saveUserFocusNookAction('');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Invalid corner nook.');
    });

    it('saves clean nook in guest mode when unauthenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const res = await saveUserFocusNookAction('Bedside Table');
      expect(res.success).toBe(true);
      expect(res.nook).toBe('bedside table');
    });

    it('persists focusNook to hub_preferences when authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-onboard-1' } },
        error: null,
      });

      const res = await saveUserFocusNookAction('Reading_Chair');
      expect(res.success).toBe(true);
      expect(res.nook).toBe('reading_chair');
      expect(mockUsersDb[0].hub_preferences?.focusNook).toBe('reading_chair');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  claimPlotOneTap,
  getVillageSuggestions,
  verifyProximity,
  triggerPostcard,
} from '@/app/actions/claimActions';

const mockGetUser = vi.fn();
const mockRecordPointTransaction = vi.fn();

let mockPostsDb: Array<{
  id: string;
  claimed_by_user_id: string | null;
  verification_status: string;
}> = [];

let mockLocationsDb: Array<{
  post_id: string;
  exact_lat: number;
  exact_lng: number;
  postcard_pin?: string;
}> = [];

let mockGroupsDb: Array<{
  id: string;
  name: string;
  type: string;
  invite_code: string;
}> = [];

vi.mock('@/app/actions/ledgerActions', () => ({
  recordPointTransaction: (...args: unknown[]) => mockRecordPointTransaction(...args),
}));

vi.mock('@/lib/supabase', () => ({
  createServerClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
    schema: () => ({
      from: (table: string) => {
        if (table === 'posts') {
          return {
            update: (updates: Record<string, unknown>) => ({
              eq: async (field: string, val: string) => {
                const post = mockPostsDb.find((p) => (p as any)[field] === val);
                if (post) Object.assign(post, updates);
                return { error: null };
              },
            }),
          };
        }
        return {};
      },
    }),
  }),
  createServiceClient: () => ({
    schema: () => ({
      from: (table: string) => {
        if (table === 'posts') {
          return {
            select: () => ({
              eq: (field: string, val: string) => ({
                maybeSingle: async () => {
                  const p = mockPostsDb.find((post) => (post as any)[field] === val);
                  return { data: p || null, error: null };
                },
              }),
            }),
            update: (updates: Record<string, unknown>) => ({
              eq: async (field: string, val: string) => {
                const p = mockPostsDb.find((post) => (post as any)[field] === val);
                if (p) Object.assign(p, updates);
                return { error: null };
              },
            }),
          };
        }
        if (table === 'post_locations') {
          return {
            select: () => ({
              eq: (field: string, val: string) => ({
                single: async () => {
                  const loc = mockLocationsDb.find((l) => (l as any)[field] === val);
                  return { data: loc || null, error: null };
                },
              }),
            }),
            update: (updates: Record<string, unknown>) => ({
              eq: async (field: string, val: string) => {
                const loc = mockLocationsDb.find((l) => (l as any)[field] === val);
                if (loc) Object.assign(loc, updates);
                return { error: null };
              },
            }),
          };
        }
        if (table === 'groups') {
          return {
            select: () => ({
              limit: async () => ({ data: mockGroupsDb, error: null }),
            }),
          };
        }
        return {};
      },
    }),
  }),
}));

describe('claimActions server suite (Phase 3 Onboarding)', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockRecordPointTransaction.mockReset();
    mockPostsDb = [
      { id: 'post-unclaimed-1', claimed_by_user_id: null, verification_status: 'unclaimed' },
      { id: 'post-claimed-2', claimed_by_user_id: 'other-user', verification_status: 'claimed' },
    ];
    mockLocationsDb = [
      { post_id: 'post-unclaimed-1', exact_lat: 40.7128, exact_lng: -74.006 },
    ];
    mockGroupsDb = [
      { id: 'grp-1', name: 'Pine Village', type: 'village', invite_code: 'pine-village' },
    ];
  });

  describe('claimPlotOneTap', () => {
    it('requires authentication to claim space', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const res = await claimPlotOneTap('post-unclaimed-1');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Authentication required/i);
    });

    it('claims an unclaimed space and records ledger entry', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-claimer-1' } },
        error: null,
      });

      const res = await claimPlotOneTap('post-unclaimed-1');

      expect(res.success).toBe(true);
      expect(res.claimedBy).toBe('user-claimer-1');
      expect(mockPostsDb[0].claimed_by_user_id).toBe('user-claimer-1');
      expect(mockPostsDb[0].verification_status).toBe('claimed');

      expect(mockRecordPointTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-claimer-1',
          amount: 25,
          transactionType: 'space_claimed',
        })
      );
    });

    it('prevents claiming a space claimed by someone else', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-claimer-1' } },
        error: null,
      });

      const res = await claimPlotOneTap('post-claimed-2');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/already been claimed/i);
    });
  });

  describe('getVillageSuggestions', () => {
    it('returns suggestions for sunshine vibe', async () => {
      const suggestions = await getVillageSuggestions('sunshine');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('name');
      expect(suggestions[0]).toHaveProperty('inviteCode');
      expect(suggestions[0].vibeMatch).toBe('sunshine');
    });

    it('returns default suggestions for neutral or unknown vibe', async () => {
      const suggestions = await getVillageSuggestions('neutral');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].vibeMatch).toBe('neutral');
    });
  });

  describe('verifyProximity', () => {
    it('succeeds when user is within 50 meters', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-claimer-1' } },
        error: null,
      });

      const res = await verifyProximity('post-unclaimed-1', 40.7128001, -74.0060001);
      expect(res.success).toBe(true);
    });

    it('fails when user is farther than 50 meters', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-claimer-1' } },
        error: null,
      });

      const res = await verifyProximity('post-unclaimed-1', 41.0, -74.006);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/not close enough/i);
    });
  });

  describe('triggerPostcard', () => {
    it('generates a 6-digit pin and updates status', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-claimer-1' } },
        error: null,
      });

      const res = await triggerPostcard('post-unclaimed-1');
      expect(res.success).toBe(true);
      expect(mockLocationsDb[0].postcard_pin).toBeDefined();
      expect(mockLocationsDb[0].postcard_pin).toMatch(/^\d{6}$/);
    });
  });
});

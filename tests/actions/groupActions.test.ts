import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGroupWithMembers, getGroupPageBundle } from '@/app/actions/groupActions';

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

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: any[]) => any) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

describe('Group Actions & Dynamic Map Theme Bundle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads group with dynamic map theme populated from database', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user_1' } },
      error: null,
    });

    const mockGroup = {
      id: 'grp_orbital',
      name: 'groupgroup1',
      type: 'space_station',
      min_members: 1,
      max_members: 9999,
      pooled_points: 0,
      theme_id: 'orbital_collective',
      invite_code: 'B80A12E6',
      created_at: new Date().toISOString(),
    };

    const mockMemberships = [
      { user_id: 'user_1', role: 'admin', joined_at: new Date().toISOString() },
    ];

    const mockUsers = [
      {
        id: 'user_1',
        display_name: 'Pilot You',
        avatar_url: null,
        points: 200,
        shell_type: 'default_dollhouse',
        vibe_status: 'sunshine',
      },
    ];

    const mockDbThemes = [
      {
        id: 'orbital_collective',
        name: 'Orbital Collective',
        background_image: '/images/neighborhood-orbital.jpg',
        palette: 'futuristic',
        vignette_gradient: 'radial-gradient(...)',
        anchors: [
          { x: 49, y: 11 },
          { x: 25, y: 32 },
        ],
        is_active: true,
        display_order: 1,
      },
    ];

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'groups') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockGroup, error: null }),
            }),
          }),
        };
      }
      if (table === 'group_members') {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue({ data: mockMemberships, error: null }),
          }),
        };
      }
      if (table === 'users') {
        return {
          select: () => ({
            in: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
          }),
        };
      }
      if (table === 'village_map_themes') {
        return {
          select: () => ({
            order: vi.fn().mockResolvedValue({ data: mockDbThemes, error: null }),
          }),
        };
      }
      return {};
    });

    const result = await getGroupWithMembers('grp_orbital');

    expect(result).not.toBeNull();
    expect(result!.group.name).toBe('groupgroup1');
    expect(result!.members).toHaveLength(1);
    expect(result!.currentUserRole).toBe('admin');
    expect(result!.mapTheme).toBeDefined();
    expect(result!.mapTheme!.id).toBe('orbital_collective');
    expect(result!.mapTheme!.anchors).toEqual([
      { x: 49, y: 11 },
      { x: 25, y: 32 },
    ]);
  });
});

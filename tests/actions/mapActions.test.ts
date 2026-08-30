import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getVillageMapThemes, getVillageMapTheme } from '@/app/actions/mapActions';

const mockServiceSelect = vi.fn();

vi.mock('@/lib/supabase', () => ({
  createServiceClient: () => ({
    schema: () => ({
      from: () => ({
        select: (...args: unknown[]) => mockServiceSelect(...args),
      }),
    }),
  }),
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: any[]) => any) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

describe('Map Actions (mapActions.ts) & Dynamic Plot Coordinates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retrieves custom plot anchors from cozy.village_map_themes database', async () => {
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
          { x: 10, y: 42 },
          { x: 21, y: 51 },
          { x: 77, y: 77 },
        ],
        is_active: true,
        display_order: 1,
      },
    ];

    mockServiceSelect.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: mockDbThemes,
        error: null,
      }),
    });

    const theme = await getVillageMapTheme('orbital_collective');

    expect(theme.id).toBe('orbital_collective');
    expect(theme.anchors).toHaveLength(5);
    expect(theme.anchors[0]).toEqual({ x: 49, y: 11 });
    expect(theme.anchors[1]).toEqual({ x: 25, y: 32 });
  });

  it('suppresses disabled built-in themes when is_active is false in database', async () => {
    const mockDbThemes = [
      {
        id: 'orbital_collective',
        name: 'Orbital Collective',
        background_image: '/images/neighborhood-orbital.jpg',
        palette: 'futuristic',
        vignette_gradient: 'radial-gradient(...)',
        anchors: [{ x: 50, y: 50 }],
        is_active: false, // Explicitly disabled
        display_order: 1,
      },
    ];

    mockServiceSelect.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: mockDbThemes,
        error: null,
      }),
    });

    const themes = await getVillageMapThemes();

    // Disabled theme is deleted from active themes map
    expect(themes.orbital_collective).toBeUndefined();
    expect(themes.mossy_hearth_village).toBeDefined();
  });

  it('resolves futuristic fallback maps by group.type when theme_id row is not in database', async () => {
    mockServiceSelect.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [], // No custom rows
        error: null,
      }),
    });

    // When a futuristic group has theme_id: 'neon_neighborhood' or 'cyber_town'
    const themeFromType = await getVillageMapTheme('neon_neighborhood', 'neighborhood');
    expect(themeFromType.id).toBe('orbital_collective');
    expect(themeFromType.palette).toBe('futuristic');

    const themeFromTown = await getVillageMapTheme(null, 'town');
    expect(themeFromTown.id).toBe('orbital_collective');

    const themeFromCozy = await getVillageMapTheme('custom_missing', 'household');
    expect(themeFromCozy.id).toBe('mossy_hearth_village');
  });

  it('falls back to static defaults when database returns an error or empty result', async () => {
    mockServiceSelect.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [],
        error: new Error('Database connection timeout'),
      }),
    });

    const themes = await getVillageMapThemes();

    expect(themes.mossy_hearth_village).toBeDefined();
    expect(themes.orbital_collective).toBeDefined();
    expect(themes.mossy_hearth_village.anchors.length).toBeGreaterThan(0);
  });

  it('correctly clamps and normalizes invalid coordinate values', async () => {
    const mockDbThemes = [
      {
        id: 'custom_village',
        name: 'Custom Village',
        background_image: '/images/custom.jpg',
        palette: 'cozy',
        vignette_gradient: null,
        anchors: [
          { x: -10, y: 150 }, // Out of bounds coordinates
          { x: '45.5', y: '60.2' },
        ],
        is_active: true,
        display_order: 0,
      },
    ];

    mockServiceSelect.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: mockDbThemes,
        error: null,
      }),
    });

    const theme = await getVillageMapTheme('custom_village');

    expect(theme.anchors[0]).toEqual({ x: 0, y: 100 });
    expect(theme.anchors[1]).toEqual({ x: 45.5, y: 60.2 });
  });
});

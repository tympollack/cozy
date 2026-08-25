// ---------------------------------------------------------------------------
// Village Map Themes — Anchor-Based 2.5D Plot Layout Engine
//
// Each theme defines explicit percentage-based anchor points (x%, y%) that
// correspond to real visual plot locations on the background image asset.
// Members are assigned to anchors sequentially; unoccupied anchors render
// as vacant "+ Invite" plots.
//
// To add a new theme:
//   1. Add a VillageMapTheme entry to VILLAGE_MAP_THEMES.
//   2. Map relevant group types to its id in GROUP_TYPE_TO_THEME.
// ---------------------------------------------------------------------------

export interface AnchorPoint {
  /** Percentage left [0..100] relative to the 4:3 container. */
  x: number;
  /** Percentage top [0..100] relative to the 4:3 container. */
  y: number;
}

export interface VillageMapTheme {
  id: string;
  name: string;
  /** Path to the background image served from /public. */
  backgroundImage: string;
  palette: 'cozy' | 'futuristic';
  /**
   * Ordered anchor points for plot placement.
   * The first anchor hosts the first member, second → second member, etc.
   * Unoccupied anchors (up to openInviteSlots) render as vacant plots.
   * Anchors beyond the displayed plot count are hidden.
   */
  anchors: AnchorPoint[];
  /** CSS gradient for the soft vignette overlay on top of the background. */
  vignetteGradient: string;
}

// ---------------------------------------------------------------------------
// Mossy Hearth Village
// Background: neighborhood-village.jpg — top-down 2.5D cozy garden village
// with fenced garden plots arranged in two rings around a cobblestone fountain.
//
// Anchor tuning guide: x=0 is left edge, y=0 is top edge of the 4:3 container.
// ---------------------------------------------------------------------------

const MOSSY_HEARTH_VILLAGE: VillageMapTheme = {
  id: 'mossy_hearth_village',
  name: 'Mossy Hearth Village',
  backgroundImage: '/images/neighborhood-village.jpg',
  palette: 'cozy',
  vignetteGradient:
    'radial-gradient(circle at 50% 50%, rgba(250,240,224,0.10) 0%, rgba(84,50,32,0.30) 100%)',
  anchors: [
    // ── Inner ring (4 fenced plot pads adjacent to the central fountain path)
    { x: 31, y: 24 }, // top-left
    { x: 73, y: 28 }, // top-right
    { x: 76, y: 60 }, // bottom-right
    { x: 28, y: 60 }, // bottom-left
    // ── Outer ring (8 garden plots along the outer stone wall)
    { x: 49, y: 13 },
    { x: 80, y: 29 },
    { x: 85, y: 48 },
    { x: 76, y: 68 },
    { x: 61, y: 80 },
    { x: 49, y: 84 },
    { x: 33, y: 79 },
    { x: 15, y: 47 },
  ],
};

// ---------------------------------------------------------------------------
// Orbital Collective
// Background: neighborhood-orbital.jpg — futuristic space station with
// circular docking platforms connected by glowing neon conduit rails.
// ---------------------------------------------------------------------------

const ORBITAL_COLLECTIVE: VillageMapTheme = {
  id: 'orbital_collective',
  name: 'Orbital Collective',
  backgroundImage: '/images/neighborhood-orbital.jpg',
  palette: 'futuristic',
  vignetteGradient:
    'radial-gradient(circle at 50% 50%, rgba(5,12,24,0.25) 0%, rgba(5,12,24,0.65) 100%)',
  anchors: [
    // ── Primary ring — outer docking pads
    { x: 52, y: 11 },
    { x: 74, y: 22 },
    { x: 83, y: 45 },
    { x: 73, y: 68 },
    { x: 52, y: 79 },
    { x: 27, y: 72 },
    { x: 17, y: 51 },
    { x: 22, y: 28 },
    // ── Secondary ring — inner mid-ring pads
    { x: 64, y: 39 },
    { x: 37, y: 52 },
  ],
};

// ---------------------------------------------------------------------------
// Theme registry
// ---------------------------------------------------------------------------

export const VILLAGE_MAP_THEMES: Record<string, VillageMapTheme> = {
  mossy_hearth_village: MOSSY_HEARTH_VILLAGE,
  orbital_collective: ORBITAL_COLLECTIVE,
};

/** Maps group type keys → theme id. */
const GROUP_TYPE_TO_THEME: Record<string, string> = {
  household: 'mossy_hearth_village',
  building: 'mossy_hearth_village',
  village: 'mossy_hearth_village',
  neighborhood: 'orbital_collective',
  town: 'orbital_collective',
  city: 'orbital_collective',
  island: 'orbital_collective',
  space_station: 'orbital_collective',
};

/**
 * Returns the VillageMapTheme for a given group type string.
 * Falls back to mossy_hearth_village for unrecognised types.
 */
export function getThemeForGroup(groupType: string): VillageMapTheme {
  const themeId = GROUP_TYPE_TO_THEME[groupType] ?? 'mossy_hearth_village';
  return VILLAGE_MAP_THEMES[themeId] ?? MOSSY_HEARTH_VILLAGE;
}

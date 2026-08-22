export interface ShellSlot {
  id: string;
  label: string;
  icon: string;
  x: number; // percentage left [0..100]
  y: number; // percentage top [0..100]
  w: number; // percentage width [0..100]
  h: number; // percentage height [0..100]
  /** Minimum expansion tier required to activate this slot (1 = always active). */
  tier: 1 | 2 | 3;
}

export interface ShellDefinition {
  id: string;
  name: string;
  description: string;
  badge: string;
  themeColor: string;
  accentColor: string;
  bgGradient: string;
  wallTexture: string;
  roofGradient: string;
  /** Minimum expansion tier required to switch to this theme. */
  themeTier: 1 | 2;
  slots: ShellSlot[];
}

// ---------------------------------------------------------------------------
// Tier meta — costs and display names
// ---------------------------------------------------------------------------

/** Token cost to unlock each tier (keyed by the target tier number). */
export const TIER_UNLOCK_COSTS: Record<number, number> = {
  2: 100,
  3: 300,
};

/** Human-readable tier names. */
export const TIER_NAMES: Record<number, string> = {
  1: 'Cozy Corner',
  2: 'Cozy Cottage',
  3: 'Grand Estate',
};

/** Emoji badge per tier. */
export const TIER_BADGES: Record<number, string> = {
  1: '🪴',
  2: '🏡',
  3: '🏰',
};

// ---------------------------------------------------------------------------
// Shell definitions
// Slot tier mapping:
//   Slot index 0 → tier 1 (always active)
//   Slot index 1 → tier 2 (Cottage unlock)
//   Slot index 2 → tier 3 (Estate unlock)
//   Slot index 3 → tier 3 (Estate unlock)
// ---------------------------------------------------------------------------

export const SHELL_DEFINITIONS: Record<string, ShellDefinition> = {
  default_dollhouse: {
    id: 'default_dollhouse',
    name: 'Cozy Dollhouse',
    description: 'A charming 4-room miniature dollhouse with warm wooden partitions.',
    badge: '🏡 Dollhouse',
    themeColor: '#7a4f3a',
    accentColor: '#f0c060',
    bgGradient: 'linear-gradient(135deg, #2d2420 0%, #1a1410 100%)',
    wallTexture: 'rgba(245, 237, 224, 0.07)',
    roofGradient: 'linear-gradient(180deg, #c4704a 0%, #7a4f3a 100%)',
    themeTier: 1,
    slots: [
      { id: 'room_top_left',     label: 'Cozy Corner',      icon: '🛏️', x: 8,  y: 16, w: 40, h: 36, tier: 1 },
      { id: 'room_top_right',    label: 'Sunroom Studio',   icon: '🎨', x: 52, y: 16, w: 40, h: 36, tier: 2 },
      { id: 'room_bottom_left',  label: 'Warm Living Room', icon: '🛋️', x: 8,  y: 56, w: 40, h: 36, tier: 3 },
      { id: 'room_bottom_right', label: 'Kitchen & Nook',   icon: '☕', x: 52, y: 56, w: 40, h: 36, tier: 3 },
    ],
  },
  cozy_campsite: {
    id: 'cozy_campsite',
    name: 'Forest Campsite',
    description: 'A serene woodland clearing surrounded by tall pines and starry skies.',
    badge: '⛺ Campsite',
    themeColor: '#2e4a3b',
    accentColor: '#e8a87c',
    bgGradient: 'linear-gradient(135deg, #13241b 0%, #0a140f 100%)',
    wallTexture: 'rgba(46, 74, 59, 0.15)',
    roofGradient: 'linear-gradient(180deg, #3d634f 0%, #2e4a3b 100%)',
    themeTier: 2,
    slots: [
      { id: 'spot_tent',      label: 'Starlight Tent',    icon: '⛺', x: 8,  y: 16, w: 40, h: 36, tier: 1 },
      { id: 'spot_campfire',  label: 'Campfire Hearth',   icon: '🔥', x: 52, y: 16, w: 40, h: 36, tier: 2 },
      { id: 'spot_hammock',   label: 'Pine Hammock',      icon: '🌲', x: 8,  y: 56, w: 40, h: 36, tier: 3 },
      { id: 'spot_overlook',  label: 'Mountain Overlook', icon: '⛰️', x: 52, y: 56, w: 40, h: 36, tier: 3 },
    ],
  },
  stone_castle: {
    id: 'stone_castle',
    name: 'Mystic Keep',
    description: 'An ancient stone sanctuary with glowing alchemy runes and tall towers.',
    badge: '🏰 Keep',
    themeColor: '#3c3d52',
    accentColor: '#c0a0f0',
    bgGradient: 'linear-gradient(135deg, #1d1e2b 0%, #11121c 100%)',
    wallTexture: 'rgba(192, 160, 240, 0.08)',
    roofGradient: 'linear-gradient(180deg, #58597a 0%, #3c3d52 100%)',
    themeTier: 2,
    slots: [
      { id: 'keep_tower',   label: 'Astral Tower',      icon: '🔮', x: 8,  y: 16, w: 40, h: 36, tier: 1 },
      { id: 'keep_library', label: 'Ancient Library',   icon: '📜', x: 52, y: 16, w: 40, h: 36, tier: 2 },
      { id: 'keep_hall',    label: 'Great Hearth Hall', icon: '🛡️', x: 8,  y: 56, w: 40, h: 36, tier: 3 },
      { id: 'keep_garden',  label: 'Cloister Garden',  icon: '🌿', x: 52, y: 56, w: 40, h: 36, tier: 3 },
    ],
  },
};

export function getShellDefinition(shellType?: string | null): ShellDefinition {
  if (!shellType || !(shellType in SHELL_DEFINITIONS)) {
    return SHELL_DEFINITIONS.default_dollhouse;
  }
  return SHELL_DEFINITIONS[shellType];
}

/**
 * Returns only the slots unlocked for the given expansion tier.
 */
export function getActiveSlots(shell: ShellDefinition, expansionTier: number): ShellSlot[] {
  return shell.slots.filter((s) => s.tier <= expansionTier);
}

/**
 * Returns only the slots that are locked for the given expansion tier.
 */
export function getLockedSlots(shell: ShellDefinition, expansionTier: number): ShellSlot[] {
  return shell.slots.filter((s) => s.tier > expansionTier);
}

/**
 * Returns shell definitions available for the user's theme unlock state.
 * Before first upload: only default_dollhouse. After: all themes.
 */
export function getAvailableShells(themesUnlocked: boolean): ShellDefinition[] {
  return Object.values(SHELL_DEFINITIONS).filter(
    (def) => themesUnlocked || def.themeTier === 1
  );
}

/**
 * Helper to check if a given slot ID belongs to the active shell definition.
 */
export function isSlotInShell(slotId: string | null | undefined, shell: ShellDefinition): boolean {
  if (!slotId) return false;
  return shell.slots.some((s) => s.id === slotId);
}

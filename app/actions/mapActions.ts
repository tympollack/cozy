'use server';

import { createServiceClient } from '@/lib/supabase';
import { unstable_cache } from 'next/cache';
import {
  type VillageMapTheme,
  type AnchorPoint,
  VILLAGE_MAP_THEMES,
  getThemeForGroup,
} from '@/config/villageMapThemes';

interface DbVillageMapThemeRow {
  id: string;
  name: string;
  background_image: string;
  palette: 'cozy' | 'futuristic';
  vignette_gradient: string | null;
  anchors: AnchorPoint[] | null;
  is_active: boolean | null;
  display_order: number | null;
  created_at?: string;
  updated_at?: string;
}

const TRUSTED_IMAGE_DOMAINS = [
  'sunshade.icu',
  'supabase.co',
  'vercel.app',
  'unsplash.com',
  'makerverse.com',
];

/**
 * Validates theme background image URLs against trusted relative paths and CDN origins.
 */
function sanitizeThemeImageUrl(url: unknown, fallbackUrl: string): string {
  if (typeof url !== 'string' || !url.trim()) return fallbackUrl;
  const trimmed = url.trim();

  // Safe relative paths (e.g. /images/neighborhood-village.jpg)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    if (trimmed.includes('..') || trimmed.includes('\\')) {
      return fallbackUrl;
    }
    return trimmed;
  }

  // Trusted remote HTTPS origins
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return fallbackUrl;
    }
    const hostname = parsed.hostname.toLowerCase();
    const isTrusted = TRUSTED_IMAGE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
    if (isTrusted) {
      return trimmed;
    }
  } catch {
    // Malformed URL
  }

  return fallbackUrl;
}

/**
 * Normalizes a database row from cozy.village_map_themes into a VillageMapTheme.
 */
function normalizeThemeRow(row: DbVillageMapThemeRow): VillageMapTheme {
  const fallback = VILLAGE_MAP_THEMES[row.id] || VILLAGE_MAP_THEMES.mossy_hearth_village;
  const rawAnchors = Array.isArray(row.anchors) ? row.anchors : fallback.anchors;

  const cleanAnchors: AnchorPoint[] = rawAnchors.map((a) => ({
    x: Math.min(100, Math.max(0, Number(a.x) || 0)),
    y: Math.min(100, Math.max(0, Number(a.y) || 0)),
  }));

  const safeBgImage = sanitizeThemeImageUrl(row.background_image, fallback.backgroundImage);

  return {
    id: row.id,
    name: row.name || fallback.name,
    backgroundImage: safeBgImage,
    palette: (row.palette === 'futuristic' ? 'futuristic' : 'cozy') as 'cozy' | 'futuristic',
    vignetteGradient: row.vignette_gradient || fallback.vignetteGradient,
    anchors: cleanAnchors.length > 0 ? cleanAnchors : fallback.anchors,
  };
}

/**
 * Cached server query to retrieve all active map themes from cozy.village_map_themes.
 */
export const getVillageMapThemes = unstable_cache(
  async (): Promise<Record<string, VillageMapTheme>> => {
    try {
      const service = createServiceClient();
      const { data, error } = await service
        .schema('cozy')
        .from('village_map_themes')
        .select('*')
        .order('display_order', { ascending: true });

      if (error || !data || data.length === 0) {
        if (error) {
          console.warn('[getVillageMapThemes] Falling back to default static themes:', error.message);
        }
        return { ...VILLAGE_MAP_THEMES };
      }

      const map: Record<string, VillageMapTheme> = { ...VILLAGE_MAP_THEMES };
      (data as unknown as DbVillageMapThemeRow[]).forEach((row) => {
        if (row.is_active === false) {
          delete map[row.id];
        } else {
          map[row.id] = normalizeThemeRow(row);
        }
      });

      return map;
    } catch (err) {
      console.error('[getVillageMapThemes] Unexpected error loading themes:', err);
      return { ...VILLAGE_MAP_THEMES };
    }
  },
  ['village-map-themes-all-cache'],
  {
    tags: ['village_map_themes', 'groups'],
    revalidate: 30,
  }
);

/**
 * Fetches a single VillageMapTheme by theme ID and/or group type from database with fallback.
 * Prioritizes direct themeId match in active themes, then resolves by groupType before
 * falling back to static presets.
 */
export async function getVillageMapTheme(
  themeId?: string | null,
  groupType?: string | null
): Promise<VillageMapTheme> {
  const allThemes = await getVillageMapThemes();

  // 1. Direct active theme row match by themeId
  if (themeId && allThemes[themeId]) {
    return allThemes[themeId];
  }

  // 2. Direct active theme row match by groupType
  if (groupType && allThemes[groupType]) {
    return allThemes[groupType];
  }

  // 3. Resolved mapped theme by groupType (e.g. 'space_station' | 'neighborhood' -> 'orbital_collective')
  if (groupType) {
    return getThemeForGroup(groupType, allThemes);
  }

  // 4. Resolved mapped theme by themeId (e.g. 'neon_neighborhood' -> 'orbital_collective')
  if (themeId) {
    return getThemeForGroup(themeId, allThemes);
  }

  // 5. Safe default active theme
  return allThemes['mossy_hearth_village'] || Object.values(allThemes)[0] || VILLAGE_MAP_THEMES.mossy_hearth_village;
}

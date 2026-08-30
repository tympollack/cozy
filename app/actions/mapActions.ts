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

  return {
    id: row.id,
    name: row.name || fallback.name,
    backgroundImage: row.background_image || fallback.backgroundImage,
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
        if (row.is_active !== false) {
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
 * Fetches a single VillageMapTheme by theme ID or group type from database with fallback.
 */
export async function getVillageMapTheme(themeIdOrGroupType: string): Promise<VillageMapTheme> {
  const allThemes = await getVillageMapThemes();
  if (allThemes[themeIdOrGroupType]) {
    return allThemes[themeIdOrGroupType];
  }
  return getThemeForGroup(themeIdOrGroupType, allThemes);
}

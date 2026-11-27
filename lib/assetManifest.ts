import {
  KENNEY_CDN_BASE,
  ISOMETRIC_TILES,
  UI_SPRITES,
  isometricTilesAtlas,
  uiSpritesAtlas,
  getFrameCoordinates,
  getKenneyAssetUrl,
  getKenneyAudioUrl,
  loadCatalogAssets,
  assetRegistry,
  type AtlasFrame,
  type CatalogAsset,
  type HotSwapListener,
  type IsometricTileKey,
  type SupabaseClientLike,
  type UiSpriteKey,
} from '@digitalcanopy/assets';
import type { FurnitureSpriteType } from '@/src/components/dollhouse/types';
import type { VillageBuildingType, VillageTileType } from '@/src/components/village/types';

export const COZY_APP_SCOPE = 'cozy';

export interface CozyResolvedAsset {
  assetKey: string;
  cdnUrl: string;
  fallbackUrl?: string;
  atlasUrl?: string;
  atlasFrame?: AtlasFrame;
}

export const COZY_HABITAT_FALLBACKS: Record<string, string> = {
  default_dollhouse: '/images/habitats/cottage.jpg',
  cozy_campsite: '/images/habitats/campsite.jpg',
  stone_castle: '/images/habitats/castle.jpg',
  futuristic: '/images/habitats/orbital_pod.jpg',
};

export const COZY_HABITAT_CATALOG_KEYS: Record<string, string> = {
  default_dollhouse: 'cozy-building-cottage',
  cozy_campsite: 'cozy-habitat-campsite',
  stone_castle: 'cozy-habitat-castle',
  futuristic: 'cozy-habitat-orbital-pod',
};

export const COZY_FURNITURE_TILE_KEYS: Record<FurnitureSpriteType, IsometricTileKey> = {
  desk_wooden: 'tile-isometric-table',
  chair_cozy: 'tile-isometric-chair',
  armchair_amber: 'tile-isometric-chair',
  lamp_floor_glowing: 'tile-isometric-torch',
  lamp_desk: 'tile-isometric-torch',
  bookshelf_wood: 'tile-isometric-bookshelf',
  potted_monstera: 'tile-isometric-grass',
  cozy_rug_woven: 'tile-isometric-rug',
  coffee_table: 'tile-isometric-table',
  steaming_mug: 'tile-isometric-barrel',
  cushioned_bed: 'tile-isometric-wood-floor',
  wardrobe_cabinet: 'tile-isometric-chest-closed',
};

export const COZY_VILLAGE_TILE_KEYS: Record<
  VillageTileType,
  { catalogKey: string; tileKey: IsometricTileKey }
> = {
  grass_meadow: { catalogKey: 'cozy-tile-grass-meadow', tileKey: 'tile-isometric-grass' },
  cobblestone_path: { catalogKey: 'cozy-tile-cobblestone', tileKey: 'tile-isometric-stone' },
  water_stream: { catalogKey: 'cozy-tile-water-stream', tileKey: 'tile-isometric-water' },
  dirt_garden: { catalogKey: 'cozy-tile-dirt-garden', tileKey: 'tile-isometric-dirt' },
};

export const COZY_VILLAGE_BUILDING_KEYS: Record<
  VillageBuildingType,
  { catalogKey: string; tileKey: IsometricTileKey; packPath: string }
> = {
  cottage_wood: {
    catalogKey: 'cozy-building-cottage',
    tileKey: 'tile-isometric-wall-wood',
    packPath: 'buildings/cottage',
  },
  tiny_town_hall: {
    catalogKey: 'cozy-building-town-hall',
    tileKey: 'tile-isometric-wall-stone',
    packPath: 'buildings/town_hall',
  },
  windmill: {
    catalogKey: 'cozy-building-windmill',
    tileKey: 'tile-isometric-pillar',
    packPath: 'buildings/windmill',
  },
  stone_well: {
    catalogKey: 'cozy-building-stone-well',
    tileKey: 'tile-isometric-stone',
    packPath: 'buildings/stone_well',
  },
  market_stall: {
    catalogKey: 'cozy-building-market-stall',
    tileKey: 'tile-isometric-crate',
    packPath: 'buildings/market_stall',
  },
  cozy_tree: {
    catalogKey: 'cozy-building-tree',
    tileKey: 'tile-isometric-grass',
    packPath: 'buildings/cozy_tree',
  },
};

const ISOMETRIC_TILE_SET = new Set<string>(ISOMETRIC_TILES);
const UI_SPRITE_SET = new Set<string>(UI_SPRITES);

let catalogHydrated = false;
let hydrationPromise: Promise<CatalogAsset[]> | null = null;

/**
 * Hydrates the shared `@digitalcanopy/assets` `assetRegistry` with Cozy Villages
 * catalog records (falling back to canonical seed assets when offline or unconfigured).
 */
export async function hydrateCozyAssetCatalog(
  supabaseClient?: SupabaseClientLike,
  force = false,
): Promise<CatalogAsset[]> {
  if (catalogHydrated && !force && !supabaseClient) {
    return loadCatalogAssets({ app_scope: COZY_APP_SCOPE, fallbackToSeed: true });
  }
  if (hydrationPromise && !force && !supabaseClient) {
    return hydrationPromise;
  }

  const run = loadCatalogAssets({
    app_scope: COZY_APP_SCOPE,
    supabaseClient,
    fallbackToSeed: true,
  }).then((assets) => {
    assetRegistry.loadCatalog(assets, COZY_APP_SCOPE);
    catalogHydrated = true;
    return assets;
  });

  if (!supabaseClient) {
    hydrationPromise = run;
  }
  return run;
}

export function resetCozyAssetHydrationForTest(): void {
  catalogHydrated = false;
  hydrationPromise = null;
}

/**
 * Resolves any Cozy asset key through `@digitalcanopy/assets` `assetRegistry`
 * (honoring pack & key hot-swap overrides), falling back to canonical Kenney CDN URLs.
 */
export function resolveCozyAssetUrl(
  assetKey: string,
  pack = 'isometric',
  fallbackUrl?: string,
): string {
  if (assetRegistry.hasOverride(assetKey)) {
    return assetRegistry.resolveUrl(assetKey, fallbackUrl ?? '');
  }
  if (ISOMETRIC_TILE_SET.has(assetKey)) {
    return assetRegistry.resolveAssetUrl('isometric-tiles', assetKey as IsometricTileKey, 'png');
  }
  if (UI_SPRITE_SET.has(assetKey)) {
    return assetRegistry.resolveAssetUrl('ui-pack', assetKey as UiSpriteKey, 'png');
  }
  return assetRegistry.resolveAssetUrl(pack, assetKey, 'png') || fallbackUrl || `${KENNEY_CDN_BASE}/${pack}/${assetKey}.png`;
}

/**
 * Resolves a habitat plot sprite URL from `@digitalcanopy/assets` CDN / hot-swap registry,
 * alongside the local `/images/habitats/*` fallback path.
 */
export function resolveHabitatSpriteSource(
  shellType: string | null | undefined,
  isFuturistic: boolean,
): { cdnUrl: string; fallbackUrl: string; assetKey: string } {
  const normalizedKey = isFuturistic
    ? 'futuristic'
    : shellType && COZY_HABITAT_FALLBACKS[shellType]
    ? shellType
    : 'default_dollhouse';

  const assetKey = COZY_HABITAT_CATALOG_KEYS[normalizedKey] ?? 'cozy-building-cottage';
  const fallbackUrl = COZY_HABITAT_FALLBACKS[normalizedKey] ?? COZY_HABITAT_FALLBACKS.default_dollhouse;

  const cdnUrl = assetRegistry.hasOverride(assetKey)
    ? assetRegistry.resolveUrl(assetKey, fallbackUrl)
    : getKenneyAssetUrl('isometric', `buildings/${normalizedKey === 'default_dollhouse' ? 'cottage' : normalizedKey}`, 'png');

  return { cdnUrl, fallbackUrl, assetKey };
}

/**
 * Resolves a dollhouse furniture prop to its canonical `@digitalcanopy/assets`
 * CDN URL and `isometricTilesAtlas` sprite frame.
 */
export function resolveDollhouseFurnitureAsset(
  spriteType: FurnitureSpriteType,
): CozyResolvedAsset {
  const tileKey = COZY_FURNITURE_TILE_KEYS[spriteType] ?? 'tile-isometric-table';
  const overrideKey = `cozy-furniture-${spriteType}`;
  const cdnUrl = assetRegistry.hasOverride(overrideKey)
    ? assetRegistry.resolveUrl(overrideKey)
    : assetRegistry.hasOverride(tileKey)
    ? assetRegistry.resolveUrl(tileKey)
    : assetRegistry.resolveAssetUrl('isometric', `furniture/${spriteType}`, 'png');

  const atlasFrame =
    assetRegistry.resolveFrame(isometricTilesAtlas, overrideKey) ??
    assetRegistry.resolveFrame(isometricTilesAtlas, tileKey) ??
    getFrameCoordinates(isometricTilesAtlas, tileKey);

  return {
    assetKey: tileKey,
    cdnUrl,
    atlasUrl: isometricTilesAtlas.meta.image,
    atlasFrame,
  };
}

/**
 * Resolves a village terrain tile to its canonical `@digitalcanopy/assets`
 * CDN URL and `isometricTilesAtlas` frame coordinates.
 */
export function resolveVillageTileAsset(tileType: VillageTileType): CozyResolvedAsset {
  const mapping = COZY_VILLAGE_TILE_KEYS[tileType] ?? COZY_VILLAGE_TILE_KEYS.grass_meadow;
  const cdnUrl = assetRegistry.hasOverride(mapping.catalogKey)
    ? assetRegistry.resolveUrl(mapping.catalogKey)
    : assetRegistry.resolveAssetUrl('isometric-tiles', mapping.tileKey, 'png');

  const atlasFrame =
    assetRegistry.resolveFrame(isometricTilesAtlas, mapping.catalogKey) ??
    assetRegistry.resolveFrame(isometricTilesAtlas, mapping.tileKey) ??
    getFrameCoordinates(isometricTilesAtlas, mapping.tileKey);

  return {
    assetKey: mapping.tileKey,
    cdnUrl,
    atlasUrl: isometricTilesAtlas.meta.image,
    atlasFrame,
  };
}

/**
 * Resolves a village building structure to its canonical `@digitalcanopy/assets`
 * CDN URL and `isometricTilesAtlas` frame coordinates.
 */
export function resolveVillageBuildingAsset(
  buildingType: VillageBuildingType,
): CozyResolvedAsset {
  const mapping =
    COZY_VILLAGE_BUILDING_KEYS[buildingType] ?? COZY_VILLAGE_BUILDING_KEYS.cottage_wood;

  const cdnUrl = assetRegistry.hasOverride(mapping.catalogKey)
    ? assetRegistry.resolveUrl(mapping.catalogKey)
    : assetRegistry.resolveAssetUrl('isometric', mapping.packPath, 'png');

  const atlasFrame =
    assetRegistry.resolveFrame(isometricTilesAtlas, mapping.catalogKey) ??
    assetRegistry.resolveFrame(isometricTilesAtlas, mapping.tileKey) ??
    getFrameCoordinates(isometricTilesAtlas, mapping.tileKey);

  return {
    assetKey: mapping.catalogKey,
    cdnUrl,
    atlasUrl: isometricTilesAtlas.meta.image,
    atlasFrame,
  };
}

/**
 * Resolves UI or chime audio URLs through `@digitalcanopy/assets` `assetRegistry`.
 */
export function resolveCozyAudioUrl(soundKey = 'audio-ui-tap'): string {
  if (assetRegistry.hasOverride(soundKey)) {
    return assetRegistry.resolveAudioUrl(soundKey, 'ogg');
  }
  return getKenneyAudioUrl(soundKey.replace(/^audio-/, ''), 'ogg');
}

export function resolveCozyUiSpriteUrl(spriteKey: UiSpriteKey): string {
  return assetRegistry.resolveAssetUrl('ui-pack', spriteKey, 'png');
}

export function getCozyAtlasSummary(): {
  isometricAtlasUrl: string;
  uiAtlasUrl: string;
  cdnBase: string;
  tileCount: number;
  uiSpriteCount: number;
} {
  return {
    isometricAtlasUrl: isometricTilesAtlas.meta.image,
    uiAtlasUrl: uiSpritesAtlas.meta.image,
    cdnBase: KENNEY_CDN_BASE,
    tileCount: Object.keys(isometricTilesAtlas.frames).length,
    uiSpriteCount: Object.keys(uiSpritesAtlas.frames).length,
  };
}

export function subscribeCozyAssetSwaps(listener: HotSwapListener): () => void {
  return assetRegistry.onSwap(listener);
}

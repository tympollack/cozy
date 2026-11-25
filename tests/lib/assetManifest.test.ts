import { describe, it, expect, beforeEach } from 'vitest';
import {
  KENNEY_CDN_BASE,
  assetRegistry,
  isometricTilesAtlas,
  getFrameCoordinates,
} from '@digitalcanopy/assets';
import {
  COZY_APP_SCOPE,
  getCozyAtlasSummary,
  hydrateCozyAssetCatalog,
  resetCozyAssetHydrationForTest,
  resolveCozyAssetUrl,
  resolveCozyAudioUrl,
  resolveDollhouseFurnitureAsset,
  resolveHabitatSpriteSource,
  resolveVillageBuildingAsset,
  resolveVillageTileAsset,
  subscribeCozyAssetSwaps,
} from '@/lib/assetManifest';

describe('TASK-PKG-APP-COZY: @digitalcanopy/assets CDN & Hot-Swap Adapter', () => {
  beforeEach(() => {
    assetRegistry.reset();
    resetCozyAssetHydrationForTest();
  });

  it('hydrates cozy and shared seed catalog records into assetRegistry', async () => {
    const assets = await hydrateCozyAssetCatalog(undefined, true);
    expect(assets.some((a) => a.asset_key === 'cozy-building-cottage')).toBe(true);
    expect(assets.some((a) => a.asset_key === 'cozy-tile-grass-meadow')).toBe(true);
    expect(assets.some((a) => a.asset_key === 'audio-ui-tap')).toBe(true);

    expect(assetRegistry.hasOverride('cozy-building-cottage')).toBe(true);
    expect(assetRegistry.hasOverride('cozy-tile-grass-meadow')).toBe(true);
    expect(assetRegistry.resolveUrl('cozy-building-cottage')).toBe(
      `${KENNEY_CDN_BASE}/isometric/buildings/cottage.png`,
    );
  });

  it('resolves dollhouse furniture props with isometricTilesAtlas frame coordinates', () => {
    const desk = resolveDollhouseFurnitureAsset('desk_wooden');
    expect(desk.assetKey).toBe('tile-isometric-table');
    expect(desk.cdnUrl).toBe(`${KENNEY_CDN_BASE}/isometric/furniture/desk_wooden.png`);
    expect(desk.atlasUrl).toBe(isometricTilesAtlas.meta.image);
    expect(desk.atlasFrame).toEqual(
      getFrameCoordinates(isometricTilesAtlas, 'tile-isometric-table'),
    );

    const bookshelf = resolveDollhouseFurnitureAsset('bookshelf_wood');
    expect(bookshelf.assetKey).toBe('tile-isometric-bookshelf');
    expect(bookshelf.atlasFrame?.anchor).toEqual({ ax: 0.5, ay: 0.75 });
  });

  it('resolves village terrain tiles, buildings, and habitat sprites with local fallback', () => {
    const grass = resolveVillageTileAsset('grass_meadow');
    expect(grass.assetKey).toBe('tile-isometric-grass');
    expect(grass.cdnUrl).toBe(`${KENNEY_CDN_BASE}/isometric-tiles/tile-isometric-grass.png`);

    const windmill = resolveVillageBuildingAsset('windmill');
    expect(windmill.assetKey).toBe('cozy-building-windmill');
    expect(windmill.cdnUrl).toBe(`${KENNEY_CDN_BASE}/isometric/buildings/windmill.png`);

    const habitat = resolveHabitatSpriteSource('stone_castle', false);
    expect(habitat.assetKey).toBe('cozy-habitat-castle');
    expect(habitat.fallbackUrl).toBe('/images/habitats/castle.jpg');
    expect(habitat.cdnUrl).toBe(`${KENNEY_CDN_BASE}/isometric/buildings/stone_castle.png`);
  });

  it('supports runtime pack and single-key hot-swapping via assetRegistry', () => {
    let swapEvents = 0;
    const unsubscribe = subscribeCozyAssetSwaps(() => {
      swapEvents += 1;
    });

    assetRegistry.registerPackOverride('isometric-tiles', 'https://custom-ip.sunshade.icu/cozy');
    expect(resolveVillageTileAsset('water_stream').cdnUrl).toBe(
      'https://custom-ip.sunshade.icu/cozy/tile-isometric-water.png',
    );

    assetRegistry.registerOverride('cozy-building-cottage', 'https://custom-ip.sunshade.icu/cottage-v2.png');
    expect(resolveHabitatSpriteSource('default_dollhouse', false).cdnUrl).toBe(
      'https://custom-ip.sunshade.icu/cottage-v2.png',
    );
    expect(resolveCozyAssetUrl('cozy-building-cottage')).toBe(
      'https://custom-ip.sunshade.icu/cottage-v2.png',
    );
    expect(resolveCozyAudioUrl('audio-ui-tap')).toContain('tap');
    expect(swapEvents).toBeGreaterThanOrEqual(2);
    expect(COZY_APP_SCOPE).toBe('cozy');
    expect(getCozyAtlasSummary().tileCount).toBe(24);

    unsubscribe();
  });
});

'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoreSticker {
  id: string;
  name: string;
  image_url: string;
  cost: number;
  decay_rate_per_day: number;
  tier: number;
  is_active: boolean;
  created_at?: string;
}

export interface PurchaseStickerResult {
  success: boolean;
  newPoints?: number;
  sticker?: StoreSticker;
  error?: string;
}

// Fallback seed catalog for offline/local development or before migration is applied
const TWEMOJI = (code: string) =>
  `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${code}.png`;

const FALLBACK_STICKER_CATALOG: StoreSticker[] = [
  // ── Tier 1: Cozy Commons (50 - 100 pts) ──────────────────────────────────
  {
    id: 'f001-warm-mug',
    name: 'Warm Mug',
    image_url: TWEMOJI('2615'),
    cost: 50,
    decay_rate_per_day: 0.03,
    tier: 1,
    is_active: true,
  },
  {
    id: 'f002-plant-buddy',
    name: 'Plant Buddy',
    image_url: TWEMOJI('1f33f'),
    cost: 60,
    decay_rate_per_day: 0.04,
    tier: 1,
    is_active: true,
  },
  {
    id: 'f003-croissant',
    name: 'Butter Croissant',
    image_url: TWEMOJI('1f950'),
    cost: 65,
    decay_rate_per_day: 0.03,
    tier: 1,
    is_active: true,
  },
  {
    id: 'f004-candle',
    name: 'Beeswax Candle',
    image_url: TWEMOJI('1f56f'),
    cost: 70,
    decay_rate_per_day: 0.04,
    tier: 1,
    is_active: true,
  },
  {
    id: 'f005-cozy-book',
    name: 'Open Book',
    image_url: TWEMOJI('1f4d6'),
    cost: 75,
    decay_rate_per_day: 0.03,
    tier: 1,
    is_active: true,
  },
  {
    id: 'f006-moon-stars',
    name: 'Moon & Stars',
    image_url: TWEMOJI('1f319'),
    cost: 80,
    decay_rate_per_day: 0.05,
    tier: 1,
    is_active: true,
  },
  {
    id: 'f007-cozy-cat',
    name: 'Cozy Cat',
    image_url: TWEMOJI('1f431'),
    cost: 85,
    decay_rate_per_day: 0.05,
    tier: 1,
    is_active: true,
  },
  {
    id: 'f008-sleepy-pup',
    name: 'Sleepy Pup',
    image_url: TWEMOJI('1f436'),
    cost: 85,
    decay_rate_per_day: 0.05,
    tier: 1,
    is_active: true,
  },
  {
    id: 'f009-mushroom',
    name: 'Forest Mushroom',
    image_url: TWEMOJI('1f344'),
    cost: 90,
    decay_rate_per_day: 0.04,
    tier: 1,
    is_active: true,
  },
  {
    id: 'f010-autumn-leaf',
    name: 'Autumn Leaf',
    image_url: TWEMOJI('1f342'),
    cost: 95,
    decay_rate_per_day: 0.04,
    tier: 1,
    is_active: true,
  },
  {
    id: 'f011-matcha-tea',
    name: 'Matcha Bowl',
    image_url: TWEMOJI('1f375'),
    cost: 100,
    decay_rate_per_day: 0.03,
    tier: 1,
    is_active: true,
  },

  // ── Tier 2: Ambient Rares (110 - 180 pts) ─────────────────────────────────
  {
    id: 'f012-fairy-lights',
    name: 'Fairy Lights',
    image_url: TWEMOJI('2728'),
    cost: 120,
    decay_rate_per_day: 0.06,
    tier: 2,
    is_active: true,
  },
  {
    id: 'f013-fireplace',
    name: 'Fireplace',
    image_url: TWEMOJI('1f525'),
    cost: 130,
    decay_rate_per_day: 0.07,
    tier: 2,
    is_active: true,
  },
  {
    id: 'f014-rainbow',
    name: 'Rainbow',
    image_url: TWEMOJI('1f308'),
    cost: 140,
    decay_rate_per_day: 0.06,
    tier: 2,
    is_active: true,
  },
  {
    id: 'f015-teapot',
    name: 'Ceramic Teapot',
    image_url: TWEMOJI('1fad6'),
    cost: 150,
    decay_rate_per_day: 0.05,
    tier: 2,
    is_active: true,
  },
  {
    id: 'f016-potted-monstera',
    name: 'Potted Monstera',
    image_url: TWEMOJI('1fab4'),
    cost: 160,
    decay_rate_per_day: 0.06,
    tier: 2,
    is_active: true,
  },
  {
    id: 'f017-golden-spark',
    name: 'Golden Heart',
    image_url: TWEMOJI('1f49b'),
    cost: 170,
    decay_rate_per_day: 0.07,
    tier: 2,
    is_active: true,
  },
  {
    id: 'f018-berry-tart',
    name: 'Berry Shortcake',
    image_url: TWEMOJI('1f370'),
    cost: 180,
    decay_rate_per_day: 0.06,
    tier: 2,
    is_active: true,
  },

  // ── Tier 3: Cozy Legendaries (200 - 300 pts) ──────────────────────────────
  {
    id: 'f019-golden-star',
    name: 'Golden Star',
    image_url: TWEMOJI('2b50'),
    cost: 200,
    decay_rate_per_day: 0.08,
    tier: 3,
    is_active: true,
  },
  {
    id: 'f020-magic-orb',
    name: 'Crystal Ball',
    image_url: TWEMOJI('1f52e'),
    cost: 225,
    decay_rate_per_day: 0.10,
    tier: 3,
    is_active: true,
  },
  {
    id: 'f021-crystal-aurora',
    name: 'Crystal Gem',
    image_url: TWEMOJI('1f48e'),
    cost: 250,
    decay_rate_per_day: 0.10,
    tier: 3,
    is_active: true,
  },
  {
    id: 'f022-royal-crown',
    name: 'Village Crown',
    image_url: TWEMOJI('1f451'),
    cost: 275,
    decay_rate_per_day: 0.12,
    tier: 3,
    is_active: true,
  },
  {
    id: 'f023-cozy-hearth',
    name: 'Cozy Hearth',
    image_url: TWEMOJI('1f3e1'),
    cost: 300,
    decay_rate_per_day: 0.08,
    tier: 3,
    is_active: true,
  },
];

// ---------------------------------------------------------------------------
// getStickerCatalog
// ---------------------------------------------------------------------------

/**
 * Fetches all active stickers in the store catalog ordered by tier and cost.
 */
export async function getStickerCatalog(): Promise<StoreSticker[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .schema('cozy')
      .from('sticker_catalog')
      .select('id, name, image_url, cost, decay_rate_per_day, tier, is_active, created_at')
      .eq('is_active', true)
      .order('tier', { ascending: true })
      .order('cost', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) {
        console.warn('[getStickerCatalog] Database query notice (using fallback):', error.message);
      }
      return FALLBACK_STICKER_CATALOG;
    }

    return data as StoreSticker[];
  } catch (err) {
    console.warn('[getStickerCatalog] Failed to query sticker catalog, using fallback:', err);
    return FALLBACK_STICKER_CATALOG;
  }
}

// ---------------------------------------------------------------------------
// purchaseSticker
// ---------------------------------------------------------------------------

/**
 * Validates point balance and executes cozy.record_transaction atomically
 * to deduct points and append a ledger entry for the sticker purchase.
 */
export async function purchaseSticker(stickerId: string): Promise<PurchaseStickerResult> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required to purchase stickers.' };
  }

  // 1. Fetch sticker details
  let sticker: StoreSticker | null = null;

  try {
    const { data, error } = await supabase
      .schema('cozy')
      .from('sticker_catalog')
      .select('id, name, image_url, cost, decay_rate_per_day, tier, is_active')
      .eq('id', stickerId)
      .maybeSingle();

    if (!error && data) {
      sticker = data as StoreSticker;
    }
  } catch {
    // If DB query fails, check fallback catalog
  }

  if (!sticker) {
    sticker = FALLBACK_STICKER_CATALOG.find((s) => s.id === stickerId) ?? null;
  }

  if (!sticker) {
    return { success: false, error: 'Sticker not found or unavailable in the catalog.' };
  }

  // 2. Fetch user's current point balance to validate client-side before RPC
  const { data: userData, error: userError } = await supabase
    .schema('cozy')
    .from('users')
    .select('points')
    .eq('id', user.id)
    .maybeSingle();

  const currentPoints = userData?.points ?? 0;
  if (!userError && currentPoints < sticker.cost) {
    return {
      success: false,
      error: `Not enough points! You need ⭐ ${sticker.cost.toLocaleString()} pts, but have ⭐ ${currentPoints.toLocaleString()} pts.`,
    };
  }

  // 3. Atomically record transaction and deduct points via RPC
  const { data: newPoints, error: rpcError } = await supabase.schema('cozy').rpc('record_transaction', {
    p_user_id: user.id,
    p_amount: -sticker.cost,
    p_type: 'sticker_purchase',
    p_description: `Purchased "${sticker.name}" sticker`,
  });

  if (rpcError) {
    if (rpcError.message.includes('Insufficient points')) {
      return {
        success: false,
        error: `Insufficient points to complete this purchase.`,
      };
    }
    console.error('[purchaseSticker] record_transaction RPC error:', rpcError.message);

    // Fallback: If RPC is not found (e.g. migration pending in local env), perform direct update via service client
    try {
      const service = createServiceClient();
      const { data: userRow } = await service
        .schema('cozy')
        .from('users')
        .select('points')
        .eq('id', user.id)
        .single();

      const userBalance = userRow?.points ?? 0;
      if (userBalance < sticker.cost) {
        return { success: false, error: 'Insufficient points to purchase this sticker.' };
      }

      const calculatedNewPoints = userBalance - sticker.cost;
      await service
        .schema('cozy')
        .from('users')
        .update({ points: calculatedNewPoints })
        .eq('id', user.id);

      // Best effort insert to point_transactions if table exists
      try {
        await service.schema('cozy').from('point_transactions').insert({
          user_id: user.id,
          amount: -sticker.cost,
          transaction_type: 'sticker_purchase',
          description: `Purchased "${sticker.name}" sticker`,
        });
      } catch {}

      revalidatePath('/profile');
      return {
        success: true,
        newPoints: calculatedNewPoints,
        sticker,
      };
    } catch (fallbackErr) {
      console.error('[purchaseSticker] Direct update fallback error:', fallbackErr);
      return { success: false, error: 'Failed to process sticker purchase. Please try again.' };
    }
  }

  const updatedBalance = typeof newPoints === 'number' ? newPoints : (currentPoints - sticker.cost);

  revalidatePath('/profile');
  return {
    success: true,
    newPoints: updatedBalance,
    sticker,
  };
}

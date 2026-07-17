'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StickerActionResult {
  success: boolean;
  error?: string;
  stickerId?: string;
  newPoints?: number;
}

// ---------------------------------------------------------------------------
// placeSticker
// ---------------------------------------------------------------------------

/**
 * Deducts points from the authenticated user and places a sticker on a post.
 * All economic logic (point check + deduct + insert) is atomic in the RPC.
 */
export async function placeSticker(
  postId: string,
  stickerUrl: string,
  cost: number,
  decayRate: number,
  xPercent: number = 50,
  yPercent: number = 50,
  rotationDegrees: number = 0
): Promise<StickerActionResult> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  if (cost <= 0 || decayRate <= 0 || decayRate > 1) {
    return { success: false, error: 'Invalid sticker parameters.' };
  }

  const { data: stickerId, error } = await supabase.schema('cozy').rpc('place_sticker', {
    p_user_id:          user.id,
    p_post_id:          postId,
    p_sticker_url:      stickerUrl,
    p_cost:             cost,
    p_decay_rate:       decayRate,
    p_x_percent:        xPercent,
    p_y_percent:        yPercent,
    p_rotation_degrees: rotationDegrees,
  });

  if (error) {
    if (error.message.includes('Insufficient points')) {
      return { success: false, error: "Not enough points to place this sticker." };
    }
    console.error('[placeSticker] RPC error:', error.message);
    return { success: false, error: 'Failed to place sticker. Try again.' };
  }

  return { success: true, stickerId: stickerId as string };
}

// ---------------------------------------------------------------------------
// reupSticker
// ---------------------------------------------------------------------------

/**
 * Resets a sticker's decay clock (last_reup_at → NOW()) at a discounted
 * point cost proportional to how much opacity remains.
 * Returns the caller's new point total for Zustand sync.
 */
export async function reupSticker(
  stickerId: string,
  discountedCost: number
): Promise<StickerActionResult> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  if (discountedCost < 1) {
    return { success: false, error: 'Invalid Re-Up cost.' };
  }

  const { data: newPoints, error } = await supabase.schema('cozy').rpc('reup_sticker', {
    p_user_id:         user.id,
    p_sticker_id:      stickerId,
    p_discounted_cost: discountedCost,
  });

  if (error) {
    if (error.message.includes('Insufficient points')) {
      return { success: false, error: "Not enough points to Re-Up this sticker." };
    }
    if (error.message.includes('not owned')) {
      return { success: false, error: "You can only Re-Up your own stickers." };
    }
    console.error('[reupSticker] RPC error:', error.message);
    return { success: false, error: 'Re-Up failed. Try again.' };
  }

  return { success: true, newPoints: newPoints as number };
}

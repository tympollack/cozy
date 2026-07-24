'use server';

import { createServerClient } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Shape returned by the updated cozy.cheer_post RPC.
 * The RPC now returns a composite cozy.cheer_result record so both the
 * personal and group balances can be synced in a single round-trip.
 */
interface CheerRpcResult {
  /** The cheering user's new cozy.users.points balance. */
  personal_points: number;
  /**
   * The group's new cozy.groups.pooled_points balance.
   * NULL when the cheering user has no group_id (solo user).
   */
  group_points: number | null;
}

export interface CheerResult {
  success: boolean;
  /** New personal point balance for the cheering user. */
  newPoints?: number;
  /**
   * New pooled_points balance for the user's group.
   * Null when the user is not in a group.
   */
  groupPoints?: number | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Awards a "Cheer" to a post.
 *
 * Atomically (via cozy.cheer_post RPC):
 *  - Inserts a record into cozy.cheers (UNIQUE constraint prevents double-cheers).
 *  - Increments cozy.posts.cheer_count.
 *  - Awards +1 point to the post owner.
 *  - Awards +1 personal point to the cheering user.
 *  - Co-op Bonus: if the cheering user belongs to a household, additionally
 *    credits +1 point to cozy.households.pooled_points (no personal points
 *    are deducted — this is a net bonus that incentivises household membership).
 *
 * Returns both the new personal balance and the new household pool balance
 * so Zustand can update both slices in one action dispatch.
 *
 * Self-cheering is rejected by the RPC.
 */
export async function cheerPost(postId: string): Promise<CheerResult> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // The RPC returns a cozy.cheer_result composite, which Supabase surfaces
  // as a single plain object (not an array) when called via .rpc().
  const { data, error } = await supabase.schema('cozy').rpc('cheer_post', {
    p_post_id: postId,
    p_user_id: user.id,
  });

  if (error) {
    // Surface friendly messages for known constraint errors.
    if (error.message.includes('unique') || error.message.includes('uq_cozy_cheer')) {
      return { success: false, error: 'Already cheered!' };
    }
    if (error.message.includes('own post')) {
      return { success: false, error: 'You cannot cheer your own post.' };
    }
    console.error('[cheerPost] RPC error:', error.message);
    return { success: false, error: 'Something went wrong. Try again.' };
  }

  // Supabase returns the composite record as a plain object or array.
  const result = (Array.isArray(data) ? data[0] : data) as CheerRpcResult;
  
  if (!result) {
    return { success: false, error: 'Unexpected empty response from server.' };
  }

  return {
    success: true,
    newPoints: result.personal_points,
    groupPoints: result.group_points ?? null,
  };
}

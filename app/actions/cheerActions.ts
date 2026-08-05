'use server';

import { createServerClient } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Shape returned by the updated cozy.cheer_post RPC.
 *
 * Migration 20260724000004_polymorphic_peer_groups.sql changed the v1
 * composite type cozy.cheer_result from:
 *   (personal_points INT, group_points INT)
 * to:
 *   (personal_points INT, groups_updated INT)
 *
 * groups_updated is now an INTEGER COUNT of how many of the post author's
 * active groups received a pooled_points cascade — NOT a balance.
 */
interface CheerRpcResult {
  /** The cheering user's new cozy.users.points balance. */
  personal_points: number;
  /**
   * Number of groups that received a cascading +1 to pooled_points.
   * 0 when the post author belongs to no groups.
   */
  groups_updated: number;
}

export interface CheerResult {
  success: boolean;
  /** New personal point balance for the cheering user. */
  newPoints?: number;
  /**
   * Number of groups that received a cascading point bonus.
   * 0 when the post author is not in any group.
   */
  groupsUpdated?: number;
  /**
   * @deprecated Use `groupsUpdated` instead.
   * Backward-compat alias kept so existing client code doesn't break.
   * Will be removed in a future cleanup pass.
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

  const groupsUpdated = result.groups_updated ?? 0;

  return {
    success: true,
    newPoints: result.personal_points,
    groupsUpdated,
    // Backward-compat alias (deprecated — remove when all callers migrate)
    groupPoints: groupsUpdated > 0 ? groupsUpdated : null,
  };
}

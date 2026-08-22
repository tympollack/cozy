'use server';

import { createServerClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { SHELL_DEFINITIONS, getActiveSlots } from '@/config/shellDefinitions';

export interface ShellActionResult {
  success: boolean;
  error?: string;
}

export interface RedeemTokenResult {
  success: boolean;
  newTier?: number;
  tokensRemaining?: number;
  error?: string;
}

/**
 * Helper to revalidate both default profile path and custom view path (e.g. /[username]).
 */
function revalidateShellPaths(path?: string) {
  revalidatePath('/profile');
  if (path && path !== '/profile') {
    revalidatePath(path);
  }
}

/**
 * Updates the authenticated user's active 2.5D shell theme.
 * Also clears any previous shell_slot values that are invalid for the new theme
 * so posts are never orphaned when switching room architectures.
 */
export async function updateUserShell(shellType: string, path?: string): Promise<ShellActionResult> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // 1. Update shell_type in cozy.users
  const { error } = await supabase
    .schema('cozy')
    .from('users')
    .update({ shell_type: shellType, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) {
    console.error('[updateUserShell] Error:', error.message);
    return { success: false, error: 'Failed to update shell choice.' };
  }

  // 2. Clear orphaned slot IDs not present in the new shell theme
  const targetShellDef = SHELL_DEFINITIONS[shellType] || SHELL_DEFINITIONS.default_dollhouse;
  const validSlotIds = targetShellDef.slots.map((s) => s.id);

  const { data: userPosts } = await supabase
    .schema('cozy')
    .from('posts')
    .select('id, shell_slot')
    .eq('user_id', user.id)
    .not('shell_slot', 'is', null);

  if (userPosts && userPosts.length > 0) {
    const invalidPostIds = userPosts
      .filter((p) => p.shell_slot && !validSlotIds.includes(p.shell_slot))
      .map((p) => p.id);

    if (invalidPostIds.length > 0) {
      await supabase
        .schema('cozy')
        .from('posts')
        .update({ shell_slot: null })
        .in('id', invalidPostIds);
    }
  }

  revalidateShellPaths(path);
  return { success: true };
}

/**
 * Assigns a post owned by the caller to a specific nook (slotId) in their shell.
 * Clears any post previously occupying that slot to maintain a 1:1 slot mapping.
 */
export async function assignPostToSlot(
  postId: string,
  slotId: string,
  path?: string
): Promise<ShellActionResult> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // 1. Try atomic RPC first (SECURITY DEFINER / bypasses client RLS constraints)
  const { error: rpcErr } = await supabase.schema('cozy').rpc('assign_post_slot', {
    p_post_id: postId,
    p_slot_id: slotId,
  });

  if (!rpcErr) {
    revalidateShellPaths(path);
    return { success: true };
  }

  console.warn('[assignPostToSlot] RPC assign_post_slot failed/fallback:', rpcErr.message);

  // 2. Fallback: Direct table updates
  // Clear existing occupant of slotId
  await supabase
    .schema('cozy')
    .from('posts')
    .update({ shell_slot: null })
    .eq('user_id', user.id)
    .eq('shell_slot', slotId);

  // Assign slot to target post
  const { error: updateErr } = await supabase
    .schema('cozy')
    .from('posts')
    .update({ shell_slot: slotId })
    .eq('id', postId)
    .eq('user_id', user.id);

  if (updateErr) {
    console.error('[assignPostToSlot] Table update Error:', updateErr.message);
    return { success: false, error: 'Failed to assign post to nook.' };
  }

  revalidateShellPaths(path);
  return { success: true };
}

/**
 * Removes a post from its shell nook (resets shell_slot to NULL).
 */
export async function removePostFromSlot(
  postId: string,
  path?: string
): Promise<ShellActionResult> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // Try RPC first
  const { error: rpcErr } = await supabase.schema('cozy').rpc('assign_post_slot', {
    p_post_id: postId,
    p_slot_id: null,
  });

  if (!rpcErr) {
    revalidateShellPaths(path);
    return { success: true };
  }

  // Fallback
  const { error } = await supabase
    .schema('cozy')
    .from('posts')
    .update({ shell_slot: null })
    .eq('id', postId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[removePostFromSlot] Error:', error.message);
    return { success: false, error: 'Failed to unassign nook.' };
  }

  revalidateShellPaths(path);
  return { success: true };
}

/**
 * Retrieves the active shell type for the specified user or current user.
 */
export async function getUserShell(userId?: string): Promise<string> {
  const supabase = await createServerClient();

  let targetId = userId;
  if (!targetId) {
    const { data: { user } } = await supabase.auth.getUser();
    targetId = user?.id;
  }

  if (!targetId) return 'default_dollhouse';

  const { data, error } = await supabase
    .schema('cozy')
    .from('users')
    .select('shell_type')
    .eq('id', targetId)
    .maybeSingle();

  if (error || !data) return 'default_dollhouse';
  return data.shell_type || 'default_dollhouse';
}

/**
 * Redeems milestone tokens to unlock the next expansion tier.
 * Calls the cozy.redeem_expansion_token RPC for atomic validation + deduction.
 */
export async function redeemExpansionToken(
  targetTier: number,
  path?: string
): Promise<RedeemTokenResult> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const { data, error } = await supabase.schema('cozy').rpc('redeem_expansion_token', {
    p_user_id: user.id,
    p_target_tier: targetTier,
  });

  if (error) {
    console.error('[redeemExpansionToken] RPC error:', error.message);
    return { success: false, error: 'Failed to redeem expansion token.' };
  }

  // RPC returns a single-row TABLE; Supabase JS returns it as an array
  const row = Array.isArray(data) ? data[0] : data;

  if (!row?.success) {
    return { success: false, error: row?.error_message || 'Redemption failed.' };
  }

  revalidateShellPaths(path);
  return {
    success: true,
    newTier: row.new_tier,
    tokensRemaining: row.tokens_remaining,
  };
}

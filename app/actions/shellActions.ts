'use server';

import { createServerClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export interface ShellActionResult {
  success: boolean;
  error?: string;
}

/**
 * Updates the authenticated user's active 2.5D shell theme.
 */
export async function updateUserShell(shellType: string): Promise<ShellActionResult> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const { error } = await supabase
    .schema('cozy')
    .from('users')
    .update({ shell_type: shellType, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) {
    console.error('[updateUserShell] Error:', error.message);
    return { success: false, error: 'Failed to update shell choice.' };
  }

  revalidatePath('/profile');
  return { success: true };
}

/**
 * Assigns a post owned by the caller to a specific nook (slotId) in their shell.
 * Clears any post previously occupying that slot to maintain a 1:1 slot mapping.
 */
export async function assignPostToSlot(postId: string, slotId: string): Promise<ShellActionResult> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // 1. Verify post ownership
  const { data: post, error: fetchErr } = await supabase
    .schema('cozy')
    .from('posts')
    .select('id')
    .eq('id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchErr || !post) {
    return { success: false, error: 'Post not found or not owned by you.' };
  }

  // 2. Clear any existing post in this slot for this user
  await supabase
    .schema('cozy')
    .from('posts')
    .update({ shell_slot: null })
    .eq('user_id', user.id)
    .eq('shell_slot', slotId);

  // 3. Assign target post to the slot
  const { error: updateErr } = await supabase
    .schema('cozy')
    .from('posts')
    .update({ shell_slot: slotId })
    .eq('id', postId)
    .eq('user_id', user.id);

  if (updateErr) {
    console.error('[assignPostToSlot] Error:', updateErr.message);
    return { success: false, error: 'Failed to assign post to nook.' };
  }

  revalidatePath('/profile');
  return { success: true };
}

/**
 * Removes a post from its shell nook (resets shell_slot to NULL).
 */
export async function removePostFromSlot(postId: string): Promise<ShellActionResult> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

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

  revalidatePath('/profile');
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

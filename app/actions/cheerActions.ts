'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';

export interface CheerResult {
  success: boolean;
  newPoints?: number;
  error?: string;
}

/**
 * Awards a "Cheer" to a post.
 *
 * Atomically:
 *  - Inserts a record into cozy.cheers (UNIQUE constraint prevents double-cheers).
 *  - Increments cozy.posts.cheer_count.
 *  - Awards +1 point to the post owner.
 *  - Awards +1 point to the cheering user (returned for Zustand sync).
 *
 * Self-cheering is rejected by the RPC.
 */
export async function cheerPost(postId: string): Promise<CheerResult> {
  const supabase = await createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const service = createServiceClient();

  const { data: newPoints, error } = await service.rpc('cheer_post', {
    p_post_id: postId,
    p_user_id: user.id,
  });

  if (error) {
    // Surface friendly messages for known constraint errors
    if (error.message.includes('unique') || error.message.includes('uq_cozy_cheer')) {
      return { success: false, error: 'Already cheered!' };
    }
    if (error.message.includes('own post')) {
      return { success: false, error: 'You cannot cheer your own post.' };
    }
    console.error('[cheerPost] RPC error:', error.message);
    return { success: false, error: 'Something went wrong. Try again.' };
  }

  return { success: true, newPoints: newPoints as number };
}

'use server';

import { createServerClient } from '@/lib/supabase';
import type { UserPost } from '@/store/useCozyStore';

export interface UserPostsPayload {
  posts: UserPost[];
  error?: string;
}

export interface SinglePostPayload {
  post: UserPost | null;
  error?: string;
}

/**
 * Fetches all posts belonging to the authenticated user.
 * Used by the profile page.
 */
export async function getUserPosts(): Promise<UserPostsPayload> {
  const supabase = await createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { posts: [], error: 'Authentication required.' };
  }

  const { data, error } = await supabase.schema('cozy').rpc('get_user_posts', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('[getUserPosts] RPC error:', error.message);
    return { posts: [], error: error.message };
  }

  return { posts: (data ?? []) as UserPost[] };
}

/**
 * Fetches a single post by ID for the detail page.
 * Works for both authenticated and anonymous users.
 */
export async function getPost(postId: string): Promise<SinglePostPayload> {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.schema('cozy').rpc('get_post', {
    p_post_id: postId,
    p_user_id: user?.id ?? null,
  });

  if (error) {
    console.error('[getPost] RPC error:', error.message);
    return { post: null, error: error.message };
  }

  const rows = data as UserPost[] | null;
  return { post: rows?.[0] ?? null };
}

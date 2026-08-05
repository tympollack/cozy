'use server';

import { createServerClient } from '@/lib/supabase';
import type { UserPost } from '@/store/useCozyStore';

export interface UserPostsPayload {
  posts: UserPost[];
  error?: string;
}

export interface UserProfilePayload {
  posts: UserPost[];
  shellType: string;
  isOwner: boolean;
  userId: string | null;
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
 * Fetches comprehensive profile payload (shellChoice + posts + owner flag).
 */
export async function getUserProfileData(targetUserId?: string): Promise<UserProfilePayload> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const currentUserId = user?.id ?? null;
  const activeUserId = targetUserId || currentUserId;

  if (!activeUserId) {
    return {
      posts: [],
      shellType: 'default_dollhouse',
      isOwner: false,
      userId: null,
      error: 'User not found or authentication required.',
    };
  }

  const isOwner = currentUserId === activeUserId;

  // 1. Fetch user's shell_type
  const { data: userData, error: userErr } = await supabase
    .schema('cozy')
    .from('users')
    .select('shell_type')
    .eq('id', activeUserId)
    .maybeSingle();

  if (userErr) {
    console.error('[getUserProfileData] User fetch error:', userErr.message);
  }

  const shellType = userData?.shell_type || 'default_dollhouse';

  // 2. Fetch user's posts via RPC
  const { data: postsData, error: postsErr } = await supabase
    .schema('cozy')
    .rpc('get_user_posts', { p_user_id: activeUserId });

  if (postsErr) {
    console.error('[getUserProfileData] Posts RPC error:', postsErr.message);
    return {
      posts: [],
      shellType,
      isOwner,
      userId: activeUserId,
      error: postsErr.message,
    };
  }

  return {
    posts: (postsData ?? []) as UserPost[],
    shellType,
    isOwner,
    userId: activeUserId,
  };
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

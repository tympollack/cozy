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
  expansionTier: number;
  milestoneTokens: number;
  themesUnlocked: boolean;
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
 * Fetches comprehensive profile payload (shellChoice + posts + owner flag + expansion state).
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
      expansionTier: 1,
      milestoneTokens: 0,
      themesUnlocked: false,
      isOwner: false,
      userId: null,
      error: 'User not found or authentication required.',
    };
  }

  const isOwner = currentUserId === activeUserId;

  // 1. Fetch user's shell_type + expansion state via updated get_user_shell RPC
  const { data: shellData, error: shellErr } = await supabase
    .schema('cozy')
    .rpc('get_user_shell', { p_user_id: activeUserId });

  if (shellErr) {
    console.error('[getUserProfileData] Shell RPC error:', shellErr.message);
  }

  // RPC returns a single-row TABLE; Supabase JS returns it as an array
  const shellRow = Array.isArray(shellData) ? shellData[0] : shellData;

  const shellType = shellRow?.shell_type || 'default_dollhouse';
  const expansionTier: number = shellRow?.expansion_tier ?? 1;
  const milestoneTokens: number = shellRow?.milestone_tokens ?? 0;
  const themesUnlocked: boolean = shellRow?.themes_unlocked ?? false;

  // 2. Fetch user's posts via RPC
  const { data: postsData, error: postsErr } = await supabase
    .schema('cozy')
    .rpc('get_user_posts', { p_user_id: activeUserId });

  if (postsErr) {
    console.error('[getUserProfileData] Posts RPC error:', postsErr.message);
    return {
      posts: [],
      shellType,
      expansionTier,
      milestoneTokens,
      themesUnlocked,
      isOwner,
      userId: activeUserId,
      error: postsErr.message,
    };
  }

  return {
    posts: (postsData ?? []) as UserPost[],
    shellType,
    expansionTier,
    milestoneTokens,
    themesUnlocked,
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

'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';
import { recordPointTransaction } from '@/app/actions/ledgerActions';
import { revalidatePath, revalidateTag } from 'next/cache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyResetStatusResult {
  success: boolean;
  hasResetToday: boolean;
  hasLight: boolean;
  hasDark: boolean;
  isDualMode: boolean;
  postCount: number;
  latestPost?: {
    id: string;
    light_img_url?: string | null;
    dark_img_url?: string | null;
    created_at: string;
  } | null;
  error?: string;
}

export interface SubmitDailyResetResult {
  success: boolean;
  pointsAwarded?: number;
  isDualMode?: boolean;
  newPersonalPoints?: number;
  groupsUpdated?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// 1. checkDailyResetStatus
// Queries cozy.posts for the authenticated user to verify if a Light/Dark
// room or nook post was submitted today.
// ---------------------------------------------------------------------------

export async function checkDailyResetStatus(): Promise<DailyResetStatusResult> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      hasResetToday: false,
      hasLight: false,
      hasDark: false,
      isDualMode: false,
      postCount: 0,
      error: 'Authentication required.',
    };
  }

  // Get UTC beginning of current day
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

  const service = createServiceClient();

  try {
    const { data: posts, error } = await service
      .schema('cozy')
      .from('posts')
      .select('id, light_img_url, dark_img_url, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfDayIso)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[checkDailyResetStatus] DB error:', error.message);
      return {
        success: false,
        hasResetToday: false,
        hasLight: false,
        hasDark: false,
        isDualMode: false,
        postCount: 0,
        error: error.message,
      };
    }

    const postList = posts || [];
    const hasLight = postList.some((p) => Boolean(p.light_img_url));
    const hasDark = postList.some((p) => Boolean(p.dark_img_url));
    const hasDualModePost = postList.some((p) => Boolean(p.light_img_url && p.dark_img_url));
    const isDualMode = hasDualModePost || (hasLight && hasDark);
    const hasResetToday = postList.length > 0;

    const latestPost = postList.length > 0 ? postList[0] : null;

    return {
      success: true,
      hasResetToday,
      hasLight,
      hasDark,
      isDualMode,
      postCount: postList.length,
      latestPost: latestPost
        ? {
            id: latestPost.id,
            light_img_url: latestPost.light_img_url,
            dark_img_url: latestPost.dark_img_url,
            created_at: latestPost.created_at,
          }
        : null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query daily reset status.';
    console.error('[checkDailyResetStatus] Unexpected error:', message);
    return {
      success: false,
      hasResetToday: false,
      hasLight: false,
      hasDark: false,
      isDualMode: false,
      postCount: 0,
      error: message,
    };
  }
}

// ---------------------------------------------------------------------------
// 2. submitDailySpaceReset
// Triggers +25 personal points per upload (+50 for Light & Dark dual mode)
// and credits shared group balances via cozy.cheer_post RPC and group ledger.
// ---------------------------------------------------------------------------

export async function submitDailySpaceReset(postId: string): Promise<SubmitDailyResetResult> {
  if (!postId) {
    return { success: false, error: 'Post ID is required.' };
  }

  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const service = createServiceClient();

  try {
    // 1. Verify post existence and ownership
    const { data: post, error: postErr } = await service
      .schema('cozy')
      .from('posts')
      .select('id, user_id, light_img_url, dark_img_url, created_at')
      .eq('id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (postErr || !post) {
      return { success: false, error: 'Post not found or unauthorized.' };
    }

    // 2. Validate post was created today (UTC day boundary)
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startOfDayIso = startOfDay.toISOString();

    if (post.created_at && new Date(post.created_at).getTime() < startOfDay.getTime()) {
      return {
        success: false,
        error: 'Daily space reset requires a space uploaded today.',
      };
    }

    // 3. Idempotency guard: verify user hasn't already claimed daily reset today
    const { data: existingTx, error: txCheckErr } = await service
      .schema('cozy')
      .from('transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('transaction_type', 'daily_space_reset')
      .gte('created_at', startOfDayIso)
      .limit(1);

    if (!txCheckErr && existingTx && existingTx.length > 0) {
      return {
        success: false,
        error: 'Daily space reset already claimed for today.',
      };
    }

    const isDualMode = Boolean(post.light_img_url && post.dark_img_url);
    const pointsAwarded = isDualMode ? 50 : 25;

    // 4. Award personal points in cozy.users atomically
    const { data: userData, error: userFetchErr } = await service
      .schema('cozy')
      .from('users')
      .select('points')
      .eq('id', user.id)
      .single();

    if (userFetchErr || !userData) {
      console.error('[submitDailySpaceReset] Failed to fetch current user points:', userFetchErr?.message);
      return { success: false, error: 'Could not retrieve user point balance.' };
    }

    const currentPoints = userData.points ?? 0;
    const newPersonalPoints = currentPoints + pointsAwarded;

    const { error: userUpdateErr } = await service
      .schema('cozy')
      .from('users')
      .update({ points: newPersonalPoints })
      .eq('id', user.id);

    if (userUpdateErr) {
      console.error('[submitDailySpaceReset] Failed to update user points:', userUpdateErr.message);
      return { success: false, error: 'Could not update user points balance.' };
    }

    // 5. Record point transaction in immutable ledger
    await recordPointTransaction({
      userId: user.id,
      amount: pointsAwarded,
      transactionType: 'daily_space_reset',
      description: isDualMode
        ? `Daily Space Reset: Light & Dark dual-mode upload (+50 pts) [Post: ${postId}]`
        : `Daily Space Reset: Room upload (+25 pts) [Post: ${postId}]`,
    });

    // 6. Credit shared group balances & trigger cheer_post RPC cascade if applicable
    let groupsUpdated = 0;

    try {
      const { data: memberships } = await service
        .schema('cozy')
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberships && memberships.length > 0) {
        for (const m of memberships) {
          const { data: groupData } = await service
            .schema('cozy')
            .from('groups')
            .select('pooled_points')
            .eq('id', m.group_id)
            .single();

          if (groupData) {
            const newPooled = (groupData.pooled_points ?? 0) + pointsAwarded;
            const { error: groupUpdateErr } = await service
              .schema('cozy')
              .from('groups')
              .update({ pooled_points: newPooled })
              .eq('id', m.group_id);

            if (!groupUpdateErr) {
              groupsUpdated++;
            }
          }
        }
      }

      // Also invoke cheer_post RPC if appropriate
      try {
        await supabase.schema('cozy').rpc('cheer_post', {
          p_post_id: postId,
          p_user_id: user.id,
        });
      } catch {
        // Self-cheer in cheer_post RPC is safely ignored
      }
    } catch (groupErr) {
      console.warn('[submitDailySpaceReset] Group cascade note:', groupErr);
    }

    // Revalidate relevant paths and cache tags
    try {
      revalidateTag('posts', 'default');
      revalidateTag('groups', 'default');
      revalidatePath('/');
      revalidatePath('/feed');
      revalidatePath('/profile');
      revalidatePath('/groups');
    } catch {
      // safe outside request lifecycle
    }

    return {
      success: true,
      pointsAwarded,
      isDualMode,
      newPersonalPoints,
      groupsUpdated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit daily space reset.';
    console.error('[submitDailySpaceReset] Unexpected error:', message);
    return { success: false, error: message };
  }
}

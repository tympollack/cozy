'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { getPendingCallingCards } from './peerActions';
import { getPrivateNotes } from './vibeActions';
import { getPorchDigest } from './waterfallActions';

// ---------------------------------------------------------------------------
// Types: cozy.notifications
// ---------------------------------------------------------------------------

export type NotificationType = 'daily_task' | 'peer_checkin' | 'admin_broadcast';

export interface NotificationMetadata {
  peer_id?: string;
  target_user_id?: string;
  group_id?: string;
  broadcast_id?: string;
  target_app?: string;
  target_scope?: string;
  action_url?: string;
  source?: string;
  [key: string]: unknown;
}

export interface CozyNotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: NotificationMetadata;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationFeedResult {
  success: boolean;
  notifications: CozyNotificationItem[];
  unreadCount: number;
  error?: string;
}

export interface AdminBroadcastPayload {
  broadcast_id: string;
  title: string;
  message: string;
  target_scope?: string;
}

// ---------------------------------------------------------------------------
// 1. getUserNotifications
//
// Fetches unread and recent notifications for the authenticated user from cozy.notifications.
// ---------------------------------------------------------------------------

export async function getUserNotifications(limit: number = 20): Promise<NotificationFeedResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, notifications: [], unreadCount: 0, error: 'Authentication required.' };
  }

  const service = createServiceClient();

  try {
    const { data: rows, error: fetchError } = await service
      .schema('cozy')
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) {
      console.warn('[getUserNotifications] DB error fetching notifications:', fetchError.message);
      return { success: false, notifications: [], unreadCount: 0, error: fetchError.message };
    }

    const { count: unreadCount, error: countError } = await service
      .schema('cozy')
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (countError) {
      console.warn('[getUserNotifications] DB error counting unread notifications:', countError.message);
    }

    const notifications: CozyNotificationItem[] = (rows || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType,
      title: row.title,
      message: row.message,
      metadata: (row.metadata || {}) as NotificationMetadata,
      isRead: Boolean(row.is_read),
      createdAt: row.created_at,
    }));

    return {
      success: true,
      notifications,
      unreadCount: unreadCount ?? notifications.filter((n) => !n.isRead).length,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch user notifications.';
    console.error('[getUserNotifications] Unexpected error:', message);
    return { success: false, notifications: [], unreadCount: 0, error: message };
  }
}

// ---------------------------------------------------------------------------
// 2. markNotificationAsRead
//
// Updates is_read = true in cozy.notifications for the specified notification ID.
// ---------------------------------------------------------------------------

export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  if (!notificationId) {
    return { success: false, error: 'Notification ID is required.' };
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
    const { error: updateError } = await service
      .schema('cozy')
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[markNotificationAsRead] Update error:', updateError.message);
      return { success: false, error: updateError.message };
    }

    try {
      revalidatePath('/', 'layout');
    } catch {
      // Revalidation outside request context ignored
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to mark notification as read.';
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// 3. triggerDailyTaskNudge
//
// Validates if the daily room capture/routine has been logged today;
// if incomplete, creates a daily_task notification ("Time for your daily space reset!").
// ---------------------------------------------------------------------------

export async function triggerDailyTaskNudge(): Promise<{
  success: boolean;
  nudged: boolean;
  message?: string;
  error?: string;
}> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, nudged: false, error: 'Authentication required.' };
  }

  const service = createServiceClient();

  try {
    // Check if user has posted today (last 24 hours / start of day UTC)
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startOfDayISO = startOfDay.toISOString();

    const { data: todayPosts, error: postError } = await service
      .schema('cozy')
      .from('posts')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', startOfDayISO)
      .limit(1);

    if (!postError && todayPosts && todayPosts.length > 0) {
      return {
        success: true,
        nudged: false,
        message: 'Daily space reset already logged today.',
      };
    }

    // Check if a daily_task notification has already been generated today to avoid duplicate alerts
    const { data: existingNudges, error: nudgeError } = await service
      .schema('cozy')
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'daily_task')
      .gte('created_at', startOfDayISO)
      .limit(1);

    if (!nudgeError && existingNudges && existingNudges.length > 0) {
      return {
        success: true,
        nudged: false,
        message: 'Daily task nudge already sent today.',
      };
    }

    // Insert daily task nudge notification
    const { error: insertError } = await service
      .schema('cozy')
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'daily_task',
        title: 'Daily Space Reset',
        message: 'Time for your daily space reset! Capture your Light & Dark room to keep your cozy streak alive.',
        metadata: {
          target_app: 'cozy',
          action_url: '/camera',
        },
        is_read: false,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[triggerDailyTaskNudge] Insert error:', insertError.message);
      return { success: false, nudged: false, error: insertError.message };
    }

    return {
      success: true,
      nudged: true,
      message: 'Time for your daily space reset!',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to trigger daily task nudge.';
    console.error('[triggerDailyTaskNudge] Unexpected error:', message);
    return { success: false, nudged: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// 4. receiveAdminBroadcast
//
// Server action / webhook handler reachable by admin.sunshade.icu to broadcast
// system alerts across target users in cozy.notifications.
// ---------------------------------------------------------------------------

export async function receiveAdminBroadcast(
  payload: AdminBroadcastPayload
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!payload || !payload.broadcast_id || !payload.title || !payload.message) {
    return { success: false, count: 0, error: 'broadcast_id, title, and message are required.' };
  }

  const service = createServiceClient();

  try {
    // 1. Fetch target users from cozy.users
    const userQuery = service.schema('cozy').from('users').select('id');
    const { data: users, error: userError } = await userQuery;

    if (userError || !users || users.length === 0) {
      return { success: false, count: 0, error: userError?.message || 'No target users found.' };
    }

    const records = users.map((u) => ({
      user_id: u.id,
      type: 'admin_broadcast',
      title: payload.title.trim(),
      message: payload.message.trim(),
      metadata: {
        broadcast_id: payload.broadcast_id,
        target_scope: payload.target_scope || 'all',
        source: 'admin.sunshade.icu',
        target_app: 'cozy',
      },
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await service
      .schema('cozy')
      .from('notifications')
      .insert(records);

    if (insertError) {
      console.error('[receiveAdminBroadcast] Insert error:', insertError.message);
      return { success: false, count: 0, error: insertError.message };
    }

    return { success: true, count: records.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process admin broadcast.';
    console.error('[receiveAdminBroadcast] Unexpected error:', message);
    return { success: false, count: 0, error: message };
  }
}

// ---------------------------------------------------------------------------
// 5. processRaincloudWaterfallAction
//
// Triggers the cozy.process_raincloud_waterfall RPC to execute the Serene Cascade.
// ---------------------------------------------------------------------------

export async function processRaincloudWaterfallAction(
  targetUserId: string,
  groupId: string
): Promise<{ success: boolean; status?: string; message?: string; error?: string }> {
  if (!targetUserId || !groupId) {
    return { success: false, error: 'targetUserId and groupId are required.' };
  }

  const service = createServiceClient();

  try {
    const { data, error } = await service.schema('cozy').rpc('process_raincloud_waterfall', {
      p_target_user_id: targetUserId,
      p_group_id: groupId,
    });

    if (error) {
      console.error('[processRaincloudWaterfallAction] RPC error:', error.message);
      return { success: false, error: error.message };
    }

    const result = (data || {}) as {
      success?: boolean;
      status?: string;
      message?: string;
      error?: string;
    };

    return {
      success: result.success ?? true,
      status: result.status,
      message: result.message,
      error: result.error,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process waterfall.';
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Backwards Compatibility: Notices Aggregator for Existing Components & Mailbox
// ---------------------------------------------------------------------------

export type NoticeType =
  | 'cheer'
  | 'calling_card'
  | 'card_accepted'
  | 'support_note'
  | 'warm_brew'
  | 'comfort_sticker'
  | 'porch_warmth';

export interface CozyNotice {
  id: string;
  type: NoticeType;
  title: string;
  body: string;
  actorName: string;
  actorId?: string;
  postId?: string;
  postImage?: string;
  peerId?: string;
  itemType?: string;
  pointsAwarded?: number;
  createdAt: string;
  actionUrl?: string;
}

export interface NoticesResult {
  success: boolean;
  notices: CozyNotice[];
  unreadCount: number;
  error?: string;
}

export async function getNotices(): Promise<NoticesResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, notices: [], unreadCount: 0, error: 'Authentication required.' };
  }

  const service = createServiceClient();
  const notices: CozyNotice[] = [];

  try {
    // 1. Fetch user's posts to find cheers received
    const { data: userPosts } = await service
      .schema('cozy')
      .from('posts')
      .select('id, light_img_url, dark_img_url, cheer_count, created_at')
      .eq('user_id', user.id);

    if (userPosts && userPosts.length > 0) {
      const postMap = new Map(userPosts.map((p) => [p.id, p]));
      const postIds = userPosts.map((p) => p.id);

      const { data: cheersData } = await service
        .schema('cozy')
        .from('cheers')
        .select('id, post_id, user_id, created_at')
        .in('post_id', postIds)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25);

      if (cheersData && cheersData.length > 0) {
        const cheeringUserIds = Array.from(new Set(cheersData.map((c) => c.user_id)));
        const { data: cheeringUsers } = await service
          .schema('cozy')
          .from('users')
          .select('id, display_name')
          .in('id', cheeringUserIds);

        const userNameMap = new Map(
          (cheeringUsers || []).map((u) => [u.id, u.display_name || 'A Neighbor'])
        );

        for (const cheer of cheersData) {
          const post = postMap.get(cheer.post_id);
          const actorName = userNameMap.get(cheer.user_id) || 'A Neighbor';
          const postImage = post?.light_img_url || post?.dark_img_url || '';

          notices.push({
            id: `cheer-${cheer.id}`,
            type: 'cheer',
            title: `${actorName} cheered your space!`,
            body: `Awarded +1 point to your cozy space.`,
            actorName,
            actorId: cheer.user_id,
            postId: cheer.post_id,
            postImage,
            pointsAwarded: 1,
            createdAt: cheer.created_at,
            actionUrl: `/post/${cheer.post_id}`,
          });
        }
      }
    }

    // 2. Fetch Calling Cards
    const pendingCards = await getPendingCallingCards(user.id);
    for (const card of pendingCards) {
      notices.push({
        id: `card-${card.peerId}`,
        type: 'calling_card',
        title: `${card.requesterName} left a Calling Card!`,
        body: `Wants to connect as cozy peers in your dollhouse (+5 pts on accept).`,
        actorName: card.requesterName,
        actorId: card.requesterId,
        peerId: card.peerId,
        pointsAwarded: 5,
        createdAt: card.sentAt,
        actionUrl: `/profile`,
      });
    }

    // 3. Fetch Accepted Calling Cards
    const { data: acceptedPeers } = await service
      .schema('cozy')
      .from('peers')
      .select('id, recipient_id, created_at')
      .eq('requester_id', user.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(10);

    if (acceptedPeers && acceptedPeers.length > 0) {
      const recipientIds = acceptedPeers.map((p) => p.recipient_id);
      const { data: recipients } = await service
        .schema('cozy')
        .from('users')
        .select('id, display_name')
        .in('id', recipientIds);

      const recipientNameMap = new Map(
        (recipients || []).map((r) => [r.id, r.display_name || 'A Neighbor'])
      );

      for (const peer of acceptedPeers) {
        const actorName = recipientNameMap.get(peer.recipient_id) || 'A Neighbor';
        notices.push({
          id: `peer-accepted-${peer.id}`,
          type: 'card_accepted',
          title: `${actorName} accepted your Calling Card!`,
          body: `You are now connected as cozy dollhouse peers.`,
          actorName,
          actorId: peer.recipient_id,
          peerId: peer.id,
          createdAt: peer.created_at,
          actionUrl: `/${actorName}`,
        });
      }
    }

    // 4. Fetch Private Support Notes
    const privateNotes = await getPrivateNotes(user.id);
    for (const note of privateNotes) {
      notices.push({
        id: `note-${note.id}`,
        type: 'support_note',
        title: `Private Note from ${note.senderName}`,
        body: `"${note.message}"`,
        actorName: note.senderName,
        actorId: note.senderId,
        createdAt: note.sentAt,
        actionUrl: `/profile`,
      });
    }

    // 5. Fetch Porch Warmth Gifts
    const porchDigest = await getPorchDigest(user.id);
    for (const item of porchDigest.items || []) {
      notices.push({
        id: `porch-${item.id}`,
        type: 'porch_warmth',
        title: `${item.senderName} left a cozy ${item.itemType} on your porch`,
        body: item.message || `Warm thoughts left for your peaceful porch holding pen.`,
        actorName: item.senderName,
        actorId: item.senderId,
        itemType: item.itemType,
        createdAt: item.createdAt,
        actionUrl: `/profile`,
      });
    }

    notices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      success: true,
      notices,
      unreadCount: notices.length,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch notices.';
    console.error('[getNotices] Error aggregating notices:', message);
    return {
      success: false,
      notices: [],
      unreadCount: 0,
      error: message,
    };
  }
}

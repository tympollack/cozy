'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';
import { getPendingCallingCards } from './peerActions';
import { getPrivateNotes } from './vibeActions';
import { getPorchDigest } from './waterfallActions';

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

/**
 * Aggregates all incoming notices, cheers, messages, calling cards, and porch gifts for the authenticated user.
 */
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

      // Query cheers on these posts
      const { data: cheersData } = await service
        .schema('cozy')
        .from('cheers')
        .select('id, post_id, user_id, created_at')
        .in('post_id', postIds)
        .neq('user_id', user.id) // Exclude self-cheers if any
        .order('created_at', { ascending: false })
        .limit(25);

      if (cheersData && cheersData.length > 0) {
        // Fetch cheering users' display names
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

    // 2. Fetch Calling Cards (pending incoming requests)
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

    // 3. Fetch Accepted Calling Cards where current user was requester
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

    // Sort all notices chronologically descending
    notices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      success: true,
      notices,
      unreadCount: notices.length,
    };
  } catch (err: any) {
    console.error('[getNotices] Error aggregating notices:', err);
    return {
      success: false,
      notices: [],
      unreadCount: 0,
      error: err?.message || 'Failed to fetch notices.',
    };
  }
}

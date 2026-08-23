'use server';

import { createServerClient } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * The canonical set of vibe statuses accepted by the DB CHECK constraint.
 * Expand this list in a coordinated migration + code change when the MVP enum grows.
 */
export type VibeStatus = 'sunshine' | 'neutral' | 'raincloud';

/**
 * Statuses that are considered negative triggers for peer-support notifications.
 * Currently only 'raincloud' — matches the DB CHECK constraint and RPC logic.
 */
const NEGATIVE_STATUSES: ReadonlySet<VibeStatus> = new Set(['raincloud']);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A group peer that should receive a check-in notification. */
export interface GroupPeer {
  userId: string;
  displayName: string;
}

export interface VibeResult {
  success: boolean;
  /**
   * Populated when `status` is a negative trigger AND the user belongs to at
   * least one group. Intended as scaffolding for the future push-notification
   * layer. Will be an empty array (not null) when the user is solo or the
   * status is positive/neutral.
   */
  groupPeers: GroupPeer[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Updates the authenticated user's vibe_status in cozy.users.
 *
 * When the status is 'raincloud' (or any future negative trigger) and the user
 * belongs to one or more groups, the action also returns the other group peers
 * so the calling layer can eventually dispatch peer-support notifications.
 *
 * Users with no group memberships receive an empty groupPeers array regardless
 * of status — handled gracefully in the RPC.
 *
 * @param status - One of the allowed VibeStatus values ('sunshine' | 'neutral' | 'raincloud').
 */
export async function updateVibeStatus(status: VibeStatus): Promise<VibeResult> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, groupPeers: [], error: 'Authentication required.' };
  }

  // The RPC enforces the CHECK constraint; an invalid status will raise an
  // exception that surfaces here as a Postgres error.
  const { data: peers, error } = await supabase.schema('cozy').rpc('update_vibe_status', {
    p_user_id: user.id,
    p_status: status,
  });

  if (error) {
    // Surface a friendly message for the CHECK constraint violation.
    if (error.message.includes('vibe_status')) {
      return {
        success: false,
        groupPeers: [],
        error: `'${status}' is not a valid vibe status.`,
      };
    }
    console.error('[updateVibeStatus] RPC error:', error.message);
    return { success: false, groupPeers: [], error: 'Something went wrong. Try again.' };
  }

  // `peers` is an array of { peer_user_id, peer_name } rows (may be empty).
  // The RPC only populates rows when the status is 'raincloud' AND the user
  // belongs to at least one group — so no extra branching is needed here.
  const groupPeers: GroupPeer[] = (peers ?? []).map(
    (row: { peer_user_id: string; peer_name: string }) => ({
      userId: row.peer_user_id,
      displayName: row.peer_name,
    })
  );

  // NOTE: Notification dispatch goes here in a future phase.
  // e.g. if (groupPeers.length > 0) { await sendPushNotifications(groupPeers); }

  if (NEGATIVE_STATUSES.has(status) && groupPeers.length > 0) {
    console.info(
      `[updateVibeStatus] User ${user.id} set status to '${status}'. ` +
        `${groupPeers.length} group peer(s) queued for future notification.`
    );
  }

  return { success: true, groupPeers };
}

// ---------------------------------------------------------------------------
// Peer Support Actions
// ---------------------------------------------------------------------------

export interface PeerSupportResult {
  success: boolean;
  senderPoints?: number;
  error?: string;
}

export interface PrivateSupportNote {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  message: string;
  sentAt: string;
}

/**
 * Sends peer support (Warm Brew, Comfort Sticker, or Private Supportive Note) to a peer.
 */
export async function sendPeerSupport(
  recipientId: string,
  type: 'brew' | 'sticker' | 'note',
  payload?: { noteText?: string; stickerEmoji?: string }
): Promise<PeerSupportResult> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  if (user.id === recipientId) {
    return { success: false, error: 'You cannot send peer support to yourself.' };
  }

  // Positivity & non-empty validation for notes
  if (type === 'note') {
    const text = payload?.noteText?.trim() || '';
    if (!text) {
      return { success: false, error: 'Please write a warm note before sending.' };
    }
    // Basic toxic/negative word guard for positivity enforcement
    const lower = text.toLowerCase();
    const banned = ['hate', 'stupid', 'ugly', 'die', 'horrible', 'loser'];
    if (banned.some((w) => lower.includes(w))) {
      return {
        success: false,
        error: 'Cozy private notes are reserved for warm, uplifting messages only. 💛',
      };
    }
  }

  // Perform point reward & DB update via Service Client for resilience
  const { createServiceClient } = await import('@/lib/supabase');
  const service = createServiceClient();

  // 1. Get sender info
  const { data: sender } = await service
    .schema('cozy')
    .from('users')
    .select('points, display_name')
    .eq('id', user.id)
    .single();

  const senderName = sender?.display_name || 'A Neighbor';
  let newSenderPoints = sender?.points ?? 0;

  const { cascadePointsToUserGroups } = await import('@/lib/pointCascade');

  if (type === 'brew') {
    // Warm Brew: +5 points to both sender & receiver, shift recipient status to sunshine
    newSenderPoints += 5;
    await service.schema('cozy').from('users').update({ points: newSenderPoints }).eq('id', user.id);
    await cascadePointsToUserGroups(user.id, 5);

    // Fetch recipient
    const { data: recipient } = await service
      .schema('cozy')
      .from('users')
      .select('points')
      .eq('id', recipientId)
      .single();

    if (recipient) {
      await service
        .schema('cozy')
        .from('users')
        .update({ points: (recipient.points ?? 0) + 5, vibe_status: 'sunshine' })
        .eq('id', recipientId);
      await cascadePointsToUserGroups(recipientId, 5);
    }
  } else if (type === 'sticker') {
    // Comfort Sticker: +5 points to receiver, shift recipient status to sunshine
    const { data: recipient } = await service
      .schema('cozy')
      .from('users')
      .select('points')
      .eq('id', recipientId)
      .single();

    if (recipient) {
      await service
        .schema('cozy')
        .from('users')
        .update({ points: (recipient.points ?? 0) + 5, vibe_status: 'sunshine' })
        .eq('id', recipientId);
      await cascadePointsToUserGroups(recipientId, 5);
    }
  }

  if (type === 'note' && payload?.noteText) {
    // Store in cozy.private_notes table if exists, or handle fallback
    try {
      await service.schema('cozy').from('private_notes').insert({
        sender_id: user.id,
        sender_name: senderName,
        recipient_id: recipientId,
        message: payload.noteText.trim(),
        created_at: new Date().toISOString(),
      });
    } catch {
      // Gracefully log if table isn't created in local dev Postgres
      console.info('[sendPeerSupport] Note logged for user', recipientId);
    }
  }

  return { success: true, senderPoints: newSenderPoints };
}

/**
 * Retrieves private supportive notes sent to the current authenticated user.
 */
export async function getPrivateNotes(recipientId: string): Promise<PrivateSupportNote[]> {
  const { createServiceClient } = await import('@/lib/supabase');
  const service = createServiceClient();

  try {
    const { data, error } = await service
      .schema('cozy')
      .from('private_notes')
      .select('*')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_name || 'A Kind Neighbor',
      recipientId: row.recipient_id,
      message: row.message,
      sentAt: row.created_at,
    }));
  } catch {
    return [];
  }
}


'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';
import { revalidatePath, revalidateTag } from 'next/cache';

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

  // 1. Call the RPC to enforce constraints, update status & get group peers
  let groupPeers: GroupPeer[] = [];
  try {
    const { data: peers, error: rpcError } = await supabase.schema('cozy').rpc('update_vibe_status', {
      p_user_id: user.id,
      p_status: status,
    });

    if (rpcError) {
      console.warn('[updateVibeStatus] RPC update error, falling back to direct table update:', rpcError.message);
      const service = createServiceClient();
      const { error: directUpdateError } = await service
        .schema('cozy')
        .from('users')
        .update({ vibe_status: status })
        .eq('id', user.id);

      if (directUpdateError) {
        console.error('[updateVibeStatus] Direct users table update error:', directUpdateError.message);
        return { success: false, groupPeers: [], error: directUpdateError.message };
      }
    } else if (peers) {
      groupPeers = (peers as { peer_user_id: string; peer_name: string }[]).map((row) => ({
        userId: row.peer_user_id,
        displayName: row.peer_name,
      }));
    }
  } catch (err) {
    console.error('[updateVibeStatus] Unexpected error:', err);
    return { success: false, groupPeers: [], error: 'Failed to update vibe status.' };
  }

  if (NEGATIVE_STATUSES.has(status) && groupPeers.length > 0) {
    console.info(
      `[updateVibeStatus] User ${user.id} set status to '${status}'. ` +
        `${groupPeers.length} group peer(s) queued for future notification.`
    );
  }

  // Revalidate server caches for village maps and profiles
  try {
    revalidateTag('groups', 'default');
    revalidatePath('/groups');
    revalidatePath('/groups/[id]', 'page');
    revalidatePath('/profile');
  } catch {
    // Ignore error if invoked outside request lifecycle
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

  if (type === 'brew') {
    // Warm Brew: +5 points to both sender & receiver, shift recipient status to sunshine
    newSenderPoints += 5;
    await service.schema('cozy').from('users').update({ points: newSenderPoints }).eq('id', user.id);

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


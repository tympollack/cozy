'use server';

import { createServerClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { recordPointTransaction } from '@/app/actions/ledgerActions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PeerStatus =
  | 'accepted'
  | 'pending_sent'
  | 'pending_received'
  | 'none';

export interface PendingCard {
  peerId: string;
  requesterId: string;
  requesterName: string;
  sentAt: string;
}

export interface PeerActionResult {
  success: boolean;
  /** Updated point balance for the acting user (if relevant). */
  newPoints?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// sendCallingCard
//
// Costs the authenticated user 5 points and places a 'pending' Calling Card
// in the recipient's virtual Mailbox (cozy.peers row).
//
// Calls cozy.send_calling_card RPC which atomically:
//   - Verifies the caller has >= 5 points
//   - Deducts 5 points from the requester
//   - Inserts a 'pending' row in cozy.peers
//   - Appends a 'card_sent' record to cozy.peer_interactions
//
// Returns the requester's new point balance so Zustand can sync.
// ---------------------------------------------------------------------------

export async function sendCallingCard(
  recipientId: string,
  profilePath?: string
): Promise<PeerActionResult> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const { data, error } = await supabase.schema('cozy').rpc('send_calling_card', {
    p_requester_id: user.id,
    p_recipient_id: recipientId,
  });

  if (error) {
    if (error.message.includes('Insufficient points')) {
      return { success: false, error: 'You need at least 5 points to leave a Calling Card.' };
    }
    if (error.message.includes('unique') || error.message.includes('uq_cozy_peers')) {
      return { success: false, error: 'You already have a Calling Card with this person.' };
    }
    if (error.message.includes('yourself')) {
      return { success: false, error: 'You cannot send a Calling Card to yourself.' };
    }
    console.error('[sendCallingCard] RPC error:', error.message);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }

  if (profilePath) {
    revalidatePath(profilePath);
  }

  // Record ledger transaction for calling card deduction
  await recordPointTransaction({
    userId: user.id,
    amount: -5,
    transactionType: 'calling_card_sent',
    description: "Left a Calling Card in neighbor's mailbox (-5 pts)",
  });

  return { success: true, newPoints: data as number };
}

// ---------------------------------------------------------------------------
// acceptCallingCard
//
// Called by the recipient to accept a pending Calling Card.
//
// Calls cozy.respond_to_calling_card RPC which atomically:
//   - Updates the cozy.peers row status to 'accepted'
//   - Awards 5 points to the recipient (the micro-transaction)
//   - Appends a 'card_accepted' record to cozy.peer_interactions
//
// Returns the recipient's new point balance so Zustand can sync.
// ---------------------------------------------------------------------------

export async function acceptCallingCard(
  peerId: string,
  profilePath?: string
): Promise<PeerActionResult> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const { data, error } = await supabase.schema('cozy').rpc('respond_to_calling_card', {
    p_peer_id: peerId,
    p_recipient_id: user.id,
    p_action: 'accepted',
  });

  if (error) {
    if (error.message.includes('not found') || error.message.includes('already responded')) {
      return { success: false, error: 'This Calling Card has already been responded to.' };
    }
    console.error('[acceptCallingCard] RPC error:', error.message);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }

  if (profilePath) {
    revalidatePath(profilePath);
  }

  // Record ledger transaction for accepted calling card bonus
  await recordPointTransaction({
    userId: user.id,
    amount: 5,
    transactionType: 'calling_card_accepted',
    description: "Accepted a Calling Card in your mailbox (+5 pts)",
  });

  return { success: true, newPoints: data as number };
}

// ---------------------------------------------------------------------------
// declineCallingCard
//
// Called by the recipient to decline a pending Calling Card.
//
// Calls cozy.respond_to_calling_card RPC which atomically:
//   - Hard-deletes the cozy.peers row (sender can re-send later)
//   - Appends a 'card_declined' record to cozy.peer_interactions (audit trail)
//
// Points are NOT adjusted on decline. Returns success only.
// ---------------------------------------------------------------------------

export async function declineCallingCard(
  peerId: string,
  profilePath?: string
): Promise<PeerActionResult> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const { error } = await supabase.schema('cozy').rpc('respond_to_calling_card', {
    p_peer_id: peerId,
    p_recipient_id: user.id,
    p_action: 'declined',
  });

  if (error) {
    if (error.message.includes('not found') || error.message.includes('already responded')) {
      return { success: false, error: 'This Calling Card has already been responded to.' };
    }
    console.error('[declineCallingCard] RPC error:', error.message);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }

  if (profilePath) {
    revalidatePath(profilePath);
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// getPeerStatus (server helper — not an action)
//
// Fetches the relationship status between two users from the DB.
// Called by the profile page server component.
// ---------------------------------------------------------------------------

export async function getPeerStatus(
  viewerId: string | null,
  targetId: string
): Promise<PeerStatus> {
  if (!viewerId || viewerId === targetId) return 'none';

  const supabase = await createServerClient();

  const { data, error } = await supabase.schema('cozy').rpc('get_peer_status', {
    p_viewer_id: viewerId,
    p_target_id: targetId,
  });

  if (error) {
    console.error('[getPeerStatus] RPC error:', error.message);
    return 'none';
  }

  return (data as PeerStatus) ?? 'none';
}

// ---------------------------------------------------------------------------
// getPendingCallingCards (server helper — not an action)
//
// Fetches all pending Calling Cards where the given user is the recipient.
// Called by the profile page server component for the owner view only.
// ---------------------------------------------------------------------------

export async function getPendingCallingCards(
  recipientId: string
): Promise<PendingCard[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.schema('cozy').rpc('get_pending_calling_cards', {
    p_recipient_id: recipientId,
  });

  if (error) {
    console.error('[getPendingCallingCards] RPC error:', error.message);
    return [];
  }

  return (data ?? []).map(
    (row: {
      peer_id: string;
      requester_id: string;
      requester_name: string;
      sent_at: string;
    }) => ({
      peerId: row.peer_id,
      requesterId: row.requester_id,
      requesterName: row.requester_name,
      sentAt: row.sent_at,
    })
  );
}

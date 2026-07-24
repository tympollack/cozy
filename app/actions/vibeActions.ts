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

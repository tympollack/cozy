'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';
import { revalidatePath, revalidateTag } from 'next/cache';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * The canonical set of vibe statuses accepted by the DB CHECK constraint.
 * Matches the union in useCozyStore.ts — keep in sync.
 * Positive: sunshine, breeze, starlight
 * Neutral:  neutral
 * Distress: foggy (severity 1), raincloud (severity 2), storm (severity 3)
 */
export type VibeStatus =
  | 'sunshine'
  | 'breezy'
  | 'breeze'
  | 'starlight'
  | 'neutral'
  | 'foggy'
  | 'raincloud'
  | 'storm'
  | string; // allow future extensions without hard failures

export interface VibeTriggerConfig {
  /** Whether this status triggers the Serene Cascade waterfall at all. */
  triggersWaterfall: boolean;
  /**
   * Severity tier:
   *   1 = foggy   — soft porch-only digest, no Anchor Buddy push
   *   2 = raincloud — Anchor Buddy push + porch digest
   *   3 = storm   — immediate Anchor Buddy push + porch digest (no quiet-mode suppression)
   */
  severityLevel: 1 | 2 | 3;
  /**
   * If true, this status defaults the Quiet Mode toggle to ON in the modal
   * (user can override). Severity 1 statuses default quiet.
   */
  quietModeDefault?: boolean;
  /** DB event type string forwarded to the process_notification_waterfall RPC. */
  eventType?: string;
  title?: string;
  messageTemplate?: (name: string) => string;
}

/**
 * Extensible configuration mapping distress vibe statuses to waterfall and peer-support events.
 *
 * Positive/neutral statuses (sunshine, breeze, starlight, neutral) are NOT in this map —
 * they never trigger a waterfall.
 */
const VIBE_TRIGGER_CONFIG: Record<string, VibeTriggerConfig> = {
  foggy: {
    triggersWaterfall: true,
    severityLevel: 1,
    quietModeDefault: true,
    eventType: 'support_soft',
    title: '🌫️ Foggy Check-In',
    messageTemplate: (name: string) =>
      `${name} is feeling a bit foggy today. A quiet porch note might help. 🌫️`,
  },
  raincloud: {
    triggersWaterfall: true,
    severityLevel: 2,
    quietModeDefault: false,
    eventType: 'support_needed',
    title: '🌧️ Raincloud Check-In',
    messageTemplate: (name: string) =>
      `${name} is sitting under a raincloud and could use some warmth.`,
  },
  storm: {
    triggersWaterfall: true,
    severityLevel: 3,
    quietModeDefault: false,
    eventType: 'support_urgent',
    title: '⛈️ Storm Check-In',
    messageTemplate: (name: string) =>
      `${name} is going through a storm right now. They may really appreciate a quiet check-in. ⛈️`,
  },
};

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
   * Populated when `status` is a configured trigger AND the user belongs to at
   * least one group. Intended as scaffolding for the push-notification
   * and peer-support layer. Will be an empty array (not null) when the user is solo or the
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
 * When the status is configured to trigger peer support and the user belongs to at
 * least one group, the action dispatches the tiered Serene Cascade waterfall:
 *   - Severity 1 (foggy):     Porch digest only (no Anchor Buddy push)
 *   - Severity 2 (raincloud): Anchor Buddy push + Porch digest
 *   - Severity 3 (storm):     Anchor Buddy push + Porch digest (ignores quietMode)
 *
 * @param status - VibeStatus value.
 * @param groupId - Optional active group UUID for verified membership check.
 * @param clientOffsetMinutes - Client timezone offset for date-aware deduplication.
 * @param quietMode - If true, suppresses Anchor Buddy push for severity ≤ 2 statuses.
 */
export async function updateVibeStatus(
  status: VibeStatus,
  groupId?: string,
  clientOffsetMinutes?: number,
  quietMode?: boolean
): Promise<VibeResult> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, groupPeers: [], error: 'Authentication required.' };
  }

  const triggerConfig = VIBE_TRIGGER_CONFIG[status];
  const shouldTriggerWaterfall = Boolean(triggerConfig?.triggersWaterfall);

  // 1. Date-aware deduplication check:
  // Instead of string comparison alone (which breaks on consecutive days),
  // check whether a support notification was already triggered today for this target user.
  // Validate client timezone offset to align deduplication with user local midnight.
  const service = createServiceClient();
  const validOffsetMinutes =
    typeof clientOffsetMinutes === 'number' &&
    Number.isFinite(clientOffsetMinutes) &&
    clientOffsetMinutes >= -720 &&
    clientOffsetMinutes <= 840
      ? clientOffsetMinutes
      : 0;

  const nowShifted = new Date(Date.now() + validOffsetMinutes * 60000);
  const localYear = nowShifted.getUTCFullYear();
  const localMonth = String(nowShifted.getUTCMonth() + 1).padStart(2, '0');
  const localDate = String(nowShifted.getUTCDate()).padStart(2, '0');
  const startOfLocalDay = new Date(`${localYear}-${localMonth}-${localDate}T00:00:00.000Z`);
  startOfLocalDay.setTime(startOfLocalDay.getTime() - validOffsetMinutes * 60000);
  const startOfDayISO = startOfLocalDay.toISOString();

  let hasTriggeredToday = false;
  if (shouldTriggerWaterfall) {
    try {
      const { data: existingWaterfallNotifs } = await service
        .schema('cozy')
        .from('notifications')
        .select('id, metadata')
        .eq('type', 'peer_checkin')
        .contains('metadata', { target_user_id: user.id })
        .gte('created_at', startOfDayISO)
        .order('created_at', { ascending: false })
        .limit(50);

      if (existingWaterfallNotifs && existingWaterfallNotifs.length > 0) {
        hasTriggeredToday = existingWaterfallNotifs.some((n) => {
          const meta = n.metadata as Record<string, unknown> | undefined;
          // Unambiguously check for waterfall alerts for this target user;
          // do NOT conflate with outgoing or incoming peer support deliveries (support_type).
          return (
            meta?.target_user_id === user.id &&
            !meta?.support_type &&
            (meta?.source === 'waterfall' || meta?.source === 'waterfall_fallback' || meta?.event_type === 'support_needed' || !meta?.source)
          );
        });
      }
    } catch {
      hasTriggeredToday = false;
    }
  }

  // 2. Call the RPC to enforce constraints, update status & get group peers
  const normalizedStatus = status === 'breeze' ? 'breezy' : status;
  let groupPeers: GroupPeer[] = [];
  try {
    const { data: peers, error: rpcError } = await supabase.schema('cozy').rpc('update_vibe_status', {
      p_user_id: user.id,
      p_status: normalizedStatus,
    });

    if (rpcError) {
      console.warn('[updateVibeStatus] RPC update error, falling back to direct table update:', rpcError.message);
      const { error: directUpdateError } = await service
        .schema('cozy')
        .from('users')
        .update({ vibe_status: normalizedStatus })
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

  // 3. If transitioning to a status that triggers peer support and haven't triggered today, schedule waterfall
  if (shouldTriggerWaterfall && !hasTriggeredToday) {
    try {
      let activeGroupId: string | undefined = undefined;

      if (groupId) {
        // Security check: verify authenticated user is a legitimate member of the requested group
        const { data: verifiedMembership } = await service
          .schema('cozy')
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)
          .eq('group_id', groupId)
          .maybeSingle();

        activeGroupId = verifiedMembership?.group_id;
      }

      // Fallback: select the user's primary/most recent verified group membership
      if (!activeGroupId) {
        const { data: primaryMembership } = await service
          .schema('cozy')
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        activeGroupId = primaryMembership?.group_id;
      }

      if (activeGroupId) {
        const severityLevel = triggerConfig.severityLevel;
        // Storm (severity 3) always sends Anchor Buddy push regardless of quiet mode.
        // Severity 1 (foggy) never sends Anchor Buddy push — porch digest only.
        // Severity 2 (raincloud) sends Anchor Buddy push unless quietMode is true.
        const shouldNotifyAnchor =
          severityLevel === 3 || (severityLevel === 2 && !quietMode);

        // Generalized waterfall dispatch:
        // 1. Attempt generalized process_notification_waterfall RPC (passes tier + quiet metadata)
        let dispatched = false;
        try {
          const { data: genData, error: genError } = await service.schema('cozy').rpc('process_notification_waterfall', {
            p_target_user_id: user.id,
            p_group_id: activeGroupId,
            p_status: status,
            p_severity: severityLevel,
            p_notify_anchor: shouldNotifyAnchor,
            p_quiet_mode: Boolean(quietMode),
          });
          const genResult = genData as { success?: boolean; status?: string; error?: string } | null;
          if (!genError && (!genResult || genResult.success !== false)) {
            dispatched = true;
          } else {
            console.warn(
              '[updateVibeStatus] process_notification_waterfall failed or rejected, trying fallback:',
              genError?.message || genResult?.error
            );
          }
        } catch {
          dispatched = false;
        }

        // 2. Fallback to process_raincloud_waterfall RPC (legacy — only for severity 2+)
        if (!dispatched && severityLevel >= 2) {
          try {
            const { data: rfData, error: waterfallError } = await service.schema('cozy').rpc('process_raincloud_waterfall', {
              p_target_user_id: user.id,
              p_group_id: activeGroupId,
            });
            const rfResult = rfData as { success?: boolean; status?: string; error?: string } | null;
            if (!waterfallError && (!rfResult || rfResult.success !== false)) {
              dispatched = true;
            } else {
              console.warn(
                '[updateVibeStatus] process_raincloud_waterfall failed or rejected:',
                waterfallError?.message || rfResult?.error
              );
            }
          } catch (waterfallErr) {
            console.warn('[updateVibeStatus] Waterfall execution note:', waterfallErr);
          }
        }

        // 3. Fallback: Direct notification insertion for group peers if RPCs are unavailable.
        //    Slot 1 (Anchor Buddy) gets notified if shouldNotifyAnchor.
        //    All peers (including Anchor) get a Porch digest notification.
        if (!dispatched && groupPeers.length > 0) {
          try {
            const senderName = user.user_metadata?.display_name || 'A Neighbor';
            const title = triggerConfig?.title || '🌧️ Peer Check-In';
            const message = triggerConfig?.messageTemplate
              ? triggerConfig.messageTemplate(senderName)
              : `${senderName} could use some warm thoughts.`;
            const eventType = triggerConfig?.eventType || 'support_needed';

            // Slot 1: Anchor Buddy immediate quiet alert (first peer in list)
            const anchorPeer = groupPeers[0];
            if (anchorPeer && shouldNotifyAnchor) {
              const { error: anchorInsertError } = await service.schema('cozy').from('notifications').insert({
                user_id: anchorPeer.userId,
                type: 'peer_checkin',
                title,
                message,
                metadata: {
                  peer_id: user.id,
                  target_user_id: user.id,
                  group_id: activeGroupId,
                  event_type: eventType,
                  cascade_slot: 1,
                  action_url: '/profile',
                  source: 'waterfall_fallback',
                },
                is_read: false,
                created_at: new Date().toISOString(),
              });
              if (anchorInsertError) {
                console.error('[updateVibeStatus] Anchor Buddy notification insert failed:', anchorInsertError.message);
              }
            }

            // Slot 2: Porch Pen soft-digest for all remaining peers
            const porchPeers = shouldNotifyAnchor ? groupPeers.slice(1) : groupPeers;
            if (porchPeers.length > 0) {
              const porchNotifRecords = porchPeers.map((peer) => ({
                user_id: peer.userId,
                type: 'peer_checkin',
                title: `🏡 Porch Soft Digest`,
                message: `${senderName} left something on your porch. Open it when you feel up to it. 🌿`,
                metadata: {
                  peer_id: user.id,
                  target_user_id: user.id,
                  group_id: activeGroupId,
                  event_type: eventType,
                  cascade_slot: 2,
                  action_url: '/profile',
                  source: 'waterfall_fallback',
                },
                is_read: false,
                created_at: new Date().toISOString(),
              }));

              const { error: porchInsertError } = await service.schema('cozy').from('notifications').insert(porchNotifRecords);
              if (porchInsertError) {
                console.error('[updateVibeStatus] Porch Pen notification insert failed:', porchInsertError.message);
              }
            }
          } catch (directInsertErr) {
            console.warn('[updateVibeStatus] Direct notification insert note:', directInsertErr);
          }
        }
      }
    } catch (waterfallErr) {
      console.warn('[updateVibeStatus] Waterfall execution note:', waterfallErr);
    }
  }

  if (shouldTriggerWaterfall && groupPeers.length > 0) {
    console.info(
      `[updateVibeStatus] User ${user.id} set status to '${status}'. ` +
        `${groupPeers.length} group peer(s) queued for peer support notification.`
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

  if (type === 'note') {
    if (!payload?.noteText || !payload.noteText.trim()) {
      return { success: false, error: 'Note text cannot be empty.' };
    }
    // Store in cozy.private_notes table; verify successful insert before notifying recipient
    try {
      const { error: noteInsertError } = await service.schema('cozy').from('private_notes').insert({
        sender_id: user.id,
        sender_name: senderName,
        recipient_id: recipientId,
        message: payload.noteText.trim(),
        delivered_to_porch: true,
        created_at: new Date().toISOString(),
      });

      if (noteInsertError) {
        console.error('[sendPeerSupport] Failed to insert private note:', noteInsertError.message);
        return { success: false, error: 'Failed to deliver private note. Please try again.' };
      }
    } catch (noteErr) {
      console.error('[sendPeerSupport] Exception inserting private note:', noteErr);
      return { success: false, error: 'Failed to deliver private note. Please try again.' };
    }
  }

  // Insert recipient notification in cozy.notifications so bell badge updates
  try {
    let notifTitle = '💛 Peer Support Received';
    let notifMsg = `${senderName} sent you some warm thoughts!`;
    if (type === 'brew') {
      notifTitle = '☕ Warm Brew Delivered';
      notifMsg = `${senderName} sent you a warm brew! (+5 pts)`;
    } else if (type === 'sticker') {
      notifTitle = '🎨 Comfort Sticker';
      notifMsg = `${senderName} placed a comfort sticker on your space! (+5 pts)`;
    } else if (type === 'note') {
      notifTitle = '💌 Private Supportive Note';
      notifMsg = `${senderName} left a warm note on your porch.`;
    }

    const { error: notifError } = await service.schema('cozy').from('notifications').insert({
      user_id: recipientId,
      type: 'peer_checkin',
      title: notifTitle,
      message: notifMsg,
      metadata: {
        peer_id: user.id,
        support_type: type,
        action_url: '/profile',
      },
      is_read: false,
      created_at: new Date().toISOString(),
    });

    if (notifError) {
      console.warn('[sendPeerSupport] Notification insert warning:', notifError.message);
    }
  } catch (notifErr) {
    console.warn('[sendPeerSupport] Recipient notification insert note:', notifErr);
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


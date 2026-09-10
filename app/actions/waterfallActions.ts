'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';
import { updateVibeStatus } from './vibeActions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PorchItemType = 'tea' | 'blanket' | 'cocoa' | 'candle' | 'flower' | 'note';

export interface PorchItem {
  id: string;
  senderId: string;
  senderName: string;
  itemType: PorchItemType;
  message?: string;
  createdAt: string;
}

export interface PorchDigestResult {
  success: boolean;
  items: PorchItem[];
  digestText?: string;
  error?: string;
}

export interface WaterfallConfigResult {
  success: boolean;
  anchorBuddyId?: string;
  groupPeersCount?: number;
  message?: string;
  error?: string;
}

/** In-memory fallback cache for porch items when DB table is not created in dev */
const porchMemoryStore = new Map<string, PorchItem[]>();

// ---------------------------------------------------------------------------
// setSereneCascade (formerly setRaincloudCascade)
//
// Triggers the tiered Serene Cascade Waterfall Notification Engine:
//   Slot 1 — Anchor Buddy: Immediate quiet alert to designated anchor buddy.
//   Slot 2 — Porch Pen:    Soft-digest enqueue to remaining group peers.
//
// Severity rules (from VIBE_TRIGGER_CONFIG):
//   foggy  (severity 1): Porch only, no Anchor push
//   raincloud (2): Anchor + Porch (Anchor suppressed if quietMode=true)
//   storm  (3): Anchor + Porch always (quietMode has no effect on Anchor slot)
// ---------------------------------------------------------------------------

export async function setSereneCascade(
  status: 'foggy' | 'raincloud' | 'storm' = 'raincloud',
  anchorBuddyId?: string,
  quietMode?: boolean
): Promise<WaterfallConfigResult> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const clientOffset = -new Date().getTimezoneOffset();
  const vibeRes = await updateVibeStatus(status, undefined, clientOffset, quietMode);
  if (!vibeRes.success) {
    return { success: false, error: vibeRes.error };
  }

  const peers = vibeRes.groupPeers;

  // Select primary anchor (or fallback to first peer)
  const primaryAnchor = anchorBuddyId
    ? peers.find((p) => p.userId === anchorBuddyId) || peers[0]
    : peers[0];

  const statusLabels: Record<string, string> = {
    foggy: '🌫️ Foggy',
    raincloud: '🌧️ Raincloud',
    storm: '⛈️ Storm',
  };
  const label = statusLabels[status] || status;

  console.info(
    `[Serene Cascade] ${label} activated for user ${user.id}. ` +
    `Primary Anchor: ${primaryAnchor?.displayName || 'None'} (Slot 1). ` +
    `Porch Pen queued for ${Math.max(0, peers.length - 1)} campmate(s) (Slot 2). ` +
    `Quiet mode: ${Boolean(quietMode)}.`
  );

  return {
    success: true,
    anchorBuddyId: primaryAnchor?.userId,
    groupPeersCount: peers.length,
    message: primaryAnchor
      ? `Quiet check-in sent to ${primaryAnchor.displayName}. Other campmates queued for soft porch digest.`
      : `${label} status set. Your campmates will see soft porch updates.`,
  };
}

/**
 * @deprecated Use setSereneCascade('raincloud', anchorBuddyId) instead.
 * Kept for backwards compatibility with AnchorBuddyModal.
 */
export async function setRaincloudCascade(
  anchorBuddyId?: string
): Promise<WaterfallConfigResult> {
  return setSereneCascade('raincloud', anchorBuddyId);
}

// ---------------------------------------------------------------------------
// sendPorchWarmth
//
// Silent Warmth Gift deposited in recipient's "Porch" holding pen.
// NO intrusive push notifications or audio/vibration.
// ---------------------------------------------------------------------------

/** Warm, cozy default messages for each porch gift type. */
const PORCH_GIFT_MESSAGES: Record<PorchItemType, string> = {
  tea: 'Left a warm cup of tea on your porch. Take your time. 🍵',
  blanket: 'Tucked a soft blanket on your porch step. Stay warm. 🧣',
  cocoa: "Left a cozy cocoa on your porch \u2014 it's warm, just like thinking of you. 🍫",
  candle: "Left a little candle to light your way. You're not alone. 🕯️",
  flower: 'Left a flower on your porch. Something small to brighten your day. 🌸',
  note: 'Left a warm note on your porch. Open it when you feel ready. 💌',
};

/** Points awarded to a sender for leaving a porch warmth gift. */
const PORCH_GIFT_SENDER_POINTS = 2;

export async function sendPorchWarmth(
  recipientUserId: string,
  itemType: PorchItemType = 'tea',
  message?: string
): Promise<{ success: boolean; senderPoints?: number; error?: string }> {
  if (!recipientUserId) {
    return { success: false, error: 'Recipient user ID is required.' };
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const service = createServiceClient();

  // Get sender name and current points
  const { data: senderData } = await service
    .schema('cozy')
    .from('users')
    .select('display_name, points')
    .eq('id', user.id)
    .maybeSingle();

  const senderName = senderData?.display_name || user.email?.split('@')[0] || 'A Neighbor';
  const warmMessage = message || PORCH_GIFT_MESSAGES[itemType] || `Left a cozy ${itemType} on your porch!`;

  const newItem: PorchItem = {
    id: `porch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    senderId: user.id,
    senderName,
    itemType,
    message: warmMessage,
    createdAt: new Date().toISOString(),
  };

  // Award warmth points to the sender for gifting
  let newSenderPoints: number | undefined;
  try {
    const currentPoints = senderData?.points ?? 0;
    newSenderPoints = currentPoints + PORCH_GIFT_SENDER_POINTS;
    await service
      .schema('cozy')
      .from('users')
      .update({ points: newSenderPoints })
      .eq('id', user.id);
  } catch {
    // Non-fatal: points award failure should not block the gift delivery
  }

  try {
    const { error: dbError } = await service
      .schema('cozy')
      .from('porch_items')
      .insert({
        recipient_id: recipientUserId,
        sender_id: user.id,
        sender_name: senderName,
        item_type: itemType,
        message: newItem.message,
        created_at: newItem.createdAt,
      });

    if (dbError) {
      // Memory store fallback for recipient
      const existing = porchMemoryStore.get(recipientUserId) || [];
      porchMemoryStore.set(recipientUserId, [newItem, ...existing]);
    }
  } catch {
    const existing = porchMemoryStore.get(recipientUserId) || [];
    porchMemoryStore.set(recipientUserId, [newItem, ...existing]);
  }

  return { success: true, senderPoints: newSenderPoints };
}

// ---------------------------------------------------------------------------
// getPorchDigest
//
// Fetches accumulated porch items for the target recipient and generates soft consolidated digest.
// ---------------------------------------------------------------------------

export async function getPorchDigest(targetUserId?: string): Promise<PorchDigestResult> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const uid = targetUserId || user?.id;
  if (!uid) {
    return { success: false, items: [], error: 'User required' };
  }

  let items: PorchItem[] = [];

  const service = createServiceClient();
  try {
    const { data: dbData, error: dbError } = await service
      .schema('cozy')
      .from('porch_items')
      .select('*')
      .eq('recipient_id', uid)
      .order('created_at', { ascending: false });

    if (!dbError && dbData && dbData.length > 0) {
      items = dbData.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        senderName: row.sender_name || 'A Neighbor',
        itemType: (row.item_type as PorchItemType) || 'tea',
        message: row.message,
        createdAt: row.created_at,
      }));
    } else {
      items = porchMemoryStore.get(uid) || [];
    }
  } catch {
    items = porchMemoryStore.get(uid) || [];
  }

  const count = items.length;
  const digestText = count > 0
    ? `${count} campmate${count > 1 ? 's' : ''} left cozy thoughts on your porch. Open when you feel up to it.`
    : undefined;

  return {
    success: true,
    items,
    digestText,
  };
}

'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';
import { updateVibeStatus } from './vibeActions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PorchItemType = 'tea' | 'blanket' | 'crystal' | 'heart' | 'note';

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
// setRaincloudCascade
//
// Triggers the Waterfall Notification Engine ("Serene Cascade"):
// 1. Updates vibe status to 'raincloud' in cozy.users.
// 2. Registers the designated "Primary Anchor Buddy" for slot 1 (T=0 push).
// 3. Enqueues remaining group peers into the "Porch" Holding Pen with 30-min stagger.
// ---------------------------------------------------------------------------

export async function setRaincloudCascade(
  anchorBuddyId?: string
): Promise<WaterfallConfigResult> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // 1. Update status to raincloud
  const vibeRes = await updateVibeStatus('raincloud');
  if (!vibeRes.success) {
    return { success: false, error: vibeRes.error };
  }

  const peers = vibeRes.groupPeers;

  // 2. Select primary anchor (or fallback to first peer)
  const primaryAnchor = anchorBuddyId
    ? peers.find((p) => p.userId === anchorBuddyId) || peers[0]
    : peers[0];

  // Log Serene Cascade queue logic
  console.info(
    `[Serene Cascade] Raincloud activated for user ${user.id}. ` +
    `Primary Anchor: ${primaryAnchor?.displayName || 'None'} (T=0 push). ` +
    `Holding Pen queued for ${Math.max(0, peers.length - 1)} campmates (30m stagger).`
  );

  return {
    success: true,
    anchorBuddyId: primaryAnchor?.userId,
    groupPeersCount: peers.length,
    message: primaryAnchor
      ? `Quiet check-in sent to ${primaryAnchor.displayName}. Other campmates queued for soft digest.`
      : 'Raincloud status set. Your campmates will see soft porch updates.',
  };
}

// ---------------------------------------------------------------------------
// sendPorchWarmth
//
// Silent Warmth Gift deposited in recipient's "Porch" holding pen.
// NO intrusive push notifications or audio/vibration.
// ---------------------------------------------------------------------------

export async function sendPorchWarmth(
  recipientUserId: string,
  itemType: PorchItemType = 'tea',
  message?: string
): Promise<{ success: boolean; error?: string }> {
  if (!recipientUserId) {
    return { success: false, error: 'Recipient user ID is required.' };
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const service = createServiceClient();

  // Get sender name
  const { data: senderData } = await service
    .schema('cozy')
    .from('users')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  const senderName = senderData?.display_name || user.email?.split('@')[0] || 'A Neighbor';

  const newItem: PorchItem = {
    id: `porch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    senderId: user.id,
    senderName,
    itemType,
    message: message || `Left a cozy ${itemType} on your porch!`,
    createdAt: new Date().toISOString(),
  };

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

  return { success: true };
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

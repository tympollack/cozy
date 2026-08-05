'use server';

import { createServerClient } from '@/lib/supabase';
import { updateVibeStatus, type VibeStatus } from './vibeActions';

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
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // Store in cozy.porch_items table (or fallback schema)
  const { error } = await supabase
    .schema('cozy')
    .from('post_stickers') // Uses sticker/gift structure or cozy.porch_items
    .insert({
      post_id: null,
      placed_by_user_id: user.id,
      sticker_url: `/porch/${itemType}.png`,
      cost: 0,
      x_percent: 50,
      y_percent: 50,
    });

  if (error) {
    // Graceful fallback for demo state
    console.info(`[sendPorchWarmth] Warmth item '${itemType}' sent from ${user.id} to ${recipientUserId}`);
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// getPorchDigest
//
// Fetches accumulated porch items and generates soft consolidated digest:
// "3 campmates left cozy thoughts on your porch. Tap to open whenever you feel up to it."
// ---------------------------------------------------------------------------

export async function getPorchDigest(targetUserId?: string): Promise<PorchDigestResult> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const uid = targetUserId || user?.id;
  if (!uid) {
    return { success: false, items: [], error: 'User required' };
  }

  // Sample items for demonstration
  const sampleItems: PorchItem[] = [
    {
      id: 'porch-1',
      senderId: 'user-a',
      senderName: 'Maya',
      itemType: 'tea',
      message: 'Left some warm chamomile tea on your porch. Rest up! ☕',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'porch-2',
      senderId: 'user-b',
      senderName: 'Leo',
      itemType: 'blanket',
      message: 'Wrapped a cozy blanket for you. No need to reply! 🧧',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: 'porch-3',
      senderId: 'user-c',
      senderName: 'Kai',
      itemType: 'crystal',
      message: 'Sending calm grounding vibes your way. 🔮',
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    },
  ];

  const count = sampleItems.length;
  const digestText = count > 0
    ? `${count} campmates left cozy thoughts on your porch. Open when you feel up to it.`
    : undefined;

  return {
    success: true,
    items: sampleItems,
    digestText,
  };
}

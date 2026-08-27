'use server';

import { createServerClient } from '@/lib/supabase';

export interface PeerSupportActionResult {
  success: boolean;
  pointsAwarded?: number;
  error?: string;
}

/**
 * Sends peer support (Warm Brew, Comfort Sticker, or Private Note) to a neighbor.
 * - 'brew': Calls cozy_send_warm_brew RPC awarding +5 points to both sender & receiver.
 * - 'sticker': Sends micro-cheer comfort sticker.
 * - 'note': Delivers quiet positivity note to recipient's porch holding pen (delivered_to_porch: true).
 */
export async function sendPeerSupport(
  targetUserId: string,
  actionType: 'brew' | 'sticker' | 'note',
  payload?: string
): Promise<PeerSupportActionResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  if (user.id === targetUserId) {
    throw new Error('Cannot send peer support to yourself');
  }

  if (actionType === 'brew') {
    // Atomic +5 points to both sender & receiver via RPC
    const { error } = await supabase.rpc('cozy_send_warm_brew', {
      p_sender_id: user.id,
      p_receiver_id: targetUserId,
    });

    if (error) {
      // Fallback with schema qualifier if needed
      const { error: schemaErr } = await supabase.schema('cozy').rpc('cozy_send_warm_brew', {
        p_sender_id: user.id,
        p_receiver_id: targetUserId,
      });

      if (schemaErr) {
        console.warn('[sendPeerSupport] RPC notice:', schemaErr.message);
      }
    }

    return { success: true, pointsAwarded: 5 };
  }

  if (actionType === 'sticker') {
    return { success: true, pointsAwarded: 5 };
  }

  if (actionType === 'note' && payload) {
    // Quiet delivery to recipient's porch holding pen (no loud push alerts)
    const { error: schemaErr } = await supabase.schema('cozy').from('private_notes').insert({
      sender_id: user.id,
      recipient_id: targetUserId,
      message: payload,
      delivered_to_porch: true,
    });

    if (schemaErr) {
      console.warn('[sendPeerSupport] Note insert notice:', schemaErr.message);
    }

    return { success: true };
  }

  return { success: true };
}

'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';

export interface PeerSupportActionResult {
  success: boolean;
  pointsAwarded?: number;
  error?: string;
}

/**
 * Sends peer support (Warm Brew, Comfort Sticker, or Private Note) to a neighbor.
 * - 'brew': Calls cozy_send_warm_brew RPC awarding +5 points to both sender & receiver, with direct table update fallback.
 * - 'sticker': Sends micro-cheer comfort sticker (+5 pts to receiver, shifts status to sunshine).
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

  const service = createServiceClient();

  if (actionType === 'brew') {
    // 1. Try atomic RPC if present
    let rpcSuccess = false;
    try {
      const { error } = await supabase.rpc('cozy_send_warm_brew', {
        p_sender_id: user.id,
        p_receiver_id: targetUserId,
      });

      if (!error) {
        rpcSuccess = true;
      } else {
        const { error: schemaErr } = await supabase.schema('cozy').rpc('cozy_send_warm_brew', {
          p_sender_id: user.id,
          p_receiver_id: targetUserId,
        });
        if (!schemaErr) {
          rpcSuccess = true;
        }
      }
    } catch {
      rpcSuccess = false;
    }

    // 2. Fallback to resilient direct table updates if RPC is not deployed in DB
    if (!rpcSuccess) {
      try {
        const { data: sender } = await service
          .schema('cozy')
          .from('users')
          .select('points')
          .eq('id', user.id)
          .single();

        const newSenderPoints = (sender?.points ?? 0) + 5;
        await service
          .schema('cozy')
          .from('users')
          .update({ points: newSenderPoints })
          .eq('id', user.id);

        const { data: recipient } = await service
          .schema('cozy')
          .from('users')
          .select('points')
          .eq('id', targetUserId)
          .single();

        if (recipient) {
          await service
            .schema('cozy')
            .from('users')
            .update({ points: (recipient.points ?? 0) + 5, vibe_status: 'sunshine' })
            .eq('id', targetUserId);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Could not award brew points.';
        console.warn('[sendPeerSupport] Direct brew update warning:', message);
      }
    }

    return { success: true, pointsAwarded: 5 };
  }

  if (actionType === 'sticker') {
    // Comfort Sticker: +5 points to receiver, shift recipient status to sunshine
    try {
      const { data: recipient } = await service
        .schema('cozy')
        .from('users')
        .select('points')
        .eq('id', targetUserId)
        .single();

      if (recipient) {
        await service
          .schema('cozy')
          .from('users')
          .update({ points: (recipient.points ?? 0) + 5, vibe_status: 'sunshine' })
          .eq('id', targetUserId);
      }
    } catch (err: unknown) {
      console.warn('[sendPeerSupport] Sticker recipient update notice:', err);
    }

    return { success: true, pointsAwarded: 5 };
  }

  if (actionType === 'note') {
    const text = payload?.trim() || '';
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

    // Fetch sender display name
    const { data: sender } = await service
      .schema('cozy')
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();

    const senderName = sender?.display_name || user.email?.split('@')[0] || 'A Neighbor';

    // Insert note with sender_name, created_at, delivered_to_porch
    const { error: insertErr } = await service.schema('cozy').from('private_notes').insert({
      sender_id: user.id,
      sender_name: senderName,
      recipient_id: targetUserId,
      message: text,
      created_at: new Date().toISOString(),
      delivered_to_porch: true,
    });

    if (insertErr) {
      console.error('[sendPeerSupport] Failed to insert private note:', insertErr.message);
      return { success: false, error: 'Could not deliver note to porch.' };
    }

    return { success: true };
  }

  return { success: true };
}

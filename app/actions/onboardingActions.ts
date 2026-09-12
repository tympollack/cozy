'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';
import { recordPointTransaction } from '@/app/actions/ledgerActions';

export interface SandboxBonusResult {
  success: boolean;
  pointsAwarded: number;
  newBalance?: number;
  guestMode?: boolean;
  error?: string;
}

export interface SaveFocusNookResult {
  success: boolean;
  nook?: string;
  error?: string;
}

/**
 * Awards 50 starter points when a user completes their first corner in the sandbox.
 * Safely handles both authenticated users (persisting to DB & ledger) and guest onboarding.
 */
export async function awardStarterSandboxBonusAction(): Promise<SandboxBonusResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const BONUS_POINTS = 50;

  if (!user) {
    // Guest onboarding mode: client-side store manages balance until login
    return {
      success: true,
      pointsAwarded: BONUS_POINTS,
      guestMode: true,
    };
  }

  const service = createServiceClient();
  try {
    // Fetch current points
    const { data: userData, error: userError } = await service
      .schema('cozy')
      .from('users')
      .select('points')
      .eq('id', user.id)
      .maybeSingle();

    if (userError) {
      console.warn('[awardStarterSandboxBonusAction] Fetch user points warning:', userError.message);
    }

    const currentPoints = userData?.points ?? 0;
    const newBalance = currentPoints + BONUS_POINTS;

    // Update user balance
    const { error: updateError } = await service
      .schema('cozy')
      .from('users')
      .update({ points: newBalance })
      .eq('id', user.id);

    if (updateError) {
      console.warn('[awardStarterSandboxBonusAction] Update points warning:', updateError.message);
    }

    // Record immutable audit transaction
    await recordPointTransaction({
      userId: user.id,
      amount: BONUS_POINTS,
      transactionType: 'onboarding_sandbox',
      description: 'First corner sandbox starter bonus (+50 pts)',
    });

    return {
      success: true,
      pointsAwarded: BONUS_POINTS,
      newBalance,
      guestMode: false,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record sandbox bonus.';
    console.error('[awardStarterSandboxBonusAction] Error:', message);
    // Still return success with pointsAwarded so user UX is not blocked
    return {
      success: true,
      pointsAwarded: BONUS_POINTS,
      guestMode: false,
    };
  }
}

/**
 * Persists the user's chosen single corner focus nook (e.g. 'desk', 'bedside', 'reading_chair').
 */
export async function saveUserFocusNookAction(nook: string): Promise<SaveFocusNookResult> {
  if (!nook || typeof nook !== 'string') {
    return { success: false, error: 'Invalid corner nook.' };
  }

  const cleanNook = nook.trim().toLowerCase();
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: true, nook: cleanNook };
  }

  const service = createServiceClient();
  try {
    const { data: userData } = await service
      .schema('cozy')
      .from('users')
      .select('hub_preferences')
      .eq('id', user.id)
      .maybeSingle();

    const existingPrefs = (userData?.hub_preferences || {}) as Record<string, unknown>;
    const updatedPrefs = {
      ...existingPrefs,
      focusNook: cleanNook,
    };

    await service
      .schema('cozy')
      .from('users')
      .update({ hub_preferences: updatedPrefs })
      .eq('id', user.id);

    return { success: true, nook: cleanNook };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save focus nook.';
    return { success: false, error: message };
  }
}

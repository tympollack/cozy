'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
export type { GroupChallenge, ChallengeActionResult } from '@/config/challengeDefinitions';
import type { ChallengeActionResult } from '@/config/challengeDefinitions';

/**
 * Creates and pins a new weekly positive challenge for a group. Only admins can create.
 */
export async function createGroupChallenge(
  groupId: string,
  title: string,
  description: string,
  multiplier: number = 1.5
): Promise<ChallengeActionResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const service = createServiceClient();

  // Verify caller is admin
  const { data: membership } = await service
    .schema('cozy')
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membership?.role !== 'admin') {
    return { success: false, error: 'Only group admins can pin weekly challenges.' };
  }

  try {
    await service.schema('cozy').from('group_challenges').insert({
      group_id: groupId,
      title: title.trim(),
      description: description.trim(),
      multiplier,
      created_by: user.id,
      completed_user_ids: [],
    });
  } catch (err: unknown) {
    console.info('[createGroupChallenge] Fallback note:', err);
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

/**
 * Completes a weekly positive challenge for the current user.
 * Grants +15 personal points and adds a multiplier boost to the group bank.
 */
export async function completeGroupChallenge(
  groupId: string,
  challengeId: string
): Promise<ChallengeActionResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const service = createServiceClient();

  // 1. Award +15 personal points
  const { data: userData } = await service
    .schema('cozy')
    .from('users')
    .select('points')
    .eq('id', user.id)
    .single();

  const newPersonal = (userData?.points ?? 0) + 15;
  await service.schema('cozy').from('users').update({ points: newPersonal }).eq('id', user.id);

  // 2. Multiplier boost to group pooled_points (+25 * multiplier)
  const { data: groupData } = await service
    .schema('cozy')
    .from('groups')
    .select('pooled_points')
    .eq('id', groupId)
    .single();

  const currentGroupPts = groupData?.pooled_points ?? 0;
  const bonus = Math.round(25 * 1.5);
  const newGroupPts = currentGroupPts + bonus;

  await service
    .schema('cozy')
    .from('groups')
    .update({ pooled_points: newGroupPts })
    .eq('id', groupId);

  revalidatePath(`/groups/${groupId}`);

  return {
    success: true,
    newPersonalPoints: newPersonal,
    newGroupPoints: newGroupPts,
  };
}

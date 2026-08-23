import { createServiceClient } from '@/lib/supabase';

/**
 * Automatically duplicates/mirrors points earned by a user into all active groups they belong to.
 * Personal and group points are separate pools: personal points are kept by the user,
 * and the exact same amount of points is simultaneously credited to each of their active group treasuries.
 *
 * @param userId - The user ID who earned the points
 * @param points - The number of points awarded
 */
export async function cascadePointsToUserGroups(userId: string, points: number): Promise<number> {
  if (!userId || points <= 0) return 0;

  try {
    const service = createServiceClient();

    // 1. Fetch all groups this user belongs to
    const { data: memberships, error: memberError } = await service
      .schema('cozy')
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (memberError || !memberships || memberships.length === 0) {
      return 0;
    }

    const groupIds = memberships.map((m) => m.group_id);

    // 2. Mirror points to all groups
    let updatedCount = 0;
    for (const groupId of groupIds) {
      const { data: group } = await service
        .schema('cozy')
        .from('groups')
        .select('pooled_points')
        .eq('id', groupId)
        .single();

      if (group) {
        const newPooled = (group.pooled_points ?? 0) + points;
        await service
          .schema('cozy')
          .from('groups')
          .update({ pooled_points: newPooled })
          .eq('id', groupId);
        updatedCount++;
      }
    }

    return updatedCount;
  } catch (err) {
    console.error('[cascadePointsToUserGroups] Failed to cascade points to groups:', err);
    return 0;
  }
}

/**
 * Awards personal points to a user AND automatically duplicates those points into all of their groups.
 *
 * @param userId - The user ID
 * @param points - Points to award
 * @returns The user's new personal point balance
 */
export async function awardAndCascadePoints(userId: string, points: number): Promise<number> {
  if (!userId || points <= 0) return 0;

  const service = createServiceClient();

  // 1. Award personal points
  const { data: userData } = await service
    .schema('cozy')
    .from('users')
    .select('points')
    .eq('id', userId)
    .single();

  const newPersonalPoints = (userData?.points ?? 0) + points;

  await service
    .schema('cozy')
    .from('users')
    .update({ points: newPersonalPoints, updated_at: new Date().toISOString() })
    .eq('id', userId);

  // 2. Cascade / mirror to all groups
  await cascadePointsToUserGroups(userId, points);

  return newPersonalPoints;
}

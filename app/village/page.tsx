import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import { getMyGroups, getGroupWithMembers } from '@/app/actions/groupActions';
import { VillageClient } from './VillageClient';

export const metadata: Metadata = {
  title: 'Village & Dollhouse — Cozy',
  description: 'Explore the 2.5D isometric village macro-plot and cozy dollhouse interiors.',
};

export default async function VillagePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/village');
  }

  const myGroups = await getMyGroups();
  let initialGroup = null;
  if (myGroups.length > 0) {
    initialGroup = await getGroupWithMembers(myGroups[0].group.id);
  }

  return (
    <VillageClient
      currentUserId={user.id}
      initialGroup={initialGroup}
      userGroups={myGroups.map((g) => ({ id: g.group.id, name: g.group.name }))}
    />
  );
}

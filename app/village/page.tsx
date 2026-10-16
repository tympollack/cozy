import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import { getMyGroups, getGroupWithMembers } from '@/app/actions/groupActions';
import { VillageClient } from './VillageClient';

export const metadata: Metadata = {
  title: 'Village & Dollhouse — Cozy',
  description: 'Explore the 2.5D isometric village macro-plot and cozy dollhouse interiors.',
};

interface VillagePageProps {
  searchParams?: Promise<{ groupId?: string }>;
}

export default async function VillagePage({ searchParams }: VillagePageProps) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/village');
  }

  const myGroups = await getMyGroups();
  const params = searchParams ? await searchParams : {};
  const requestedGroupId = params?.groupId;

  let selectedGroupEntry = myGroups[0] ?? null;
  if (requestedGroupId) {
    const found = myGroups.find((g) => g.group.id === requestedGroupId);
    if (found) {
      selectedGroupEntry = found;
    }
  }

  let initialGroup = null;
  if (selectedGroupEntry) {
    initialGroup = await getGroupWithMembers(selectedGroupEntry.group.id);
  }

  return (
    <VillageClient
      currentUserId={user.id}
      initialGroup={initialGroup}
      userGroups={myGroups.map((g) => ({ id: g.group.id, name: g.group.name }))}
    />
  );
}

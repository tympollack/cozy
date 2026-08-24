import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import { getMyGroups } from '@/app/actions/groupActions';
import { GroupsHubClient } from './GroupsHubClient';
import { Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'My Groups — Cozy',
  description: 'Manage your Cozy peer groups — households, villages, cities, and orbital collectives.',
};

export default async function GroupsHubPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const myGroups = await getMyGroups();

  return (
    <div className="cozy-page-bg px-4 py-8 pb-24">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-800 text-[--cozy-bark] flex items-center gap-2">
              <Users className="text-[--cozy-rust]" size={24} />
              My Groups
            </h1>
            <p className="text-sm text-[--cozy-muted] mt-1">
              {myGroups.length === 0
                ? 'No groups yet — it takes a village to stay cozy.'
                : `You belong to ${myGroups.length} group${myGroups.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Client shell handles all interactivity */}
        <GroupsHubClient initialGroups={myGroups} />
      </div>
    </div>
  );
}

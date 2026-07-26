import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import { getGroupWithMembers } from '@/app/actions/groupActions';
import { GroupDetailClient } from '@/components/GroupDetailClient';

interface GroupPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Group — Cozy`,
    description: `Explore your Cozy peer group and pooled point economy.`,
  };
}

export default async function GroupViewPage({ params }: GroupPageProps) {
  const { id } = await params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const result = await getGroupWithMembers(id);

  if (!result) {
    notFound();
  }

  const { group, members, currentUserRole, memberCount } = result;

  // Non-members cannot view the group
  if (!currentUserRole) {
    notFound();
  }

  return (
    <GroupDetailClient
      group={group}
      members={members}
      currentUserRole={currentUserRole}
      memberCount={memberCount}
      currentUserId={user.id}
    />
  );
}

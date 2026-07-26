import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import { getGroupWithMembers } from '@/app/actions/groupActions';
import { GroupDetailClient } from '@/components/GroupDetailClient';
import { GROUP_TYPE_META } from '@/config/groupDefinitions';

interface GroupPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getGroupWithMembers(id);

  const groupName = result?.group?.name || 'Cozy Group';
  const groupType = result?.group?.type || 'household';
  const meta = GROUP_TYPE_META[groupType] ?? GROUP_TYPE_META['household'];

  const title = `Join ${groupName} ${meta.emoji} on Cozy`;
  const description = `Connect, share living spaces, and pool points together in ${groupName}.`;
  const ogImageUrl = `/api/og?title=${encodeURIComponent(groupName)}&subtitle=${encodeURIComponent(`${meta.label} · ${result?.memberCount ?? 1} members pooling points`)}&emoji=${encodeURIComponent(meta.emoji)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'Cozy App',
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${groupName} on Cozy`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
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

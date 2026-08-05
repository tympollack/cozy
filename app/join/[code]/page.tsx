import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase';
import { InviteCard, type InviteGroupInfo } from '@/components/InviteCard';
import { GROUP_TYPE_META } from '@/config/groupDefinitions';

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: JoinPageProps): Promise<Metadata> {
  const { code } = await params;
  
  const service = createServiceClient();
  const { data: group } = await service
    .schema('cozy')
    .from('groups')
    .select('name, type')
    .eq('invite_code', code.trim().toLowerCase())
    .maybeSingle();

  const groupName = group?.name || 'Camp Sanctuary';
  const title = `Join ${groupName} on Cozy`;
  const description = `You have been invited to join ${groupName}. Looking out for each other and building our cozy sanctuary.`;
  const ogImageUrl = `/api/og?title=${encodeURIComponent(`Join ${groupName}`)}&subtitle=${encodeURIComponent('Looking out for each other. Building our cozy sanctuary.')}&emoji=${encodeURIComponent('🏕️')}`;

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
          alt: `Join ${groupName} on Cozy`,
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

export default async function JoinCampPage({ params }: JoinPageProps) {
  const { code } = await params;

  const service = createServiceClient();
  const { data: group } = await service
    .schema('cozy')
    .from('groups')
    .select('id, name, type, max_members, invite_code')
    .eq('invite_code', code.trim().toLowerCase())
    .maybeSingle();

  // Fetch member count
  let memberCount = 1;
  if (group) {
    const { count } = await service
      .schema('cozy')
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id);
    memberCount = count || 1;
  }

  const groupInfo: InviteGroupInfo = {
    id: group?.id || 'demo-group',
    name: group?.name || 'Cozy Camp',
    motto: 'Looking out for each other. Building our cozy sanctuary.',
    inviteCode: code,
    memberCount: memberCount,
    maxMembers: group?.max_members || 10,
    members: [
      { initial: 'M', displayName: 'Maya' },
      { initial: 'L', displayName: 'Leo' },
      { initial: 'K', displayName: 'Kai' },
    ],
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-950">
      <InviteCard group={groupInfo} />
    </div>
  );
}

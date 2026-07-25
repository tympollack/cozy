import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase';
import { getGroupWithMembers } from '@/app/actions/groupActions';
import { GROUP_TYPE_META } from '@/config/groupDefinitions';
import { GroupMapView } from '@/components/GroupMapView';
import { GroupBank } from '@/components/GroupBank';
import { ChevronLeft, Shield, Crown } from 'lucide-react';

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

  const meta = GROUP_TYPE_META[group.type] ?? GROUP_TYPE_META['household'];
  const isFuturistic = meta.palette === 'futuristic';

  const bgStyle = isFuturistic
    ? 'linear-gradient(160deg, #050810 0%, #080f1e 50%, #060c18 100%)'
    : 'linear-gradient(160deg, #faf7f2 0%, #f5ede0 60%, #ede0cc 100%)';

  const textPrimary = isFuturistic ? '#e0f4ff' : '#1a1410';
  const textSecondary = isFuturistic ? '#60a0bc' : '#8a7060';
  const accentColor = isFuturistic ? '#00dcff' : '#f0c060';

  // Sort members: admins first, then by points desc
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (b.role === 'admin' && a.role !== 'admin') return 1;
    return b.points - a.points;
  });

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: bgStyle }}
    >
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Back link */}
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 text-sm font-600 transition-opacity hover:opacity-70"
          style={{ color: textSecondary }}
        >
          <ChevronLeft size={16} />
          All Groups
        </Link>

        {/* Group header */}
        <div className="space-y-1">
          <div className="flex items-start gap-3">
            <span className="text-4xl mt-0.5">{meta.emoji}</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-800 leading-tight" style={{ color: textPrimary }}>
                {group.name}
              </h1>
              <p className="text-sm font-500 mt-0.5" style={{ color: textSecondary }}>
                {meta.label} · {memberCount} / {group.max_members} members
              </p>
            </div>
            {currentUserRole === 'admin' && (
              <span
                className="flex-shrink-0 flex items-center gap-1 text-[11px] font-700 px-2.5 py-1 rounded-full mt-1"
                style={{
                  background: isFuturistic ? 'rgba(168,85,247,0.18)' : 'rgba(240,192,96,0.18)',
                  color: isFuturistic ? '#c084fc' : '#c4704a',
                  border: isFuturistic ? '1px solid rgba(168,85,247,0.35)' : '1px solid rgba(240,192,96,0.45)',
                }}
              >
                <Crown size={11} />
                Admin
              </span>
            )}
          </div>

          {/* Invite code strip */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-700 mt-1"
            style={{
              background: isFuturistic ? 'rgba(0,220,255,0.06)' : 'rgba(0,0,0,0.05)',
              border: isFuturistic ? '1px solid rgba(0,220,255,0.15)' : '1px solid rgba(0,0,0,0.08)',
              color: textSecondary,
            }}
          >
            <Shield size={12} />
            Invite Code:
            <span
              className="font-800 tracking-widest"
              style={{ color: accentColor }}
            >
              {group.invite_code}
            </span>
          </div>
        </div>

        {/* 2.5D Isometric Map */}
        <GroupMapView group={group} members={sortedMembers} />

        {/* Group Bank */}
        <GroupBank
          group={group}
          currentUserRole={currentUserRole}
          memberCount={memberCount}
        />

        {/* Members roster */}
        <div className="space-y-3">
          <h2 className="text-sm font-800" style={{ color: textSecondary }}>
            Members ({memberCount})
          </h2>
          <div className="space-y-2">
            {sortedMembers.map((member, i) => (
              <div
                key={member.user_id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: isFuturistic ? 'rgba(255,255,255,0.03)' : 'rgba(250,247,242,0.65)',
                  border: isFuturistic ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(232,168,124,0.18)',
                }}
              >
                {/* Avatar */}
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatar_url}
                    alt={member.display_name}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2"
                    style={{ borderColor: isFuturistic ? '#00dcff' : '#e8a87c' }}
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-800 flex-shrink-0 border-2"
                    style={{
                      background: isFuturistic
                        ? 'linear-gradient(135deg, #1e1060, #0d3060)'
                        : 'linear-gradient(135deg, #c4704a, #e8a87c)',
                      borderColor: isFuturistic ? '#00dcff' : '#e8a87c',
                      color: isFuturistic ? '#00dcff' : '#faf7f2',
                    }}
                  >
                    {member.display_name.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/${member.display_name}`}
                      className="text-sm font-700 truncate hover:underline"
                      style={{ color: textPrimary }}
                    >
                      {member.display_name}
                    </Link>
                    {member.role === 'admin' && (
                      <Crown size={11} style={{ color: accentColor, flexShrink: 0 }} />
                    )}
                  </div>
                  <p className="text-xs font-500" style={{ color: textSecondary }}>
                    {member.points.toLocaleString()} personal pts
                  </p>
                </div>

                <span
                  className="text-[10px] font-600 px-2 py-0.5 rounded-full"
                  style={{
                    background: isFuturistic ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    color: textSecondary,
                  }}
                >
                  #{i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase';
import { getGroupWithMembers, getMyGroups } from '@/app/actions/groupActions';
import { getActiveGroupChallenge } from '@/app/actions/challengeActions';
import { GroupDetailClient } from '@/components/GroupDetailClient';
import { JoinGroupInline } from '@/components/JoinGroupInline';
import { GROUP_TYPE_META } from '@/config/groupDefinitions';
import { Users, Home, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';

interface GroupPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getGroupWithMembers(id);

  if (!result || !result.currentUserRole) {
    return {
      title: 'Cozy Group — Cozy',
      description: 'Connect, share living spaces, and pool points together on Cozy.',
    };
  }

  const groupName = result.group.name || 'Cozy Group';
  const groupType = result.group.type || 'household';
  const meta = GROUP_TYPE_META[groupType] ?? GROUP_TYPE_META['household'];

  const title = `${groupName} ${meta.emoji} — Cozy`;
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

  const [result, activeChallenge, myGroups] = await Promise.all([
    getGroupWithMembers(id),
    getActiveGroupChallenge(id),
    getMyGroups(),
  ]);

  // ── Graceful Fallback: Group Not Found or Stale State ─────────────
  if (!result || !result.group) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 text-center overflow-hidden relative pb-24"
        style={{
          background: 'linear-gradient(160deg, #faf7f2 0%, #f5ede0 60%, #ede0cc 100%)',
        }}
      >
        <div className="relative z-10 w-full max-w-md p-8 rounded-3xl cozy-glass border border-[--cozy-amber]/30 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-zinc-800 flex items-center justify-center text-3xl mx-auto shadow-inner border border-amber-300/40">
            🏘️
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-800 tracking-wider text-amber-950 bg-amber-400/70 border border-amber-500/30 uppercase">
              <AlertCircle size={12} />
              <span>Group Out of Sync</span>
            </div>
            <h1 className="text-xl font-800 text-[--cozy-bark] leading-tight">
              Group Unavailable
            </h1>
            <p className="text-xs text-[--cozy-muted] max-w-xs mx-auto leading-relaxed">
              This group may have been removed, reconfigured, or your local group list was displaying a previous state.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Link
              href="/groups"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-800 text-white shadow-md transition-all hover:scale-[1.02] active:scale-95"
              style={{
                background: 'linear-gradient(135deg, var(--cozy-rust), var(--cozy-amber))',
              }}
            >
              <Users size={15} />
              <span>Return to My Groups</span>
            </Link>

            <Link
              href="/feed"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-700 text-[--cozy-bark] bg-white/70 hover:bg-white border border-[--cozy-amber]/30 transition-all shadow-sm"
            >
              <Home size={14} className="text-[--cozy-rust]" />
              <span>Back to Community Feed</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { group, members, currentUserRole, memberCount } = result;

  // ── Graceful Fallback: Not a Member ──────────────────────────────
  if (!currentUserRole) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 text-center overflow-hidden relative pb-24"
        style={{
          background: 'linear-gradient(160deg, #faf7f2 0%, #f5ede0 60%, #ede0cc 100%)',
        }}
      >
        <div className="relative z-10 w-full max-w-md p-8 rounded-3xl cozy-glass border border-[--cozy-amber]/30 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-zinc-800 flex items-center justify-center text-3xl mx-auto shadow-inner border border-amber-300/40">
            🔒
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-800 tracking-wider text-amber-950 bg-amber-400/70 border border-amber-500/30 uppercase">
              <Sparkles size={12} />
              <span>Private Group</span>
            </div>
            <h1 className="text-xl font-800 text-[--cozy-bark] leading-tight">
              Membership Required
            </h1>
            <p className="text-xs text-[--cozy-muted] max-w-xs mx-auto leading-relaxed">
              This space is private to its members. If you have an invite code from the admin, enter it below to join.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <JoinGroupInline />

            <Link
              href="/groups"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-700 text-[--cozy-bark] bg-white/70 hover:bg-white border border-[--cozy-amber]/30 transition-all shadow-sm"
            >
              <ArrowLeft size={14} className="text-[--cozy-rust]" />
              <span>Back to My Groups</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GroupDetailClient
      group={group}
      members={members ?? []}
      currentUserRole={currentUserRole}
      memberCount={memberCount ?? members?.length ?? 0}
      currentUserId={user.id}
      activeChallenge={activeChallenge}
      myGroups={myGroups}
      initialMapTheme={result.mapTheme}
    />
  );
}

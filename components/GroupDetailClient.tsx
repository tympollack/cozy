'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import type { GroupRow, GroupMemberRow, MyGroupEntry } from '@/app/actions/groupActions';
import type { GroupChallenge } from '@/lib/challengeDefaults';
import { GROUP_TYPE_META } from '@/config/groupDefinitions';
import { GroupMapView } from '@/components/GroupMapView';
import { GroupBank } from '@/components/GroupBank';
import { CommunityBulletinBoard } from '@/components/CommunityBulletinBoard';
import { PeerSupportDrawer } from '@/components/PeerSupportDrawer';
import { InviteCodePill } from '@/components/InviteCodePill';
import { AdminGroupModal } from '@/components/AdminGroupModal';

interface GroupDetailClientProps {
  group: GroupRow;
  members: GroupMemberRow[];
  currentUserRole: 'admin' | 'member' | null;
  memberCount: number;
  currentUserId: string;
  activeChallenge?: GroupChallenge | null;
  myGroups?: MyGroupEntry[];
}

export function GroupDetailClient({
  group,
  members = [],
  currentUserRole,
  memberCount,
  currentUserId,
  activeChallenge = null,
  myGroups = [],
}: GroupDetailClientProps) {
  const router = useRouter();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<{ id: string; name: string } | null>(null);

  const safeGroup = group || {
    id: '',
    name: 'Cozy Group',
    type: 'household',
    min_members: 1,
    max_members: 10,
    pooled_points: 0,
    theme_id: 'default_dollhouse',
    invite_code: '',
    created_at: new Date().toISOString(),
  };

  const safeMembers = Array.isArray(members) ? members : [];
  const safeCount = memberCount ?? safeMembers.length ?? 1;

  const meta = GROUP_TYPE_META[safeGroup.type] ?? GROUP_TYPE_META['household'];
  const isFuturistic = meta.palette === 'futuristic';

  const bgStyle = isFuturistic
    ? 'linear-gradient(160deg, #050810 0%, #080f1e 50%, #060c18 100%)'
    : 'var(--cozy-bg-gradient)';

  const textPrimary = isFuturistic ? '#e0f4ff' : 'var(--cozy-text-primary)';
  const textSecondary = isFuturistic ? '#60a0bc' : 'var(--cozy-text-muted)';
  const accentColor = isFuturistic ? '#00dcff' : 'var(--cozy-amber)';

  // Sort members: admins first, then by points desc
  const sortedMembers = [...safeMembers].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (b.role === 'admin' && a.role !== 'admin') return 1;
    return (b.points || 0) - (a.points || 0);
  });

  // Group Switcher calculations
  const safeMyGroups = Array.isArray(myGroups) ? myGroups : [];
  const currentGroupIndex = safeMyGroups.findIndex((g) => g.group.id === safeGroup.id);
  const hasMultipleGroups = safeMyGroups.length > 1;

  const prevGroup = hasMultipleGroups && currentGroupIndex !== -1
    ? safeMyGroups[(currentGroupIndex - 1 + safeMyGroups.length) % safeMyGroups.length].group
    : null;
  const nextGroup = hasMultipleGroups && currentGroupIndex !== -1
    ? safeMyGroups[(currentGroupIndex + 1) % safeMyGroups.length].group
    : null;

  // Keyboard navigation for jumping to previous/next group with arrow keys
  useEffect(() => {
    if (!hasMultipleGroups) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowLeft' && prevGroup) {
        router.push(`/groups/${prevGroup.id}`);
      } else if (e.key === 'ArrowRight' && nextGroup) {
        router.push(`/groups/${nextGroup.id}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasMultipleGroups, prevGroup, nextGroup, router]);

  return (
    <div
      className="flex-1 w-full overflow-y-auto min-h-full pb-28"
      style={{ background: bgStyle }}
    >
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Top Navigation Row: Back Link & Group Switcher */}
        <div className="flex items-center justify-between">
          <Link
            href="/groups"
            className="inline-flex items-center gap-1.5 text-sm font-700 transition-opacity hover:opacity-80"
            style={{ color: textSecondary }}
          >
            <ChevronLeft size={16} />
            <span>All Groups</span>
          </Link>

          {/* Previous / Next Group Switcher */}
          {hasMultipleGroups && prevGroup && nextGroup && (
            <div className="flex items-center gap-1 bg-white/85 dark:bg-[#1a1410]/90 backdrop-blur-md px-2 py-1 rounded-full border border-amber-900/15 dark:border-amber-500/25 shadow-xs">
              <Link
                href={`/groups/${prevGroup.id}`}
                className="w-7 h-7 rounded-full flex items-center justify-center text-stone-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-[#281e19] transition-colors"
                title={`Previous Group: ${prevGroup.name} (←)`}
                aria-label="Previous group"
              >
                <ChevronLeft size={16} />
              </Link>
              <span className="text-[11px] font-800 px-1 text-stone-700 dark:text-amber-300">
                {currentGroupIndex + 1} / {safeMyGroups.length}
              </span>
              <Link
                href={`/groups/${nextGroup.id}`}
                className="w-7 h-7 rounded-full flex items-center justify-center text-stone-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-[#281e19] transition-colors"
                title={`Next Group: ${nextGroup.name} (→)`}
                aria-label="Next group"
              >
                <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>

        {/* Group header */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="text-4xl mt-0.5">{meta.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-800 leading-tight" style={{ color: textPrimary }}>
                  {safeGroup.name}
                </h1>
                {/* Fast Next/Prev Chevrons right next to Title */}
                {hasMultipleGroups && prevGroup && nextGroup && (
                  <div className="flex items-center gap-0.5 opacity-75 hover:opacity-100">
                    <Link
                      href={`/groups/${prevGroup.id}`}
                      className="p-1 rounded-lg hover:bg-amber-500/15 transition-colors"
                      title={`Previous: ${prevGroup.name}`}
                    >
                      <ChevronLeft size={18} style={{ color: accentColor }} />
                    </Link>
                    <Link
                      href={`/groups/${nextGroup.id}`}
                      className="p-1 rounded-lg hover:bg-amber-500/15 transition-colors"
                      title={`Next: ${nextGroup.name}`}
                    >
                      <ChevronRight size={18} style={{ color: accentColor }} />
                    </Link>
                  </div>
                )}
              </div>
              <p className="text-sm font-500 mt-0.5" style={{ color: textSecondary }}>
                {meta.label} · {safeCount} / {safeGroup.max_members} members
              </p>
            </div>

            {/* Admin Badge — Click to manage group */}
            {currentUserRole === 'admin' && (
              <button
                onClick={() => setShowAdminModal(true)}
                className="flex-shrink-0 flex items-center gap-1.5 text-xs font-800 px-3 py-1.5 rounded-2xl mt-1 transition-all hover:scale-105 active:scale-95 shadow-md border cursor-pointer"
                style={{
                  background: isFuturistic ? 'rgba(168,85,247,0.22)' : 'rgba(240,192,96,0.25)',
                  color: isFuturistic ? '#e9d5ff' : '#9a441e',
                  borderColor: isFuturistic ? 'rgba(168,85,247,0.45)' : 'rgba(240,192,96,0.60)',
                }}
                title="Manage Group Options & Members"
              >
                <Crown size={13} className="text-amber-500" />
                <span>Admin</span>
              </button>
            )}
          </div>

          {/* Interactive Invite Code Pill */}
          <div className="pt-1">
            <InviteCodePill
              code={safeGroup.invite_code}
              groupName={safeGroup.name}
              isFuturistic={isFuturistic}
              accentColor={accentColor}
              textColor={textSecondary}
            />
          </div>
        </div>

        {/* 2.5D Isometric Map with Atmospheric Vibe Check */}
        <GroupMapView
          group={safeGroup}
          members={sortedMembers}
          onSelectPeer={(id, name) => setSelectedPeer({ id, name })}
          activeChallenge={activeChallenge}
        />

        {/* Community Bulletin Board for Weekly Challenges */}
        <CommunityBulletinBoard
          groupId={safeGroup.id}
          isFuturistic={isFuturistic}
          isAdmin={currentUserRole === 'admin'}
        />

        {/* Group Bank */}
        <GroupBank
          group={safeGroup}
          currentUserRole={currentUserRole}
          memberCount={safeCount}
        />

        {/* Members roster */}
        <div className="space-y-3">
          <h2 className="text-sm font-800" style={{ color: textSecondary }}>
            Members ({safeCount})
          </h2>
          <div className="space-y-2">
            {sortedMembers.map((member, i) => {
              const memberName = member.display_name || 'Cozy Neighbor';
              const memberPoints = Number(member.points) || 0;

              return (
                <div
                  key={member.user_id}
                  onClick={() => setSelectedPeer({ id: member.user_id, name: memberName })}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer hover:brightness-95 transition-all"
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
                      alt={memberName}
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
                      {memberName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-sm font-700 truncate"
                        style={{ color: textPrimary }}
                      >
                        {memberName}
                      </span>
                      {member.role === 'admin' && (
                        <Crown size={11} style={{ color: accentColor, flexShrink: 0 }} />
                      )}
                    </div>
                    <p className="text-xs font-500" style={{ color: textSecondary }}>
                      {memberPoints.toLocaleString()} personal pts · Tap to send cheer
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
              );
            })}
          </div>
        </div>

        {/* Peer Support Drawer */}
        {selectedPeer && (
          <PeerSupportDrawer
            recipientId={selectedPeer.id}
            recipientName={selectedPeer.name}
            isOpen={!!selectedPeer}
            onClose={() => setSelectedPeer(null)}
          />
        )}

        {/* Admin Management Modal */}
        {showAdminModal && (
          <AdminGroupModal
            group={group}
            members={sortedMembers}
            currentUserId={currentUserId}
            onClose={() => setShowAdminModal(false)}
          />
        )}
      </div>
    </div>
  );
}

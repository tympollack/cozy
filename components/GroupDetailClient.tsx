'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import type { GroupRow, GroupMemberRow, MyGroupEntry } from '@/app/actions/groupActions';
import { getGroupPageBundle } from '@/app/actions/groupActions';
import type { GroupChallenge } from '@/lib/challengeDefaults';
import type { VillageMapTheme } from '@/config/villageMapThemes';
import { GROUP_TYPE_META } from '@/config/groupDefinitions';
import { GroupMapView } from '@/components/GroupMapView';
import { GroupBank } from '@/components/GroupBank';
import { CommunityBulletinBoard } from '@/components/CommunityBulletinBoard';
import { PeerSupportSheet } from '@/components/PeerSupportSheet';
import { InviteCodePill } from '@/components/InviteCodePill';
import { AdminGroupModal } from '@/components/AdminGroupModal';

interface GroupBundleData {
  group: GroupRow;
  members: GroupMemberRow[];
  currentUserRole: 'admin' | 'member' | null;
  memberCount: number;
  activeChallenge: GroupChallenge | null;
  cachedAt: number;
  mapTheme?: VillageMapTheme;
}

// Module-level in-memory client cache preserved across route navigation
const groupBundleCache = new Map<string, GroupBundleData>();

import { useCozyStore } from '@/store/useCozyStore';
import { createBrowserClient } from '@/lib/supabase-browser';

interface GroupDetailClientProps {
  group: GroupRow;
  members: GroupMemberRow[];
  currentUserRole: 'admin' | 'member' | null;
  memberCount: number;
  currentUserId: string;
  activeChallenge?: GroupChallenge | null;
  myGroups?: MyGroupEntry[];
  initialMapTheme?: VillageMapTheme;
}

export function GroupDetailClient({
  group,
  members = [],
  currentUserRole,
  memberCount,
  currentUserId,
  activeChallenge = null,
  myGroups = [],
  initialMapTheme,
}: GroupDetailClientProps) {
  const router = useRouter();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<{
    id: string;
    name: string;
    vibeStatus?: 'sunshine' | 'neutral' | 'raincloud';
  } | null>(null);
  const [activeBrewTargetId, setActiveBrewTargetId] = useState<string | null>(null);
  const [inviteHighlight, setInviteHighlight] = useState(false);
  const invitePillRef = useRef<HTMLDivElement>(null);

  // Active group ID for instant client-side cycling
  const [activeGroupId, setActiveGroupId] = useState<string>(group?.id || '');
  const [prevPropGroupId, setPrevPropGroupId] = useState<string>(group?.id || '');

  const { vibeStatus: storeVibeStatus, setVibeStatus } = useCozyStore();

  // Live real-time members state
  const [liveMembers, setLiveMembers] = useState<GroupMemberRow[]>(members || []);

  useEffect(() => {
    if (members && members.length > 0) {
      setLiveMembers(members);
    }
  }, [members]);

  // Adjust state when incoming server prop changes
  if (group?.id && group.id !== prevPropGroupId) {
    setPrevPropGroupId(group.id);
    setActiveGroupId(group.id);
  }

  // Keep cache in sync when server navigation props change
  useEffect(() => {
    if (group?.id) {
      const now = Date.now();
      const existing = groupBundleCache.get(group.id);
      groupBundleCache.set(group.id, {
        group,
        members: liveMembers.length > 0 ? liveMembers : members,
        currentUserRole,
        memberCount,
        activeChallenge,
        cachedAt: existing ? existing.cachedAt : now,
      });
    }
  }, [group, members, liveMembers, currentUserRole, memberCount, activeChallenge]);

  // Supabase Realtime channel subscription for instant broadcast & postgres_changes
  useEffect(() => {
    if (!activeGroupId) return;

    const supabase = createBrowserClient();
    const groupChannelName = `cozy-group-room-${activeGroupId}`;
    const groupChannel = supabase.channel(groupChannelName);
    const globalChannel = supabase.channel('cozy-global-broadcast');

    const handleVibeBroadcast = (payload: { payload: { userId?: string; vibe_status?: 'sunshine' | 'neutral' | 'raincloud'; points?: number; shell_type?: string } }) => {
      const data = payload.payload;
      if (data?.userId) {
        setLiveMembers((prev) =>
          prev.map((m) =>
            m.user_id === data.userId
              ? {
                  ...m,
                  ...(data.vibe_status ? { vibe_status: data.vibe_status } : {}),
                  ...(data.points !== undefined ? { points: data.points } : {}),
                  ...(data.shell_type ? { shell_type: data.shell_type } : {}),
                }
              : m
          )
        );
      }
    };

    groupChannel
      .on('broadcast', { event: 'vibe_updated' }, handleVibeBroadcast)
      .on(
        'postgres_changes',
        { event: '*', schema: 'cozy', table: 'users' },
        (payload) => {
          const updatedUser = payload.new as {
            id?: string;
            vibe_status?: string;
            points?: number;
            shell_type?: string;
          };
          if (updatedUser?.id) {
            setLiveMembers((prev) =>
              prev.map((m) =>
                m.user_id === updatedUser.id
                  ? {
                      ...m,
                      ...(updatedUser.vibe_status
                        ? { vibe_status: updatedUser.vibe_status as 'sunshine' | 'neutral' | 'raincloud' }
                        : {}),
                      ...(updatedUser.points !== undefined ? { points: updatedUser.points } : {}),
                      ...(updatedUser.shell_type ? { shell_type: updatedUser.shell_type } : {}),
                    }
                  : m
              )
            );
          }
        }
      )
      .subscribe();

    globalChannel
      .on('broadcast', { event: 'vibe_updated' }, handleVibeBroadcast)
      .subscribe();

    return () => {
      supabase.removeChannel(groupChannel);
      supabase.removeChannel(globalChannel);
    };
  }, [activeGroupId]);

  // Retrieve active group data from cache (or fallback to props)
  const activeBundle = groupBundleCache.get(activeGroupId) || {
    group,
    members: liveMembers.length > 0 ? liveMembers : members,
    currentUserRole,
    memberCount,
    activeChallenge,
    cachedAt: 0,
    mapTheme: initialMapTheme,
  };

  const safeGroup = activeBundle.group || group || {
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

  const safeMembers = liveMembers.length > 0 ? liveMembers : (Array.isArray(activeBundle.members) ? activeBundle.members : []);
  const safeCount = activeBundle.memberCount ?? memberCount ?? safeMembers.length ?? 1;
  const currentRole = activeBundle.currentUserRole ?? currentUserRole;
  const currentChallenge = activeBundle.activeChallenge !== undefined ? activeBundle.activeChallenge : activeChallenge;

  const meta = GROUP_TYPE_META[safeGroup.type] ?? GROUP_TYPE_META['household'];
  const isFuturistic = meta.palette === 'futuristic';

  const bgStyle = isFuturistic
    ? 'linear-gradient(160deg, #050810 0%, #080f1e 50%, #060c18 100%)'
    : 'var(--cozy-bg-gradient)';

  const textPrimary = isFuturistic ? '#e0f4ff' : 'var(--cozy-text-primary)';
  const textSecondary = isFuturistic ? '#60a0bc' : 'var(--cozy-text-muted)';
  const accentColor = isFuturistic ? '#00dcff' : 'var(--cozy-amber)';

  // Sort members: admins first, then by points desc, dynamically reflecting store vibe
  const sortedMembers = [...safeMembers]
    .map((m) => {
      if (m.user_id === currentUserId && storeVibeStatus) {
        return { ...m, vibe_status: storeVibeStatus as 'sunshine' | 'neutral' | 'raincloud' };
      }
      return m;
    })
    .sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return (b.points || 0) - (a.points || 0);
    });

  // Group Switcher calculations
  const safeMyGroups = useMemo(() => (Array.isArray(myGroups) ? myGroups : []), [myGroups]);
  const currentGroupIndex = safeMyGroups.findIndex((g) => g.group.id === safeGroup.id);
  const hasMultipleGroups = safeMyGroups.length > 1;

  const prevGroup = hasMultipleGroups && currentGroupIndex !== -1
    ? safeMyGroups[(currentGroupIndex - 1 + safeMyGroups.length) % safeMyGroups.length].group
    : null;
  const nextGroup = hasMultipleGroups && currentGroupIndex !== -1
    ? safeMyGroups[(currentGroupIndex + 1) % safeMyGroups.length].group
    : null;

  // Instant group switch handler
  const handleSwitchGroup = useCallback((targetGroupId: string) => {
    if (!targetGroupId || targetGroupId === activeGroupId) return;

    if (groupBundleCache.has(targetGroupId)) {
      // 0ms instant switch!
      setActiveGroupId(targetGroupId);
      window.history.pushState(null, '', `/groups/${targetGroupId}`);

      // Silent background revalidation if cache is older than 30s
      const cached = groupBundleCache.get(targetGroupId);
      if (cached && Date.now() - cached.cachedAt > 30000) {
        getGroupPageBundle(targetGroupId).then((res) => {
          if (res.groupWithMembers) {
            groupBundleCache.set(targetGroupId, {
              group: res.groupWithMembers.group,
              members: res.groupWithMembers.members,
              currentUserRole: res.groupWithMembers.currentUserRole,
              memberCount: res.groupWithMembers.memberCount,
              activeChallenge: res.activeChallenge,
              cachedAt: Date.now(),
              mapTheme: res.groupWithMembers.mapTheme,
            });
            setActiveGroupId((curr) => (curr === targetGroupId ? targetGroupId : curr));
          }
        }).catch(() => {});
      }
    } else {
      // Not yet in cache — fetch quickly and transition
      getGroupPageBundle(targetGroupId)
        .then((res) => {
          if (res.groupWithMembers) {
            groupBundleCache.set(targetGroupId, {
              group: res.groupWithMembers.group,
              members: res.groupWithMembers.members,
              currentUserRole: res.groupWithMembers.currentUserRole,
              memberCount: res.groupWithMembers.memberCount,
              activeChallenge: res.activeChallenge,
              cachedAt: Date.now(),
              mapTheme: res.groupWithMembers.mapTheme,
            });
            setActiveGroupId(targetGroupId);
            window.history.pushState(null, '', `/groups/${targetGroupId}`);
          } else {
            router.push(`/groups/${targetGroupId}`);
          }
        })
        .catch(() => {
          router.push(`/groups/${targetGroupId}`);
        });
    }
  }, [activeGroupId, router]);

  // Background prefetch all other user groups on mount for instant cycling
  useEffect(() => {
    if (!safeMyGroups.length) return;

    safeMyGroups.forEach((entry) => {
      const gid = entry.group.id;
      // Router prefetch for Next.js RSC route cache
      router.prefetch(`/groups/${gid}`);

      // Preload data into client bundle cache
      if (!groupBundleCache.has(gid)) {
        getGroupPageBundle(gid).then((res) => {
          if (res.groupWithMembers) {
            groupBundleCache.set(gid, {
              group: res.groupWithMembers.group,
              members: res.groupWithMembers.members,
              currentUserRole: res.groupWithMembers.currentUserRole,
              memberCount: res.groupWithMembers.memberCount,
              activeChallenge: res.activeChallenge,
              cachedAt: Date.now(),
              mapTheme: res.groupWithMembers.mapTheme,
            });
          }
        }).catch(() => {});
      }
    });
  }, [safeMyGroups, router]);

  // Handle browser Back / Forward buttons seamlessly from cache
  useEffect(() => {
    const handlePopState = () => {
      const parts = window.location.pathname.split('/');
      const id = parts[2];
      if (id && groupBundleCache.has(id)) {
        setActiveGroupId(id);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Keyboard navigation for jumping to previous/next group with arrow keys
  useEffect(() => {
    if (!hasMultipleGroups) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowLeft' && prevGroup) {
        handleSwitchGroup(prevGroup.id);
      } else if (e.key === 'ArrowRight' && nextGroup) {
        handleSwitchGroup(nextGroup.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasMultipleGroups, prevGroup, nextGroup, handleSwitchGroup]);

  const handleOpenInvite = () => {
    setInviteHighlight(true);
    invitePillRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setInviteHighlight(false), 2500);
  };

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
                onClick={(e) => {
                  e.preventDefault();
                  handleSwitchGroup(prevGroup.id);
                }}
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
                onClick={(e) => {
                  e.preventDefault();
                  handleSwitchGroup(nextGroup.id);
                }}
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
                      onClick={(e) => {
                        e.preventDefault();
                        handleSwitchGroup(prevGroup.id);
                      }}
                      className="p-1 rounded-lg hover:bg-amber-500/15 transition-colors"
                      title={`Previous: ${prevGroup.name}`}
                    >
                      <ChevronLeft size={18} style={{ color: accentColor }} />
                    </Link>
                    <Link
                      href={`/groups/${nextGroup.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSwitchGroup(nextGroup.id);
                      }}
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
            {currentRole === 'admin' && (
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

          {/* Interactive Invite Code Pill — highlighted when a vacant plot is tapped */}
          <div
            ref={invitePillRef}
            className="pt-1 rounded-2xl transition-all duration-300"
            style={inviteHighlight ? {
              outline: `2px solid ${isFuturistic ? 'rgba(0,220,255,0.70)' : 'rgba(240,192,96,0.75)'}`,
              outlineOffset: '4px',
              boxShadow: isFuturistic ? '0 0 16px 4px rgba(0,220,255,0.30)' : '0 0 16px 4px rgba(240,192,96,0.35)',
            } : {}}
          >
            <InviteCodePill
              code={safeGroup.invite_code}
              groupName={safeGroup.name}
              isFuturistic={isFuturistic}
              accentColor={accentColor}
              textColor={textSecondary}
            />
          </div>
        </div>

        {/* Anchor-based 2.5D Group Map with Habitat Renderers & Vibe Auras */}
        <GroupMapView
          group={safeGroup}
          members={sortedMembers}
          currentUserId={currentUserId}
          mapTheme={activeBundle.mapTheme || initialMapTheme}
          onSelectPeer={(id, name) => {
            if (id === currentUserId) {
              router.push('/profile');
              return;
            }
            const member = sortedMembers.find((m) => m.user_id === id);
            setSelectedPeer({
              id,
              name,
              vibeStatus: member?.vibe_status || 'neutral',
            });
          }}
          onOpenInvite={handleOpenInvite}
          activeChallenge={currentChallenge}
          burstTargetUserId={activeBrewTargetId}
        />

        {/* Community Bulletin Board for Weekly Challenges */}
        <CommunityBulletinBoard
          groupId={safeGroup.id}
          groupPooledPoints={safeGroup.pooled_points ?? 0}
          isFuturistic={isFuturistic}
          isAdmin={currentRole === 'admin'}
        />

        {/* Group Bank */}
        <GroupBank
          group={safeGroup}
          currentUserRole={currentRole}
          memberCount={safeCount}
        />

        {/* Members roster */}
        <div className="space-y-3">
          <h2 className="text-sm font-800" style={{ color: textSecondary }}>
            Members ({safeCount})
          </h2>
          <div className="space-y-2">
            {sortedMembers.map((member, i) => {
              const isSelf = member.user_id === currentUserId;
              const memberName = isSelf ? 'You' : (member.display_name || 'Cozy Neighbor');
              const memberPoints = Number(member.points) || 0;
              const memberVibe = member.vibe_status || 'neutral';
              const vibeIcon = memberVibe === 'sunshine' ? '☀️' : memberVibe === 'raincloud' ? '🌧️' : '☕';

              return (
                <div
                  key={member.user_id}
                  onClick={() => {
                    if (isSelf) {
                      router.push('/profile');
                    } else {
                      setSelectedPeer({
                        id: member.user_id,
                        name: member.display_name || 'Cozy Neighbor',
                        vibeStatus: member.vibe_status || 'neutral',
                      });
                    }
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer hover:brightness-95 transition-all border ${
                    isFuturistic
                      ? isSelf
                        ? 'bg-cyan-500/15 border-cyan-400/50 shadow-sm'
                        : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]'
                      : isSelf
                      ? 'bg-amber-100/90 dark:bg-amber-950/70 border-amber-400 dark:border-amber-500/60 shadow-sm'
                      : 'bg-stone-100/90 dark:bg-[#1e1713]/90 border-stone-200 dark:border-stone-800/80 hover:bg-amber-50 dark:hover:bg-[#251d18]'
                  }`}
                  title={isSelf ? 'Your Space (Tap to view)' : `${memberName} (Tap to send cheer)`}
                >
                  {/* Avatar */}
                  {member.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatar_url}
                      alt={memberName}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2"
                      style={{ borderColor: isSelf ? '#f59e0b' : (isFuturistic ? '#00dcff' : '#e8a87c') }}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-800 flex-shrink-0 border-2"
                      style={{
                        background: isSelf
                          ? (isFuturistic ? 'linear-gradient(135deg, #0d3060, #00b4d8)' : 'linear-gradient(135deg, #f59e0b, #d97706)')
                          : isFuturistic
                          ? 'linear-gradient(135deg, #1e1060, #0d3060)'
                          : 'linear-gradient(135deg, #c4704a, #e8a87c)',
                        borderColor: isSelf ? '#f59e0b' : (isFuturistic ? '#00dcff' : '#e8a87c'),
                        color: isSelf ? '#ffffff' : (isFuturistic ? '#00dcff' : '#faf7f2'),
                      }}
                    >
                      {isSelf ? 'YOU' : memberName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs shrink-0" title={`Feeling ${memberVibe}`}>
                        {vibeIcon}
                      </span>
                      <span
                        className={`text-sm font-800 truncate ${
                          isFuturistic ? 'text-cyan-100' : 'text-stone-900 dark:text-stone-100'
                        }`}
                      >
                        {memberName}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] font-800 px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-900 dark:text-amber-200 border border-amber-400/60">
                          You
                        </span>
                      )}
                      {member.role === 'admin' && (
                        <Crown size={11} style={{ color: accentColor, flexShrink: 0 }} />
                      )}
                    </div>
                    <p
                      className={`text-xs font-600 ${
                        isFuturistic ? 'text-cyan-300/70' : 'text-stone-600 dark:text-amber-200/75'
                      }`}
                    >
                      {memberPoints.toLocaleString()} personal pts · {isSelf ? 'Tap to view your space' : 'Tap to send cheer'}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isFuturistic
                        ? 'bg-white/10 border-white/15 text-cyan-200'
                        : 'bg-stone-200/80 dark:bg-stone-800/80 border-stone-300/60 dark:border-stone-700 text-stone-700 dark:text-amber-200/90'
                    }`}
                  >
                    #{i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Peer Support Bottom Sheet */}
        {selectedPeer && (
          <PeerSupportSheet
            recipientId={selectedPeer.id}
            recipientName={selectedPeer.name}
            vibeStatus={selectedPeer.vibeStatus}
            isOpen={!!selectedPeer}
            onClose={() => setSelectedPeer(null)}
            onBrewSent={(targetId) => {
              setActiveBrewTargetId(targetId);
              setTimeout(() => setActiveBrewTargetId(null), 1500);
            }}
          />
        )}

        {/* Admin Management Modal */}
        {showAdminModal && (
          <AdminGroupModal
            group={safeGroup}
            members={sortedMembers}
            currentUserId={currentUserId}
            onClose={() => setShowAdminModal(false)}
          />
        )}
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import type { GroupRow, GroupMemberRow } from '@/app/actions/groupActions';
import type { GroupChallenge } from '@/lib/challengeDefaults';
import { GROUP_TYPE_META } from '@/config/groupDefinitions';
import type { VibeStatus } from '@/store/useCozyStore';
import { getThemeForGroup } from '@/config/villageMapThemes';
import { UserPlotNode } from '@/components/UserPlotNode';
import { VacantPlotNode } from '@/components/VacantPlotNode';
import type { PlotSize } from '@/components/UserPlotNode';

// ---------------------------------------------------------------------------
// Extended member type — carries vibe status & shell type from the live store
// ---------------------------------------------------------------------------

export type GroupMemberWithVibe = GroupMemberRow & {
  vibe_status?: VibeStatus;
};

// ---------------------------------------------------------------------------
// Star field — decorative background for futuristic (space) themes
// ---------------------------------------------------------------------------

function StarField() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2]">
      {Array.from({ length: 24 }).map((_, i) => {
        const size  = 1 + Math.random() * 2;
        const x     = Math.random() * 100;
        const y     = Math.random() * 100;
        const delay = Math.random() * 4;
        const dur   = 2 + Math.random() * 3;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
            animate={{ opacity: [0.1, 0.9, 0.1], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GroupMapView — main export
// ---------------------------------------------------------------------------

interface GroupMapViewProps {
  group: GroupRow;
  members: GroupMemberWithVibe[];
  onSelectPeer?: (userId: string, name: string) => void;
  onOpenInvite?: () => void;
  activeChallenge?: GroupChallenge | null;
}

export function GroupMapView({
  group,
  members = [],
  onSelectPeer,
  onOpenInvite,
  activeChallenge = null,
}: GroupMapViewProps) {
  const safeMembers = Array.isArray(members) ? members : [];
  const meta        = GROUP_TYPE_META[group?.type] ?? GROUP_TYPE_META['household'];
  const isFuturistic = meta.palette === 'futuristic';

  // Resolve background theme + anchor layout
  const theme = getThemeForGroup(group?.type ?? 'household');
  const maxAnchors = theme.anchors.length;

  // How many open invite slots to show (caps at remaining anchors)
  const rawCap         = Number(group?.max_members) || 10;
  const capacity       = Math.max(1, Math.min(rawCap, maxAnchors));
  const openInviteSlots = safeMembers.length < capacity
    ? Math.min(safeMembers.length <= 4 ? 2 : 1, capacity - safeMembers.length)
    : 0;
  const totalPlots     = Math.min(safeMembers.length + openInviteSlots, maxAnchors);
  const visibleAnchors = theme.anchors.slice(0, totalPlots);

  // Plot size token — fewer plots → larger habitats
  const plotSize: PlotSize = totalPlots <= 6 ? 'lg' : totalPlots <= 10 ? 'md' : 'sm';

  // Challenge progress
  const completedCount = activeChallenge?.completedUserIds.length ?? 0;
  const progressPct    = safeMembers.length > 0
    ? Math.min((completedCount / safeMembers.length) * 100, 100)
    : 0;

  // HUD palette tokens
  const hudBg     = isFuturistic ? 'rgba(0,20,40,0.88)'           : 'rgba(255,252,248,0.92)';
  const hudBorder = isFuturistic ? 'rgba(0,220,255,0.40)'         : 'rgba(196,112,74,0.40)';
  const hudColor  = isFuturistic ? '#00dcff'                       : '#7a4f3a';
  const progressBg = isFuturistic
    ? 'linear-gradient(90deg, #0080ff, #00dcff)'
    : 'linear-gradient(90deg, #e8a87c, #f0c060)';
  const outerBorder = isFuturistic ? 'rgba(0,220,255,0.35)' : 'rgba(217,119,54,0.40)';

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden select-none"
      style={{
        aspectRatio: '4 / 3',
        border: `2px solid ${outerBorder}`,
        boxShadow: isFuturistic
          ? '0 0 40px rgba(0,220,255,0.18), 0 20px 60px rgba(0,0,0,0.55)'
          : '0 10px 40px rgba(122,79,58,0.22)',
      }}
    >
      {/* ── Layer 0: Illustrated theme background */}
      <Image
        src={theme.backgroundImage}
        alt={theme.name}
        fill
        className="object-cover"
        priority
        sizes="(max-width: 768px) 100vw, 672px"
      />

      {/* ── Layer 1: Soft vignette to enhance plot contrast */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{ background: theme.vignetteGradient }}
      />

      {/* ── Layer 2: Star field (space/futuristic themes only) */}
      {isFuturistic && <StarField />}

      {/* ── Layer 3: HUD — density label (top-left) */}
      <div className="absolute top-3 left-4 z-20">
        <span
          className="text-xs font-black px-3 py-1 rounded-full backdrop-blur-md shadow-sm border"
          style={{ background: hudBg, color: hudColor, borderColor: hudBorder }}
        >
          {meta.emoji} {meta.label}
        </span>
      </div>

      {/* ── Layer 3: HUD — peer support hint (top-right) */}
      <div className="absolute top-3 right-4 z-20">
        <span
          className="text-xs font-black px-3 py-1 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1.5 border"
          style={{
            background: hudBg,
            color: isFuturistic ? '#c084fc' : '#c4704a',
            borderColor: isFuturistic ? 'rgba(168,85,247,0.40)' : hudBorder,
          }}
        >
          Tap 🌧️ to send cheer!
        </span>
      </div>

      {/* ── Layer 10: Anchor-mapped plot nodes */}
      {visibleAnchors.map((anchor, i) => {
        const member = safeMembers[i] ?? null;
        return (
          <motion.div
            key={member ? member.user_id : `vacant-${i}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
            style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.08, y: -4 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25, delay: i * 0.05 }}
          >
            {member ? (
              <UserPlotNode
                member={member}
                plotSize={plotSize}
                isFuturistic={isFuturistic}
                plotIndex={i}
                onSelectPeer={onSelectPeer}
              />
            ) : (
              <VacantPlotNode
                plotSize={plotSize}
                isFuturistic={isFuturistic}
                onClick={onOpenInvite}
              />
            )}
          </motion.div>
        );
      })}

      {/* ── Layer 20: Active Challenge HUD banner (bottom) */}
      {activeChallenge && (
        <div className="absolute bottom-3 inset-x-4 z-20 flex justify-center pointer-events-none">
          <div
            className="px-4 py-2 rounded-2xl backdrop-blur-md shadow-lg border flex items-center gap-3 max-w-sm w-full pointer-events-auto"
            style={{
              background: isFuturistic ? 'rgba(5,12,24,0.92)' : 'rgba(255,252,248,0.95)',
              borderColor: hudBorder,
            }}
          >
            <span className="text-base shrink-0">🏆</span>
            <div className="flex-1 min-w-0">
              <div
                className="flex items-center justify-between text-[11px] font-black"
                style={{ color: isFuturistic ? '#a0e8ff' : '#543220' }}
              >
                <span className="truncate">{activeChallenge.title}</span>
                <span className="shrink-0 ml-2 text-[10px] opacity-80 font-bold">
                  {completedCount}/{safeMembers.length} (×{activeChallenge.multiplier})
                </span>
              </div>
              <div
                className="w-full h-1.5 rounded-full overflow-hidden mt-1"
                style={{ background: isFuturistic ? 'rgba(0,220,255,0.15)' : 'rgba(217,119,54,0.15)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: progressBg }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

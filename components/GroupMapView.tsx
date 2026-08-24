'use client';

import { motion } from 'framer-motion';
import type { GroupRow, GroupMemberRow } from '@/app/actions/groupActions';
import type { GroupChallenge } from '@/lib/challengeDefaults';
import { GROUP_TYPE_META } from '@/config/groupDefinitions';
import type { VibeStatus } from '@/store/useCozyStore';

// ---------------------------------------------------------------------------
// Dynamic spatial scale config — "Neighborhood Growth"
// ---------------------------------------------------------------------------

interface ScaleConfig {
  tileW: number;    // isometric diamond pixel width
  tileH: number;    // isometric diamond pixel height
  depth: number;    // 3D side-wall depth in px
  gap: number;      // spacing multiplier applied to isoOffset (>1 = wider gaps)
  cols: number;     // grid columns
  label: string;    // density label (cosmetic)
  nameFontSize: number; // px font size for name tag
  avatarSize: number;   // px diameter for avatar/initials
  roofW: number;    // half-width of CSS roof triangle
  roofH: number;    // height of CSS roof triangle
  bodyW: number;    // house body width
  bodyH: number;    // house body height
  doorW: number;    // door width
  doorH: number;    // door height
}

function computeScaleConfig(memberCount: number): ScaleConfig {
  if (memberCount <= 4) {
    return { tileW: 120, tileH: 66, depth: 20, gap: 1.6, cols: 2,  label: 'Hamlet',      nameFontSize: 10, avatarSize: 22, roofW: 22, roofH: 16, bodyW: 42, bodyH: 30, doorW: 8,  doorH: 11 };
  }
  if (memberCount <= 9) {
    return { tileW: 104, tileH: 57, depth: 17, gap: 1.4, cols: 3,  label: 'Village',     nameFontSize: 9,  avatarSize: 19, roofW: 19, roofH: 14, bodyW: 36, bodyH: 26, doorW: 7,  doorH: 10 };
  }
  if (memberCount <= 19) {
    return { tileW: 92,  tileH: 50, depth: 14, gap: 1.25,cols: 3,  label: 'Town',        nameFontSize: 9,  avatarSize: 16, roofW: 16, roofH: 12, bodyW: 30, bodyH: 22, doorW: 6,  doorH: 8  };
  }
  if (memberCount <= 35) {
    return { tileW: 76,  tileH: 42, depth: 12, gap: 1.1, cols: 4,  label: 'City',        nameFontSize: 8,  avatarSize: 13, roofW: 13, roofH: 10, bodyW: 25, bodyH: 18, doorW: 5,  doorH: 7  };
  }
  return   { tileW: 62,  tileH: 34, depth: 10, gap: 1.0, cols: 5,  label: 'Metropolis',  nameFontSize: 7,  avatarSize: 11, roofW: 11, roofH: 8,  bodyW: 20, bodyH: 14, doorW: 4,  doorH: 6  };
}

// ---------------------------------------------------------------------------
// Isometric grid layout helpers
// ---------------------------------------------------------------------------

function isoOffset(
  col: number,
  row: number,
  tileW: number,
  tileH: number,
  gap: number = 1
): { x: number; y: number } {
  return {
    x: (col - row) * (tileW / 2) * gap,
    y: (col + row) * (tileH / 2.2) * gap,
  };
}

function buildGrid(maxPlots: number, cols: number) {
  const plots: { col: number; row: number }[] = [];
  let i = 0;
  for (let r = 0; r < Math.ceil(maxPlots / cols) + 1; r++) {
    for (let c = 0; c < cols; c++) {
      plots.push({ col: c, row: r });
      i++;
      if (i >= maxPlots) return plots;
    }
  }
  return plots;
}

// ---------------------------------------------------------------------------
// Palette definitions
// ---------------------------------------------------------------------------

const COZY_PALETTE = {
  bg: 'linear-gradient(160deg, #faf0e0 0%, #e8d5b8 50%, #c4956a 100%)',
  tileBase: 'linear-gradient(135deg, #fffcf8 0%, #f7ebd9 100%)',
  tileBorder: '#e8a87c',
  tileShadow: 'rgba(122,79,58,0.25)',
  emptyFill: 'rgba(240,192,96,0.18)',
  emptyBorder: '#f0c060',
  avatarRing: '#e8a87c',
  glowColor: 'rgba(240,192,96,0.55)',
  wallLeft: 'linear-gradient(180deg, #d89668 0%, #aa683e 100%)',
  wallRight: 'linear-gradient(180deg, #be7e52 0%, #8c4c24 100%)',
  houseRoof: '#c4704a',
  houseBody: '#faf7f2',
  houseDoor: '#7a4f3a',
  anchorBg: 'rgba(255,252,248,0.92)',
  anchorBorder: 'rgba(232,168,124,0.60)',
  anchorText: '#7a4f3a',
  anchorGlow: 'rgba(240,192,96,0.40)',
  progressBar: 'linear-gradient(90deg, #e8a87c, #f0c060)',
};

const FUTURISTIC_PALETTE = {
  bg: 'linear-gradient(160deg, #0a0a1a 0%, #0d1a2e 45%, #0a2040 100%)',
  tileBase: 'linear-gradient(135deg, #0f1d36 0%, #091326 100%)',
  tileBorder: '#00dcff',
  tileShadow: 'rgba(0,220,255,0.25)',
  emptyFill: 'rgba(0,220,255,0.08)',
  emptyBorder: '#00dcff',
  avatarRing: '#00dcff',
  glowColor: 'rgba(0,220,255,0.60)',
  wallLeft: 'linear-gradient(180deg, #081428 0%, #030814 100%)',
  wallRight: 'linear-gradient(180deg, #050e1f 0%, #02050c 100%)',
  houseRoof: '#00dcff',
  houseBody: '#0f1d36',
  houseDoor: '#00dcff',
  anchorBg: 'rgba(5,12,24,0.92)',
  anchorBorder: 'rgba(0,220,255,0.45)',
  anchorText: '#a0e8ff',
  anchorGlow: 'rgba(0,220,255,0.35)',
  progressBar: 'linear-gradient(90deg, #0080ff, #00dcff)',
};

// ---------------------------------------------------------------------------
// Extended member type
// ---------------------------------------------------------------------------

export type GroupMemberWithVibe = GroupMemberRow & {
  vibe_status?: VibeStatus;
};

// ---------------------------------------------------------------------------
// Star field (space_station)
// ---------------------------------------------------------------------------

function StarField() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => {
        const size = 1 + Math.random() * 2;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const delay = Math.random() * 4;
        const dur = 2 + Math.random() * 3;
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
// Miniature house / pod — fully proportional via ScaleConfig
// ---------------------------------------------------------------------------

function MiniHouseModel({
  palette,
  isFuturistic,
  avatarUrl,
  initials,
  isRaincloud,
  scale,
}: {
  palette: typeof COZY_PALETTE;
  isFuturistic: boolean;
  avatarUrl: string | null;
  initials: string;
  isRaincloud: boolean;
  scale: ScaleConfig;
}) {
  const { roofW, roofH, bodyW, bodyH, doorW, doorH, avatarSize } = scale;

  if (isFuturistic) {
    return (
      <div className="flex flex-col items-center" style={{ marginTop: -Math.round(scale.tileH * 0.1) }}>
        <div
          className="relative flex items-center justify-center"
          style={{
            width: bodyW + 4,
            height: bodyH,
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            background: isRaincloud ? 'linear-gradient(135deg, #334155, #1e293b)' : palette.tileBase,
            border: `1.5px solid ${isRaincloud ? '#64748b' : palette.houseRoof}`,
            boxShadow: isRaincloud ? 'none' : `0 0 10px ${palette.glowColor}`,
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="avatar"
              className="rounded-full object-cover"
              style={{
                width: avatarSize,
                height: avatarSize,
                border: `1px solid ${isRaincloud ? '#64748b' : palette.avatarRing}`,
              }}
            />
          ) : (
            <span
              className="font-800"
              style={{
                fontSize: Math.max(scale.nameFontSize - 1, 6),
                color: isRaincloud ? '#f8fafc' : palette.anchorText,
              }}
            >
              {initials}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Cozy house
  return (
    <div className="flex flex-col items-center" style={{ marginTop: -Math.round(scale.tileH * 0.08) }}>
      {/* Roof triangle */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${roofW}px solid transparent`,
          borderRight: `${roofW}px solid transparent`,
          borderBottom: `${roofH}px solid ${isRaincloud ? '#64748b' : palette.houseRoof}`,
          filter: isRaincloud ? 'none' : `drop-shadow(0 -1px 3px ${palette.glowColor})`,
        }}
      />
      {/* House body */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          width: bodyW,
          height: bodyH,
          background: isRaincloud ? '#334155' : palette.houseBody,
          border: `1px solid ${isRaincloud ? '#475569' : palette.tileBorder}`,
          borderRadius: '0 0 3px 3px',
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="avatar"
            className="rounded-full object-cover absolute"
            style={{
              width: avatarSize,
              height: avatarSize,
              top: 2,
              border: `1px solid ${isRaincloud ? '#64748b' : palette.avatarRing}`,
            }}
          />
        ) : (
          <span
            className="absolute font-800"
            style={{
              top: 2,
              fontSize: Math.max(scale.nameFontSize - 2, 6),
              color: isRaincloud ? '#94a3b8' : palette.anchorText,
            }}
          >
            {initials}
          </span>
        )}
        {/* Door */}
        <div
          className="absolute bottom-0"
          style={{
            width: doorW,
            height: doorH,
            background: isRaincloud ? '#1e293b' : palette.houseDoor,
            borderRadius: '2px 2px 0 0',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weather aura overlay
// ---------------------------------------------------------------------------

function WeatherAura({ vibe, isFuturistic }: { vibe: VibeStatus; isFuturistic: boolean }) {
  if (vibe === 'sunshine') {
    return (
      <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center">
        <motion.span
          className="text-sm absolute -top-6"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          ☀️
        </motion.span>
        <div className="vibe-sunshine-aura absolute" style={{ top: -4, width: 48, height: 48 }} />
      </div>
    );
  }

  if (vibe === 'raincloud') {
    return (
      <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center">
        <motion.span
          className="text-sm absolute -top-6"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          🌧️
        </motion.span>
        <motion.div
          className="absolute border-2 rounded-full"
          style={{ top: -2, width: 44, height: 44, borderColor: 'rgba(148,163,184,0.70)' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0.15, 0.7] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {[
          { left: '38%', duration: '0.85s', delay: '0s',   height: 10 },
          { left: '50%', duration: '1.05s', delay: '0.3s', height: 14 },
          { left: '62%', duration: '0.75s', delay: '0.6s', height: 10 },
        ].map((drip, i) => (
          <span
            key={i}
            className="rain-drip"
            style={{
              left: drip.left,
              top: '54%',
              height: drip.height,
              ['--drip-duration' as string]: drip.duration,
              ['--drip-delay' as string]: drip.delay,
            }}
          />
        ))}
      </div>
    );
  }

  // Cozy / neutral
  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center">
      <motion.span
        className="text-sm absolute -top-6"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        ☕
      </motion.span>
      {[
        { left: '44%', dur: '1.6s', delay: '0s' },
        { left: '56%', dur: '1.9s', delay: '0.5s' },
      ].map((w, i) => (
        <span
          key={i}
          className={`steam-wisp absolute w-0.5 rounded-full ${isFuturistic ? 'bg-cyan-400/50' : 'bg-[--cozy-amber]/50'}`}
          style={{
            left: w.left,
            top: '38%',
            height: 8,
            ['--steam-dur' as string]: w.dur,
            ['--steam-delay' as string]: w.delay,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single isometric plot tile — size-aware
// ---------------------------------------------------------------------------

interface PlotTileProps {
  member: GroupMemberWithVibe | null;
  plotIndex: number;
  palette: typeof COZY_PALETTE | typeof FUTURISTIC_PALETTE;
  isFuturistic: boolean;
  scale: ScaleConfig;
  onSelectPeer?: (userId: string, name: string) => void;
}

function PlotTile({ member, plotIndex, palette, isFuturistic, scale, onSelectPeer }: PlotTileProps) {
  const { tileW, tileH, depth } = scale;

  const initials = member
    ? (member.display_name || 'Cozy Neighbor').slice(0, 2).toUpperCase()
    : null;

  const vibe: VibeStatus = member?.vibe_status || 'neutral';
  const isRaincloud = vibe === 'raincloud';
  const isSunshine = vibe === 'sunshine';
  const hasActivity = member && vibe !== 'neutral';

  return (
    <motion.div
      className="relative group cursor-pointer"
      style={{ width: tileW, height: tileH + depth + Math.round(tileH * 1.2) }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: plotIndex * 0.03, ease: [0.34, 1.2, 0.64, 1] }}
      whileHover={member ? { y: -5, scale: 1.06 } : { scale: 1.06 }}
      onClick={() => {
        if (member && onSelectPeer) onSelectPeer(member.user_id, member.display_name);
      }}
    >
      {/* Diamond top face */}
      <div
        className="absolute inset-x-0 top-0 transition-all duration-200 group-hover:brightness-110 shadow-md"
        style={{
          height: tileH,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          background: isRaincloud ? 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)' : palette.tileBase,
          border: `1.5px solid ${isRaincloud ? '#94a3b8' : palette.tileBorder}`,
          boxShadow: isRaincloud ? '0 0 16px rgba(148,163,184,0.6)' : `0 4px 12px ${palette.tileShadow}`,
        }}
      />

      {/* Neon glow border for empty tiles */}
      {!member && (
        <div
          className="iso-plot-glow absolute inset-x-0 top-0 pointer-events-none"
          style={{
            height: tileH,
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            border: `2px dashed ${palette.emptyBorder}`,
            borderRadius: 8,
          }}
        />
      )}

      {/* Left wall */}
      <div
        className="absolute"
        style={{
          top: tileH / 2,
          left: 0,
          width: tileW / 2,
          height: depth,
          clipPath: 'polygon(0% 0%, 100% 50%, 100% 100%, 0% 50%)',
          background: palette.wallLeft,
        }}
      />

      {/* Right wall */}
      <div
        className="absolute"
        style={{
          top: tileH / 2,
          right: 0,
          width: tileW / 2,
          height: depth,
          clipPath: 'polygon(0% 50%, 100% 0%, 100% 50%, 0% 100%)',
          background: palette.wallRight,
        }}
      />

      {/* Weather aura */}
      {member && <WeatherAura vibe={vibe} isFuturistic={isFuturistic} />}

      {/* Member content or invite badge */}
      <div className="absolute inset-0 flex flex-col items-center justify-start pointer-events-auto">
        {member ? (
          <div className="flex flex-col items-center -mt-2 z-10">
            <MiniHouseModel
              palette={palette}
              isFuturistic={isFuturistic}
              avatarUrl={member.avatar_url}
              initials={initials!}
              isRaincloud={isRaincloud}
              scale={scale}
            />

            {/* Name + role */}
            <div className="flex items-center gap-0.5 mt-0.5">
              <span
                className="font-800 leading-tight truncate text-center px-1.5 py-0.5 rounded-full backdrop-blur-md shadow-sm border"
                style={{
                  fontSize: scale.nameFontSize,
                  maxWidth: scale.tileW * 0.7,
                  background: isRaincloud ? 'rgba(51,65,85,0.90)' : isFuturistic ? 'rgba(5,12,24,0.85)' : 'rgba(255,252,248,0.90)',
                  borderColor: isRaincloud ? '#64748b' : palette.tileBorder,
                  color: isRaincloud ? '#f8fafc' : isFuturistic ? '#a0e8ff' : '#643c28',
                }}
              >
                {(member.display_name || 'Cozy Neighbor').split(' ')[0]}
              </span>

              {member.role === 'admin' && (
                <span
                  className="px-0.5 py-0.5 rounded-full border font-700"
                  style={{
                    fontSize: Math.max(scale.nameFontSize - 1, 6),
                    background: 'rgba(251,191,36,0.18)',
                    borderColor: 'rgba(251,191,36,0.45)',
                    color: '#b45309',
                  }}
                >
                  👑
                </span>
              )}
            </div>

            {/* Activity dot */}
            {hasActivity && !isRaincloud && (
              <div
                className="rounded-full mt-0.5 animate-pulse"
                style={{
                  width: scale.tileW <= 76 ? 4 : 6,
                  height: scale.tileW <= 76 ? 4 : 6,
                  background: isSunshine ? '#4ade80' : isFuturistic ? '#00dcff' : '#f0c060',
                  boxShadow: isSunshine ? '0 0 4px #4ade80' : undefined,
                }}
              />
            )}
          </div>
        ) : (
          /* Empty — pulsing invite */
          <div
            className="z-10 flex flex-col items-center gap-0.5"
            style={{ marginTop: scale.tileH * 0.25 }}
          >
            <motion.div
              className="rounded-full flex items-center justify-center font-900 shadow-sm"
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: Math.max(scale.avatarSize - 4, 14),
                height: Math.max(scale.avatarSize - 4, 14),
                fontSize: scale.nameFontSize + 1,
                background: palette.emptyFill,
                color: isFuturistic ? '#00dcff' : '#c4704a',
                border: `1.5px solid ${palette.emptyBorder}`,
              }}
            >
              +
            </motion.div>
            {scale.tileW >= 76 && (
              <span
                className="font-700 opacity-60"
                style={{ fontSize: Math.max(scale.nameFontSize - 2, 6), color: palette.emptyBorder }}
              >
                Invite
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Central Group Landmark / Monument (Town Square Campfire or Orbital Beacon)
// ---------------------------------------------------------------------------

interface GroupAnchorProps {
  palette: typeof COZY_PALETTE | typeof FUTURISTIC_PALETTE;
  isFuturistic: boolean;
}

function GroupAnchor({ palette, isFuturistic }: GroupAnchorProps) {
  const anchorEmoji = isFuturistic ? '🛸' : '🔥';
  const sparkle = isFuturistic ? '⚡' : '✨';

  return (
    <div className="group-anchor-float flex flex-col items-center pointer-events-none select-none">
      {/* Diamond landmark platform */}
      <div
        className="relative flex items-center justify-center shadow-lg"
        style={{
          width: 96,
          height: 52,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          background: palette.anchorBg,
          border: `2px solid ${palette.anchorBorder}`,
          boxShadow: `0 0 20px 4px ${palette.anchorGlow}, 0 6px 16px rgba(0,0,0,0.18)`,
        }}
      >
        <span className="text-xl" aria-hidden>{anchorEmoji}</span>
        <span className="text-[10px] ml-0.5" aria-hidden>{sparkle}</span>
      </div>

      {/* Subtle landmark label */}
      <span
        className="text-[8px] font-800 tracking-wider uppercase px-2 py-0.5 rounded-full mt-1 backdrop-blur-sm border shadow-xs"
        style={{
          background: palette.anchorBg,
          borderColor: palette.anchorBorder,
          color: palette.anchorText,
        }}
      >
        {isFuturistic ? 'Orbital Core' : 'Town Hearth'}
      </span>
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
  activeChallenge?: GroupChallenge | null;
}

export function GroupMapView({ group, members = [], onSelectPeer, activeChallenge = null }: GroupMapViewProps) {
  const safeMembers = Array.isArray(members) ? members : [];
  const meta = GROUP_TYPE_META[group?.type] ?? GROUP_TYPE_META['household'];
  const isFuturistic = meta.palette === 'futuristic';
  const palette = isFuturistic ? FUTURISTIC_PALETTE : COZY_PALETTE;

  // ── Dynamic scale based on active plots (members + open invite slots) ──
  const rawCap = Number(group?.max_members) || 10;
  const capacity = Math.max(1, Math.min(rawCap, 48));

  // Render all active members plus 1-2 open invite plot(s) to invite neighbors, capped at capacity
  const openInviteSlots = safeMembers.length < capacity ? (safeMembers.length <= 4 ? 2 : 1) : 0;
  const plotCount = Math.min(Math.max(safeMembers.length + openInviteSlots, 1), capacity);

  const scale = computeScaleConfig(plotCount);
  const { tileW, tileH, depth, gap, cols } = scale;

  const calculatedPlots = buildGrid(plotCount, cols);
  const plots = calculatedPlots.length > 0 ? calculatedPlots : [{ col: 0, row: 0 }];

  const memberMap: Record<number, GroupMemberWithVibe> = {};
  safeMembers.forEach((m, i) => { memberMap[i] = m; });

  const PAD_X = 32;
  const PAD_Y = 56;

  const allOffsets = plots.map(({ col, row }) => isoOffset(col, row, tileW, tileH, gap));
  const minX = Math.min(...allOffsets.map((o) => o.x));
  const maxX = Math.max(...allOffsets.map((o) => o.x)) + tileW;
  const maxY = Math.max(...allOffsets.map((o) => o.y)) + tileH + depth + Math.round(tileH * 1.2);

  const canvasW = Math.max(300, maxX - minX + PAD_X * 2);
  const canvasH = Math.max(300, maxY + PAD_Y * 2);

  // Landmark: horizontally centered at the apex of the canvas
  const anchorX = (canvasW / 2) - 48;
  const anchorY = 8;

  const completedCount = activeChallenge?.completedUserIds.length ?? 0;
  const progressPct = safeMembers.length > 0
    ? Math.min((completedCount / safeMembers.length) * 100, 100)
    : 0;

  return (
    <div
      className="relative w-full rounded-3xl border-2 select-none"
      style={{
        background: palette.bg,
        borderColor: isFuturistic ? 'rgba(0,220,255,0.25)' : 'rgba(232,168,124,0.30)',
        minHeight: Math.min(canvasH, 400),
        boxShadow: isFuturistic
          ? '0 0 40px rgba(0,220,255,0.12), 0 20px 60px rgba(0,0,0,0.50)'
          : '0 8px 40px rgba(122,79,58,0.18)',
        // Allow horizontal scroll on large maps (option a — scroll like a village map)
        overflowX: canvasW > 380 ? 'auto' : 'hidden',
        overflowY: 'hidden',
      }}
    >
      {group?.type === 'space_station' && <StarField />}

      {/* Density label badge — top-left */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-2">
        <span
          className="text-xs font-800 px-3 py-1 rounded-full backdrop-blur-md shadow-sm"
          style={{
            background: isFuturistic ? 'rgba(0,20,40,0.75)' : 'rgba(255,252,248,0.85)',
            color: isFuturistic ? '#00dcff' : '#7a4f3a',
            border: isFuturistic ? '1px solid rgba(0,220,255,0.30)' : '1px solid rgba(196,112,74,0.30)',
          }}
        >
          {meta.emoji} {meta.label}
          <span className="ml-1.5 opacity-50 font-600">· {scale.label}</span>
        </span>
      </div>

      {/* Peer support hint — top-right */}
      <div className="absolute top-3 right-4 z-20">
        <span
          className="text-xs font-800 px-3 py-1 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1.5"
          style={{
            background: isFuturistic ? 'rgba(0,20,40,0.75)' : 'rgba(255,252,248,0.85)',
            color: isFuturistic ? '#a855f7' : '#c4704a',
            border: isFuturistic ? '1px solid rgba(168,85,247,0.30)' : '1px solid rgba(196,112,74,0.30)',
          }}
        >
          Tap 🌧️ to send cheer!
        </span>
      </div>

      {/* Active Challenge HUD Banner (bottom of map view, non-obstructive) */}
      {activeChallenge && (
        <div className="absolute bottom-3 inset-x-4 z-20 flex justify-center pointer-events-none">
          <div
            className="px-4 py-2 rounded-2xl backdrop-blur-md shadow-lg border flex items-center gap-3 max-w-sm w-full pointer-events-auto"
            style={{
              background: isFuturistic ? 'rgba(5,12,24,0.92)' : 'rgba(255,252,248,0.95)',
              borderColor: isFuturistic ? 'rgba(0,220,255,0.40)' : 'rgba(217,119,54,0.30)',
            }}
          >
            <span className="text-base shrink-0">🏆</span>
            <div className="flex-1 min-w-0">
              <div
                className="flex items-center justify-between text-[11px] font-800"
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
                  style={{ background: palette.progressBar }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Isometric Canvas — scrollable container */}
      <div
        className="relative pt-10 pb-6"
        style={{ width: canvasW, height: canvasH }}
      >
        {/* Central Landmark / Monument */}
        <div className="absolute" style={{ left: anchorX, top: anchorY, zIndex: 1 }}>
          <GroupAnchor
            palette={palette}
            isFuturistic={isFuturistic}
          />
        </div>

        {/* Plot tiles */}
        {plots.map(({ col, row }, idx) => {
          const { x, y } = isoOffset(col, row, tileW, tileH, gap);
          const member = memberMap[idx] ?? null;
          return (
            <div
              key={`${col}-${row}`}
              className="absolute"
              style={{
                left: x - minX + PAD_X,
                top: y + PAD_Y,
                zIndex: (col + row) * 2 + 5,
              }}
            >
              <PlotTile
                member={member}
                plotIndex={idx}
                palette={palette}
                isFuturistic={isFuturistic}
                scale={scale}
                onSelectPeer={onSelectPeer}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

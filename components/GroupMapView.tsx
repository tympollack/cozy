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
  roofW: number;    // half-width of roof triangle
  roofH: number;    // height of roof triangle
  bodyW: number;    // house body width
  bodyH: number;    // house body height
  doorW: number;    // door width
  doorH: number;    // door height
}

function computeScaleConfig(memberCount: number): ScaleConfig {
  if (memberCount <= 4) {
    return { tileW: 130, tileH: 72, depth: 22, gap: 1.65, cols: 2,  label: 'Hamlet',      nameFontSize: 11, avatarSize: 26, roofW: 24, roofH: 18, bodyW: 46, bodyH: 34, doorW: 9,  doorH: 12 };
  }
  if (memberCount <= 9) {
    return { tileW: 112, tileH: 62, depth: 18, gap: 1.45, cols: 3,  label: 'Village',     nameFontSize: 10, avatarSize: 22, roofW: 20, roofH: 15, bodyW: 38, bodyH: 28, doorW: 8,  doorH: 10 };
  }
  if (memberCount <= 19) {
    return { tileW: 96,  tileH: 52, depth: 15, gap: 1.30, cols: 3,  label: 'Town',        nameFontSize: 9,  avatarSize: 18, roofW: 17, roofH: 13, bodyW: 32, bodyH: 24, doorW: 7,  doorH: 9  };
  }
  if (memberCount <= 35) {
    return { tileW: 80,  tileH: 44, depth: 12, gap: 1.15, cols: 4,  label: 'City',        nameFontSize: 8,  avatarSize: 15, roofW: 14, roofH: 11, bodyW: 26, bodyH: 20, doorW: 5,  doorH: 7  };
  }
  return   { tileW: 66,  tileH: 36, depth: 10, gap: 1.05, cols: 5,  label: 'Metropolis',  nameFontSize: 7,  avatarSize: 12, roofW: 12, roofH: 9,  bodyW: 22, bodyH: 16, doorW: 4,  doorH: 6  };
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
    y: (col + row) * (tileH / 2.1) * gap,
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
// Theme palettes
// ---------------------------------------------------------------------------

const COZY_PALETTE = {
  bg: 'linear-gradient(160deg, #faf0e0 0%, #e8d5b8 50%, #c4956a 100%)',
  tileBase: 'linear-gradient(135deg, #fffcf8 0%, #f7ebd9 100%)',
  tileBorder: '#e8a87c',
  tileShadow: 'rgba(122,79,58,0.25)',
  emptyFill: 'rgba(240,192,96,0.18)',
  emptyBorder: '#f0c060',
  avatarRing: '#d97736',
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
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
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
// 2.5D Dollhouse Cottage Model — High-Detail Storybook Architecture
// ---------------------------------------------------------------------------

function MiniHouseModel({
  isFuturistic,
  avatarUrl,
  initials,
  isRaincloud,
  scale,
}: {
  palette: typeof COZY_PALETTE | typeof FUTURISTIC_PALETTE;
  isFuturistic: boolean;
  avatarUrl: string | null;
  initials: string;
  isRaincloud: boolean;
  scale: ScaleConfig;
}) {
  const { bodyW, bodyH, avatarSize, nameFontSize } = scale;

  if (isFuturistic) {
    return (
      <div className="relative flex flex-col items-center select-none" style={{ marginTop: -Math.round(scale.tileH * 0.16) }}>
        {/* Orbital Bio-Pod Structure */}
        <div className="relative flex flex-col items-center">
          {/* Antenna / Beacon */}
          <div className="w-0.5 h-3 bg-cyan-400 animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#00dcff] -mt-1" />

          {/* Pod Dome */}
          <div
            className="relative rounded-2xl overflow-hidden border-2 flex items-center justify-center shadow-xl backdrop-blur-md"
            style={{
              width: bodyW + 8,
              height: bodyH + 4,
              background: isRaincloud
                ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
                : 'linear-gradient(180deg, rgba(15,29,54,0.95) 0%, rgba(5,12,24,0.98) 100%)',
              borderColor: isRaincloud ? '#64748b' : '#00dcff',
              boxShadow: isRaincloud ? 'none' : '0 0 16px rgba(0,220,255,0.45)',
            }}
          >
            {/* Interior Biosphere Ambient Glow */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background: isRaincloud
                  ? 'radial-gradient(circle, #64748b 0%, transparent 80%)'
                  : 'radial-gradient(circle, #00dcff 0%, #0080ff 80%)',
              }}
            />

            {/* Avatar in Port */}
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Member"
                className="rounded-full object-cover relative z-10 shadow-md"
                style={{
                  width: avatarSize + 2,
                  height: avatarSize + 2,
                  border: `1.5px solid ${isRaincloud ? '#64748b' : '#00dcff'}`,
                }}
              />
            ) : (
              <span
                className="font-900 relative z-10"
                style={{
                  fontSize: Math.max(nameFontSize, 8),
                  color: isRaincloud ? '#94a3b8' : '#a0e8ff',
                }}
              >
                {initials}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 🏡 2.5D Storybook Cozy Cottage Dollhouse
  return (
    <div className="relative flex flex-col items-center select-none" style={{ marginTop: -Math.round(scale.tileH * 0.22) }}>
      {/* Chimney with subtle smoke */}
      <div className="absolute -top-3.5 right-1.5 flex flex-col items-center pointer-events-none z-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-200/60 blur-[1px] animate-ping" />
        <div
          className="w-2.5 h-4 rounded-t-xs shadow-xs"
          style={{
            background: isRaincloud ? '#475569' : '#8c4c24',
            border: '1px solid rgba(0,0,0,0.15)',
          }}
        />
      </div>

      {/* Layered Pitched Shingle Roof */}
      <div className="relative flex flex-col items-center z-10">
        <div
          className="relative shadow-md"
          style={{
            width: bodyW + 14,
            height: Math.round(scale.roofH * 1.3),
            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
            background: isRaincloud
              ? 'linear-gradient(180deg, #64748b 0%, #475569 100%)'
              : 'linear-gradient(180deg, #c4704a 0%, #a34e28 100%)',
            borderTop: '2px solid rgba(255,255,255,0.3)',
          }}
        >
          {/* Shingle pattern overlay */}
          <div className="absolute inset-0 opacity-25 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,0,0,0.4)_4px)]" />
        </div>
      </div>

      {/* Timber & Plaster Dollhouse Cottage Body */}
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-b-md shadow-lg -mt-0.5 z-10"
        style={{
          width: bodyW + 4,
          height: bodyH + 6,
          background: isRaincloud
            ? 'linear-gradient(180deg, #334155 0%, #1e293b 100%)'
            : 'linear-gradient(180deg, #faf7f2 0%, #f3ece0 100%)',
          border: `1.5px solid ${isRaincloud ? '#475569' : '#b8754b'}`,
          boxShadow: isRaincloud ? 'none' : '0 4px 12px rgba(122,79,58,0.25)',
        }}
      >
        {/* Interior Candlelight Ambient Glow */}
        <div
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{
            background: isRaincloud
              ? 'radial-gradient(circle at 50% 30%, #64748b 0%, transparent 70%)'
              : 'radial-gradient(circle at 50% 30%, rgba(245,158,11,0.35) 0%, transparent 80%)',
          }}
        />

        {/* Member Picture Window / Avatar Portal */}
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Citizen Home"
            className="rounded-full object-cover shadow-sm relative z-10"
            style={{
              width: avatarSize + 2,
              height: avatarSize + 2,
              border: `1.5px solid ${isRaincloud ? '#64748b' : '#d97736'}`,
            }}
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shadow-xs relative z-10"
            style={{
              background: isRaincloud ? '#1e293b' : '#fef3c7',
              border: `1.5px solid ${isRaincloud ? '#475569' : '#d97736'}`,
            }}
          >
            <span
              className="font-900"
              style={{
                fontSize: Math.max(nameFontSize, 8),
                color: isRaincloud ? '#94a3b8' : '#92400e',
              }}
            >
              {initials}
            </span>
          </div>
        )}

        {/* Cottage Front Door */}
        <div
          className="absolute bottom-0"
          style={{
            width: scale.doorW + 2,
            height: scale.doorH + 2,
            background: isRaincloud ? '#0f172a' : '#5c331e',
            borderRadius: '3px 3px 0 0',
            border: '1px solid rgba(0,0,0,0.2)',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {/* Little brass doorknob */}
          <div className="w-1 h-1 rounded-full bg-amber-300 absolute top-2 right-0.5 shadow-xs" />
        </div>
      </div>

      {/* Flowerbed & Stone Garden Foundation Base */}
      <div
        className="w-full flex items-center justify-between px-1 -mt-1 relative z-10 pointer-events-none"
        style={{ width: bodyW + 12 }}
      >
        <span className="text-[9px] drop-shadow-xs" aria-hidden>🌸</span>
        <span className="text-[8px] opacity-80" aria-hidden>🌱</span>
        <span className="text-[9px] drop-shadow-xs" aria-hidden>🌺</span>
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

  return (
    <motion.div
      className="relative group cursor-pointer"
      style={{ width: tileW, height: tileH + depth + Math.round(tileH * 1.4) }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: plotIndex * 0.03, ease: [0.34, 1.2, 0.64, 1] }}
      whileHover={member ? { y: -6, scale: 1.08 } : { y: -3, scale: 1.05 }}
      onClick={() => {
        if (member && onSelectPeer) onSelectPeer(member.user_id, member.display_name);
      }}
    >
      {/* 2.5D Diamond Base / Garden Plot Foundation */}
      <div
        className="absolute inset-x-0 top-0 transition-all duration-200 group-hover:brightness-110 shadow-lg"
        style={{
          height: tileH,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          background: member
            ? (isRaincloud
                ? 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)'
                : (isFuturistic
                    ? 'linear-gradient(135deg, #0f1d36 0%, #091326 100%)'
                    : 'linear-gradient(135deg, #e8d9c0 0%, #cfbba0 100%)'))
            : (isFuturistic
                ? 'rgba(0,220,255,0.08)'
                : 'rgba(217,119,54,0.12)'),
          border: member
            ? `2px solid ${isRaincloud ? '#64748b' : (isFuturistic ? '#00dcff' : '#a36d47')}`
            : `2px dashed ${isFuturistic ? '#00dcff' : '#d97736'}`,
          boxShadow: isRaincloud
            ? '0 0 16px rgba(148,163,184,0.5)'
            : (isFuturistic ? '0 0 16px rgba(0,220,255,0.3)' : '0 4px 14px rgba(122,79,58,0.2)'),
        }}
      />

      {/* 3D Left Wall of Plot Foundation */}
      <div
        className="absolute"
        style={{
          top: tileH / 2,
          left: 0,
          width: tileW / 2,
          height: depth,
          clipPath: 'polygon(0% 0%, 100% 50%, 100% 100%, 0% 50%)',
          background: isFuturistic ? '#081428' : '#8a5330',
        }}
      />

      {/* 3D Right Wall of Plot Foundation */}
      <div
        className="absolute"
        style={{
          top: tileH / 2,
          right: 0,
          width: tileW / 2,
          height: depth,
          clipPath: 'polygon(0% 50%, 100% 0%, 100% 50%, 0% 100%)',
          background: isFuturistic ? '#050e1f' : '#6b3e20',
        }}
      />

      {/* Weather aura */}
      {member && <WeatherAura vibe={vibe} isFuturistic={isFuturistic} />}

      {/* Plot Content (Dollhouse Cottage or For-Sale/Invite Plot) */}
      <div className="absolute inset-0 flex flex-col items-center justify-start pointer-events-auto">
        {member ? (
          <div className="flex flex-col items-center -mt-3 z-10">
            <MiniHouseModel
              palette={palette}
              isFuturistic={isFuturistic}
              avatarUrl={member.avatar_url}
              initials={initials!}
              isRaincloud={isRaincloud}
              scale={scale}
            />

            {/* Display Name + Admin Badge */}
            <div className="flex items-center gap-1 mt-1">
              <span
                className="font-900 leading-tight truncate text-center px-2 py-0.5 rounded-full backdrop-blur-md shadow-md border"
                style={{
                  fontSize: scale.nameFontSize,
                  maxWidth: scale.tileW * 0.85,
                  background: isRaincloud
                    ? 'rgba(30,41,59,0.95)'
                    : isFuturistic
                    ? 'rgba(5,12,24,0.90)'
                    : 'rgba(255,252,248,0.95)',
                  borderColor: isRaincloud
                    ? '#64748b'
                    : isFuturistic
                    ? 'rgba(0,220,255,0.40)'
                    : 'rgba(217,119,54,0.30)',
                  color: isRaincloud
                    ? '#f8fafc'
                    : isFuturistic
                    ? '#a0e8ff'
                    : '#451a03',
                }}
              >
                {(member.display_name || 'Cozy Neighbor').split(' ')[0]}
              </span>

              {member.role === 'admin' && (
                <span
                  className="px-1 py-0.5 rounded-full border font-800 text-[9px] shadow-xs"
                  style={{
                    background: 'rgba(251,191,36,0.25)',
                    borderColor: 'rgba(251,191,36,0.60)',
                    color: '#92400e',
                  }}
                  title="Group Admin"
                >
                  👑
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Empty Garden Plot Clearing with "+ Invite" Signboard */
          <div
            className="z-10 flex flex-col items-center gap-1"
            style={{ marginTop: scale.tileH * 0.2 }}
          >
            <motion.div
              className="rounded-2xl px-2.5 py-1 flex items-center gap-1 font-900 shadow-md backdrop-blur-md border cursor-pointer"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                fontSize: scale.nameFontSize,
                background: isFuturistic ? 'rgba(0,20,40,0.85)' : 'rgba(255,252,248,0.90)',
                color: isFuturistic ? '#00dcff' : '#b45309',
                borderColor: isFuturistic ? '#00dcff' : '#f59e0b',
              }}
            >
              <span className="text-xs">🏡</span>
              <span>+ Invite</span>
            </motion.div>
            <span
              className="font-800 opacity-70 text-[9px]"
              style={{ color: isFuturistic ? '#00dcff' : '#78350f' }}
            >
              Vacant Plot
            </span>
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
  const maxY = Math.max(...allOffsets.map((o) => o.y)) + tileH + depth + Math.round(tileH * 1.4);

  const canvasW = Math.max(300, maxX - minX + PAD_X * 2);
  const canvasH = Math.max(300, maxY + PAD_Y * 2);

  // Landmark: horizontally centered at the apex of the canvas
  const anchorX = (canvasW / 2) - 48;
  const anchorY = 8;

  const completedCount = activeChallenge?.completedUserIds.length ?? 0;
  const progressPct = safeMembers.length > 0
    ? Math.min((completedCount / safeMembers.length) * 100, 100)
    : 0;

  const bgImage = isFuturistic ? '/images/neighborhood-orbital.jpg' : '/images/neighborhood-village.jpg';

  return (
    <div
      className="relative w-full rounded-3xl border-2 select-none overflow-hidden"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderColor: isFuturistic ? 'rgba(0,220,255,0.35)' : 'rgba(217,119,54,0.40)',
        minHeight: Math.max(canvasH, 440),
        boxShadow: isFuturistic
          ? '0 0 40px rgba(0,220,255,0.20), 0 20px 60px rgba(0,0,0,0.60)'
          : '0 10px 40px rgba(122,79,58,0.22)',
        overflowX: canvasW > 400 ? 'auto' : 'hidden',
        overflowY: 'hidden',
      }}
    >
      {/* Soft Vignette Overlay to enhance contrast and focus on plots */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: isFuturistic
            ? 'radial-gradient(circle at 50% 50%, rgba(5,12,24,0.35) 0%, rgba(5,12,24,0.75) 100%)'
            : 'radial-gradient(circle at 50% 50%, rgba(250,240,224,0.20) 0%, rgba(84,50,32,0.35) 100%)',
        }}
      />

      {group?.type === 'space_station' && <StarField />}

      {/* Density label badge — top-left */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-2">
        <span
          className="text-xs font-800 px-3 py-1 rounded-full backdrop-blur-md shadow-sm"
          style={{
            background: isFuturistic ? 'rgba(0,20,40,0.85)' : 'rgba(255,252,248,0.90)',
            color: isFuturistic ? '#00dcff' : '#7a4f3a',
            border: isFuturistic ? '1px solid rgba(0,220,255,0.40)' : '1px solid rgba(196,112,74,0.40)',
          }}
        >
          {meta.emoji} {meta.label}
          <span className="ml-1.5 opacity-60 font-700">· {scale.label}</span>
        </span>
      </div>

      {/* Peer support hint — top-right */}
      <div className="absolute top-3 right-4 z-20">
        <span
          className="text-xs font-800 px-3 py-1 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1.5"
          style={{
            background: isFuturistic ? 'rgba(0,20,40,0.85)' : 'rgba(255,252,248,0.90)',
            color: isFuturistic ? '#c084fc' : '#c4704a',
            border: isFuturistic ? '1px solid rgba(168,85,247,0.40)' : '1px solid rgba(196,112,74,0.40)',
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
        className="relative pt-10 pb-6 z-10"
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

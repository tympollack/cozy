'use client';

import { motion } from 'framer-motion';
import type { GroupMemberWithVibe } from '@/components/GroupMapView';

// ---------------------------------------------------------------------------
// Habitat size tokens
// ---------------------------------------------------------------------------

export type PlotSize = 'sm' | 'md' | 'lg';

interface SizeTokens {
  bodyW: number;
  bodyH: number;
  roofH: number;
  avatarSize: number;
  nameFontSize: number;
}

const SIZE_TOKENS: Record<PlotSize, SizeTokens> = {
  lg: { bodyW: 66, bodyH: 46, roofH: 28, avatarSize: 26, nameFontSize: 11 },
  md: { bodyW: 52, bodyH: 38, roofH: 22, avatarSize: 22, nameFontSize: 10 },
  sm: { bodyW: 42, bodyH: 30, roofH: 17, avatarSize: 17, nameFontSize:  9 },
};

// ---------------------------------------------------------------------------
// Shared avatar / initials helper — rendered inside each habitat's "window"
// ---------------------------------------------------------------------------

function AvatarPortal({
  avatarUrl,
  initials,
  size,
  borderColor,
  bgColor,
  textColor,
}: {
  avatarUrl: string | null;
  initials: string;
  size: number;
  borderColor: string;
  bgColor: string;
  textColor: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt="Member"
        className="rounded-full object-cover shadow-md relative z-10 flex-shrink-0"
        style={{ width: size, height: size, border: `1.5px solid ${borderColor}` }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shadow-sm relative z-10 flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
      }}
    >
      <span className="font-black" style={{ fontSize: Math.max(size * 0.36, 8), color: textColor }}>
        {initials}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Habitat renderer props — all renderers receive the same interface
// ---------------------------------------------------------------------------

interface HabitatRenderProps {
  tokens: SizeTokens;
  avatarUrl: string | null;
  initials: string;
  isRaincloud: boolean;
  isFuturistic: boolean;
}

// ---------------------------------------------------------------------------
// 🏠 default_dollhouse — warm wood-framed cottage with pitched shingle roof
// ---------------------------------------------------------------------------

function CottageHabitat({ tokens, avatarUrl, initials, isRaincloud }: HabitatRenderProps) {
  const { bodyW, bodyH, roofH, avatarSize } = tokens;
  const roofColor = isRaincloud
    ? 'linear-gradient(180deg, #64748b 0%, #475569 100%)'
    : 'linear-gradient(180deg, #c4704a 0%, #a34e28 100%)';
  const bodyBg = isRaincloud
    ? 'linear-gradient(180deg, #334155 0%, #1e293b 100%)'
    : 'linear-gradient(180deg, #faf7f2 0%, #f3ece0 100%)';
  const bodyBorder = isRaincloud ? '#475569' : '#b8754b';

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Chimney + smoke */}
      <div className="absolute -top-3 right-2 flex flex-col items-center pointer-events-none z-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-200/60 blur-[1px] animate-ping" />
        <div
          className="w-2.5 h-3.5 rounded-t-sm"
          style={{ background: isRaincloud ? '#475569' : '#8c4c24', border: '1px solid rgba(0,0,0,0.15)' }}
        />
      </div>

      {/* Pitched shingle roof */}
      <div className="relative z-10 shadow-md" style={{
        width: bodyW + 14,
        height: roofH,
        clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
        background: roofColor,
        borderTop: '2px solid rgba(255,255,255,0.25)',
      }}>
        <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,0,0,0.4)_4px)]" />
      </div>

      {/* Timber cottage body */}
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-b-md shadow-lg -mt-0.5 z-10"
        style={{ width: bodyW + 4, height: bodyH, background: bodyBg, border: `1.5px solid ${bodyBorder}`, boxShadow: isRaincloud ? 'none' : '0 4px 12px rgba(122,79,58,0.22)' }}
      >
        {/* Candlelight glow */}
        <div className="absolute inset-0 opacity-55 pointer-events-none" style={{
          background: isRaincloud
            ? 'radial-gradient(circle at 50% 30%, #64748b 0%, transparent 70%)'
            : 'radial-gradient(circle at 50% 30%, rgba(245,158,11,0.32) 0%, transparent 80%)',
        }} />
        <AvatarPortal
          avatarUrl={avatarUrl}
          initials={initials}
          size={avatarSize}
          borderColor={isRaincloud ? '#64748b' : '#d97736'}
          bgColor={isRaincloud ? '#1e293b' : '#fef3c7'}
          textColor={isRaincloud ? '#94a3b8' : '#92400e'}
        />
        {/* Front door */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{
          width: Math.round(bodyW * 0.22),
          height: Math.round(bodyH * 0.40),
          background: isRaincloud ? '#0f172a' : '#5c331e',
          borderRadius: '3px 3px 0 0',
          border: '1px solid rgba(0,0,0,0.20)',
        }}>
          <div className="w-1 h-1 rounded-full bg-amber-300 absolute top-1.5 right-0.5 shadow-sm" />
        </div>
      </div>

      {/* Flowerbed */}
      <div className="flex items-center justify-between px-1 -mt-0.5 pointer-events-none" style={{ width: bodyW + 10 }}>
        <span className="text-[8px]" aria-hidden>🌸</span>
        <span className="text-[7px] opacity-75" aria-hidden>🌱</span>
        <span className="text-[8px]" aria-hidden>🌺</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ⛺ cozy_campsite — lantern-lit starlight tent with pine accents
// ---------------------------------------------------------------------------

function CampsiteHabitat({ tokens, avatarUrl, initials, isRaincloud }: HabitatRenderProps) {
  const { bodyW, bodyH, roofH, avatarSize } = tokens;
  const tentColor = isRaincloud
    ? 'linear-gradient(180deg, #374151 0%, #1f2937 100%)'
    : 'linear-gradient(180deg, #4ade80 0%, #166534 100%)';
  const flap = isRaincloud ? '#1f2937' : '#14532d';

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Hanging lantern at peak */}
      <div className="flex flex-col items-center pointer-events-none z-10">
        <div className="w-0.5 h-2" style={{ background: isRaincloud ? '#6b7280' : '#d97706' }} />
        <div
          className="w-2.5 h-2.5 rounded-sm flex items-center justify-center"
          style={{
            background: isRaincloud ? '#374151' : '#fbbf24',
            boxShadow: isRaincloud ? 'none' : '0 0 6px 2px rgba(251,191,36,0.55)',
            border: `1px solid ${isRaincloud ? '#4b5563' : '#d97706'}`,
          }}
        >
          <span className="text-[6px]">{isRaincloud ? '🕯️' : '🪔'}</span>
        </div>
      </div>

      {/* Tent body — tall triangle top + rectangular base */}
      <div className="relative z-10 -mt-0.5">
        {/* Tent peak / fly */}
        <div style={{
          width: bodyW + 10,
          height: roofH + 4,
          clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
          background: tentColor,
        }} />
        {/* Tent lower body */}
        <div
          className="relative flex items-center justify-center overflow-hidden -mt-0.5"
          style={{
            width: bodyW + 10,
            height: bodyH,
            background: tentColor,
            borderRadius: '0 0 4px 4px',
            boxShadow: isRaincloud ? 'none' : '0 4px 12px rgba(22,101,52,0.30)',
          }}
        >
          {/* Interior forest glow */}
          <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
            background: isRaincloud
              ? 'radial-gradient(circle, #4b5563 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 80%)',
          }} />
          <AvatarPortal
            avatarUrl={avatarUrl}
            initials={initials}
            size={avatarSize}
            borderColor={isRaincloud ? '#6b7280' : '#4ade80'}
            bgColor={isRaincloud ? '#1f2937' : '#052e16'}
            textColor={isRaincloud ? '#d1d5db' : '#4ade80'}
          />
          {/* Tent flap opening */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{
            width: Math.round(bodyW * 0.30),
            height: Math.round(bodyH * 0.45),
            background: flap,
            borderRadius: '3px 3px 0 0',
            border: `1px solid ${isRaincloud ? '#374151' : '#166534'}`,
          }} />
        </div>
      </div>

      {/* Pine + ground accents */}
      <div className="flex items-end gap-0.5 pointer-events-none -mt-0.5">
        <span className="text-[8px]" aria-hidden>🌲</span>
        <span className="text-[7px] opacity-60" aria-hidden>🍄</span>
        <span className="text-[8px]" aria-hidden>🌲</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 🏰 stone_castle — mystic keep with stone tower, battlements & rune glow
// ---------------------------------------------------------------------------

function CastleHabitat({ tokens, avatarUrl, initials, isRaincloud }: HabitatRenderProps) {
  const { bodyW, bodyH, avatarSize } = tokens;
  const stoneColor = isRaincloud
    ? 'linear-gradient(180deg, #374151 0%, #1f2937 100%)'
    : 'linear-gradient(180deg, #6b7280 0%, #374151 100%)';
  const merlon = isRaincloud ? '#1f2937' : '#4b5563';
  const glowColor = isRaincloud
    ? 'rgba(71,85,105,0.3)'
    : 'rgba(192,160,240,0.40)';

  // Battlements: 4 merlons at top
  const merlonW = Math.round((bodyW - 4) / 7);
  const merlonH = Math.round(bodyH * 0.22);

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Battlements (notched parapet) */}
      <div className="flex gap-[3px] z-10" style={{ width: bodyW + 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: merlonW,
              height: merlonH,
              background: merlon,
              border: `1px solid rgba(255,255,255,0.10)`,
              borderRadius: '2px 2px 0 0',
            }}
          />
        ))}
      </div>

      {/* Tower body */}
      <div
        className="relative flex items-center justify-center overflow-hidden z-10"
        style={{
          width: bodyW + 4,
          height: bodyH + 8,
          background: stoneColor,
          border: `2px solid ${isRaincloud ? '#374151' : '#6b7280'}`,
          boxShadow: isRaincloud ? 'none' : `0 0 16px 4px ${glowColor}`,
        }}
      >
        {/* Stone texture */}
        <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(0deg,transparent,transparent_5px,rgba(0,0,0,0.3)_6px),repeating-linear-gradient(90deg,transparent,transparent_8px,rgba(0,0,0,0.2)_9px)]" />
        {/* Rune glow */}
        <div className="absolute inset-0 opacity-50 pointer-events-none" style={{
          background: `radial-gradient(circle at 50% 40%, ${glowColor} 0%, transparent 70%)`,
        }} />
        {/* Arched window — avatar portal */}
        <div
          className="relative z-10 flex items-center justify-center overflow-hidden"
          style={{
            width: avatarSize + 8,
            height: avatarSize + 10,
            borderRadius: `${Math.round(avatarSize / 2 + 4)}px ${Math.round(avatarSize / 2 + 4)}px 0 0`,
            background: isRaincloud ? '#111827' : 'rgba(192,160,240,0.22)',
            border: `1.5px solid ${isRaincloud ? '#4b5563' : '#a78bfa'}`,
          }}
        >
          <AvatarPortal
            avatarUrl={avatarUrl}
            initials={initials}
            size={avatarSize}
            borderColor={isRaincloud ? '#6b7280' : '#a78bfa'}
            bgColor={isRaincloud ? '#1f2937' : '#2e1065'}
            textColor={isRaincloud ? '#9ca3af' : '#c084fc'}
          />
        </div>
        {/* Portcullis gate */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{
          width: Math.round(bodyW * 0.28),
          height: Math.round((bodyH + 8) * 0.32),
          borderRadius: '4px 4px 0 0',
          background: '#111827',
          border: `1px solid ${isRaincloud ? '#374151' : '#6b7280'}`,
          backgroundImage: isRaincloud
            ? 'none'
            : 'repeating-linear-gradient(0deg,rgba(107,114,128,0.5),rgba(107,114,128,0.5)_1px,transparent_1px,transparent_4px)',
        }} />
      </div>

      {/* Ground stones */}
      <div className="flex items-center gap-0.5 pointer-events-none mt-0.5">
        <span className="text-[8px] opacity-70" aria-hidden>🪨</span>
        <span className="text-[7px] opacity-50" aria-hidden>🌿</span>
        <span className="text-[8px] opacity-70" aria-hidden>🪨</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Futuristic bio-pod — fallback habitat for futuristic themes
// ---------------------------------------------------------------------------

function OrbitalPodHabitat({ tokens, avatarUrl, initials, isRaincloud }: HabitatRenderProps) {
  const { bodyW, bodyH, avatarSize } = tokens;

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Antenna beacon */}
      <div className="flex flex-col items-center pointer-events-none">
        <div className="w-0.5 h-3 bg-cyan-400 animate-pulse" />
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 -mt-0.5 shadow-[0_0_8px_#00dcff]" />
      </div>
      {/* Pod dome */}
      <div
        className="relative rounded-2xl overflow-hidden border-2 flex items-center justify-center shadow-xl backdrop-blur-md -mt-0.5"
        style={{
          width: bodyW + 8,
          height: bodyH + 4,
          background: isRaincloud
            ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
            : 'linear-gradient(180deg, rgba(15,29,54,0.95) 0%, rgba(5,12,24,0.98) 100%)',
          borderColor: isRaincloud ? '#64748b' : '#00dcff',
          boxShadow: isRaincloud ? 'none' : '0 0 16px rgba(0,220,255,0.40)',
        }}
      >
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
          background: isRaincloud
            ? 'radial-gradient(circle, #64748b 0%, transparent 80%)'
            : 'radial-gradient(circle, #00dcff 0%, #0080ff 80%)',
        }} />
        <AvatarPortal
          avatarUrl={avatarUrl}
          initials={initials}
          size={avatarSize + 2}
          borderColor={isRaincloud ? '#64748b' : '#00dcff'}
          bgColor={isRaincloud ? '#0f172a' : '#0f1d36'}
          textColor={isRaincloud ? '#94a3b8' : '#a0e8ff'}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extensible shell → habitat renderer registry
//
// To add a new shell type:
//   1. Create a new *Habitat component above following the HabitatRenderProps interface.
//   2. Add one entry to HABITAT_REGISTRY keyed by the shell_type id string.
// ---------------------------------------------------------------------------

type HabitatRenderer = (props: HabitatRenderProps) => React.ReactNode;

const HABITAT_REGISTRY: Record<string, HabitatRenderer> = {
  default_dollhouse: (p) => <CottageHabitat {...p} />,
  cozy_campsite:     (p) => <CampsiteHabitat {...p} />,
  stone_castle:      (p) => <CastleHabitat {...p} />,
  // Future shell types go here — no other code changes required.
};

function resolveHabitatRenderer(shellType: string | null | undefined, isFuturistic: boolean): HabitatRenderer {
  if (isFuturistic) return (p) => <OrbitalPodHabitat {...p} />;
  return HABITAT_REGISTRY[shellType ?? ''] ?? HABITAT_REGISTRY.default_dollhouse;
}

// ---------------------------------------------------------------------------
// Vibe aura glow ring — sits beneath the habitat model
// ---------------------------------------------------------------------------

function VibeAuraRing({
  vibe,
  isFuturistic,
  bodyW,
}: {
  vibe: string;
  isFuturistic: boolean;
  bodyW: number;
}) {
  const configs: Record<string, { className: string; style: React.CSSProperties }> = {
    sunshine: {
      className: 'habitat-aura-sunshine',
      style: { background: 'rgba(250,204,21,0.12)', border: '1.5px solid rgba(250,204,21,0.45)' },
    },
    raincloud: {
      className: 'habitat-aura-raincloud',
      style: { background: 'rgba(99,102,241,0.12)', border: '1.5px dashed rgba(99,102,241,0.55)' },
    },
    neutral: {
      className: 'habitat-aura-cozy',
      style: {
        background: isFuturistic ? 'rgba(0,220,255,0.08)' : 'rgba(217,119,54,0.10)',
        border: isFuturistic ? '1px solid rgba(0,220,255,0.30)' : '1px solid rgba(217,119,54,0.25)',
      },
    },
  };
  const cfg = configs[vibe] ?? configs.neutral;
  return (
    <div
      className={`${cfg.className} absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full pointer-events-none`}
      style={{ width: bodyW + 20, height: 12, ...cfg.style }}
      aria-hidden
    />
  );
}

// ---------------------------------------------------------------------------
// Weather aura overlay (vibe emoji + rain drips / steam / sunshine)
// ---------------------------------------------------------------------------

function WeatherAura({ vibe, isFuturistic }: { vibe: string; isFuturistic: boolean }) {
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
        <div className="vibe-sunshine-aura absolute" style={{ top: -4, width: 44, height: 44 }} />
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
          style={{ top: -2, width: 42, height: 42, borderColor: 'rgba(148,163,184,0.70)' }}
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
// UserPlotNode — public export
// ---------------------------------------------------------------------------

interface UserPlotNodeProps {
  member: GroupMemberWithVibe;
  plotSize: PlotSize;
  isFuturistic: boolean;
  plotIndex: number;
  onSelectPeer?: (userId: string, name: string) => void;
}

export function UserPlotNode({
  member,
  plotSize,
  isFuturistic,
  plotIndex,
  onSelectPeer,
}: UserPlotNodeProps) {
  const tokens = SIZE_TOKENS[plotSize];
  const { bodyW, nameFontSize } = tokens;

  const initials = (member.display_name || 'CN').slice(0, 2).toUpperCase();
  const vibe = member.vibe_status ?? 'neutral';
  const isRaincloud = vibe === 'raincloud';

  const renderHabitat = resolveHabitatRenderer(member.shell_type, isFuturistic);

  const nameTagBg = isRaincloud
    ? 'rgba(30,41,59,0.95)'
    : isFuturistic
    ? 'rgba(5,12,24,0.90)'
    : 'rgba(255,252,248,0.92)';
  const nameTagBorder = isRaincloud
    ? 'rgba(100,116,139,0.50)'
    : isFuturistic
    ? 'rgba(0,220,255,0.40)'
    : 'rgba(217,119,54,0.35)';
  const nameTagColor = isRaincloud
    ? '#f8fafc'
    : isFuturistic
    ? '#a0e8ff'
    : '#451a03';

  return (
    <motion.div
      className="relative flex flex-col items-center gap-1 cursor-pointer select-none"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: plotIndex * 0.04, ease: [0.34, 1.2, 0.64, 1] }}
      onClick={() => onSelectPeer?.(member.user_id, member.display_name || 'Cozy Neighbor')}
    >
      {/* Relative wrapper for the habitat + aura */}
      <div className="relative flex flex-col items-center">
        {/* Vibe aura ground ring */}
        <VibeAuraRing vibe={vibe} isFuturistic={isFuturistic} bodyW={bodyW} />
        {/* Weather overlay (emoji + effects) */}
        <WeatherAura vibe={vibe} isFuturistic={isFuturistic} />
        {/* 2.5D habitat model */}
        {renderHabitat({ tokens, avatarUrl: member.avatar_url, initials, isRaincloud, isFuturistic })}
      </div>

      {/* Frosted name pill + role badge */}
      <div className="flex items-center gap-1">
        <span
          className="font-black leading-tight truncate text-center px-2 py-0.5 rounded-full backdrop-blur-md shadow-md border"
          style={{
            fontSize: nameFontSize,
            maxWidth: bodyW + 24,
            background: nameTagBg,
            borderColor: nameTagBorder,
            color: nameTagColor,
          }}
        >
          {(member.display_name || 'Cozy Neighbor').split(' ')[0]}
        </span>

        {member.role === 'admin' && (
          <span
            className="px-1 py-0.5 rounded-full border text-[9px] shadow-sm"
            style={{
              background: 'rgba(251,191,36,0.22)',
              borderColor: 'rgba(251,191,36,0.55)',
              color: '#92400e',
            }}
            title="Group Admin"
          >
            👑
          </span>
        )}
      </div>
    </motion.div>
  );
}

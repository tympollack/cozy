'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import type { GroupMemberWithVibe } from '@/components/GroupMapView';

// ---------------------------------------------------------------------------
// Plot size tokens
// ---------------------------------------------------------------------------

export type PlotSize = 'sm' | 'md' | 'lg';

interface SizeTokens {
  /** Rendered pixel width/height of the square habitat sprite. */
  spriteSize: number;
  /** Avatar badge diameter. */
  avatarBadgeSize: number;
  nameFontSize: number;
  /** Width of the ground aura ellipse. */
  auraWidth: number;
}

const SIZE_TOKENS: Record<PlotSize, SizeTokens> = {
  lg: { spriteSize: 80,  avatarBadgeSize: 24, nameFontSize: 10, auraWidth: 68 },
  md: { spriteSize: 64,  avatarBadgeSize: 20, nameFontSize:  9, auraWidth: 54 },
  sm: { spriteSize: 50,  avatarBadgeSize: 16, nameFontSize:  8, auraWidth: 44 },
};

// ---------------------------------------------------------------------------
// Extensible habitat image registry
//
// To add a new shell type:
//   1. Drop the illustrated sprite into /public/images/habitats/
//   2. Add one entry here keyed by the shell_type id — nothing else changes.
// ---------------------------------------------------------------------------

const HABITAT_IMAGE_REGISTRY: Record<string, string> = {
  default_dollhouse: '/images/habitats/cottage.jpg',
  cozy_campsite:     '/images/habitats/campsite.jpg',
  stone_castle:      '/images/habitats/castle.jpg',
};

const FUTURISTIC_HABITAT_IMAGE = '/images/habitats/orbital_pod.jpg';

function resolveHabitatImage(shellType: string | null | undefined, isFuturistic: boolean): string {
  if (isFuturistic) return FUTURISTIC_HABITAT_IMAGE;
  return HABITAT_IMAGE_REGISTRY[shellType ?? ''] ?? HABITAT_IMAGE_REGISTRY.default_dollhouse;
}

// ---------------------------------------------------------------------------
// Avatar badge — small circular portrait overlaid on the sprite
// ---------------------------------------------------------------------------

function AvatarBadge({
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
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg"
      style={{ width: size, height: size, border: `2px solid ${borderColor}`, background: bgColor }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="Member" className="w-full h-full object-cover" />
      ) : (
        <span
          className="font-black leading-none select-none"
          style={{ fontSize: Math.max(Math.round(size * 0.38), 7), color: textColor }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Habitat sprite — rendered image with avatar badge overlay
// ---------------------------------------------------------------------------

function HabitatSprite({
  shellType,
  isFuturistic,
  isRaincloud,
  spriteSize,
  avatarBadgeSize,
  avatarUrl,
  initials,
}: {
  shellType: string | null | undefined;
  isFuturistic: boolean;
  isRaincloud: boolean;
  spriteSize: number;
  avatarBadgeSize: number;
  avatarUrl: string | null;
  initials: string;
}) {
  const src = resolveHabitatImage(shellType, isFuturistic);

  const badgeBorder = isRaincloud
    ? '#64748b'
    : isFuturistic
    ? '#00dcff'
    : '#f0c060';
  const badgeBg = isRaincloud
    ? '#1e293b'
    : isFuturistic
    ? '#0f1d36'
    : '#fef3c7';
  const badgeText = isRaincloud
    ? '#94a3b8'
    : isFuturistic
    ? '#a0e8ff'
    : '#92400e';

  return (
    <div className="relative inline-block" style={{ width: spriteSize, height: spriteSize }}>
      {/* Habitat sprite image */}
      <Image
        src={src}
        alt={shellType ?? 'habitat'}
        width={spriteSize}
        height={spriteSize}
        className="rounded-lg object-contain"
        style={isRaincloud ? { filter: 'grayscale(0.65) brightness(0.70) saturate(0.5)' } : {}}
        draggable={false}
      />

      {/* Avatar badge — bottom-right corner */}
      <div className="absolute -bottom-1.5 -right-1.5 z-10">
        <AvatarBadge
          avatarUrl={avatarUrl}
          initials={initials}
          size={avatarBadgeSize}
          borderColor={badgeBorder}
          bgColor={badgeBg}
          textColor={badgeText}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vibe aura ground ring
// ---------------------------------------------------------------------------

function VibeAuraRing({ vibe, isFuturistic, auraWidth }: { vibe: string; isFuturistic: boolean; auraWidth: number }) {
  const configs: Record<string, { className: string; style: React.CSSProperties }> = {
    sunshine: {
      className: 'habitat-aura-sunshine',
      style: { background: 'rgba(250,204,21,0.14)', border: '1.5px solid rgba(250,204,21,0.55)' },
    },
    raincloud: {
      className: 'habitat-aura-raincloud',
      style: { background: 'rgba(99,102,241,0.14)', border: '1.5px dashed rgba(99,102,241,0.65)' },
    },
    neutral: {
      className: 'habitat-aura-cozy',
      style: {
        background: isFuturistic ? 'rgba(0,220,255,0.08)'          : 'rgba(217,119,54,0.10)',
        border:     isFuturistic ? '1px solid rgba(0,220,255,0.30)' : '1px solid rgba(217,119,54,0.25)',
      },
    },
  };
  const cfg = configs[vibe] ?? configs.neutral;
  return (
    <div
      className={`${cfg.className} absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full pointer-events-none`}
      style={{ width: auraWidth, height: 10, ...cfg.style }}
      aria-hidden
    />
  );
}

// ---------------------------------------------------------------------------
// Weather vibe overlay (emoji + ambient effect)
// ---------------------------------------------------------------------------

function WeatherAura({ vibe, isFuturistic }: { vibe: string; isFuturistic: boolean }) {
  if (vibe === 'sunshine') {
    return (
      <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center">
        <motion.span
          className="text-sm absolute -top-6"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >☀️</motion.span>
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
        >🌧️</motion.span>
        <motion.div
          className="absolute border-2 rounded-full"
          style={{ top: -2, width: 42, height: 42, borderColor: 'rgba(148,163,184,0.70)' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0.15, 0.7] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {[
          { left: '38%', duration: '0.85s', delay: '0s',   height: 9 },
          { left: '50%', duration: '1.05s', delay: '0.3s', height: 13 },
          { left: '62%', duration: '0.75s', delay: '0.6s', height: 9 },
        ].map((drip, i) => (
          <span
            key={i}
            className="rain-drip"
            style={{
              left: drip.left, top: '54%', height: drip.height,
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
      >☕</motion.span>
      {[
        { left: '44%', dur: '1.6s', delay: '0s'   },
        { left: '56%', dur: '1.9s', delay: '0.5s' },
      ].map((w, i) => (
        <span
          key={i}
          className={`steam-wisp absolute w-0.5 rounded-full ${isFuturistic ? 'bg-cyan-400/50' : 'bg-[--cozy-amber]/50'}`}
          style={{
            left: w.left, top: '38%', height: 8,
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

export function UserPlotNode({ member, plotSize, isFuturistic, plotIndex, onSelectPeer }: UserPlotNodeProps) {
  const tokens = SIZE_TOKENS[plotSize];
  const { spriteSize, avatarBadgeSize, nameFontSize, auraWidth } = tokens;

  const initials    = (member.display_name || 'CN').slice(0, 2).toUpperCase();
  const vibe        = member.vibe_status ?? 'neutral';
  const isRaincloud = vibe === 'raincloud';

  const nameTagBg     = isRaincloud ? 'rgba(30,41,59,0.95)'      : isFuturistic ? 'rgba(5,12,24,0.90)'          : 'rgba(255,252,248,0.92)';
  const nameTagBorder = isRaincloud ? 'rgba(100,116,139,0.50)'   : isFuturistic ? 'rgba(0,220,255,0.40)'        : 'rgba(217,119,54,0.35)';
  const nameTagColor  = isRaincloud ? '#f8fafc'                  : isFuturistic ? '#a0e8ff'                     : '#451a03';

  return (
    <motion.div
      className="relative flex flex-col items-center gap-1 cursor-pointer select-none"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28, delay: plotIndex * 0.04 }}
      onClick={() => onSelectPeer?.(member.user_id, member.display_name || 'Cozy Neighbor')}
    >
      {/* Habitat sprite + aura ring + weather overlay */}
      <div className="relative flex flex-col items-center">
        <VibeAuraRing vibe={vibe} isFuturistic={isFuturistic} auraWidth={auraWidth} />
        <WeatherAura  vibe={vibe} isFuturistic={isFuturistic} />
        <HabitatSprite
          shellType={member.shell_type}
          isFuturistic={isFuturistic}
          isRaincloud={isRaincloud}
          spriteSize={spriteSize}
          avatarBadgeSize={avatarBadgeSize}
          avatarUrl={member.avatar_url}
          initials={initials}
        />
      </div>

      {/* Frosted glass name pill + admin crown */}
      <div className="flex items-center gap-1 mt-1">
        <span
          className="font-black leading-tight truncate text-center px-2 py-0.5 rounded-full backdrop-blur-md shadow-md border"
          style={{
            fontSize: nameFontSize,
            maxWidth: spriteSize + 16,
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
            style={{ background: 'rgba(251,191,36,0.22)', borderColor: 'rgba(251,191,36,0.55)', color: '#92400e' }}
            title="Group Admin"
          >👑</span>
        )}
      </div>
    </motion.div>
  );
}

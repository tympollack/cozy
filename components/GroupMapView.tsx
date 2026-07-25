'use client';

import { motion } from 'framer-motion';
import type { GroupRow, GroupMemberRow } from '@/app/actions/groupActions';
import { GROUP_TYPE_META } from '@/config/groupDefinitions';

// ---------------------------------------------------------------------------
// Isometric grid layout helpers
// ---------------------------------------------------------------------------

/** Converts a grid [col, row] to CSS 2.5D isometric pixel offsets. */
function isoOffset(
  col: number,
  row: number,
  tileW: number,
  tileH: number
): { x: number; y: number } {
  return {
    x: (col - row) * (tileW / 2),
    y: (col + row) * (tileH / 2),
  };
}

/** Build a flat list of plot positions for up to `maxPlots` members. */
function buildGrid(maxPlots: number, cols: number) {
  const plots: { col: number; row: number }[] = [];
  let i = 0;
  outer: for (let r = 0; r < Math.ceil(maxPlots / cols) + 2; r++) {
    for (let c = 0; c < cols; c++) {
      plots.push({ col: c, row: r });
      i++;
      if (i >= maxPlots) break outer;
    }
  }
  return plots;
}

// ---------------------------------------------------------------------------
// Palette definitions
// ---------------------------------------------------------------------------

const COZY_PALETTE = {
  bg: 'linear-gradient(160deg, #faf0e0 0%, #e8d5b8 50%, #c4956a 100%)',
  ground: '#c4956a',
  tileBase: 'rgba(250,247,242,0.82)',
  tileBorder: 'rgba(196,112,74,0.35)',
  tileTop: 'rgba(232,168,124,0.30)',
  tileShadow: 'rgba(122,79,58,0.20)',
  emptyFill: 'rgba(240,192,96,0.12)',
  emptyBorder: 'rgba(240,192,96,0.40)',
  avatarRing: '#e8a87c',
  glowColor: 'rgba(240,192,96,0.55)',
  starColor: '#f0c060',
  treeEmoji: '🌲',
  floorLabel: 'text-[--cozy-bark]',
};

const FUTURISTIC_PALETTE = {
  bg: 'linear-gradient(160deg, #0a0a1a 0%, #0d1a2e 45%, #0a2040 100%)',
  ground: '#060d1a',
  tileBase: 'rgba(10,20,40,0.88)',
  tileBorder: 'rgba(0,220,255,0.30)',
  tileTop: 'rgba(60,0,120,0.25)',
  tileShadow: 'rgba(0,220,255,0.15)',
  emptyFill: 'rgba(0,220,255,0.05)',
  emptyBorder: 'rgba(0,220,255,0.20)',
  avatarRing: '#00dcff',
  glowColor: 'rgba(0,220,255,0.60)',
  starColor: '#a855f7',
  treeEmoji: '🌌',
  floorLabel: 'text-cyan-300',
};

// ---------------------------------------------------------------------------
// Ambient particles for space_station type
// ---------------------------------------------------------------------------

const STAR_COUNT = 28;

function StarField() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: STAR_COUNT }).map((_, i) => {
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
// Single isometric plot tile
// ---------------------------------------------------------------------------

interface PlotTileProps {
  member: GroupMemberRow | null;
  plotIndex: number;
  palette: typeof COZY_PALETTE | typeof FUTURISTIC_PALETTE;
  isFuturistic: boolean;
}

function PlotTile({ member, plotIndex, palette, isFuturistic }: PlotTileProps) {
  const TILE_W = 80;
  const TILE_H = 46;
  const DEPTH = 16;

  // 2.5D isometric faces via clip-path skew
  const topFace = `polygon(50% 0%, 100% 25%, 50% 50%, 0% 25%)`;
  const leftFace = `polygon(0% 25%, 50% 50%, 50% 100%, 0% 75%)`;
  const rightFace = `polygon(50% 50%, 100% 25%, 100% 75%, 50% 100%)`;

  const initials = member
    ? member.display_name.slice(0, 2).toUpperCase()
    : null;

  const OccupiedContent = () => (
    <motion.div
      className="absolute inset-0 flex items-start justify-center"
      style={{ paddingTop: TILE_H * 0.15 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20, delay: plotIndex * 0.04 + 0.1 }}
    >
      {/* Avatar chip */}
      <motion.div
        className="relative flex flex-col items-center gap-0.5"
        whileHover={{ y: -4, scale: 1.1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        {/* Glow halo */}
        <div
          className="absolute -inset-1 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: palette.glowColor }}
        />
        {/* Avatar circle */}
        {member?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.avatar_url}
            alt={member.display_name}
            className="w-9 h-9 rounded-full object-cover border-2 relative z-10"
            style={{ borderColor: palette.avatarRing }}
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-800 relative z-10 border-2"
            style={{
              background: isFuturistic
                ? 'linear-gradient(135deg, #1e1060, #0d3060)'
                : 'linear-gradient(135deg, #c4704a, #e8a87c)',
              borderColor: palette.avatarRing,
              color: isFuturistic ? '#00dcff' : '#faf7f2',
            }}
          >
            {initials}
          </div>
        )}
        {/* Name label */}
        <span
          className="text-[9px] font-700 leading-none max-w-[52px] truncate text-center relative z-10"
          style={{ color: isFuturistic ? '#a0e8ff' : '#7a4f3a' }}
        >
          {member?.display_name.split(' ')[0]}
        </span>
        {/* Role pip for admin */}
        {member?.role === 'admin' && (
          <span className="text-[8px] leading-none" title="Admin">
            {isFuturistic ? '⚡' : '⭐'}
          </span>
        )}
      </motion.div>
    </motion.div>
  );

  const EmptyContent = () => (
    <motion.div
      className="absolute inset-0 flex items-start justify-center"
      style={{ paddingTop: TILE_H * 0.18 }}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: plotIndex * 0.15 }}
    >
      <div
        className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]"
        style={{
          borderColor: palette.emptyBorder,
          background: palette.emptyFill,
          color: isFuturistic ? '#00dcff' : '#c4704a',
        }}
      >
        +
      </div>
    </motion.div>
  );

  return (
    <motion.div
      className="relative group"
      style={{ width: TILE_W, height: TILE_H + DEPTH + 48 }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: plotIndex * 0.03, ease: [0.34, 1.2, 0.64, 1] }}
    >
      {/* Top face */}
      <div
        className="absolute inset-x-0 top-0 transition-all duration-200 group-hover:brightness-110"
        style={{
          height: TILE_H,
          clipPath: topFace,
          background: palette.tileBase,
          border: `1px solid ${palette.tileBorder}`,
          boxShadow: member ? `0 0 12px ${palette.tileShadow}` : 'none',
        }}
      />
      {/* Left depth face */}
      <div
        className="absolute"
        style={{
          top: TILE_H * 0.75,
          left: 0,
          width: TILE_W / 2,
          height: DEPTH,
          clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`,
          background: isFuturistic
            ? 'linear-gradient(180deg, rgba(0,100,180,0.5) 0%, rgba(0,60,120,0.8) 100%)'
            : 'linear-gradient(180deg, rgba(180,120,80,0.55) 0%, rgba(120,70,40,0.8) 100%)',
          transform: 'skewY(25deg)',
          transformOrigin: 'top right',
          borderLeft: `1px solid ${palette.tileBorder}`,
        }}
      />
      {/* Right depth face */}
      <div
        className="absolute"
        style={{
          top: TILE_H * 0.75,
          right: 0,
          width: TILE_W / 2,
          height: DEPTH,
          clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`,
          background: isFuturistic
            ? 'linear-gradient(180deg, rgba(0,60,120,0.5) 0%, rgba(0,30,80,0.8) 100%)'
            : 'linear-gradient(180deg, rgba(140,90,60,0.55) 0%, rgba(80,45,25,0.8) 100%)',
          transform: 'skewY(-25deg)',
          transformOrigin: 'top left',
          borderRight: `1px solid ${palette.tileBorder}`,
        }}
      />

      {/* Member content or empty marker */}
      <div className="absolute inset-x-0 top-0" style={{ height: TILE_H + 10 }}>
        {member ? <OccupiedContent /> : <EmptyContent />}
      </div>

      {/* Futuristic: neon edge glow on hover */}
      {isFuturistic && (
        <motion.div
          className="absolute inset-0 rounded-sm pointer-events-none opacity-0 group-hover:opacity-100"
          style={{
            boxShadow: `0 0 20px ${palette.glowColor}, 0 0 40px ${palette.glowColor}`,
            transition: 'opacity 0.25s ease',
          }}
        />
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// GroupMapView — main export
// ---------------------------------------------------------------------------

interface GroupMapViewProps {
  group: GroupRow;
  members: GroupMemberRow[];
}

export function GroupMapView({ group, members }: GroupMapViewProps) {
  const meta = GROUP_TYPE_META[group.type] ?? GROUP_TYPE_META['household'];
  const isFuturistic = meta.palette === 'futuristic';
  const palette = isFuturistic ? FUTURISTIC_PALETTE : COZY_PALETTE;

  // Determine grid dimensions based on capacity scale
  const capacity = Math.min(group.max_members, 48);
  const cols = capacity <= 10 ? 3 : capacity <= 30 ? 4 : capacity <= 75 ? 5 : 6;
  const plotCount = Math.max(members.length + 2, Math.min(capacity, 24));
  const plots = buildGrid(plotCount, cols);

  // Map members onto plots
  const memberMap: Record<number, GroupMemberRow> = {};
  members.forEach((m, i) => {
    memberMap[i] = m;
  });

  // Isometric grid dimensions
  const TILE_W = 80;
  const TILE_H = 46;
  const DEPTH = 16;
  const PAD_X = 48;
  const PAD_Y = 24;

  // Compute grid bounding box
  let maxX = 0;
  let maxY = 0;
  plots.forEach(({ col, row }) => {
    const { x, y } = isoOffset(col, row, TILE_W, TILE_H);
    maxX = Math.max(maxX, x + TILE_W);
    maxY = Math.max(maxY, y + TILE_H + DEPTH + 50);
  });

  // Shift all plots so leftmost tile starts at 0
  const minX = Math.min(...plots.map(({ col, row }) => isoOffset(col, row, TILE_W, TILE_H).x));
  const gridW = maxX - minX + PAD_X * 2;
  const gridH = maxY + PAD_Y * 2;

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden border-2 select-none"
      style={{
        background: palette.bg,
        borderColor: isFuturistic ? 'rgba(0,220,255,0.25)' : 'rgba(232,168,124,0.30)',
        minHeight: 280,
        boxShadow: isFuturistic
          ? '0 0 40px rgba(0,220,255,0.12), 0 20px 60px rgba(0,0,0,0.50)'
          : '0 8px 40px rgba(122,79,58,0.18)',
      }}
    >
      {/* Ambient background effects */}
      {group.type === 'space_station' && <StarField />}

      {/* Cozy: subtle warm fog */}
      {!isFuturistic && (
        <div
          className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(196,112,74,0.18), transparent)' }}
        />
      )}

      {/* Futuristic: scanline overlay */}
      {isFuturistic && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,220,255,1) 4px)',
            backgroundSize: '100% 4px',
          }}
        />
      )}

      {/* Type + theme badge */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-2">
        <span
          className="text-xs font-700 px-3 py-1 rounded-full backdrop-blur-md"
          style={{
            background: isFuturistic ? 'rgba(0,20,40,0.70)' : 'rgba(250,247,242,0.72)',
            color: isFuturistic ? '#00dcff' : '#7a4f3a',
            border: isFuturistic ? '1px solid rgba(0,220,255,0.30)' : '1px solid rgba(196,112,74,0.30)',
          }}
        >
          {meta.emoji} {meta.label}
        </span>
      </div>

      {/* Member count badge */}
      <div className="absolute top-3 right-4 z-20">
        <span
          className="text-xs font-700 px-3 py-1 rounded-full backdrop-blur-md"
          style={{
            background: isFuturistic ? 'rgba(0,20,40,0.70)' : 'rgba(250,247,242,0.72)',
            color: isFuturistic ? '#a855f7' : '#c4704a',
            border: isFuturistic ? '1px solid rgba(168,85,247,0.30)' : '1px solid rgba(196,112,74,0.30)',
          }}
        >
          {members.length} / {group.max_members}
        </span>
      </div>

      {/* Isometric grid canvas */}
      <div
        className="relative mx-auto"
        style={{ width: Math.min(gridW, 600), height: gridH, overflow: 'visible' }}
      >
        {plots.map(({ col, row }, idx) => {
          const { x, y } = isoOffset(col, row, TILE_W, TILE_H);
          const member = memberMap[idx] ?? null;
          return (
            <div
              key={`${col}-${row}`}
              className="absolute"
              style={{
                left: x - minX + PAD_X,
                top: y + PAD_Y,
                zIndex: col + row,
              }}
            >
              <PlotTile
                member={member}
                plotIndex={idx}
                palette={palette}
                isFuturistic={isFuturistic}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

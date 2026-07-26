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
    y: (col + row) * (tileH / 2.2),
  };
}

/** Build a flat list of plot positions for up to `maxPlots` members. */
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
  ground: '#c4956a',
  tileBase: 'linear-gradient(135deg, #fffcf8 0%, #f7ebd9 100%)',
  tileBorder: '#e8a87c',
  tileTop: 'rgba(232,168,124,0.30)',
  tileShadow: 'rgba(122,79,58,0.25)',
  emptyFill: 'rgba(240,192,96,0.18)',
  emptyBorder: '#f0c060',
  avatarRing: '#e8a87c',
  glowColor: 'rgba(240,192,96,0.55)',
  starColor: '#f0c060',
  treeEmoji: '🌲',
};

const FUTURISTIC_PALETTE = {
  bg: 'linear-gradient(160deg, #0a0a1a 0%, #0d1a2e 45%, #0a2040 100%)',
  ground: '#060d1a',
  tileBase: 'linear-gradient(135deg, #0f1d36 0%, #091326 100%)',
  tileBorder: '#00dcff',
  tileTop: 'rgba(60,0,120,0.35)',
  tileShadow: 'rgba(0,220,255,0.25)',
  emptyFill: 'rgba(0,220,255,0.08)',
  emptyBorder: '#00dcff',
  avatarRing: '#00dcff',
  glowColor: 'rgba(0,220,255,0.60)',
  starColor: '#a855f7',
  treeEmoji: '🌌',
};

// ---------------------------------------------------------------------------
// Ambient particles for space_station type
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
// Single isometric plot tile
// ---------------------------------------------------------------------------

interface PlotTileProps {
  member: GroupMemberRow | null;
  plotIndex: number;
  palette: typeof COZY_PALETTE | typeof FUTURISTIC_PALETTE;
  isFuturistic: boolean;
}

function PlotTile({ member, plotIndex, palette, isFuturistic }: PlotTileProps) {
  const TILE_W = 92;
  const TILE_H = 50;
  const DEPTH = 14;

  const initials = member
    ? member.display_name.slice(0, 2).toUpperCase()
    : null;

  return (
    <motion.div
      className="relative group"
      style={{ width: TILE_W, height: TILE_H + DEPTH + 40 }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: plotIndex * 0.03, ease: [0.34, 1.2, 0.64, 1] }}
    >
      {/* 2.5D Top Diamond Face */}
      <div
        className="absolute inset-x-0 top-0 rounded-lg transition-all duration-200 group-hover:brightness-110 shadow-md"
        style={{
          height: TILE_H,
          clipPath: `polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)`,
          background: palette.tileBase,
          border: `1.5px solid ${palette.tileBorder}`,
          boxShadow: `0 4px 12px ${palette.tileShadow}`,
        }}
      />

      {/* 2.5D Left Side Wall */}
      <div
        className="absolute"
        style={{
          top: TILE_H / 2,
          left: 0,
          width: TILE_W / 2,
          height: DEPTH,
          clipPath: `polygon(0% 0%, 100% 50%, 100% 100%, 0% 50%)`,
          background: isFuturistic
            ? 'linear-gradient(180deg, #081428 0%, #030814 100%)'
            : 'linear-gradient(180deg, #d89668 0%, #aa683e 100%)',
        }}
      />

      {/* 2.5D Right Side Wall */}
      <div
        className="absolute"
        style={{
          top: TILE_H / 2,
          right: 0,
          width: TILE_W / 2,
          height: DEPTH,
          clipPath: `polygon(0% 50%, 100% 0%, 100% 50%, 0% 100%)`,
          background: isFuturistic
            ? 'linear-gradient(180deg, #050e1f 0%, #02050c 100%)'
            : 'linear-gradient(180deg, #be7e52 0%, #8c4c24 100%)',
        }}
      />

      {/* Member Content or Plus Badge */}
      <div className="absolute inset-0 flex flex-col items-center justify-start pointer-events-auto">
        {member ? (
          <motion.div
            className="flex flex-col items-center -mt-3.5 z-10"
            whileHover={{ y: -5, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          >
            {/* Avatar Circle */}
            {member.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.avatar_url}
                alt={member.display_name}
                className="w-8 h-8 rounded-full object-cover border-2 shadow-lg"
                style={{ borderColor: palette.avatarRing }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-800 border-2 shadow-lg"
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

            {/* Member Name Tag */}
            <span
              className="text-[9px] font-800 leading-tight max-w-[64px] truncate text-center mt-0.5 px-1 py-0.5 rounded-full backdrop-blur-md shadow-sm border"
              style={{
                background: isFuturistic ? 'rgba(5,12,24,0.85)' : 'rgba(255,252,248,0.90)',
                borderColor: palette.tileBorder,
                color: isFuturistic ? '#a0e8ff' : '#643c28',
              }}
            >
              {member.display_name.split(' ')[0]}
              {member.role === 'admin' && ' 👑'}
            </span>
          </motion.div>
        ) : (
          <div className="mt-2.5 z-10">
            <div
              className="w-5 h-5 rounded-full border-1.5 flex items-center justify-center text-[10px] font-800 shadow-sm"
              style={{
                borderColor: palette.emptyBorder,
                background: palette.emptyFill,
                color: isFuturistic ? '#00dcff' : '#c4704a',
              }}
            >
              +
            </div>
          </div>
        )}
      </div>
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
  const plotCount = Math.max(members.length + 1, Math.min(capacity, 24));
  const plots = buildGrid(plotCount, cols);

  // Map members onto plots
  const memberMap: Record<number, GroupMemberRow> = {};
  members.forEach((m, i) => {
    memberMap[i] = m;
  });

  // Isometric grid dimensions
  const TILE_W = 92;
  const TILE_H = 50;
  const PAD_X = 24;
  const PAD_Y = 32;

  // Compute bounding box
  const minX = Math.min(...plots.map(({ col, row }) => isoOffset(col, row, TILE_W, TILE_H).x));
  const maxX = Math.max(...plots.map(({ col, row }) => isoOffset(col, row, TILE_W, TILE_H).x)) + TILE_W;
  const maxY = Math.max(...plots.map(({ col, row }) => isoOffset(col, row, TILE_W, TILE_H).y)) + TILE_H + 50;

  const canvasW = maxX - minX + PAD_X * 2;
  const canvasH = maxY + PAD_Y * 2;

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden border-2 select-none"
      style={{
        background: palette.bg,
        borderColor: isFuturistic ? 'rgba(0,220,255,0.25)' : 'rgba(232,168,124,0.30)',
        minHeight: Math.max(canvasH, 280),
        boxShadow: isFuturistic
          ? '0 0 40px rgba(0,220,255,0.12), 0 20px 60px rgba(0,0,0,0.50)'
          : '0 8px 40px rgba(122,79,58,0.18)',
      }}
    >
      {/* Background particle effects */}
      {group.type === 'space_station' && <StarField />}

      {/* Type badge */}
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
        </span>
      </div>

      {/* Member count badge */}
      <div className="absolute top-3 right-4 z-20">
        <span
          className="text-xs font-800 px-3 py-1 rounded-full backdrop-blur-md shadow-sm"
          style={{
            background: isFuturistic ? 'rgba(0,20,40,0.75)' : 'rgba(255,252,248,0.85)',
            color: isFuturistic ? '#a855f7' : '#c4704a',
            border: isFuturistic ? '1px solid rgba(168,85,247,0.30)' : '1px solid rgba(196,112,74,0.30)',
          }}
        >
          {members.length} / {group.max_members}
        </span>
      </div>

      {/* Isometric Canvas */}
      <div
        className="relative mx-auto flex items-center justify-center pt-8 pb-4"
        style={{ width: canvasW, height: canvasH }}
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
                zIndex: col + row * 2,
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

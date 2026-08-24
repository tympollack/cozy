'use client';

import { motion } from 'framer-motion';
import type { PlotSize } from '@/components/UserPlotNode';

interface VacantPlotNodeProps {
  plotSize: PlotSize;
  isFuturistic: boolean;
  onClick?: () => void;
}

const FONT_SIZE: Record<PlotSize, number> = { lg: 11, md: 10, sm: 9 };
const RING_W:    Record<PlotSize, number> = { lg: 64, md: 50, sm: 42 };

export function VacantPlotNode({ plotSize, isFuturistic, onClick }: VacantPlotNodeProps) {
  const fs = FONT_SIZE[plotSize];
  const rw = RING_W[plotSize];

  const pillBg     = isFuturistic ? 'rgba(0,20,40,0.88)'     : 'rgba(255,252,248,0.92)';
  const pillColor  = isFuturistic ? '#00dcff'                 : '#b45309';
  const pillBorder = isFuturistic ? 'rgba(0,220,255,0.65)'   : 'rgba(240,192,96,0.65)';
  const subColor   = isFuturistic ? '#60a0c0'                 : '#78350f';
  const ringBorder = isFuturistic ? 'rgba(0,220,255,0.55)'   : 'rgba(217,119,54,0.45)';
  const ringGlow   = isFuturistic ? 'rgba(0,220,255,0.18)'   : 'rgba(254,243,199,0.28)';

  return (
    <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={onClick}>
      {/* Glowing dashed ground ring */}
      <div
        className="iso-plot-glow rounded-full"
        style={{
          width: rw,
          height: Math.round(rw * 0.35),
          border: `1.5px dashed ${ringBorder}`,
          background: `radial-gradient(ellipse, ${ringGlow} 0%, transparent 75%)`,
          boxShadow: `0 0 10px 2px ${ringGlow}`,
        }}
        aria-hidden
      />

      {/* + Invite glass pill (floats just above the ground ring) */}
      <motion.button
        className="relative -mt-4 z-10 rounded-2xl flex items-center gap-1 font-black shadow-lg backdrop-blur-md border cursor-pointer"
        style={{
          fontSize: fs,
          paddingInline: '10px',
          paddingBlock: '4px',
          background: pillBg,
          color: pillColor,
          borderColor: pillBorder,
        }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        aria-label="Open invite"
      >
        <span className="text-xs leading-none">{isFuturistic ? '🛸' : '🏡'}</span>
        <span>+ Invite</span>
      </motion.button>

      {/* Subtext */}
      <span className="font-bold opacity-70" style={{ fontSize: fs - 1, color: subColor }}>
        Vacant Plot
      </span>
    </div>
  );
}

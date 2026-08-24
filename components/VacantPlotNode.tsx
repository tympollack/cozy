'use client';

import { motion } from 'framer-motion';
import type { PlotSize } from '@/components/UserPlotNode';
import { Plus } from 'lucide-react';

interface VacantPlotNodeProps {
  plotSize: PlotSize;
  isFuturistic: boolean;
  onClick?: () => void;
}

const RING_W: Record<PlotSize, number> = { lg: 52, md: 42, sm: 34 };
const BADGE_SIZE: Record<PlotSize, number> = { lg: 20, md: 18, sm: 16 };

export function VacantPlotNode({ plotSize, isFuturistic, onClick }: VacantPlotNodeProps) {
  const rw = RING_W[plotSize];
  const bs = BADGE_SIZE[plotSize];

  const ringBorder = isFuturistic ? 'rgba(0,220,255,0.25)'   : 'rgba(160,110,60,0.22)';
  const ringGlow   = isFuturistic ? 'rgba(0,220,255,0.06)'   : 'rgba(217,119,54,0.08)';
  const badgeBg    = isFuturistic ? 'rgba(0,20,40,0.60)'     : 'rgba(255,252,248,0.65)';
  const badgeBorder= isFuturistic ? 'rgba(0,220,255,0.35)'   : 'rgba(180,130,80,0.30)';
  const badgeColor = isFuturistic ? 'rgba(0,220,255,0.70)'   : 'rgba(120,53,15,0.60)';

  return (
    <motion.div
      className="group flex flex-col items-center justify-center cursor-pointer select-none relative opacity-60 hover:opacity-100 transition-opacity duration-200"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
      title="Vacant plot — tap to invite"
      aria-label="Vacant plot"
    >
      {/* Subtle dashed ground ring */}
      <div
        className="rounded-full transition-all duration-200 group-hover:border-opacity-60"
        style={{
          width: rw,
          height: Math.round(rw * 0.40),
          border: `1.5px dashed ${ringBorder}`,
          background: `radial-gradient(ellipse, ${ringGlow} 0%, transparent 80%)`,
        }}
        aria-hidden
      />

      {/* Discreet small + badge centered on the plot */}
      <div
        className="absolute rounded-full flex items-center justify-center backdrop-blur-xs border shadow-xs transition-all duration-200 group-hover:scale-110"
        style={{
          width: bs,
          height: bs,
          background: badgeBg,
          borderColor: badgeBorder,
          color: badgeColor,
        }}
      >
        <Plus size={Math.round(bs * 0.55)} strokeWidth={2.5} />
      </div>
    </motion.div>
  );
}


'use client';

import React, { useState } from 'react';
import { useCozyStore } from '@/store/useCozyStore';
import { VibeCheckModal } from '@/components/VibeCheckModal';

const VIBE_META: Record<string, { emoji: string; label: string; bg: string }> = {
  sunshine: {
    emoji: '☀️',
    label: 'Sunshine',
    bg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-600/50',
  },
  neutral: {
    emoji: '☕',
    label: 'Cozy',
    bg: 'bg-orange-50 dark:bg-orange-950/60 text-stone-900 dark:text-orange-200 border-orange-200 dark:border-orange-600/40',
  },
  raincloud: {
    emoji: '🌧️',
    label: 'Raincloud',
    bg: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-600',
  },
};

export function VibePill() {
  const { vibeStatus } = useCozyStore();
  const [isOpen, setIsOpen] = useState(false);

  const meta = VIBE_META[vibeStatus] || VIBE_META.neutral;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-800 transition-all hover:scale-105 active:scale-95 shadow-sm ${meta.bg}`}
        title="Daily Vibe Check · Update your space weather"
      >
        <span>{meta.emoji}</span>
        <span className="hidden sm:inline">{meta.label}</span>
      </button>

      <VibeCheckModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

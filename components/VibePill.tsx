'use client';

import React, { useState } from 'react';
import { useCozyStore } from '@/store/useCozyStore';
import { VibeCheckModal } from '@/components/VibeCheckModal';

const VIBE_META: Record<string, { emoji: string; label: string; bg: string }> = {
  sunshine: { emoji: '☀️', label: 'Sunshine', bg: 'bg-amber-100/90 text-amber-900 border-amber-300' },
  neutral: { emoji: '☕', label: 'Cozy', bg: 'bg-amber-50 text-amber-900 border-amber-200' },
  raincloud: { emoji: '🌧️', label: 'Raincloud', bg: 'bg-slate-200 text-slate-800 border-slate-300' },
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

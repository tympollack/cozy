'use client';

import React, { useState, useEffect } from 'react';
import { useCozyStore } from '@/store/useCozyStore';
import { VibeCheckModal } from '@/components/VibeCheckModal';
import { createBrowserClient } from '@/lib/supabase-browser';

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
  const { vibeStatus, lastVibeCheckDate, isVibeCheckDue } = useCozyStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const checkInDue = mounted && isVibeCheckDue();
  const meta = VIBE_META[vibeStatus] || VIBE_META.neutral;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`relative flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-800 transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer ${
          checkInDue
            ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 text-amber-950 dark:text-amber-200 border-amber-400/60 dark:border-amber-500/50 shadow-amber-500/10'
            : meta.bg
        }`}
        title={
          checkInDue
            ? 'Daily Vibe Check · Check in your space weather for today'
            : 'Daily Vibe Check · Update your space weather'
        }
      >
        {checkInDue ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>✨</span>
            <span className="hidden sm:inline">Daily Vibe</span>
          </>
        ) : (
          <>
            <span>{meta.emoji}</span>
            <span className="hidden sm:inline">{meta.label}</span>
          </>
        )}
      </button>

      <VibeCheckModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sun, Moon, Sparkles, Check, ArrowRight } from 'lucide-react';
import { getDailyCircadianStatus, DailyCircadianStatusResult } from '@/app/actions/notificationActions';

interface CircadianProgressPillProps {
  initialLightCompleted?: boolean;
  initialDarkCompleted?: boolean;
  className?: string;
}

export function CircadianProgressPill({
  initialLightCompleted = false,
  initialDarkCompleted = false,
  className = '',
}: CircadianProgressPillProps) {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<DailyCircadianStatusResult>({
    success: true,
    lightCompleted: initialLightCompleted,
    darkCompleted: initialDarkCompleted,
    bothCompleted: initialLightCompleted && initialDarkCompleted,
    currentPhase: 'light',
    clientLocalHour: 12,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const clientOffset = -new Date().getTimezoneOffset();
    getDailyCircadianStatus(clientOffset)
      .then((res) => {
        if (res.success) {
          setStatus(res);
        }
      })
      .catch((err) => {
        console.warn('[CircadianProgressPill] Status fetch error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (!mounted) {
    return (
      <div className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-full bg-white/40 dark:bg-stone-900/40 backdrop-blur-sm border border-amber-500/20 text-xs ${className}`}>
        <span className="opacity-0">Loading...</span>
      </div>
    );
  }

  const { lightCompleted, darkCompleted, bothCompleted, currentPhase } = status;

  return (
    <div
      role="region"
      aria-label="Daily circadian space check-in status"
      className={`inline-flex flex-wrap items-center justify-center gap-2 p-1.5 sm:p-2 rounded-2xl bg-white/70 dark:bg-stone-900/70 border border-amber-300/40 dark:border-amber-700/30 shadow-sm backdrop-blur-md transition-all ${className}`}
    >
      {/* Light Mode Pill */}
      {lightCompleted ? (
        <div
          data-testid="circadian-light-completed"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-800 bg-amber-100/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300/60 shadow-xs"
        >
          <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
            <Check size={10} strokeWidth={3} />
          </div>
          <span>☀️ Light Done</span>
        </div>
      ) : (
        <Link
          href="/camera?mode=light"
          data-testid="circadian-light-pending"
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-700 transition-all cursor-pointer active:scale-95 ${
            currentPhase === 'light'
              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-sm animate-pulse'
              : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-400/30'
          }`}
        >
          <Sun size={13} className={currentPhase === 'light' ? 'text-stone-950' : 'text-amber-600 dark:text-amber-400'} />
          <span>Morning Light (+25)</span>
          <ArrowRight size={12} className="opacity-70" />
        </Link>
      )}

      {/* Dark Mode Pill */}
      {darkCompleted ? (
        <div
          data-testid="circadian-dark-completed"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-800 bg-indigo-100/90 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-300/60 shadow-xs"
        >
          <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
            <Check size={10} strokeWidth={3} />
          </div>
          <span>🌙 Dark Done</span>
        </div>
      ) : (
        <Link
          href="/camera?mode=dark"
          data-testid="circadian-dark-pending"
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-700 transition-all cursor-pointer active:scale-95 ${
            currentPhase === 'dark'
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm animate-pulse'
              : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-800 dark:text-indigo-300 border border-indigo-400/30'
          }`}
        >
          <Moon size={13} className={currentPhase === 'dark' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'} />
          <span>Evening Glow (+50)</span>
          <ArrowRight size={12} className="opacity-70" />
        </Link>
      )}

      {/* Bonus / Dual Complete Sparkle */}
      {bothCompleted && (
        <div
          data-testid="circadian-both-completed"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-800 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40 text-amber-800 dark:text-amber-200"
        >
          <Sparkles size={12} className="text-amber-500 animate-spin-slow" />
          <span>Dual Mode Complete ✨ (+75 pts)</span>
        </div>
      )}
    </div>
  );
}

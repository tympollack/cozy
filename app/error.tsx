'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, RefreshCw, AlertTriangle, Users } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError] Uncaught boundary error:', error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 text-center overflow-hidden relative pb-20"
      style={{
        background: 'linear-gradient(160deg, #faf7f2 0%, #f5ede0 60%, #ede0cc 100%)',
      }}
    >
      <div className="relative z-10 w-full max-w-md p-8 rounded-3xl cozy-glass border border-[--cozy-amber]/30 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-zinc-800 flex items-center justify-center text-3xl mx-auto shadow-inner border border-amber-300/40">
          ✨
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-800 tracking-wider text-amber-950 bg-amber-400/70 border border-amber-500/30 uppercase">
            <AlertTriangle size={12} className="text-amber-800" />
            <span>Temporary Glitch</span>
          </div>
          <h1 className="text-xl font-800 text-[--cozy-bark] leading-tight">
            Something Paused
          </h1>
          <p className="text-xs text-[--cozy-muted] max-w-xs mx-auto leading-relaxed">
            Cozy encountered a temporary state mismatch while loading this view. You can reload or return home.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-800 text-white shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, var(--cozy-rust), var(--cozy-amber))',
            }}
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>

          <Link
            href="/feed"
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-700 text-[--cozy-bark] bg-white/70 hover:bg-white border border-[--cozy-amber]/30 transition-all shadow-sm"
          >
            <Home size={14} className="text-[--cozy-rust]" />
            <span>Return to Community Feed</span>
          </Link>

          <Link
            href="/groups"
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl text-xs font-600 text-[--cozy-muted] hover:text-[--cozy-bark] transition-colors"
          >
            <Users size={13} />
            <span>Explore Groups</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

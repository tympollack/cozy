'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Users, ArrowLeft, Sparkles, Compass } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 text-center overflow-hidden relative"
      style={{
        background: 'linear-gradient(160deg, #faf7f2 0%, #f5ede0 60%, #ede0cc 100%)',
      }}
    >
      {/* Decorative ambient backdrop glows */}
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none -top-20 -left-20 opacity-50"
        style={{ background: 'radial-gradient(circle, rgba(240,192,96,0.35) 0%, transparent 70%)' }}
      />
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20 opacity-50"
        style={{ background: 'radial-gradient(circle, rgba(196,112,74,0.30) 0%, transparent 70%)' }}
      />

      {/* Main 404 Glass Card */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 rounded-3xl cozy-glass border border-[--cozy-amber]/30 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Floating 2.5D Cozy House Icon */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-xl border border-amber-300/40 animate-bounce"
            style={{
              background: 'linear-gradient(135deg, #f0c060 0%, #e8a87c 100%)',
              animationDuration: '3s',
            }}
          >
            🏡
          </div>
          <div className="absolute -bottom-2 w-16 h-3 bg-black/15 rounded-full blur-sm" />
        </div>

        {/* Badge & Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-800 tracking-wider text-amber-950 bg-amber-400/80 border border-amber-500/40 shadow-sm uppercase">
            <Sparkles size={13} className="fill-amber-950" />
            <span>404 — Page Not Found</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-800 text-[--cozy-bark] leading-tight">
            This Nook Doesn&apos;t Exist
          </h1>

          <p className="text-xs sm:text-sm font-500 text-[--cozy-muted] max-w-xs mx-auto leading-relaxed">
            The room, group, or space you are looking for may have been moved, unassigned, or hasn&apos;t been built yet.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <Link
            href="/feed"
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-800 text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 border border-amber-600/40"
            style={{
              background: 'linear-gradient(135deg, var(--cozy-rust), var(--cozy-amber))',
              boxShadow: '0 4px 16px rgba(196,112,74,0.35)',
            }}
          >
            <Home size={16} />
            <span>Return to Community Feed</span>
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/groups"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-700 text-[--cozy-bark] bg-white/70 hover:bg-white border border-[--cozy-amber]/30 transition-all shadow-sm"
            >
              <Users size={14} className="text-[--cozy-rust]" />
              <span>Explore Groups</span>
            </Link>

            <button
              onClick={() => router.back()}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-700 text-[--cozy-bark] bg-white/70 hover:bg-white border border-[--cozy-amber]/30 transition-all shadow-sm"
            >
              <ArrowLeft size={14} className="text-[--cozy-rust]" />
              <span>Go Back</span>
            </button>
          </div>
        </div>

        {/* Footer brand note */}
        <div className="pt-2 flex items-center justify-center gap-1 text-[11px] font-600 text-[--cozy-muted]/70">
          <Compass size={12} />
          <span>Cozy App · Share Your Living Space</span>
        </div>
      </div>
    </div>
  );
}

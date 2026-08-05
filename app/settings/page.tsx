'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Moon, Sun, Monitor, Settings as SettingsIcon,
  Shield, Bell, Sparkles, LogOut, Trash2, CheckCircle
} from 'lucide-react';
import { useCozyStore } from '@/store/useCozyStore';
import { createBrowserClient } from '@/lib/supabase-browser';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const points = useCozyStore((s) => s.points);
  const groupNotifications = useCozyStore((s) => s.groupNotifications);
  const toggleGroupNotifications = useCozyStore((s) => s.toggleGroupNotifications);

  const [privacyTier, setPrivacyTier] = useState<'geofenced' | 'random'>('geofenced');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    localStorage.clear();
    router.push('/login');
  };

  const handleClearCache = () => {
    localStorage.removeItem('cozy-store');
    setStatusMsg('Local cache cleared! Refreshing...');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  if (!mounted) return null;

  return (
    <div
      className="min-h-screen px-4 py-8 pb-20"
      style={{ background: 'linear-gradient(180deg, #faf7f2 0%, #f5ede0 100%)' }}
    >
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-full bg-white/80 dark:bg-zinc-800/80 hover:bg-white border border-[--cozy-amber]/30 text-[--cozy-bark] shadow-sm transition-all"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-800 text-[--cozy-bark] flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-[--cozy-rust]" />
              App Settings
            </h1>
            <p className="text-xs text-[--cozy-muted]">Customize your Cozy environment & preferences</p>
          </div>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-700">
            <CheckCircle size={16} />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* ── 1. Appearance / Theme Section ────────────────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 border border-[--cozy-amber]/30 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-[--cozy-amber]/20 pb-3">
            <Sparkles className="w-5 h-5 text-[--cozy-gold]" />
            <h2 className="text-sm font-800 text-[--cozy-bark] uppercase tracking-wider">
              Appearance & Theme
            </h2>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-600 text-[--cozy-muted]">
              Choose how Cozy displays on your screen. Light & Dark photos in the feed match your theme!
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-700 transition-all ${
                  theme === 'light'
                    ? 'bg-amber-400 text-stone-950 border-amber-500 shadow-md font-800'
                    : 'bg-white/60 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-white'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span>Light</span>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-700 transition-all ${
                  theme === 'dark'
                    ? 'bg-stone-900 text-amber-300 border-stone-700 shadow-md font-800'
                    : 'bg-white/60 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-white'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span>Dark</span>
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-700 transition-all ${
                  theme === 'system'
                    ? 'bg-[--cozy-rust] text-white border-amber-600 shadow-md font-800'
                    : 'bg-white/60 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-white'
                }`}
              >
                <Monitor className="w-5 h-5" />
                <span>System</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── 2. Group & Notification Settings ─────────────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 border border-[--cozy-amber]/30 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-[--cozy-amber]/20 pb-3">
            <Bell className="w-5 h-5 text-[--cozy-rust]" />
            <h2 className="text-sm font-800 text-[--cozy-bark] uppercase tracking-wider">
              Group Peer Notifications
            </h2>
          </div>

          <p className="text-xs text-[--cozy-muted]">
            Manage peer support check-in alerts when group members log a raincloud vibe check.
          </p>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border border-white/20">
            <div>
              <p className="text-xs font-700 text-[--cozy-bark]">Group Vibe Alerts</p>
              <p className="text-[10px] text-[--cozy-muted]">Receive notifications for your active group</p>
            </div>

            <button
              onClick={() => toggleGroupNotifications('default_group')}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                (groupNotifications['default_group'] ?? true) ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                  (groupNotifications['default_group'] ?? true) ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* ── 3. Privacy & Location ────────────────────────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 border border-[--cozy-amber]/30 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-[--cozy-amber]/20 pb-3">
            <Shield className="w-5 h-5 text-[--cozy-rust]" />
            <h2 className="text-sm font-800 text-[--cozy-bark] uppercase tracking-wider">
              Privacy & Geohashing
            </h2>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-[--cozy-muted]">
              Cozy NEVER stores exact lat/lng. Location is obfuscated into a ~45km geohash grid before saving.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPrivacyTier('geofenced')}
                className={`p-3 rounded-2xl border text-left text-xs space-y-1 transition-all ${
                  privacyTier === 'geofenced'
                    ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-700'
                    : 'bg-white/40 border-zinc-200 text-zinc-600'
                }`}
              >
                <p className="font-800">Geofenced (~45km)</p>
                <p className="text-[10px] opacity-80">Local area community feed</p>
              </button>

              <button
                onClick={() => setPrivacyTier('random')}
                className={`p-3 rounded-2xl border text-left text-xs space-y-1 transition-all ${
                  privacyTier === 'random'
                    ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-700'
                    : 'bg-white/40 border-zinc-200 text-zinc-600'
                }`}
              >
                <p className="font-800">Random Pool</p>
                <p className="text-[10px] opacity-80">Global randomized spaces</p>
              </button>
            </div>
          </div>
        </section>

        {/* ── 4. Storage & Session Controls ────────────────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 border border-[--cozy-amber]/30 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-800 text-[--cozy-bark]">Your Cozy Balance</p>
              <p className="text-sm font-800 text-amber-600">✨ {points} Points Earned</p>
            </div>

            <button
              onClick={handleClearCache}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-700 bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300"
            >
              <Trash2 size={12} /> Clear Cache
            </button>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-800 text-xs bg-red-600 text-white hover:bg-red-700 shadow-md transition-all active:scale-95"
          >
            <LogOut size={16} /> Sign Out of Cozy
          </button>
        </section>
      </div>
    </div>
  );
}

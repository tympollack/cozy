'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Moon, Sun, Monitor, Settings as SettingsIcon,
  Shield, Bell, Sparkles, LogOut, Trash2, CheckCircle,
  ExternalLink, Key, Check, Compass, User, RefreshCw, Hexagon
} from 'lucide-react';
import { useCozyStore } from '@/store/useCozyStore';
import { createBrowserClient } from '@/lib/supabase-browser';
import { getHubBaseUrl } from '@/lib/env';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const points = useCozyStore((s) => s.points);
  const milestoneTokens = useCozyStore((s) => s.milestoneTokens);
  const expansionTier = useCozyStore((s) => s.expansionTier);
  const groupNotifications = useCozyStore((s) => s.groupNotifications);
  const toggleGroupNotifications = useCozyStore((s) => s.toggleGroupNotifications);

  const [privacyTier, setPrivacyTier] = useState<'geofenced' | 'random'>('geofenced');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('Citizen');
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Auth code request state (mirrors Hub options)
  const [requestCodeSubmitted, setRequestCodeSubmitted] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchUser = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email ?? null);
          setUserId(user.id);
          const name = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Citizen';
          setDisplayName(name);
        }
      } catch (err) {
        console.warn('[Settings] Error fetching user profile:', err);
      }
    };
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setStatusMsg('Signing out...');
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
      localStorage.clear();
      window.location.href = '/login';
    } catch (err) {
      console.error('[Settings] Sign out error:', err);
      window.location.href = '/login';
    }
  };

  const handleClearCache = () => {
    localStorage.removeItem('cozy-store');
    setStatusMsg('Local cache cleared! Refreshing app state...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleRequestUserCode = () => {
    setIsRequestingCode(true);
    setTimeout(() => {
      setRequestCodeSubmitted(true);
      setIsRequestingCode(false);
      setStatusMsg('Auth code request logged for review by ecosystem admins.');
    }, 600);
  };

  const hubUrl = mounted ? getHubBaseUrl() : 'https://hub.sunshade.icu';

  const tierNames: Record<number, string> = {
    1: 'Corner Nook',
    2: 'Cozy Cottage',
    3: 'Grand Estate',
  };

  if (!mounted) return null;

  return (
    <div
      className="min-h-screen px-4 py-8 pb-28"
      style={{ background: 'linear-gradient(180deg, #faf7f2 0%, #f5ede0 100%)' }}
    >
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-full bg-white/80 dark:bg-zinc-800/80 hover:bg-white text-[--cozy-bark] border border-[--cozy-amber]/30 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-800 text-[--cozy-bark] flex items-center gap-2">
                  <SettingsIcon className="w-6 h-6 text-[--cozy-rust]" />
                  Settings & Hub Options
                </h1>
              </div>
              <p className="text-xs text-[--cozy-muted]">Customize your Cozy environment & SunShade ecosystem preferences</p>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-700 shadow-sm animate-in fade-in">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* ── 1. Citizen Profile & Ecosystem Identity Card ──────────────── */}
        <section className="cozy-glass rounded-3xl p-6 border border-[--cozy-amber]/30 shadow-md space-y-5">
          <div className="flex items-center justify-between border-b border-[--cozy-amber]/20 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[--cozy-rust]" />
              <h2 className="text-sm font-800 text-[--cozy-bark] uppercase tracking-wider">
                Citizen Account
              </h2>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-amber-900 bg-amber-200/80 border border-amber-400/50">
              <Compass size={11} className="text-amber-800" />
              SunShade SSO
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-extrabold text-2xl shadow-md border-2 border-amber-300/40 shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-800 text-[--cozy-bark] truncate">
                {displayName}
              </h3>
              <p className="text-xs font-500 text-[--cozy-muted] truncate">
                {userEmail || 'Authenticated Citizen'}
              </p>
              {userId && (
                <p className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                  ID: {userId.slice(0, 12)}...
                </p>
              )}
            </div>
          </div>

          {/* Economy & Expansion Stats */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-zinc-800/70 border border-amber-200/50 text-center">
              <span className="text-[10px] font-700 text-[--cozy-muted] block uppercase">Cozy Balance</span>
              <span className="text-sm font-800 text-amber-600 block mt-0.5">✨ {points}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-zinc-800/70 border border-amber-200/50 text-center">
              <span className="text-[10px] font-700 text-[--cozy-muted] block uppercase">Tokens</span>
              <span className="text-sm font-800 text-emerald-600 block mt-0.5">🪴 {milestoneTokens}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-zinc-800/70 border border-amber-200/50 text-center">
              <span className="text-[10px] font-700 text-[--cozy-muted] block uppercase">Shell Tier</span>
              <span className="text-xs font-800 text-[--cozy-bark] block mt-0.5 truncate" title={tierNames[expansionTier] || 'Corner'}>
                {tierNames[expansionTier] || 'Tier 1'}
              </span>
            </div>
          </div>

          {/* Link to central SunShade Hub */}
          <div className="pt-2 border-t border-[--cozy-amber]/20">
            <a
              href={`${hubUrl}/dashboard`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs font-700 transition-all group"
            >
              <div className="flex items-center gap-2">
                <Hexagon size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Open Central SunShade Hub Dashboard</span>
              </div>
              <ExternalLink size={14} className="text-amber-700 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </section>

        {/* ── 2. Appearance & Theme ────────────────────────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 border border-[--cozy-amber]/30 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-[--cozy-amber]/20 pb-3">
            <Sparkles className="w-5 h-5 text-[--cozy-gold]" />
            <h2 className="text-sm font-800 text-[--cozy-bark] uppercase tracking-wider">
              Appearance & Atmosphere
            </h2>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-500 text-[--cozy-muted]">
              Choose how Cozy displays. Photos automatically synchronize their lighting (Day vs. Evening) to match your selected atmosphere!
            </p>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-700 transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-amber-400 text-stone-950 border-amber-500 shadow-md font-800 scale-102'
                    : 'bg-white/60 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-white'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span>Light</span>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-700 transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-stone-900 text-amber-300 border-stone-700 shadow-md font-800 scale-102'
                    : 'bg-white/60 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-white'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span>Dark</span>
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-700 transition-all cursor-pointer ${
                  theme === 'system'
                    ? 'bg-[--cozy-rust] text-white border-amber-600 shadow-md font-800 scale-102'
                    : 'bg-white/60 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-white'
                }`}
              >
                <Monitor className="w-5 h-5" />
                <span>System</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── 3. SunShade Auth Code & Cross-Device Access ────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 border border-[--cozy-amber]/30 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-[--cozy-amber]/20 pb-3">
            <Key className="w-5 h-5 text-[--cozy-rust]" />
            <h2 className="text-sm font-800 text-[--cozy-bark] uppercase tracking-wider">
              Cross-Device Auth Code
            </h2>
          </div>

          <p className="text-xs font-500 text-[--cozy-muted] leading-relaxed">
            Request an 8-character activation code to sign in to Cozy or the SunShade Hub on another device without using magic links.
          </p>

          {requestCodeSubmitted ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-800 block">Auth Code Request Logged</span>
                <span className="text-[11px] opacity-80 block">An admin will issue your activation code via the Hub portal.</span>
              </div>
            </div>
          ) : (
            <button
              onClick={handleRequestUserCode}
              disabled={isRequestingCode}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-800 text-xs bg-amber-500 hover:bg-amber-600 active:scale-95 text-amber-950 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Key size={14} />
              <span>{isRequestingCode ? 'Submitting Request...' : 'Request 8-Char Auth Code'}</span>
            </button>
          )}
        </section>

        {/* ── 4. Group & Peer Support Notifications ─────────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 border border-[--cozy-amber]/30 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-[--cozy-amber]/20 pb-3">
            <Bell className="w-5 h-5 text-[--cozy-rust]" />
            <h2 className="text-sm font-800 text-[--cozy-bark] uppercase tracking-wider">
              Group Peer Notifications
            </h2>
          </div>

          <p className="text-xs font-500 text-[--cozy-muted]">
            Manage peer support check-in alerts when group members log a raincloud vibe check.
          </p>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/60 dark:bg-zinc-800/60 border border-white/20">
            <div>
              <p className="text-xs font-700 text-[--cozy-bark]">Group Vibe Support Alerts</p>
              <p className="text-[10px] text-[--cozy-muted]">Receive cheer reminders for your active living spaces</p>
            </div>

            <button
              onClick={() => toggleGroupNotifications('default_group')}
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                (groupNotifications['default_group'] ?? true) ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
              aria-label="Toggle group vibe notifications"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                  (groupNotifications['default_group'] ?? true) ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* ── 5. Privacy & Location Obfuscation ─────────────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 border border-[--cozy-amber]/30 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-[--cozy-amber]/20 pb-3">
            <Shield className="w-5 h-5 text-[--cozy-rust]" />
            <h2 className="text-sm font-800 text-[--cozy-bark] uppercase tracking-wider">
              Privacy & Geohashing
            </h2>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-500 text-[--cozy-muted]">
              Cozy NEVER stores exact coordinates. Location data is obfuscated into a ~45km geohash cell before saving.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setPrivacyTier('geofenced')}
                className={`p-3 rounded-2xl border text-left text-xs space-y-1 transition-all cursor-pointer ${
                  privacyTier === 'geofenced'
                    ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-700 shadow-sm'
                    : 'bg-white/40 border-zinc-200 text-zinc-600'
                }`}
              >
                <p className="font-800">Geofenced (~45km)</p>
                <p className="text-[10px] opacity-80">Local area community feed</p>
              </button>

              <button
                onClick={() => setPrivacyTier('random')}
                className={`p-3 rounded-2xl border text-left text-xs space-y-1 transition-all cursor-pointer ${
                  privacyTier === 'random'
                    ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-700 shadow-sm'
                    : 'bg-white/40 border-zinc-200 text-zinc-600'
                }`}
              >
                <p className="font-800">Random Pool</p>
                <p className="text-[10px] opacity-80">Global randomized spaces</p>
              </button>
            </div>
          </div>
        </section>

        {/* ── 6. Storage & Session Controls (Sign Out) ─────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 border border-[--cozy-amber]/30 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-[--cozy-amber]/20 pb-3">
            <div className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-[--cozy-rust]" />
              <h2 className="text-sm font-800 text-[--cozy-bark] uppercase tracking-wider">
                Session & Storage
              </h2>
            </div>

            <button
              onClick={handleClearCache}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-700 bg-white/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-white border border-zinc-200/80 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 size={12} /> Clear Cache
            </button>
          </div>

          <p className="text-xs text-[--cozy-muted]">
            Logging out clears your active session and redirects you to the authentication portal.
          </p>

          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl font-800 text-xs bg-red-600 hover:bg-red-700 text-white shadow-md transition-all hover:scale-[1.01] active:scale-95 cursor-pointer disabled:opacity-60"
          >
            {isSigningOut ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <LogOut size={16} />
                <span>Sign Out of Cozy</span>
              </>
            )}
          </button>
        </section>
      </div>
    </div>
  );
}

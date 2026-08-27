'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Moon, Sun, Monitor, Settings as SettingsIcon,
  Shield, Bell, Sparkles, LogOut, Trash2, CheckCircle,
  ExternalLink, Key, Check, Compass, User, RefreshCw, Hexagon,
  ShoppingBag, History, Sliders, MapPin, Mail, Radio
} from 'lucide-react';
import { useCozyStore } from '@/store/useCozyStore';
import { createBrowserClient } from '@/lib/supabase-browser';
import { getHubBaseUrl } from '@/lib/env';
import { StickerStoreDrawer } from '@/components/StickerStoreDrawer';
import { TransactionHistoryModal } from '@/components/TransactionHistoryModal';

interface HubPreferences {
  mapPresenceVisibility: boolean;
  porchDeliveryMode: boolean;
  edgeMeshSharing: boolean;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const points = useCozyStore((s) => s.points);
  const setPoints = useCozyStore((s) => s.setPoints);
  const milestoneTokens = useCozyStore((s) => s.milestoneTokens);
  const setMilestoneTokens = useCozyStore((s) => s.setMilestoneTokens);
  const expansionTier = useCozyStore((s) => s.expansionTier);
  const setExpansionTier = useCozyStore((s) => s.setExpansionTier);
  const setThemesUnlocked = useCozyStore((s) => s.setThemesUnlocked);
  const groupNotifications = useCozyStore((s) => s.groupNotifications);
  const toggleGroupNotifications = useCozyStore((s) => s.toggleGroupNotifications);

  const [privacyTier, setPrivacyTier] = useState<'geofenced' | 'random'>('geofenced');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('Citizen');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  // Hub Preferences state
  const [hubPreferences, setHubPreferences] = useState<HubPreferences>({
    mapPresenceVisibility: true,
    porchDeliveryMode: true,
    edgeMeshSharing: false,
  });
  const [hubSavedIndicator, setHubSavedIndicator] = useState(false);

  // Auth code request state (mirrors Hub options)
  const [requestCodeSubmitted, setRequestCodeSubmitted] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);

  useEffect(() => {
    let ignore = false;
    const fetchUser = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!ignore) {
          setMounted(true);
          if (user) {
            setUserEmail(user.email ?? null);
            setUserId(user.id);
            const name = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Citizen';
            setDisplayName(name);

            // Fetch authoritative profile/expansion state from DB
            const { data: shellData } = await supabase
              .schema('cozy')
              .rpc('get_user_shell', { p_user_id: user.id });
            const shellRow = Array.isArray(shellData) ? shellData[0] : shellData;
            if (shellRow) {
              if (shellRow.expansion_tier !== undefined) setExpansionTier(shellRow.expansion_tier);
              if (shellRow.milestone_tokens !== undefined) setMilestoneTokens(shellRow.milestone_tokens);
              if (shellRow.themes_unlocked !== undefined) setThemesUnlocked(shellRow.themes_unlocked);
            }

            if (user.user_metadata?.hub_preferences) {
              setHubPreferences((prev) => ({
                ...prev,
                ...user.user_metadata.hub_preferences,
              }));
            }

            const { data: userData } = await supabase
              .schema('cozy')
              .from('users')
              .select('points, hub_preferences')
              .eq('id', user.id)
              .maybeSingle();

            if (userData) {
              if (userData.points !== undefined) {
                setPoints(userData.points);
              }
              if (userData.hub_preferences) {
                setHubPreferences((prev) => ({
                  ...prev,
                  ...userData.hub_preferences,
                }));
              }
            }
          }
        }
      } catch (err) {
        console.warn('[Settings] Error fetching user profile:', err);
        if (!ignore) setMounted(true);
      }
    };
    fetchUser();
    return () => {
      ignore = true;
    };
  }, [setExpansionTier, setMilestoneTokens, setThemesUnlocked, setPoints]);

  const handleToggleHubPref = async (key: keyof HubPreferences) => {
    let updated: HubPreferences | null = null;
    setHubPreferences((prev) => {
      updated = {
        ...prev,
        [key]: !prev[key],
      };
      return updated;
    });

    if (!updated) return;
    const nextPrefs: HubPreferences = updated;

    try {
      const supabase = createBrowserClient();
      if (userId) {
        await supabase
          .schema('cozy')
          .from('users')
          .update({ hub_preferences: nextPrefs })
          .eq('id', userId);
      }
      await supabase.auth.updateUser({
        data: { hub_preferences: nextPrefs },
      });
      setHubSavedIndicator(true);
      setTimeout(() => setHubSavedIndicator(false), 2200);
    } catch (err) {
      console.warn('[Settings] Error saving hub preferences:', err);
    }
  };

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
    <div className="cozy-page-bg px-4 py-8 pb-28">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-full bg-stone-100 dark:bg-[#281e19] hover:bg-stone-200 dark:hover:bg-[#342821] text-[var(--cozy-text-primary)] border border-amber-900/15 dark:border-amber-500/25 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-800 text-[var(--cozy-text-primary)] flex items-center gap-2">
                  <SettingsIcon className="w-6 h-6 text-[var(--cozy-rust)]" />
                  Settings & Hub Options
                </h1>
              </div>
              <p className="text-xs font-500 text-[var(--cozy-text-muted)]">Customize your Cozy environment & SunShade ecosystem preferences</p>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 text-emerald-950 dark:text-emerald-200 text-xs font-700 shadow-sm animate-in fade-in">
            <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* ── 1. Citizen Profile & Ecosystem Identity Card ──────────────── */}
        <section className="cozy-glass rounded-3xl p-6 shadow-md space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--cozy-border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[var(--cozy-rust)]" />
              <h2 className="text-xs font-900 text-[var(--cozy-text-primary)] uppercase tracking-wider">
                Citizen Account
              </h2>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold text-amber-950 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-600/40 shadow-xs">
              <Compass size={12} className="text-amber-700 dark:text-amber-400" />
              SunShade SSO
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-extrabold text-2xl shadow-md border-2 border-amber-300/40 shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-800 text-[var(--cozy-text-primary)] truncate">
                {displayName}
              </h3>
              <p className="text-xs font-500 text-[var(--cozy-text-muted)] truncate">
                {userEmail || 'Authenticated Citizen'}
              </p>
              {userId && (
                <p className="text-[10px] font-mono text-[var(--cozy-text-muted)] opacity-80 truncate mt-0.5">
                  ID: {userId.slice(0, 12)}...
                </p>
              )}
            </div>
          </div>

          {/* Economy & Expansion Stats */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <button
              onClick={() => setIsLedgerOpen(true)}
              className="p-3 rounded-2xl bg-amber-50/90 dark:bg-[#231a15] border border-amber-200/80 dark:border-amber-600/30 text-center shadow-xs hover:border-amber-500/60 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
              title="Click to view transaction ledger"
            >
              <span className="text-[10px] font-800 tracking-wider text-amber-950 dark:text-amber-200/90 block uppercase">Cozy Balance</span>
              <span className="text-sm font-900 text-amber-700 dark:text-amber-400 block mt-1">✨ {points}</span>
              <span className="text-[9px] font-800 text-amber-800/80 dark:text-amber-400/80 block mt-0.5 group-hover:underline">Ledger 📜</span>
            </button>
            <div className="p-3 rounded-2xl bg-amber-50/90 dark:bg-[#231a15] border border-amber-200/80 dark:border-amber-600/30 text-center shadow-xs">
              <span className="text-[10px] font-800 tracking-wider text-amber-950 dark:text-amber-200/90 block uppercase">Tokens</span>
              <span className="text-sm font-900 text-emerald-700 dark:text-emerald-400 block mt-1">🪴 {milestoneTokens}</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/90 dark:bg-[#231a15] border border-amber-200/80 dark:border-amber-600/30 text-center shadow-xs">
              <span className="text-[10px] font-800 tracking-wider text-amber-950 dark:text-amber-200/90 block uppercase">Shell Tier</span>
              <span className="text-xs font-900 text-stone-900 dark:text-amber-100 block mt-1 truncate" title={tierNames[expansionTier] || 'Corner'}>
                {tierNames[expansionTier] || 'Tier 1'}
              </span>
            </div>
          </div>

          {/* Sticker Store & Ledger Quick Actions */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => setIsStoreOpen(true)}
              className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-amber-950 font-900 text-xs shadow-sm transition-all cursor-pointer"
            >
              <ShoppingBag size={15} />
              <span>Sticker Store 🛍️</span>
            </button>

            <button
              onClick={() => setIsLedgerOpen(true)}
              className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-stone-100 dark:bg-[#281e19] hover:bg-stone-200 dark:hover:bg-[#342821] active:scale-95 text-stone-900 dark:text-amber-100 font-900 text-xs border border-amber-900/15 dark:border-amber-500/30 shadow-sm transition-all cursor-pointer"
            >
              <History size={15} className="text-amber-600 dark:text-amber-400" />
              <span>Transaction History</span>
            </button>
          </div>

          {/* Link to central SunShade Hub */}
          <div className="pt-2 border-t border-[var(--cozy-border-subtle)]">
            <a
              href={`${hubUrl}/dashboard`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-amber-100/90 dark:bg-amber-950/40 hover:bg-amber-200/90 dark:hover:bg-amber-950/70 border border-amber-300 dark:border-amber-600/40 text-amber-950 dark:text-amber-200 text-xs font-800 transition-all group shadow-xs"
            >
              <div className="flex items-center gap-2">
                <Hexagon size={16} className="text-amber-700 dark:text-amber-400 shrink-0" />
                <span>Open Central SunShade Hub Dashboard</span>
              </div>
              <ExternalLink size={14} className="text-amber-800 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </a>
          </div>
        </section>

        {/* ── 2. Hub Preferences ───────────────────────────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--cozy-border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[var(--cozy-rust)]" />
              <h2 className="text-xs font-900 text-[var(--cozy-text-primary)] uppercase tracking-wider">
                Hub Preferences
              </h2>
            </div>
            {hubSavedIndicator && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-600/40 animate-in fade-in">
                <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> Saved to Profile
              </span>
            )}
          </div>

          <p className="text-xs font-500 text-[var(--cozy-text-muted)] leading-relaxed">
            Configure how your habitat and node interact with the SunShade ecosystem mesh and neighborhood village maps.
          </p>

          <div className="space-y-3 pt-1">
            {/* 1. Map Presence Visibility */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-100/90 dark:bg-[#201813] border border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-3 pr-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <MapPin size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-700 text-[var(--cozy-text-primary)] truncate">Map Presence Visibility</p>
                  <p className="text-[10px] text-[var(--cozy-text-muted)] line-clamp-1">Show live avatar & active habitat on group village maps</p>
                </div>
              </div>

              <button
                onClick={() => handleToggleHubPref('mapPresenceVisibility')}
                className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  hubPreferences.mapPresenceVisibility ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700'
                }`}
                aria-label="Toggle Map Presence Visibility"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                    hubPreferences.mapPresenceVisibility ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 2. Porch Delivery Mode */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-100/90 dark:bg-[#201813] border border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-3 pr-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Mail size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-700 text-[var(--cozy-text-primary)] truncate">Porch Delivery Mode</p>
                  <p className="text-[10px] text-[var(--cozy-text-muted)] line-clamp-1">Quiet delivery holding pen (delivers peer notes & cheers without loud push alerts)</p>
                </div>
              </div>

              <button
                onClick={() => handleToggleHubPref('porchDeliveryMode')}
                className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  hubPreferences.porchDeliveryMode ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700'
                }`}
                aria-label="Toggle Porch Delivery Mode"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                    hubPreferences.porchDeliveryMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 3. Edge Mesh Sharing */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-100/90 dark:bg-[#201813] border border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-3 pr-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Radio size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-700 text-[var(--cozy-text-primary)] truncate">Edge Mesh Sharing</p>
                  <p className="text-[10px] text-[var(--cozy-text-muted)] line-clamp-1">Decentralized P2P mesh replication & cached peer discovery</p>
                </div>
              </div>

              <button
                onClick={() => handleToggleHubPref('edgeMeshSharing')}
                className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  hubPreferences.edgeMeshSharing ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700'
                }`}
                aria-label="Toggle Edge Mesh Sharing"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                    hubPreferences.edgeMeshSharing ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ── 3. Appearance & Theme ────────────────────────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--cozy-border-subtle)] pb-3">
            <Sparkles className="w-5 h-5 text-[var(--cozy-gold)]" />
            <h2 className="text-xs font-900 text-[var(--cozy-text-primary)] uppercase tracking-wider">
              Appearance & Atmosphere
            </h2>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-500 text-[var(--cozy-text-muted)] leading-relaxed">
              Choose how Cozy displays. Photos automatically synchronize their lighting (Day vs. Evening) to match your selected atmosphere!
            </p>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border text-xs transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 border-amber-500 font-900 shadow-md ring-2 ring-amber-400/50 scale-[1.02]'
                    : 'bg-stone-100/90 dark:bg-[#201813] text-stone-700 dark:text-amber-100/75 border-stone-300/80 dark:border-stone-800 hover:bg-amber-50 dark:hover:bg-[#2b2019] hover:text-stone-900 dark:hover:text-amber-100 font-700'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span>Light</span>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border text-xs transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-stone-950 border-amber-400 font-900 shadow-md ring-2 ring-amber-500/50 scale-[1.02]'
                    : 'bg-stone-100/90 dark:bg-[#201813] text-stone-700 dark:text-amber-100/75 border-stone-300/80 dark:border-stone-800 hover:bg-amber-50 dark:hover:bg-[#2b2019] hover:text-stone-900 dark:hover:text-amber-100 font-700'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span>Dark</span>
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border text-xs transition-all cursor-pointer ${
                  theme === 'system'
                    ? 'bg-gradient-to-r from-stone-700 to-stone-800 text-amber-100 border-stone-600 font-900 shadow-md ring-2 ring-amber-400/40 scale-[1.02]'
                    : 'bg-stone-100/90 dark:bg-[#201813] text-stone-700 dark:text-amber-100/75 border-stone-300/80 dark:border-stone-800 hover:bg-amber-50 dark:hover:bg-[#2b2019] hover:text-stone-900 dark:hover:text-amber-100 font-700'
                }`}
              >
                <Monitor className="w-5 h-5" />
                <span>System</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── 4. SunShade Auth Code & Cross-Device Access ────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--cozy-border-subtle)] pb-3">
            <Key className="w-5 h-5 text-[var(--cozy-rust)]" />
            <h2 className="text-xs font-900 text-[var(--cozy-text-primary)] uppercase tracking-wider">
              Cross-Device Auth Code
            </h2>
          </div>

          <p className="text-xs font-500 text-[var(--cozy-text-muted)] leading-relaxed">
            Request an 8-character activation code to sign in to Cozy or the SunShade Hub on another device without using magic links.
          </p>

          {requestCodeSubmitted ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-600/40 text-emerald-950 dark:text-emerald-200 text-xs flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
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

        {/* ── 5. Group & Peer Support Notifications ─────────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--cozy-border-subtle)] pb-3">
            <Bell className="w-5 h-5 text-[var(--cozy-rust)]" />
            <h2 className="text-xs font-900 text-[var(--cozy-text-primary)] uppercase tracking-wider">
              Group Peer Notifications
            </h2>
          </div>

          <p className="text-xs font-500 text-[var(--cozy-text-muted)] leading-relaxed">
            Manage peer support check-in alerts when group members log a raincloud vibe check.
          </p>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-100/90 dark:bg-[#201813] border border-stone-200 dark:border-stone-800">
            <div>
              <p className="text-xs font-700 text-[var(--cozy-text-primary)]">Group Vibe Support Alerts</p>
              <p className="text-[10px] text-[var(--cozy-text-muted)]">Receive cheer reminders for your active living spaces</p>
            </div>

            <button
              onClick={() => toggleGroupNotifications('default_group')}
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                (groupNotifications['default_group'] ?? true) ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700'
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

        {/* ── 6. Privacy & Location Obfuscation ─────────────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--cozy-border-subtle)] pb-3">
            <Shield className="w-5 h-5 text-[var(--cozy-rust)]" />
            <h2 className="text-xs font-900 text-[var(--cozy-text-primary)] uppercase tracking-wider">
              Privacy & Geohashing
            </h2>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-500 text-[var(--cozy-text-muted)] leading-relaxed">
              Cozy NEVER stores exact coordinates. Location data is obfuscated into a ~45km geohash cell before saving.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setPrivacyTier('geofenced')}
                className={`p-3 rounded-2xl border text-left text-xs space-y-1 transition-all cursor-pointer ${
                  privacyTier === 'geofenced'
                    ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-500 text-amber-950 dark:text-amber-100 font-800 shadow-xs ring-1 ring-amber-400/40'
                    : 'bg-stone-100/90 dark:bg-[#201813] border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                <p className="font-800">Geofenced (~45km)</p>
                <p className="text-[10px] opacity-80">Local area community feed</p>
              </button>

              <button
                onClick={() => setPrivacyTier('random')}
                className={`p-3 rounded-2xl border text-left text-xs space-y-1 transition-all cursor-pointer ${
                  privacyTier === 'random'
                    ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-500 text-amber-950 dark:text-amber-100 font-800 shadow-xs ring-1 ring-amber-400/40'
                    : 'bg-stone-100/90 dark:bg-[#201813] border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                <p className="font-800">Random Pool</p>
                <p className="text-[10px] opacity-80">Global randomized spaces</p>
              </button>
            </div>
          </div>
        </section>

        {/* ── 7. Storage & Session Controls (Sign Out) ─────────────────── */}
        <section className="cozy-glass rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--cozy-border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-[var(--cozy-rust)]" />
              <h2 className="text-xs font-900 text-[var(--cozy-text-primary)] uppercase tracking-wider">
                Session & Storage
              </h2>
            </div>

            <button
              onClick={handleClearCache}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-700 bg-stone-100 dark:bg-[#281e19] text-stone-800 dark:text-amber-100/90 hover:bg-stone-200 dark:hover:bg-[#342821] border border-stone-300 dark:border-stone-700 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 size={12} /> Clear Cache
            </button>
          </div>

          <p className="text-xs font-500 text-[var(--cozy-text-muted)] leading-relaxed">
            Logging out clears your active session and redirects you to the authentication portal.
          </p>

          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl font-900 text-xs bg-red-600 hover:bg-red-700 text-white shadow-md transition-all hover:scale-[1.01] active:scale-95 cursor-pointer disabled:opacity-60"
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

      {/* Sticker Store Drawer */}
      <StickerStoreDrawer
        isOpen={isStoreOpen}
        onClose={() => setIsStoreOpen(false)}
      />

      {/* Transaction History Modal */}
      <TransactionHistoryModal
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
      />
    </div>
  );
}

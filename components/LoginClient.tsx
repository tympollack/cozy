'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-browser';
import { ExternalLink, Lock, Mail, Sparkles, User, AlertCircle, ArrowRight } from 'lucide-react';

interface LoginClientProps {
  hubUrl: string;
  isNonProd: boolean;
}

const QUICK_TEST_USERS = [
  { name: 'Willow Craft 🌿', email: 'willow@cozy.test', role: 'Sunshine · Tier 2' },
  { name: 'Oliver Moss 🍵', email: 'oliver@cozy.test', role: 'Neutral · Tier 3' },
  { name: 'Maya Books 📚', email: 'maya@cozy.test', role: 'Sunshine · Tier 1' },
  { name: 'Leo Amber 🕯️', email: 'leo@cozy.test', role: 'Raincloud · Tier 2' },
];

export function LoginClient({ hubUrl, isNonProd }: LoginClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('CozyTest123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDirectSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push('/feed');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
      setLoading(false);
    }
  }

  function handleQuickLogin(testEmail: string) {
    setEmail(testEmail);
    setPassword('CozyTest123!');
    setError(null);
    setLoading(true);

    const supabase = createBrowserClient();
    supabase.auth
      .signInWithPassword({ email: testEmail, password: 'CozyTest123!' })
      .then(({ error: signInError }) => {
        if (signInError) {
          setError(signInError.message);
          setLoading(false);
        } else {
          router.push('/feed');
          router.refresh();
        }
      })
      .catch((err) => {
        setError(err?.message || 'Login failed');
        setLoading(false);
      });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 text-center overflow-hidden relative pb-20"
      style={{
        background: 'linear-gradient(160deg, #faf7f2 0%, #f5ede0 60%, #ede0cc 100%)',
      }}
    >
      <div className="relative z-10 w-full max-w-md p-8 rounded-3xl cozy-glass border border-[--cozy-amber]/30 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-zinc-800 flex items-center justify-center text-3xl mx-auto shadow-inner border border-amber-300/40">
          🏡
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-800 tracking-wider text-amber-950 bg-amber-400/70 border border-amber-500/30 uppercase">
            <Sparkles size={12} />
            <span>{isNonProd ? 'Staging / Preview Auth' : 'SunShade Gateway'}</span>
          </div>
          <h1 className="text-2xl font-800 text-[--cozy-bark] leading-tight">
            Sign In to Cozy
          </h1>
          <p className="text-xs text-[--cozy-muted] max-w-xs mx-auto leading-relaxed">
            {isNonProd
              ? `Connected to Staging Gateway (${hubUrl.replace('https://', '')})`
              : 'Sign in to your account via the central SunShade ecosystem gateway.'}
          </p>
        </div>

        {/* Central Hub Button */}
        <div className="space-y-3">
          <a
            href={`${hubUrl}/login`}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-800 text-white shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, var(--cozy-rust), var(--cozy-amber))',
            }}
          >
            <ExternalLink size={15} />
            <span>Sign In via SunShade Hub ({isNonProd ? 'Staging' : 'SSO'})</span>
          </a>
        </div>

        {/* Non-prod / Preview Direct Sign-In Form */}
        {isNonProd && (
          <div className="space-y-4 pt-2 border-t border-[--cozy-amber]/20">
            <div className="flex items-center justify-center gap-2 text-xs font-700 text-[--cozy-muted]">
              <span>Or Direct Preview Sign In</span>
            </div>

            <form onSubmit={handleDirectSignIn} className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-[11px] font-700 text-[--cozy-bark] px-1 flex items-center gap-1">
                  <Mail size={12} />
                  <span>Email</span>
                </label>
                <input
                  type="email"
                  placeholder="willow@cozy.test"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl px-3.5 py-2.5 text-xs font-600 outline-none bg-white/80 dark:bg-zinc-900/80 border border-amber-300/60 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 shadow-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-700 text-[--cozy-bark] px-1 flex items-center gap-1">
                  <Lock size={12} />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl px-3.5 py-2.5 text-xs font-600 outline-none bg-white/80 dark:bg-zinc-900/80 border border-amber-300/60 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 shadow-sm"
                  required
                />
              </div>

              {error && (
                <p className="text-xs text-rose-500 font-600 flex items-center gap-1 pt-1">
                  <AlertCircle size={13} className="flex-shrink-0" />
                  <span>{error}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-800 text-[--cozy-bark] bg-white/90 hover:bg-white border border-[--cozy-amber]/40 shadow-sm transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Signing in…' : 'Sign In on Preview Domain'}</span>
                <ArrowRight size={14} />
              </button>
            </form>

            {/* Quick Test Users (1-Click Login) */}
            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-700 text-[--cozy-muted]">1-Click Staging Test Accounts:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_TEST_USERS.map((tu) => (
                  <button
                    key={tu.email}
                    onClick={() => handleQuickLogin(tu.email)}
                    disabled={loading}
                    className="flex items-center gap-1.5 p-2 rounded-xl text-left bg-amber-50/80 dark:bg-zinc-800/60 hover:bg-amber-100/80 dark:hover:bg-zinc-700/80 border border-amber-200/50 dark:border-zinc-700/50 transition-all text-xs font-700 text-[--cozy-bark] cursor-pointer"
                  >
                    <User size={12} className="text-amber-700 dark:text-amber-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] truncate leading-tight">{tu.name}</p>
                      <p className="text-[9px] text-[--cozy-muted] truncate">{tu.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

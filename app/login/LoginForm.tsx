'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { devBypassLogin } from '@/app/actions/devAuthActions';
import { TEST_CITIZENS } from '@/lib/devCitizens';
import { createBrowserClient } from '@/lib/supabase-browser';
import { isBypassAuthEnabled } from '@/lib/env';
import { Mail, ArrowRight, CheckCircle, Loader, Zap, User, Sparkles, ExternalLink } from 'lucide-react';

type State = 'idle' | 'loading' | 'sent' | 'error';

interface LoginFormProps {
  isDevMode?: boolean;
  returnUrl?: string;
  hubLoginUrl?: string;
}

export function LoginForm({
  isDevMode,
  returnUrl = '/feed',
  hubLoginUrl,
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCitizen, setSelectedCitizen] = useState<string>('chloe@cozy.test');
  const [isBypassing, setIsBypassing] = useState(false);

  // Automatically derive running on localhost / bypass enabled
  const isDev = isDevMode !== undefined ? isDevMode : isBypassAuthEnabled();

  const handleDevBypass = async (citizenEmail?: string) => {
    const target = citizenEmail || selectedCitizen || 'chloe@cozy.test';
    setIsBypassing(true);
    setErrorMsg('');

    try {
      const result = await devBypassLogin(target, returnUrl);
      if (result.success && result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        setErrorMsg(result.error || 'Failed to bypass login.');
        setIsBypassing(false);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Dev bypass failed');
      setIsBypassing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState('loading');
    setErrorMsg('');

    // In local dev, if the user typed an email ending in .test or dev bypass is enabled,
    // we can also allow instant dev login for that email!
    if (isDev && (email.endsWith('.test') || email.includes('dev'))) {
      const res = await devBypassLogin(email.trim(), returnUrl);
      if (res.success && res.redirectUrl) {
        window.location.href = res.redirectUrl;
        return;
      }
    }


    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}` },
    });

    if (error) {
      setErrorMsg(error.message);
      setState('error');
    } else {
      setState('sent');
    }
  };

  if (state === 'sent') {
    return (
      <div className="cozy-glass rounded-3xl p-8 cozy-shadow text-center">
        <CheckCircle size={40} className="mx-auto mb-4 text-green-500" aria-hidden="true" />
        <h2 className="text-xl font-700 text-[--cozy-bark] mb-2">Check your inbox!</h2>
        <p className="text-[--cozy-muted] text-sm leading-relaxed">
          We sent a magic link to <strong className="text-[--cozy-rust]">{email}</strong>.
          Click it to sign in — no password needed.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* ── Dev Mode Quick Bypass Section ───────────────────────────── */}
      {isDev && (

        <div className="cozy-glass rounded-3xl p-6 cozy-shadow border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                <Zap size={16} />
              </div>
              <div>
                <h2 className="text-sm font-800 text-[--cozy-bark]">Dev Mode Bypass</h2>
                <p className="text-[11px] text-[--cozy-muted]">1-Click instant test session (Local Dev)</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
              Active
            </span>
          </div>

          {/* Quick Primary Bypass Button */}
          <button
            type="button"
            onClick={() => handleDevBypass(selectedCitizen)}
            disabled={isBypassing || state === 'loading'}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5
              rounded-2xl font-800 text-sm text-stone-950
              bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400
              hover:from-amber-300 hover:to-amber-400
              active:scale-[0.98] shadow-md hover:shadow-lg
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 cursor-pointer border border-amber-500/40"
          >
            {isBypassing ? (
              <>
                <Loader size={16} className="animate-spin" />
                <span>Bypassing Login & Creating Session…</span>
              </>
            ) : (
              <>
                <Sparkles size={16} className="fill-amber-950" />
                <span>
                  Bypass Login as{' '}
                  <strong className="underline decoration-amber-600 underline-offset-2">
                    {TEST_CITIZENS.find((c) => c.email === selectedCitizen)?.name || 'Chloe'}
                  </strong>
                </span>
              </>
            )}
          </button>

          {/* Test Citizen Picker */}
          <div className="space-y-2 pt-1 border-t border-amber-300/30">
            <p className="text-[11px] font-700 text-[--cozy-bark] flex items-center gap-1">
              <User size={12} className="text-amber-700" />
              <span>Or switch test citizen profile:</span>
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {TEST_CITIZENS.map((c) => {
                const isSelected = selectedCitizen === c.email;
                return (
                  <button
                    key={c.email}
                    type="button"
                    onClick={() => {
                      setSelectedCitizen(c.email);
                      handleDevBypass(c.email);
                    }}
                    disabled={isBypassing}
                    className={`py-1.5 px-2 rounded-xl text-xs font-700 transition-all text-center truncate ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white/80 dark:bg-stone-800/80 text-stone-800 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-stone-700 border border-amber-200/60 dark:border-stone-700'
                    }`}
                    title={`${c.name} (${c.email}) - ${c.description}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Standard Magic Link Form ─────────────────────────────────── */}
      <form
        id="login-form"
        onSubmit={handleSubmit}
        className="cozy-glass rounded-3xl p-6 cozy-shadow space-y-4"
        aria-label="Sign in form"
        noValidate
      >
        <div>
          <label
            htmlFor="email-input"
            className="block text-xs font-700 text-[--cozy-bark] mb-1.5"
          >
            Sign in with email
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--cozy-muted]"
              aria-hidden="true"
            />
            <input
              id="email-input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={state === 'loading' || isBypassing}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-amber-200
                bg-white/70 text-[--cozy-night] placeholder:text-[--cozy-muted]/60
                focus:outline-none focus:ring-2 focus:ring-[--cozy-amber] focus:border-transparent
                disabled:opacity-60 text-sm transition-all"
            />
          </div>
        </div>

        {errorMsg && (
          <p
            id="login-error"
            role="alert"
            className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2"
          >
            {errorMsg}
          </p>
        )}

        <button
          id="login-submit-btn"
          type="submit"
          disabled={state === 'loading' || isBypassing || !email.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 px-5
            rounded-xl font-700 text-sm text-white
            bg-gradient-to-r from-[--cozy-rust] to-[--cozy-amber]
            hover:opacity-90 active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200 cozy-shadow"
        >
          {state === 'loading' ? (
            <>
              <Loader size={16} className="animate-spin" aria-hidden="true" />
              Sending magic link…
            </>
          ) : (
            <>
              Send magic link
              <ArrowRight size={16} aria-hidden="true" />
            </>
          )}
        </button>

        {hubLoginUrl && (
          <div className="pt-2 border-t border-amber-200/40 text-center">
            <a
              href={hubLoginUrl}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[--cozy-rust] hover:underline"
            >
              <span>Authenticate via SunShade Hub SSO</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </form>
    </div>
  );
}


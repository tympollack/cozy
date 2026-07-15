'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase-browser';
import { Mail, ArrowRight, CheckCircle, Loader } from 'lucide-react';

type State = 'idle' | 'loading' | 'sent' | 'error';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState('loading');
    setErrorMsg('');

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/feed` },
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
    <form
      id="login-form"
      onSubmit={handleSubmit}
      className="cozy-glass rounded-3xl p-8 cozy-shadow space-y-5"
      aria-label="Sign in form"
      noValidate
    >
      <div>
        <label
          htmlFor="email-input"
          className="block text-sm font-600 text-[--cozy-bark] mb-2"
        >
          Your email address
        </label>
        <div className="relative">
          <Mail
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[--cozy-muted]"
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
            disabled={state === 'loading'}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-amber-200
              bg-white/60 text-[--cozy-night] placeholder:text-[--cozy-muted]/60
              focus:outline-none focus:ring-2 focus:ring-[--cozy-amber] focus:border-transparent
              disabled:opacity-60 text-sm transition-all"
          />
        </div>
      </div>

      {state === 'error' && (
        <p
          id="login-error"
          role="alert"
          className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2"
        >
          {errorMsg}
        </p>
      )}

      <button
        id="login-submit-btn"
        type="submit"
        disabled={state === 'loading' || !email.trim()}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-6
          rounded-xl font-700 text-sm text-white
          bg-gradient-to-r from-[--cozy-rust] to-[--cozy-amber]
          hover:opacity-90 active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200 cozy-shadow"
      >
        {state === 'loading' ? (
          <>
            <Loader size={16} className="animate-spin" aria-hidden="true" />
            Sending link…
          </>
        ) : (
          <>
            Send magic link
            <ArrowRight size={16} aria-hidden="true" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-[--cozy-muted]">
        No password. No spam. Just good vibes. ✨
      </p>
    </form>
  );
}

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase';
import { getHubLoginUrl, isBypassAuthEnabled, isLocalDevelopment, sanitizeNextUrl } from '@/lib/env';

import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Sign In — Cozy',
  description: 'Sign in to Cozy or bypass login in local dev mode.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const params = searchParams ? await searchParams : {};
  const nextParam = sanitizeNextUrl(typeof params.next === 'string' ? params.next : null, '/feed');

  if (user) {
    redirect(nextParam);
  }

  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || '';
  const proto = headersList.get('x-forwarded-proto') || (isLocalDevelopment(host) ? 'http' : 'https');
  const returnUrl = host ? `${proto}://${host}${nextParam}` : nextParam;
  const hubLoginUrl = getHubLoginUrl(returnUrl, host);


  const isBypass = isBypassAuthEnabled(host) || params.bypass === 'true' || params.local === 'true';

  // If in production and dev bypass is not enabled, redirect to central Hub SSO
  if (!isBypass) {
    redirect(hubLoginUrl);
  }

  return (
    <div className="cozy-page-bg min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-3xl font-900 text-[--cozy-rust] tracking-tight hover:opacity-90 transition-opacity"
          >
            <span>cozy</span>
            <span className="text-2xl">🏡</span>
          </Link>
          <p className="text-sm text-[--cozy-muted]">
            Gamified therapeutic home sharing & peaceful living ✨
          </p>
        </div>

        {/* Login & Dev Bypass Card */}
        <LoginForm isDevMode={isBypass} returnUrl={nextParam} hubLoginUrl={hubLoginUrl} />
      </div>
    </div>
  );
}


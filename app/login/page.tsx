import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { getHubBaseUrl, isNonProdEnvironment } from '@/lib/env';
import { LoginClient } from '@/components/LoginClient';

export const metadata = {
  title: 'Sign In — Cozy',
  description: 'Sign in to Cozy via SunShade Hub.',
};

export default async function LoginPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/feed');
  }

  let host = '';
  try {
    const headerStore = await headers();
    host = headerStore.get('x-forwarded-host') || headerStore.get('host') || '';
  } catch {
    // static rendering
  }

  const hubUrl = getHubBaseUrl(host);
  const isNonProd = isNonProdEnvironment(host);

  // If in pure production environment on cozy.sunshade.icu, redirect directly to production Hub SSO
  if (!isNonProd && (host.endsWith('sunshade.icu') || host === 'cozy.sunshade.icu')) {
    redirect(`${hubUrl}/login`);
  }

  return <LoginClient hubUrl={hubUrl} isNonProd={isNonProd} />;
}

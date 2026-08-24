import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { getHubLoginUrl } from '@/lib/env';

export const metadata = {
  title: 'Sign In — Cozy',
  description: 'Sign in to Cozy via Sunshade Hub.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/feed');
  }

  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || '';
  const proto = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  
  const params = searchParams ? await searchParams : {};
  const nextParam = typeof params.next === 'string' ? params.next : '/feed';
  const returnUrl = host ? `${proto}://${host}${nextParam}` : nextParam;

  redirect(getHubLoginUrl(returnUrl, host));
}

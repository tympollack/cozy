/**
 * Supabase browser client — safe for Client Components.
 * Uses the anon key and is subject to RLS policies.
 * Import this ONLY from 'use client' components.
 */
import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';
import { getCookieDomain } from '@/lib/env';

export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  const domain = getCookieDomain();
  const cookieOptions = domain ? { domain } : {};

  return createSSRBrowserClient(url, key, {
    cookieOptions,
  });
}

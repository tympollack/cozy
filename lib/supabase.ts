/**
 * Server-only Supabase clients.
 * This file imports from 'next/headers' and MUST only be used in:
 *   - Server Components
 *   - Server Actions ('use server')
 *   - Route Handlers (app/api/*)
 *
 * For Client Components, import from '@/lib/supabase-browser' instead.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ---------------------------------------------------------------------------
// Environment variable helpers
// ---------------------------------------------------------------------------

/** Returns the env var value, or throws a descriptive error in development.
 *  In production we return '' so the Supabase client fails gracefully
 *  (returns an auth error) rather than crashing the Server Component with a 500. */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    console.error(`[cozy] Missing env var: ${name}`);
    return '';
  }
  return value;
}

// ---------------------------------------------------------------------------
// Server Client (Server Components, Server Actions, Route Handlers)
// Cookie-based auth via @supabase/ssr — respects RLS.
// ---------------------------------------------------------------------------
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookieOptions: { domain: '.sunshade.icu' },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can throw in Server Components (read-only context) — safe to ignore
          }
        },
      },
    }
  );
}


// ---------------------------------------------------------------------------
// Service Client (Server Actions only — bypasses RLS)
// NEVER import this in Client Components or expose to browser.
// ---------------------------------------------------------------------------
export function createServiceClient() {
  return createSupabaseClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );
}

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } else {
      console.error('[Auth Callback] Error exchanging code for session:', error.message);
    }
  }

  // If we reach here, there was no code or it failed
  return NextResponse.redirect(new URL('/login?error=auth-callback-failed', requestUrl.origin));
}

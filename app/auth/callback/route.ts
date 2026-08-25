import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { sanitizeNextUrl } from '@/lib/env';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const accessToken = requestUrl.searchParams.get('access_token');
  const refreshToken = requestUrl.searchParams.get('refresh_token');
  const next = sanitizeNextUrl(requestUrl.searchParams.get('next'), '/feed');

  const supabase = await createServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } else {
      console.error('[Auth Callback] Error exchanging code for session:', error.message);
    }
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } else {
      console.error('[Auth Callback] Error setting session from tokens:', error.message);
    }
  }

  // If we reach here, there was no valid code or tokens, or session setup failed
  return NextResponse.redirect(new URL('/login?error=auth-callback-failed', requestUrl.origin));
}

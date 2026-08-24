import { NextResponse } from 'next/server';
import { devBypassLogin } from '@/app/actions/devAuthActions';
import { isBypassAuthEnabled } from '@/lib/env';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host || requestUrl.hostname;

  if (!isBypassAuthEnabled(host)) {

    return NextResponse.json(
      { error: 'Dev bypass login is disabled in this environment.' },
      { status: 403 }
    );
  }

  const email = requestUrl.searchParams.get('email') || 'chloe@cozy.test';
  const next = requestUrl.searchParams.get('next') || '/feed';

  const result = await devBypassLogin(email, next);

  if (result.success && result.redirectUrl) {
    return NextResponse.redirect(new URL(result.redirectUrl, requestUrl.origin));
  }

  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(result.error || 'dev-login-failed')}`, requestUrl.origin)
  );
}

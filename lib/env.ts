/**
 * Environment & Hub SSO Routing Helper for Cozy
 */

export function isStagingEnvironment(host?: string): boolean {
  const env = (
    process.env.NEXT_PUBLIC_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.VERCEL_ENV ||
    ''
  ).toLowerCase();

  if (env === 'staging' || env === 'preview' || env === 'development') {
    return true;
  }

  const targetHost = (
    host ||
    (typeof window !== 'undefined' ? window.location.hostname : '')
  ).toLowerCase();

  if (
    targetHost.includes('-stag') ||
    targetHost.includes('staging') ||
    targetHost.endsWith('.vercel.app') ||
    targetHost.includes('localhost') ||
    targetHost.includes('127.0.0.1')
  ) {
    return true;
  }

  return false;
}

export function getHubBaseUrl(host?: string): string {
  const isStag = isStagingEnvironment(host);
  return isStag ? 'https://hub-stag.sunshade.icu' : 'https://hub.sunshade.icu';
}

export function getHubLoginUrl(returnToPath: string = '/feed', host?: string): string {
  const hubBase = getHubBaseUrl(host);
  
  let targetReturnUrl = returnToPath;
  if (typeof window !== 'undefined' && returnToPath.startsWith('/')) {
    targetReturnUrl = `${window.location.origin}${returnToPath}`;
  }

  return `${hubBase}/login?redirect_to=${encodeURIComponent(targetReturnUrl)}`;
}

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

/**
 * Derives whether the current environment or request is running on localhost or a local network.
 * Handles IPv4, IPv6 localhost (::1), 127.0.0.1, 0.0.0.0, .local, and local LAN addresses.
 */
export function isLocalDevelopment(host?: string): boolean {
  // Production environment is never local development, regardless of client host headers
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const rawHost = (
    host ||
    (typeof window !== 'undefined' ? window.location.host || window.location.hostname : '')
  ).toLowerCase().trim();

  if (!rawHost) {
    return false;
  }

  // Strip port if present (e.g. localhost:3000 -> localhost, [::1]:3000 -> [::1])
  const targetHost = rawHost.startsWith('[')
    ? rawHost.replace(/\[|\]/g, '').split(':')[0]
    : rawHost.split(':')[0];

  return (
    targetHost === 'localhost' ||
    targetHost === '127.0.0.1' ||
    targetHost === '::1' ||
    targetHost === '0.0.0.0' ||
    targetHost.endsWith('.localhost') ||
    targetHost.endsWith('.local') ||
    // Private IPv4 LAN ranges (e.g. testing on mobile over WiFi)
    targetHost.startsWith('192.168.') ||
    targetHost.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(targetHost)
  );
}

export function isBypassAuthEnabled(host?: string): boolean {
  const bypassEnv = (
    process.env.NEXT_PUBLIC_BYPASS_AUTH ||
    process.env.BYPASS_AUTH ||
    ''
  ).toLowerCase().trim();

  if (bypassEnv === 'true' || bypassEnv === '1') {
    return true;
  }

  if (bypassEnv === 'false' || bypassEnv === '0') {
    return false;
  }

  // Local development is always allowed
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Trusted server/deployment environment variables (cannot be spoofed via client request headers)
  const env = (
    process.env.NEXT_PUBLIC_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.VERCEL_ENV ||
    ''
  ).toLowerCase().trim();

  if (env === 'staging' || env === 'preview' || env === 'development') {
    return true;
  }

  // In production, never allow dev authentication bypass based on untrusted host headers
  return false;
}

/**
 * Sanitizes redirect paths to prevent Open Redirect vulnerabilities.
 * Ensures the target is a relative same-origin pathname and not an absolute or protocol-relative URL.
 */
export function sanitizeNextUrl(next?: string | null, fallback: string = '/feed'): string {
  if (!next || typeof next !== 'string') return fallback;
  const trimmed = next.trim();
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\') &&
    !trimmed.includes('://')
  ) {
    return trimmed;
  }
  return fallback;
}

export function getHubBaseUrl(host?: string): string {
  const isStag = isStagingEnvironment(host);
  return isStag ? 'https://hub-stag.sunshade.icu' : 'https://hub.sunshade.icu';
}

export function getHubLoginUrl(returnToPath: string = '/feed', host?: string): string {
  const hubBase = getHubBaseUrl(host);
  
  let targetReturnUrl = returnToPath;

  if (targetReturnUrl.startsWith('/')) {
    const safePath = sanitizeNextUrl(targetReturnUrl, '/feed');
    if (typeof window !== 'undefined') {
      targetReturnUrl = `${window.location.origin}${safePath}`;
    } else if (host) {
      const proto = isLocalDevelopment(host) ? 'http' : 'https';
      targetReturnUrl = `${proto}://${host}${safePath}`;
    } else {
      const isStag = isStagingEnvironment(host);
      const defaultOrigin = isStag ? 'https://cozy-stag.sunshade.icu' : 'https://cozy.sunshade.icu';
      targetReturnUrl = `${defaultOrigin}${safePath}`;
    }
  } else {
    // If an absolute URL is provided, validate that it belongs to a trusted domain
    try {
      const parsed = new URL(targetReturnUrl);
      const hostname = parsed.hostname.toLowerCase();
      const isTrustedOrigin =
        hostname === 'sunshade.icu' ||
        hostname.endsWith('.sunshade.icu') ||
        hostname.endsWith('.vercel.app') ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.localhost');

      if (!isTrustedOrigin) {
        const safePath = sanitizeNextUrl(parsed.pathname + parsed.search, '/feed');
        const isStag = isStagingEnvironment(host);
        const defaultOrigin = isStag ? 'https://cozy-stag.sunshade.icu' : 'https://cozy.sunshade.icu';
        targetReturnUrl = `${defaultOrigin}${safePath}`;
      }
    } catch {
      const isStag = isStagingEnvironment(host);
      const defaultOrigin = isStag ? 'https://cozy-stag.sunshade.icu' : 'https://cozy.sunshade.icu';
      targetReturnUrl = `${defaultOrigin}/feed`;
    }
  }

  return `${hubBase}/login?redirect_to=${encodeURIComponent(targetReturnUrl)}`;
}


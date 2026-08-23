/**
 * SunShade Environment & Domain Routing Configuration Helper
 * Exposes environment detection for production (hub.sunshade.icu) vs non-prod (hub-stag.sunshade.icu).
 */

export const BUILD_ENVIRONMENT = (
  process.env.NEXT_PUBLIC_ENVIRONMENT ||
  process.env.NEXT_PUBLIC_VERCEL_ENV ||
  process.env.VERCEL_ENV ||
  process.env.NODE_ENV ||
  'development'
).toLowerCase();

/**
 * Returns true if current deployment/host is non-production (staging, preview, dev, localhost).
 */
export function isNonProdEnvironment(host?: string): boolean {
  if (BUILD_ENVIRONMENT === 'staging' || BUILD_ENVIRONMENT === 'preview' || BUILD_ENVIRONMENT === 'development') {
    return true;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    return (
      hostname.includes('-stag') ||
      hostname.includes('staging') ||
      hostname.includes('vercel.app') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1'
    );
  }

  if (host) {
    const cleanHost = host.split(':')[0].toLowerCase();
    return (
      cleanHost.includes('-stag') ||
      cleanHost.includes('staging') ||
      cleanHost.includes('vercel.app') ||
      cleanHost === 'localhost' ||
      cleanHost === '127.0.0.1'
    );
  }

  return false;
}

/**
 * Returns the appropriate SunShade Hub SSO gateway URL based on environment:
 * - Non-prod / Staging / Preview / Local: https://hub-stag.sunshade.icu
 * - Production: https://hub.sunshade.icu
 */
export function getHubBaseUrl(host?: string): string {
  if (process.env.NEXT_PUBLIC_HUB_URL) {
    return process.env.NEXT_PUBLIC_HUB_URL.replace(/\/$/, '');
  }

  const isNonProd = isNonProdEnvironment(host);
  return isNonProd ? 'https://hub-stag.sunshade.icu' : 'https://hub.sunshade.icu';
}

/**
 * Determines cookie domain:
 * - .sunshade.icu if accessing via any sunshade.icu subdomain
 * - undefined (host-only) for vercel.app preview URLs and localhost
 */
export function getCookieDomain(host?: string): string | undefined {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    return hostname.endsWith('.sunshade.icu') || hostname === 'sunshade.icu'
      ? '.sunshade.icu'
      : undefined;
  }

  if (host) {
    const cleanHost = host.split(':')[0].toLowerCase();
    return cleanHost.endsWith('.sunshade.icu') || cleanHost === 'sunshade.icu'
      ? '.sunshade.icu'
      : undefined;
  }

  return undefined;
}

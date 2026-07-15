/**
 * Cloudflare Image Resizing helper.
 *
 * Transforms an R2 object URL into a Cloudflare Image Resizing request using
 * the `/cdn-cgi/image/` path prefix. This offloads resizing, format
 * conversion (WebP/AVIF), and caching to Cloudflare's edge — no Next.js
 * image optimization worker needed.
 *
 * Prerequisites:
 *  - Your R2 bucket must be served through a Cloudflare-proxied custom domain
 *    (orange-cloud enabled). The `cdn-cgi/image/` path is unavailable on
 *    `*.r2.dev` public URLs — you need a zone-routed hostname.
 *  - Image Resizing must be enabled on the zone (Speed → Optimization → Image
 *    Resizing in the Cloudflare dashboard).
 *
 * @see https://developers.cloudflare.com/images/image-resizing/url-format/
 */

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  /** @default 'cover' */
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  /** @default 'auto' — serves WebP/AVIF to browsers that support them */
  format?: 'auto' | 'webp' | 'avif' | 'json';
}

/**
 * Returns a Cloudflare Image Resizing URL for the given source.
 *
 * @param src     The original image URL (must be on a CF-proxied domain).
 * @param width   Convenience shorthand for `options.width`.
 * @param options Additional resizing options.
 *
 * @example
 * getOptimizedImageUrl(post.light_img_url, 800)
 * // → "https://assets.example.com/cdn-cgi/image/width=800,quality=85,format=auto,fit=cover/<original-path>"
 */
export function getOptimizedImageUrl(
  src: string,
  width?: number,
  options: Omit<ImageOptions, 'width'> = {}
): string {
  // If no width is supplied and no options are set, return src unchanged
  // to avoid an empty `cdn-cgi/image/` call.
  if (!width && Object.keys(options).length === 0) return src;

  const {
    height,
    quality = 85,
    fit = 'cover',
    format = 'auto',
  } = options;

  const parts: string[] = [];
  if (width)   parts.push(`width=${width}`);
  if (height)  parts.push(`height=${height}`);
  parts.push(`quality=${quality}`);
  parts.push(`format=${format}`);
  parts.push(`fit=${fit}`);

  const descriptor = parts.join(',');

  // Parse out the origin so we can prepend the cdn-cgi path correctly.
  // Works for both absolute URLs and relative paths.
  try {
    const url = new URL(src);
    return `${url.origin}/cdn-cgi/image/${descriptor}${url.pathname}${url.search}`;
  } catch {
    // Fallback for relative paths (e.g. in tests)
    return `/cdn-cgi/image/${descriptor}${src}`;
  }
}

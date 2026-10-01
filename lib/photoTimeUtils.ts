/**
 * Utility for resolving time-aware default photo capture modes.
 *
 * Requirements:
 * - Daytime: 06:00 to 18:00 (06:00:00 - 17:59:59). Defaults to light mode (light_img_url).
 * - Evening/Night: before 06:00 or after 18:00. Defaults to dark mode (dark_img_url).
 * - Fallback: If designated mode image is null, falls back to whichever photo exists.
 */

export type CaptureMode = 'light' | 'dark';

export interface DualCapturePost {
  light_img_url?: string | null;
  dark_img_url?: string | null;
}

export function getDefaultTimeMode(
  post?: DualCapturePost | null,
  overrideHour?: number
): CaptureMode {
  if (!post || (!post.light_img_url && !post.dark_img_url)) return 'light';

  const hour = overrideHour !== undefined ? overrideHour : new Date().getHours();
  const isDaytime = hour >= 6 && hour < 18;

  if (isDaytime) {
    if (post.light_img_url) return 'light';
    if (post.dark_img_url) return 'dark';
    return 'light';
  } else {
    if (post.dark_img_url) return 'dark';
    if (post.light_img_url) return 'light';
    return 'dark';
  }
}

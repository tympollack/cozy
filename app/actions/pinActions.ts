'use server';

import { createServerClient } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PinActionResult {
  success: boolean;
  pinId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalises a user-supplied URL string.
 * Prepends https:// when no scheme is present so links are always absolute.
 * Rejects obvious non-URLs (empty strings, javascript: schemes, etc).
 */
function sanitizeUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: 'A link URL is required.' };

  // Block dangerous schemes
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) {
    return { ok: false, error: 'That URL scheme is not allowed.' };
  }

  // Prepend https:// when no protocol present
  const withScheme =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

  try {
    new URL(withScheme); // throws on malformed URLs
    return { ok: true, url: withScheme };
  } catch {
    return { ok: false, error: 'Please enter a valid URL.' };
  }
}

// ---------------------------------------------------------------------------
// createItemPin
// ---------------------------------------------------------------------------

/**
 * Creates a shoppable pin on a post the authenticated user owns.
 *
 * Security model:
 *  - Auth check: user must be authenticated.
 *  - Ownership check: a server-side query confirms the post belongs to the
 *    caller before insertion. The RLS INSERT policy is a second line of defence.
 *  - URL sanitisation: dangerous schemes are rejected and https:// is prepended
 *    when missing.
 *  - Coordinate clamping: x/y are clamped to [0, 100] to match the DB column semantics.
 *
 * @param postId    - UUID of the post to pin to.
 * @param xPercent  - Horizontal position as % of the image width (0–100).
 * @param yPercent  - Vertical position as % of the image height (0–100).
 * @param title     - Display label shown in the popover.
 * @param url       - External affiliate/shop link.
 */
export async function createItemPin(
  postId: string,
  xPercent: number,
  yPercent: number,
  title: string,
  url: string
): Promise<PinActionResult> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // Validate title
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return { success: false, error: 'A title is required.' };
  }
  if (trimmedTitle.length > 120) {
    return { success: false, error: 'Title must be 120 characters or fewer.' };
  }

  // Sanitize the URL
  const urlResult = sanitizeUrl(url);
  if (!urlResult.ok) {
    return { success: false, error: urlResult.error };
  }

  // Server-side ownership check — belt-and-suspenders on top of RLS.
  const { data: ownerRow, error: ownerError } = await supabase
    .schema('cozy')
    .from('posts')
    .select('id')
    .eq('id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (ownerError) {
    console.error('[createItemPin] ownership check error:', ownerError.message);
    return { success: false, error: 'Could not verify post ownership.' };
  }
  if (!ownerRow) {
    return { success: false, error: 'You can only tag items on your own posts.' };
  }

  // Clamp coordinates to valid range
  const clamp = (v: number) => Math.min(100, Math.max(0, v));

  const { data, error } = await supabase
    .schema('cozy')
    .from('item_pins')
    .insert({
      post_id: postId,
      user_id: user.id,
      x_percent: clamp(xPercent),
      y_percent: clamp(yPercent),
      title: trimmedTitle,
      url: urlResult.url,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[createItemPin] insert error:', error.message);
    return { success: false, error: 'Failed to create pin. Please try again.' };
  }

  return { success: true, pinId: data.id };
}

// ---------------------------------------------------------------------------
// deleteItemPin
// ---------------------------------------------------------------------------

/**
 * Deletes a shoppable pin.
 *
 * Security: the DELETE is scoped to both `id` and `user_id = auth.uid()` so
 * only the pin's creator can remove it. The DB RLS policy mirrors this.
 *
 * @param pinId - UUID of the pin to delete.
 */
export async function deleteItemPin(pinId: string): Promise<PinActionResult> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const { error } = await supabase
    .schema('cozy')
    .from('item_pins')
    .delete()
    .eq('id', pinId)
    .eq('user_id', user.id); // RLS + application-level guard

  if (error) {
    console.error('[deleteItemPin] delete error:', error.message);
    return { success: false, error: 'Failed to remove pin. Please try again.' };
  }

  return { success: true };
}

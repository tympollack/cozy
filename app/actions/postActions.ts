'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';
import { uploadToR2, generateR2Key } from '@/lib/r2';
import { encodeGeohash } from '@/lib/geohash';
import type { FeedPost } from '@/store/useCozyStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeedPayload {
  posts: FeedPost[];
  nextCursor: string | null;
}

export interface UploadPostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// getFeed — fetch the randomised, privacy-safe feed
// ---------------------------------------------------------------------------

/**
 * Fetches the randomised post feed for the authenticated user.
 *
 * Privacy guarantee: delegates to the `cozy.fetch_feed` RPC which is defined
 * with SECURITY DEFINER and explicitly excludes exact coordinates — only the
 * `obfuscated_location_hash` is returned.
 */
export async function getFeed(cursor?: string): Promise<FeedPayload> {
  const supabase = await createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { posts: [], nextCursor: null };
  }

  const service = createServiceClient();

  const { data, error } = await service.schema('cozy').rpc('fetch_feed', {
    p_user_id: user.id,
    p_limit: 20,
    p_cursor: cursor ?? null,
  });

  if (error) {
    console.error('[getFeed] RPC error:', error.message);
    return { posts: [], nextCursor: null };
  }

  const posts = (data ?? []) as FeedPost[];
  const nextCursor =
    posts.length === 20 ? posts[posts.length - 1].created_at : null;

  return { posts, nextCursor };
}

// ---------------------------------------------------------------------------
// uploadPost — secure image upload to R2 + DB insert
// ---------------------------------------------------------------------------

/**
 * Handles the full upload flow:
 * 1. Authenticates the caller.
 * 2. Extracts lat/lng from FormData, computes geohash server-side, discards coords.
 * 3. Uploads light & dark images to Cloudflare R2.
 * 4. Calls `cozy.upload_post` RPC to insert the record and award 10 points.
 *
 * Raw coordinates NEVER reach the database — only the precision-4 geohash.
 */
export async function uploadPost(formData: FormData): Promise<UploadPostResult> {
  const supabase = await createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // --- Extract files ---
  const lightFile = formData.get('light') as File | null;
  const darkFile = formData.get('dark') as File | null;

  if (!lightFile || !darkFile) {
    return { success: false, error: 'Both a Light and Dark photo are required.' };
  }

  // --- Privacy: compute geohash, discard raw coords ---
  const latRaw = formData.get('lat');
  const lngRaw = formData.get('lng');
  let obfuscatedHash: string | null = null;

  if (latRaw && lngRaw) {
    const lat = parseFloat(latRaw.toString());
    const lng = parseFloat(lngRaw.toString());
    if (!isNaN(lat) && !isNaN(lng)) {
      // Precision 4 → ~45km × 45km cell
      obfuscatedHash = encodeGeohash(lat, lng, 4);
    }
    // lat/lng are NOT stored — only the hash is forwarded
  }

  // --- Upload images to R2 ---
  try {
    const [lightBuffer, darkBuffer] = await Promise.all([
      lightFile.arrayBuffer().then(Buffer.from),
      darkFile.arrayBuffer().then(Buffer.from),
    ]);

    const lightKey = generateR2Key(user.id, 'light', lightFile.type);
    const darkKey = generateR2Key(user.id, 'dark', darkFile.type);

    const [lightUrl, darkUrl] = await Promise.all([
      uploadToR2(lightBuffer, lightKey, lightFile.type),
      uploadToR2(darkBuffer, darkKey, darkFile.type),
    ]);

    // --- Insert into DB via RPC (awards 10 points) ---
    const service = createServiceClient();
    const { data: postId, error: rpcError } = await service.schema('cozy').rpc('upload_post', {
      p_user_id: user.id,
      p_light_img_url: lightUrl,
      p_dark_img_url: darkUrl,
      p_obfuscated_location_hash: obfuscatedHash,
    });

    if (rpcError) {
      console.error('[uploadPost] RPC error:', rpcError.message);
      return { success: false, error: 'Failed to save your post. Please try again.' };
    }

    return { success: true, postId: postId as string };
  } catch (err) {
    console.error('[uploadPost] Upload error:', err);
    return { success: false, error: 'Upload failed. Please check your connection.' };
  }
}

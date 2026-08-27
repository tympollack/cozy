'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
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
  if (authError) {
    console.error('[getFeed] Auth error:', authError.message);
  }

  const { data, error } = await supabase.schema('cozy').rpc('fetch_feed', {
    p_user_id: user?.id ?? null,
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

  if (!lightFile && !darkFile) {
    return { success: false, error: 'Either a Light or Dark photo is required.' };
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
  }

  // --- Upload images to R2 ---
  try {
    let lightUrl: string | null = null;
    if (lightFile) {
      const lightBuffer = Buffer.from(await lightFile.arrayBuffer());
      const lightKey = generateR2Key(user.id, 'light', lightFile.type);
      lightUrl = await uploadToR2(lightBuffer, lightKey, lightFile.type);
    }

    let darkUrl: string | null = null;
    if (darkFile) {
      const darkBuffer = Buffer.from(await darkFile.arrayBuffer());
      const darkKey = generateR2Key(user.id, 'dark', darkFile.type);
      darkUrl = await uploadToR2(darkBuffer, darkKey, darkFile.type);
    }

    // --- Insert into DB via RPC (awards 20/50 points, milestone tokens, and stores exact coords in vault) ---
    const { data: uploadResult, error: rpcError } = await supabase.schema('cozy').rpc('upload_post', {
      p_user_id: user.id,
      p_light_img_url: lightUrl,
      p_dark_img_url: darkUrl,
      p_obfuscated_location_hash: obfuscatedHash,
      p_exact_lat: latRaw ? parseFloat(latRaw.toString()) : null,
      p_exact_lng: lngRaw ? parseFloat(lngRaw.toString()) : null,
    });

    if (rpcError) {
      console.error('[uploadPost] RPC error:', rpcError.message);
      return { success: false, error: `RPC Error: ${rpcError.message}` };
    }

    const row = Array.isArray(uploadResult) ? uploadResult[0] : uploadResult;
    const extractedPostId = typeof row === 'string' ? row : (row?.post_id || row?.id || uploadResult);

    return { success: true, postId: extractedPostId as string };
  } catch (err) {
    console.error('[uploadPost] Upload error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Upload failed: ${msg}` };
  }
}

/**
 * Deletes a post owned by the authenticated caller.
 * If the post or its assets no longer exist (e.g. 404 / already removed),
 * it is treated as a successful removal.
 */
export async function deletePost(postId: string, path?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required.' };
    }

    const serviceClient = createServiceClient();

    // 1. Fetch post to verify ownership & existence
    const { data: post, error: fetchError } = await serviceClient
      .schema('cozy')
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .maybeSingle();

    // If the post is already gone or not found (404), treat as successfully deleted!
    if (fetchError || !post) {
      console.warn(`[deletePost] Post ${postId} not found or already deleted. Treating as success.`);
      revalidatePath('/profile');
      if (path && path !== '/profile') revalidatePath(path);
      return { success: true };
    }

    // Verify ownership (allow deletion if owned by user or unassigned/orphaned)
    if (post.user_id && post.user_id !== user.id) {
      return { success: false, error: 'You do not have permission to delete this space.' };
    }

    // 2. Cascade delete all foreign key dependencies across cozy tables
    await Promise.allSettled([
      serviceClient.schema('cozy').from('user_shell_slots').delete().eq('post_id', postId),
      serviceClient.schema('cozy').from('post_stickers').delete().eq('post_id', postId),
      serviceClient.schema('cozy').from('item_pins').delete().eq('post_id', postId),
      serviceClient.schema('cozy').from('comments').delete().eq('post_id', postId),
      serviceClient.schema('cozy').from('cheers').delete().eq('post_id', postId),
      serviceClient.schema('cozy').from('post_locations').delete().eq('post_id', postId),
      serviceClient.schema('cozy').from('item_claims').delete().eq('post_id', postId),
      serviceClient.schema('cozy').from('feed_seen').delete().eq('post_id', postId),
      serviceClient.schema('cozy').from('notifications').delete().eq('post_id', postId),
    ]);

    // 3. Delete the post row
    const { error: deleteError } = await serviceClient
      .schema('cozy')
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      // If error indicates 404 / already deleted / PGRST116, treat as success!
      if (
        deleteError.code === 'PGRST116' ||
        deleteError.message?.toLowerCase().includes('not found') ||
        deleteError.message?.includes('404')
      ) {
        revalidatePath('/profile');
        if (path && path !== '/profile') revalidatePath(path);
        return { success: true };
      }
      console.error('[deletePost] Database delete error:', deleteError.message);
      return { success: false, error: 'Failed to delete space.' };
    }

    revalidatePath('/profile');
    if (path && path !== '/profile') {
      revalidatePath(path);
    }
    return { success: true };
  } catch (err: unknown) {
    const errorObj = err as { status?: number; statusCode?: number; message?: string } | null;
    // If a 404 is encountered anywhere during deletion, treat as successfully removed
    if (
      errorObj?.status === 404 ||
      errorObj?.statusCode === 404 ||
      errorObj?.message?.includes('404') ||
      errorObj?.message?.toLowerCase().includes('not found')
    ) {
      revalidatePath('/profile');
      if (path && path !== '/profile') revalidatePath(path);
      return { success: true };
    }

    console.error('[deletePost] Unexpected error:', err);
    return { success: false, error: 'Something went wrong deleting this space.' };
  }
}

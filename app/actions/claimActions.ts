'use server';

import { createServerClient, createServiceClient } from '@/lib/supabase';

// Helper: Haversine formula
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in m
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export async function verifyProximity(postId: string, userLat: number, userLng: number) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  // Use service client to bypass RLS on post_locations
  const serviceClient = createServiceClient();
  const { data: location, error } = await serviceClient
    .schema('cozy')
    .from('post_locations')
    .select('exact_lat, exact_lng')
    .eq('post_id', postId)
    .single();

  if (error || !location || !location.exact_lat || !location.exact_lng) {
    return { success: false, error: 'Unable to fetch location data for this space.' };
  }

  const distance = getDistanceFromLatLonInMeters(
    userLat,
    userLng,
    location.exact_lat,
    location.exact_lng
  );

  if (distance > 50) {
    return { success: false, error: 'You are not close enough to this location.' };
  }

  return { success: true };
}

export async function submitInteriorProof(postId: string, imageUrl: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  // First claim the post loosely
  const { error } = await supabase
    .schema('cozy')
    .from('posts')
    .update({ 
      claimed_by_user_id: user.id,
      verification_status: 'pending_postcard'
    })
    .eq('id', postId)
    .is('claimed_by_user_id', null);

  if (error) return { success: false, error: 'Failed to update claim status.' };

  return { success: true };
}

export async function triggerPostcard(postId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  const serviceClient = createServiceClient();
  
  // 1. Generate 6-digit PIN
  const pin = Math.floor(100000 + Math.random() * 900000).toString();

  // 2. Save PIN to vault (bypassing RLS)
  const { error: pinError } = await serviceClient
    .schema('cozy')
    .from('post_locations')
    .update({ postcard_pin: pin })
    .eq('post_id', postId);

  if (pinError) {
    return { success: false, error: 'Failed to save verification PIN.' };
  }

  // 3. Update public post status
  await supabase
    .schema('cozy')
    .from('posts')
    .update({ verification_status: 'pending_postcard' })
    .eq('id', postId);

  // 4. Mock Lob.com API call
  // In a real scenario, this would use the Lob Node SDK and reverse geocode the lat/lng.
  console.log(`[LOB MOCK] Postcard triggered for Post ID: ${postId} with PIN: ${pin}`);

  return { success: true };
}

// ---------------------------------------------------------------------------
// One-Tap Plot Claiming & Automatic Village Suggestions (Phase 3 Onboarding)
// ---------------------------------------------------------------------------

export interface OneTapClaimResult {
  success: boolean;
  postId?: string;
  claimedBy?: string;
  message?: string;
  error?: string;
}

/**
 * Streamlined one-tap plot claiming.
 * Assigns space ownership without requiring GPS proximity lockouts or physical postcards.
 */
export async function claimPlotOneTap(postId: string): Promise<OneTapClaimResult> {
  if (!postId) return { success: false, error: 'Post ID is required.' };

  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required to claim a space.' };
  }

  const service = createServiceClient();
  try {
    const { data: post, error: postError } = await service
      .schema('cozy')
      .from('posts')
      .select('id, claimed_by_user_id')
      .eq('id', postId)
      .maybeSingle();

    if (postError || !post) {
      return { success: false, error: 'Space not found.' };
    }

    if (post.claimed_by_user_id && post.claimed_by_user_id !== user.id) {
      return { success: false, error: 'This space has already been claimed by another neighbor.' };
    }

    const { error: updateError } = await service
      .schema('cozy')
      .from('posts')
      .update({
        claimed_by_user_id: user.id,
        verification_status: 'claimed',
      })
      .eq('id', postId);

    if (updateError) {
      return { success: false, error: updateError.message || 'Failed to claim plot.' };
    }

    try {
      const { recordPointTransaction } = await import('@/app/actions/ledgerActions');
      await recordPointTransaction({
        userId: user.id,
        amount: 25,
        transactionType: 'space_claimed',
        description: `Claimed cozy space #${postId.slice(0, 8)} (+25 pts)`,
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      postId,
      claimedBy: user.id,
      message: '✨ Plot claimed successfully! Welcome to your new home base.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to complete one-tap plot claim.';
    return { success: false, error: msg };
  }
}

export interface SuggestedVillage {
  id: string;
  name: string;
  emoji: string;
  type: string;
  memberCount: number;
  vibeMatch: string;
  description: string;
  inviteCode: string;
}

/**
 * Returns automatic village & neighborhood suggestions matching the user's vibe
 * or active community groups for low-friction village onboarding.
 */
export async function getVillageSuggestions(vibeStatus?: string): Promise<SuggestedVillage[]> {
  const service = createServiceClient();
  const normalizedVibe = (vibeStatus || 'neutral').toLowerCase();

  const CURATED_VILLAGES: Record<string, { name: string; emoji: string; desc: string; defaultCode: string }[]> = {
    sunshine: [
      { name: 'Sunlit Glade', emoji: '☀️', desc: 'Bright, cheerful morning routines and high energy', defaultCode: 'sunlit-glade' },
      { name: 'Golden Meadow', emoji: '🌻', desc: 'Warm daylight spaces and communal celebrations', defaultCode: 'golden-meadow' },
    ],
    breeze: [
      { name: 'Whispering Pines', emoji: '🍃', desc: 'Gentle, lighthearted breezes and fresh air', defaultCode: 'whispering-pines' },
      { name: 'Cedar Canopy', emoji: '🌲', desc: 'Low-friction check-ins and airy corners', defaultCode: 'cedar-canopy' },
    ],
    starlight: [
      { name: 'Starlight Grove', emoji: '🌌', desc: 'Calm evening check-ins, moonlight lamps and tea', defaultCode: 'starlight-grove' },
      { name: 'Midnight Hearth', emoji: '🌙', desc: 'Night owls sharing quiet, warm spaces', defaultCode: 'midnight-hearth' },
    ],
    raincloud: [
      { name: 'Porch Light Haven', emoji: '🌧️', desc: 'Low-spoons sanctuary for rainy days and tender care', defaultCode: 'porch-light-haven' },
      { name: 'Cinnamon Hearth', emoji: '☕', desc: 'Warm brews, weighted blankets, and gentle support', defaultCode: 'cinnamon-hearth' },
    ],
    foggy: [
      { name: 'Misty Hollow', emoji: '🌫️', desc: 'Quiet, slow-paced recovery spaces with zero judgment', defaultCode: 'misty-hollow' },
      { name: 'Porch Light Haven', emoji: '🌧️', desc: 'Low-spoons sanctuary for rainy days and tender care', defaultCode: 'porch-light-haven' },
    ],
    storm: [
      { name: 'Porch Light Haven', emoji: '🌧️', desc: 'A safe harbor with peer warmth and calm quiet', defaultCode: 'porch-light-haven' },
      { name: 'Sheltered Woods', emoji: '🪵', desc: 'Restful, unconditional peer support', defaultCode: 'sheltered-woods' },
    ],
    neutral: [
      { name: 'Cozy Commons', emoji: '🏡', desc: 'A friendly, balanced neighborhood for everyday nooks', defaultCode: 'cozy-commons' },
      { name: 'Honey Hearth', emoji: '🍯', desc: 'Sweet, low-pressure corners and daily resets', defaultCode: 'honey-hearth' },
    ],
  };

  const matchedCurated = CURATED_VILLAGES[normalizedVibe] || CURATED_VILLAGES.neutral;

  try {
    const { data: dbGroups } = await service
      .schema('cozy')
      .from('groups')
      .select('id, name, type, invite_code')
      .limit(6);

    if (dbGroups && dbGroups.length > 0) {
      return dbGroups.map((g, idx) => ({
        id: g.id,
        name: g.name,
        emoji: matchedCurated[idx % matchedCurated.length]?.emoji || '🌿',
        type: g.type || 'village',
        memberCount: 4 + idx * 3,
        vibeMatch: normalizedVibe,
        description: matchedCurated[idx % matchedCurated.length]?.desc || 'A peaceful village neighborhood.',
        inviteCode: g.invite_code,
      }));
    }
  } catch {
    // Fall back to curated list
  }

  return matchedCurated.map((c, i) => ({
    id: `village-sugg-${i + 1}`,
    name: c.name,
    emoji: c.emoji,
    type: 'village',
    memberCount: 6 + i * 4,
    vibeMatch: normalizedVibe,
    description: c.desc,
    inviteCode: c.defaultCode,
  }));
}


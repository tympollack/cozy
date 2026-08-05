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

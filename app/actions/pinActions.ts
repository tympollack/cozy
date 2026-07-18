'use server';

import { createServerClient } from '@/lib/supabase';

export async function createItemPin(
  postId: string,
  xPercent: number,
  yPercent: number,
  title: string,
  url: string
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  const { error } = await supabase
    .schema('cozy')
    .from('item_pins')
    .insert({
      post_id: postId,
      user_id: user.id,
      x_percent: xPercent,
      y_percent: yPercent,
      title,
      url,
    });

  if (error) {
    console.error('Error creating item pin:', error);
    return { success: false, error: 'Failed to create pin. Ensure you own this post.' };
  }

  return { success: true };
}

export async function deleteItemPin(pinId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized.' };

  const { error } = await supabase
    .schema('cozy')
    .from('item_pins')
    .delete()
    .eq('id', pinId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting item pin:', error);
    return { success: false, error: 'Failed to delete pin.' };
  }

  return { success: true };
}

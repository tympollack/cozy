import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import { VillageClient } from './VillageClient';

export const metadata: Metadata = {
  title: 'Village & Dollhouse — Cozy',
  description: 'Explore the 2.5D isometric village macro-plot and cozy dollhouse interiors.',
};

export default async function VillagePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/village');
  }

  return <VillageClient currentUserId={user.id} />;
}

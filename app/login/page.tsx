import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';

export const metadata = {
  title: 'Sign In — Cozy',
  description: 'Sign in to Cozy via Sunshade Hub.',
};

export default async function LoginPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/feed');
  } else {
    redirect('https://hub.sunshade.icu/login');
  }
}

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';

/**
 * Splash / root route.
 * Redirects authenticated users to the feed, unauthenticated to login.
 * Renders nothing visible itself.
 */
export default async function RootPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/feed');
  } else {
    redirect('/login');
  }
}

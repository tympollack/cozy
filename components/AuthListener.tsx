'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-browser';

export function AuthListener() {
  const router = useRouter();
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();

    // Check if URL hash has auth tokens (e.g. from magic link or OAuth)
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(({ error }) => {
          if (!error) {
            // Clean up hash from URL and refresh server components
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            router.refresh();
          }
        });
      }
    }

    // Initialize current user ID ref
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (lastUserIdRef.current === null) {
        lastUserIdRef.current = session?.user?.id ?? null;
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUserId = session?.user?.id ?? null;

      if (event === 'INITIAL_SESSION') {
        lastUserIdRef.current = currentUserId;
      } else if (event === 'SIGNED_OUT') {
        lastUserIdRef.current = null;
        router.refresh();
      } else if (event === 'SIGNED_IN') {
        // Only refresh server components if the user ID actually changed (e.g. logging in)
        if (currentUserId && currentUserId !== lastUserIdRef.current) {
          lastUserIdRef.current = currentUserId;
          router.refresh();
        }
      }
      // Note: TOKEN_REFRESHED, INITIAL_SESSION, and tab focus events refresh tokens in the background silently
      // and do NOT trigger full page/server component reloads.
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}

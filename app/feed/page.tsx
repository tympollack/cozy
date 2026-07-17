import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import { getFeed } from '@/app/actions/postActions';
import { FeedSwiper } from './FeedSwiper';

export const metadata: Metadata = {
  title: 'Feed — Cozy',
  description: 'Swipe through a curated, privacy-safe feed of cozy homes.',
};

export default async function FeedPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // We no longer redirect to login here; anonymous browsing is allowed.

  // Fetch first page server-side for instant paint
  const { posts, nextCursor } = await getFeed();

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8"
      style={{ background: 'linear-gradient(180deg, #faf7f2 0%, #f5ede0 100%)' }}
    >
      {/* Heading */}
      <div className="w-full max-w-lg mb-6 text-center">
        <h1 className="text-2xl font-800 text-[--cozy-bark]">Your Feed</h1>
        <p className="text-sm text-[--cozy-muted] mt-1">
          Swipe through cozy spaces near and far ✨
        </p>
      </div>

      <FeedSwiper initialPosts={posts} initialCursor={nextCursor} isAuthenticated={!!user} />
    </div>
  );
}

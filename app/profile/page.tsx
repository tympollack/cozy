import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase';
import { getUserPosts } from '@/app/actions/profileActions';
import { ProfileGrid } from './ProfileGrid';

export const metadata: Metadata = {
  title: 'My Spaces — Cozy',
  description: 'All the cozy spaces you\'ve shared.',
};

export default async function ProfilePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('https://hub.sunshade.icu/login');
  }

  const { posts, error } = await getUserPosts();

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ background: 'linear-gradient(180deg, #faf7f2 0%, #f5ede0 100%)' }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-800 text-[--cozy-bark]">My Spaces</h1>
          <p className="text-sm text-[--cozy-muted] mt-1">
            {posts.length === 0
              ? "You haven&apos;t shared any spaces yet."
              : `${posts.length} space${posts.length !== 1 ? 's' : ''} shared`}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl" role="img" aria-label="House">🏡</div>
            <p className="text-[--cozy-muted]">Share your first space to see it here.</p>
            <Link
              href="/camera"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                font-700 text-white bg-gradient-to-r from-[--cozy-rust] to-[--cozy-amber]
                cozy-shadow hover:opacity-90 transition-opacity"
            >
              Share Your Space ✨
            </Link>
          </div>
        ) : (
          <ProfileGrid posts={posts} />
        )}
      </div>
    </div>
  );
}

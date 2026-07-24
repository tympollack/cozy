import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase';
import { getUserProfileData } from '@/app/actions/profileActions';
import { getShellDefinition, isSlotInShell } from '@/config/shellDefinitions';
import { ProfileShell } from '@/components/ProfileShell';
import { ProfileGrid } from './ProfileGrid';
import { Sparkles, Home, Archive } from 'lucide-react';

export const metadata: Metadata = {
  title: 'My Spaces & Shell — Cozy',
  description: 'Explore your interactive 2.5D dollhouse and shared cozy spaces.',
};

export default async function ProfilePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('https://hub.sunshade.icu/login');
  }

  const { posts, shellType, isOwner, error } = await getUserProfileData(user.id);
  const currentShellDef = getShellDefinition(shellType);

  const slottedPosts = posts.filter((p) => isSlotInShell(p.shell_slot, currentShellDef));
  const unassignedPosts = posts.filter((p) => !isSlotInShell(p.shell_slot, currentShellDef));

  return (
    <div
      className="min-h-screen px-4 py-8 pb-20"
      style={{ background: 'linear-gradient(180deg, #faf7f2 0%, #f5ede0 100%)' }}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-800 text-[--cozy-bark] flex items-center gap-2">
              <Home className="text-[--cozy-rust]" size={24} />
              My Cozy Shell & Spaces
            </h1>
            <p className="text-sm text-[--cozy-muted] mt-1">
              {posts.length === 0
                ? "You haven't shared any spaces yet."
                : `${posts.length} space${posts.length !== 1 ? 's' : ''} total • ${slottedPosts.length} assigned to nooks`}
            </p>
          </div>

          <Link
            href="/camera"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full
              font-700 text-xs text-white bg-gradient-to-r from-[--cozy-rust] to-[--cozy-amber]
              cozy-shadow hover:scale-105 active:scale-95 transition-transform"
          >
            <Sparkles size={14} />
            New Space
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-20 space-y-4 bg-white/50 backdrop-blur-md rounded-3xl border border-[--cozy-amber]/20 p-8">
            <div className="text-6xl animate-bounce" role="img" aria-label="House">
              🏡
            </div>
            <h3 className="text-lg font-700 text-[--cozy-bark]">Your Shell is Empty</h3>
            <p className="text-sm text-[--cozy-muted] max-w-sm mx-auto">
              Share your first cozy room photo to populate your 2.5D dollhouse nooks!
            </p>
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
          <>
            {/* 2.5D Interactive Shell */}
            <div className="space-y-3">
              <ProfileShell
                initialShellType={shellType}
                posts={posts}
                isOwner={isOwner}
              />
            </div>

            {/* Unassigned / Archive Spaces Grid */}
            <div className="pt-6 border-t border-[--cozy-amber]/20 space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Archive size={18} className="text-[--cozy-rust]" />
                  <h2 className="text-lg font-800 text-[--cozy-bark]">
                    Unsorted Spaces ({unassignedPosts.length})
                  </h2>
                </div>
                {unassignedPosts.length > 0 && (
                  <p className="text-xs text-[--cozy-muted]">
                    Tap + on an empty nook above to feature these
                  </p>
                )}
              </div>

              {unassignedPosts.length === 0 ? (
                <div className="text-center py-10 bg-white/40 backdrop-blur-sm rounded-2xl border border-[--cozy-amber]/15">
                  <p className="text-xs font-600 text-[--cozy-muted]">
                    ✨ All your spaces are assigned to interactive nooks!
                  </p>
                </div>
              ) : (
                <ProfileGrid posts={unassignedPosts} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

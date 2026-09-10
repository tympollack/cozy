import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase';
import { getUserProfileData } from '@/app/actions/profileActions';
import { getPorchDigest } from '@/app/actions/waterfallActions';
import { getShellDefinition, isSlotInShell } from '@/config/shellDefinitions';
import { ProfileShell } from '@/components/ProfileShell';
import { PorchHoldingPen } from '@/components/PorchHoldingPen';
import { ProfileGrid } from './ProfileGrid';
import { ProfileHeader } from './ProfileHeader';
import { StickerTutorialCallout } from './StickerTutorialCallout';
import { Sparkles, Archive, Camera } from 'lucide-react';

export const metadata: Metadata = {
  title: 'My Spaces & Shell — Cozy',
  description: 'Explore your interactive 2.5D dollhouse and shared cozy spaces.',
};

export default async function ProfilePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/profile');
  }

  const {
    posts,
    shellType,
    expansionTier,
    milestoneTokens,
    themesUnlocked,
    isOwner,
    error,
  } = await getUserProfileData(user.id);

  const porchDigest = await getPorchDigest(user.id);
  const currentShellDef = getShellDefinition(shellType);

  const slottedPosts = posts.filter((p) => isSlotInShell(p.shell_slot, currentShellDef));
  const unassignedPosts = posts.filter((p) => !isSlotInShell(p.shell_slot, currentShellDef));

  // Show sticker tutorial only after first upload (tokens earned) and not yet dismissed
  const showStickerTutorial = posts.length > 0 && milestoneTokens >= 100;

  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-[#14100e] text-stone-900 dark:text-stone-100 px-4 py-3 sm:py-4 pb-16 transition-colors duration-200">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Streamlined Profile Header */}
        <ProfileHeader postsCount={posts.length} assignedCount={slottedPosts.length} />

        {/* Sticker Tutorial Callout (client component — checks Zustand flag) */}
        {showStickerTutorial && <StickerTutorialCallout tokens={milestoneTokens} />}

        {/* Porch Holding Pen */}
        <PorchHoldingPen items={porchDigest.items} />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-2xl">
            {error}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-16 space-y-4 bg-white/70 dark:bg-[#1f1713] rounded-3xl border border-amber-900/15 dark:border-amber-500/25 p-8 shadow-sm">
            <div className="text-5xl animate-bounce" role="img" aria-label="House">
              🪴
            </div>
            <h3 className="text-base font-900 text-stone-900 dark:text-stone-100">Your Corner Awaits</h3>
            <p className="text-xs font-700 text-stone-700 dark:text-stone-300 max-w-sm mx-auto">
              Share your first cozy space photo to claim your corner and earn your first 100 tokens!
            </p>
            <Link
              href="/camera"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl
                font-800 text-stone-950 bg-amber-400 hover:bg-amber-300 shadow-md hover:scale-105 active:scale-95 transition-all border border-amber-500/50"
            >
              Claim Your Corner ✨
            </Link>
          </div>
        ) : (
          <>
            {/* 2.5D Interactive Shell */}
            <div className="space-y-3">
              <ProfileShell
                initialShellType={shellType}
                initialExpansionTier={expansionTier}
                initialMilestoneTokens={milestoneTokens}
                themesUnlocked={themesUnlocked}
                posts={posts}
                isOwner={isOwner}
              />
            </div>

            {/* Unassigned / Archive Spaces Drawer */}
            <div className="pt-4 border-t border-amber-900/15 dark:border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Archive size={18} className="text-amber-800 dark:text-amber-400" />
                  <h2 className="text-base font-900 text-stone-900 dark:text-stone-100">
                    Unsorted Spaces ({unassignedPosts.length})
                  </h2>
                </div>
                <Link
                  href="/camera"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
                    font-800 text-xs text-stone-900 bg-amber-400 hover:bg-amber-300
                    shadow-xs hover:scale-105 active:scale-95 transition-all border border-amber-500/50 cursor-pointer"
                >
                  <Sparkles size={13} className="fill-stone-900 text-stone-900" />
                  <span>+ New Space</span>
                </Link>
              </div>

              {unassignedPosts.length === 0 ? (
                <div className="text-center py-5 px-4 bg-white/70 dark:bg-[#1f1713] rounded-2xl border border-amber-900/15 dark:border-amber-500/25 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs font-800 text-stone-800 dark:text-amber-200 flex items-center gap-1.5">
                    <span>✨</span>
                    <span>All your spaces are assigned to interactive nooks!</span>
                  </p>
                  <Link
                    href="/camera"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-800 text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/40 hover:bg-amber-200 transition-colors cursor-pointer"
                  >
                    <Camera size={13} />
                    <span>Snap a space</span>
                  </Link>
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

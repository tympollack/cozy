import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase';
import { getUserProfileData } from '@/app/actions/profileActions';
import { getPendingCallingCards } from '@/app/actions/peerActions';
import { getPorchDigest } from '@/app/actions/waterfallActions';
import { getShellDefinition, isSlotInShell } from '@/config/shellDefinitions';
import { ProfileShell } from '@/components/ProfileShell';
import { PorchHoldingPen } from '@/components/PorchHoldingPen';
import { ProfileGrid } from './ProfileGrid';
import { StickerTutorialCallout } from './StickerTutorialCallout';
import { Sparkles, Home, Archive, Settings } from 'lucide-react';

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

  const [profileData, porchDigest, pendingCards] = await Promise.all([
    getUserProfileData(user.id),
    getPorchDigest(user.id),
    getPendingCallingCards(user.id),
  ]);

  const {
    posts,
    shellType,
    expansionTier,
    milestoneTokens,
    themesUnlocked,
    isOwner,
    error,
  } = profileData;
  const currentShellDef = getShellDefinition(shellType);

  const slottedPosts = posts.filter((p) => isSlotInShell(p.shell_slot, currentShellDef));
  const unassignedPosts = posts.filter((p) => !isSlotInShell(p.shell_slot, currentShellDef));

  // Show sticker tutorial only after first upload (tokens earned) and not yet dismissed
  const showStickerTutorial = posts.length > 0 && milestoneTokens >= 100;

  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-[#14100e] text-stone-900 dark:text-stone-100 px-4 py-8 pb-20 transition-colors duration-200">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-900 text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Home className="text-amber-800 dark:text-amber-400" size={24} />
              <span>My Cozy Shell & Spaces</span>
            </h1>
            <p className="text-sm font-700 text-stone-700 dark:text-stone-300 mt-1">
              {posts.length === 0
                ? "You haven't shared any spaces yet."
                : `${posts.length} space${posts.length !== 1 ? 's' : ''} total • ${slottedPosts.length} assigned to nooks`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="p-2 rounded-full bg-white dark:bg-[#281e19] text-stone-800 dark:text-amber-200 border border-amber-900/15 dark:border-amber-500/30 shadow-xs hover:bg-amber-50 dark:hover:bg-[#342821] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Settings & Hub Options"
              aria-label="Settings"
            >
              <Settings size={16} className="text-amber-800 dark:text-amber-400" />
            </Link>

            <Link
              href="/camera"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full
                font-800 text-xs text-stone-900 bg-amber-400 hover:bg-amber-300
                shadow-md hover:scale-105 active:scale-95 transition-all border border-amber-500/50"
            >
              <Sparkles size={14} className="fill-stone-900 text-stone-900" />
              <span>New Space</span>
            </Link>
          </div>
        </div>

        {/* Sticker Tutorial Callout (client component — checks Zustand flag) */}
        {showStickerTutorial && <StickerTutorialCallout tokens={milestoneTokens} />}

        {/* Porch Holding Pen */}
        <PorchHoldingPen items={porchDigest.items} />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-20 space-y-4 bg-white/70 dark:bg-[#1f1713] rounded-3xl border border-amber-900/15 dark:border-amber-500/25 p-8 shadow-sm">
            <div className="text-6xl animate-bounce" role="img" aria-label="House">
              🪴
            </div>
            <h3 className="text-lg font-900 text-stone-900 dark:text-stone-100">Your Corner Awaits</h3>
            <p className="text-sm font-700 text-stone-700 dark:text-stone-300 max-w-sm mx-auto">
              Share your first cozy space photo to claim your corner and earn your first 100 tokens!
            </p>
            <Link
              href="/camera"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl
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
                peerStatus="none"
                pendingCards={pendingCards}
                recipientId={user.id}
                currentUserId={user.id}
              />
            </div>

            {/* Unassigned / Archive Spaces Grid */}
            <div className="pt-6 border-t border-amber-900/15 dark:border-amber-500/20 space-y-4">
              <div className="flex items-center justify-between px-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Archive size={18} className="text-amber-800 dark:text-amber-400" />
                  <h2 className="text-lg font-900 text-stone-900 dark:text-stone-100">
                    Unsorted Spaces ({unassignedPosts.length})
                  </h2>
                </div>
                {unassignedPosts.length > 0 && (
                  <p className="text-xs font-700 text-stone-700 dark:text-stone-300">
                    Tap + on an empty nook above to feature these
                  </p>
                )}
              </div>

              {unassignedPosts.length === 0 ? (
                <div className="text-center py-10 bg-white/70 dark:bg-[#1f1713] rounded-2xl border border-amber-900/15 dark:border-amber-500/25 shadow-xs">
                  <p className="text-xs font-800 text-stone-800 dark:text-amber-200">
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

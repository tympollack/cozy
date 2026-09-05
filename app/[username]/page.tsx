import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase';
import { getUserProfileData } from '@/app/actions/profileActions';
import { getShellDefinition, isSlotInShell } from '@/config/shellDefinitions';
import { ProfileShell } from '@/components/ProfileShell';
import { ProfileGrid } from '@/app/profile/ProfileGrid';
import { Sparkles, Home, Archive, Camera } from 'lucide-react';

interface UsernamePageProps {
  params: Promise<{
    username: string;
  }>;
}

export async function generateMetadata({ params }: UsernamePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `${resolvedParams.username}'s Cozy Space`,
    description: `Explore ${resolvedParams.username}'s shared spaces.`,
  };
}

export default async function UserProfileRoute({ params }: UsernamePageProps) {
  const resolvedParams = await params;
  const targetUsernameOrId = resolvedParams.username;

  const supabase = await createServerClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // 1. Resolve target user UUID from route param
  let targetUserId: string | null = null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUsernameOrId);

  if (isUuid) {
    targetUserId = targetUsernameOrId;
  } else {
    // Lookup by display_name
    const { data: foundByName } = await supabase
      .schema('cozy')
      .from('users')
      .select('id')
      .eq('display_name', targetUsernameOrId)
      .maybeSingle();

    if (foundByName) {
      targetUserId = foundByName.id;
    }
  }

  // 2. If user is not found, trigger 404 (do not silently fallback to logged-in user profile)
  if (!targetUserId) {
    notFound();
  }

  const currentUserId = currentUser?.id ?? null;

  // 3. Fetch profile data, peer status, and (for owners) pending cards — in parallel
  const { posts, shellType, expansionTier, milestoneTokens, themesUnlocked, isOwner, error } = await getUserProfileData(targetUserId);
  const currentShellDef = getShellDefinition(shellType);

  const { getPeerStatus, getPendingCallingCards } = await import(
    '@/app/actions/peerActions'
  );

  const [peerStatus, pendingCards] = await Promise.all([
    // Viewer–target relationship (skip if viewing own profile or logged out)
    !isOwner && currentUserId
      ? getPeerStatus(currentUserId, targetUserId)
      : Promise.resolve('none' as const),
    // Pending incoming cards to display in dollhouse mailbox (owner-only)
    isOwner
      ? getPendingCallingCards(targetUserId)
      : Promise.resolve([]),
  ]);

  const isPeer = peerStatus === 'accepted';

  const slottedPosts = posts.filter((p) => isSlotInShell(p.shell_slot, currentShellDef));
  const unassignedPosts = posts.filter((p) => !isSlotInShell(p.shell_slot, currentShellDef));

  return (
    <div className="cozy-page-bg px-4 py-3 sm:py-4 pb-16">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between py-1">
          <div>
            <h1 className="text-lg sm:text-xl font-800 text-[--cozy-bark] flex items-center gap-2 leading-tight">
              <Home className="text-[--cozy-rust]" size={20} />
              {isOwner ? 'My Cozy Shell & Spaces' : `${targetUsernameOrId}'s Cozy Shell`}
            </h1>
            <p className="text-xs text-[--cozy-muted] mt-0.5">
              {posts.length === 0
                ? 'No spaces shared yet.'
                : `${posts.length} space${posts.length !== 1 ? 's' : ''} total • ${slottedPosts.length} in nooks`}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-2xl">
            {error}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-16 space-y-4 bg-white/50 backdrop-blur-md rounded-3xl border border-[--cozy-amber]/20 p-8">
            <div className="text-5xl" role="img" aria-label="House">
              🏡
            </div>
            <h3 className="text-base font-800 text-[--cozy-bark]">
              {isOwner ? 'Your Shell Awaits' : 'Empty Shell'}
            </h3>
            <p className="text-xs text-[--cozy-muted] max-w-sm mx-auto">
              {isOwner
                ? 'Share your first cozy room photo to populate your 2.5D dollhouse nooks!'
                : 'No shared spaces have been placed in this shell yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* 2.5D Interactive Shell */}
            <ProfileShell
              initialShellType={shellType}
              initialExpansionTier={expansionTier}
              initialMilestoneTokens={milestoneTokens}
              themesUnlocked={themesUnlocked}
              posts={posts}
              isOwner={isOwner}
              peerStatus={peerStatus}
              pendingCards={pendingCards}
              recipientId={targetUserId}
              currentUserId={currentUserId}
            />

            {/* Unassigned / Archive Spaces Drawer */}
            <div className="pt-4 border-t border-[--cozy-amber]/20 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Archive size={18} className="text-[--cozy-rust]" />
                  <h2 className="text-base font-800 text-[--cozy-bark]">
                    {isOwner ? 'Unsorted Spaces' : 'Archive Spaces'} ({unassignedPosts.length})
                  </h2>
                </div>
                {isOwner && (
                  <Link
                    href="/camera"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
                      font-800 text-xs text-stone-900 bg-amber-400 hover:bg-amber-300
                      shadow-xs hover:scale-105 active:scale-95 transition-all border border-amber-500/50 cursor-pointer"
                  >
                    <Sparkles size={13} className="fill-stone-900 text-stone-900" />
                    <span>+ New Space</span>
                  </Link>
                )}
              </div>

              {unassignedPosts.length === 0 ? (
                <div className="text-center py-5 px-4 bg-white/40 backdrop-blur-sm rounded-2xl border border-[--cozy-amber]/15 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs font-600 text-[--cozy-muted] flex items-center gap-1.5">
                    <span>✨</span>
                    <span>All spaces are assigned to interactive nooks!</span>
                  </p>
                  {isOwner && (
                    <Link
                      href="/camera"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-800 text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/40 hover:bg-amber-200 transition-colors cursor-pointer"
                    >
                      <Camera size={13} />
                      <span>Snap a space</span>
                    </Link>
                  )}
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

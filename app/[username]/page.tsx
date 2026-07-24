import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase';
import { getUserProfileData } from '@/app/actions/profileActions';
import { getShellDefinition, isSlotInShell } from '@/config/shellDefinitions';
import { ProfileShell } from '@/components/ProfileShell';
import { ProfileGrid } from '@/app/profile/ProfileGrid';
import { Sparkles, Home, Archive } from 'lucide-react';

interface UsernamePageProps {
  params: Promise<{
    username: string;
  }>;
}

export async function generateMetadata({ params }: UsernamePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `${resolvedParams.username}'s Cozy Space — Cozy`,
    description: `Explore ${resolvedParams.username}'s interactive 2.5D dollhouse shell and shared rooms.`,
  };
}

export default async function UserProfileRoute({ params }: UsernamePageProps) {
  const resolvedParams = await params;
  const targetUsernameOrId = resolvedParams.username;

  const supabase = await createServerClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // 1. Resolve user ID if target is UUID or username lookup
  let targetUserId: string | null = null;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(targetUsernameOrId)) {
    // Check if target UUID exists in cozy.users
    const { data: foundByUuid } = await supabase
      .schema('cozy')
      .from('users')
      .select('id')
      .eq('id', targetUsernameOrId)
      .maybeSingle();

    if (foundByUuid) {
      targetUserId = foundByUuid.id;
    }
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

  const { posts, shellType, isOwner, error } = await getUserProfileData(targetUserId);
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
              {isOwner ? 'My Cozy Shell' : `${targetUsernameOrId}'s Cozy Shell`}
            </h1>
            <p className="text-sm text-[--cozy-muted] mt-1">
              {posts.length === 0
                ? 'No spaces shared yet.'
                : `${posts.length} space${posts.length !== 1 ? 's' : ''} total • ${slottedPosts.length} in nooks`}
            </p>
          </div>

          {isOwner && (
            <Link
              href="/camera"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full
                font-700 text-xs text-white bg-gradient-to-r from-[--cozy-rust] to-[--cozy-amber]
                cozy-shadow hover:scale-105 active:scale-95 transition-transform"
            >
              <Sparkles size={14} />
              New Space
            </Link>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-20 space-y-4 bg-white/50 backdrop-blur-md rounded-3xl border border-[--cozy-amber]/20 p-8">
            <div className="text-6xl" role="img" aria-label="House">
              🏡
            </div>
            <h3 className="text-lg font-700 text-[--cozy-bark]">
              {isOwner ? 'Your Shell is Empty' : 'This Shell is Empty'}
            </h3>
            <p className="text-sm text-[--cozy-muted] max-w-sm mx-auto">
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
              posts={posts}
              isOwner={isOwner}
            />

            {/* Unassigned / Archive Spaces Grid */}
            <div className="pt-6 border-t border-[--cozy-amber]/20 space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Archive size={18} className="text-[--cozy-rust]" />
                  <h2 className="text-lg font-800 text-[--cozy-bark]">
                    {isOwner ? 'Unsorted Spaces' : 'Archive Spaces'} ({unassignedPosts.length})
                  </h2>
                </div>
              </div>

              {unassignedPosts.length === 0 ? (
                <div className="text-center py-8 bg-white/40 backdrop-blur-sm rounded-2xl border border-[--cozy-amber]/15">
                  <p className="text-xs font-600 text-[--cozy-muted]">
                    ✨ All spaces are assigned to interactive nooks!
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

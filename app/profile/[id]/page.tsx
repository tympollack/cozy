import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Home } from 'lucide-react';
import { createServerClient, createServiceClient } from '@/lib/supabase';
import { getUserProfileData } from '@/app/actions/profileActions';
import { getPeerStatus } from '@/app/actions/peerActions';
import { getPorchDigest } from '@/app/actions/waterfallActions';
import { getShellDefinition, isSlotInShell } from '@/config/shellDefinitions';
import { ProfileShell } from '@/components/ProfileShell';
import { ProfileGrid } from '../ProfileGrid';
import type { VibeStatus } from '@/store/useCozyStore';

interface PeerProfilePageProps {
  params: Promise<{ id: string }>;
}

const VIBE_META: Record<
  VibeStatus,
  { emoji: string; label: string; badge: string }
> = {
  sunshine: { emoji: '☀️', label: 'Sunshine', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  breezy: { emoji: '🍃', label: 'Breezy', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  breeze: { emoji: '🍃', label: 'Breezy', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  starlight: { emoji: '✨', label: 'Starlight', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  neutral: { emoji: '☕', label: 'Cozy', badge: 'bg-stone-800/80 text-amber-200 border-amber-500/20' },
  foggy: { emoji: '🌫️', label: 'Foggy', badge: 'bg-stone-700/80 text-stone-300 border-stone-500/30' },
  raincloud: { emoji: '🌧️', label: 'Raincloud', badge: 'bg-slate-800/80 text-sky-300 border-sky-500/30' },
  storm: { emoji: '⛈️', label: 'Storm', badge: 'bg-purple-900/80 text-purple-300 border-purple-500/30' },
};

export async function generateMetadata({ params }: PeerProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const service = createServiceClient();
    const { data: peerUser } = await service
      .schema('cozy')
      .from('users')
      .select('display_name')
      .eq('id', id)
      .maybeSingle();

    const name = peerUser?.display_name || 'Neighbor';
    return {
      title: `${name}'s Spaces & Dollhouse — Cozy`,
      description: `Explore ${name}'s interactive dollhouse and shared cozy spaces.`,
    };
  } catch {
    return {
      title: 'Neighbor Living Space — Cozy',
      description: 'Explore peer interactive dollhouse and shared cozy spaces.',
    };
  }
}

export default async function PeerProfilePage({ params }: PeerProfilePageProps) {
  const { id } = await params;

  // 1. Current viewer authentication
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Fetch peer user record
  const service = createServiceClient();
  const { data: peerUser } = await service
    .schema('cozy')
    .from('users')
    .select('id, display_name, avatar_url, points, shell_type, vibe_status')
    .eq('id', id)
    .maybeSingle();

  // 3. Fetch peer profile data (posts, shell config)
  const {
    posts,
    shellType,
    expansionTier,
    milestoneTokens,
    themesUnlocked,
    error,
  } = await getUserProfileData(id);

  // 4. Fetch peer relationship & porch items (private porch gifts only disclosed to owner)
  const isOwner = user?.id === id;
  const peerStatus = await getPeerStatus(user?.id ?? null, id);
  const porchDigest = isOwner
    ? await getPorchDigest(id)
    : { success: true, items: [] };

  const peerName = peerUser?.display_name || 'Neighbor';
  const peerVibe = (peerUser?.vibe_status as VibeStatus) || 'neutral';
  const vibeMeta = VIBE_META[peerVibe] ?? VIBE_META.neutral;

  const effectiveShellType = peerUser?.shell_type || shellType || 'default_dollhouse';
  const currentShellDef = getShellDefinition(effectiveShellType);
  const slottedPosts = posts.filter((p) => isSlotInShell(p.shell_slot, currentShellDef));
  const sharedPosts = posts.filter((p) => !isSlotInShell(p.shell_slot, currentShellDef));

  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-[#14100e] text-stone-900 dark:text-stone-100 px-4 py-3 sm:py-4 pb-16 transition-colors duration-200">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Navigation & Peer Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Link
              href="/groups"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-800 text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft size={14} />
              <span>Back to Group Map</span>
            </Link>

            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${vibeMeta.badge}`}>
              {vibeMeta.emoji} {vibeMeta.label}
            </span>
          </div>

          <div className="bg-white/70 dark:bg-[#1f1713] rounded-3xl border border-amber-900/15 dark:border-amber-500/25 p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 text-xl font-900 shrink-0">
                {peerUser?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={peerUser.avatar_url}
                    alt={peerName}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <Home className="w-6 h-6 text-amber-500" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-900 text-stone-900 dark:text-stone-100 truncate">
                  {peerName}&apos;s Living Space
                </h1>
                <p className="text-xs font-600 text-stone-600 dark:text-amber-200/80">
                  {slottedPosts.length} nook{slottedPosts.length !== 1 ? 's' : ''} decorated · {posts.length} cozy space{posts.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-2xl">
            {error}
          </div>
        )}

        {/* Read-Only Interactive Dollhouse Shell */}
        <div className="space-y-3">
          <ProfileShell
            initialShellType={effectiveShellType}
            initialExpansionTier={expansionTier}
            initialMilestoneTokens={milestoneTokens}
            themesUnlocked={themesUnlocked}
            posts={posts}
            isOwner={false}
            recipientId={id}
            currentUserId={user?.id ?? null}
            peerStatus={peerStatus}
            porchItems={porchDigest.items}
          />
        </div>

        {/* Shared Spaces Gallery */}
        <div className="pt-4 border-t border-amber-900/15 dark:border-amber-500/20 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-800 dark:text-amber-400" />
              <h2 className="text-base font-900 text-stone-900 dark:text-stone-100">
                Shared Spaces ({sharedPosts.length > 0 ? sharedPosts.length : posts.length})
              </h2>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white/70 dark:bg-[#1f1713] rounded-3xl border border-amber-900/15 dark:border-amber-500/25 p-8 shadow-sm">
              <div className="text-4xl mb-2" role="img" aria-label="House">
                🪴
              </div>
              <h3 className="text-base font-900 text-stone-900 dark:text-stone-100">
                {peerName}&apos;s Corner is Quiet
              </h3>
              <p className="text-xs font-700 text-stone-700 dark:text-stone-300 max-w-sm mx-auto">
                No cozy spaces have been shared to this dollhouse yet.
              </p>
            </div>
          ) : (
            <ProfileGrid
              posts={sharedPosts.length > 0 ? sharedPosts : posts}
              readOnly={!isOwner}
            />
          )}
        </div>
      </div>
    </div>
  );
}

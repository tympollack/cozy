'use client';

import { useState, useCallback, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw, Trash2, MoreVertical, ExternalLink, X, AlertTriangle } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/cloudflare';
import { calcStickerOpacity, calcReupCost } from '@/lib/stickerMath';
import { reupSticker } from '@/app/actions/stickerActions';
import { deletePost } from '@/app/actions/postActions';
import { useCozyStore } from '@/store/useCozyStore';
import type { UserPost, PostSticker } from '@/store/useCozyStore';

// ---------------------------------------------------------------------------
// StickerOverlay — mini sticker rendered on the thumbnail
// ---------------------------------------------------------------------------

function StickerOverlay({ sticker, postId }: { sticker: PostSticker; postId: string }) {
  const { setPoints } = useCozyStore();
  const [isPending, startTransition] = useTransition();
  const [localReupAt, setLocalReupAt] = useState(sticker.last_reup_at);

  const opacity = calcStickerOpacity(localReupAt, sticker.decay_rate_per_day);
  const needsReup = opacity < 1.0;
  const reupCost = calcReupCost(sticker.cost, opacity);

  const handleReup = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startTransition(async () => {
        const now = new Date().toISOString();
        setLocalReupAt(now);
        const result = await reupSticker(sticker.id, reupCost);
        if (result.success && result.newPoints !== undefined) {
          setPoints(result.newPoints);
        } else {
          setLocalReupAt(sticker.last_reup_at);
        }
      });
    },
    [sticker.id, sticker.last_reup_at, reupCost, setPoints]
  );

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: `${sticker.x_percent}%`,
        top: `${sticker.y_percent}%`,
        transform: `translate(-50%, -50%) rotate(${sticker.rotation_degrees}deg)`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sticker.sticker_url}
        alt="Sticker"
        className="w-7 h-7 object-contain drop-shadow-sm select-none pointer-events-none"
        style={{ opacity: Math.max(opacity, 0.2) }}
        loading="lazy"
      />
      {needsReup && (
        <button
          onClick={handleReup}
          disabled={isPending}
          aria-label={`Re-up sticker for ${reupCost} points`}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-700 whitespace-nowrap bg-black/80 text-white hover:bg-black transition-colors shadow-md"
        >
          <RefreshCw size={7} className={isPending ? 'animate-spin' : ''} />
          {reupCost}pt
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostThumbnail
// ---------------------------------------------------------------------------

function PostThumbnail({
  post,
  onManage,
}: {
  post: UserPost;
  onManage?: (post: UserPost) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const activeUrl = post.light_img_url || post.dark_img_url;
  const hasDecayedSticker = post.stickers.some(
    (s) => calcStickerOpacity(s.last_reup_at, s.decay_rate_per_day) < 1.0
  );

  return (
    <div className="relative group">
      <Link
        href={`/post/${post.id}`}
        className="block relative rounded-2xl overflow-hidden bg-stone-200 dark:bg-[#201813]
          cozy-shadow hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
        aria-label={`View post from ${new Date(post.created_at).toLocaleDateString()}`}
      >
        {/* Photo */}
        {activeUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getOptimizedImageUrl(activeUrl, 400)}
            alt="Your cozy space"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full aspect-[3/4] object-cover"
          />
        ) : (
          <div className="w-full aspect-[3/4] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-stone-200 to-stone-300 dark:from-[#2a1f18] dark:to-[#18120e] text-center">
            <span className="text-3xl mb-1.5 filter drop-shadow-xs">🏡</span>
            <span className="text-xs font-900 text-stone-900 dark:text-amber-100 bg-white/90 dark:bg-black/50 px-2.5 py-1 rounded-full border border-amber-900/15 dark:border-amber-500/30 shadow-xs">
              Cozy Space
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Stickers layer */}
        {post.stickers.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {post.stickers.map((sticker) => (
              <StickerOverlay key={sticker.id} sticker={sticker} postId={post.id} />
            ))}
          </div>
        )}

        {/* Re-Up badge */}
        {hasDecayedSticker && (
          <div className="absolute top-2 left-2 z-20
            flex items-center gap-1 px-2 py-0.5 rounded-full
            bg-amber-400 text-stone-950 text-[9px] font-900 shadow-md">
            <RefreshCw size={8} />
            Re-Up
          </div>
        )}

        {/* Date footer */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10 flex items-center justify-between text-white">
          <span className="text-[10px] font-700 text-white/95">
            {new Date(post.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
          {post.cheer_count > 0 && (
            <span className="text-[10px] font-800 text-rose-300">
              ♥ {post.cheer_count}
            </span>
          )}
        </div>
      </Link>

      {/* Owner Manage Button */}
      {onManage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onManage(post);
          }}
          className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full
            bg-black/70 hover:bg-black text-white
            flex items-center justify-center backdrop-blur-md border border-white/30
            shadow-md transition-all active:scale-90 cursor-pointer"
          title="Manage Space"
          aria-label="Manage space options"
        >
          <MoreVertical size={14} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProfileGrid
// ---------------------------------------------------------------------------

export function ProfileGrid({ posts: initialPosts }: { posts: UserPost[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [localPosts, setLocalPosts] = useState<UserPost[]>(initialPosts);

  useEffect(() => {
    setLocalPosts(initialPosts);
  }, [initialPosts]);

  const [managedPost, setManagedPost] = useState<UserPost | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleDeletePost = () => {
    if (!managedPost) return;
    const targetId = managedPost.id;

    // Remove immediately from client UI state
    setLocalPosts((prev) => prev.filter((p) => p.id !== targetId));
    setManagedPost(null);
    setShowConfirmDelete(false);

    startDeleteTransition(async () => {
      try {
        await deletePost(targetId, pathname);
      } catch (err) {
        console.error('Delete post error:', err);
      } finally {
        router.refresh();
      }
    });
  };

  return (
    <>
      <div
        className="columns-2 sm:columns-3 gap-3"
        style={{ columnFill: 'balance' }}
      >
        {localPosts.map((post) => (
          <div key={post.id} className="break-inside-avoid mb-3">
            <PostThumbnail post={post} onManage={(p) => setManagedPost(p)} />
          </div>
        ))}
      </div>

      {/* Space Management Modal */}
      {managedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[32px] p-6 bg-[#faf7f2] dark:bg-[#1c1613] text-stone-900 dark:text-amber-50 border border-amber-900/15 dark:border-amber-500/30 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-amber-900/10 dark:border-amber-500/20 pb-3">
              <div>
                <h3 className="text-base font-900 text-stone-900 dark:text-amber-50">Manage Space</h3>
                <p className="text-xs font-700 text-stone-700 dark:text-amber-200/90 mt-0.5">
                  Shared on {new Date(managedPost.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setManagedPost(null);
                  setShowConfirmDelete(false);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-700 dark:text-amber-200 hover:bg-stone-200 dark:hover:bg-[#281e19] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thumbnail Preview & Info */}
            <div className="flex items-center gap-3 bg-white dark:bg-[#241a15] p-3.5 rounded-2xl border border-amber-900/15 dark:border-amber-500/25 shadow-xs">
              {managedPost.light_img_url || managedPost.dark_img_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={getOptimizedImageUrl(managedPost.light_img_url || managedPost.dark_img_url, 200)}
                  alt="Space thumbnail"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                  className="w-14 h-14 rounded-xl object-cover shadow-xs bg-amber-900/20"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/40 flex items-center justify-center text-2xl">
                  🏡
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-900 text-stone-900 dark:text-amber-50 truncate">
                  {managedPost.shell_slot ? `Occupies ${managedPost.shell_slot}` : 'Unsorted Archive Space'}
                </p>
                <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 mt-0.5">
                  ♥ {managedPost.cheer_count} cheers received
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2.5">
              <Link
                href={`/post/${managedPost.id}`}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-900 bg-white dark:bg-[#241a15] text-stone-900 dark:text-amber-50 hover:bg-amber-50 dark:hover:bg-[#2e211b] border border-amber-900/15 dark:border-amber-500/30 transition-all shadow-xs"
              >
                <ExternalLink size={14} className="text-amber-700 dark:text-amber-400" />
                <span>View Full Space Details</span>
              </Link>

              {!showConfirmDelete ? (
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-900 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 transition-all border border-red-200 dark:border-red-800/50 cursor-pointer shadow-xs"
                >
                  <Trash2 size={14} />
                  <span>Delete Space</span>
                </button>
              ) : (
                <div className="bg-red-50 dark:bg-red-950/60 p-4 rounded-2xl border border-red-200 dark:border-red-800/60 space-y-3">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-200 text-xs font-900">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>Delete this space permanently?</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setShowConfirmDelete(false)}
                      className="py-2.5 rounded-xl text-xs font-800 bg-white dark:bg-[#281e19] text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeletePost}
                      disabled={isDeleting}
                      className="py-2.5 rounded-xl text-xs font-900 bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

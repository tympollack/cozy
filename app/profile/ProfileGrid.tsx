'use client';

import { useState, useCallback, useTransition, useOptimistic } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
        className="w-7 h-7 object-contain drop-shadow-sm pointer-events-none select-none"
        style={{ opacity: Math.max(opacity, 0.2) }}
        loading="lazy"
      />
      {needsReup && (
        <button
          onClick={handleReup}
          disabled={isPending}
          aria-label={`Re-Up sticker for ${reupCost} pts`}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2
            flex items-center gap-0.5 px-1.5 py-0.5 rounded-full
            text-[8px] font-700 whitespace-nowrap
            bg-black/70 text-white/90 hover:bg-black/90
            transition-colors disabled:opacity-50"
        >
          <RefreshCw size={6} className={isPending ? 'animate-spin' : ''} />
          {reupCost}
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
  const activeUrl = post.light_img_url || post.dark_img_url;
  const hasDecayedSticker = post.stickers.some(
    (s) => calcStickerOpacity(s.last_reup_at, s.decay_rate_per_day) < 1.0
  );

  return (
    <div className="relative group">
      <Link
        href={`/post/${post.id}`}
        className="block relative rounded-2xl overflow-hidden bg-[--cozy-warm]
          cozy-shadow hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
        aria-label={`View post from ${new Date(post.created_at).toLocaleDateString()}`}
      >
        {/* Photo */}
        {activeUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getOptimizedImageUrl(activeUrl, 400)}
            alt="Your cozy space"
            loading="lazy"
            className="w-full aspect-[3/4] object-cover"
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

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
            bg-amber-400/90 text-amber-900 text-[9px] font-700 backdrop-blur-sm">
            <RefreshCw size={8} />
            Re-Up
          </div>
        )}

        {/* Date footer */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10 flex items-center justify-between text-white">
          <span className="text-[10px] font-600 text-white/90">
            {new Date(post.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
          {post.cheer_count > 0 && (
            <span className="text-[10px] font-700 text-rose-200">
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
            bg-black/60 hover:bg-black/80 text-white/90
            flex items-center justify-center backdrop-blur-md border border-white/20
            shadow-md transition-all active:scale-90"
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
  const [managedPost, setManagedPost] = useState<UserPost | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [optimisticPosts, setOptimisticPosts] = useOptimistic(
    initialPosts,
    (state, deleteId: string) => state.filter((p) => p.id !== deleteId)
  );

  const handleDeletePost = () => {
    if (!managedPost) return;
    const targetId = managedPost.id;

    startDeleteTransition(async () => {
      setOptimisticPosts(targetId);
      setManagedPost(null);
      setShowConfirmDelete(false);
      await deletePost(targetId, pathname);
    });
  };

  return (
    <>
      <div
        className="columns-2 sm:columns-3 gap-3"
        style={{ columnFill: 'balance' }}
      >
        {optimisticPosts.map((post) => (
          <div key={post.id} className="break-inside-avoid mb-3">
            <PostThumbnail post={post} onManage={(p) => setManagedPost(p)} />
          </div>
        ))}
      </div>

      {/* Space Management Modal */}
      {managedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl p-6 cozy-glass border border-[--cozy-amber]/30 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[--cozy-amber]/20 pb-3">
              <div>
                <h3 className="text-base font-800 text-[--cozy-night]">Manage Space</h3>
                <p className="text-xs text-[--cozy-muted]">
                  Shared on {new Date(managedPost.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setManagedPost(null);
                  setShowConfirmDelete(false);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[--cozy-muted] hover:bg-black/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thumbnail Preview & Info */}
            <div className="flex items-center gap-3 bg-white/40 dark:bg-zinc-800/40 p-3 rounded-2xl border border-white/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getOptimizedImageUrl(managedPost.light_img_url || managedPost.dark_img_url, 200)}
                alt="Space thumbnail"
                className="w-14 h-14 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-700 text-[--cozy-bark] truncate">
                  {managedPost.shell_slot ? `Occupies ${managedPost.shell_slot}` : 'Unsorted Archive Space'}
                </p>
                <p className="text-[11px] font-600 text-rose-500">
                  ♥ {managedPost.cheer_count} cheers received
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2">
              <Link
                href={`/post/${managedPost.id}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-700 bg-white/80 dark:bg-zinc-700/80 text-[--cozy-bark] hover:bg-white border border-[--cozy-amber]/30 transition-colors"
              >
                <ExternalLink size={14} /> View Full Space Details
              </Link>

              {!showConfirmDelete ? (
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-700 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors border border-red-200 dark:border-red-800/40"
                >
                  <Trash2 size={14} /> Delete Space
                </button>
              ) : (
                <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-2xl border border-red-200 dark:border-red-800/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-red-600 text-xs font-700">
                    <AlertTriangle size={14} />
                    <span>Delete this space permanently?</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setShowConfirmDelete(false)}
                      className="py-1.5 rounded-lg text-xs font-600 bg-white text-zinc-700 border border-zinc-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeletePost}
                      disabled={isDeleting}
                      className="py-1.5 rounded-lg text-xs font-700 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
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

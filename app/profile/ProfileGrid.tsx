'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/cloudflare';
import { calcStickerOpacity, calcReupCost } from '@/lib/stickerMath';
import { reupSticker } from '@/app/actions/stickerActions';
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
      e.preventDefault(); // Don't navigate to post detail
      e.stopPropagation();
      startTransition(async () => {
        const now = new Date().toISOString();
        setLocalReupAt(now);
        const result = await reupSticker(sticker.id, reupCost);
        if (result.success && result.newPoints !== undefined) {
          setPoints(result.newPoints);
        } else {
          setLocalReupAt(sticker.last_reup_at); // rollback
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

function PostThumbnail({ post }: { post: UserPost }) {
  const activeUrl = post.light_img_url || post.dark_img_url;
  const hasDecayedSticker = post.stickers.some(
    (s) => calcStickerOpacity(s.last_reup_at, s.decay_rate_per_day) < 1.0
  );

  return (
    <Link
      href={`/post/${post.id}`}
      className="block relative rounded-2xl overflow-hidden bg-[--cozy-warm]
        cozy-shadow hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 group"
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* Stickers layer */}
      {post.stickers.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {post.stickers.map((sticker) => (
            <StickerOverlay key={sticker.id} sticker={sticker} postId={post.id} />
          ))}
        </div>
      )}

      {/* Re-Up badge — shown when any sticker is fading */}
      {hasDecayedSticker && (
        <div className="absolute top-2 right-2 z-20
          flex items-center gap-1 px-2 py-1 rounded-full
          bg-amber-400/90 text-amber-900 text-[10px] font-700 backdrop-blur-sm">
          <RefreshCw size={9} />
          Re-Up
        </div>
      )}

      {/* Date footer */}
      <div className="absolute bottom-0 left-0 right-0 p-2 z-10">
        <span className="text-[10px] font-500 text-white/80">
          {new Date(post.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
        {post.cheer_count > 0 && (
          <span className="ml-2 text-[10px] font-600 text-rose-300">
            ♥ {post.cheer_count}
          </span>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// ProfileGrid
// ---------------------------------------------------------------------------

export function ProfileGrid({ posts }: { posts: UserPost[] }) {
  return (
    <div
      className="columns-2 sm:columns-3 gap-3"
      style={{ columnFill: 'balance' }}
    >
      {posts.map((post) => (
        <div key={post.id} className="break-inside-avoid mb-3">
          <PostThumbnail post={post} />
        </div>
      ))}
    </div>
  );
}

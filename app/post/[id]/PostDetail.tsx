'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, MapPin, Heart, Sparkles, ArrowLeft, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { getOptimizedImageUrl } from '@/lib/cloudflare';
import { calcStickerOpacity } from '@/lib/stickerMath';
import { StickerDrawer, STICKER_CATALOG } from '@/components/StickerDrawer';
import { DraggableSticker } from '@/components/DraggableSticker';
import { useCozyStore } from '@/store/useCozyStore';
import type { UserPost, PostSticker } from '@/store/useCozyStore';
import type { StickerCatalogItem } from '@/components/StickerDrawer';
import { CommentBox } from '@/components/CommentBox';
import { getComments, type Comment } from '@/app/actions/commentActions';
import { ClaimHouseModal } from '@/components/ClaimHouseModal';
import { Home, Tag } from 'lucide-react';
import { ShoppableImage } from '@/components/ShoppableImage';
import { PinDropZone } from '@/components/PinDropZone';

interface PostDetailProps {
  post: UserPost;
  currentUserId: string | null;
}

export function PostDetail({ post, currentUserId }: PostDetailProps) {
  const router = useRouter();
  const { points } = useCozyStore();

  const [showDark, setShowDark] = useState(!post.light_img_url);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingSticker, setPendingSticker] = useState<StickerCatalogItem | null>(null);
  const [localStickers, setLocalStickers] = useState<PostSticker[]>(
    post.stickers as PostSticker[]
  );
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [isTagging, setIsTagging] = useState(false);
  // Optimistic pin list — starts from SSR data, updated when the user adds/removes pins
  const [localPins, setLocalPins] = useState(post.item_pins ?? []);

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    const data = await getComments(post.id);
    setComments(data);
    setLoadingComments(false);
  }, [post.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const [sliderPos, setSliderPos] = useState(50);
  const handleDrag = useCallback((_e: any, info: any) => {
    if (!photoRef.current) return;
    const { width } = photoRef.current.getBoundingClientRect();
    setSliderPos((prev) => {
      const deltaPercent = (info.delta.x / width) * 100;
      return Math.min(100, Math.max(0, prev + deltaPercent));
    });
  }, []);

  // Ref for the photo container — used by DraggableSticker for boundary + coordinate math
  const photoRef = useRef<HTMLDivElement>(null);

  const activeUrl = showDark
    ? (post.dark_img_url || post.light_img_url)
    : (post.light_img_url || post.dark_img_url);

  const isOwner = currentUserId === post.user_id;

  const handleStickerSelect = useCallback((sticker: StickerCatalogItem) => {
    setDrawerOpen(false);
    setPendingSticker(sticker);
  }, []);

  const handleStickerConfirm = useCallback(
    (newSticker: {
      sticker_url: string;
      x_percent: number;
      y_percent: number;
      rotation_degrees: number;
      cost: number;
      decay_rate_per_day: number;
    }) => {
      // Optimistically add the new sticker to the local state
      const optimistic: PostSticker = {
        id: `optimistic-${Date.now()}`,
        sticker_url: newSticker.sticker_url,
        cost: newSticker.cost,
        decay_rate_per_day: newSticker.decay_rate_per_day,
        placed_at: new Date().toISOString(),
        last_reup_at: new Date().toISOString(),
        placed_by_user_id: currentUserId ?? '',
        x_percent: newSticker.x_percent,
        y_percent: newSticker.y_percent,
        rotation_degrees: newSticker.rotation_degrees,
      };
      setLocalStickers((prev) => [...prev, optimistic]);
      setPendingSticker(null);
    },
    [currentUserId]
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Back nav */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-600 text-[--cozy-bark]
          hover:text-[--cozy-rust] transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Photo container */}
      <div
        ref={photoRef}
        className="relative w-full rounded-3xl overflow-hidden cozy-shadow-lg bg-[--cozy-warm]"
        style={{ aspectRatio: '3/4' }}
      >
        <ShoppableImage itemPins={localPins} currentUserId={currentUserId}
          onPinDeleted={(id) => setLocalPins((prev) => prev.filter((p) => p.id !== id))}
        >
          {/* Main photo(s) */}
          {post.light_img_url && post.dark_img_url ? (
            <>
              <img
                src={getOptimizedImageUrl(post.dark_img_url, 800)}
                alt="Night-time room"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <img
                src={getOptimizedImageUrl(post.light_img_url, 800)}
                alt="Day-time room"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              />
              <motion.div
                onPan={handleDrag}
                className="absolute top-0 bottom-0 z-30 cursor-ew-resize flex items-center justify-center group"
                style={{ left: `${sliderPos}%`, translateX: '-50%', touchAction: 'none' }}
              >
                <div className="w-1 h-full bg-white/50 backdrop-blur-sm group-hover:bg-white/80 transition-colors shadow-[0_0_10px_rgba(0,0,0,0.3)]" />
                <div className="absolute w-8 h-12 bg-white/20 backdrop-blur-md border border-white/40 shadow-lg rounded-full flex items-center justify-center">
                  <GripVertical size={16} className="text-white drop-shadow-md" />
                </div>
              </motion.div>
            </>
          ) : activeUrl && (
            <img
              src={getOptimizedImageUrl(activeUrl, 800)}
              alt={showDark ? 'Night-time room' : 'Day-time room'}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </ShoppableImage>

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Placed stickers */}
        {localStickers.map((sticker) => {
          const opacity = Math.max(calcStickerOpacity(sticker.last_reup_at, sticker.decay_rate_per_day), 0.2);
          return (
            <div
              key={sticker.id}
              className="absolute pointer-events-none select-none"
              style={{
                left: `${sticker.x_percent}%`,
                top: `${sticker.y_percent}%`,
                transform: `translate(-50%, -50%) rotate(${sticker.rotation_degrees}deg)`,
                opacity,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sticker.sticker_url}
                alt="Sticker"
                className="w-14 h-14 object-contain drop-shadow-lg"
                loading="lazy"
              />
            </div>
          );
        })}

        {/* Active drag sticker */}
        {pendingSticker && (
          <DraggableSticker
            sticker={pendingSticker}
            postId={post.id}
            containerRef={photoRef}
            onConfirm={handleStickerConfirm}
            onCancel={() => setPendingSticker(null)}
          />
        )}



        {/* Decorate button — always visible for authenticated users */}
        {currentUserId && !pendingSticker && !isTagging && (
          <button
            id="post-decorate-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Add a sticker decoration"
            className="absolute bottom-4 right-4 z-30
              flex items-center gap-1.5 px-4 py-2.5 rounded-full
              font-700 text-sm text-white/90 backdrop-blur-md bg-white/20 border border-white/20
              shadow-lg hover:scale-105 active:scale-95 transition-transform"
          >
            <Sparkles size={15} className="text-[--cozy-gold]" />
            Decorate
          </button>
        )}

        {/* Claim This Space button */}
        {!post.claimed_by_user_id && currentUserId && !pendingSticker && !isTagging && (
          <button
            onClick={() => setShowClaimModal(true)}
            aria-label="Claim this space"
            className="absolute top-4 right-4 z-30
              flex items-center gap-1.5 px-4 py-2.5 rounded-full
              font-700 text-sm text-white/90 backdrop-blur-md bg-zinc-900/40 border border-white/20
              shadow-lg hover:scale-105 active:scale-95 transition-transform"
          >
            <Home size={15} className="text-white" />
            Claim Space
          </button>
        )}

        {/* Tag Item button */}
        {isOwner && !pendingSticker && !isTagging && (
          <button
            onClick={() => setIsTagging(true)}
            aria-label="Tag an item"
            className="absolute top-4 left-4 z-30
              flex items-center gap-1.5 px-4 py-2.5 rounded-full
              font-700 text-sm text-white/90 backdrop-blur-md bg-indigo-600/60 border border-white/20
              shadow-lg hover:scale-105 active:scale-95 transition-transform"
          >
            <Tag size={15} className="text-white" />
            Tag Item
          </button>
        )}

        {isTagging && (
          <PinDropZone
            postId={post.id}
            onCancel={() => setIsTagging(false)}
            onSuccess={(pinId) => {
              // Optimistically add a placeholder pin so the dot appears instantly.
              // x/y are unknown from the server response here — we reload only the
              // pins by re-using what the form captured via localPins state.
              // A lightweight approach: just close the tagging mode; the pin was
              // confirmed via the server action so it's persisted. We do a soft
              // router refresh to hydrate the true record from the DB.
              setIsTagging(false);
              // Next.js 16 App Router: router.refresh() re-runs the Server Component
              // without a full page navigation, preserving scroll position.
              router.refresh();
            }}
          />
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between px-1">
        {post.obfuscated_location_hash ? (
          <div className="flex items-center gap-1.5 text-sm text-[--cozy-muted]">
            <MapPin size={14} className="text-[--cozy-amber]" />
            <span className="font-mono text-xs">{post.obfuscated_location_hash}</span>
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-1.5 text-sm text-[--cozy-muted]">
          <Heart size={14} className="text-rose-400 fill-rose-400" />
          <span className="font-600">{post.cheer_count}</span>
          <span>cheers</span>
        </div>
      </div>

      {/* Sticker count */}
      {localStickers.length > 0 && (
        <p className="text-xs text-[--cozy-muted] px-1">
          {localStickers.length} sticker{localStickers.length !== 1 ? 's' : ''} decorating this space
        </p>
      )}

      {/* Comments Section */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4 px-1">Comments</h3>
        
        {loadingComments ? (
          <div className="text-sm text-zinc-500 px-1">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-zinc-500 px-1">No comments yet. Be the first to leave a positive tip!</div>
        ) : (
          <div className="space-y-4 px-1">
            {comments.map((comment) => (
              <div key={comment.id} className={`flex flex-col gap-1 ${comment.is_toxic ? 'opacity-70' : ''}`}>
                <div className="text-sm text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl rounded-tl-sm">
                  {comment.text}
                </div>
                {comment.is_toxic && (
                  <span className="text-[10px] text-red-500 font-semibold px-2">☁️ Grumpy Cloud Warning Applied</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <CommentBox postId={post.id} onCommentAdded={fetchComments} />
        </div>
      </div>

      {/* Sticker Drawer */}
      <StickerDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelect={handleStickerSelect}
      />

      {/* Claim House Modal */}
      {showClaimModal && (
        <ClaimHouseModal 
          postId={post.id} 
          onClose={() => setShowClaimModal(false)} 
        />
      )}
    </div>
  );
}

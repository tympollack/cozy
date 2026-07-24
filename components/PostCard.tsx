'use client';

import { useState, useCallback, useTransition, useRef } from 'react';
import { Sun, Moon, Heart, MapPin, RefreshCw, GripVertical } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ParticleBurst } from './ParticleBurst';
import { getOptimizedImageUrl } from '@/lib/cloudflare';
import { GrumpyCloudOverlay } from '@/components/GrumpyCloudOverlay';
import { reupSticker } from '@/app/actions/stickerActions';
import { calcStickerOpacity, calcReupCost } from '@/lib/stickerMath';
import { useCozyStore } from '@/store/useCozyStore';
import type { FeedPost, PostSticker } from '@/store/useCozyStore';
import { ShoppableImage } from '@/components/ShoppableImage';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PostCardProps {
  post: FeedPost;
  onCheer: () => Promise<void>;
  /** The authenticated user's ID — enables pin delete on owned posts in the feed. */
  currentUserId?: string | null;
  style?: React.CSSProperties;
  className?: string;
}

// ---------------------------------------------------------------------------
// StickerLayer — renders a single sticker with decay opacity + Re-Up button
// ---------------------------------------------------------------------------

interface StickerLayerProps {
  sticker: PostSticker;
  postId: string;
}

function StickerLayer({ sticker, postId }: StickerLayerProps) {
  const { setPoints, updateStickerReup } = useCozyStore();
  const [isPending, startTransition] = useTransition();
  const [flashKey, setFlashKey] = useState(0);
  const [localReupAt, setLocalReupAt] = useState(sticker.last_reup_at);

  const opacity = calcStickerOpacity(localReupAt, sticker.decay_rate_per_day);
  const isGhost  = opacity <= 0.2;
  const isOwner  = true; // PostCard doesn't receive currentUserId yet — wired below
  const reupCost = calcReupCost(sticker.cost, opacity);

  const handleReup = useCallback(() => {
    startTransition(async () => {
      const now = new Date().toISOString();
      // Optimistic: snap opacity back to 1 immediately
      setLocalReupAt(now);
      setFlashKey((k) => k + 1);

      const result = await reupSticker(sticker.id, reupCost);

      if (result.success) {
        if (result.newPoints !== undefined) setPoints(result.newPoints);
        updateStickerReup(postId, sticker.id, now);
      } else {
        // Rollback
        setLocalReupAt(sticker.last_reup_at);
      }
    });
  }, [sticker.id, sticker.last_reup_at, reupCost, postId, setPoints, updateStickerReup]);

  return (
    <div
      className="absolute"
      style={{
        left: `${sticker.x_percent}%`,
        top: `${sticker.y_percent}%`,
        transform: `translate(-50%, -50%) rotate(${sticker.rotation_degrees}deg)`,
      }}
    >
      {/* Sticker image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={flashKey}
        src={sticker.sticker_url}
        alt="Sticker"
        loading="lazy"
        className={`sticker-img w-12 h-12 object-contain
          ${isGhost ? 'sticker-ghost' : ''}
          ${flashKey > 0 ? 'sticker-reup-flash' : ''}
        `}
        style={{
          opacity,
          '--sticker-opacity': opacity,
        } as React.CSSProperties}
      />

      {/* Re-Up button — shown only when below full opacity */}
      {opacity < 1.0 && (
        <button
          id={`reup-btn-${sticker.id}`}
          onClick={handleReup}
          disabled={isPending}
          aria-label={`Re-Up sticker for ${reupCost} point${reupCost !== 1 ? 's' : ''}`}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2
            flex items-center gap-1 px-2 py-0.5 rounded-full
            text-[10px] font-700 whitespace-nowrap
            backdrop-blur-md bg-white/20 dark:bg-black/40 border border-white/20 text-white/90
            hover:bg-black/60 active:scale-95
            transition-all duration-150 shadow-lg
            disabled:opacity-50"
        >
          <RefreshCw size={8} className={isPending ? 'animate-spin' : ''} aria-hidden="true" />
          {isPending ? '…' : `${reupCost}pt`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------

export function PostCard({ post, onCheer, currentUserId, style, className = '' }: PostCardProps) {
  const [showDark, setShowDark] = useState(!post.light_img_url);
  const [cheering, setCheering] = useState(false);
  const [cheered, setCheered] = useState(post.has_cheered);
  const [cheerCount, setCheerCount] = useState(post.cheer_count);

  const activeUrl = showDark ? (post.dark_img_url || post.light_img_url) : (post.light_img_url || post.dark_img_url);

  const handleCheer = useCallback(async () => {
    if (cheered || cheering) return;
    setCheering(true);
    setCheered(true);
    setCheerCount((c) => c + 1);
    try {
      await onCheer();
    } catch {
      setCheered(false);
      setCheerCount((c) => c - 1);
    } finally {
      setCheering(false);
    }
  }, [cheered, cheering, onCheer]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);

  const handleDrag = useCallback((_e: any, info: any) => {
    if (!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    setSliderPos((prev) => {
      const deltaPercent = (info.delta.x / width) * 100;
      return Math.min(100, Math.max(0, prev + deltaPercent));
    });
  }, []);

  return (
    <div
      ref={containerRef}
      style={style}
      className={`swipe-card cozy-shadow-lg bg-white ${className}`}
    >
      <div className="relative w-full h-full">

        {/* ── Main photo(s) ───────────────────────────────────────────── */}
        <ShoppableImage itemPins={post.item_pins} currentUserId={currentUserId ?? null}>
          {post.light_img_url && post.dark_img_url ? (
            <>
              <img
                src={getOptimizedImageUrl(post.dark_img_url, 800)}
                alt="Night time room photo"
                className="absolute inset-0 w-full h-full object-cover rounded-2xl"
              />
              <img
                src={getOptimizedImageUrl(post.light_img_url, 800)}
                alt="Day time room photo"
                className="absolute inset-0 w-full h-full object-cover rounded-2xl"
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
              alt={showDark ? 'Night time room photo' : 'Day time room photo'}
              loading="lazy"
              className={`absolute inset-0 w-full h-full object-cover rounded-2xl transition-opacity duration-500
                ${post.is_toxic ? 'toxic-image' : ''}
              `}
            />
          )}
        </ShoppableImage>

        {/* ── Grumpy Cloud (toxic users only) ──────────────────────── */}
        {post.is_toxic && <GrumpyCloudOverlay />}

        {/* ── Gradient overlay ─────────────────────────────────────── */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* ── Sticker layer ─────────────────────────────────────────── */}
        {post.stickers.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {post.stickers.map((sticker) => (
              <div key={sticker.id} className="pointer-events-auto">
                <StickerLayer
                  sticker={sticker}
                  postId={post.id}
                />
              </div>
            ))}
          </div>
        )}



        {/* ── Bottom bar ───────────────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between z-30">
          {/* Location hash pill */}
          {post.obfuscated_location_hash && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/20 dark:bg-black/40 border border-white/20 shadow-lg">
              <MapPin size={12} className="text-amber-300" aria-hidden="true" />
              <span className="text-xs font-500 text-white/90 font-mono">
                {post.obfuscated_location_hash}
              </span>
            </div>
          )}

          {/* Toxic warning pill (replaces location pill slot when toxic) */}
          {post.is_toxic && !post.obfuscated_location_hash && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-gray-900/60 border border-white/20 shadow-lg">
              <span className="text-xs font-600 text-gray-300">☁️ Grumpy post</span>
            </div>
          )}

          {/* Cheer button */}
          <div className="relative">
            <motion.button
              id={`cheer-btn-${post.id}`}
              onClick={handleCheer}
              whileTap={{ scale: 0.9 }}
              disabled={cheered || cheering}
              aria-label={cheered ? 'Already cheered' : 'Cheer this home'}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-600 text-sm
                transition-colors duration-200 shadow-lg relative z-10
                ${cheered
                  ? 'bg-rose-500 text-white cursor-default'
                  : 'bg-white text-[--cozy-rust] hover:bg-rose-50'
                }
              `}
            >
              <Heart
                size={16}
                className={cheered ? 'fill-white' : 'fill-transparent'}
                aria-hidden="true"
              />
              <span className="tabular-nums">{cheerCount}</span>
            </motion.button>
            {cheering && <ParticleBurst />}
          </div>
        </div>

      </div>
    </div>
  );
}

'use client';

import { useState, useCallback, useTransition, useRef } from 'react';
import { Heart, MapPin, RefreshCw, GripVertical, Coffee, Mail, Sparkles, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { ParticleBurst } from './ParticleBurst';
import { getOptimizedImageUrl } from '@/lib/cloudflare';
import { GrumpyCloudOverlay } from '@/components/GrumpyCloudOverlay';
import { reupSticker } from '@/app/actions/stickerActions';
import { calcStickerOpacity, calcReupCost } from '@/lib/stickerMath';
import { useCozyStore } from '@/store/useCozyStore';
import type { FeedPost, PostSticker } from '@/store/useCozyStore';
import { sendPorchWarmth, type PorchItemType } from '@/app/actions/waterfallActions';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PostCardProps {
  post: FeedPost;
  onCheer: () => Promise<void>;
  currentUserId?: string | null;
  style?: React.CSSProperties;
  className?: string;
}

// ---------------------------------------------------------------------------
// StickerLayer — renders a single sticker with decay opacity + Re-Up button
// ---------------------------------------------------------------------------

function StickerLayer({ sticker, postId }: { sticker: PostSticker; postId: string }) {
  const { setPoints, updateStickerReup } = useCozyStore();
  const [isPending, startTransition] = useTransition();
  const [localReupAt, setLocalReupAt] = useState(sticker.last_reup_at);

  const opacity = calcStickerOpacity(localReupAt, sticker.decay_rate_per_day);
  const reupCost = calcReupCost(sticker.cost, opacity);

  const handleReup = useCallback(() => {
    startTransition(async () => {
      const now = new Date().toISOString();
      setLocalReupAt(now);
      const result = await reupSticker(sticker.id, reupCost);
      if (result.success) {
        if (result.newPoints !== undefined) setPoints(result.newPoints);
        updateStickerReup(postId, sticker.id, now);
      } else {
        setLocalReupAt(sticker.last_reup_at);
      }
    });
  }, [sticker.id, sticker.last_reup_at, reupCost, postId, setPoints, updateStickerReup]);

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
        alt="Decorative sticker attached to post"
        loading="lazy"
        className="w-10 h-10 object-contain drop-shadow-md select-none pointer-events-none"
        style={{ opacity: Math.max(opacity, 0.2) }}
      />
      {opacity < 1.0 && (
        <button
          id={`reup-btn-${sticker.id}`}
          onClick={handleReup}
          disabled={isPending}
          aria-label={`Re-up sticker for ${reupCost} points`}
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-700 whitespace-nowrap bg-black/70 text-white/90 hover:bg-black/90 transition-colors shadow-md"
        >
          <RefreshCw size={8} className={isPending ? 'animate-spin' : ''} />
          {reupCost}pt
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostCard Layout Component
// ---------------------------------------------------------------------------

export function PostCard({ post, onCheer, currentUserId, style, className = '' }: PostCardProps) {
  const [cheering, setCheering] = useState(false);
  const [cheered, setCheered] = useState(post.has_cheered);
  const [cheerCount, setCheerCount] = useState(post.cheer_count);

  const [showWarmthModal, setShowWarmthModal] = useState(false);
  const [warmthSentMsg, setWarmthSentMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);

  const activeUrl = post.light_img_url || post.dark_img_url;
  const geohashDisplay = post.obfuscated_location_hash || 'Near You';
  const groupDisplay = post.claimed_by_user_id ? 'Camp Sanctuary' : 'Cozy Community';

  // Vibe status badge logic
  const vibeStatus = {
    icon: post.is_toxic ? '🌧️' : '☀️',
    label: post.is_toxic ? 'Raincloud' : 'Sunshine',
  };

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

  const handleSendWarmthItem = async (itemType: PorchItemType) => {
    await sendPorchWarmth(post.user_id || '', itemType, 'Sending warm thoughts for your porch!');
    setWarmthSentMsg(`Sent ${itemType} to their Porch Holding Pen! ☕`);
    setTimeout(() => {
      setWarmthSentMsg(null);
      setShowWarmthModal(false);
    }, 1800);
  };

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
      className={`relative w-full h-full max-w-md mx-auto bg-stone-900 text-stone-100 overflow-hidden flex flex-col justify-between p-4 font-sans select-none rounded-3xl border border-white/10 shadow-2xl ${className}`}
    >
      {/* ── 1. TOP FLOATING GLASS HEADER ───────────────────────────────── */}
      <div className="z-20 flex items-center justify-between w-full p-3 rounded-2xl bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/20 shadow-lg">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-amber-200 uppercase">
            📍 {geohashDisplay} · {groupDisplay}
          </span>
        </div>

        {/* Vibe Check Badge */}
        <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-white/20 border border-white/30 text-xs font-medium backdrop-blur-md">
          <span>{vibeStatus.icon}</span>
          <span>{vibeStatus.label}</span>
        </div>
      </div>

      {/* ── 2. MAIN VISUAL CANVAS (Light/Dark Reveal & Maker Pins) ─────── */}
      <div className="absolute inset-0 z-0">
        {post.light_img_url && post.dark_img_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getOptimizedImageUrl(post.dark_img_url, 800)}
              alt="Night time cozy space"
              className="w-full h-full object-cover"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getOptimizedImageUrl(post.light_img_url, 800)}
              alt="Day time cozy space"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            />
            {/* Dual Reveal Slider Handle */}
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getOptimizedImageUrl(activeUrl, 800)}
            alt="Cozy space canvas"
            className="w-full h-full object-cover"
          />
        )}

        {/* Shoppable / Maker Pins */}
        {(post.item_pins || []).map((pin) => (
          <div
            key={pin.id}
            style={{ top: `${pin.y_percent}%`, left: `${pin.x_percent}%` }}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group pointer-events-auto"
          >
            <span className="relative flex h-5 w-5 cursor-pointer">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500 border-2 border-white shadow-md" />
            </span>
            {/* Popover Card on Hover/Tap */}
            <div className="hidden group-hover:flex absolute left-6 top-1/2 -translate-y-1/2 w-48 p-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-amber-500/40 text-left flex-col text-xs shadow-2xl z-40">
              <span className="font-bold text-amber-300 truncate">{pin.title}</span>
              {pin.url && (
                <a
                  href={pin.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-amber-400 font-mono font-bold hover:underline flex items-center gap-1"
                >
                  Shop Item ↗
                </a>
              )}
            </div>
          </div>
        ))}

        {/* Grumpy Cloud (toxic users only) */}
        {post.is_toxic && <GrumpyCloudOverlay />}

        {/* Sticker Layer */}
        {post.stickers.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {post.stickers.map((sticker) => (
              <StickerLayer key={sticker.id} sticker={sticker} postId={post.id} />
            ))}
          </div>
        )}
      </div>

      {/* ── 3. BOTTOM FLOATING ACTION BAR ──────────────────────────────── */}
      <div className="z-20 w-full p-4 rounded-3xl bg-white/10 dark:bg-black/40 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col space-y-3">
        {/* Post Caption */}
        <div className="text-sm text-stone-100 font-medium line-clamp-2">
          <span className="font-bold text-amber-300">
            @neighbor_{post.user_id ? post.user_id.slice(0, 6) : 'creator'}:{' '}
          </span>
          Shared a beautiful sanctuary. Rest up and stay cozy.
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-1">
          {/* Cheer Button */}
          <motion.button
            id={`cheer-btn-${post.id}`}
            onClick={handleCheer}
            disabled={cheered || cheering}
            aria-label={`Cheer this post (${cheerCount})`}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-xs shadow-lg transition-all ${
              cheered
                ? 'bg-rose-500 text-white'
                : 'bg-amber-500/80 hover:bg-amber-500 text-stone-950'
            }`}
          >
            <span>✨ Cheer</span>
            <span className="bg-stone-950/20 px-1.5 py-0.5 rounded-full text-[10px]">
              {cheerCount}
            </span>
          </motion.button>

          {/* Send Warmth Button */}
          <button
            onClick={() => setShowWarmthModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-stone-200 transition-all active:scale-95"
          >
            <span>☕ Send Warmth</span>
          </button>

          {/* Calling Card Button */}
          <button
            onClick={() => alert('Calling card sent to mailbox!')}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs text-stone-300 transition-all active:scale-95"
            title="Leave a Calling Card"
          >
            <Mail size={15} />
          </button>
        </div>
      </div>

      {/* ── Send Warmth Modal ────────────────────────────────────────── */}
      {showWarmthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl p-6 cozy-glass border border-amber-500/30 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
              <h3 className="text-sm font-800 text-[--cozy-bark]">Send Porch Warmth</h3>
              <button onClick={() => setShowWarmthModal(false)} className="text-[--cozy-muted]">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[--cozy-muted]">
              Deposit a quiet gift on their virtual porch (no intrusive notifications).
            </p>

            {warmthSentMsg ? (
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 text-xs font-800 flex items-center justify-center gap-1.5">
                <Check size={16} /> {warmthSentMsg}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 pt-2">
                <button
                  onClick={() => handleSendWarmthItem('tea')}
                  className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 text-xs"
                >
                  <span className="text-2xl">☕</span>
                  <span className="text-[10px] text-amber-200">Tea</span>
                </button>
                <button
                  onClick={() => handleSendWarmthItem('blanket')}
                  className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 text-xs"
                >
                  <span className="text-2xl">🧧</span>
                  <span className="text-[10px] text-amber-200">Blanket</span>
                </button>
                <button
                  onClick={() => handleSendWarmthItem('crystal')}
                  className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 text-xs"
                >
                  <span className="text-2xl">🔮</span>
                  <span className="text-[10px] text-amber-200">Crystal</span>
                </button>
                <button
                  onClick={() => handleSendWarmthItem('heart')}
                  className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 text-xs"
                >
                  <span className="text-2xl">💖</span>
                  <span className="text-[10px] text-amber-200">Warmth</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

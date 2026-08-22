'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Eye, Unlink, Lock, Sparkles } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/cloudflare';
import { calcStickerOpacity } from '@/lib/stickerMath';
import type { UserPost } from '@/store/useCozyStore';
import type { ShellSlot } from '@/config/shellDefinitions';
import { TIER_NAMES } from '@/config/shellDefinitions';

interface ShellNookProps {
  slot: ShellSlot;
  post?: UserPost;
  isOwner: boolean;
  /** When true the slot is tier-locked and shows a "land plot" placeholder. */
  isLocked?: boolean;
  onSelectEmptySlot: (slot: ShellSlot) => void;
  onUnassignPost: (postId: string) => void;
  onViewPost: (post: UserPost) => void;
}

export function ShellNook({
  slot,
  post,
  isOwner,
  isLocked = false,
  onSelectEmptySlot,
  onUnassignPost,
  onViewPost,
}: ShellNookProps) {
  const activeUrl = post ? post.light_img_url || post.dark_img_url : null;

  // ── Locked slot: gentle "land plot" placeholder ──────────────────────────
  if (isLocked) {
    return (
      <div
        className="absolute z-10"
        style={{
          left: `${slot.x}%`,
          top: `${slot.y}%`,
          width: `${slot.w}%`,
          height: `${slot.h}%`,
        }}
      >
        <div
          className="cozy-land-plot w-full h-full rounded-2xl
            flex flex-col items-center justify-center gap-1.5 text-center
            border border-white/10 select-none overflow-hidden relative"
        >
          {/* Subtle animated shimmer layer */}
          <div className="plot-shimmer absolute inset-0" />

          <Lock
            size={14}
            className="text-white/25 relative z-10"
            aria-hidden
          />
          <p className="text-[9px] font-600 text-white/25 relative z-10 leading-tight px-2">
            {TIER_NAMES[slot.tier]}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute z-10 transition-all duration-300"
      style={{
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        width: `${slot.w}%`,
        height: `${slot.h}%`,
      }}
    >
      {post && activeUrl ? (
        /* Occupied Nook */
        <motion.div
          className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl
            border border-white/20 group cursor-pointer"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          onClick={() => onViewPost(post)}
        >
          {/* Photo background */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getOptimizedImageUrl(activeUrl, 500)}
            alt={slot.label}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Stickers overlay preview */}
          {post.stickers && post.stickers.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {post.stickers.slice(0, 3).map((st) => {
                const opacity = Math.max(calcStickerOpacity(st.last_reup_at, st.decay_rate_per_day), 0.3);
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={st.id}
                    src={st.sticker_url}
                    alt="Sticker"
                    className="absolute w-5 h-5 object-contain drop-shadow-md"
                    style={{
                      left: `${st.x_percent}%`,
                      top: `${st.y_percent}%`,
                      transform: `translate(-50%, -50%) rotate(${st.rotation_degrees}deg)`,
                      opacity,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Nook Header Badge */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full
              text-[10px] font-700 text-white/90 bg-black/50 backdrop-blur-md
              border border-white/15 shadow-sm truncate max-w-[80%]">
              <span>{slot.icon}</span>
              <span className="truncate">{slot.label}</span>
            </span>

            {/* Quick Actions (Owner only) */}
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnassignPost(post.id);
                }}
                className="w-6 h-6 rounded-full bg-black/60 hover:bg-red-500/80
                  text-white/80 hover:text-white flex items-center justify-center
                  backdrop-blur-md border border-white/20 transition-all opacity-0
                  group-hover:opacity-100 active:scale-90"
                title="Remove from nook"
                aria-label={`Remove post from ${slot.label}`}
              >
                <Unlink size={11} />
              </button>
            )}
          </div>

          {/* Cheer Count Footer */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20">
            <span className="text-[10px] font-600 text-rose-200 backdrop-blur-sm bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
              ♥ {post.cheer_count} cheers
            </span>
            <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye size={10} />
            </div>
          </div>
        </motion.div>
      ) : isOwner ? (
        /* Empty Nook (Owner View) */
        <motion.button
          onClick={() => onSelectEmptySlot(slot)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full h-full rounded-2xl p-2
            bg-black/25 hover:bg-black/40 backdrop-blur-md
            border-2 border-dashed border-[--cozy-gold]/60 hover:border-[--cozy-gold]
            flex flex-col items-center justify-center gap-1.5 text-center
            group transition-all duration-300 shadow-inner"
        >
          <div className="w-9 h-9 rounded-full bg-[--cozy-gold]/20 border border-[--cozy-gold]/40
            flex items-center justify-center text-[--cozy-gold]
            group-hover:scale-110 group-hover:bg-[--cozy-gold] group-hover:text-zinc-900
            transition-all duration-300 shadow-[0_0_12px_rgba(240,192,96,0.25)]"
          >
            <Plus size={18} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-700 text-white/90 leading-tight flex items-center justify-center gap-1">
              <span>{slot.icon}</span>
              <span>{slot.label}</span>
            </p>
            <p className="text-[9px] font-600 text-[--cozy-gold] opacity-80 group-hover:opacity-100">
              + Assign Space
            </p>
          </div>
        </motion.button>
      ) : (
        /* Empty Nook (Visitor View) */
        <div className="w-full h-full rounded-2xl p-2
          bg-white/5 backdrop-blur-[2px] border border-white/10
          flex flex-col items-center justify-center gap-1 text-center opacity-60">
          <span className="text-lg">{slot.icon}</span>
          <p className="text-[10px] font-600 text-white/60 leading-tight">
            {slot.label}
          </p>
          <span className="text-[9px] text-white/40 italic">Empty Nook</span>
        </div>
      )}
    </div>
  );
}

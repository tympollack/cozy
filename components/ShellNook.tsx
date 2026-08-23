'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Unlink, Lock } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/cloudflare';
import { calcStickerOpacity } from '@/lib/stickerMath';
import type { UserPost } from '@/store/useCozyStore';
import type { ShellSlot } from '@/config/shellDefinitions';
import { TIER_NAMES, TIER_BADGES } from '@/config/shellDefinitions';

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

  // ── Locked slot: glowing land plot with tier badge watermark ─────────────
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
            border border-[--cozy-gold]/20 select-none overflow-hidden relative"
        >
          {/* Shimmer layer — gold tinted */}
          <div className="plot-shimmer absolute inset-0" />

          {/* Tier badge as large watermark */}
          <span className="locked-tier-watermark">{TIER_BADGES[slot.tier]}</span>

          <Lock
            size={13}
            className="text-white/30 relative z-10"
            aria-hidden
          />
          <p className="text-[9px] font-600 text-white/30 relative z-10 leading-tight px-2">
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
        /* ── Occupied Nook ──────────────────────────────────────────────── */
        <motion.div
          className="relative w-full h-full rounded-2xl overflow-hidden
            shadow-inner ring-1 ring-white/15 border border-white/20
            backdrop-blur-md group cursor-pointer"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => onViewPost(post)}
        >
          {/* Per-nook ambient glow spot (accent light) */}
          <div
            className="nook-ambient-glow absolute inset-0 rounded-2xl z-0"
            style={{
              background: 'radial-gradient(ellipse at 50% 30%, rgba(240,192,96,0.18) 0%, transparent 70%)',
            }}
          />

          {/* Photo background with soft bottom mask */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getOptimizedImageUrl(activeUrl, 500)}
            alt={slot.label}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            style={{ maskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)' }}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent z-10" />

          {/* Stickers overlay — AnimatePresence for opacity-decay fade-in */}
          {post.stickers && post.stickers.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-20">
              <AnimatePresence>
                {post.stickers.slice(0, 3).map((st) => {
                  const opacity = Math.max(calcStickerOpacity(st.last_reup_at, st.decay_rate_per_day), 0.3);
                  return (
                    <motion.img
                      key={st.id}
                      src={st.sticker_url}
                      alt="Sticker"
                      initial={{ opacity: 0 }}
                      animate={{ opacity }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7 }}
                      className="absolute w-5 h-5 object-contain drop-shadow-md"
                      style={{
                        left: `${st.x_percent}%`,
                        top: `${st.y_percent}%`,
                        transform: `translate(-50%, -50%) rotate(${st.rotation_degrees}deg)`,
                      }}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Nook header badge — slot icon + label */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-30">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full
              text-[10px] font-700 text-white/90 bg-black/50 backdrop-blur-md
              border border-white/15 shadow-sm truncate max-w-[80%]">
              <span>{slot.icon}</span>
              <span className="truncate">{slot.label}</span>
            </span>

            {/* Atmospheric status icon (slot icon with amber glow) */}
            <span
              className="text-sm drop-shadow-[0_0_6px_rgba(240,192,96,0.8)]"
              aria-hidden
            >
              {slot.icon}
            </span>

            {/* Owner unassign action */}
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnassignPost(post.id);
                }}
                className="w-6 h-6 rounded-full bg-black/60 hover:bg-red-500/80
                  text-white/80 hover:text-white flex items-center justify-center
                  backdrop-blur-md border border-white/20 transition-all opacity-0
                  group-hover:opacity-100 active:scale-90 ml-1 flex-shrink-0"
                title="Remove from nook"
                aria-label={`Remove post from ${slot.label}`}
              >
                <Unlink size={11} />
              </button>
            )}
          </div>

          {/* Footer — floating amber cheer badge */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-30">
            <motion.span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full
                text-[10px] font-800 text-white
                bg-[--cozy-amber] shadow-md border border-[--cozy-gold]/40"
              style={{ filter: 'drop-shadow(0 2px 6px rgba(232,168,124,0.6))' }}
              whileHover={{ scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              ♥ {post.cheer_count}
            </motion.span>
            <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-md
              flex items-center justify-center text-white
              opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye size={10} />
            </div>
          </div>
        </motion.div>

      ) : isOwner ? (
        /* ── Empty Nook (Owner) — isometric plot marker ─────────────────── */
        <motion.button
          onClick={() => onSelectEmptySlot(slot)}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="relative w-full h-full rounded-2xl p-2
            bg-black/20 hover:bg-black/35 backdrop-blur-md
            border-2 border-dashed border-[--cozy-gold]/60 hover:border-[--cozy-gold]
            flex flex-col items-center justify-center gap-1.5 text-center
            group transition-colors duration-300 shadow-inner overflow-hidden"
        >
          {/* Dual pulsing crosshair rings */}
          <span className="crosshair-ring" aria-hidden />
          <span className="crosshair-ring crosshair-ring-2" aria-hidden />

          {/* Isometric diamond plot marker */}
          <div
            className="relative z-10 w-9 h-9 flex items-center justify-center
              group-hover:scale-110 transition-transform duration-300"
            style={{
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              background: 'rgba(240,192,96,0.18)',
              border: '2px dashed rgba(240,192,96,0.7)',
            }}
            aria-hidden
          >
            <span className="text-[--cozy-gold] font-900 text-base leading-none">✦</span>
          </div>

          <div className="space-y-0.5 relative z-10">
            <p className="text-[11px] font-700 text-white/90 leading-tight flex items-center justify-center gap-1">
              <span>{slot.icon}</span>
              <span>{slot.label}</span>
            </p>
            <p className="text-[9px] font-700 text-[--cozy-gold] opacity-80 group-hover:opacity-100 transition-opacity">
              ✦ Assign Space
            </p>
          </div>
        </motion.button>

      ) : (
        /* ── Empty Nook (Visitor) ────────────────────────────────────────── */
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

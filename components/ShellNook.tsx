'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Unlink, Lock, Maximize2 } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/cloudflare';
import { calcStickerOpacity } from '@/lib/stickerMath';
import type { UserPost } from '@/store/useCozyStore';
import type { ShellSlot } from '@/config/shellDefinitions';
import { TIER_NAMES } from '@/config/shellDefinitions';

interface ShellNookProps {
  slot: ShellSlot;
  post?: UserPost;
  isOwner: boolean;
  /** When true the slot is tier-locked and shows a locked snap pin. */
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
  const [imgError, setImgError] = useState(false);
  const activeUrl = post ? post.light_img_url || post.dark_img_url : null;
  const hasValidImage = !!activeUrl && !imgError;

  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-all duration-300"
      style={{
        left: `${slot.x}%`,
        top: `${slot.y}%`,
      }}
    >
      {isLocked ? (
        /* ── Locked Snap Spot ───────────────────────────────────────────── */
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white/75 shadow-lg select-none"
          title={`Unlocks at ${TIER_NAMES[slot.tier]}`}
        >
          <Lock size={12} className="text-amber-300" />
          <span className="text-xs font-800">{slot.label}</span>
          <span className="text-[10px] font-700 text-amber-300/90">
            · {TIER_NAMES[slot.tier]}
          </span>
        </div>
      ) : post ? (
        /* ── Occupied Snap Spot: Compact Framed Polaroid / Tile ─────────── */
        <motion.div
          layoutId={`nook-frame-${post.id}`}
          className="relative w-28 sm:w-32 md:w-36 aspect-square rounded-2xl overflow-hidden
            shadow-2xl ring-2 ring-white/95 border border-amber-950/30
            group cursor-pointer bg-stone-900 select-none"
          whileHover={{ scale: 1.10, zIndex: 30 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.75 }}
          onClick={() => onViewPost(post)}
        >
          {/* Photo */}
          {hasValidImage ? (
            <motion.img
              layoutId={`nook-img-${post.id}`}
              src={getOptimizedImageUrl(activeUrl, 500)}
              alt={slot.label}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-[#3b2d26] to-[#1f1713] text-center">
              <span className="text-2xl mb-0.5 filter drop-shadow">{slot.icon}</span>
              <p className="text-[11px] font-800 text-amber-100 truncate max-w-full">
                {slot.label}
              </p>
            </div>
          )}

          {/* Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/35 z-10 pointer-events-none" />

          {/* Stickers overlay */}
          {post.stickers && post.stickers.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <AnimatePresence>
                {post.stickers.slice(0, 2).map((st) => {
                  const opacity = Math.max(calcStickerOpacity(st.last_reup_at, st.decay_rate_per_day), 0.3);
                  return (
                    <motion.img
                      key={st.id}
                      src={st.sticker_url}
                      alt="Sticker"
                      initial={{ opacity: 0 }}
                      animate={{ opacity }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute w-4 h-4 object-contain drop-shadow"
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

          {/* Top header badge: Room Name + Unassign button */}
          <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between z-20 pointer-events-none">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-800 text-white bg-black/60 backdrop-blur-md border border-white/20 truncate max-w-[82%] shadow-sm">
              <span className="leading-none">{slot.icon}</span>
              <span className="truncate">{slot.label}</span>
            </span>

            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnassignPost(post.id);
                }}
                className="w-5 h-5 rounded-full bg-black/70 hover:bg-red-500 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-md border border-white/30 transition-all opacity-0 group-hover:opacity-100 active:scale-90 pointer-events-auto cursor-pointer shadow-md"
                title="Unsnap space from nook"
                aria-label={`Unassign from ${slot.label}`}
              >
                <Unlink size={9} />
              </button>
            )}
          </div>

          {/* Bottom Footer: Cheer count + Expand indicator */}
          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between z-20 pointer-events-none">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-800 text-amber-950 bg-amber-300/95 border border-amber-200/80 shadow-md">
              ♥ {post.cheer_count}
            </span>
            <span className="text-[9px] font-700 text-white/90 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Maximize2 size={8} /> Expand
            </span>
          </div>
        </motion.div>
      ) : isOwner ? (
        /* ── Empty Snap Spot (Owner) ────────────────────────────────────── */
        <motion.button
          onClick={() => onSelectEmptySlot(slot)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
            bg-black/65 hover:bg-black/85 backdrop-blur-md
            border-2 border-amber-300/70 hover:border-amber-300 shadow-xl
            text-white group cursor-pointer transition-all select-none"
          title={`Snap a space to ${slot.label}`}
        >
          <span className="text-sm leading-none">{slot.icon}</span>
          <span className="text-xs font-800 tracking-tight">{slot.label}</span>
          <span className="w-4 h-4 rounded-full bg-amber-400 group-hover:bg-amber-300 text-amber-950 flex items-center justify-center text-[10px] font-black shadow-xs ml-0.5 group-hover:scale-110 transition-transform">
            +
          </span>
        </motion.button>
      ) : (
        /* ── Empty Snap Spot (Visitor) ──────────────────────────────────── */
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-xs border border-white/20 text-white/80 shadow-md select-none">
          <span className="text-xs">{slot.icon}</span>
          <span className="text-[11px] font-700">{slot.label}</span>
        </div>
      )}
    </div>
  );
}

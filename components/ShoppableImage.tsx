'use client';

import React, { useState, useCallback, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, ExternalLink, Sparkles } from 'lucide-react';
import { deleteItemPin } from '@/app/actions/pinActions';
import type { ItemPin } from '@/store/useCozyStore';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ShoppableImageProps {
  itemPins: ItemPin[];
  /** UUID of the authenticated user — enables the delete button on owned pins. */
  currentUserId?: string | null;
  className?: string;
  children: React.ReactNode;
  /** Called after a pin is optimistically removed, with the deleted pin's id. */
  onPinDeleted?: (pinId: string) => void;
}

// ---------------------------------------------------------------------------
// PinDot — renders a single pulsing dot + its popover
// ---------------------------------------------------------------------------

function isMakerverseUrl(urlStr?: string | null): boolean {
  if (!urlStr) return false;
  try {
    const formatted = urlStr.startsWith('http://') || urlStr.startsWith('https://') ? urlStr : `https://${urlStr}`;
    const parsed = new URL(formatted);
    return parsed.hostname === 'makerverse.com' || parsed.hostname.endsWith('.makerverse.com');
  } catch {
    return false;
  }
}

interface PinDotProps {
  pin: ItemPin;
  isOwner: boolean;
  onDeleted: (pinId: string) => void;
}

function PinDot({ pin, isOwner, onDeleted }: PinDotProps) {
  const [isOpen, setIsOpen]           = useState(false);
  const [isPending, startTransition]  = useTransition();
  const [deleteError, setDeleteError] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const isMakerverse = isMakerverseUrl(pin.url);

  const toggle = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
    setDeleteError(false);
  }, []);

  const close = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
  }, []);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteError(false);
    startTransition(async () => {
      const result = await deleteItemPin(pin.id);
      if (result.success) {
        setIsOpen(false);
        onDeleted(pin.id);
      } else {
        setDeleteError(true);
        console.error('[ShoppableImage] deleteItemPin failed:', result.error);
      }
    });
  }, [pin.id, onDeleted]);

  return (
    <div
      className="absolute z-20"
      style={{
        left: `${pin.x_percent}%`,
        top: `${pin.y_percent}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* ── Pulsing dot button ─────────────────────────────────────── */}
      <button
        onClick={toggle}
        aria-label={`${isOpen ? 'Close' : 'View'} details for ${pin.title}`}
        aria-expanded={isOpen}
        className="relative group focus:outline-none focus-visible:ring-2
          focus-visible:ring-[--cozy-gold] focus-visible:ring-offset-1 rounded-full"
      >
        {/* Outer glow ring — always visible */}
        <div
          className="absolute -inset-2 rounded-full
            bg-[--cozy-gold]/20 backdrop-blur-[1px]
            transition-all duration-300
            group-hover:bg-[--cozy-gold]/30 group-hover:scale-110"
        />

        {/* Animated ping ring */}
        <div
          className="absolute inset-0 w-4 h-4 rounded-full
            bg-white/60 animate-ping
            group-hover:animation-duration-700"
          style={{ animationDuration: '1.8s' }}
        />

        {/* Static dot core */}
        <div
          className={`relative w-4 h-4 rounded-full border border-white/60 shadow-lg
            transition-all duration-200 group-hover:scale-125 group-active:scale-90
            ${isOpen
              ? 'bg-[--cozy-gold] shadow-[0_0_12px_rgba(240,192,96,0.7)]'
              : 'bg-white/85 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.35)]'
            }`}
        />
      </button>

      {/* ── Popover card ──────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="popover"
            ref={cardRef}
            role="dialog"
            aria-label={`Item details: ${pin.title}`}
            className="absolute left-1/2 bottom-full mb-4
              w-max max-w-[220px]
              bg-[#faf7f2] dark:bg-[#1c1613] text-stone-900 dark:text-stone-100
              border border-amber-900/20 dark:border-amber-500/30
              rounded-2xl p-3.5 shadow-2xl z-50"
            style={{ transform: 'translateX(-50%)' }}
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 460, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <p className="text-[13px] font-900 text-stone-900 dark:text-stone-100 leading-snug mb-2 text-center line-clamp-2">
              {pin.title}
            </p>

            {/* Makerverse Item Badge */}
            {isMakerverse && (
              <div className="flex justify-center mb-2.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-800 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-600/40 shadow-2xs">
                  <Sparkles size={9} className="text-amber-600 dark:text-amber-400" />
                  Makerverse Shop
                </span>
              </div>
            )}

            {/* CTA row */}
            <div className="flex items-center gap-2">
              <a
                href={pin.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5
                  px-3.5 py-2 rounded-xl font-900 text-xs
                  bg-amber-500 hover:bg-amber-400
                  text-stone-950 shadow-md
                  hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
              >
                <ShoppingBag size={12} className="text-stone-950" />
                <span>{isMakerverse ? 'Makerverse' : 'Shop'}</span>
                <ExternalLink size={10} className="text-stone-950/80" />
              </a>

              {/* Delete — only for the post owner */}
              {isOwner && (
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  aria-label="Remove this pin"
                  className="w-8 h-8 rounded-xl flex items-center justify-center
                    bg-white dark:bg-[#281e19] text-stone-700 dark:text-stone-300
                    border border-amber-900/15 dark:border-amber-500/30
                    hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-600 hover:border-red-300
                    active:scale-90 transition-all duration-150 cursor-pointer disabled:opacity-40"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Delete error inline feedback */}
            {deleteError && (
              <p className="mt-2 text-[10px] text-red-600 dark:text-red-400 text-center font-bold">
                Could not remove — try again.
              </p>
            )}

            {/* Tooltip caret */}
            <div
              className="absolute -bottom-[7px] left-1/2 -translate-x-1/2
                w-3.5 h-3.5 rotate-45
                bg-[#faf7f2] dark:bg-[#1c1613] border-r border-b border-amber-900/20 dark:border-amber-500/30"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close popover on outside click via invisible backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={close}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShoppableImage
// ---------------------------------------------------------------------------

export function ShoppableImage({
  itemPins,
  currentUserId,
  className = '',
  children,
  onPinDeleted,
}: ShoppableImageProps) {
  // Local optimistic list so deletions feel instant without a page reload.
  const [localPins, setLocalPins] = useState<ItemPin[]>(itemPins);

  React.useEffect(() => {
    setLocalPins(itemPins);
  }, [itemPins]);

  const handlePinDeleted = useCallback((pinId: string) => {
    setLocalPins((prev) => prev.filter((p) => p.id !== pinId));
    onPinDeleted?.(pinId);
  }, [onPinDeleted]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      // Tapping anywhere outside an open popover closes it — handled per-dot
    >
      {/* Base content: images, sliders, etc. */}
      {children}

      {/* Pin overlay */}
      {localPins.map((pin) => (
        <PinDot
          key={pin.id}
          pin={pin}
          isOwner={Boolean(currentUserId && currentUserId === pin.user_id)}
          onDeleted={handlePinDeleted}
        />
      ))}
    </div>
  );
}

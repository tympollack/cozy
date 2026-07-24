'use client';

import React, { useState, useCallback, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, ExternalLink } from 'lucide-react';
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

interface PinDotProps {
  pin: ItemPin;
  isOwner: boolean;
  onDeleted: (pinId: string) => void;
}

function PinDot({ pin, isOwner, onDeleted }: PinDotProps) {
  const [isOpen, setIsOpen]           = useState(false);
  const [isPending, startTransition]  = useTransition();
  const [deleteError, setDeleteError] = useState(false);

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
            role="dialog"
            aria-label={`Item details: ${pin.title}`}
            className="absolute left-1/2 bottom-full mb-4
              w-max max-w-[210px]
              cozy-glass border border-[--cozy-amber]/30
              rounded-2xl p-3.5 shadow-2xl"
            style={{ transform: 'translateX(-50%)' }}
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 460, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <p className="text-[13px] font-700 text-[--cozy-night] leading-snug mb-2.5
              text-center line-clamp-2">
              {pin.title}
            </p>

            {/* CTA row */}
            <div className="flex items-center gap-2">
              <a
                href={pin.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5
                  px-3 py-2 rounded-xl font-700 text-xs
                  bg-gradient-to-r from-[--cozy-rust] to-[--cozy-amber]
                  text-white shadow-[0_3px_12px_rgba(196,112,74,0.35)]
                  hover:shadow-[0_4px_18px_rgba(196,112,74,0.5)]
                  hover:scale-105 active:scale-95 transition-all duration-150"
              >
                <ShoppingBag size={11} />
                Shop
                <ExternalLink size={10} className="opacity-70" />
              </a>

              {/* Delete — only for the post owner */}
              {isOwner && (
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  aria-label="Remove this pin"
                  className="w-8 h-8 rounded-xl flex items-center justify-center
                    text-[--cozy-muted] border border-[--cozy-amber]/20
                    hover:bg-red-50 hover:text-red-500 hover:border-red-200
                    active:scale-90 transition-all duration-150 disabled:opacity-40"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Delete error inline feedback */}
            {deleteError && (
              <p className="mt-2 text-[10px] text-red-500 text-center font-600">
                Could not remove — try again.
              </p>
            )}

            {/* Tooltip caret */}
            <div
              className="absolute -bottom-[7px] left-1/2 -translate-x-1/2
                w-3.5 h-3.5 rotate-45
                bg-[--cozy-cream]/90 border-r border-b border-[--cozy-amber]/25"
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

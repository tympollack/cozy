'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2, Tag, Link, ArrowRight, Sparkles } from 'lucide-react';
import { createItemPin } from '@/app/actions/pinActions';
import { useModalBackButton } from '@/hooks/useModalBackButton';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PinDropZoneProps {
  postId: string;
  onCancel: () => void;
  /** Called after a pin is successfully persisted. Caller decides how to refresh. */
  onSuccess: (pinId: string) => void;
}

// ---------------------------------------------------------------------------
// Step machine
// ---------------------------------------------------------------------------

type Step = 'drag' | 'form';

// ---------------------------------------------------------------------------
// PinDropZone
//
// Renders an overlay in two phases:
//   1. "drag"  — a framer-motion draggable reticle locked to the image container.
//               "Confirm Location" commits the coordinates and advances to step 2.
//   2. "form"  — a glassmorphism modal (Cozy design language) collects title + URL,
//               then calls createItemPin and reports success to the parent.
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

export function PinDropZone({ postId, onCancel, onSuccess }: PinDropZoneProps) {
  // ── Refs ────────────────────────────────────────────────────────────────
  // containerRef: the full overlay div — used as the drag boundary AND for
  // computing percentage coordinates (matches the photo container exactly
  // because the overlay is `absolute inset-0`).
  const containerRef = useRef<HTMLDivElement>(null);
  const reticleRef   = useRef<HTMLDivElement>(null);

  // ── State ───────────────────────────────────────────────────────────────
  const [step, setStep]               = useState<Step>('drag');
  const [coordinates, setCoordinates] = useState({ xPercent: 50, yPercent: 50 });
  const [title, setTitle]             = useState('');
  const [url, setUrl]                 = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');

  useModalBackButton({
    isOpen: true,
    onClose: onCancel,
  });

  // framer-motion values for the reticle position.
  // We use useMotionValue instead of drag state so we can read the committed
  // pixel offset at any point without causing re-renders on every frame.
  const reticleX = useMotionValue(0);
  const reticleY = useMotionValue(0);

  // ── Coordinate math ─────────────────────────────────────────────────────
  // Identical to DraggableSticker: center of element relative to container,
  // expressed as a percentage of container dimensions, clamped to [0, 100].
  const handleConfirmLocation = useCallback(() => {
    if (containerRef.current && reticleRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const reticleRect   = reticleRef.current.getBoundingClientRect();
      const width = containerRect.width || 1;
      const height = containerRect.height || 1;

      const reticleCenterX = reticleRect.left + reticleRect.width  / 2 - containerRect.left;
      const reticleCenterY = reticleRect.top  + reticleRect.height / 2 - containerRect.top;

      setCoordinates({
        xPercent: Math.min(100, Math.max(0, (reticleCenterX / width)  * 100)),
        yPercent: Math.min(100, Math.max(0, (reticleCenterY / height) * 100)),
      });
    }

    setStep('form');
  }, []);

  // ── Form submit ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('An item title is required.');
      return;
    }
    if (!url.trim()) {
      setErrorMsg('A link URL is required.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createItemPin(
        postId,
        coordinates.xPercent,
        coordinates.yPercent,
        title,
        url
      );

      if (result.success && result.pinId) {
        onSuccess(result.pinId);
      } else {
        setErrorMsg(result.error ?? 'Failed to create pin.');
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [postId, coordinates, title, url, onSuccess]);

  // ── Back to drag step ───────────────────────────────────────────────────
  const handleBackToDrag = useCallback(() => {
    setErrorMsg('');
    setStep('drag');
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="absolute inset-0 z-40 rounded-3xl overflow-hidden">
      {/* ── Backdrop ──────────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* ── STEP 1: Drag ─────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {step === 'drag' && (
          <motion.div
            key="drag-step"
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            {/* Instruction pill */}
            <motion.div
              className="absolute top-5 left-1/2 -translate-x-1/2 z-50
                flex items-center gap-2 px-4 py-2.5 rounded-full
                bg-[--cozy-bark]/80 backdrop-blur-md border border-white/20 shadow-xl"
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 28 }}
            >
              <Tag size={13} className="text-[--cozy-gold]" />
              <span className="text-xs font-700 text-white/90 tracking-wide">
                Drag the reticle to the item
              </span>
            </motion.div>

            {/* Drag area — sized to fill the overlay so constraints are the full image */}
            <div ref={containerRef} className="absolute inset-0">
              <motion.div
                ref={reticleRef}
                drag
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={containerRef}
                style={{ x: reticleX, y: reticleY, touchAction: 'none' }}
                /* Start centered */
                className="absolute left-1/2 top-1/2 -ml-6 -mt-6 w-12 h-12
                  cursor-grab active:cursor-grabbing"
                whileDrag={{ scale: 1.12 }}
              >
                {/* Outer pulse ring */}
                <div className="absolute inset-0 rounded-full border-2 border-[--cozy-gold]/70
                  animate-ping opacity-60" />
                {/* Crosshair body */}
                <div className="relative w-full h-full rounded-full
                  border-2 border-dashed border-white/80
                  bg-white/15 backdrop-blur-sm
                  shadow-[0_0_20px_rgba(0,0,0,0.45)]
                  flex items-center justify-center">
                  {/* Centre dot */}
                  <div className="w-2.5 h-2.5 rounded-full bg-[--cozy-gold] shadow-[0_0_8px_rgba(240,192,96,0.8)]" />
                  {/* Crosshair lines */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-px bg-white/40" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-full w-px bg-white/40" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Action bar */}
            <motion.div
              className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 28 }}
            >
              <button
                onClick={onCancel}
                aria-label="Cancel tagging"
                className="w-12 h-12 rounded-full flex items-center justify-center
                  bg-black/50 backdrop-blur-md border border-white/15 shadow-lg
                  text-white/90 hover:bg-red-500/80 active:scale-90
                  transition-all duration-150"
              >
                <X size={18} />
              </button>

              <button
                onClick={handleConfirmLocation}
                aria-label="Confirm pin location"
                className="flex items-center gap-2 px-5 py-3 rounded-full font-700 text-sm
                  bg-[--cozy-gold] text-[--cozy-bark]
                  shadow-[0_4px_20px_rgba(240,192,96,0.45)]
                  hover:scale-105 active:scale-95 transition-transform duration-150"
              >
                <Check size={16} />
                Confirm Location
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── STEP 2: Form ───────────────────────────────────────────── */}
        {step === 'form' && (
          <motion.div
            key="form-step"
            className="absolute inset-0 flex items-center justify-center p-5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <div
              className="w-full max-w-sm rounded-3xl p-6 shadow-2xl
                cozy-glass border border-[--cozy-amber]/25"
              style={{ maxWidth: '340px' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[--cozy-amber]/20 flex items-center justify-center">
                    <Tag size={15} className="text-[--cozy-rust]" />
                  </div>
                  <div>
                    <h3 className="text-base font-800 text-[--cozy-night] leading-tight">
                      Tag an Item
                    </h3>
                    <p className="text-[11px] text-[--cozy-muted] font-500">
                      Pin is placed ✓
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleBackToDrag}
                    aria-label="Reposition pin"
                    className="w-8 h-8 rounded-full text-[--cozy-muted]
                      hover:bg-[--cozy-warm] hover:text-[--cozy-rust]
                      flex items-center justify-center transition-colors"
                    title="Move pin"
                  >
                    <Tag size={14} />
                  </button>
                  <button
                    onClick={onCancel}
                    aria-label="Close modal"
                    className="w-8 h-8 rounded-full text-[--cozy-muted]
                      hover:bg-[--cozy-warm] hover:text-[--cozy-bark]
                      flex items-center justify-center transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Error banner */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    className="mb-4 px-3.5 py-2.5 rounded-xl
                      bg-red-50 border border-red-200/60 text-red-600 text-xs font-600"
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  >
                    {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title field */}
                <div>
                  <label
                    htmlFor="pin-title"
                    className="block text-xs font-700 text-[--cozy-bark] mb-1.5 tracking-wide uppercase"
                  >
                    Item Title
                  </label>
                  <input
                    id="pin-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Herman Miller Aeron Chair"
                    maxLength={120}
                    autoFocus
                    className="w-full bg-white/70 border border-[--cozy-amber]/30
                      rounded-2xl px-4 py-3 text-sm text-[--cozy-night]
                      placeholder:text-[--cozy-muted]/60
                      focus:outline-none focus:ring-2 focus:ring-[--cozy-amber]/50
                      focus:border-[--cozy-amber] transition-all duration-150"
                  />
                </div>

                {/* URL field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="pin-url"
                      className="block text-xs font-700 text-[--cozy-bark] tracking-wide uppercase"
                    >
                      Shop Link
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setUrl('https://makerverse.com/item/');
                        const input = document.getElementById('pin-url') as HTMLInputElement | null;
                        if (input) {
                          input.focus();
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-800 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-600/40 transition-all cursor-pointer active:scale-95"
                      title="Link Makerverse Shop Item"
                    >
                      <Sparkles size={10} className="text-amber-600 dark:text-amber-400" />
                      <span>Makerverse</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Link
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--cozy-muted]/60 pointer-events-none"
                    />
                    <input
                      id="pin-url"
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="makerverse.com/item/... or amazon.com/dp/..."
                      className="w-full bg-white/70 border border-[--cozy-amber]/30
                        rounded-2xl pl-9 pr-4 py-3 text-sm text-[--cozy-night]
                        placeholder:text-[--cozy-muted]/60
                        focus:outline-none focus:ring-2 focus:ring-[--cozy-amber]/50
                        focus:border-[--cozy-amber] transition-all duration-150"
                    />
                  </div>

                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isMakerverseUrl(url)) {
                          setUrl('https://makerverse.com/item/');
                        }
                        const input = document.getElementById('pin-url') as HTMLInputElement | null;
                        if (input) {
                          input.focus();
                        }
                      }}
                      className={`w-full py-2 px-3 rounded-xl border text-xs font-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isMakerverseUrl(url)
                          ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-500/50 shadow-xs'
                          : 'bg-stone-100 dark:bg-[#281e19] text-stone-700 dark:text-amber-200/80 border-stone-200 dark:border-stone-700/60 hover:bg-amber-50 dark:hover:bg-[#342821] hover:text-amber-900'
                      }`}
                    >
                      <Sparkles size={13} className="text-amber-600 dark:text-amber-400" />
                      <span>{isMakerverseUrl(url) ? '✓ Makerverse Shop Item Linked' : 'Link Makerverse Shop Item'}</span>
                    </button>
                  </div>

                  <p className="mt-1.5 text-[10px] text-[--cozy-muted] px-1">
                    {isMakerverseUrl(url)
                      ? '✨ Item will be linked to your Makerverse catalog.'
                      : 'https:// will be added automatically if omitted.'}
                  </p>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full mt-2 flex items-center justify-center gap-2
                    px-5 py-3.5 rounded-2xl font-800 text-sm
                    bg-gradient-to-r from-[--cozy-rust] to-[--cozy-amber]
                    text-white shadow-[0_4px_20px_rgba(196,112,74,0.40)]
                    hover:shadow-[0_6px_28px_rgba(196,112,74,0.55)]
                    hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <>
                      Save Pin
                      <ArrowRight size={15} />
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

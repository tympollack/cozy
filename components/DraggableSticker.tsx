'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useAnimation, PanInfo } from 'framer-motion';
import { Check, RotateCw } from 'lucide-react';
import { placeSticker } from '@/app/actions/stickerActions';
import { useCozyStore } from '@/store/useCozyStore';
import type { StickerCatalogItem } from './StickerDrawer';

interface DraggableStickerProps {
  sticker: StickerCatalogItem;
  postId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onConfirm: (newSticker: {
    sticker_url: string;
    x_percent: number;
    y_percent: number;
    rotation_degrees: number;
    cost: number;
    decay_rate_per_day: number;
  }) => void;
  onCancel: () => void;
}

export function DraggableSticker({
  sticker,
  postId,
  containerRef,
  onConfirm,
  onCancel,
}: DraggableStickerProps) {
  const { setPoints } = useCozyStore();
  const stickerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const controls = useAnimation();

  // ----- Rotation handle via onPan -----
  const handleRotatePan = useCallback((_e: PointerEvent, info: PanInfo) => {
    // Rotate proportional to horizontal pan on the handle
    setRotation((r) => r + info.delta.x * 1.5);
  }, []);

  // ----- Confirm placement -----
  const handleConfirm = useCallback(async () => {
    if (!containerRef.current || !stickerRef.current || isPending) return;
    setIsPending(true);
    setError(null);

    // Plop animation before saving
    await controls.start({
      scale: [1, 1.25, 1],
      transition: { type: 'spring', stiffness: 500, damping: 15, duration: 0.3 }
    });

    const containerRect = containerRef.current.getBoundingClientRect();
    const stickerRect = stickerRef.current.getBoundingClientRect();

    // Center of sticker relative to container
    const stickerCenterX = stickerRect.left + stickerRect.width / 2 - containerRect.left;
    const stickerCenterY = stickerRect.top + stickerRect.height / 2 - containerRect.top;

    const xPercent = Math.min(100, Math.max(0, (stickerCenterX / containerRect.width) * 100));
    const yPercent = Math.min(100, Math.max(0, (stickerCenterY / containerRect.height) * 100));
    const rotDeg = Math.round(rotation) % 360;

    const result = await placeSticker(
      postId,
      sticker.imageUrl,
      sticker.cost,
      sticker.decayRate,
      xPercent,
      yPercent,
      rotDeg
    );

    setIsPending(false);

    if (!result.success) {
      setError(result.error ?? 'Failed to place sticker.');
      return;
    }

    if (result.newPoints !== undefined) setPoints(result.newPoints);

    onConfirm({
      sticker_url: sticker.imageUrl,
      x_percent: xPercent,
      y_percent: yPercent,
      rotation_degrees: rotDeg,
      cost: sticker.cost,
      decay_rate_per_day: sticker.decayRate,
    });
  }, [containerRef, isPending, rotation, postId, sticker, setPoints, onConfirm]);

  return (
    <>
      {/* Dimmed overlay to signal placement mode */}
      <div className="absolute inset-0 bg-black/20 z-40 pointer-events-none rounded-inherit" />

      {/* Draggable sticker */}
      <motion.div
        ref={stickerRef}
        animate={controls}
        drag
        dragConstraints={containerRef}
        dragElastic={0.08}
        dragMomentum={false}
        style={{ x, y, rotate: rotation, touchAction: 'none' }}
        className="absolute inset-0 m-auto w-fit h-fit z-50 cursor-grab active:cursor-grabbing select-none"
      >
        {/* Sticker image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sticker.imageUrl}
          alt={sticker.name}
          draggable={false}
          className="w-20 h-20 object-contain drop-shadow-xl pointer-events-none"
        />

        {/* Rotation handle — bottom-right corner */}
        <motion.button
          onPan={handleRotatePan}
          aria-label="Rotate sticker"
          className="absolute -bottom-3 -right-3 w-7 h-7 rounded-full
            bg-white/90 border border-white/60 shadow-lg
            flex items-center justify-center cursor-ew-resize
            hover:bg-white active:scale-90 transition-transform"
          style={{ touchAction: 'none' }}
        >
          <RotateCw size={13} className="text-[--cozy-bark]" />
        </motion.button>
      </motion.div>

      {/* Action bar — confirm / cancel */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
        <button
          onClick={onCancel}
          disabled={isPending}
          className="px-4 py-2 rounded-full text-sm font-600 text-white/90
            bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
        >
          Cancel
        </button>
        <button
          id="sticker-confirm-btn"
          onClick={handleConfirm}
          disabled={isPending}
          className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-700
            bg-white text-[--cozy-bark] shadow-lg hover:scale-105 active:scale-95
            transition-transform disabled:opacity-60"
        >
          {isPending ? (
            <span className="animate-spin text-base">⟳</span>
          ) : (
            <Check size={15} />
          )}
          {isPending ? 'Saving…' : 'Place it!'}
        </button>
      </div>

      {/* Error toast */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50
          bg-red-500 text-white text-xs font-600 px-4 py-2 rounded-full shadow-lg">
          {error}
        </div>
      )}
    </>
  );
}

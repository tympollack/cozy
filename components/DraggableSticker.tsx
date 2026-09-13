'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useAnimation, PanInfo } from 'framer-motion';
import { Check, RotateCw } from 'lucide-react';
import { placeSticker } from '@/app/actions/stickerActions';
import { useCozyStore } from '@/store/useCozyStore';
import { playWoodenClick, playCozyChime } from '@/lib/audio/soundscape';
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
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const controls = useAnimation();

  // ----- Rotation handle via onPan with subtle cardinal snapping -----
  const handleRotatePan = useCallback((_e: PointerEvent, info: PanInfo) => {
    setRotation((prevRotation) => {
      const delta = info.delta.x * 1.5;
      const rawAngle = prevRotation + delta;
      const normalized = ((rawAngle % 360) + 360) % 360;

      // Snap within 6 degrees of cardinal 0°, 90°, 180°, 270°
      const cardinals = [0, 90, 180, 270, 360];
      for (const card of cardinals) {
        if (Math.abs(normalized - card) <= 5) {
          return rawAngle + (card - normalized);
        }
      }
      return rawAngle;
    });
  }, []);

  // ----- Drag Start / End handlers with audio and tactile feedback -----
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    playWoodenClick();
  }, []);

  // ----- Confirm placement -----
  const handleConfirm = useCallback(async () => {
    if (!containerRef.current || !stickerRef.current || isPending) return;
    setIsPending(true);
    setError(null);

    // Tactile plop bounce animation with audio cues
    playWoodenClick();
    await controls.start({
      scale: [1, 1.28, 0.94, 1.06, 1],
      transition: { duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }
    });
    playCozyChime();

    const containerRect = containerRef.current.getBoundingClientRect();
    const stickerRect = stickerRef.current.getBoundingClientRect();

    // Center of sticker relative to container
    const stickerCenterX = stickerRect.left + stickerRect.width / 2 - containerRect.left;
    const stickerCenterY = stickerRect.top + stickerRect.height / 2 - containerRect.top;

    const xPercent = Math.min(100, Math.max(0, (stickerCenterX / containerRect.width) * 100));
    const yPercent = Math.min(100, Math.max(0, (stickerCenterY / containerRect.height) * 100));
    const rotDeg = ((Math.round(rotation) % 360) + 360) % 360;

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
  }, [containerRef, isPending, rotation, postId, sticker, setPoints, onConfirm, controls]);

  return (
    <>
      {/* Dimmed overlay to signal placement mode */}
      <div className="absolute inset-0 bg-black/20 z-40 pointer-events-none rounded-inherit" />

      {/* Draggable sticker with tactile spring physics & elevation */}
      <motion.div
        ref={stickerRef}
        data-testid="draggable-sticker"
        animate={controls}
        drag
        dragConstraints={containerRef}
        dragElastic={0.12}
        dragMomentum={true}
        dragTransition={{
          power: 0.12,
          timeConstant: 180,
          modifyTarget: (target) => Math.round(target),
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        whileDrag={{
          scale: 1.14,
          filter: 'drop-shadow(0 22px 28px rgba(45, 25, 15, 0.42))',
          cursor: 'grabbing',
        }}
        whileHover={{
          scale: isDragging ? 1.14 : 1.04,
        }}
        style={{
          x,
          y,
          rotate: rotation,
          touchAction: 'none',
          filter: isDragging
            ? 'drop-shadow(0 22px 28px rgba(45, 25, 15, 0.42))'
            : 'drop-shadow(0 6px 10px rgba(0, 0, 0, 0.2))',
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        className="absolute inset-0 m-auto w-fit h-fit z-50 cursor-grab active:cursor-grabbing select-none"
      >
        {/* Sticker image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sticker.imageUrl}
          alt={sticker.name}
          draggable={false}
          className="w-20 h-20 object-contain pointer-events-none select-none transition-transform"
        />

        {/* Rotation handle — bottom-right corner */}
        <motion.button
          data-testid="rotate-sticker-btn"
          onPan={handleRotatePan}
          onPanEnd={() => playWoodenClick()}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Rotate sticker"
          className="absolute -bottom-3 -right-3 w-7 h-7 rounded-full
            bg-white/95 border border-white/70 shadow-lg
            flex items-center justify-center cursor-ew-resize
            hover:bg-white transition-all"
          style={{ touchAction: 'none' }}
        >
          <RotateCw size={13} className="text-[--cozy-bark]" />
        </motion.button>
      </motion.div>

      {/* Action bar — confirm / cancel */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-4 py-2 rounded-full text-sm font-semibold text-stone-200
            bg-stone-800/80 hover:bg-stone-900 border border-stone-700/50 backdrop-blur-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          id="sticker-confirm-btn"
          data-testid="confirm-sticker-btn"
          onClick={handleConfirm}
          disabled={isPending}
          className="px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-1.5
            bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-md hover:scale-105 active:scale-95
            transition-all disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? (
            <span className="animate-spin text-base">⟳</span>
          ) : (
            <Check size={15} className="text-stone-950 stroke-[2.5]" />
          )}
          <span>{isPending ? 'Placing…' : 'Place it!'}</span>
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

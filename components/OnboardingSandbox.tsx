'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Camera, Check, RefreshCw, X, Plus } from 'lucide-react';
import { useCozyStore } from '@/store/useCozyStore';
import { awardStarterSandboxBonusAction } from '@/app/actions/onboardingActions';

export interface PlacedDemoSticker {
  id: string;
  emoji: string;
  label: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  rotation: number;
}

const STARTER_STICKERS = [
  { id: 'mug', emoji: '🍵', label: 'Warm Tea' },
  { id: 'candle', emoji: '🕯️', label: 'Cozy Candle' },
  { id: 'plant', emoji: '🪴', label: 'Succulent' },
  { id: 'cat', emoji: '🐈', label: 'Sleepy Cat' },
  { id: 'sparkles', emoji: '✨', label: 'Soft Light' },
];

const CORNER_TEMPLATES = [
  {
    id: 'desk',
    label: 'Desk Nook',
    emoji: '💻',
    bgGradient: 'from-amber-900/60 via-stone-800 to-amber-950',
    title: 'Sunlit Morning Desk',
    ambientDesc: 'A quiet pine desktop catching early morning sun',
  },
  {
    id: 'bedside',
    label: 'Bedside Table',
    emoji: '🕯️',
    bgGradient: 'from-amber-950/70 via-stone-900 to-[#1e1510]',
    title: 'Dusk Bedside Table',
    ambientDesc: 'A gentle bedtime table with warm ambient glow',
  },
  {
    id: 'reading',
    label: 'Reading Chair',
    emoji: '📚',
    bgGradient: 'from-orange-950/60 via-stone-850 to-stone-900',
    title: 'Cozy Armchair',
    ambientDesc: 'An armchair with a soft wool throw and worn paperbacks',
  },
];

interface OnboardingSandboxProps {
  onComplete?: () => void;
  className?: string;
}

export function OnboardingSandbox({ onComplete, className = '' }: OnboardingSandboxProps) {
  const { points, addPoints, hasCompletedSandbox, completeSandbox, focusNook } = useCozyStore();
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(() => {
    if (focusNook === 'bedside') return 1;
    if (focusNook === 'reading_chair') return 2;
    return 0;
  });
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [placedStickers, setPlacedStickers] = useState<PlacedDemoSticker[]>([
    { id: 'default-mug', emoji: '🍵', label: 'Warm Tea', x: 50, y: 55, rotation: -6 },
  ]);
  const [isAwarding, setIsAwarding] = useState(false);
  const [justAwarded, setJustAwarded] = useState(false);

  const currentTemplate = CORNER_TEMPLATES[selectedTemplateIndex];

  const handleAddSticker = (sticker: (typeof STARTER_STICKERS)[0]) => {
    // Randomize initial position slightly around center
    const randomOffset = () => (Math.random() - 0.5) * 30;
    const randomRotation = () => Math.round((Math.random() - 0.5) * 36);

    const newSticker: PlacedDemoSticker = {
      id: `${sticker.id}-${Date.now()}`,
      emoji: sticker.emoji,
      label: sticker.label,
      x: Math.min(80, Math.max(20, 50 + randomOffset())),
      y: Math.min(80, Math.max(20, 50 + randomOffset())),
      rotation: randomRotation(),
    };

    setPlacedStickers((prev) => [...prev, newSticker]);
  };

  const handleRemoveSticker = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlacedStickers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    // Pick a random sticker to pop in at click location
    const randomSticker = STARTER_STICKERS[Math.floor(Math.random() * STARTER_STICKERS.length)];
    const newSticker: PlacedDemoSticker = {
      id: `${randomSticker.id}-${Date.now()}`,
      emoji: randomSticker.emoji,
      label: randomSticker.label,
      x: Math.round(clickX),
      y: Math.round(clickY),
      rotation: Math.round((Math.random() - 0.5) * 30),
    };

    setPlacedStickers((prev) => [...prev, newSticker]);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setCustomPhotoUrl(objectUrl);
    }
  };

  const handleClaimPoints = async () => {
    if (hasCompletedSandbox || justAwarded) {
      if (onComplete) onComplete();
      return;
    }

    setIsAwarding(true);
    try {
      addPoints(50);
      completeSandbox();
      setJustAwarded(true);

      // Async persist to server
      await awardStarterSandboxBonusAction();

      if (onComplete) {
        setTimeout(onComplete, 1200);
      }
    } catch (err) {
      console.error('Error claiming sandbox points:', err);
    } finally {
      setIsAwarding(false);
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto flex flex-col items-center select-none ${className}`}>
      {/* Corner Template Chooser */}
      <div className="w-full flex items-center justify-between gap-1.5 p-1 bg-amber-200/50 dark:bg-stone-800/60 rounded-2xl mb-3 backdrop-blur-xs">
        {CORNER_TEMPLATES.map((tmpl, idx) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => {
              setSelectedTemplateIndex(idx);
              setCustomPhotoUrl(null);
            }}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedTemplateIndex === idx && !customPhotoUrl
                ? 'bg-white dark:bg-[#2c221b] text-amber-900 dark:text-amber-200 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-amber-100'
            }`}
          >
            <span>{tmpl.emoji}</span>
            <span className="truncate">{tmpl.label}</span>
          </button>
        ))}

        {/* Custom photo upload pill */}
        <label className="py-1.5 px-2 rounded-xl text-xs font-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-amber-100 flex items-center justify-center gap-1 cursor-pointer">
          <Camera size={13} />
          <span className="hidden sm:inline">Photo</span>
          <input
            type="file"
            accept="image/*"
            aria-label="Upload custom photo"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Interactive Photo Canvas */}
      <div
        onClick={handleCanvasClick}
        role="button"
        tabIndex={0}
        aria-label="Interactive corner canvas. Tap to place a sticker."
        className="relative w-full aspect-4/3 rounded-3xl overflow-hidden border-2 border-amber-300/40 dark:border-amber-700/40 shadow-xl cursor-crosshair group"
      >
        {customPhotoUrl ? (
          <img
            src={customPhotoUrl}
            alt="Custom space photo"
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${currentTemplate.bgGradient} flex flex-col items-center justify-between p-6 text-white`}
          >
            {/* Ambient Corner Atmosphere Illustration */}
            <div className="w-full flex justify-between items-center opacity-85">
              <span className="text-xs font-800 tracking-wider uppercase text-amber-200/90">
                {currentTemplate.title}
              </span>
              <span className="text-xl">{currentTemplate.emoji}</span>
            </div>

            <div className="text-center my-auto px-4 pointer-events-none">
              <p className="text-2xl font-900 text-amber-50 drop-shadow-xs mb-1">
                Your First Corner
              </p>
              <p className="text-xs font-500 text-amber-200/80 drop-shadow-xs">
                {currentTemplate.ambientDesc}
              </p>
            </div>

            <div className="w-full text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-black/40 backdrop-blur-xs text-[11px] font-700 text-amber-200/90 border border-white/15">
                Tap anywhere or select a sticker below ✨
              </span>
            </div>
          </div>
        )}

        {/* Placed Stickers Layer */}
        <AnimatePresence>
          {placedStickers.map((st) => (
            <motion.div
              key={st.id}
              initial={{ scale: 0, rotate: st.rotation - 15 }}
              animate={{ scale: 1, rotate: st.rotation }}
              exit={{ scale: 0 }}
              style={{
                left: `${st.x}%`,
                top: `${st.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute z-20 group/sticker cursor-pointer"
              title={`${st.label} (Tap X to remove)`}
            >
              <div className="relative flex items-center justify-center filter drop-shadow-md hover:scale-110 active:scale-95 transition-transform">
                <span className="text-3xl select-none" role="img" aria-label={st.label}>
                  {st.emoji}
                </span>

                {/* Remove badge */}
                <button
                  onClick={(e) => handleRemoveSticker(st.id, e)}
                  aria-label={`Remove ${st.label}`}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-stone-900/85 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/sticker:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Starter Sticker Palette */}
      <div className="w-full mt-3">
        <p className="text-[11px] font-800 text-stone-600 dark:text-amber-300/80 uppercase tracking-wider mb-2 text-center">
          Starter Demo Stickers ({placedStickers.length} placed)
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {STARTER_STICKERS.map((st) => (
            <button
              key={st.id}
              type="button"
              aria-label={`Add ${st.label} sticker`}
              onClick={() => handleAddSticker(st)}
              className="px-3 py-2 rounded-2xl bg-white/90 dark:bg-stone-800/80 border border-amber-300/30 dark:border-amber-700/30 hover:border-amber-500 shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-700 text-stone-800 dark:text-amber-100"
            >
              <span className="text-base">{st.emoji}</span>
              <span>{st.label}</span>
              <Plus size={12} className="text-amber-600 dark:text-amber-400 opacity-80" />
            </button>
          ))}

          {/* Clear canvas if stickers placed */}
          {placedStickers.length > 0 && (
            <button
              type="button"
              onClick={() => setPlacedStickers([])}
              aria-label="Reset stickers"
              className="p-2 rounded-2xl text-stone-500 hover:text-stone-800 dark:hover:text-amber-200 transition-colors"
              title="Clear all stickers"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Instant Points Claim CTA */}
      <div className="w-full mt-4">
        {justAwarded || hasCompletedSandbox ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2 text-sm font-800"
          >
            <Check size={18} className="text-emerald-600 dark:text-emerald-400" />
            <span>✨ First Corner Tidied! +50 Starter Points Claimed</span>
          </motion.div>
        ) : (
          <button
            type="button"
            onClick={handleClaimPoints}
            disabled={isAwarding}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:opacity-95 text-white font-900 text-sm shadow-md hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-400/40"
          >
            <Sparkles size={16} className="text-amber-200 animate-pulse" />
            <span>{isAwarding ? 'Awarding Points...' : 'Complete First Corner (+50 pts) ✨'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { X, Lock, Sparkles, Star } from 'lucide-react';
import { useCozyStore } from '@/store/useCozyStore';

// ---------------------------------------------------------------------------
// Sticker Catalog
// ---------------------------------------------------------------------------

export interface StickerCatalogItem {
  id: string;
  name: string;
  /** Twemoji CDN PNG URL */
  imageUrl: string;
  cost: number;
  /** Fraction per day, e.g. 0.05 = 5%/day */
  decayRate: number;
  description: string;
}

// Twemoji CDN base (72x72 PNGs, CC-BY 4.0)
const TWEMOJI = (codepoint: string) =>
  `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoint}.png`;

export const STICKER_CATALOG: StickerCatalogItem[] = [
  {
    id: 'cozy-cat',
    name: 'Cozy Cat',
    imageUrl: TWEMOJI('1f431'),
    cost: 100,
    decayRate: 0.05,
    description: '5% fade/day',
  },
  {
    id: 'fireplace',
    name: 'Fireplace',
    imageUrl: TWEMOJI('1f525'),
    cost: 150,
    decayRate: 0.08,
    description: '8% fade/day',
  },
  {
    id: 'plant-buddy',
    name: 'Plant Buddy',
    imageUrl: TWEMOJI('1f33f'),
    cost: 80,
    decayRate: 0.04,
    description: '4% fade/day',
  },
  {
    id: 'golden-star',
    name: 'Golden Star',
    imageUrl: TWEMOJI('2b50'),
    cost: 200,
    decayRate: 0.10,
    description: '10% fade/day',
  },
  {
    id: 'warm-mug',
    name: 'Warm Mug',
    imageUrl: TWEMOJI('2615'),
    cost: 75,
    decayRate: 0.03,
    description: '3% fade/day',
  },
  {
    id: 'fairy-lights',
    name: 'Fairy Lights',
    imageUrl: TWEMOJI('2728'),
    cost: 120,
    decayRate: 0.06,
    description: '6% fade/day',
  },
  {
    id: 'moon-stars',
    name: 'Moon & Stars',
    imageUrl: TWEMOJI('1f319'),
    cost: 90,
    decayRate: 0.05,
    description: '5% fade/day',
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    imageUrl: TWEMOJI('1f308'),
    cost: 160,
    decayRate: 0.07,
    description: '7% fade/day',
  },
];

// ---------------------------------------------------------------------------
// StickerDrawer
// ---------------------------------------------------------------------------

type DrawerTab = 'season' | 'submit';

interface StickerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sticker: StickerCatalogItem) => void;
}

export function StickerDrawer({ isOpen, onClose, onSelect }: StickerDrawerProps) {
  const points = useCozyStore((s) => s.points);
  const [tab, setTab] = useState<DrawerTab>('season');

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sticker marketplace"
        className={`fixed bottom-0 inset-x-0 z-50 rounded-t-3xl
          backdrop-blur-md bg-white/20 dark:bg-black/40 border-t border-white/20 shadow-lg
          transition-transform duration-400 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '80dvh' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[--cozy-muted]/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <div>
            <h2 className="text-lg font-800 text-[--cozy-bark] flex items-center gap-1.5">
              <Sparkles size={18} className="text-[--cozy-gold]" />
              Sticker Market
            </h2>
            <p className="text-xs text-[--cozy-muted] mt-0.5">
              You have{' '}
              <span className="font-700 text-[--cozy-rust]">
                ⭐ {points.toLocaleString()} pts
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sticker drawer"
            className="w-8 h-8 rounded-full bg-[--cozy-warm] flex items-center justify-center
              hover:bg-[--cozy-amber]/20 transition-colors"
          >
            <X size={16} className="text-[--cozy-bark]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 pb-3">
          <button
            onClick={() => setTab('season')}
            className={`px-4 py-1.5 rounded-full text-sm font-600 transition-colors
              ${tab === 'season'
                ? 'bg-[--cozy-bark] text-white'
                : 'bg-[--cozy-warm] text-[--cozy-muted] hover:bg-[--cozy-amber]/20'
              }`}
          >
            <Star size={12} className="inline mr-1" />
            Season 1
          </button>

          {/* Submit tab — greyed out, future feature */}
          <div className="relative group">
            <button
              disabled
              className="px-4 py-1.5 rounded-full text-sm font-600
                bg-[--cozy-warm]/60 text-[--cozy-muted]/50 cursor-not-allowed
                flex items-center gap-1"
            >
              <Lock size={12} />
              Submit Sticker
            </button>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
              bg-[--cozy-night] text-white text-xs font-500 px-3 py-1.5 rounded-xl
              whitespace-nowrap pointer-events-none opacity-0
              group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
              Community submissions open soon! 🎨
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4
                border-transparent border-t-[--cozy-night]" />
            </div>
          </div>
        </div>

        {/* Season 1 grid */}
        <div className="overflow-y-auto px-4 pb-8" style={{ maxHeight: '50dvh' }}>
          <div className="grid grid-cols-4 gap-3">
            {STICKER_CATALOG.map((item) => {
              const canAfford = points >= item.cost;
              return (
                <button
                  key={item.id}
                  id={`sticker-${item.id}`}
                  onClick={() => canAfford && onSelect(item)}
                  disabled={!canAfford}
                  aria-label={`${item.name} — ${item.cost} points, ${item.description}`}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl
                    border transition-all duration-150 group
                    ${canAfford
                      ? 'bg-white border-[--cozy-amber]/20 hover:border-[--cozy-amber] hover:shadow-md active:scale-95 cursor-pointer'
                      : 'bg-[--cozy-warm]/40 border-transparent opacity-50 cursor-not-allowed'
                    }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-150"
                    loading="lazy"
                  />
                  <span className="text-[10px] font-600 text-[--cozy-bark] text-center leading-tight">
                    {item.name}
                  </span>
                  <span className={`text-[10px] font-700 ${canAfford ? 'text-[--cozy-rust]' : 'text-[--cozy-muted]'}`}>
                    ⭐ {item.cost}
                  </span>
                  <span className="text-[9px] text-[--cozy-muted]">{item.description}</span>
                </button>
              );
            })}
          </div>

          <p className="text-center text-[10px] text-[--cozy-muted] mt-4 pb-2">
            Stickers fade over time — Re-Up to restore them ✨
          </p>
        </div>
      </div>
    </>
  );
}

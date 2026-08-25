'use client';

import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { X, Lock, Sparkles, Star } from 'lucide-react';
import { useCozyStore } from '@/store/useCozyStore';

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

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
    id: 'warm-mug',
    name: 'Warm Mug',
    imageUrl: TWEMOJI('2615'),
    cost: 50,
    decayRate: 0.03,
    description: '3% fade/day',
  },
  {
    id: 'plant-buddy',
    name: 'Plant Buddy',
    imageUrl: TWEMOJI('1f33f'),
    cost: 60,
    decayRate: 0.04,
    description: '4% fade/day',
  },
  {
    id: 'croissant',
    name: 'Butter Croissant',
    imageUrl: TWEMOJI('1f950'),
    cost: 65,
    decayRate: 0.03,
    description: '3% fade/day',
  },
  {
    id: 'candle',
    name: 'Beeswax Candle',
    imageUrl: TWEMOJI('1f56f'),
    cost: 70,
    decayRate: 0.04,
    description: '4% fade/day',
  },
  {
    id: 'cozy-book',
    name: 'Open Book',
    imageUrl: TWEMOJI('1f4d6'),
    cost: 75,
    decayRate: 0.03,
    description: '3% fade/day',
  },
  {
    id: 'moon-stars',
    name: 'Moon & Stars',
    imageUrl: TWEMOJI('1f319'),
    cost: 80,
    decayRate: 0.05,
    description: '5% fade/day',
  },
  {
    id: 'cozy-cat',
    name: 'Cozy Cat',
    imageUrl: TWEMOJI('1f431'),
    cost: 85,
    decayRate: 0.05,
    description: '5% fade/day',
  },
  {
    id: 'sleepy-pup',
    name: 'Sleepy Pup',
    imageUrl: TWEMOJI('1f436'),
    cost: 85,
    decayRate: 0.05,
    description: '5% fade/day',
  },
  {
    id: 'mushroom',
    name: 'Forest Mushroom',
    imageUrl: TWEMOJI('1f344'),
    cost: 90,
    decayRate: 0.04,
    description: '4% fade/day',
  },
  {
    id: 'autumn-leaf',
    name: 'Autumn Leaf',
    imageUrl: TWEMOJI('1f342'),
    cost: 95,
    decayRate: 0.04,
    description: '4% fade/day',
  },
  {
    id: 'matcha-tea',
    name: 'Matcha Bowl',
    imageUrl: TWEMOJI('1f375'),
    cost: 100,
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
    id: 'fireplace',
    name: 'Fireplace',
    imageUrl: TWEMOJI('1f525'),
    cost: 130,
    decayRate: 0.07,
    description: '7% fade/day',
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    imageUrl: TWEMOJI('1f308'),
    cost: 140,
    decayRate: 0.06,
    description: '6% fade/day',
  },
  {
    id: 'teapot',
    name: 'Ceramic Teapot',
    imageUrl: TWEMOJI('1fad6'),
    cost: 150,
    decayRate: 0.05,
    description: '5% fade/day',
  },
  {
    id: 'potted-monstera',
    name: 'Potted Monstera',
    imageUrl: TWEMOJI('1fab4'),
    cost: 160,
    decayRate: 0.06,
    description: '6% fade/day',
  },
  {
    id: 'golden-spark',
    name: 'Golden Heart',
    imageUrl: TWEMOJI('1f49b'),
    cost: 170,
    decayRate: 0.07,
    description: '7% fade/day',
  },
  {
    id: 'berry-tart',
    name: 'Berry Shortcake',
    imageUrl: TWEMOJI('1f370'),
    cost: 180,
    decayRate: 0.06,
    description: '6% fade/day',
  },
  {
    id: 'golden-star',
    name: 'Golden Star',
    imageUrl: TWEMOJI('2b50'),
    cost: 200,
    decayRate: 0.08,
    description: '8% fade/day',
  },
  {
    id: 'magic-orb',
    name: 'Crystal Ball',
    imageUrl: TWEMOJI('1f52e'),
    cost: 225,
    decayRate: 0.10,
    description: '10% fade/day',
  },
  {
    id: 'crystal-aurora',
    name: 'Crystal Gem',
    imageUrl: TWEMOJI('1f48e'),
    cost: 250,
    decayRate: 0.10,
    description: '10% fade/day',
  },
  {
    id: 'royal-crown',
    name: 'Village Crown',
    imageUrl: TWEMOJI('1f451'),
    cost: 275,
    decayRate: 0.12,
    description: '12% fade/day',
  },
  {
    id: 'cozy-hearth',
    name: 'Cozy Hearth',
    imageUrl: TWEMOJI('1f3e1'),
    cost: 300,
    decayRate: 0.08,
    description: '8% fade/day',
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
  const isClient = useIsClient();
  const points = useCozyStore((s) => s.points);
  const [tab, setTab] = useState<DrawerTab>('season');

  if (!isClient || !isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sticker marketplace"
        className="fixed bottom-0 inset-x-0 z-[10000] rounded-t-[32px] sm:rounded-t-[36px] max-w-xl mx-auto
          bg-[#faf7f2] dark:bg-[#1c1613] text-stone-900 dark:text-amber-50 border-t border-amber-900/15 dark:border-amber-500/30 shadow-2xl
          animate-in slide-in-from-bottom duration-300 ease-out flex flex-col"
        style={{ maxHeight: '80dvh' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-2 pb-3 border-b border-amber-900/10 dark:border-amber-500/20">
          <div>
            <h2 className="text-lg font-900 text-stone-900 dark:text-amber-50 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-600 dark:text-amber-400" />
              <span>Choose Sticker to Place</span>
            </h2>
            <p className="text-xs font-600 text-stone-600 dark:text-amber-200/80 mt-0.5">
              Available Balance:{' '}
              <span className="font-extrabold text-amber-700 dark:text-amber-300">
                ⭐ {points.toLocaleString()} pts
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sticker drawer"
            className="w-8 h-8 rounded-full bg-stone-200/70 dark:bg-[#281e19] flex items-center justify-center text-stone-700 dark:text-amber-200 hover:bg-stone-300 dark:hover:bg-[#342821] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-3 pb-2 border-b border-amber-900/10 dark:border-amber-500/20">
          <button
            onClick={() => setTab('season')}
            className={`px-4 py-1.5 rounded-full text-xs font-800 transition-all cursor-pointer ${
              tab === 'season'
                ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-xs'
                : 'bg-stone-100 dark:bg-[#281e19] text-stone-700 dark:text-amber-200/80 hover:bg-amber-50 dark:hover:bg-[#342821]'
            }`}
          >
            <Star size={12} className="inline mr-1" />
            Season 1 ({STICKER_CATALOG.length})
          </button>

          {/* Submit tab — greyed out, future feature */}
          <div className="relative group">
            <button
              disabled
              className="px-4 py-1.5 rounded-full text-xs font-800
                bg-stone-100 dark:bg-[#281e19] text-stone-400 dark:text-stone-600 cursor-not-allowed
                flex items-center gap-1 border border-stone-200/60 dark:border-stone-800/60"
            >
              <Lock size={12} />
              Submit Sticker
            </button>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
              bg-stone-900 text-white text-xs font-600 px-3 py-1.5 rounded-xl
              whitespace-nowrap pointer-events-none opacity-0
              group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-50">
              Community submissions open soon! 🎨
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4
                border-transparent border-t-stone-900" />
            </div>
          </div>
        </div>

        {/* Season 1 grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4 pb-8 space-y-4" style={{ maxHeight: '55dvh' }}>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {STICKER_CATALOG.map((item) => {
              const canAfford = points >= item.cost;
              return (
                <button
                  key={item.id}
                  id={`sticker-${item.id}`}
                  onClick={() => canAfford && onSelect(item)}
                  disabled={!canAfford}
                  aria-label={`${item.name} — ${item.cost} points, ${item.description}`}
                  className={`flex flex-col items-center justify-between gap-1.5 p-3 rounded-2xl
                    border transition-all duration-150 group ${
                    canAfford
                      ? 'bg-white dark:bg-[#201813] border-amber-900/15 dark:border-amber-500/25 hover:border-amber-500 hover:shadow-md hover:scale-105 active:scale-95 cursor-pointer'
                      : 'bg-stone-100/60 dark:bg-[#1a1411] border-stone-200 dark:border-stone-800 opacity-40 cursor-not-allowed'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-12 h-12 object-contain group-hover:scale-110 transition-transform duration-150 select-none"
                    loading="lazy"
                  />
                  <span className="text-[11px] font-800 text-stone-900 dark:text-amber-100 text-center leading-tight truncate max-w-full">
                    {item.name}
                  </span>
                  <span className={`text-[10px] font-extrabold ${canAfford ? 'text-amber-700 dark:text-amber-300' : 'text-stone-500 dark:text-stone-400'}`}>
                    ⭐ {item.cost}
                  </span>
                  <span className="text-[9px] font-600 text-stone-500 dark:text-amber-300/60">{item.description}</span>
                </button>
              );
            })}
          </div>

          <p className="text-center text-[10px] font-600 text-stone-500 dark:text-amber-200/70 pt-2 pb-2">
            Stickers fade over time — Re-Up to restore them ✨
          </p>
        </div>
      </div>
    </>,
    document.body
  );
}

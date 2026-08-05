'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Heart, Sparkles, X, Gift, ShieldAlert } from 'lucide-react';
import type { PorchItem } from '@/app/actions/waterfallActions';

interface PorchHoldingPenProps {
  items?: PorchItem[];
  isOpenDefault?: boolean;
}

const ITEM_EMOJIS: Record<string, string> = {
  tea: '☕',
  blanket: '🧧',
  crystal: '🔮',
  heart: '💖',
  note: '📝',
};

export function PorchHoldingPen({ items = [], isOpenDefault = false }: PorchHoldingPenProps) {
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const [selectedItem, setSelectedItem] = useState<PorchItem | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <>
      {/* Consolidated Soft Digest Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto my-3"
      >
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl cozy-glass border border-amber-500/30 shadow-md text-left transition-transform active:scale-[0.99] group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-lg shadow-inner">
              ☕
            </div>
            <div>
              <p className="text-xs font-800 text-[--cozy-bark] flex items-center gap-1.5">
                <span>Porch Holding Pen</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-stone-950 font-800">
                  {items.length} items
                </span>
              </p>
              <p className="text-[11px] text-[--cozy-muted] line-clamp-1">
                {items.length} campmates left cozy thoughts for you. Open when you feel up to it.
              </p>
            </div>
          </div>
          <Sparkles size={16} className="text-amber-500 group-hover:rotate-12 transition-transform" />
        </button>
      </motion.div>

      {/* Porch Holding Pen Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl p-6 cozy-glass border border-amber-500/30 shadow-2xl space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏡</span>
                  <div>
                    <h3 className="text-base font-800 text-[--cozy-bark]">Your Virtual Porch</h3>
                    <p className="text-xs text-[--cozy-muted]">
                      Quiet gifts left by your campmates (zero push pressure)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[--cozy-muted] hover:bg-black/10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Porch Visual Plot (2.5D Wooden Porch Shelf) */}
              <div className="relative w-full h-32 rounded-2xl bg-gradient-to-b from-amber-950/20 via-stone-900/40 to-stone-950/80 border border-amber-500/20 flex items-center justify-around p-4 shadow-inner">
                {items.map((item) => (
                  <motion.button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    whileHover={{ scale: 1.15, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-2xl shadow-lg relative">
                      <span className="animate-pulse">{ITEM_EMOJIS[item.itemType] || '☕'}</span>
                      <div className="absolute -inset-1 rounded-2xl bg-amber-400/20 blur-sm -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-[10px] font-700 text-amber-200">
                      {item.senderName}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Selected Item Detail */}
              {selectedItem ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-800 text-amber-300">
                    <span>{ITEM_EMOJIS[selectedItem.itemType]} From {selectedItem.senderName}</span>
                    <span className="text-[10px] opacity-70">
                      {new Date(selectedItem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs font-500 text-stone-200">
                    &quot;{selectedItem.message}&quot;
                  </p>
                </div>
              ) : (
                <p className="text-xs text-center text-[--cozy-muted]">
                  Tap any item on your porch to open their warm note.
                </p>
              )}

              {/* Safe Emergency Valve Button */}
              <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-[--cozy-muted]">
                <span className="flex items-center gap-1">
                  <ShieldAlert size={13} className="text-amber-500" /> Need immediate support?
                </span>
                <a
                  href="tel:988"
                  className="font-800 text-amber-400 underline hover:text-amber-300"
                >
                  Call/Text 988 Helpline
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

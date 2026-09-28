'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ShieldAlert, Heart } from 'lucide-react';
import type { PorchItem } from '@/app/actions/waterfallActions';
import { useModalBackButton } from '@/hooks/useModalBackButton';
import { playCozyChime } from '@/lib/audio/cheerSound';

interface PorchHoldingPenProps {
  items?: PorchItem[];
  isOpenDefault?: boolean;
}

export const ITEM_EMOJIS: Record<string, string> = {
  tea: '🍵',
  blanket: '🧣',
  cocoa: '🍫',
  candle: '🕯️',
  flower: '🌸',
  note: '💌',
  // legacy aliases kept for graceful backward compat
  crystal: '🔮',
  heart: '💖',
};

interface CheerParticle {
  id: number;
  x: number;
  y: number;
  char: string;
}

export function PorchHoldingPen({ items = [], isOpenDefault = false }: PorchHoldingPenProps) {
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const [selectedItem, setSelectedItem] = useState<PorchItem | null>(null);
  const [burstParticles, setBurstParticles] = useState<CheerParticle[]>([]);
  const [cheeredItemIds, setCheeredItemIds] = useState<Set<string>>(new Set());
  const [sentCheerBack, setSentCheerBack] = useState<Record<string, boolean>>({});

  useModalBackButton({
    isOpen,
    onClose: () => {
      if (selectedItem) {
        setSelectedItem(null);
      } else {
        setIsOpen(false);
      }
    },
  });

  function triggerCheerBurst(item: PorchItem) {
    playCozyChime();
    setSelectedItem(item);
    setCheeredItemIds((prev) => new Set(prev).add(item.id));

    const particles: CheerParticle[] = Array.from({ length: 7 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 80,
      y: -(30 + Math.random() * 50),
      char: ['✨', '💛', '🌸', '✨', '☕', '🌟', '+10 Cheer'][i % 7],
    }));
    setBurstParticles(particles);
    setTimeout(() => setBurstParticles([]), 1200);
  }

  function handleSendCheerBack(item: PorchItem) {
    playCozyChime();
    setSentCheerBack((prev) => ({ ...prev, [item.id]: true }));
    const particles: CheerParticle[] = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i + 20,
      x: (Math.random() - 0.5) * 90,
      y: -(35 + Math.random() * 55),
      char: ['💛', '✨', '💌', '🌸', '💖', '✨', '+Warmth', '✨'][i % 8],
    }));
    setBurstParticles(particles);
    setTimeout(() => setBurstParticles([]), 1200);
  }

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
          className="w-full flex items-center justify-between p-3.5 rounded-2xl cozy-glass border border-amber-500/30 shadow-md text-left transition-transform active:scale-[0.99] group cursor-pointer"
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
                      Quiet gifts resting on your wooden porch (zero push pressure)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[--cozy-muted] hover:bg-black/10 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Porch Visual Plot (2.5D Wooden Porch Floor Deck) */}
              <div
                data-testid="porch-wooden-deck"
                className="relative w-full h-36 rounded-2xl border border-amber-500/30 flex items-end justify-around px-4 pb-3 shadow-inner overflow-hidden select-none"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(42, 26, 17, 0.6) 0%, rgba(78, 46, 28, 0.85) 40%, rgba(54, 30, 18, 0.98) 100%)',
                  boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)',
                }}
              >
                {/* Wooden Deck Planks Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(0,0,0,0.4) 48px, rgba(0,0,0,0.4) 50px)',
                  }}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 h-3 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)',
                    borderTop: '1px solid rgba(245, 158, 11, 0.15)',
                  }}
                />

                {/* Floating Cheer Particles Overlay */}
                <AnimatePresence>
                  {burstParticles.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
                      animate={{ opacity: 0, scale: 1.25, x: p.x, y: p.y }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="absolute z-30 pointer-events-none text-xs font-900 text-amber-300 drop-shadow-md select-none"
                      style={{
                        left: '50%',
                        top: '40%',
                      }}
                    >
                      {p.char}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {items.map((item) => (
                  <div key={item.id} className="relative flex flex-col items-center">
                    {/* Shadow cast on wooden porch floor */}
                    <div
                      className="absolute bottom-6 w-10 h-3 rounded-full pointer-events-none opacity-70"
                      style={{
                        background: 'radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)',
                      }}
                    />

                    <motion.button
                      onClick={() => triggerCheerBurst(item)}
                      whileHover={{ scale: 1.15, y: -6 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex flex-col items-center gap-1 group z-10 focus:outline-none cursor-pointer"
                      title={`Click to open ${item.itemType} from ${item.senderName} and collect cheer`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-2xl shadow-lg relative">
                        <span className="animate-pulse">{ITEM_EMOJIS[item.itemType] || '☕'}</span>
                        {cheeredItemIds.has(item.id) && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-[10px] text-stone-900 font-900 flex items-center justify-center shadow-xs">
                            ✓
                          </span>
                        )}
                        <div className="absolute -inset-1 rounded-2xl bg-amber-400/20 blur-sm -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-[10px] font-700 text-amber-200">
                        {item.senderName}
                      </span>
                    </motion.button>
                  </div>
                ))}
              </div>

              {/* Selected Item Detail & Cheer Transfer Feedback */}
              {selectedItem ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-800 text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <span>{ITEM_EMOJIS[selectedItem.itemType]}</span>
                      <span>From {selectedItem.senderName}</span>
                    </span>
                    <span className="text-[10px] opacity-70">
                      {new Date(selectedItem.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs font-500 text-stone-200 leading-relaxed">
                    &quot;{selectedItem.message}&quot;
                  </p>

                  <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                    <span className="text-[11px] font-700 text-amber-300 flex items-center gap-1">
                      <Sparkles size={12} className="text-amber-400" />
                      <span>+10 Cheer Transferred</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleSendCheerBack(selectedItem)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-800 bg-amber-400 text-stone-950 hover:bg-amber-300 active:scale-95 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Heart size={11} className="fill-stone-950" />
                      <span>
                        {sentCheerBack[selectedItem.id] ? 'Cheered Back! 💛' : 'Cheer Back'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-center text-[--cozy-muted]">
                  Tap any item on your porch to open their warm note and collect cheer.
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

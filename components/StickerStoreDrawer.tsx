'use client';

import React, { useState, useEffect, useTransition, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Star, Lock, ShoppingBag, CheckCircle, AlertCircle, RefreshCw, Layers, Check } from 'lucide-react';
import { useCozyStore } from '@/store/useCozyStore';
import { getStickerCatalog, purchaseSticker, type StoreSticker } from '@/app/actions/storeActions';
import { ParticleBurst } from '@/components/ParticleBurst';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { useModalBackButton } from '@/hooks/useModalBackButton';

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

interface StickerStoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchased?: (sticker: StoreSticker, newPoints: number) => void;
}

const TIER_LABELS: Record<number, { label: string; badgeClass: string; icon: string }> = {
  1: {
    label: 'Common',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600/40',
    icon: '🌱',
  },
  2: {
    label: 'Rare',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-600/40',
    icon: '✨',
  },
  3: {
    label: 'Legendary',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-amber-400 dark:border-amber-500/50',
    icon: '👑',
  },
};

export function StickerStoreDrawer({ isOpen, onClose, onPurchased }: StickerStoreDrawerProps) {
  const isClient = useIsClient();
  const points = useCozyStore((s) => s.points);
  const setPoints = useCozyStore((s) => s.setPoints);

  const [catalog, setCatalog] = useState<StoreSticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<number | 'all'>('all');
  const [confirmingSticker, setConfirmingSticker] = useState<StoreSticker | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; sticker?: StoreSticker } | null>(null);
  const [burstLocation, setBurstLocation] = useState<{ x: number; y: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Intercept hardware/device back button
  useModalBackButton({
    isOpen,
    onClose: () => {
      if (confirmingSticker) {
        setConfirmingSticker(null);
      } else {
        onClose();
      }
    },
  });

  // Load catalog on mount/open
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    const loadCatalog = async () => {
      setLoading(true);
      try {
        const data = await getStickerCatalog();
        if (isSubscribed) {
          setCatalog(data);
        }
      } catch (err) {
        console.error('Failed to load sticker catalog:', err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    loadCatalog();
    return () => {
      isSubscribed = false;
    };
  }, [isOpen]);

  const handleOpenConfirm = (sticker: StoreSticker) => {
    setConfirmingSticker(sticker);
    setFeedback(null);
  };

  const handleConfirmPurchase = async (sticker: StoreSticker, event: React.MouseEvent) => {
    if (points < sticker.cost || purchasingId) return;

    // Trigger burst near modal center
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setBurstLocation({ x: rect.left + rect.width / 2, y: rect.top });

    setPurchasingId(sticker.id);

    startTransition(async () => {
      try {
        const result = await purchaseSticker(sticker.id);
        if (result.success && result.newPoints !== undefined) {
          setPoints(result.newPoints);
          setConfirmingSticker(null);
          setFeedback({
            type: 'success',
            message: `Acquired "${sticker.name}"! Ready to place on your cozy spaces. ✨`,
            sticker,
          });
          onPurchased?.(sticker, result.newPoints);
        } else {
          setFeedback({
            type: 'error',
            message: result.error || 'Failed to purchase sticker.',
          });
        }
      } catch {
        setFeedback({
          type: 'error',
          message: 'An unexpected error occurred during purchase.',
        });
      } finally {
        setPurchasingId(null);
        setTimeout(() => setBurstLocation(null), 1200);
      }
    });
  };

  const filteredCatalog = selectedTier === 'all'
    ? catalog
    : catalog.filter((item) => item.tier === selectedTier);

  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Celebration Burst */}
          {burstLocation && (
            <div
              className="fixed pointer-events-none z-[10000]"
              style={{ left: burstLocation.x, top: burstLocation.y }}
            >
              <ParticleBurst count={12} emojis={['⭐', '✨', '🎨', '🌟']} radius={65} />
            </div>
          )}

          {/* Drawer Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Sticker Store Catalog"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 32 }}
            className="relative w-full max-w-xl max-h-[88dvh] flex flex-col rounded-t-[32px] sm:rounded-[32px]
              bg-[#faf7f2] dark:bg-[#1c1613] text-stone-900 dark:text-amber-50 shadow-2xl overflow-hidden border-t sm:border border-amber-900/15 dark:border-amber-500/30"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-stone-400/40 dark:bg-stone-600/50" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-3 pb-3 border-b border-amber-900/10 dark:border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-600/40 flex items-center justify-center text-amber-700 dark:text-amber-400 shadow-xs">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-900 text-stone-900 dark:text-amber-50 flex items-center gap-1.5">
                    Sticker Store
                    <span className="text-[10px] font-800 uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                      Catalog
                    </span>
                  </h2>
                  <p className="text-xs font-500 text-stone-600 dark:text-amber-200/70">
                    Collect artisan stickers to decorate cozy rooms & spaces
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Balance Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-600/40 shadow-xs">
                  <Star size={13} className="fill-amber-500 text-amber-500" />
                  <span className="text-xs font-900 text-amber-950 dark:text-amber-200 tabular-nums">
                    <AnimatedCounter value={points} /> pts
                  </span>
                </div>

                <button
                  onClick={onClose}
                  aria-label="Close Sticker Store"
                  className="p-2 rounded-full text-stone-600 dark:text-amber-200 hover:bg-stone-200/60 dark:hover:bg-[#342821] transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 px-6 py-3 border-b border-amber-900/10 dark:border-amber-500/20 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedTier('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-800 transition-all cursor-pointer shrink-0 ${
                  selectedTier === 'all'
                    ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-xs scale-105'
                    : 'bg-stone-100 dark:bg-[#281e19] text-stone-700 dark:text-amber-200/80 hover:bg-amber-50 dark:hover:bg-[#342821]'
                }`}
              >
                All Stickers ({catalog.length})
              </button>

              <button
                onClick={() => setSelectedTier(1)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-800 transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  selectedTier === 1
                    ? 'bg-emerald-600 text-white shadow-xs scale-105'
                    : 'bg-stone-100 dark:bg-[#281e19] text-stone-700 dark:text-amber-200/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                <span>🌱</span> Common
              </button>

              <button
                onClick={() => setSelectedTier(2)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-800 transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  selectedTier === 2
                    ? 'bg-indigo-600 text-white shadow-xs scale-105'
                    : 'bg-stone-100 dark:bg-[#281e19] text-stone-700 dark:text-amber-200/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                }`}
              >
                <span>✨</span> Rare
              </button>

              <button
                onClick={() => setSelectedTier(3)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-800 transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  selectedTier === 3
                    ? 'bg-amber-500 text-stone-950 shadow-xs scale-105'
                    : 'bg-stone-100 dark:bg-[#281e19] text-stone-700 dark:text-amber-200/80 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                <span>👑</span> Legendary
              </button>
            </div>

            {/* Feedback Alert */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 pt-3"
                >
                  <div
                    className={`flex items-center gap-2.5 p-3 rounded-2xl text-xs font-700 border shadow-xs ${
                      feedback.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-500/40 text-emerald-950 dark:text-emerald-200'
                        : 'bg-red-50 dark:bg-red-950/70 border-red-300 dark:border-red-500/40 text-red-950 dark:text-red-200'
                    }`}
                  >
                    {feedback.type === 'success' ? (
                      <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2 flex-wrap">
                      <span>{feedback.message}</span>
                      {feedback.type === 'success' && (
                        <a
                          href="/feed"
                          onClick={onClose}
                          className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-800 text-[11px] transition-all hover:scale-105 active:scale-95 shrink-0 inline-flex items-center gap-1 shadow-xs"
                        >
                          <span>Place on Spaces</span>
                          <Sparkles size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Catalog Grid */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-44 rounded-3xl bg-stone-200/60 dark:bg-[#281e19] animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="text-center py-14 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center mx-auto text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-600/40">
                    <ShoppingBag size={24} />
                  </div>
                  <p className="text-sm font-800 text-stone-900 dark:text-amber-100">No stickers in this tier</p>
                  <p className="text-xs text-stone-600 dark:text-stone-400">Select &quot;All Stickers&quot; or another tier to view more catalog items.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredCatalog.map((item) => {
                    const canAfford = points >= item.cost;
                    const isPurchasing = purchasingId === item.id;
                    const tierMeta = TIER_LABELS[item.tier] ?? TIER_LABELS[1];
                    const decayPercent = Math.round(item.decay_rate_per_day * 100);

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`group relative flex flex-col justify-between p-4 rounded-3xl border transition-all duration-200 ${
                          canAfford
                            ? 'bg-white/90 dark:bg-[#201813] border-amber-900/15 dark:border-amber-500/25 shadow-sm hover:shadow-md hover:border-amber-500/60 dark:hover:border-amber-400/50 hover:scale-[1.02]'
                            : 'bg-stone-100/70 dark:bg-[#1a1411] border-stone-200 dark:border-stone-800 opacity-70'
                        }`}
                      >
                        {/* Top Meta: Tier & Decay Rate */}
                        <div className="flex items-center justify-between gap-1 w-full">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-800 px-2 py-0.5 rounded-full border ${tierMeta.badgeClass}`}
                          >
                            <span>{tierMeta.icon}</span>
                            <span>{tierMeta.label}</span>
                          </span>

                          <span
                            className="text-[10px] font-mono font-bold text-stone-500 dark:text-amber-200/60 bg-stone-100 dark:bg-[#281e19] px-2 py-0.5 rounded-full border border-stone-200/60 dark:border-stone-700/50"
                            title={`Fades by ${decayPercent}% each day`}
                          >
                            -{decayPercent}%/d
                          </span>
                        </div>

                        {/* Center: Sticker Image */}
                        <div className="my-3 flex flex-col items-center justify-center py-2">
                          <div className="relative w-16 h-16 flex items-center justify-center">
                            {/* Ambient glow behind sticker */}
                            <div className="absolute inset-0 rounded-full bg-amber-400/15 dark:bg-amber-400/10 blur-md group-hover:bg-amber-400/30 transition-all" />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-14 h-14 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-200 select-none"
                              loading="lazy"
                            />
                          </div>

                          <h3 className="text-xs font-900 text-stone-900 dark:text-amber-100 text-center mt-2 truncate max-w-full">
                            {item.name}
                          </h3>

                          {/* Cost Pill */}
                          <div className="mt-1 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-[#281e19] border border-amber-200/80 dark:border-amber-600/30 text-amber-950 dark:text-amber-300 text-[11px] font-900 shadow-xs">
                            <Star size={11} className="fill-amber-500 text-amber-500 shrink-0" />
                            <span>{item.cost.toLocaleString()} pts</span>
                          </div>
                        </div>

                        {/* Bottom: Purchase / Trade Button */}
                        <button
                          onClick={() => handleOpenConfirm(item)}
                          disabled={isPending}
                          className={`w-full py-2.5 px-3 rounded-2xl text-xs font-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            canAfford
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-amber-950 shadow-sm hover:brightness-105 active:scale-95'
                              : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-stone-700'
                          }`}
                        >
                          <Sparkles size={13} />
                          <span>Trade Sticker</span>
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Submissions teaser */}
              <div className="mt-6 p-4 rounded-3xl bg-amber-50/80 dark:bg-[#241a15] border border-amber-200/80 dark:border-amber-600/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-amber-200/60 dark:bg-amber-950/80 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-800 text-stone-900 dark:text-amber-100">
                      Community Submissions
                    </h4>
                    <p className="text-[11px] font-500 text-stone-600 dark:text-amber-200/70">
                      Season 2 sticker submissions & creator royalties open soon!
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-800 px-2.5 py-1 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-400 flex items-center gap-1 shrink-0">
                  <Lock size={10} /> Soon
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── Trade Confirmation Modal ────────────────────────────────────── */}
          <AnimatePresence>
            {confirmingSticker && (
              <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !purchasingId && setConfirmingSticker(null)}
                  className="fixed inset-0 bg-black/75 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.92, opacity: 0, y: 12 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  className="relative w-full max-w-sm rounded-[32px] p-6 bg-[#faf7f2] dark:bg-[#1c1613] text-stone-900 dark:text-amber-50 border border-amber-900/15 dark:border-amber-500/30 shadow-2xl space-y-4"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-amber-900/10 dark:border-amber-500/20 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-600/40 flex items-center justify-center text-amber-700 dark:text-amber-400">
                        <ShoppingBag size={16} />
                      </div>
                      <h3 className="text-sm font-900 text-stone-900 dark:text-amber-50">Confirm Trade</h3>
                    </div>
                    <button
                      onClick={() => setConfirmingSticker(null)}
                      disabled={purchasingId !== null}
                      className="p-1 rounded-full text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-amber-100 transition-colors cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Sticker Preview */}
                  <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-amber-50/90 dark:bg-[#251c17] border border-amber-200/80 dark:border-amber-600/30">
                    <img
                      src={confirmingSticker.image_url}
                      alt={confirmingSticker.name}
                      className="w-14 h-14 object-contain drop-shadow-md shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-900 text-stone-900 dark:text-amber-50 truncate">
                          {confirmingSticker.name}
                        </h4>
                        <span className={`text-[9px] font-800 px-1.5 py-0.5 rounded-full border ${TIER_LABELS[confirmingSticker.tier]?.badgeClass}`}>
                          {TIER_LABELS[confirmingSticker.tier]?.icon} {TIER_LABELS[confirmingSticker.tier]?.label}
                        </span>
                      </div>
                      <p className="text-[11px] font-600 text-stone-600 dark:text-amber-300/80 mt-0.5">
                        Decay: ~{Math.round(confirmingSticker.decay_rate_per_day * 100)}%/day • Re-up anytime
                      </p>
                    </div>
                  </div>

                  {/* Before & After Balance Calculation */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#140e0b] border border-amber-900/10 dark:border-amber-500/20 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-600 text-stone-600 dark:text-amber-200/80">
                      <span>Current Balance:</span>
                      <span className="font-mono font-bold text-stone-900 dark:text-amber-100">
                        ⭐ {points.toLocaleString()} pts
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-600 text-amber-700 dark:text-amber-400">
                      <span>Sticker Trade Cost:</span>
                      <span className="font-mono font-bold">
                        - {confirmingSticker.cost.toLocaleString()} pts
                      </span>
                    </div>

                    <div className="h-px bg-amber-900/10 dark:bg-amber-500/20 my-1" />

                    <div className="flex items-center justify-between font-900 text-sm">
                      <span className="text-stone-900 dark:text-amber-50">Remaining Balance:</span>
                      <span
                        className={`font-mono font-extrabold ${
                          points - confirmingSticker.cost < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        ⭐ {(points - confirmingSticker.cost).toLocaleString()} pts
                      </span>
                    </div>
                  </div>

                  {/* Insufficient points error if balance is too low */}
                  {points < confirmingSticker.cost && (
                    <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-xs font-700 text-center flex items-center justify-center gap-1.5">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>Need {(confirmingSticker.cost - points).toLocaleString()} more points to complete trade.</span>
                    </div>
                  )}

                  {/* Modal Action Buttons */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      onClick={() => setConfirmingSticker(null)}
                      disabled={purchasingId !== null}
                      className="flex-1 py-3 px-4 rounded-2xl text-xs font-800 bg-stone-100 dark:bg-[#281e19] text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-[#342821] border border-amber-900/10 dark:border-amber-500/20 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={(e) => handleConfirmPurchase(confirmingSticker, e)}
                      disabled={purchasingId !== null || points < confirmingSticker.cost}
                      className="flex-1 py-3 px-4 rounded-2xl text-xs font-900 bg-amber-500 hover:bg-amber-600 text-amber-950 shadow-md hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {purchasingId === confirmingSticker.id ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Trading...</span>
                        </>
                      ) : (
                        <>
                          <Check size={15} />
                          <span>Confirm & Trade</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coffee, Sparkles, MessageSquareHeart, Send, Heart } from 'lucide-react';
import { sendPeerSupport } from '@/app/actions/supportActions';
import { useCozyStore } from '@/store/useCozyStore';
import { ParticleBurst } from '@/components/ParticleBurst';
import { useModalBackButton } from '@/hooks/useModalBackButton';

interface PeerSupportSheetProps {
  recipientId: string;
  recipientName: string;
  vibeStatus?: 'sunshine' | 'neutral' | 'raincloud';
  isOpen: boolean;
  onClose: () => void;
  onBrewSent?: (recipientId: string) => void;
}

const COMFORT_STICKERS = [
  { emoji: '🍵', name: 'Hot Hug' },
  { emoji: '🧸', name: 'Warm Bear' },
  { emoji: '🌸', name: 'Cheer Bloom' },
  { emoji: '🕯️', name: 'Cozy Flame' },
  { emoji: '☕', name: 'Fresh Brew' },
  { emoji: '💛', name: 'Golden Spark' },
];

const VIBE_META = {
  sunshine: { emoji: '☀️', label: 'Sunshine', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  neutral: { emoji: '☕', label: 'Cozy', badge: 'bg-stone-800/80 text-amber-200 border-amber-500/20' },
  raincloud: { emoji: '🌧️', label: 'Raincloud', badge: 'bg-slate-800/80 text-sky-300 border-sky-500/30' },
};

export function PeerSupportSheet({
  recipientId,
  recipientName,
  vibeStatus = 'neutral',
  isOpen,
  onClose,
  onBrewSent,
}: PeerSupportSheetProps) {
  useModalBackButton({ isOpen, onClose });
  const [activeTab, setActiveTab] = useState<'default' | 'sticker' | 'note'>('default');
  const [noteText, setNoteText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showLocalParticles, setShowLocalParticles] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { addPoints } = useCozyStore();
  const currentVibe = vibeStatus || 'neutral';
  const vibeMeta = VIBE_META[currentVibe] ?? VIBE_META.neutral;

  // 1. Warm Brew: instant action, particle animation over plot, server action with error reconciliation
  async function handleWarmBrew() {
    if (isSending) return;
    setIsSending(true);
    setShowLocalParticles(true);

    // Trigger map-anchored particle animation callback
    onBrewSent?.(recipientId);

    // Optimistic point credit (+5 pts)
    addPoints(5);

    try {
      const res = await sendPeerSupport(recipientId, 'brew');
      if (!res.success) {
        // Reconcile optimistic points on server rejection
        addPoints(-5);
        setFeedback(res.error || 'Could not send Warm Brew.');
        setIsSending(false);
        setShowLocalParticles(false);
        return;
      }
    } catch (err) {
      console.warn('[PeerSupportSheet] brew error:', err);
      addPoints(-5);
      setFeedback('Failed to send Warm Brew. Please try again.');
      setIsSending(false);
      setShowLocalParticles(false);
      return;
    }

    // Auto-close sheet within 300ms on success
    setTimeout(() => {
      onClose();
      setIsSending(false);
      setShowLocalParticles(false);
    }, 300);
  }

  // 2. Comfort Sticker: select and send immediately with particle burst & smooth close
  async function handleSendSticker(emoji: string) {
    if (isSending) return;
    setIsSending(true);
    setShowLocalParticles(true);
    onBrewSent?.(recipientId);

    try {
      await sendPeerSupport(recipientId, 'sticker', emoji);
    } catch (err) {
      console.warn('[PeerSupportSheet] sticker error:', err);
    }

    setTimeout(() => {
      onClose();
      setIsSending(false);
      setShowLocalParticles(false);
    }, 350);
  }

  // 3. Private Note: deliver to porch holding pen
  async function handleSendNote() {
    if (!noteText.trim() || isSending) return;
    setIsSending(true);
    setShowLocalParticles(true);

    try {
      const res = await sendPeerSupport(recipientId, 'note', noteText.trim());
      if (!res.success) {
        setFeedback(res.error || 'Could not deliver note.');
        setIsSending(false);
        setShowLocalParticles(false);
        return;
      }
      setFeedback('💌 Note placed on porch');
      setTimeout(() => {
        onClose();
        setIsSending(false);
        setFeedback(null);
        setNoteText('');
        setShowLocalParticles(false);
      }, 400);
    } catch {
      setFeedback('Could not deliver note.');
      setIsSending(false);
      setShowLocalParticles(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle click-outside backdrop keeping background map visible */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/25 transition-opacity"
            aria-hidden
          />

          {/* Map-anchored bottom sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none p-3 sm:p-4 pb-6 sm:pb-6">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-lg rounded-3xl backdrop-blur-md bg-stone-950/85 border border-amber-500/30 text-amber-50 shadow-2xl p-4 sm:p-5 overflow-hidden pointer-events-auto relative"
            >
              {showLocalParticles && (
                <div className="absolute inset-0 pointer-events-none z-30">
                  <ParticleBurst emojis={['☕', '✨', '💛', '🌟']} count={10} radius={45} />
                </div>
              )}

              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                    <Heart className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <h3 className="text-sm font-800 text-amber-100 truncate">
                      {recipientName}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${vibeMeta.badge}`}>
                      {vibeMeta.emoji} {vibeMeta.label}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-amber-200 hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Action Pills Row */}
              <div className="grid grid-cols-3 gap-2 mt-3.5">
                {/* 1. Warm Brew Action Pill */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleWarmBrew}
                  disabled={isSending}
                  className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-800 transition-all cursor-pointer border ${
                    activeTab === 'default'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 border-amber-400 shadow-md active:scale-95'
                      : 'bg-stone-900/80 hover:bg-stone-800/90 text-amber-100 border-amber-500/20'
                  }`}
                  title="Send instant Warm Brew (+5 pts to both)"
                >
                  <Coffee size={15} className="shrink-0" />
                  <span className="truncate">☕ Warm Brew</span>
                </motion.button>

                {/* 2. Comfort Sticker Action Pill */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(activeTab === 'sticker' ? 'default' : 'sticker')}
                  disabled={isSending}
                  className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-800 transition-all cursor-pointer border ${
                    activeTab === 'sticker'
                      ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md'
                      : 'bg-stone-900/80 hover:bg-stone-800/90 text-amber-100 border-amber-500/20'
                  }`}
                >
                  <Sparkles size={15} className="shrink-0 text-amber-400 group-hover:text-amber-300" />
                  <span className="truncate">🧸 Sticker</span>
                </motion.button>

                {/* 3. Private Note Action Pill */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(activeTab === 'note' ? 'default' : 'note')}
                  disabled={isSending}
                  className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-800 transition-all cursor-pointer border ${
                    activeTab === 'note'
                      ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md'
                      : 'bg-stone-900/80 hover:bg-stone-800/90 text-amber-100 border-amber-500/20'
                  }`}
                >
                  <MessageSquareHeart size={15} className="shrink-0 text-amber-400" />
                  <span className="truncate">💌 Note</span>
                </motion.button>
              </div>

              {/* Sub-view: Comfort Sticker Picker */}
              <AnimatePresence>
                {activeTab === 'sticker' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-3 pt-3 border-t border-amber-500/20"
                  >
                    <div className="grid grid-cols-6 gap-2">
                      {COMFORT_STICKERS.map((st) => (
                        <button
                          key={st.emoji}
                          onClick={() => handleSendSticker(st.emoji)}
                          disabled={isSending}
                          className="flex flex-col items-center justify-center p-2 rounded-xl bg-stone-900/90 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400 transition-all text-xl cursor-pointer hover:scale-110 active:scale-95"
                          title={st.name}
                        >
                          <span>{st.emoji}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sub-view: Private Note Composer */}
              <AnimatePresence>
                {activeTab === 'note' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-3 pt-3 border-t border-amber-500/20 space-y-2.5"
                  >
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder={`Leave a gentle note for ${recipientName}'s porch...`}
                      rows={2}
                      className="w-full p-2.5 rounded-xl bg-stone-900/90 border border-amber-500/30 text-amber-100 text-xs placeholder:text-stone-500 focus:outline-none focus:border-amber-400 resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setActiveTab('default')}
                        className="px-3 py-1.5 rounded-xl text-xs font-700 text-stone-400 hover:text-amber-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSendNote}
                        disabled={isSending || !noteText.trim()}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-800 disabled:opacity-40 transition-all cursor-pointer active:scale-95"
                      >
                        <Send size={12} />
                        <span>Deliver to Porch</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Optional Feedback banner */}
              {feedback && (
                <div className="mt-2.5 p-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs text-center font-bold">
                  {feedback}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

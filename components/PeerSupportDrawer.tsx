'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coffee, Heart, Send, Sparkles, MessageSquareHeart } from 'lucide-react';
import { sendPeerSupport } from '@/app/actions/vibeActions';
import { useCozyStore } from '@/store/useCozyStore';
import { ParticleBurst } from '@/components/ParticleBurst';

interface PeerSupportDrawerProps {
  recipientId: string;
  recipientName: string;
  vibeStatus?: 'sunshine' | 'neutral' | 'raincloud';
  isOpen: boolean;
  onClose: () => void;
}

const COMFORT_STICKERS = [
  { emoji: '🍵', name: 'Hot Hug Mug' },
  { emoji: '🧸', name: 'Warm Bear' },
  { emoji: '🌸', name: 'Cheer Bloom' },
  { emoji: '🕯️', name: 'Cozy Flame' },
  { emoji: '☕', name: 'Fresh Brew' },
  { emoji: '💛', name: 'Golden Spark' },
];

const VIBE_BADGE_CONFIG: Record<
  'sunshine' | 'neutral' | 'raincloud',
  { emoji: string; label: string; badgeClass: string; subtitle: string }
> = {
  sunshine: {
    emoji: '☀️',
    label: 'Sunshine',
    badgeClass: 'bg-amber-100/90 text-amber-900 border-amber-300',
    subtitle: 'Share positive energy & celebrate together',
  },
  neutral: {
    emoji: '☕',
    label: 'Cozy',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    subtitle: 'Send warmth & peer cheer to stay connected',
  },
  raincloud: {
    emoji: '🌧️',
    label: 'Raincloud',
    badgeClass: 'bg-slate-200/80 text-slate-700 border-slate-300',
    subtitle: 'Send warmth & peer cheer to brighten their day',
  },
};

export function PeerSupportDrawer({
  recipientId,
  recipientName,
  vibeStatus = 'neutral',
  isOpen,
  onClose,
}: PeerSupportDrawerProps) {
  const [activeTab, setActiveTab] = useState<'brew' | 'sticker' | 'note'>('brew');
  const [noteText, setNoteText] = useState('');
  const [selectedSticker, setSelectedSticker] = useState('🍵');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showParticles, setShowParticles] = useState(false);

  const { addPoints } = useCozyStore();

  const currentVibe = vibeStatus || 'neutral';
  const vibeMeta = VIBE_BADGE_CONFIG[currentVibe] ?? VIBE_BADGE_CONFIG.neutral;

  if (!isOpen) return null;

  async function handleSendBrew() {
    setIsSending(true);
    setFeedback(null);
    try {
      const res = await sendPeerSupport(recipientId, 'brew');
      if (res.success) {
        addPoints(5);
        setShowParticles(true);
        setFeedback(`Sent Warm Brew to ${recipientName}! +5 pts awarded to both of you ☕💛`);
        setTimeout(() => {
          onClose();
          setFeedback(null);
          setShowParticles(false);
        }, 1800);
      } else {
        setFeedback(res.error || 'Could not send brew.');
      }
    } catch {
      setFeedback('Something went wrong.');
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendSticker() {
    setIsSending(true);
    setFeedback(null);
    try {
      const res = await sendPeerSupport(recipientId, 'sticker', { stickerEmoji: selectedSticker });
      if (res.success) {
        setShowParticles(true);
        setFeedback(`Comfort Sticker ${selectedSticker} sent to ${recipientName}! 🧸`);
        setTimeout(() => {
          onClose();
          setFeedback(null);
          setShowParticles(false);
        }, 1800);
      } else {
        setFeedback(res.error || 'Could not send sticker.');
      }
    } catch {
      setFeedback('Something went wrong.');
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendNote() {
    if (!noteText.trim()) return;
    setIsSending(true);
    setFeedback(null);
    try {
      const res = await sendPeerSupport(recipientId, 'note', { noteText });
      if (res.success) {
        setShowParticles(true);
        setFeedback(`Supportive Note delivered directly to ${recipientName}'s Mailbox! 💌`);
        setNoteText('');
        setTimeout(() => {
          onClose();
          setFeedback(null);
          setShowParticles(false);
        }, 1800);
      } else {
        setFeedback(res.error || 'Could not send note.');
      }
    } catch {
      setFeedback('Something went wrong.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
        {showParticles && <ParticleBurst />}

        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-amber-200/80 shadow-2xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #fffcf8 0%, #f7ebd9 100%)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-amber-200/40">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-200/60 flex items-center justify-center text-amber-900 border border-amber-300">
                <Heart className="w-5 h-5 fill-amber-600 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-800 text-amber-950 flex items-center gap-1.5 leading-tight">
                  Support {recipientName}
                  <span className={`text-xs font-700 px-2 py-0.5 rounded-full border ${vibeMeta.badgeClass}`}>
                    {vibeMeta.emoji} {vibeMeta.label}
                  </span>
                </h3>
                <p className="text-xs text-amber-800/80 font-500">
                  {vibeMeta.subtitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-amber-800 hover:bg-amber-200/50"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 gap-2 my-4 p-1 rounded-2xl bg-amber-200/30 border border-amber-200">
            <button
              onClick={() => setActiveTab('brew')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-800 transition-all ${
                activeTab === 'brew'
                  ? 'bg-white text-amber-950 shadow-sm border border-amber-200'
                  : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              <Coffee size={14} /> Warm Brew
            </button>
            <button
              onClick={() => setActiveTab('sticker')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-800 transition-all ${
                activeTab === 'sticker'
                  ? 'bg-white text-amber-950 shadow-sm border border-amber-200'
                  : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              <Sparkles size={14} /> Comfort Sticker
            </button>
            <button
              onClick={() => setActiveTab('note')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-800 transition-all ${
                activeTab === 'note'
                  ? 'bg-white text-amber-950 shadow-sm border border-amber-200'
                  : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              <MessageSquareHeart size={14} /> Private Note
            </button>
          </div>

          {/* Tab content */}
          <div className="my-3 min-h-[140px]">
            {activeTab === 'brew' && (
              <div className="space-y-3 text-center py-2">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 flex items-center justify-center text-4xl shadow-inner border border-amber-300">
                  ☕
                </div>
                <div>
                  <h4 className="text-sm font-800 text-amber-950">Send a Virtual Warm Brew</h4>
                  <p className="text-xs font-500 text-amber-800/80 mt-1 max-w-xs mx-auto">
                    Instantly sends micro-cheer. Awards <span className="font-800 text-amber-900">+5 pts to BOTH of you</span> and shifts their weather toward sunshine!
                  </p>
                </div>
                <button
                  onClick={handleSendBrew}
                  disabled={isSending}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-amber-950 font-800 text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Coffee size={16} /> Send Warm Brew (+5 Pts)
                </button>
              </div>
            )}

            {activeTab === 'sticker' && (
              <div className="space-y-3 py-1">
                <p className="text-xs font-600 text-amber-900 text-center">
                  Select a high-tier Comfort Sticker to attach to {recipientName}&apos;s space:
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {COMFORT_STICKERS.map((st) => (
                    <button
                      key={st.emoji}
                      onClick={() => setSelectedSticker(st.emoji)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl border-2 transition-all ${
                        selectedSticker === st.emoji
                          ? 'bg-amber-100/90 border-amber-500 shadow-md scale-105'
                          : 'bg-white/60 border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      <span className="text-2xl">{st.emoji}</span>
                      <span className="text-[10px] font-700 text-amber-900 truncate max-w-full">
                        {st.name}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSendSticker}
                  disabled={isSending}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-amber-950 font-800 text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                >
                  <Sparkles size={16} /> Send Comfort Sticker
                </button>
              </div>
            )}

            {activeTab === 'note' && (
              <div className="space-y-3 py-1">
                <p className="text-xs font-600 text-amber-900">
                  Write a private, positivity-only message going straight to {recipientName}&apos;s Mailbox:
                </p>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Thinking of you today! Take all the rest you need, you are doing great. 💛"
                  className="w-full h-24 p-3 rounded-2xl bg-white border border-amber-300 text-xs font-500 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                />
                <button
                  onClick={handleSendNote}
                  disabled={isSending || !noteText.trim()}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-50 text-amber-950 font-800 text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Send size={16} /> Deliver Private Note
                </button>
              </div>
            )}
          </div>

          {/* Feedback banner */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2 p-2.5 rounded-xl bg-amber-200/80 border border-amber-300 text-amber-950 text-xs font-700 text-center"
              >
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

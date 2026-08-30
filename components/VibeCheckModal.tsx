'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Coffee, CloudRain, Heart, Sparkles } from 'lucide-react';
import { useCozyStore, type VibeStatus } from '@/store/useCozyStore';
import { updateVibeStatus } from '@/app/actions/vibeActions';
import { createBrowserClient } from '@/lib/supabase-browser';
import { useModalBackButton } from '@/hooks/useModalBackButton';

interface VibeCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VIBE_OPTIONS: {
  id: VibeStatus;
  emoji: string;
  title: string;
  subtitle: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'sunshine',
    emoji: '☀️',
    title: 'Sunshine',
    subtitle: 'Energized, clean, thriving space',
    bgGradient: 'linear-gradient(135deg, rgba(254,240,138,0.30) 0%, rgba(250,204,21,0.15) 100%)',
    borderColor: '#eab308',
    textColor: '#854d0e',
    icon: <Sun className="w-6 h-6 text-amber-500" />,
  },
  {
    id: 'neutral',
    emoji: '☕',
    title: 'Cozy / Neutral',
    subtitle: 'Steady, peaceful & relaxing day',
    bgGradient: 'linear-gradient(135deg, rgba(245,237,224,0.60) 0%, rgba(232,168,124,0.25) 100%)',
    borderColor: '#c4704a',
    textColor: '#643c28',
    icon: <Coffee className="w-6 h-6 text-amber-700" />,
  },
  {
    id: 'raincloud',
    emoji: '🌧️',
    title: 'Raincloud',
    subtitle: 'Overwhelmed, messy, or needing a lift',
    bgGradient: 'linear-gradient(135deg, rgba(203,213,225,0.45) 0%, rgba(148,163,184,0.25) 100%)',
    borderColor: '#64748b',
    textColor: '#334155',
    icon: <CloudRain className="w-6 h-6 text-slate-600" />,
  },
];

export function VibeCheckModal({ isOpen, onClose }: VibeCheckModalProps) {
  useModalBackButton({ isOpen, onClose });
  const { vibeStatus, setVibeStatus } = useCozyStore();
  const [selected, setSelected] = useState<VibeStatus>(vibeStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelected(vibeStatus);
      setConfirmationMsg(null);
    }
  }, [isOpen, vibeStatus]);

  if (!mounted) return null;

  async function handleSelect(status: VibeStatus) {
    setSelected(status);
    setIsSubmitting(true);
    setVibeStatus(status);

    try {
      const activeGroupId = useCozyStore.getState().groupId ?? undefined;
      const res = await updateVibeStatus(status, activeGroupId);
      if (res.success) {
        // Broadcast to realtime channels so peers see the update instantly
        try {
          const supabase = createBrowserClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const targetChannels = ['cozy-global-broadcast'];
            if (activeGroupId) {
              targetChannels.push(`cozy-group-room-${activeGroupId}`);
            }

            targetChannels.forEach((chName) => {
              const channel = supabase.channel(chName);
              let cleanupTimer: NodeJS.Timeout | null = null;
              const cleanup = () => {
                if (cleanupTimer) {
                  clearTimeout(cleanupTimer);
                  cleanupTimer = null;
                }
                supabase.removeChannel(channel);
              };

              cleanupTimer = setTimeout(cleanup, 4000);

              channel.subscribe((subStatus) => {
                if (subStatus === 'SUBSCRIBED') {
                  channel
                    .send({
                      type: 'broadcast',
                      event: 'vibe_updated',
                      payload: { userId: user.id, vibe_status: status },
                    })
                    .then(cleanup)
                    .catch(cleanup);
                } else if (
                  subStatus === 'CHANNEL_ERROR' ||
                  subStatus === 'TIMED_OUT' ||
                  subStatus === 'CLOSED'
                ) {
                  cleanup();
                }
              });
            });
          }
        } catch {
          // ignore broadcast errors
        }

        if (status === 'raincloud') {
          setConfirmationMsg(
            'Your plot is pulsing with a soft, comforting beacon. Your neighbors can send you warm brews & cheer! 🌧️💛'
          );
        } else {
          setConfirmationMsg(
            `Weather updated to ${status === 'sunshine' ? '☀️ Sunshine' : '☕ Cozy'}! Enjoy your space.`
          );
        }
      }
    } catch {
      // Keep optimistic Zustand update
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setConfirmationMsg(null);
        onClose();
      }, 1400);
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="vibe-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            key="vibe-modal-card"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full max-w-md rounded-3xl border-2 border-[--cozy-amber]/30 shadow-2xl p-6 relative overflow-hidden my-auto max-h-[90vh] flex flex-col justify-between"
            style={{
              background: 'linear-gradient(160deg, #fffcf8 0%, #f7ebd9 100%)',
              boxShadow: '0 20px 60px rgba(84, 50, 32, 0.25)',
            }}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-[--cozy-amber]/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[--cozy-amber]/15 flex items-center justify-center text-[--cozy-bark] shadow-sm border border-[--cozy-amber]/30">
                    <Sparkles size={20} className="text-[--cozy-amber]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-800 text-[--cozy-bark] leading-tight">
                      Daily Vibe Check
                    </h2>
                    <p className="text-xs font-600 text-[--cozy-muted]">
                      Atmospheric Layer · How is your space today?
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[--cozy-muted] hover:bg-[--cozy-amber]/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Main prompt */}
              <div className="my-3.5 p-3.5 rounded-2xl bg-white/80 border border-[--cozy-amber]/20 text-center shadow-inner">
                <p className="text-sm font-700 text-[--cozy-bark]">
                  &quot;How&apos;s the weather in your space today?&quot;
                </p>
                <p className="text-[11px] font-500 text-[--cozy-muted] mt-1">
                  Your status floating aura lets peers visually support you on the Village map.
                </p>
              </div>

              {/* Options grid */}
              <div className="space-y-2.5 my-3">
                {VIBE_OPTIONS.map((opt) => {
                  const isSelected = selected === opt.id;
                  return (
                    <motion.button
                      key={opt.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(opt.id)}
                      disabled={isSubmitting}
                      className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden shadow-sm"
                      style={{
                        background: opt.bgGradient,
                        borderColor: isSelected ? 'var(--cozy-gold)' : 'rgba(217, 119, 54, 0.25)',
                        boxShadow: isSelected ? '0 0 16px rgba(202, 138, 4, 0.35)' : undefined,
                      }}
                    >
                      <span className="text-2xl flex-shrink-0">{opt.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-800" style={{ color: opt.textColor }}>
                            {opt.title}
                          </h3>
                          {isSelected && (
                            <span className="text-[9px] font-800 px-2 py-0.5 rounded-full bg-white/90 text-[--cozy-bark] border border-[--cozy-amber]/30">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-500 mt-0.5 opacity-90 leading-tight" style={{ color: opt.textColor }}>
                          {opt.subtitle}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Toast / confirmation message */}
            <AnimatePresence>
              {confirmationMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 p-3 rounded-xl bg-[--cozy-amber]/15 border border-[--cozy-amber]/40 text-[--cozy-bark] text-xs font-700 text-center flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Heart size={14} className="fill-[--cozy-amber] text-[--cozy-amber] flex-shrink-0" />
                  <span>{confirmationMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

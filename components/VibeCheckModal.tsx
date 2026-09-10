'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Heart, BellOff, Bell } from 'lucide-react';
import { useCozyStore, type VibeStatus } from '@/store/useCozyStore';
import { updateVibeStatus } from '@/app/actions/vibeActions';
import { createBrowserClient } from '@/lib/supabase-browser';
import { useModalBackButton } from '@/hooks/useModalBackButton';

interface VibeCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Statuses that default the Quiet Mode toggle to ON. */
const QUIET_MODE_DEFAULTS = new Set<VibeStatus>(['foggy']);

/** Whether a status triggers peer support notifications at all. */
const TRIGGERS_WATERFALL = new Set<VibeStatus>(['foggy', 'raincloud', 'storm']);

const VIBE_OPTIONS: {
  id: VibeStatus;
  emoji: string;
  title: string;
  subtitle: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  tier: 'positive' | 'neutral' | 'distress';
}[] = [
  // ── Positive ────────────────────────────────────────────────────────────
  {
    id: 'sunshine',
    emoji: '☀️',
    title: 'Sunshine',
    subtitle: 'Energized, clean, thriving space',
    bgGradient: 'linear-gradient(135deg, rgba(254,240,138,0.35) 0%, rgba(250,204,21,0.18) 100%)',
    borderColor: '#eab308',
    textColor: '#854d0e',
    tier: 'positive',
  },
  {
    id: 'breeze',
    emoji: '🌬️',
    title: 'Breezy',
    subtitle: 'Light, refreshed, moving through the day',
    bgGradient: 'linear-gradient(135deg, rgba(186,230,253,0.35) 0%, rgba(125,211,252,0.18) 100%)',
    borderColor: '#38bdf8',
    textColor: '#0c4a6e',
    tier: 'positive',
  },
  {
    id: 'starlight',
    emoji: '✨',
    title: 'Starlight',
    subtitle: 'Calm, reflective night energy',
    bgGradient: 'linear-gradient(135deg, rgba(196,181,253,0.35) 0%, rgba(139,92,246,0.18) 100%)',
    borderColor: '#8b5cf6',
    textColor: '#4c1d95',
    tier: 'positive',
  },
  // ── Neutral ─────────────────────────────────────────────────────────────
  {
    id: 'neutral',
    emoji: '☕',
    title: 'Cozy / Neutral',
    subtitle: 'Steady, peaceful & relaxing day',
    bgGradient: 'linear-gradient(135deg, rgba(245,237,224,0.60) 0%, rgba(232,168,124,0.25) 100%)',
    borderColor: '#c4704a',
    textColor: '#643c28',
    tier: 'neutral',
  },
  // ── Distress ────────────────────────────────────────────────────────────
  {
    id: 'foggy',
    emoji: '🌫️',
    title: 'Foggy',
    subtitle: 'A little unclear, low energy today',
    bgGradient: 'linear-gradient(135deg, rgba(226,232,240,0.50) 0%, rgba(203,213,225,0.30) 100%)',
    borderColor: '#94a3b8',
    textColor: '#475569',
    tier: 'distress',
  },
  {
    id: 'raincloud',
    emoji: '🌧️',
    title: 'Raincloud',
    subtitle: 'Overwhelmed, messy, or needing a lift',
    bgGradient: 'linear-gradient(135deg, rgba(203,213,225,0.45) 0%, rgba(148,163,184,0.25) 100%)',
    borderColor: '#64748b',
    textColor: '#334155',
    tier: 'distress',
  },
  {
    id: 'storm',
    emoji: '⛈️',
    title: 'Storm',
    subtitle: 'Going through something heavy right now',
    bgGradient: 'linear-gradient(135deg, rgba(165,180,252,0.30) 0%, rgba(99,102,241,0.15) 100%)',
    borderColor: '#4f46e5',
    textColor: '#1e1b4b',
    tier: 'distress',
  },
];

const CONFIRMATION_MESSAGES: Partial<Record<VibeStatus, string>> = {
  sunshine: '☀️ Sunshine logged! Your space is glowing.',
  breeze: '🌬️ Breezy check-in logged! Keep riding that wave.',
  starlight: '✨ Starlight mode on. Quiet, calm, and you.',
  neutral: '☕ Cozy check-in saved. A steady day is a good day.',
  foggy: '🌫️ Foggy noted. Your porch is open. Rest up. 🌿',
  raincloud: '🌧️ Your plot is pulsing with a soft, comforting beacon. Your neighbors can send you warm brews & cheer! 💛',
  storm: '⛈️ Storm check-in sent. Your Anchor Buddy has been quietly notified. You\'re not alone. 🕯️',
};

export function VibeCheckModal({ isOpen, onClose }: VibeCheckModalProps) {
  useModalBackButton({ isOpen, onClose });
  const { vibeStatus, setVibeStatus } = useCozyStore();
  const [selected, setSelected] = useState<VibeStatus>(vibeStatus);
  const [quietMode, setQuietMode] = useState<boolean>(QUIET_MODE_DEFAULTS.has(vibeStatus));
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
      // Reset quiet mode to the default for the current status
      setQuietMode(QUIET_MODE_DEFAULTS.has(vibeStatus));
    }
  }, [isOpen, vibeStatus]);

  // When user picks a card, auto-set quiet mode default for that status
  function handleCardSelect(id: VibeStatus) {
    setSelected(id);
    if (QUIET_MODE_DEFAULTS.has(id)) {
      setQuietMode(true);
    } else if (id !== selected) {
      // Only reset to false when changing status (don't override manual toggles for same status)
      setQuietMode(false);
    }
  }

  if (!mounted) return null;

  async function handleSelect(status: VibeStatus) {
    const prevStatus = useCozyStore.getState().vibeStatus;
    const prevDate = useCozyStore.getState().lastVibeCheckDate;
    setIsSubmitting(true);
    setVibeStatus(status, false); // Optimistic UI update without prematurely marking check-in complete

    try {
      const activeGroupId = useCozyStore.getState().groupId ?? undefined;
      const clientOffset = -new Date().getTimezoneOffset();
      const res = await updateVibeStatus(status, activeGroupId, clientOffset, quietMode);
      if (res.success) {
        // Stamp daily check-in completion only after server action succeeds
        useCozyStore.getState().markVibeCheckedToday();

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

        setConfirmationMsg(
          CONFIRMATION_MESSAGES[status] ??
            `Weather updated to ${status}! Your space reflects your day. 🌿`
        );
      } else {
        // Roll back optimistic state on failure so daily prompt stays active
        setVibeStatus(prevStatus, false);
        useCozyStore.getState().setLastVibeCheckDate(prevDate);
        setSelected(prevStatus);
      }
    } catch {
      // Roll back on network/server error so daily prompt stays active
      setVibeStatus(prevStatus, false);
      useCozyStore.getState().setLastVibeCheckDate(prevDate);
      setSelected(prevStatus);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setConfirmationMsg(null);
        onClose();
      }, 1800);
    }
  }

  const showsWaterfall = TRIGGERS_WATERFALL.has(selected);

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

              {/* Positive tier */}
              <p className="text-[10px] font-800 text-[--cozy-muted] uppercase tracking-widest mb-1.5 px-0.5">
                ✦ Feeling good
              </p>
              <div className="space-y-2 mb-3">
                {VIBE_OPTIONS.filter((o) => o.tier === 'positive').map((opt) => (
                  <WeatherCard
                    key={opt.id}
                    opt={opt}
                    isSelected={selected === opt.id}
                    isSubmitting={isSubmitting}
                    onSelect={() => {
                      handleCardSelect(opt.id);
                      handleSelect(opt.id);
                    }}
                  />
                ))}
              </div>

              {/* Neutral tier */}
              <p className="text-[10px] font-800 text-[--cozy-muted] uppercase tracking-widest mb-1.5 px-0.5">
                ☁️ Steady cozy
              </p>
              <div className="space-y-2 mb-3">
                {VIBE_OPTIONS.filter((o) => o.tier === 'neutral').map((opt) => (
                  <WeatherCard
                    key={opt.id}
                    opt={opt}
                    isSelected={selected === opt.id}
                    isSubmitting={isSubmitting}
                    onSelect={() => {
                      handleCardSelect(opt.id);
                      handleSelect(opt.id);
                    }}
                  />
                ))}
              </div>

              {/* Distress tier */}
              <p className="text-[10px] font-800 text-[--cozy-muted] uppercase tracking-widest mb-1.5 px-0.5">
                🌧️ Need some warmth
              </p>
              <div className="space-y-2 mb-3">
                {VIBE_OPTIONS.filter((o) => o.tier === 'distress').map((opt) => (
                  <WeatherCard
                    key={opt.id}
                    opt={opt}
                    isSelected={selected === opt.id}
                    isSubmitting={isSubmitting}
                    onSelect={() => {
                      handleCardSelect(opt.id);
                      handleSelect(opt.id);
                    }}
                  />
                ))}
              </div>

              {/* Quiet Mode toggle — only shown for distress statuses */}
              <AnimatePresence>
                {showsWaterfall && (
                  <motion.div
                    key="quiet-mode-row"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <button
                      onClick={() => setQuietMode((v) => !v)}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/70 border border-[--cozy-amber]/20 text-left transition-colors hover:bg-white/90 mt-1"
                    >
                      <div className="flex items-center gap-2.5">
                        {quietMode ? (
                          <BellOff size={16} className="text-slate-500 flex-shrink-0" />
                        ) : (
                          <Bell size={16} className="text-amber-600 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-xs font-700 text-[--cozy-bark]">
                            {quietMode ? 'Quiet Mode ON' : 'Quiet Mode OFF'}
                          </p>
                          <p className="text-[10px] font-500 text-[--cozy-muted] leading-tight">
                            {quietMode
                              ? 'Porch digest only — no direct Anchor Buddy push'
                              : 'Your Anchor Buddy will receive a quiet alert'}
                          </p>
                        </div>
                      </div>
                      <div
                        className="w-10 h-5.5 rounded-full transition-colors flex items-center px-0.5"
                        style={{
                          background: quietMode ? '#94a3b8' : 'var(--cozy-amber)',
                          minWidth: '2.5rem',
                          height: '1.375rem',
                        }}
                      >
                        <motion.div
                          className="w-4 h-4 rounded-full bg-white shadow-sm"
                          animate={{ x: quietMode ? 0 : '1.125rem' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Toast / confirmation message */}
            <AnimatePresence>
              {confirmationMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 p-3 rounded-xl bg-[--cozy-amber]/15 border border-[--cozy-amber]/40 text-[--cozy-bark] text-xs font-700 text-center flex items-center justify-center gap-1.5 shadow-md"
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

// ---------------------------------------------------------------------------
// WeatherCard sub-component
// ---------------------------------------------------------------------------

interface WeatherCardProps {
  opt: (typeof VIBE_OPTIONS)[number];
  isSelected: boolean;
  isSubmitting: boolean;
  onSelect: () => void;
}

function WeatherCard({ opt, isSelected, isSubmitting, onSelect }: WeatherCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
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
}

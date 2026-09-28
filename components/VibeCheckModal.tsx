'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, BellOff, Bell } from 'lucide-react';
import { ModalShell, SelectableTile } from '@digitalcanopy/ui';
import { useCozyStore, type VibeStatus } from '@/store/useCozyStore';
import { updateVibeStatus } from '@/app/actions/vibeActions';
import { createBrowserClient } from '@/lib/supabase-browser';
import { useModalBackButton } from '@/hooks/useModalBackButton';
import { VIBE_GROUPS } from '@/types/vibe';

export interface VibeCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Statuses that default the Quiet Mode toggle to ON. */
const QUIET_MODE_DEFAULTS = new Set<VibeStatus>(['foggy']);

/** Whether a status triggers peer support notifications at all. */
const TRIGGERS_WATERFALL = new Set<VibeStatus>(['foggy', 'raincloud', 'storm']);

const CONFIRMATION_MESSAGES: Partial<Record<VibeStatus, string>> = {
  sunshine: '☀️ Sunshine logged! Your space is glowing.',
  breezy: '🌬️ Breezy check-in logged! Keep riding that wave.',
  breeze: '🌬️ Breezy check-in logged! Keep riding that wave.',
  starlight: '✨ Starlight mode on. Quiet, calm, and you.',
  neutral: '☕ Cozy check-in saved. A steady day is a good day.',
  foggy: '🌫️ Foggy noted. Your porch is open. Rest up. 🌿',
  raincloud: '🌧️ Your plot is pulsing with a soft, comforting beacon. Your neighbors can send you warm brews & cheer! 💛',
  storm: "⛈️ Storm check-in sent. Your Anchor Buddy has been quietly notified. You're not alone. 🕯️",
};

/**
 * DailyVibeCheckModal / VibeCheckModal
 * Standardized with @digitalcanopy/ui ModalShell and SelectableTile primitives.
 * Enforces rigid viewport containment (< 85dvh) and accessible contrast tokens.
 */
export function VibeCheckModal({ isOpen, onClose }: VibeCheckModalProps) {
  useModalBackButton({ isOpen, onClose });
  const { vibeStatus, setVibeStatus } = useCozyStore();
  const [selected, setSelected] = useState<VibeStatus>(vibeStatus);
  const [quietMode, setQuietMode] = useState<boolean>(QUIET_MODE_DEFAULTS.has(vibeStatus));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState<string | null>(null);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSelected(vibeStatus);
      setConfirmationMsg(null);
      setQuietMode(QUIET_MODE_DEFAULTS.has(vibeStatus));
    }
  }

  function handleCardSelect(id: VibeStatus) {
    setSelected(id);
    if (QUIET_MODE_DEFAULTS.has(id)) {
      setQuietMode(true);
    } else if (id !== selected) {
      setQuietMode(false);
    }
  }

  async function handleSelect(status: VibeStatus) {
    const prevStatus = useCozyStore.getState().vibeStatus;
    const prevDate = useCozyStore.getState().lastVibeCheckDate;
    setIsSubmitting(true);
    setVibeStatus(status, false);

    try {
      const activeGroupId = useCozyStore.getState().groupId ?? undefined;
      const clientOffset = -new Date().getTimezoneOffset();
      const res = await updateVibeStatus(status, activeGroupId, clientOffset, quietMode);
      if (res.success) {
        useCozyStore.getState().markVibeCheckedToday();

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
              let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
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
        setVibeStatus(prevStatus, false);
        useCozyStore.getState().setLastVibeCheckDate(prevDate);
        setSelected(prevStatus);
      }
    } catch {
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

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Daily Vibe Check"
      subtitle="Atmospheric Layer · How is your space today?"
      icon={
        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 flex items-center justify-center text-amber-900 dark:text-amber-200 shadow-sm border border-amber-500/30">
          <Sparkles size={20} className="text-amber-600 dark:text-amber-400" />
        </div>
      }
      closeAriaLabel="Close Vibe Check modal"
      className="border-2 border-[--cozy-amber]/30 dark:border-amber-600/30 shadow-2xl bg-gradient-to-br from-[#fffcf8] to-[#f7ebd9] dark:from-[#1c1613] dark:to-[#120d0a] text-stone-900 dark:text-stone-100"
      headerClassName="pb-3 border-b border-stone-200 dark:border-stone-800"
      bodyClassName="space-y-4"
      testID="vibe-check-modal"
    >
      {/* Main prompt / Explainer banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300/40 text-stone-800 dark:bg-stone-900/60 dark:border-stone-800 dark:text-stone-200 text-center shadow-sm">
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          &quot;How&apos;s the weather in your space today?&quot;
        </p>
        <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
          Your status floating aura lets peers visually support you on the Village map.
        </p>
      </div>

      {/* Render All 6 Vibe Statuses under respective Group Headers */}
      {VIBE_GROUPS.map((group) => (
        <div key={group.id} className="space-y-2">
          <div className="text-stone-600 dark:text-stone-400 text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5 px-1 py-1">
            <span className="opacity-90">{group.icon}</span>
            <span>{group.label}</span>
          </div>
          <div className="space-y-2 mb-3">
            {group.items.map((opt) => (
              <SelectableTile
                key={opt.id}
                selected={selected === opt.id}
                variant={opt.variant}
                icon={<span className="text-2xl">{opt.emoji}</span>}
                title={opt.title}
                description={opt.description}
                disabled={isSubmitting}
                onClick={() => {
                  handleCardSelect(opt.id);
                  handleSelect(opt.id);
                }}
                trailing={
                  selected === opt.id ? (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-white/90 text-stone-900 border border-amber-500/30">
                      Active
                    </span>
                  ) : undefined
                }
              />
            ))}
          </div>
        </div>
      ))}

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
              type="button"
              onClick={() => setQuietMode((v) => !v)}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/70 dark:bg-stone-800/70 border border-[--cozy-amber]/20 dark:border-stone-700 text-left transition-colors hover:bg-white/90 dark:hover:bg-stone-800 mt-1 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {quietMode ? (
                  <BellOff size={16} className="text-slate-500 dark:text-stone-400 flex-shrink-0" />
                ) : (
                  <Bell size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    {quietMode ? 'Quiet Mode ON' : 'Quiet Mode OFF'}
                  </p>
                  <p className="text-[10px] font-medium text-stone-600 dark:text-stone-400 leading-tight">
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

      {/* Toast / confirmation message */}
      <AnimatePresence>
        {confirmationMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 p-3 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/40 text-stone-900 dark:text-amber-100 text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-md"
          >
            <Heart size={14} className="fill-amber-500 text-amber-500 flex-shrink-0" />
            <span>{confirmationMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalShell>
  );
}

export { VibeCheckModal as DailyVibeCheckModal };
export default VibeCheckModal;

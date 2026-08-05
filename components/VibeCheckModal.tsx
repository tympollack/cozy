'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Coffee, CloudRain, Heart, Sparkles } from 'lucide-react';
import { useCozyStore, type VibeStatus } from '@/store/useCozyStore';
import { updateVibeStatus } from '@/app/actions/vibeActions';

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
  const { vibeStatus, setVibeStatus } = useCozyStore();
  const [selected, setSelected] = useState<VibeStatus>(vibeStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSelect(status: VibeStatus) {
    setSelected(status);
    setIsSubmitting(true);
    setVibeStatus(status);

    try {
      const res = await updateVibeStatus(status);
      if (res.success) {
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-md rounded-3xl bg-amber-50/95 border-2 border-amber-200/60 shadow-2xl p-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #fffcf8 0%, #f7ebd9 100%)',
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-200/50 flex items-center justify-center text-amber-800 shadow-sm border border-amber-300/40">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-lg font-800 text-amber-950 leading-tight">
                  Daily Vibe Check
                </h2>
                <p className="text-xs font-600 text-amber-800/80">
                  Atmospheric Layer · How is your space today?
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-amber-800 hover:bg-amber-200/50 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Main prompt */}
          <div className="my-4 p-4 rounded-2xl bg-white/70 border border-amber-200/50 text-center shadow-inner">
            <p className="text-sm font-700 text-amber-900">
              &quot;How&apos;s the weather in your space today?&quot;
            </p>
            <p className="text-[11px] font-500 text-amber-700 mt-1">
              Your status floating aura lets peers visually support you on the Village map.
            </p>
          </div>

          {/* Options grid */}
          <div className="space-y-3 my-4">
            {VIBE_OPTIONS.map((opt) => {
              const isSelected = selected === opt.id;
              return (
                <motion.button
                  key={opt.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(opt.id)}
                  disabled={isSubmitting}
                  className="w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden shadow-sm"
                  style={{
                    background: opt.bgGradient,
                    borderColor: isSelected ? opt.borderColor : 'rgba(232,168,124,0.30)',
                    boxShadow: isSelected ? `0 0 16px ${opt.borderColor}40` : undefined,
                  }}
                >
                  <span className="text-3xl flex-shrink-0">{opt.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-800" style={{ color: opt.textColor }}>
                        {opt.title}
                      </h3>
                      {isSelected && (
                        <span className="text-[10px] font-800 px-2 py-0.5 rounded-full bg-white/80 text-amber-900 border">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-500 mt-0.5 opacity-90" style={{ color: opt.textColor }}>
                      {opt.subtitle}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Toast / confirmation message */}
          <AnimatePresence>
            {confirmationMsg && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 p-3 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 text-xs font-700 text-center flex items-center justify-center gap-1.5 shadow-md"
              >
                <Heart size={14} className="fill-amber-600 text-amber-600 flex-shrink-0" />
                <span>{confirmationMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

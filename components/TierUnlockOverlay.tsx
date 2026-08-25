'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock } from 'lucide-react';
import { TIER_NAMES, TIER_BADGES, type ShellDefinition } from '@/config/shellDefinitions';
import { ParticleBurst } from './ParticleBurst';

interface TierUnlockOverlayProps {
  /** The tier that was just unlocked. */
  newTier: number;
  /** The active shell definition (to display newly unlocked slot names). */
  shell: ShellDefinition;
  /** Called when the user dismisses the celebration. */
  onDismiss: () => void;
}

export function TierUnlockOverlay({ newTier, shell, onDismiss }: TierUnlockOverlayProps) {
  // Slots newly accessible at this tier
  const newSlots = shell.slots.filter((s) => s.tier === newTier);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[--cozy-bark]/30 backdrop-blur-md"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.75, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm rounded-3xl overflow-hidden
            border-2 border-[--cozy-amber]/40
            backdrop-blur-md bg-white/20 dark:bg-black/40
            shadow-2xl text-center px-8 py-10"
        >
          {/* Particle burst — warm celebration */}
          <ParticleBurst
            count={16}
            emojis={['🌟', '✨', '🪄', '🌼', '⭐']}
            radius={90}
            duration={1400}
          />

          {/* Tier badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
            className="text-7xl mb-4 select-none"
            role="img"
            aria-label={TIER_NAMES[newTier]}
          >
            {TIER_BADGES[newTier] ?? '🏡'}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            <p className="text-xs font-700 uppercase tracking-widest text-[--cozy-amber] mb-1">
              New Space Unlocked!
            </p>
            <h2 className="text-2xl font-800 text-[--cozy-bark] mb-2">
              {TIER_NAMES[newTier]}
            </h2>
            <p className="text-sm text-[--cozy-muted] mb-6 leading-relaxed">
              You earned this — one cozy moment at a time. Your space is growing 🌱
            </p>
          </motion.div>

          {/* Newly unlocked slots */}
          {newSlots.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="rounded-2xl bg-[--cozy-warm] border border-[--cozy-amber]/25
                px-4 py-3 mb-6 space-y-1.5"
            >
              <p className="text-[10px] font-700 uppercase tracking-wider text-[--cozy-muted] mb-2">
                New nooks available
              </p>
              {newSlots.map((slot) => (
                <div key={slot.id} className="flex items-center gap-2 text-sm font-600 text-[--cozy-bark]">
                  <span className="text-base">{slot.icon}</span>
                  <span>{slot.label}</span>
                  <Sparkles size={12} className="text-[--cozy-gold] ml-auto" />
                </div>
              ))}
            </motion.div>
          )}

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            whileTap={{ scale: 0.96 }}
            onClick={onDismiss}
            className="w-full py-3.5 rounded-2xl font-800 text-sm text-white
              bg-gradient-to-r from-[--cozy-rust] to-[--cozy-amber]
              shadow-lg hover:opacity-90 transition-opacity"
          >
            Start Decorating ✨
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, SunMoon, Sparkles, ChevronRight, Users, Check } from 'lucide-react';
import { useCozyStore } from '@/store/useCozyStore';
import { saveUserFocusNookAction } from '@/app/actions/onboardingActions';
import { OnboardingSandbox } from '@/components/OnboardingSandbox';

// ---------------------------------------------------------------------------
// Single-corner nook choices — low-pressure, calming spaces
// ---------------------------------------------------------------------------

export const CORNER_NOOKS = [
  { id: 'desk', emoji: '💻', title: 'Desk Nook', subtitle: 'A calm, clear surface' },
  { id: 'bedside', emoji: '🕯️', title: 'Bedside Table', subtitle: 'A quiet evening anchor' },
  { id: 'reading_chair', emoji: '📚', title: 'Reading Chair', subtitle: 'Soft chair & books' },
  { id: 'plant_shelf', emoji: '🪴', title: 'Plant Shelf', subtitle: 'Greenery & sunlight' },
  { id: 'tea_station', emoji: '🍵', title: 'Tea Station', subtitle: 'Favorite mug & kettle' },
];

// ---------------------------------------------------------------------------
// Step definitions — framed around low-pressure single corner tidying
// ---------------------------------------------------------------------------

const ONBOARDING_STEPS = [
  {
    id: 'corner',
    emoji: '🪴',
    title: 'Your Cozy Corner',
    heading: 'Start with one small space',
    desc: 'No whole-room overhauls or tidy guilt. Just choose one comforting nook that feels good to you right now. Everything else can wait.',
    cta: 'Pick My Corner →',
    accent: 'from-amber-600 to-amber-500',
    dotColor: 'bg-amber-600 dark:bg-amber-400',
    Icon: Home,
  },
  {
    id: 'habits',
    emoji: '📸',
    title: 'Day & Night Cadence',
    heading: 'Rhythms without streak pressure',
    desc: 'Capture a light photo when morning sun touches your nook, or a dark photo for peaceful night vibes. No punitive penalties if you take a break.',
    cta: 'Try First Corner →',
    accent: 'from-amber-700 to-amber-600',
    dotColor: 'bg-amber-700 dark:bg-amber-400',
    Icon: SunMoon,
  },
  {
    id: 'sandbox',
    emoji: '✨',
    title: 'First Corner Sandbox',
    heading: 'Snap, sticker & claim points',
    desc: 'Experiment with your first space! Place starter stickers and claim your first +50 cozy points right now.',
    cta: 'Next: Village →',
    accent: 'from-amber-600 to-orange-500',
    dotColor: 'bg-amber-600 dark:bg-amber-400',
    Icon: Sparkles,
  },
  {
    id: 'village',
    emoji: '🏘️',
    title: 'Warm Neighborhood',
    heading: 'Support without social noise',
    desc: 'Send warm tea, light porch lanterns, and cheer neighbors. A kind community focused on comfort over followers and algorithms.',
    cta: 'Enter Cozy ✨',
    accent: 'from-amber-500 to-amber-600',
    dotColor: 'bg-amber-500 dark:bg-amber-400',
    Icon: Users,
  },
];

// ---------------------------------------------------------------------------
// OnboardingCarousel
// ---------------------------------------------------------------------------

export function OnboardingCarousel() {
  const { hasSeenOnboarding, completeOnboarding, focusNook, setFocusNook } = useCozyStore();
  const [isMounted, setIsMounted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || hasSeenOnboarding) {
    return null;
  }

  const step = ONBOARDING_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;

  const handleSelectNook = (nookId: string) => {
    setFocusNook(nookId);
    saveUserFocusNookAction(nookId).catch(() => {});
  };

  const handleNext = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto cozy-page-bg">
      {/* Background ambient orbs */}
      <div
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-35 dark:opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #e8a87c 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full opacity-30 dark:opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #f0c060 0%, transparent 70%)' }}
      />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-10 pb-4 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="flex flex-col items-center text-center w-full max-w-md"
          >
            {/* Top Icon Badge (only for non-sandbox steps) */}
            {step.id !== 'sandbox' && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.05 }}
                className="mb-5"
              >
                <div
                  className="w-20 h-20 flex items-center justify-center rounded-3xl shadow-xl
                    border border-amber-300/40 dark:border-amber-600/30 bg-white/90 dark:bg-[#251d18] backdrop-blur-md"
                >
                  <span className="text-4xl select-none" role="img" aria-label={step.title}>
                    {step.emoji}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Overline */}
            <p className="text-xs font-800 uppercase tracking-widest text-amber-800 dark:text-amber-400 mb-1">
              {step.title}
            </p>

            {/* Heading */}
            <h1 className="text-2xl sm:text-3xl font-900 text-stone-900 dark:text-amber-50 mb-2 leading-snug">
              {step.heading}
            </h1>

            {/* Body */}
            <p className="text-xs sm:text-sm font-500 text-stone-700 dark:text-amber-200/85 leading-relaxed max-w-[340px] mb-5">
              {step.desc}
            </p>

            {/* STEP 1: Interactive Single-Corner Nook Picker */}
            {step.id === 'corner' && (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 my-2 text-left">
                {CORNER_NOOKS.map((nook) => {
                  const isSelected = (focusNook || 'desk') === nook.id;
                  return (
                    <button
                      key={nook.id}
                      type="button"
                      onClick={() => handleSelectNook(nook.id)}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-[#2c221b] border-amber-500 shadow-md ring-2 ring-amber-500/20'
                          : 'bg-white/60 dark:bg-stone-850/60 border-amber-200/40 dark:border-stone-700 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{nook.emoji}</span>
                        <div>
                          <p className="text-xs font-800 text-stone-900 dark:text-amber-50">
                            {nook.title}
                          </p>
                          <p className="text-[11px] font-500 text-stone-600 dark:text-amber-200/70">
                            {nook.subtitle}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* STEP 3: Interactive Sandbox Live Experience */}
            {step.id === 'sandbox' && (
              <div className="w-full my-1">
                <OnboardingSandbox onComplete={() => setCurrentStepIndex(3)} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="px-6 pb-8 pt-2 flex flex-col items-center gap-4 w-full max-w-sm mx-auto shrink-0">
        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {ONBOARDING_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrentStepIndex(i)}
              aria-label={`Go to step ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === currentStepIndex
                  ? `w-7 h-2.5 ${step.dotColor}`
                  : 'w-2.5 h-2.5 bg-amber-300/60 dark:bg-stone-700'
              }`}
            />
          ))}
        </div>

        {/* CTA button */}
        <motion.button
          key={currentStepIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          onClick={handleNext}
          className={`w-full py-3.5 px-6 rounded-2xl font-900 text-base text-white
            bg-gradient-to-r ${step.accent}
            shadow-xl hover:opacity-95 active:scale-95 transition-all
            flex items-center justify-center gap-2 border border-amber-400/30 cursor-pointer`}
          id={`onboarding-cta-step-${currentStepIndex}`}
        >
          {isLastStep && <Sparkles size={16} className="opacity-90" />}
          <span>{step.cta}</span>
          {!isLastStep && <ChevronRight size={16} className="opacity-90" />}
        </motion.button>

        {/* Skip link */}
        {!isLastStep && (
          <button
            onClick={completeOnboarding}
            className="text-xs font-700 text-stone-600 dark:text-amber-300/80 hover:text-stone-900 dark:hover:text-amber-100 transition-colors cursor-pointer"
          >
            Skip intro
          </button>
        )}
      </div>
    </div>
  );
}


"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, SunMoon, Star, ChevronRight, Sparkles } from 'lucide-react';
import { useCozyStore } from '@/store/useCozyStore';

// ---------------------------------------------------------------------------
// Step definitions — updated for "Single Corner" habit-loop framing
// ---------------------------------------------------------------------------

const ONBOARDING_STEPS = [
  {
    id: 'corner',
    emoji: '🪴',
    title: 'Your Cozy Corner',
    heading: 'Start with one small space',
    desc: 'No pressure to do everything at once. Claim your corner — a reading chair, a desk nook, a tent — and make it yours. Everything else can wait.',
    cta: 'Sounds good →',
    accent: 'from-[--cozy-rust] to-[--cozy-amber]',
    dotColor: 'bg-[--cozy-rust]',
    Icon: Home,
  },
  {
    id: 'habits',
    emoji: '📸',
    title: 'Day & Night',
    heading: 'Build repeatable habits',
    desc: 'Snap a light photo when your space is tidy — or a dark photo for nighttime vibes. Each check-in earns tokens, and tokens unlock more of your home over time.',
    cta: 'Got it →',
    accent: 'from-[--cozy-bark] to-[--cozy-rust]',
    dotColor: 'bg-[--cozy-bark]',
    Icon: SunMoon,
  },
  {
    id: 'expand',
    emoji: '🌟',
    title: 'Positivity Only',
    heading: 'Unlock your space, your way',
    desc: 'Cheer on neighbors, earn points, place stickers. Consistency is rewarded — a second room, a garden, a whole estate — at your own pace, one cozy moment at a time.',
    cta: 'Enter Cozy ✨',
    accent: 'from-amber-400 to-[--cozy-gold]',
    dotColor: 'bg-[--cozy-gold]',
    Icon: Star,
  },
];

// ---------------------------------------------------------------------------
// Illustration tile — renders the mini-dollhouse teaser on step 3
// ---------------------------------------------------------------------------

function MiniDollhouse() {
  return (
    <div
      className="w-full max-w-[200px] mx-auto aspect-square rounded-2xl
        border-2 border-[--cozy-amber]/30 overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, #2d2420 0%, #1a1410 100%)' }}
      aria-hidden
    >
      {/* Active corner (tier 1) */}
      <div
        className="absolute rounded-xl overflow-hidden border border-white/20 shadow-lg"
        style={{ left: '8%', top: '16%', width: '40%', height: '36%' }}
      >
        <div className="w-full h-full flex items-center justify-center text-2xl"
          style={{ background: 'rgba(196,112,74,0.35)' }}>
          🛏️
        </div>
      </div>

      {/* Locked slots — gentle land plots */}
      {[
        { left: '52%', top: '16%' },
        { left: '8%',  top: '56%' },
        { left: '52%', top: '56%' },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute rounded-xl border border-white/8 flex items-center justify-center"
          style={{
            ...pos,
            width: '40%',
            height: '36%',
            background: 'rgba(255,255,255,0.04)',
            opacity: 0.35,
          }}
        >
          <span className="text-base">🌱</span>
        </div>
      ))}

      {/* Roof strip */}
      <div
        className="absolute top-0 left-0 right-0 h-8 opacity-70"
        style={{ background: 'linear-gradient(180deg, #c4704a 0%, transparent 100%)' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// OnboardingCarousel
// ---------------------------------------------------------------------------

export function OnboardingCarousel() {
  const { hasSeenOnboarding, completeOnboarding } = useCozyStore();
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

  const handleNext = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #faf7f2 0%, #f5ede0 55%, #e8d4bc 100%)' }}
    >
      {/* Background ambient orb */}
      <div
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #e8a87c 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #f0c060 0%, transparent 70%)' }}
      />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="flex flex-col items-center text-center w-full max-w-sm"
          >
            {/* Emoji / Illustration */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.05 }}
              className="mb-7"
            >
              {step.id === 'expand' ? (
                <MiniDollhouse />
              ) : (
                <div
                  className="w-24 h-24 flex items-center justify-center rounded-3xl shadow-xl
                    border border-[--cozy-amber]/20"
                  style={{ background: 'rgba(250,247,242,0.72)', backdropFilter: 'blur(16px)' }}
                >
                  <span className="text-5xl select-none" role="img" aria-label={step.title}>
                    {step.emoji}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Overline */}
            <p className="text-xs font-700 uppercase tracking-widest text-[--cozy-amber] mb-1">
              {step.title}
            </p>

            {/* Heading */}
            <h1 className="text-2xl font-800 text-[--cozy-bark] mb-3 leading-snug">
              {step.heading}
            </h1>

            {/* Body */}
            <p className="text-sm text-[--cozy-muted] leading-relaxed max-w-[280px]">
              {step.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="px-6 pb-12 pt-4 flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
        {/* Progress dots */}
        <div className="flex items-center gap-2.5">
          {ONBOARDING_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrentStepIndex(i)}
              aria-label={`Go to step ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === currentStepIndex
                  ? `w-7 h-2.5 ${step.dotColor}`
                  : 'w-2.5 h-2.5 bg-[--cozy-amber]/30'
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
          className={`w-full py-4 px-6 rounded-2xl font-800 text-base text-white
            bg-gradient-to-r ${step.accent}
            shadow-lg hover:opacity-90 active:scale-95 transition-all
            flex items-center justify-center gap-2`}
          id={`onboarding-cta-step-${currentStepIndex}`}
        >
          {isLastStep && <Sparkles size={16} className="opacity-80" />}
          {step.cta}
          {!isLastStep && <ChevronRight size={16} className="opacity-70" />}
        </motion.button>

        {/* Skip link */}
        {!isLastStep && (
          <button
            onClick={completeOnboarding}
            className="text-xs text-[--cozy-muted] hover:text-[--cozy-bark] transition-colors"
          >
            Skip intro
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, SunMoon, Star } from 'lucide-react';
import { useCozyStore } from '@/store/useCozyStore';

const ONBOARDING_STEPS = [
  {
    title: "Welcome to Cozy",
    desc: "Real life is messy. Find the motivation to constantly reset your space through therapeutic cleaning and community.",
    icon: Home,
  },
  {
    title: "Day & Night",
    desc: "Snap Light daytime or Dark nighttime photos of your space to show off the vibe.",
    icon: SunMoon,
  },
  {
    title: "Positivity Only",
    desc: "Cheer on your neighbors, earn points, and use them to buy stickers for your photos!",
    icon: Star,
  },
];

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

  const handleNext = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;
  const CurrentIcon = ONBOARDING_STEPS[currentStepIndex].icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col backdrop-blur-xl bg-white/60 dark:bg-black/60 overflow-hidden">
      <div className="flex-1 relative flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepIndex}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex flex-col items-center text-center w-full max-w-sm absolute"
          >
            <div className="w-24 h-24 mb-8 flex items-center justify-center bg-white dark:bg-zinc-800 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-700/50">
              <CurrentIcon className="w-12 h-12 text-zinc-900 dark:text-zinc-100" />
            </div>
            
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4">
              {ONBOARDING_STEPS[currentStepIndex].title}
            </h1>
            
            <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {ONBOARDING_STEPS[currentStepIndex].desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 pb-12 flex flex-col items-center gap-8">
        <div className="flex items-center gap-3">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentStepIndex
                  ? 'w-8 bg-zinc-900 dark:bg-white'
                  : 'w-2 bg-zinc-300 dark:bg-zinc-700'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full max-w-sm py-4 px-6 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-lg shadow-lg hover:scale-[1.02] active:scale-95 transition-transform"
        >
          {isLastStep ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  );
}

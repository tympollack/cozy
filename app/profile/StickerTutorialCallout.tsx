'use client';

import { useCozyStore } from '@/store/useCozyStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface StickerTutorialCalloutProps {
  tokens: number;
}

export function StickerTutorialCallout({ tokens }: StickerTutorialCalloutProps) {
  const { hasSeenStickerTutorial, completeStickerTutorial } = useCozyStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Avoid hydration mismatch — only render after mount when Zustand is ready
  if (!isMounted || hasSeenStickerTutorial) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="relative rounded-2xl px-5 py-4
          backdrop-blur-md bg-white/20 dark:bg-black/40
          border border-[--cozy-amber]/40 shadow-lg overflow-hidden"
        role="status"
        aria-live="polite"
      >
        {/* Warm ambient glow */}
        <div
          className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-30 blur-2xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #f0c060 0%, transparent 70%)' }}
        />

        <div className="flex items-start gap-3 relative z-10">
          <span className="text-2xl flex-shrink-0 mt-0.5" role="img" aria-label="Sparkles">✨</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-800 text-[--cozy-bark] mb-0.5">
              You earned {tokens} tokens! 🎉
            </p>
            <p className="text-xs text-[--cozy-muted] leading-relaxed mb-3">
              Your first upload rewarded you with tokens. Try spending them on a sticker
              to decorate your post — a great sticker costs exactly 100 tokens!
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/feed"
                onClick={completeStickerTutorial}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                  text-xs font-700 text-white
                  bg-gradient-to-r from-[--cozy-rust] to-[--cozy-amber]
                  shadow-sm hover:opacity-90 active:scale-95 transition-all"
              >
                <Sparkles size={12} />
                Browse stickers
              </Link>
              <button
                onClick={completeStickerTutorial}
                className="text-xs text-[--cozy-muted] hover:text-[--cozy-bark] transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
          <button
            onClick={completeStickerTutorial}
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
              text-[--cozy-muted] hover:bg-black/10 transition-colors"
            aria-label="Dismiss tutorial"
          >
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

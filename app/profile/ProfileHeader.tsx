'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Settings, Sparkles, Camera, Sliders, ExternalLink } from 'lucide-react';
import { useModalBackButton } from '@/hooks/useModalBackButton';

interface ProfileHeaderProps {
  postsCount: number;
  assignedCount: number;
}

export function ProfileHeader({ postsCount, assignedCount }: ProfileHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useModalBackButton({
    isOpen: isMenuOpen,
    onClose: () => setIsMenuOpen(false),
  });

  return (
    <div className="flex items-center justify-between py-1">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-900 text-stone-900 dark:text-stone-100 flex items-center gap-2 leading-tight">
          <Home className="text-amber-800 dark:text-amber-400 flex-shrink-0" size={20} />
          <span className="truncate">My Cozy Shell & Spaces</span>
        </h1>
        <p className="text-xs font-700 text-stone-600 dark:text-stone-400 mt-0.5">
          {postsCount === 0
            ? "You haven't shared any spaces yet."
            : `${postsCount} space${postsCount !== 1 ? 's' : ''} total • ${assignedCount} assigned to nooks`}
        </p>
      </div>

      {/* Spaces & Shell Options Menu */}
      <div className="relative flex-shrink-0 ml-2">
        <button
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="p-2 rounded-full bg-white dark:bg-[#281e19] text-stone-800 dark:text-amber-200 border border-amber-900/15 dark:border-amber-500/30 shadow-xs hover:bg-amber-50 dark:hover:bg-[#342821] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Spaces & Shell Options"
          aria-label="Spaces & Shell Options"
          aria-expanded={isMenuOpen}
        >
          <Settings size={16} className="text-amber-800 dark:text-amber-400" />
        </button>

        <AnimatePresence>
          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMenuOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 rounded-2xl p-2 bg-[#faf7f2] dark:bg-[#1f1713] text-stone-900 dark:text-stone-100 border border-amber-900/20 dark:border-amber-500/30 shadow-xl z-50 space-y-1 text-xs font-700"
              >
                <div className="px-2.5 py-1.5 border-b border-amber-900/10 dark:border-amber-500/20 text-[10px] uppercase font-900 tracking-wider text-amber-800 dark:text-amber-400">
                  Spaces & Shell Options
                </div>

                <Link
                  href="/camera"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-amber-100/70 dark:hover:bg-[#2d211b] transition-colors text-stone-800 dark:text-amber-100"
                >
                  <Camera size={14} className="text-amber-600 dark:text-amber-400" />
                  <span>Snap New Space</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-amber-100/70 dark:hover:bg-[#2d211b] transition-colors text-stone-800 dark:text-amber-100"
                >
                  <div className="flex items-center gap-2">
                    <Sliders size={14} className="text-amber-600 dark:text-amber-400" />
                    <span>Account & Hub Settings</span>
                  </div>
                  <ExternalLink size={11} className="opacity-50" />
                </Link>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

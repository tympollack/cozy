'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCozyStore } from '@/store/useCozyStore';
import { Star, ShoppingBag, History, ChevronDown } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { createBrowserClient } from '@/lib/supabase-browser';
import { StickerStoreDrawer } from '@/components/StickerStoreDrawer';
import { TransactionHistoryModal } from '@/components/TransactionHistoryModal';
import { motion, AnimatePresence } from 'framer-motion';

export function PointsBadge() {
  const { points, setPoints } = useCozyStore();
  const prevRef = useRef(points);
  const [bouncing, setBouncing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.schema('cozy').from('users').select('points').eq('id', user.id).single();
          if (data && data.points !== undefined) {
            setPoints(data.points);
          }
        }
      } catch (err) {
        console.error('Failed to sync points:', err);
      }
    };
    fetchPoints();
  }, [setPoints]);

  useEffect(() => {
    if (points !== prevRef.current) {
      setBouncing(true);
      prevRef.current = points;
      const t = setTimeout(() => setBouncing(false), 500);
      return () => clearTimeout(t);
    }
  }, [points]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-600/50 font-800 shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer
            ${bouncing ? 'points-bounce' : ''}`}
          aria-label={`${points} points — tap for store & ledger`}
          title="Points, Sticker Store & Ledger"
        >
          <Star
            size={13}
            className="fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400"
            aria-hidden="true"
          />
          <span className="text-xs font-900 tabular-nums">
            <AnimatedCounter value={points} />
          </span>
          <ChevronDown size={11} className={`text-amber-700/80 dark:text-amber-400/80 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl p-1.5
                bg-white dark:bg-[#201814] text-stone-900 dark:text-amber-100 border border-amber-900/15 dark:border-amber-500/30 shadow-2xl space-y-1"
            >
              <div className="px-3 py-2 border-b border-stone-200 dark:border-amber-500/20 bg-stone-50 dark:bg-[#1a1310] rounded-xl mb-1">
                <span className="text-[10px] font-800 text-stone-500 dark:text-amber-300 uppercase tracking-wider block">
                  Cozy Economy
                </span>
                <span className="text-xs font-900 text-stone-900 dark:text-amber-50 flex items-center gap-1.5 mt-0.5">
                  <Star size={13} className="fill-amber-500 text-amber-500 shrink-0" />
                  {points.toLocaleString()} Points Available
                </span>
              </div>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setIsStoreOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-stone-900 dark:text-amber-100 hover:bg-amber-100/70 dark:hover:bg-[#2e221c] transition-colors cursor-pointer text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center shrink-0 border border-amber-300/60 dark:border-amber-600/40">
                  <ShoppingBag size={14} className="text-amber-700 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <span className="font-800 block text-stone-900 dark:text-amber-100">Sticker Store</span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block">Buy decorations</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setIsHistoryOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-stone-900 dark:text-amber-100 hover:bg-amber-100/70 dark:hover:bg-[#2e221c] transition-colors cursor-pointer text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center shrink-0 border border-amber-300/60 dark:border-amber-600/40">
                  <History size={14} className="text-amber-700 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <span className="font-800 block text-stone-900 dark:text-amber-100">Transaction Ledger</span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block">View point history</span>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticker Store Drawer */}
      <StickerStoreDrawer
        isOpen={isStoreOpen}
        onClose={() => setIsStoreOpen(false)}
      />

      {/* Transaction History Modal */}
      <TransactionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </>
  );
}

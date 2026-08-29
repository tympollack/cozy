'use client';

import React, { useState, useEffect, useCallback, useTransition, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, History, Star, ArrowUpRight, ArrowDownLeft,
  Sparkles, Coffee, Heart, Camera, Coins, RefreshCw,
  ShoppingBag, CheckCircle2, ChevronRight, Trophy, Mail, Gift
} from 'lucide-react';
import { useCozyStore } from '@/store/useCozyStore';
import { getTransactionHistory, type PointTransaction } from '@/app/actions/ledgerActions';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { useModalBackButton } from '@/hooks/useModalBackButton';

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterTab = 'all' | 'earned' | 'spent';

// Config for transaction type badges & icons
const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; badgeClass: string; isCredit: boolean }
> = {
  sticker_purchase: {
    label: 'Sticker Store',
    icon: <ShoppingBag size={14} className="text-amber-700 dark:text-amber-300" />,
    badgeClass: 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-600/40 text-amber-900 dark:text-amber-300',
    isCredit: false,
  },
  cheer_reward: {
    label: 'Cheer Bonus',
    icon: <Heart size={14} className="text-rose-600 dark:text-rose-400" />,
    badgeClass: 'bg-rose-100 dark:bg-rose-950/70 border-rose-300 dark:border-rose-600/40 text-rose-900 dark:text-rose-300',
    isCredit: true,
  },
  upload_reward: {
    label: 'Space Upload',
    icon: <Camera size={14} className="text-emerald-600 dark:text-emerald-400" />,
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-600/40 text-emerald-900 dark:text-emerald-300',
    isCredit: true,
  },
  peer_support: {
    label: 'Warm Brew & Peer Cheer',
    icon: <Coffee size={14} className="text-amber-700 dark:text-amber-300" />,
    badgeClass: 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-600/40 text-amber-900 dark:text-amber-300',
    isCredit: true,
  },
  expansion_unlock: {
    label: 'Shell Expansion',
    icon: <Coins size={14} className="text-purple-600 dark:text-purple-400" />,
    badgeClass: 'bg-purple-100 dark:bg-purple-950/70 border-purple-300 dark:border-purple-600/40 text-purple-900 dark:text-purple-300',
    isCredit: false,
  },
  reup_sticker: {
    label: 'Sticker Re-Up',
    icon: <Sparkles size={14} className="text-amber-600 dark:text-amber-400" />,
    badgeClass: 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-600/40 text-amber-900 dark:text-amber-300',
    isCredit: false,
  },
  challenge_complete: {
    label: 'Daily Challenge',
    icon: <Trophy size={14} className="text-amber-600 dark:text-amber-400" />,
    badgeClass: 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-600/40 text-amber-900 dark:text-amber-300',
    isCredit: true,
  },
  welcome_bonus: {
    label: 'Welcome Gift',
    icon: <Gift size={14} className="text-amber-600 dark:text-amber-400" />,
    badgeClass: 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-600/40 text-amber-900 dark:text-amber-300',
    isCredit: true,
  },
  initial_balance: {
    label: 'Initial Balance',
    icon: <Star size={14} className="text-amber-600 dark:text-amber-400" />,
    badgeClass: 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-600/40 text-amber-900 dark:text-amber-300',
    isCredit: true,
  },
  calling_card_sent: {
    label: 'Calling Card Sent',
    icon: <Mail size={14} className="text-amber-700 dark:text-amber-300" />,
    badgeClass: 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-600/40 text-amber-900 dark:text-amber-300',
    isCredit: false,
  },
  calling_card_accepted: {
    label: 'Calling Card Accepted',
    icon: <Heart size={14} className="text-rose-600 dark:text-rose-400" />,
    badgeClass: 'bg-rose-100 dark:bg-rose-950/70 border-rose-300 dark:border-rose-600/40 text-rose-900 dark:text-rose-300',
    isCredit: true,
  },
  group_contribution: {
    label: 'Group Bank Pool',
    icon: <Coins size={14} className="text-sky-600 dark:text-sky-400" />,
    badgeClass: 'bg-sky-100 dark:bg-sky-950/70 border-sky-300 dark:border-sky-600/40 text-sky-900 dark:text-sky-300',
    isCredit: false,
  },
};

function formatTransactionDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recently';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}

export function TransactionHistoryModal({ isOpen, onClose }: TransactionHistoryModalProps) {
  const isClient = useIsClient();
  const points = useCozyStore((s) => s.points);
  const setPoints = useCozyStore((s) => s.setPoints);

  // Intercept hardware/device back button to close modal first
  useModalBackButton({ isOpen, onClose });

  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadHistory = useCallback(async (offset: number = 0, isAppend: boolean = false) => {
    try {
      if (!isAppend) setLoading(true);
      else setLoadingMore(true);

      const result = await getTransactionHistory(20, offset);
      if (result.success) {
        if (result.currentPoints !== undefined) {
          setPoints(result.currentPoints);
        }
        setTransactions((prev) => (isAppend ? [...prev, ...result.transactions] : result.transactions));
        setHasMore(result.hasMore);
      }
    } catch (err) {
      console.error('Failed to load transaction history:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [setPoints]);

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const result = await getTransactionHistory(20, 0);
        if (!ignore && result.success) {
          if (result.currentPoints !== undefined) {
            setPoints(result.currentPoints);
          }
          setTransactions(result.transactions);
          setHasMore(result.hasMore);
        }
      } catch (err) {
        console.error('Failed to load initial transaction history:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchInitial();
    return () => {
      ignore = true;
    };
  }, [isOpen, setPoints]);

  const handleRefresh = () => {
    startTransition(() => {
      loadHistory(0, false);
    });
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    loadHistory(transactions.length, true);
  };

  // Filter transactions based on current tab
  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'earned') return tx.amount > 0;
    if (filter === 'spent') return tx.amount < 0;
    return true;
  });

  const totalEarned = transactions
    .filter((tx) => tx.amount > 0)
    .reduce((acc, tx) => acc + tx.amount, 0);

  const totalSpent = transactions
    .filter((tx) => tx.amount < 0)
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Point Transaction Ledger"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="relative w-full max-w-lg max-h-[85dvh] flex flex-col rounded-[32px]
              bg-[#faf7f2] dark:bg-[#1c1613] text-stone-900 dark:text-amber-50 shadow-2xl overflow-hidden border border-amber-900/15 dark:border-amber-500/30"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-amber-900/10 dark:border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-600/40 flex items-center justify-center text-amber-700 dark:text-amber-400 shadow-xs">
                  <History size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-900 text-stone-900 dark:text-amber-50 flex items-center gap-1.5 leading-tight">
                    Transaction Ledger
                  </h2>
                  <p className="text-xs font-500 text-stone-600 dark:text-amber-200/70">
                    Immutable record of your Cozy points & economy activity
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleRefresh}
                  disabled={loading || isPending}
                  aria-label="Refresh transaction ledger"
                  className="p-2 rounded-full text-stone-600 dark:text-amber-200 hover:bg-stone-200/60 dark:hover:bg-[#342821] transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={16} className={isPending ? 'animate-spin' : ''} />
                </button>

                <button
                  onClick={onClose}
                  aria-label="Close transaction ledger"
                  className="p-2 rounded-full text-stone-600 dark:text-amber-200 hover:bg-stone-200/60 dark:hover:bg-[#342821] transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Odometer Balance Card */}
            <div className="px-6 pt-4 pb-2">
              <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-50 to-amber-100/70 dark:from-[#251b16] dark:to-[#1f1612] border border-amber-200/80 dark:border-amber-600/30 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-800 uppercase tracking-wider text-amber-900/75 dark:text-amber-300/80 block">
                      Current Cozy Balance
                    </span>
                    <div className="text-2xl sm:text-3xl font-900 text-amber-950 dark:text-amber-100 flex items-center gap-2 mt-0.5">
                      <Star className="fill-amber-500 text-amber-500 shrink-0 w-6 h-6" />
                      <span className="tabular-nums tracking-tight">
                        <AnimatedCounter value={points} />
                      </span>
                      <span className="text-sm font-800 text-amber-700 dark:text-amber-400">pts</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 text-right">
                    <div className="flex items-center gap-1 text-xs font-800 text-emerald-700 dark:text-emerald-400">
                      <ArrowDownLeft size={13} />
                      <span>+{totalEarned.toLocaleString()} earned</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-800 text-amber-800 dark:text-amber-400/90">
                      <ArrowUpRight size={13} />
                      <span>-{totalSpent.toLocaleString()} spent</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 px-6 py-2 border-b border-amber-900/10 dark:border-amber-500/20">
              <button
                onClick={() => setFilter('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-800 transition-all cursor-pointer ${
                  filter === 'all'
                    ? 'bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 shadow-xs'
                    : 'bg-stone-100 dark:bg-[#281e19] text-stone-700 dark:text-amber-200/80 hover:bg-amber-50 dark:hover:bg-[#342821]'
                }`}
              >
                All Activity ({transactions.length})
              </button>

              <button
                onClick={() => setFilter('earned')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-800 transition-all cursor-pointer flex items-center gap-1 ${
                  filter === 'earned'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-[#281e19] text-stone-700 dark:text-amber-200/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                <ArrowDownLeft size={12} /> Earned (+)
              </button>

              <button
                onClick={() => setFilter('spent')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-800 transition-all cursor-pointer flex items-center gap-1 ${
                  filter === 'spent'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-[#281e19] text-stone-700 dark:text-amber-200/80 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                <ArrowUpRight size={12} /> Spent (-)
              </button>
            </div>

            {/* Itemized Transactions List */}
            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2.5">
              {loading ? (
                <div className="space-y-2.5 py-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 rounded-2xl bg-stone-200/60 dark:bg-[#281e19] animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-14 space-y-3">
                  <div className="w-14 h-14 rounded-3xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center mx-auto text-2xl border border-amber-300 dark:border-amber-600/30">
                    📜
                  </div>
                  <div>
                    <h3 className="text-sm font-800 text-stone-800 dark:text-amber-100">
                      No transactions recorded
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 max-w-xs mx-auto">
                      Cheer spaces, share cozy corners, or browse the sticker store to start building your ledger!
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {filteredTransactions.map((tx) => {
                    const isCredit = tx.amount > 0;
                    const typeMeta = TYPE_CONFIG[tx.transaction_type] ?? {
                      label: 'Points Update',
                      icon: <Sparkles size={14} className="text-amber-600" />,
                      badgeClass: 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-600/40 text-amber-900',
                      isCredit,
                    };

                    return (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-white/90 dark:bg-[#201813] border border-amber-900/10 dark:border-amber-500/20 shadow-xs hover:border-amber-500/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Type Icon */}
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border shrink-0 ${typeMeta.badgeClass}`}>
                            {typeMeta.icon}
                          </div>

                          {/* Details */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-800 text-stone-900 dark:text-amber-100 truncate">
                                {tx.description || typeMeta.label}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono font-medium text-stone-500 dark:text-amber-200/60">
                                {formatTransactionDate(tx.created_at)}
                              </span>
                              <span className="text-[9px] font-700 px-1.5 py-0.2 rounded-md bg-stone-100 dark:bg-[#281e19] text-stone-600 dark:text-amber-300/80 border border-stone-200/70 dark:border-stone-700/50">
                                {typeMeta.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amount Pill */}
                        <div className="shrink-0 ml-3">
                          <span
                            className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-900 tabular-nums border shadow-xs ${
                              isCredit
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600/40'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-600/40'
                            }`}
                          >
                            {isCredit ? '+' : ''}{tx.amount.toLocaleString()}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Load More button */}
                  {hasMore && (
                    <div className="pt-2 text-center pb-1">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="px-4 py-2 rounded-2xl text-xs font-800 bg-stone-100 dark:bg-[#281e19] text-stone-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-[#342821] border border-amber-900/15 dark:border-amber-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 mx-auto"
                      >
                        {loadingMore ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            <span>Loading more...</span>
                          </>
                        ) : (
                          <>
                            <span>View Earlier Transactions</span>
                            <ChevronRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-amber-900/10 dark:border-amber-500/20 bg-stone-50/80 dark:bg-[#1b1411] flex items-center justify-between text-[11px] text-stone-500 dark:text-amber-200/60">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Ledger secured in PostgreSQL
              </span>

              <button
                onClick={onClose}
                className="font-700 text-stone-800 dark:text-amber-200 hover:underline cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

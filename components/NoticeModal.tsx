'use client';

import React, { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bell,
  Heart,
  Mail,
  Check,
  Sparkles,
  ExternalLink,
  MessageSquareHeart,
  Clock,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import type { CozyNotice } from '@/app/actions/notificationActions';
import { acceptCallingCard, declineCallingCard } from '@/app/actions/peerActions';
import { getOptimizedImageUrl } from '@/lib/cloudflare';

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  notices: CozyNotice[];
  onDismissNotice?: (noticeId: string) => void;
  onClearAll?: () => void;
  onRefresh?: () => void;
}

function formatTimeAgo(isoString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return '';
  }
}

export function NoticeModal({
  isOpen,
  onClose,
  notices,
  onDismissNotice,
  onClearAll,
  onRefresh,
}: NoticeModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'cheers' | 'cards' | 'notes' | 'porch'>('all');
  const [isPending, startTransition] = useTransition();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeNotices = notices.filter((n) => !dismissedIds.has(n.id));

  const cheers = activeNotices.filter((n) => n.type === 'cheer');
  const callingCards = activeNotices.filter((n) => n.type === 'calling_card' || n.type === 'card_accepted');
  const supportNotes = activeNotices.filter((n) => n.type === 'support_note');
  const porchGifts = activeNotices.filter((n) => n.type === 'porch_warmth');

  const displayedNotices =
    activeTab === 'cheers'
      ? cheers
      : activeTab === 'cards'
      ? callingCards
      : activeTab === 'notes'
      ? supportNotes
      : activeTab === 'porch'
      ? porchGifts
      : activeNotices;

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    onDismissNotice?.(id);
  };

  const handleAcceptCard = (peerId: string, noticeId: string) => {
    startTransition(async () => {
      handleDismiss(noticeId);
      await acceptCallingCard(peerId);
      onRefresh?.();
    });
  };

  const handleDeclineCard = (peerId: string, noticeId: string) => {
    startTransition(async () => {
      handleDismiss(noticeId);
      await declineCallingCard(peerId);
      onRefresh?.();
    });
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="w-full max-w-lg rounded-3xl cozy-glass border border-amber-900/15 dark:border-amber-500/25 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] bg-stone-50 dark:bg-[#1a1410]"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-amber-900/10 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-900 dark:text-amber-300 shadow-inner">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-900 text-stone-900 dark:text-amber-50">Notices</h3>
                    <p className="text-xs font-500 text-stone-600 dark:text-amber-200/80">
                      Cheers, calling cards, notes & porch gifts
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 dark:text-amber-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      title="Refresh notices"
                    >
                      <RefreshCw size={15} />
                    </button>
                  )}
                  {onClearAll && activeNotices.length > 0 && (
                    <button
                      onClick={onClearAll}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-700 text-stone-600 dark:text-amber-200/80 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1"
                      title="Clear all"
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 dark:text-amber-200 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    aria-label="Close notices modal"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="grid grid-cols-5 gap-1 mt-4 p-1 rounded-2xl bg-amber-100/60 dark:bg-amber-950/40 border border-amber-900/10 dark:border-amber-500/20 text-xs font-800">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`py-1.5 rounded-xl transition-all ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-[#281e19] text-amber-950 dark:text-amber-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  All ({activeNotices.length})
                </button>
                <button
                  onClick={() => setActiveTab('cheers')}
                  className={`py-1.5 rounded-xl transition-all ${
                    activeTab === 'cheers'
                      ? 'bg-white dark:bg-[#281e19] text-amber-950 dark:text-amber-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Cheers ({cheers.length})
                </button>
                <button
                  onClick={() => setActiveTab('cards')}
                  className={`py-1.5 rounded-xl transition-all ${
                    activeTab === 'cards'
                      ? 'bg-white dark:bg-[#281e19] text-amber-950 dark:text-amber-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Cards ({callingCards.length})
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`py-1.5 rounded-xl transition-all ${
                    activeTab === 'notes'
                      ? 'bg-white dark:bg-[#281e19] text-amber-950 dark:text-amber-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Notes ({supportNotes.length})
                </button>
                <button
                  onClick={() => setActiveTab('porch')}
                  className={`py-1.5 rounded-xl transition-all ${
                    activeTab === 'porch'
                      ? 'bg-white dark:bg-[#281e19] text-amber-950 dark:text-amber-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Porch ({porchGifts.length})
                </button>
              </div>
            </div>

            {/* Notice List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
              {displayedNotices.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-2xl">
                    ✨
                  </div>
                  <p className="text-sm font-800 text-stone-900 dark:text-stone-100">All caught up!</p>
                  <p className="text-xs text-stone-600 dark:text-stone-400 max-w-xs mx-auto">
                    No new notices
                  </p>
                </div>
              ) : (
                displayedNotices.map((notice) => (
                  <motion.div
                    key={notice.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3.5 rounded-2xl bg-stone-50/90 dark:bg-[#251c17] border border-amber-900/10 dark:border-amber-500/20 shadow-xs flex items-start gap-3 transition-colors hover:bg-amber-50/80 dark:hover:bg-[#2c211c] relative group"
                  >
                    {/* Notice Icon / Badge */}
                    <div className="flex-shrink-0 mt-0.5">
                      {notice.type === 'cheer' ? (
                        <div className="w-9 h-9 rounded-2xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xs">
                          <Heart size={18} className="fill-rose-500" />
                        </div>
                      ) : notice.type === 'calling_card' ? (
                        <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-600/50 flex items-center justify-center text-amber-800 dark:text-amber-300 shadow-xs">
                          <Mail size={18} />
                        </div>
                      ) : notice.type === 'support_note' ? (
                        <div className="w-9 h-9 rounded-2xl bg-orange-100 dark:bg-orange-950/70 border border-orange-300 dark:border-orange-600/50 flex items-center justify-center text-orange-800 dark:text-orange-300 shadow-xs">
                          <MessageSquareHeart size={18} />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-600/50 flex items-center justify-center text-lg shadow-xs">
                          {notice.itemType === 'tea'
                            ? '☕'
                            : notice.itemType === 'blanket'
                            ? '🧧'
                            : notice.itemType === 'crystal'
                            ? '🔮'
                            : '💖'}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-800 text-stone-900 dark:text-stone-100 truncate">
                          {notice.title}
                        </h4>
                        <span className="text-[10px] font-600 text-stone-500 dark:text-stone-400 flex-shrink-0 flex items-center gap-0.5">
                          <Clock size={10} />
                          {formatTimeAgo(notice.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-stone-700 dark:text-stone-300 font-500 mt-0.5 leading-relaxed line-clamp-2">
                        {notice.body}
                      </p>

                      {/* Calling card inline actions */}
                      {notice.type === 'calling_card' && notice.peerId && (
                        <div className="flex items-center gap-2 mt-2.5">
                          <button
                            onClick={() => handleAcceptCard(notice.peerId!, notice.id)}
                            disabled={isPending}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-amber-950 font-800 text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Check size={13} strokeWidth={3} />
                            Accept (+5 pts)
                          </button>
                          <button
                            onClick={() => handleDeclineCard(notice.peerId!, notice.id)}
                            disabled={isPending}
                            className="px-2.5 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-700 text-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {/* Cheer post link with thumbnail */}
                      {notice.type === 'cheer' && notice.actionUrl && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-900/10 dark:border-amber-500/15">
                          <span className="text-[10px] font-800 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            <Sparkles size={11} /> +1 Cheer Point Earned
                          </span>
                          <Link
                            href={notice.actionUrl}
                            onClick={onClose}
                            className="text-[11px] font-800 text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1"
                          >
                            View Space <ExternalLink size={11} />
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Optional Post Photo Thumbnail */}
                    {notice.postImage && (
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-stone-900 border border-amber-300/40 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getOptimizedImageUrl(notice.postImage, 100)}
                          alt="Space thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Dismiss (X) button on top right of each card */}
                    <button
                      onClick={() => handleDismiss(notice.id)}
                      className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                      title="Dismiss notice"
                      aria-label="Dismiss notice"
                    >
                      <X size={13} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

'use client';

import React, { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bell,
  Heart,
  Mail,
  Coffee,
  Sparkles,
  Home,
  Check,
  XCircle,
  Clock,
  ExternalLink,
  MessageSquareHeart,
  CheckCheck,
} from 'lucide-react';
import Link from 'next/link';
import type { CozyNotice } from '@/app/actions/notificationActions';
import { acceptCallingCard, declineCallingCard } from '@/app/actions/peerActions';
import { useCozyStore } from '@/store/useCozyStore';
import { getOptimizedImageUrl } from '@/lib/cloudflare';

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  notices: CozyNotice[];
  onMarkAllRead: () => void;
  onRefresh: () => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (isNaN(seconds) || seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NoticeModal({
  isOpen,
  onClose,
  notices: initialNotices,
  onMarkAllRead,
  onRefresh,
}: NoticeModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'cheers' | 'messages' | 'porch'>('all');
  const [notices, setNotices] = useState<CozyNotice[]>(initialNotices);
  const [isPending, startTransition] = useTransition();
  const { addPoints } = useCozyStore();

  // Sync when initialNotices updates
  React.useEffect(() => {
    setNotices(initialNotices);
  }, [initialNotices]);

  if (!isOpen) return null;

  const cheers = notices.filter((n) => n.type === 'cheer');
  const messages = notices.filter(
    (n) => n.type === 'calling_card' || n.type === 'card_accepted' || n.type === 'support_note'
  );
  const porchGifts = notices.filter((n) => n.type === 'porch_warmth');

  const displayedNotices =
    activeTab === 'cheers'
      ? cheers
      : activeTab === 'messages'
      ? messages
      : activeTab === 'porch'
      ? porchGifts
      : notices;

  const handleAcceptCard = (peerId: string) => {
    startTransition(async () => {
      // Optimistically update notice
      setNotices((prev) =>
        prev.map((n) =>
          n.peerId === peerId
            ? { ...n, type: 'card_accepted', title: `Connected with ${n.actorName}!`, body: 'Calling card accepted (+5 pts earned).' }
            : n
        )
      );
      addPoints(5);
      const res = await acceptCallingCard(peerId);
      if (res.success) {
        onRefresh();
      }
    });
  };

  const handleDeclineCard = (peerId: string) => {
    startTransition(async () => {
      setNotices((prev) => prev.filter((n) => n.peerId !== peerId));
      await declineCallingCard(peerId);
      onRefresh();
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="w-full max-w-md bg-white dark:bg-[#1e1612] text-stone-900 dark:text-stone-100 rounded-3xl border border-amber-900/15 dark:border-amber-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-3.5 border-b border-amber-900/10 dark:border-amber-500/20 bg-amber-50/80 dark:bg-[#251b16]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-900 dark:text-amber-300">
                  <Bell className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-900 text-stone-900 dark:text-stone-100 leading-tight">
                    Cozy Notices & Activity
                  </h3>
                  <p className="text-[11px] font-600 text-stone-600 dark:text-stone-400">
                    {notices.length} recent cheer{notices.length !== 1 ? 's' : ''} & message{notices.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {notices.length > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    className="p-1.5 rounded-xl text-xs font-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck size={14} />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-400 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-4 gap-1.5 mt-3.5 p-1 rounded-2xl bg-amber-100/60 dark:bg-[#18110e] border border-amber-200 dark:border-amber-900/40">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-1.5 rounded-xl text-xs font-800 transition-all ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-[#281e19] text-amber-950 dark:text-amber-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                All ({notices.length})
              </button>
              <button
                onClick={() => setActiveTab('cheers')}
                className={`py-1.5 rounded-xl text-xs font-800 transition-all ${
                  activeTab === 'cheers'
                    ? 'bg-white dark:bg-[#281e19] text-amber-950 dark:text-amber-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Cheers ({cheers.length})
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`py-1.5 rounded-xl text-xs font-800 transition-all ${
                  activeTab === 'messages'
                    ? 'bg-white dark:bg-[#281e19] text-amber-950 dark:text-amber-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Notes ({messages.length})
              </button>
              <button
                onClick={() => setActiveTab('porch')}
                className={`py-1.5 rounded-xl text-xs font-800 transition-all ${
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
                  New cheers, calling cards, private notes, and porch gifts will appear here.
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
                  className="p-3.5 rounded-2xl bg-stone-50/90 dark:bg-[#251c17] border border-amber-900/10 dark:border-amber-500/20 shadow-xs flex items-start gap-3 transition-colors hover:bg-amber-50/80 dark:hover:bg-[#2c211c]"
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
                  <div className="flex-1 min-w-0">
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
                          onClick={() => handleAcceptCard(notice.peerId!)}
                          disabled={isPending}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-amber-950 font-800 text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Check size={13} strokeWidth={3} />
                          Accept (+5 pts)
                        </button>
                        <button
                          onClick={() => handleDeclineCard(notice.peerId!)}
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
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

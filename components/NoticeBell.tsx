'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotices, type CozyNotice } from '@/app/actions/notificationActions';
import { NoticeModal } from './NoticeModal';

const SEEN_NOTICES_STORAGE_KEY = 'cozy_seen_notices_ids';

export function NoticeBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notices, setNotices] = useState<CozyNotice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const prevCountRef = useRef(0);
  const [hasNewAlert, setHasNewAlert] = useState(false);

  // Load seen IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEEN_NOTICES_STORAGE_KEY);
      if (stored) {
        setSeenIds(new Set(JSON.parse(stored)));
      }
    } catch {
      // Ignore localStorage read error
    }
  }, []);

  const fetchNoticeData = useCallback(async () => {
    try {
      const res = await getNotices();
      if (res.success) {
        setNotices(res.notices);

        // Compute unseen notices
        let currentSeen = seenIds;
        try {
          const stored = localStorage.getItem(SEEN_NOTICES_STORAGE_KEY);
          if (stored) currentSeen = new Set(JSON.parse(stored));
        } catch {
          // ignore
        }

        const unseen = res.notices.filter((n) => !currentSeen.has(n.id));
        setUnreadCount(unseen.length);

        if (unseen.length > prevCountRef.current) {
          setHasNewAlert(true);
          setTimeout(() => setHasNewAlert(false), 2500);
        }
        prevCountRef.current = unseen.length;
      }
    } catch (err) {
      console.warn('[NoticeBell] Failed to fetch notices:', err);
    }
  }, [seenIds]);

  // Initial fetch + Periodic sync every 20 seconds + Window focus listener
  useEffect(() => {
    fetchNoticeData();
    const interval = setInterval(fetchNoticeData, 20000);

    const onFocus = () => fetchNoticeData();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchNoticeData]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleMarkAllRead = () => {
    const allIds = notices.map((n) => n.id);
    const newSet = new Set(allIds);
    setSeenIds(newSet);
    setUnreadCount(0);
    try {
      localStorage.setItem(SEEN_NOTICES_STORAGE_KEY, JSON.stringify(allIds));
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className="relative">
        <button
          id="nav-notice-bell"
          onClick={handleOpen}
          className="relative p-2 rounded-xl text-stone-800 dark:text-amber-200 hover:bg-amber-100/80 dark:hover:bg-amber-950/70 transition-colors cursor-pointer"
          aria-label={`Notices (${unreadCount} unread)`}
          title="Notices & Cheers Activity"
        >
          <Bell
            size={16}
            className={`text-amber-700 dark:text-amber-300 transition-transform ${
              hasNewAlert ? 'animate-bounce text-amber-500' : ''
            }`}
            aria-hidden="true"
          />

          {/* Unread Glowing Badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white font-900 text-[9px] flex items-center justify-center border border-white dark:border-stone-900 shadow-sm"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <NoticeModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notices={notices}
        onMarkAllRead={handleMarkAllRead}
        onRefresh={fetchNoticeData}
      />
    </>
  );
}

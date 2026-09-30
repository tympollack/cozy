'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowLeft,
  Bell,
  Sparkles,
  CloudRain,
  Radio,
  Check,
  CheckCheck,
  RefreshCw,
  Camera,
  Users,
  ExternalLink,
  Clock,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CozyNotificationItem, NotificationType } from '@/app/actions/notificationActions';
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/app/actions/notificationActions';
import { useModalBackButton } from '@/hooks/useModalBackButton';

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: CozyNotificationItem[];
  unreadCount?: number;
  onMarkRead?: (id: string) => Promise<void> | void;
  onMarkAllRead?: () => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
  isLoading?: boolean;
}

type TabType = 'all' | 'daily_task' | 'peer_checkin' | 'admin_broadcast';

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

/**
 * Ensures an action URL is a valid, relative path within Cozy.
 * Blocks external domains, protocol-relative URLs (//), backslash variations, and javascript: URIs.
 */
export function sanitizeInternalUrl(url?: unknown, fallback = '/camera'): string {
  if (typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    // Only permit safe pathname, query, and fragment characters
    if (/^\/[a-zA-Z0-9_.~%!$&'()*+,;=:@\/?#-]*$/.test(trimmed)) {
      return trimmed;
    }
  }
  return fallback;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onRefresh,
  isLoading = false,
}: NotificationDrawerProps) {
  useModalBackButton({ isOpen, onClose });
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isPending, startTransition] = useTransition();
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear pending timers and feedback banner when drawer closes
  useEffect(() => {
    if (!isOpen) {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      setFeedbackToast(null);
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  // Filter items
  const items = notifications.map((n) => ({
    ...n,
    isRead: n.isRead || localReadIds.has(n.id),
  }));

  const filteredItems = items.filter((n) => {
    if (activeTab === 'all') return true;
    return n.type === activeTab;
  });

  // Track optimistic reads not yet reflected as read in incoming notifications
  const optimisticUnreadCount = notifications.filter(
    (n) => !n.isRead && localReadIds.has(n.id)
  ).length;

  const activeUnreadCount =
    unreadCount !== undefined
      ? Math.max(0, unreadCount - optimisticUnreadCount)
      : items.filter((n) => !n.isRead).length;

  const handleMarkItemRead = (id: string) => {
    const currentUnread = activeUnreadCount;
    const willBeAllRead = currentUnread <= 1;

    const prevLocalReadIds = new Set(localReadIds);
    setLocalReadIds((prev) => new Set(prev).add(id));

    startTransition(async () => {
      try {
        let result = { success: true, error: undefined as string | undefined };
        if (onMarkRead) {
          await onMarkRead(id);
        } else {
          const res = await markNotificationAsRead(id);
          if (!res.success) {
            result = { success: false, error: res.error };
          }
        }

        if (!result.success) {
          setLocalReadIds(prevLocalReadIds);
          setFeedbackToast(result.error || 'Failed to mark notification as read');
          return;
        }

        if (willBeAllRead) {
          setFeedbackToast('All caught up ✓');
          onRefresh?.();
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          dismissTimerRef.current = setTimeout(() => {
            onClose();
          }, 300);
        }
      } catch (err: any) {
        setLocalReadIds(prevLocalReadIds);
        setFeedbackToast(err?.message || 'Failed to mark notification as read');
      }
    });
  };

  const handleMarkAllRead = () => {
    const unreadIds = items.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0 && activeUnreadCount <= 0) return;

    const prevLocalReadIds = new Set(localReadIds);
    setLocalReadIds((prev) => {
      const next = new Set(prev);
      unreadIds.forEach((id) => next.add(id));
      return next;
    });

    startTransition(async () => {
      try {
        let result = { success: true, error: undefined as string | undefined };
        if (onMarkAllRead) {
          await onMarkAllRead();
        } else {
          const res = await markAllNotificationsAsRead();
          if (!res.success) {
            result = { success: false, error: res.error };
          }
        }

        if (!result.success) {
          setLocalReadIds(prevLocalReadIds);
          setFeedbackToast(result.error || 'Failed to mark notifications as read');
          return;
        }

        setFeedbackToast('All caught up ✓');
        onRefresh?.();
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(() => {
          onClose();
        }, 300);
      } catch (err: any) {
        setLocalReadIds(prevLocalReadIds);
        setFeedbackToast(err?.message || 'Failed to mark notifications as read');
      }
    });
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            role="button"
            tabIndex={0}
            aria-label="Close notification drawer backdrop"
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter') onClose();
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
          />

          {/* Slide-over Drawer with swipe-to-dismiss support */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              drag="x"
              dragConstraints={{ left: 0 }}
              dragElastic={{ left: 0, right: 0.5 }}
              onDragEnd={(_e, info) => {
                if (info.offset.x > 80 || info.velocity.x > 300) {
                  onClose();
                }
              }}
              className="w-screen max-w-md backdrop-blur-md bg-stone-950/90 border-l border-amber-500/20 text-stone-100 flex flex-col shadow-2xl relative touch-pan-y"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-amber-500/10 flex items-center justify-between shrink-0 bg-stone-900/40 gap-2">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  {/* Mobile Back affordance */}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Back to previous screen"
                    className="sm:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl bg-stone-800/80 hover:bg-stone-700/80 border border-amber-500/20 text-stone-300 hover:text-stone-100 transition-colors cursor-pointer shrink-0"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                    <Bell size={18} />
                  </div>
                  <div className="truncate">
                    <h2 className="text-base font-bold text-amber-100 flex items-center gap-2 truncate">
                      <span>Notifications</span>
                      {activeUnreadCount > 0 && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse shrink-0">
                          {activeUnreadCount} new
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-stone-400 truncate">Cozy space updates & system alerts</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onRefresh && (
                    <button
                      type="button"
                      onClick={() => startTransition(async () => onRefresh())}
                      disabled={isPending || isLoading}
                      aria-label="Refresh notifications"
                      className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-stone-400 hover:text-amber-300 hover:bg-stone-800/60 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Refresh"
                    >
                      <RefreshCw size={15} className={isPending || isLoading ? 'animate-spin' : ''} />
                    </button>
                  )}
                  {activeUnreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={isPending}
                      aria-label="Mark all as read"
                      className="min-h-[44px] px-3 py-2 flex items-center gap-1.5 text-xs font-semibold rounded-xl bg-stone-800/80 hover:bg-amber-950/40 text-amber-300 hover:text-amber-200 border border-amber-500/20 transition-colors cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckCheck size={14} />
                      <span className="hidden sm:inline">Mark all read</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close notification drawer"
                    className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700/50 text-stone-300 hover:text-stone-100 backdrop-blur-md transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Toast Feedback Banner */}
              <AnimatePresence>
                {feedbackToast && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden shrink-0"
                  >
                    <div
                      role="status"
                      aria-live="polite"
                      className="mx-4 mt-3 p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-2 shadow-lg backdrop-blur-md"
                    >
                      <Check size={15} className="text-amber-400 stroke-[2.5]" />
                      <span>{feedbackToast}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Filter Tabs */}
              <div
                className="px-4 py-2 border-b border-amber-500/10 bg-stone-900/20 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0 touch-pan-x"
                onPointerDownCapture={(e) => e.stopPropagation()}
              >
                {(
                  [
                    { id: 'all', label: 'All', count: items.length },
                    {
                      id: 'daily_task',
                      label: 'Daily Tasks',
                      count: items.filter((n) => n.type === 'daily_task').length,
                    },
                    {
                      id: 'peer_checkin',
                      label: 'Peer Care',
                      count: items.filter((n) => n.type === 'peer_checkin').length,
                    },
                    {
                      id: 'admin_broadcast',
                      label: 'System Broadcasts',
                      count: items.filter((n) => n.type === 'admin_broadcast').length,
                    },
                  ] as const
                ).map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60 border border-transparent'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isActive ? 'bg-amber-500/30 text-amber-200' : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Notification Items List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-center justify-center text-amber-400/60">
                      {activeTab === 'daily_task' ? (
                        <Sparkles size={26} />
                      ) : activeTab === 'peer_checkin' ? (
                        <CloudRain size={26} />
                      ) : activeTab === 'admin_broadcast' ? (
                        <Radio size={26} />
                      ) : (
                        <Bell size={26} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-300">
                        {activeTab === 'daily_task'
                          ? 'No daily task nudges'
                          : activeTab === 'peer_checkin'
                          ? 'No peer check-ins'
                          : activeTab === 'admin_broadcast'
                          ? 'No system broadcasts'
                          : 'All caught up!'}
                      </p>
                      <p className="text-xs text-stone-500 mt-1 max-w-xs">
                        {activeTab === 'daily_task'
                          ? 'You are on track with your cozy space capture routines.'
                          : activeTab === 'peer_checkin'
                          ? 'Your group peers are feeling sunny and calm.'
                          : activeTab === 'admin_broadcast'
                          ? 'No ecosystem alerts currently dispatched from admin gateway.'
                          : 'Enjoy your peaceful, cozy space.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isUnread = !item.isRead;
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
                          isUnread
                            ? 'bg-stone-900/90 border-amber-500/30 shadow-md ring-1 ring-amber-500/10'
                            : 'bg-stone-900/40 border-stone-800/80 opacity-85 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Notification Icon */}
                          <div
                            className={`p-2.5 rounded-xl shrink-0 border ${
                              item.type === 'daily_task'
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                : item.type === 'peer_checkin'
                                ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            {item.type === 'daily_task' ? (
                              <Sparkles size={18} />
                            ) : item.type === 'peer_checkin' ? (
                              <CloudRain size={18} />
                            ) : (
                              <Radio size={18} />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-xs sm:text-sm font-bold text-stone-100 truncate flex items-center gap-1.5">
                                {item.title}
                                {isUnread && (
                                  <span
                                    className="inline-block w-2 h-2 rounded-full bg-[var(--cozy-gold)] animate-pulse shrink-0"
                                    title="Unread"
                                  />
                                )}
                              </h3>
                              <span className="text-[10px] text-stone-400 shrink-0 flex items-center gap-1">
                                <Clock size={10} />
                                {formatTimeAgo(item.createdAt)}
                              </span>
                            </div>

                            <p className="text-xs text-stone-300 mt-1 leading-relaxed break-words">
                              {item.message}
                            </p>

                            {/* Action Buttons */}
                            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-stone-800/60">
                              <div>
                                {item.type === 'daily_task' && (
                                  (item.metadata?.status === 'completed' || item.metadata?.is_completed === true || Boolean(item.metadata?.completed)) ? (
                                    <span
                                      data-testid={`daily-completed-${item.id}`}
                                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 select-none"
                                    >
                                      <Check size={13} className="text-emerald-400" />
                                      <span>Completed</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkItemRead(item.id);
                                        onClose();
                                        router.push(sanitizeInternalUrl(item.metadata?.action_url, '/camera'));
                                      }}
                                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                                    >
                                      <Camera size={13} />
                                      <span>Upload Room</span>
                                      <ChevronRight size={12} />
                                    </button>
                                  )
                                )}

                                {item.type === 'peer_checkin' && (
                                  <Link
                                    href={
                                      item.metadata.group_id
                                        ? `/groups/${item.metadata.group_id}`
                                        : '/groups'
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkItemRead(item.id);
                                      onClose();
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 transition-colors"
                                  >
                                    <Users size={13} />
                                    <span>Jump to Group Map</span>
                                    <ChevronRight size={12} />
                                  </Link>
                                )}

                                {item.type === 'admin_broadcast' && item.metadata?.action_url && (
                                  <Link
                                    href={sanitizeInternalUrl(item.metadata.action_url, '/')}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkItemRead(item.id);
                                      onClose();
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
                                  >
                                    <ExternalLink size={13} />
                                    <span>View Announcement</span>
                                  </Link>
                                )}
                              </div>

                              {isUnread && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkItemRead(item.id);
                                  }}
                                  disabled={isPending}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-400 hover:text-amber-300 px-2 py-1 rounded-lg hover:bg-stone-800/80 transition-colors"
                                  title="Mark as read"
                                >
                                  <Check size={12} />
                                  <span>Mark read</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-3.5 border-t border-amber-500/10 bg-stone-900/60 text-center shrink-0">
                <p className="text-[11px] text-stone-400 flex items-center justify-center gap-1.5">
                  <ShieldAlert size={12} className="text-amber-400/70" />
                  <span>Positivity & Serene Cascade Protected</span>
                </p>
              </div>
            </motion.aside>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

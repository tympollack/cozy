'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Bell } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase-browser';
import {
  getUserNotifications,
  type CozyNotificationItem,
  markNotificationAsRead,
  triggerDailyTaskNudge,
} from '@/app/actions/notificationActions';
import { NotificationDrawer } from '@/components/NotificationDrawer';

export interface NavbarNotificationBellProps {
  initialUnreadCount?: number;
  userId?: string;
}

export function NavbarNotificationBell({
  initialUnreadCount = 0,
  userId,
}: NavbarNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<CozyNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchLatestNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getUserNotifications(30);
      if (res.success) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.warn('[NavbarNotificationBell] Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger daily task check-in nudge and fetch initial notifications on mount
  useEffect(() => {
    if (userId) {
      triggerDailyTaskNudge(-new Date().getTimezoneOffset())
        .catch((err) => console.warn('[NavbarNotificationBell] Nudge check error:', err))
        .finally(() => {
          fetchLatestNotifications();
        });
    } else {
      fetchLatestNotifications();
    }
  }, [userId, fetchLatestNotifications]);

  // Setup Supabase Realtime subscription
  useEffect(() => {
    let supabase: ReturnType<typeof createBrowserClient> | null = null;
    try {
      supabase = createBrowserClient();
    } catch {
      // Supabase browser client may fail in SSR or missing env context
      return;
    }

    if (!supabase) return;

    const channelName = `cozy-notifications-${userId || 'user'}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'cozy',
          table: 'notifications',
        },
        (payload) => {
          // If record belongs to user (or if user_id filter matched)
          if (payload.eventType === 'INSERT') {
            const newRecord = payload.new as {
              id: string;
              user_id: string;
              type: string;
              title: string;
              message: string;
              metadata?: Record<string, unknown>;
              is_read: boolean;
              created_at: string;
            };

            if (!userId || newRecord.user_id === userId) {
              setNotifications((prev) => [
                {
                  id: newRecord.id,
                  userId: newRecord.user_id,
                  type: newRecord.type as any,
                  title: newRecord.title,
                  message: newRecord.message,
                  metadata: newRecord.metadata || {},
                  isRead: Boolean(newRecord.is_read),
                  createdAt: newRecord.created_at,
                },
                ...prev.filter((p) => p.id !== newRecord.id),
              ]);
              if (!newRecord.is_read) {
                setUnreadCount((c) => c + 1);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as { id: string; is_read: boolean };
            setNotifications((prev) =>
              prev.map((item) =>
                item.id === updated.id ? { ...item, isRead: updated.is_read } : item
              )
            );
            // Refresh to ensure exact count
            fetchLatestNotifications();
          } else if (payload.eventType === 'DELETE') {
            fetchLatestNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [userId, fetchLatestNotifications]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await markNotificationAsRead(id);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => markNotificationAsRead(n.id)));
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          fetchLatestNotifications();
        }}
        aria-label="Open notifications"
        title="Notifications"
        className="relative p-2 rounded-xl text-stone-800 dark:text-amber-100 hover:bg-amber-100/80 dark:hover:bg-amber-950/70 transition-colors duration-150 flex items-center justify-center"
      >
        <Bell size={17} className="text-amber-700 dark:text-amber-300" aria-hidden="true" />

        {/* Glowing --cozy-gold indicator badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--cozy-gold)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--cozy-gold)] shadow-xs ring-1 ring-[#faf7f2] dark:ring-[#16110e]" />
          </span>
        )}
      </button>

      <NotificationDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onRefresh={fetchLatestNotifications}
        isLoading={isLoading}
      />
    </>
  );
}

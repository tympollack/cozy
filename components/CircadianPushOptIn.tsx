'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Shield, Sparkles, CheckCircle2, Loader2, X } from 'lucide-react';
import {
  isPushSupported,
  getPushNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getActivePushSubscription,
} from '@/lib/webPush';
import {
  savePushSubscriptionAction,
  deletePushSubscriptionAction,
} from '@/app/actions/notificationActions';

interface CircadianPushOptInProps {
  variant?: 'card' | 'banner' | 'settings';
  onDismiss?: () => void;
}

export function CircadianPushOptIn({
  variant = 'card',
  onDismiss,
}: CircadianPushOptInProps) {
  const [mounted, setMounted] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const isSupp = isPushSupported();
    setSupported(isSupp);
    if (isSupp) {
      setPermission(getPushNotificationPermission());
      getActivePushSubscription().then((sub) => {
        setIsSubscribed(Boolean(sub));
      });
    }
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await subscribeToPush();
      if (res.success && res.subscription && res.subscription.endpoint) {
        const saveRes = await savePushSubscriptionAction(
          res.subscription,
          typeof navigator !== 'undefined' ? navigator.userAgent : undefined
        );
        if (saveRes.success) {
          setIsSubscribed(true);
          setPermission('granted');
          setStatusMessage('✨ Gentle circadian nudges enabled! You will receive at most two peaceful check-ins daily.');
        } else {
          setStatusMessage(saveRes.error || 'Failed to save subscription.');
        }
      } else {
        setStatusMessage(res.error || 'Permission was not granted.');
        setPermission(getPushNotificationPermission());
      }
    } catch (err) {
      console.error('Push opt-in error:', err);
      setStatusMessage('Unable to complete subscription.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const sub = await getActivePushSubscription();
      if (sub) {
        await deletePushSubscriptionAction(sub.endpoint);
      }
      await unsubscribeFromPush();
      setIsSubscribed(false);
      setStatusMessage('Circadian nudges have been paused on this device.');
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      setStatusMessage('Failed to unsubscribe.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !supported) {
    return null;
  }

  // Settings variant for embedded toggles
  if (variant === 'settings') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20">
        <div className="space-y-1 max-w-md">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-amber-600 dark:text-amber-400" />
            <h4 className="text-sm font-700 text-stone-900 dark:text-amber-100">
              Circadian Web Push Nudges
            </h4>
            {isSubscribed && (
              <span className="text-[10px] font-700 text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-950/40 px-2 py-0.5 rounded-full border border-green-300/40">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            Quiet morning (9 AM) and evening (8 PM) reminders for Light & Dark photos. Maximum 2 per day, zero streak pressure.
          </p>
          {statusMessage && (
            <p className="text-xs font-600 text-amber-700 dark:text-amber-300 animate-fade-in">
              {statusMessage}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSubscribed ? (
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-700 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 transition cursor-pointer flex items-center gap-1.5"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <BellOff size={14} />}
              <span>Pause Nudges</span>
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading || permission === 'denied'}
              className="px-4 py-2 rounded-xl text-xs font-700 bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
              <span>{permission === 'denied' ? 'Notifications Blocked' : 'Enable Nudges'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <div
      role="region"
      aria-label="Circadian notification preferences"
      className="w-full max-w-md mx-auto p-5 rounded-3xl bg-gradient-to-br from-amber-50/90 to-orange-50/90 dark:from-stone-900/90 dark:to-zinc-900/90 border border-amber-300/50 dark:border-amber-700/40 shadow-xl backdrop-blur-md relative overflow-hidden"
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss notification opt-in"
          className="absolute top-3.5 right-3.5 p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
          <X size={16} />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/30">
          <Sparkles size={20} />
        </div>
        <div className="space-y-1.5 flex-1 pr-4">
          <h3 className="text-sm font-800 text-stone-900 dark:text-amber-50 tracking-tight">
            Gentle Circadian Nudges
          </h3>
          <p className="text-xs text-stone-600 dark:text-amber-200/80 leading-relaxed">
            Cozy can send you two peaceful nudges a day: a sunlit invitation at <strong>9 AM</strong> and an ambient wind-down prompt at <strong>8 PM</strong>.
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-amber-200/40 dark:border-amber-800/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
          <Shield size={13} className="text-amber-600 dark:text-amber-400" />
          <span>Zero spam, zero streak guilt</span>
        </div>

        {isSubscribed ? (
          <div className="inline-flex items-center gap-1.5 text-xs font-700 text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-950/50 px-3 py-1.5 rounded-full border border-green-300/40">
            <CheckCircle2 size={14} />
            <span>Nudges Enabled</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 text-xs font-600 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition"
              >
                Maybe later
              </button>
            )}
            <button
              onClick={handleSubscribe}
              disabled={loading || permission === 'denied'}
              className="px-4 py-1.5 rounded-xl text-xs font-800 bg-amber-600 hover:bg-amber-500 text-white shadow-sm active:scale-95 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
              <span>{permission === 'denied' ? 'Blocked' : 'Enable'}</span>
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <p className="mt-2.5 text-[11px] font-600 text-amber-800 dark:text-amber-300 text-center animate-fade-in">
          {statusMessage}
        </p>
      )}
    </div>
  );
}

/**
 * Web Push API client utilities for Cozy PWA.
 * Enables privacy-first push subscription management and browser capability checks.
 */

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPushNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Converts a URL-safe base64 string to a Uint8Array suitable for PushManager applicationServerKey.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Returns current active PushSubscription if present.
 */
export async function getActivePushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.warn('[WebPush] Error getting active subscription:', err);
    return null;
  }
}

export interface SubscribePushResult {
  success: boolean;
  subscription?: PushSubscriptionJSON;
  error?: string;
}

/**
 * Prompts user for notification permission and subscribes to Web Push.
 */
export async function subscribeToPush(
  vapidPublicKey?: string
): Promise<SubscribePushResult> {
  if (!isPushSupported()) {
    return { success: false, error: 'Web Push is not supported in this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied.' };
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const pubKey =
        vapidPublicKey ||
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        // Fallback default VAPID applicationServerKey placeholder
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

      const convertedVapidKey = urlBase64ToUint8Array(pubKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource,
      });
    }

    const subJson = subscription.toJSON();
    return { success: true, subscription: subJson };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to subscribe to Web Push.';
    console.error('[WebPush] Subscription error:', message);
    return { success: false, error: message };
  }
}

/**
 * Unsubscribes the current device from Web Push.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return await subscription.unsubscribe();
    }
    return true;
  } catch (err) {
    console.error('[WebPush] Error unsubscribing:', err);
    return false;
  }
}

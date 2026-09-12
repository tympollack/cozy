/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// Cozy PWA Web Push & Notification Click Handlers
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  try {
    let payload: { title?: string; message?: string; body?: string; url?: string; action_url?: string } = {};
    try {
      payload = event.data.json();
    } catch {
      payload = { title: 'Cozy 🏡', message: event.data.text() };
    }

    const title = payload.title || 'Cozy 🏡';
    const message = payload.message || payload.body || 'A gentle check-in from Cozy.';
    const actionUrl = payload.url || payload.action_url || '/feed';

    const options: NotificationOptions = {
      body: message,
      icon: '/icons/icon-192.png',
      badge: '/icons/favicon-32x32.png',
      data: { url: actionUrl },
      tag: 'cozy-circadian-notification',
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[ServiceWorker] Error handling push event:', err);
  }
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/feed';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(targetUrl)) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

export {};

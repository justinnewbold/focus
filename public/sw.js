// TimeFlow Service Worker v2.0
const CACHE_NAME = 'timeflow-v2';
const STATIC_ASSETS = ['/', '/index.html', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.url.includes('supabase') || request.url.includes('googleapis')) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// Scheduled notifications
const scheduledNotifications = new Map();

self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, scheduledTime, data } = event.data.notification;
    const delay = new Date(scheduledTime).getTime() - Date.now();
    if (delay > 0) {
      const timeoutId = setTimeout(() => {
        self.registration.showNotification(title, {
          body, icon: '/icons/icon-192x192.png', badge: '/icons/badge-72x72.png',
          vibrate: [100, 50, 100], data, tag: `timeflow-${Date.now()}`
        });
        scheduledNotifications.delete(scheduledTime);
      }, delay);
      scheduledNotifications.set(scheduledTime, timeoutId);
    }
  }
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data || {};
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].focus();
        clientList[0].postMessage({ type: 'NOTIFICATION_ACTION', action, data });
      } else {
        clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'TimeFlow', body: 'New notification' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: '/icons/icon-192x192.png', badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100], data: data.data || {}
    })
  );
});
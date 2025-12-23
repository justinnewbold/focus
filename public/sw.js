// FOCUS PWA Service Worker v3.0
const CACHE_NAME = 'focus-v3.0.0';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('supabase.co')) return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (response.status === 200) cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === 'navigate') return caches.match('/');
        return new Response('Offline', { status: 503 });
      }))
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'FOCUS', body: 'Time to focus!' };
  if (event.data) { try { data = event.data.json(); } catch (e) { data.body = event.data.text(); } }
  
  const options = {
    body: data.body, icon: '/icons/icon-192.png', badge: '/icons/icon-96.png',
    vibrate: [200, 100, 200], tag: data.tag || 'focus-notification', renotify: true,
    actions: [{ action: 'start', title: '▶️ Start' }, { action: 'dismiss', title: '✕ Dismiss' }],
    data: data.data || {}
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'start') {
    event.waitUntil(clients.openWindow('/?action=start-focus'));
  } else if (event.action !== 'dismiss') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data.type === 'CACHE_URLS') caches.open(CACHE_NAME).then((cache) => cache.addAll(event.data.urls));
});

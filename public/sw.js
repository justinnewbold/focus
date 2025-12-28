const CACHE_NAME = 'focus-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/focus-icon-192.png',
  '/focus-icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests (let them fail for offline handling in app)
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('supabase') ||
      event.request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((response) => {
          if (response) return response;
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-blocks') {
    event.waitUntil(syncBlocks());
  }
});

async function syncBlocks() {
  // Get pending actions from IndexedDB and sync
  const db = await openDB();
  const pending = await db.getAll('pendingSync');
  
  for (const action of pending) {
    try {
      await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: JSON.stringify(action.body)
      });
      await db.delete('pendingSync', action.id);
    } catch (e) {
      console.log('Sync failed, will retry', e);
    }
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.body || 'Time to focus!',
    icon: '/focus-icon-192.png',
    badge: '/focus-icon-72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'focus-notification',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'FOCUS', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'break') {
    // Start break timer
    event.waitUntil(clients.openWindow('/?break=5'));
  } else if (event.action === 'continue') {
    // Continue to next block
    event.waitUntil(clients.openWindow('/?continue=true'));
  } else {
    // Default - open app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow('/');
      })
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-reminder') {
    event.waitUntil(showDailyReminder());
  }
});

async function showDailyReminder() {
  const hour = new Date().getHours();
  if (hour === 9) { // 9 AM reminder
    self.registration.showNotification('🌅 Good Morning!', {
      body: 'Start your day with focused work. Plan your blocks!',
      icon: '/focus-icon-192.png',
      tag: 'daily-reminder'
    });
  }
}

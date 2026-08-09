// KONTROL ERP Service Worker (Offline PWA & Background Sync Engine)
const CACHE_NAME = 'kontrol-pwa-v1.0.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  console.log('[KONTROL-SW] Service Worker Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[KONTROL-SW] Pre-caching static assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  console.log('[KONTROL-SW] Service Worker Activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[KONTROL-SW] Clearing legacy cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network First with Cache Fallback for dynamic app shell
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests or browser extension/chrome-extension requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Handle WebSocket upgrades gracefully
  if (event.request.url.includes('/api/ws')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Clone and store successful GET responses in cache
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Default SPA fallback to index.html if navigating
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Mode hors-ligne disponible - Données sauvegardées localement', {
            status: 533,
            statusText: 'Offline Cache Active'
          });
        });
      })
  );
});

// Listen for message events from main thread (e.g., sync trigger)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Lily Reader App Shell Service Worker.
// Vite replaces the two build tokens below in dist/sw.js. Book/chapter data is
// deliberately never handled here; IndexedDB remains its single source of truth.
const CACHE_PREFIX = 'lily-app-shell-';
const CACHE_NAME = `${CACHE_PREFIX}__LILY_BUILD_ID__`;
const APP_SHELL_CORE = /* __LILY_PRECACHE_MANIFEST__ */ [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/lilyhub-icon-192.png',
  '/lilyhub-icon-512.png',
  '/lilyhub-logo.png',
];

// Install: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_CORE.map((url) => new Request(url, { cache: 'reload' })));
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: Clean up older caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Voice/model and third-party caches have their own lifecycle.
          if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Strategy: Stale-While-Revalidate for app shell & static assets
self.addEventListener('fetch', (event) => {
  // Source requests must never receive an app-shell/cache fallback.
  if (new URL(event.request.url).pathname.startsWith('/api/')) return;
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Ignore browser extensions, chrome-extension, dev websockets
  if (!url.protocol.startsWith('http')) return;
  if (url.pathname.includes('/@vite') || url.pathname.includes('/@react-refresh')) return;

  // Navigation requests (HTML SPA routing): Network-first with Cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // Precached, content-hashed app assets are immutable and safe to serve cache-first.
  if (url.origin === self.location.origin && APP_SHELL_CORE.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
    return;
  }

  // Other same-origin/static external assets: stale-while-revalidate. A failed
  // font/image request is allowed to fail independently so the app shell still boots.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Handle update messages from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

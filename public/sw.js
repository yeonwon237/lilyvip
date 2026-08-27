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

// Serve a single build's HTML and assets together. A new worker waits until
// existing clients close, so unsaved notes/audio are never interrupted by reload.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method === 'GET' && (
      /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/onnxruntime-web\/1\.18\.0\/ort-wasm(?:-simd)?(?:-threaded)?\.wasm$/.test(url.href)
      || /^https:\/\/cdn\.jsdelivr\.net\/npm\/@diffusionstudio\/piper-wasm@1\.0\.0\/build\/piper_phonemize\.(?:wasm|data)$/.test(url.href))) {
    event.respondWith(caches.open('lily-voice-runtime-v1').then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type !== 'opaque') await cache.put(request, response.clone());
      return response;
    }));
    return;
  }
  if (request.method !== 'GET' || url.origin !== self.location.origin
      || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE_NAME).then(async cache =>
      (await cache.match('/index.html')) || fetch(request)));
    return;
  }
  if (APP_SHELL_CORE.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache =>
      (await cache.match(url.pathname)) || fetch(request)));
  }
  // Voice/runtime caches belong to the audio engine. Never duplicate large
  // models, remote covers, or arbitrary responses in the shell cache.
});

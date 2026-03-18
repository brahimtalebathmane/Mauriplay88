// OneSignal Web SDK v16 service worker
// Must be served from the origin root as /OneSignalSDKWorker.js
// See: https://documentation.onesignal.com/docs/onesignal-service-worker

/* eslint-disable no-undef */
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// ---- MauriPlay PWA offline caching (merged into OneSignal SW) ----

const CACHE_NAME = 'mauriplay-v6.1';
const STATIC_CACHE = 'mauriplay-static-v6.1';
const RUNTIME_CACHE = 'mauriplay-runtime-v6.1';

const staticAssets = [
  '/offline.html',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-384.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png',
];

// Install - cache only static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(staticAssets);
    }),
  );
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      }),
  );
});

// Fetch - Never intercept API/backend; cache only static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const reqUrl = request.url;

  // CRITICAL: Never intercept any API or Supabase request - pass through immediately.
  // Prevents "FetchEvent resulted in a network error response: the promise was rejected"
  if (
    reqUrl.includes('supabase') ||
    reqUrl.includes('/rest/v1') ||
    reqUrl.includes('/rpc/') ||
    reqUrl.includes('/realtime/') ||
    reqUrl.includes('/auth/v1')
  ) {
    return;
  }

  // Skip non-GET for all other origins
  if (request.method !== 'GET') {
    return;
  }

  // For navigation/document, Network First - never reject the event
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(RUNTIME_CACHE)
              .then((c) => c.put(request, clone))
              .catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline.html')),
        )
        .then((response) => response || caches.match('/offline.html'))
        .catch(() => caches.match('/offline.html'))
        .then(
          (response) =>
            response || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }),
        ),
    );
    return;
  }

  // For script/style: fetch first, fallback to cache (no timeout that could reject)
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(RUNTIME_CACHE)
              .then((c) => c.put(request, clone))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request))
        .catch(() => new Response('', { status: 503, statusText: 'Service Unavailable' })),
    );
    return;
  }

  // Static assets & images: Cache First, with .catch() to avoid unhandled rejections
  event.respondWith(
    caches
      .match(request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches
                .open(RUNTIME_CACHE)
                .then((c) => c.put(request, clone))
                .catch(() => {});
            }
            return res;
          })
          .catch((err) => {
            console.warn('[SW] Fetch failed:', request.url, err);
            return caches.match(request).then((cached) => {
              if (cached) return cached;
              return caches.match('/icon-72.png').then((fallback) => {
                if (fallback) return fallback;
                return new Response('', { status: 504, statusText: 'Gateway Timeout' });
              });
            });
          });
      })
      .catch((err) => {
        console.warn('[SW] Cache match failed:', err);
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      }),
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }),
    );
  }
});


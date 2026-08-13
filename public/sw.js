/**
 * ExamPrep Service Worker
 * Strategy: Cache-first for all static assets (app shell)
 * Network-first with cache fallback for API/dynamic content
 */

const CACHE_NAME = 'examprep-v1';
const OFFLINE_URL = '/index.html';

// All assets that make up the app shell — cached on install
const APP_SHELL = [
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ── Install: pre-cache app shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing ExamPrep v1');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(APP_SHELL);
    }).then(() => {
      // Activate immediately without waiting for old SW to die
      return self.skipWaiting();
    })
  );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating ExamPrep v1');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all open clients immediately
      return self.clients.claim();
    })
  );
});

// ── Fetch: serve from cache, fall back to network ────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin requests (except Google Fonts)
  if (request.method !== 'GET') return;

  // Google Fonts — cache on first use (stale-while-revalidate)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, 'examprep-fonts-v1'));
    return;
  }

  // Skip non-same-origin requests entirely
  if (url.origin !== location.origin) return;

  // App shell: cache-first
  event.respondWith(cacheFirst(request));
});

// ── Cache strategies ──────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Serve from cache; revalidate in background
    refreshCache(request);
    return cached;
  }
  // Not in cache — fetch and store
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Truly offline and not cached — return app shell as fallback
    const fallback = await caches.match(OFFLINE_URL);
    return fallback || new Response('ExamPrep is offline. Please try again when connected.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || (await networkFetch) || new Response('', { status: 503 });
}

function refreshCache(request) {
  // Fire-and-forget background revalidation
  fetch(request).then(response => {
    if (response.ok) {
      caches.open(CACHE_NAME).then(cache => cache.put(request, response));
    }
  }).catch(() => {});
}

// ── Background sync: queue offline study actions ─────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncStudyProgress());
  }
});

async function syncStudyProgress() {
  // When the real backend is wired up, this will flush any
  // locally-stored study sessions to the server
  console.log('[SW] Background sync: study progress');
}

// ── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); }
  catch { data = { title: 'ExamPrep', body: event.data.text() }; }

  const options = {
    body: data.body || 'Time to study! Keep your streak alive. 🔥',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'examprep-reminder',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/index.html' },
    actions: [
      { action: 'study', title: '▶ Start Quick 5' },
      { action: 'later', title: 'Later' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ExamPrep', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'later') return;

  const url = event.notification.data?.url || '/index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      // Otherwise open a new tab
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

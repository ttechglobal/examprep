// public/sw.js
// ─────────────────────────────────────────────────────────────────────────────
// ExamPrep Service Worker
//
// Strategy:
//   - App shell (JS, CSS, fonts): Cache-first
//   - API routes /api/offline/*: Network-first (these feed IndexedDB)
//   - All other API routes: Network-only (no caching — data must be fresh)
//   - Navigation (HTML pages): Network-first with offline fallback
//
// NOTE: Question data is NOT cached by the service worker.
//       It lives in IndexedDB managed by offlineSync.js.
//       The SW's job is just to keep the app *shell* working offline
//       so the JS that reads IndexedDB can actually load.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_VERSION   = 'examprep-v1'
const OFFLINE_FALLBACK = '/offline'

// App shell assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
]

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip Supabase API calls — always network
  if (url.hostname.includes('supabase')) return

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith('http')) return

  // API routes — network only (except /api/offline/*)
  if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/offline/')) {
    // Just let it pass through — no caching
    return
  }

  // Navigation requests — network first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the fresh navigation response
          const clone = response.clone()
          caches.open(CACHE_VERSION).then(cache => cache.put(request, clone))
          return response
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached ?? caches.match(OFFLINE_FALLBACK))
        )
    )
    return
  }

  // Static assets — cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response
          }
          const clone = response.clone()
          caches.open(CACHE_VERSION).then(cache => cache.put(request, clone))
          return response
        })
      })
  )
})
// public/sw.js — ExamPrep Service Worker
// Strategy:
//   • App shell (HTML nav pages): Network-first with cache fallback → offline page
//   • Static assets (JS, CSS, images): Cache-first with network update
//   • API calls: Network-only (never cached — stale exam data is harmful)

const CACHE_NAME    = 'examprep-shell-v2'
const STATIC_CACHE  = 'examprep-static-v2'
const OFFLINE_URL   = '/offline'

// Pages to pre-cache on install (app shell)
const SHELL_URLS = [
  '/student/home',
  '/student/practice',
  '/student/learn',
  '/student/leaderboard',
  '/student/progress',
  '/student/profile',
  '/offline',
]

// ── Install: pre-cache shell pages ────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Pre-cache failed:', err))
  )
})

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map(k => { console.log('[SW] Deleting old cache:', k); return caches.delete(k) })
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch: routing strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, non-same-origin, and chrome-extension requests
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return          // API: always network-only

  // Static assets (/_next/static/): cache-first, then network
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|webp|woff2|woff|ttf)$/)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) {
            // Return cache immediately AND update in background
            fetch(request).then(res => { if (res.ok) cache.put(request, res.clone()) }).catch(() => {})
            return cached
          }
          return fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone())
            return res
          })
        })
      )
    )
    return
  }

  // Navigation requests (HTML pages): network-first, fall back to cache, then offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          // Cache a fresh copy of successful navigations
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return res
        })
        .catch(() =>
          // Network failed — try cache first, then offline page
          caches.match(request)
            .then(cached => cached ?? caches.match(OFFLINE_URL))
        )
    )
    return
  }

  // Everything else: network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})

// ── Background sync: flush offline answer queue ───────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'ep-sync-answers') {
    event.waitUntil(
      // Signal all clients to run their offline sync queue
      self.clients.matchAll().then(clients =>
        clients.forEach(client => client.postMessage({ type: 'SYNC_ANSWERS' }))
      )
    )
  }
})
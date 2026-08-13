// ExamPrep Service Worker — v1
// Strategy:
//   • App shell (HTML pages, JS, CSS, fonts): Cache-first with network fallback
//   • API calls: Network-first with cache fallback (stale data is better than nothing)
//   • Images: Cache-first, long TTL
//   • /offline: Always cached as fallback for failed navigations

const CACHE_NAME   = 'examprep-v1'
const API_CACHE    = 'examprep-api-v1'
const IMAGE_CACHE  = 'examprep-img-v1'

// App shell files to pre-cache on install
const SHELL_URLS = [
  '/',
  '/offline',
  '/student/dashboard',
  '/student/practice',
  '/student/learn',
  '/student/progress',
  '/images/examprep_logo.png',
  '/images/zara_studybuddy.png',
]

// ── Install: pre-cache shell ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll fails if any request fails — use individual adds so one miss
      // doesn't break the whole install
      return Promise.allSettled(
        SHELL_URLS.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] Failed to pre-cache:', url, err)
          })
        )
      )
    }).then(() => self.skipWaiting())
  )
})

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  const VALID = [CACHE_NAME, API_CACHE, IMAGE_CACHE]
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !VALID.includes(k)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin and GET requests
  if (url.origin !== location.origin) return
  if (request.method !== 'GET') return

  // ── Images: cache-first ───────────────────────────────────────────────────
  if (url.pathname.startsWith('/images/') || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|gif)$/)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE))
    return
  }

  // ── Static assets (_next/static): cache-first, long-lived ────────────────
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHE_NAME))
    return
  }

  // ── API calls: network-first, fall back to cache ──────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // ── Navigation (HTML): network-first, fall back to cached page or /offline ─
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful navigations
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
        .catch(async () => {
          // Try the exact URL from cache
          const cached = await caches.match(request)
          if (cached) return cached
          // Try the dashboard as shell fallback
          const dashboard = await caches.match('/student/dashboard')
          if (dashboard) return dashboard
          // Last resort: offline page
          return caches.match('/offline') ?? new Response('Offline', { status: 503 })
        })
    )
    return
  }

  // ── Everything else: network-first ───────────────────────────────────────
  event.respondWith(networkFirst(request, CACHE_NAME))
})

// ── Helpers ───────────────────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return new Response('', { status: 503 })
  }
}

async function networkFirst(request, cacheName, timeoutMs = 4000) {
  const cache = await caches.open(cacheName)
  try {
    // Race the network against a timeout — on slow connections, return cache fast
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ])
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    return cached ?? new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
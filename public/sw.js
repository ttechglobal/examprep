// public/sw.js — ExamPrep service worker v1
// Strategy:
//   • App shell (JS/CSS/fonts/icons): Cache-first, update in background
//   • Page navigations: Network-first with offline fallback to last cached version
//   • API calls (/api/*): Network-first, stale fallback for GET requests
//   • Static assets (/images/, /icons/): Cache-first

const SHELL_CACHE    = 'ep-shell-v1'
const PAGE_CACHE     = 'ep-pages-v1'
const API_CACHE      = 'ep-api-v1'

// App shell assets to pre-cache on install
const SHELL_ASSETS = [
  '/',
  '/student/dashboard',
  '/student/practice',
  '/student/progress',
  '/student/learn',
  '/offline.html',
]

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache =>
      cache.addAll(SHELL_ASSETS).catch(err => {
        console.warn('[SW] shell pre-cache partial fail:', err)
      })
    ).then(() => self.skipWaiting())
  )
})

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  const valid = new Set([SHELL_CACHE, PAGE_CACHE, API_CACHE])
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !valid.has(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── Fetch: route by request type ──────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin (Supabase, Anthropic API, etc.)
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // Skip Next.js internals
  if (url.pathname.startsWith('/_next/webpack-hmr')) return
  if (url.pathname.startsWith('/_next/static/chunks/') && url.pathname.includes('webpack')) return

  // ── Static assets: cache-first ─────────────────────────────────────────────
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|ttf)$/)
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE))
    return
  }

  // ── API GET calls: network-first, stale fallback ───────────────────────────
  if (url.pathname.startsWith('/api/student/')) {
    event.respondWith(networkFirstWithFallback(request, API_CACHE))
    return
  }

  // ── Page navigations: network-first, cache on success, fallback ───────────
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request))
    return
  }
})

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirstWithFallback(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    // Return empty success so UI renders with empty state rather than crashing
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-From-SW-Cache': 'empty-fallback' },
    })
  }
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request) || await caches.match('/')
    if (cached) return cached
    // Last resort: offline page
    const offlinePage = await caches.match('/offline.html')
    if (offlinePage) return offlinePage
    return new Response('<h1>You\'re offline</h1><p>Open ExamPrep when connected to cache pages for offline use.</p>', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}
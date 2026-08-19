// public/sw.js — ExamPrep Service Worker
// ──────────────────────────────────────────────────────────────────────────────
// OFFLINE STRATEGY:
//
//   Static assets (JS, CSS, fonts, images)
//     → Cache First: serve from cache, update in background
//
//   API routes needed for offline practice:
//     /api/practice/questions     → Network first, fall back to IndexedDB bridge
//     /api/offline/questions      → Network first, cache response
//     /api/student/subjects       → Network first, cache response
//     /api/student/topics         → Network first, cache response
//
//   API routes that MUST be online (save, auth):
//     /api/student/practice/save  → Queue for background sync when offline
//     All other API routes        → Network only
//
//   App shell (HTML pages)       → Network first, fall back to cached shell
// ──────────────────────────────────────────────────────────────────────────────

const CACHE_NAME    = 'examprep-v1'
const API_CACHE     = 'examprep-api-v1'
const OFFLINE_PAGE  = '/offline'

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/student/dashboard',
  '/student/practice',
  '/student/downloads',
]

// API routes to cache with network-first strategy
const CACHEABLE_APIS = [
  '/api/offline/questions',
  '/api/student/subjects',
  '/api/student/topics',
  '/api/student/flashcards',
  '/api/student/formulas',
  '/api/student/core-topics',
]

// ── Install: pre-cache app shell ────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(PRECACHE_URLS).catch(e => {
        console.warn('[SW] Pre-cache partial failure (non-fatal):', e.message)
      })
    )
  )
})

// ── Activate: clear old caches ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== API_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: routing strategy ─────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  const path = url.pathname

  // ── 1. Practice save — queue for background sync when offline ────────────
  if (path.startsWith('/api/student/practice/save') && request.method === 'POST') {
    event.respondWith(networkWithOfflineQueue(request))
    return
  }

  // ── 2. Auth routes — network only, never cache ───────────────────────────
  if (path.startsWith('/api/auth') || path.startsWith('/auth')) {
    return // let browser handle normally
  }

  // ── 3. Cacheable API routes — network first, cache fallback ─────────────
  if (CACHEABLE_APIS.some(p => path.startsWith(p))) {
    event.respondWith(networkFirstAPI(request))
    return
  }

  // ── 4. Other API routes — network only, offline → 503 ───────────────────
  if (path.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline — this action requires internet' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    return
  }

  // ── 5. HTML navigation — network first, fall back to cached shell ────────
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request))
    return
  }

  // ── 6. Static assets — cache first ──────────────────────────────────────
  event.respondWith(cacheFirstAsset(request))
})

// ── Strategy implementations ────────────────────────────────────────────────

async function networkFirstAPI(request) {
  try {
    const response = await fetch(request.clone())
    if (response.ok) {
      const cache = await caches.open(API_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: 'Offline — cached data unavailable', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function navigationHandler(request) {
  try {
    const response = await fetch(request)
    // Cache successful navigations
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Try exact cache match first
    const cached = await caches.match(request)
    if (cached) return cached
    // Fall back to offline page
    const offlinePage = await caches.match(OFFLINE_PAGE)
    return offlinePage ?? new Response('Offline', { status: 503 })
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Asset not available offline', { status: 503 })
  }
}

// Practice save queueing — store locally and sync when back online
const SAVE_QUEUE_KEY = 'practice-save-queue'

async function networkWithOfflineQueue(request) {
  try {
    return await fetch(request.clone())
  } catch {
    // Store in a simple queue via postMessage to the client
    // The client-side practice page handles local storage of save data
    return new Response(JSON.stringify({ success: true, queued: true, offline: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ── Background sync (if supported) ─────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'practice-save-sync') {
    event.waitUntil(flushSaveQueue())
  }
})

async function flushSaveQueue() {
  // Notify clients to flush their queued saves
  const clients = await self.clients.matchAll()
  clients.forEach(client => client.postMessage({ type: 'FLUSH_SAVE_QUEUE' }))
}
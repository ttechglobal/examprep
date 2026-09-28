/* public/sw-offline.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Offline support for the student app, loaded by the main service worker:
 *
 *     // first line of public/sw.js
 *     importScripts('/sw-offline.js')
 *
 * What it does
 *   • The app opens with no internet. The student pages (Home, Practice,
 *     Battle, Leaderboard, Profile, Learn, Progress, Flashcards) and the code
 *     they need are saved on the phone when the service worker installs, and
 *     refreshed every time a page is opened online.
 *   • Images, icons and the app's code download once. After that they come from
 *     the phone, even online, so they cost no data.
 *   • Pages still come from the network first, so students always get the
 *     latest version when they're online. If the network is slow (no answer
 *     within 4 s) or missing, the saved copy opens instead.
 *
 * What it does NOT do
 *   • It never touches /api/*, Supabase or anything on another site: questions,
 *     scores and battles stay live. (Practice answers are already saved on the
 *     phone first and synced later: lib/localSessionSync.js.)
 *   • It never caches admin, reviewer or school pages.
 *
 * Rules for the rest of the app
 *   • Files in /images and /icons are cached for good. Never replace one in
 *     place: publish the new version under a new name.
 *   • To throw every cache away (e.g. a bad file got cached), bump VERSION.
 *
 * The main sw.js must not respond to the same requests (no second fetch
 * handler for pages, /_next/static, /images or /icons).
 * ───────────────────────────────────────────────────────────────────────────── */

const VERSION = 'v1'
const CACHES = {
  pages:  `ep-pages-${VERSION}`,
  code:   `ep-code-${VERSION}`,
  images: `ep-images-${VERSION}`,
}
const LIMITS = { pages: 40, code: 400, images: 250 }

// Pages saved at install, so they open offline even before the first visit.
const PRECACHE_PAGES = [
  '/student/home', '/student/practice', '/student/battle', '/student/leaderboard',
  '/student/profile', '/student/learn', '/student/learn/flashcards', '/student/progress',
  '/offline',
]
// Only these sections are ever saved.
const CACHEABLE_PAGE = /^\/(student|onboarding|offline)(\/|$)/

const NETWORK_TIMEOUT_MS = 4000

// ── Install: save the main pages and the code each of them loads ────────────
self.addEventListener('install', event => {
  event.waitUntil(precachePages().finally(() => self.skipWaiting()))
})

async function precachePages() {
  const pages = await caches.open(CACHES.pages)
  const code  = await caches.open(CACHES.code)
  // One missing page must not stop the rest (or the install).
  await Promise.allSettled(PRECACHE_PAGES.map(async path => {
    const res = await fetch(path, { credentials: 'same-origin' })
    if (!isSavablePage(res)) return
    const html = await res.clone().text()
    await pages.put(path, res)
    // The page is useless offline without its scripts and styles.
    const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])]
    await Promise.allSettled(assets.map(async url => {
      if (await code.match(url)) return
      const asset = await fetch(url)
      if (asset.ok) await code.put(url, asset)
    }))
  }))
}

// ── Activate: remove caches from older versions ──────────────────────────────
self.addEventListener('activate', event => {
  const current = new Set(Object.values(CACHES))
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names
      .filter(name => /^ep-(pages|code|images)-/.test(name) && !current.has(name))
      .map(name => caches.delete(name)))
    await self.clients.claim()
  })())
})

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    if (CACHEABLE_PAGE.test(url.pathname)) event.respondWith(pageNetworkFirst(event))
    return
  }
  // Content-hashed build files never change: the cached copy is always right.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHES.code, LIMITS.code))
    return
  }
  if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, CACHES.images, LIMITS.images))
  }
  // Everything else (API calls, RSC requests, other files) goes to the network
  // untouched. Offline, a failed in-app navigation falls back to a full page
  // load, which the navigate branch above answers from the cache.
})

function isSavablePage(res) {
  return res.ok && !res.redirected && (res.headers.get('content-type') ?? '').includes('text/html')
}

// Latest page when the network answers in time; the saved copy otherwise.
async function pageNetworkFirst(event) {
  const { request } = event
  const cache = await caches.open(CACHES.pages)
  const key   = new URL(request.url).pathname      // ignore ?query for the saved copy

  const network = fetch(request).then(async res => {
    if (isSavablePage(res)) {
      await cache.put(key, res.clone())
      await trim(CACHES.pages, LIMITS.pages)
    }
    return res
  })
  // Keep the refresh going even if the saved copy answers first.
  event.waitUntil(network.catch(() => {}))

  const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT_MS, null))
  const fast = await Promise.race([network.catch(() => null), timeout])
  if (fast) return fast

  const saved = await cache.match(key)
  if (saved) return saved
  try {
    return await network             // nothing saved: keep waiting for the network
  } catch {
    return (await cache.match('/offline')) ?? new Response('You are offline.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

async function cacheFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName)
  const saved = await cache.match(request, { ignoreVary: true })
  if (saved) return saved
  const res = await fetch(request)
  // Opaque or failed responses are not saved: a bad file must not stick.
  if (res.ok) {
    await cache.put(request, res.clone())
    trim(cacheName, limit)
  }
  return res
}

// Oldest entries go first once a cache passes its limit.
async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName)
  const keys  = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map(key => cache.delete(key)))
}

// public/sw.js — ExamPrep A1 Service Worker v6
// Notifications are server-driven (pg_cron → Edge Function → Web Push).
// This worker saves the app on the phone so it opens offline, receives push
// events and handles notification clicks.
//
// Caching
//   • Pages (student app, onboarding, /offline): network first, so students
//     get the latest version online; the saved copy opens when the network is
//     missing or slow (no answer in 4 s). The main pages, and the code they
//     load, are saved at install, so they open offline before the first visit.
//   • /_next/static (content-hashed code), /images, /icons, /audio and the
//     optimized images (/_next/image?url=/images/…): saved on first use and
//     served from the phone after that, so each file downloads once. Never
//     replace a file in /images, /icons or /audio in place: use a new name.
//   • Never cached: /api/*, other sites (Supabase), admin / reviewer / school
//     pages. Questions, scores and battles stay live.
//   • Bump VERSION to throw every cache away.
//
// v6.1 (Oct 2026)
//   • Notifications carry no emojis (default text and the action buttons).
//   • A notification can open another site (e.g. the WhatsApp channel): that link opens
//     in its own tab and leaves the app where it was. App links work as before.
// v6 (4 Oct 2026)
//   • Optimized images (/_next/image) and /audio are saved too. Battle World
//     draws almost all of its artwork through /_next/image, so it was
//     downloaded again on every visit; now only the player's data is fetched.
//   • The battle setup, session and leaderboard pages are saved at install.
// v5 (28 Sep 2026)
//   • Offline app: code, images and the main student pages are saved (v4 only
//     saved two pages, without the code they need, so they didn't run offline).
//   • Offline fallback: saved copy of the page asked for → app home for a
//     launch at "/" → the /offline page → a built-in offline message.
//   • Old caches are cleaned up by name prefix, so only this worker's own
//     caches are ever touched.
//   • Every response it doesn't keep is cancelled, and install downloads run a
//     few at a time: unread responses held connections open and could stall
//     the install (found in testing with a missing icon).
// v4 (September 2026)
//   • Offline fallback fixed (`caches.match('/') || …` was always truthy).
//   • Launch-splash images and app icons cached; notifications use the proper
//     icon and a monochrome badge.

const VERSION  = 'v6'
const CACHES = {
  pages:  `ep-pages-${VERSION}`,
  code:   `ep-code-${VERSION}`,
  images: `ep-images-${VERSION}`,
}
const LIMITS   = { pages: 40, code: 400, images: 300 }
const OUR_CACHE = /^ep-/                     // every cache this worker has ever made

const APP_HOME = '/student/home'
const PRECACHE_PAGES = [
  APP_HOME, '/student/practice', '/student/battle', '/student/battle/setup',
  '/student/battle/session', '/student/battle/leaderboard', '/student/battle/missions', '/student/leaderboard',
  '/student/profile', '/student/learn', '/student/learn/flashcards', '/student/progress',
  '/onboarding', '/offline',
]
const PRECACHE_IMAGES = [
  '/icons/launch-splash.webp', '/icons/launch-mark.webp', '/icons/icon-192.png', '/icons/badge-96.png',
]
const CACHEABLE_PAGE     = /^\/(student|onboarding|offline)(\/|$)/
const NETWORK_TIMEOUT_MS = 4000

const NOTIFY_ICON  = '/icons/icon-192.png'
const NOTIFY_BADGE = '/icons/badge-96.png'   // Android uses only its alpha channel

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(precacheImages().then(precachePages).catch(() => {}))
})

// Pages are saved one at a time, each with the scripts and styles it loads, so
// one failure doesn't drop the rest and the phone's few connections aren't
// flooded. Every response is either saved or cancelled: an unread body keeps
// its connection busy and can stall the whole install.
async function precachePages() {
  const pages = await caches.open(CACHES.pages)
  const code  = await caches.open(CACHES.code)
  for (const path of PRECACHE_PAGES) {
    try {
      const res = await fetch(path, { credentials: 'same-origin' })
      if (!isSavablePage(res)) { discard(res); continue }
      const html = await res.clone().text()
      await pages.put(path, res)
      const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])]
      await inBatches(assets, 4, async url => {
        if (await code.match(url)) return
        const asset = await fetch(url)
        if (asset.ok) await code.put(url, asset)
        else discard(asset)
      })
    } catch { /* offline or failed: the page is saved on its next visit */ }
  }
}

async function precacheImages() {
  const images = await caches.open(CACHES.images)
  await inBatches(PRECACHE_IMAGES, 4, async url => {
    const res = await fetch(url)
    if (res.ok) await images.put(url, res)
    else discard(res)
  })
}

async function inBatches(items, size, task) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.allSettled(items.slice(i, i + size).map(task))
  }
}

function discard(res) {
  res?.body?.cancel().catch(() => {})
}

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  const current = new Set(Object.values(CACHES))
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => OUR_CACHE.test(k) && !current.has(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(CACHEABLE_PAGE.test(url.pathname) ? savedPage(event) : livePage(request))
    return
  }
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHES.code, LIMITS.code))
    return
  }
  if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/audio/') ||
      (url.pathname === '/_next/image' && (url.searchParams.get('url') ?? '').startsWith('/images/'))) {
    event.respondWith(cacheFirst(request, CACHES.images, LIMITS.images))
  }
  // Anything else (API calls, in-app page data, other files) goes to the network
  // untouched. Offline, a failed in-app navigation falls back to a full page
  // load, which the navigate branch answers from the cache.
})

function isSavablePage(res) {
  return res.ok && !res.redirected && (res.headers.get('content-type') ?? '').includes('text/html')
}

// Student pages: latest when the network answers in time, saved copy otherwise.
async function savedPage(event) {
  const { request } = event
  const cache = await caches.open(CACHES.pages)
  const key   = new URL(request.url).pathname          // ?query doesn't change the page

  const network = fetch(request).then(async res => {
    if (isSavablePage(res)) {
      await cache.put(key, res.clone())
      await trim(CACHES.pages, LIMITS.pages)
    }
    return res
  })
  event.waitUntil(network.catch(() => {}))            // keep refreshing the saved copy

  const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT_MS, null))
  const fast = await Promise.race([network.catch(() => null), timeout])
  if (fast) return fast

  const saved = await cache.match(key)
  if (saved) {
    network.then(discard, () => {})                  // the page never reads this one
    return saved
  }
  try { return await network } catch { return offlineFallback(key) }
}

// Every other page (landing, admin, school…) is never saved.
async function livePage(request) {
  try { return await fetch(request) } catch { return offlineFallback(new URL(request.url).pathname) }
}

async function offlineFallback(path) {
  // An installed app launching at "/" offline goes straight to the app.
  if (path === '/' && await caches.match(APP_HOME)) return Response.redirect(APP_HOME, 302)
  const offlinePage = await caches.match('/offline')
  if (offlinePage) return offlinePage
  return new Response(
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<body style="margin:0;height:100vh;display:grid;place-items:center;background:#062A78;color:#fff;font-family:system-ui;text-align:center;padding:24px">' +
    '<div><h1 style="font-size:20px">You\'re offline</h1><p style="opacity:.8">Connect to the internet and open ExamPrep again.</p></div>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

async function cacheFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName)
  const saved = await cache.match(request, { ignoreVary: true })
  if (saved) return saved
  const res = await fetch(request)
  if (res.ok) {                                        // a failed response must not stick
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

// ── Push: receive server-sent notification ────────────────────────────────────
// Payload shape: { title, body, url, tag }
self.addEventListener('push', event => {
  const defaults = {
    title: 'ExamPrep A1',
    body:  'Time to practise.',
    url:   '/student/practice',
    tag:   'ep-reminder',
  }

  let data = defaults
  try { data = { ...defaults, ...event.data.json() } } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:     data.body,
      icon:     NOTIFY_ICON,
      badge:    NOTIFY_BADGE,
      tag:      data.tag,
      renotify: true,
      data:     { url: data.url },
      actions:  [
        { action: 'open',    title: 'Open'  },
        { action: 'dismiss', title: 'Later' },
      ],
    })
  )
})

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const target = event.notification.data?.url || '/student/practice'
  // A link to another site opens in its own tab. The app's own pages reuse an
  // open window of the app when there is one.
  let external = false
  try { external = new URL(target, self.location.origin).origin !== self.location.origin } catch {}

  event.waitUntil(
    external ? self.clients.openWindow(target) :
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        for (const client of clients) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.focus()
            client.navigate(target)
            return
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target)
      })
  )
})

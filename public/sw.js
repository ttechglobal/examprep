// public/sw.js — ExamPrep A1 Service Worker v4
// Notifications are server-driven (pg_cron → Edge Function → Web Push).
// This SW caches the app shell, receives push events and handles clicks.
//
// v4 (September 2026)
//   • Offline fallback fixed. `caches.match('/') || …` always returned the
//     cached landing page, because a Promise is always truthy. Offline launches
//     now get the page they asked for, else the app home, never the marketing page.
//   • Each shell file is cached on its own, so one failure doesn't drop them all.
//   • Caches the launch-splash images and app icons; notifications use the
//     proper icon and a monochrome badge.

const CACHE_NAME = 'ep-shell-v4'
const APP_HOME   = '/student/home'
const SHELL_URLS = [
  APP_HOME,
  '/onboarding',
  '/icons/launch-splash.webp',
  '/icons/launch-mark.webp',
  '/icons/icon-192.png',
  '/icons/badge-96.png',
]
const NOTIFY_ICON  = '/icons/icon-192.png'
const NOTIFY_BADGE = '/icons/badge-96.png'   // Android uses only its alpha channel

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(SHELL_URLS.map(url => cache.add(url)))
    )
  )
})

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch: network-first for page loads, cached fallback when offline ────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (event.request.mode !== 'navigate')   return

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request)
      if (cached) return cached
      const home = await caches.match(APP_HOME)
      if (home) return home
      return new Response(
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<body style="margin:0;height:100vh;display:grid;place-items:center;background:#062A78;color:#fff;font-family:system-ui;text-align:center;padding:24px">' +
        '<div><h1 style="font-size:20px">You\'re offline</h1><p style="opacity:.8">Connect to the internet and open ExamPrep again.</p></div>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    })
  )
})

// ── Push: receive server-sent notification ────────────────────────────────────
// Payload shape: { title, body, url, tag }
self.addEventListener('push', event => {
  const defaults = {
    title: 'ExamPrep A1',
    body:  '📚 Time to practise!',
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
        { action: 'open',    title: '📚 Practise now' },
        { action: 'dismiss', title: 'Later'            },
      ],
    })
  )
})

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const target = event.notification.data?.url || '/student/practice'

  event.waitUntil(
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

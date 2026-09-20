// public/sw.js — ExamPrep A1 Service Worker v3
// Notifications are now server-driven (pg_cron → Edge Function → Web Push).
// This SW only needs to: cache the shell, receive push events, handle clicks.

const CACHE_NAME = 'ep-shell-v3'
const SHELL_URLS = ['/', '/student/home', '/images/examprep_logo.png']

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(SHELL_URLS).catch(() => {}))
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

// ── Fetch: network-first, shell fallback for navigation ──────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (event.request.mode !== 'navigate')   return

  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match('/') || caches.match(event.request))
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
      icon:     '/images/examprep_logo.png',
      badge:    '/images/examprep_logo.png',
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
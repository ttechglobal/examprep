'use client'
// src/components/ServiceWorkerRegistration.jsx
// Registers the service worker silently on client mount.
// Drop this into the root layout so it runs on every page.
//
// Usage — in src/app/layout.js:
//   import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
//   ...
//   <body>
//     <ServiceWorkerRegistration />
//     {children}
//   </body>

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => {
          console.log('[SW] registered, scope:', reg.scope)

          // Check for updates periodically
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available — optionally notify the user
                console.log('[SW] update available')
              }
            })
          })
        })
        .catch(err => console.warn('[SW] registration failed:', err))
    }
  }, [])

  return null
}
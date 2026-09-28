'use client'
// src/components/ServiceWorkerRegistration.jsx — v2
// Registers the service worker (production only) from the root layout, so it
// runs on every page. The worker (public/sw.js) saves
// the student pages, code and images on the phone so the app opens offline.
//
// v2: asks the browser to keep that saved data (navigator.storage.persist), so
//     Android doesn't clear it when space runs low; debug logging removed.

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(() => navigator.storage?.persist?.())
      .catch(err => console.warn('[sw] registration failed:', err))
  }, [])

  return null
}

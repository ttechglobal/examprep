'use client'
// src/lib/pwaInstall.js
// ─────────────────────────────────────────────────────────────────────────────
// One shared source of truth for "can this device install the app?".
//
// Why a shared store: the browser fires `beforeinstallprompt` ONCE, often
// before React has hydrated. layout.js has a tiny inline script that catches
// it early and parks it on window.__epInstallPrompt; this store picks it up
// from there and keeps every Install button (nav, hero, footer sheet, the
// layout's timed banner) in sync.
//
// Browsers do not expose install/download progress. We can only know:
//   • the user accepted the prompt  → state.installing = true
//   • the browser finished          → `appinstalled` → state.installed = true
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react'

export const DISMISS_KEY = 'ep_install_dismissed'

const SERVER_STATE = Object.freeze({
  ready: false, canPrompt: false, installing: false, installed: false,
  standalone: false, env: 'unknown',
})

let state = SERVER_STATE
const listeners = new Set()
let started = false

function set(patch) {
  state = { ...state, ...patch }
  listeners.forEach(l => l())
}

// 'inapp'   — WhatsApp / Instagram / Facebook / TikTok etc. built-in browsers (can't install)
// 'ios'     — iPhone / iPad (install via Share → Add to Home Screen)
// 'android' — Android browser
// 'desktop' — everything else
export function detectEnv() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  if (/FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|Twitter|TikTok|musical_ly|Snapchat|; wv\)/i.test(ua)) return 'inapp'
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (iOS) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

function start() {
  if (started || typeof window === 'undefined') return
  started = true

  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  set({
    ready: true,
    standalone,
    env: detectEnv(),
    canPrompt: !!window.__epInstallPrompt,
  })

  // Caught by the early script in layout.js
  window.addEventListener('ep:installprompt', () => set({ canPrompt: true }))

  // In case the event fires after hydration (or the early script is missing)
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    window.__epInstallPrompt = e
    set({ canPrompt: true })
  })

  window.addEventListener('appinstalled', () => {
    window.__epInstallPrompt = null
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
    set({ installed: true, installing: false, canPrompt: false })
  })
}

function subscribe(listener) {
  start()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePWAInstall() {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE)
}

/**
 * Shows the browser's native install dialog.
 * Resolves to 'accepted' | 'dismissed' | 'unavailable'.
 * The saved event can only be used once, so it's cleared afterwards.
 */
export async function promptInstall() {
  const e = typeof window !== 'undefined' ? window.__epInstallPrompt : null
  if (!e) return 'unavailable'
  e.prompt()
  let outcome = 'dismissed'
  try { ({ outcome } = await e.userChoice) } catch {}
  window.__epInstallPrompt = null
  set({ canPrompt: false, installing: outcome === 'accepted' })
  if (outcome === 'accepted') {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
  }
  return outcome
}
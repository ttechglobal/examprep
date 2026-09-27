// src/hooks/usePushSubscription.js
//
// Push notifications for this device, start to finish:
//   1. the browser's own permission prompt (Notification.requestPermission),
//      which only `enable()` triggers, from a tap
//   2. a push subscription from the service worker, made with our VAPID public key
//   3. saving it to the server (/api/push/subscribe → push_subscriptions)
// The server can only reach devices that finished step 3.
//
// Usage:
//   const { status, enable, retry } = usePushSubscription()
//   status: 'checking' | 'unsupported' | 'unavailable' | 'blocked' | 'off' | 'on' | 'failed'
//     unsupported  no Notification / service worker / PushManager (e.g. iPhone
//                  Safari outside a home-screen app)
//     unavailable  the app was built without NEXT_PUBLIC_VAPID_PUBLIC_KEY
//     blocked      the user said no in the browser; only browser settings undo it
//     off          not asked yet
//     on           permission granted AND this device is saved on the server
//     failed       permission granted but saving this device failed; retry()
//
// Every screen shares one status. Whenever the app opens with permission
// already granted, the device is saved again (idempotent on the server), so a
// save that failed once, a renewed subscription or a changed VAPID key heals
// itself instead of leaving the device unreachable.
//
// v2 (Sep 2026): v1 reported only the browser permission, returned before
//   asking the browser when the VAPID key was missing (so no prompt ever
//   appeared), and never re-saved a device: a failed save left the device
//   unreachable while Settings said "on".

'use client'

import { useEffect, useCallback, useSyncExternalStore } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const DEVICE_ID_KEY    = 'ep_device_id'
const SW_READY_MS      = 10000   // the service worker registers on first load; don't wait forever

// ── Shared status ─────────────────────────────────────────────────────────────
let status = 'checking'
const listeners = new Set()
function setStatus(next) {
  if (next === status) return
  status = next
  listeners.forEach(l => l())
}
const subscribeToStatus = l => { listeners.add(l); return () => listeners.delete(l) }
const getStatus = () => status
const getServerStatus = () => 'checking'

// ── Helpers ───────────────────────────────────────────────────────────────────
function supported() {
  return typeof window !== 'undefined'
    && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_ID_KEY, id) }
    return id
  } catch {
    return crypto.randomUUID()   // storage blocked: this visit only
  }
}

function keyBytes(base64url) {
  const padded = (base64url + '='.repeat((4 - base64url.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

function sameBytes(buffer, bytes) {
  if (!buffer) return false
  const a = new Uint8Array(buffer)
  return a.length === bytes.length && a.every((v, i) => v === bytes[i])
}

function withTimeout(promise, ms, what) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${what} timed out`)), ms))])
}

// The status a device is in before any saving is attempted.
function initialStatus() {
  if (!supported()) return 'unsupported'
  if (!VAPID_PUBLIC_KEY) return 'unavailable'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission === 'default') return 'off'
  return null   // granted: save the device to find out
}

// ── Saving this device ────────────────────────────────────────────────────────
// Concurrent calls (banner + Settings) share one attempt.
let saving = null
function saveDevice() {
  saving ??= (async () => {
    try {
      const reg = await withTimeout(navigator.serviceWorker.ready, SW_READY_MS, 'service worker')
      const key = keyBytes(VAPID_PUBLIC_KEY)
      let sub = await reg.pushManager.getSubscription()
      // Made with a different VAPID key (keys were changed): pushes to it would be
      // refused. Browsers that don't report the key keep their subscription.
      const madeWith = sub?.options?.applicationServerKey
      if (sub && madeWith && !sameBytes(madeWith, key)) {
        await sub.unsubscribe()
        sub = null
      }
      sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })

      const res = await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ device_id: deviceId(), subscription: sub.toJSON() }),
      })
      if (!res.ok) throw new Error(`save failed (${res.status})`)
      setStatus('on')
    } catch (e) {
      console.warn('[push] could not save this device:', e.message)
      setStatus('failed')
    } finally {
      saving = null
    }
  })()
  return saving
}

let started = false
function start() {
  if (started) return
  started = true
  const initial = initialStatus()
  if (initial === 'unavailable') console.error('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY was not set when this app was built')
  if (initial) setStatus(initial)
  else saveDevice()                 // permission already granted: make sure the server has this device
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePushSubscription() {
  const current = useSyncExternalStore(subscribeToStatus, getStatus, getServerStatus)
  useEffect(start, [])

  /** From a tap: show the browser's prompt, then save the device. Resolves to true when on. */
  const enable = useCallback(async () => {
    if (!supported() || !VAPID_PUBLIC_KEY) return false
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setStatus(permission === 'denied' ? 'blocked' : 'off')
      return false
    }
    await saveDevice()
    return getStatus() === 'on'
  }, [])

  const retry = useCallback(async () => {
    await saveDevice()
    return getStatus() === 'on'
  }, [])

  return { status: current, enable, retry }
}
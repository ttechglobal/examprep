// src/hooks/usePushSubscription.js
//
// Handles the full client-side push subscription lifecycle:
//   1. Generates/retrieves a stable device_id from localStorage
//   2. On call to `subscribe()`: requests permission, calls pushManager.subscribe,
//      saves to DB via /api/push/subscribe
//   3. Exposes `permission` state so the UI can react
//
// Usage:
//   const { permission, subscribe } = usePushSubscription()

'use client'

import { useState, useEffect, useCallback } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const DEVICE_ID_KEY   = 'ep_device_id'
const SUBSCRIBED_KEY  = 'ep_push_subscribed'  // avoid re-subscribing on every mount

function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      // Simple UUID v4
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
      })
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return 'guest-' + Math.random().toString(36).slice(2)
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export function usePushSubscription() {
  const [permission, setPermission] = useState('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return false
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set')
      return false
    }

    // 1. Request permission
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== 'granted') return false

    // 2. Get SW registration
    let reg
    try {
      reg = await navigator.serviceWorker.ready
    } catch {
      console.warn('[push] SW not ready')
      return false
    }

    // 3. Subscribe via pushManager
    let pushSub
    try {
      pushSub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    } catch (e) {
      console.warn('[push] pushManager.subscribe failed:', e.message)
      return false
    }

    // 4. Save to DB
    const device_id = getOrCreateDeviceId()
    try {
      const res = await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ device_id, subscription: pushSub.toJSON() }),
      })
      if (!res.ok) throw new Error(await res.text())
      try { localStorage.setItem(SUBSCRIBED_KEY, '1') } catch {}
    } catch (e) {
      console.error('[push] save to DB failed:', e.message)
      return false
    }

    return true
  }, [])

  return { permission, subscribe }
}
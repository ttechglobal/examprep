'use client'
// src/components/ui/NotificationBell.jsx
// Drop-in notification bell for the student nav/header.
//
// Usage: <NotificationBell />
//
// - Shows unread count badge
// - Clicking opens a dropdown with recent notifications
// - Clicking a notification marks it read + navigates
// - "Mark all read" button
// - Calls PUT /api/student/notifications on mount to generate fresh nudges

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const TYPE_ICON = {
  streak_reminder:   '🔥',
  weak_topic:        '⚠️',
  milestone:         '🎉',
  download_reminder: '📥',
  weekly_summary:    '📊',
  school_event:      '🏫',
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NotificationBell() {
  const router = useRouter()
  const [notifs,    setNotifs]    = useState([])
  const [unread,    setUnread]    = useState(0)
  const [open,      setOpen]      = useState(false)
  const [loading,   setLoading]   = useState(false)
  const dropdownRef = useRef(null)

  const fetchNotifs = useCallback(async () => {
    try {
      const r = await fetch('/api/student/notifications')
      if (!r.ok) return
      const d = await r.json()
      setNotifs(d.notifications ?? [])
      setUnread(d.unread_count ?? 0)
    } catch {}
  }, [])

  // On mount: generate fresh nudges + fetch
  useEffect(() => {
    fetch('/api/student/notifications', { method: 'PUT' }).catch(() => {})
    fetchNotifs()
    // Re-check every 10 minutes
    const interval = setInterval(fetchNotifs, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNotifs])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  async function markRead(ids) {
    setNotifs(prev => prev.map(n => ids === 'all' || ids.includes(n.id) ? { ...n, is_read: true } : n))
    setUnread(0)
    await fetch('/api/student/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids === 'all' ? { mark_all: true } : { ids }),
    })
  }

  async function handleClick(notif) {
    if (!notif.is_read) await markRead([notif.id])
    setOpen(false)
    if (notif.action_url) router.push(notif.action_url)
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifs() }}
        style={{
          position: 'relative', width: 38, height: 38, borderRadius: 12,
          background: open ? 'var(--bg-inset)' : 'transparent',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 17, transition: 'background .15s',
        }}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 17, height: 17, borderRadius: 99,
            background: '#f87171', color: '#fff',
            fontSize: 9, fontWeight: 900, lineHeight: '17px',
            textAlign: 'center', padding: '0 4px',
            border: '2px solid var(--bg-base)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 46, right: 0, width: 320, zIndex: 500,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,.18)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)' }}>Notifications</p>
            {unread > 0 && (
              <button onClick={() => markRead('all')}
                style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 24, marginBottom: 8 }}>🔔</p>
                <p style={{ fontSize: 12, color: 'var(--text-tert)' }}>No notifications yet</p>
              </div>
            ) : notifs.map(n => (
              <button key={n.id} onClick={() => handleClick(n)}
                style={{
                  width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'flex-start',
                  gap: 10, textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: n.is_read ? 'transparent' : 'rgba(18,100,229,.04)',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background .1s',
                }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{TYPE_ICON[n.type] ?? '📢'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                    <p style={{ fontSize: 12, fontWeight: n.is_read ? 600 : 800, color: 'var(--text-prim)', lineHeight: 1.3 }}>{n.title}</p>
                    {!n.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1264E5', flexShrink: 0 }} />}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-tert)', lineHeight: 1.45, marginBottom: 3 }}>{n.body}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-tert)', opacity: 0.6 }}>{timeAgo(n.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
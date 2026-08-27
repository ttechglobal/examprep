'use client'
// src/components/student/JoinSchool.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Reusable "Connect your school" widget.
//
// Used in:
//   - src/app/student/profile/page.js   (inside AvatarCard)
//   - src/app/student/leaderboard/page.js  (JoinSchoolCard slot)
//
// Props:
//   profile    — student profile object (needs school_id, school_name)
//   onLinked   — callback({ school_id }) called after successful connection
//   compact    — if true, renders a smaller inline version (default: false)
//
// Behaviour:
//   - If already connected → shows green "School connected" badge
//   - If not connected     → shows code entry form
//   - Calls /api/admin/access-codes/redeem with the entered code
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'

const BLUE  = '#1264E5'
const GREEN = '#22c55e'
const RED   = '#f43f5e'

export default function JoinSchool({ profile, onLinked, compact = false }) {
  const [code,   setCode]   = useState('')
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState(null)
  const [done,   setDone]   = useState(false)

  const isConnected = !!(profile?.school_id)
  const schoolLabel = profile?.school_name || (isConnected ? 'School connected' : null)

  async function connect() {
    const clean = code.trim().toUpperCase()
    if (!clean) return
    setSaving(true)
    setErr(null)
    try {
      const res  = await fetch('/api/admin/access-codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Invalid code')
      setDone(true)
      onLinked?.({ school_id: data.school_id, school_name: data.school_name })
    } catch(e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Already connected ──────────────────────────────────────────────────────
  if (done || isConnected) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: compact ? '8px 12px' : '10px 14px',
        borderRadius: compact ? 10 : 12,
        background: 'rgba(34,197,94,.06)',
        border: '1px solid rgba(34,197,94,.25)',
      }}>
        <span style={{ fontSize: compact ? 16 : 18 }}>🏫</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: compact ? 11 : 12, fontWeight: 800, color: GREEN }}>
            School connected
          </div>
          {schoolLabel && (
            <div style={{
              fontSize: 11, color: 'var(--text-tert)', marginTop: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {schoolLabel}
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>✓</span>
      </div>
    )
  }

  // ── Not connected ──────────────────────────────────────────────────────────
  return (
    <div style={{
      padding: compact ? '10px 12px' : '12px 14px',
      borderRadius: compact ? 10 : 12,
      background: 'rgba(6,42,120,.03)',
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>🏫</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)' }}>
            Connect your school
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tert)' }}>
            Enter the code your teacher gave you
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setErr(null) }}
          onKeyDown={e => e.key === 'Enter' && connect()}
          placeholder="e.g. KINGS2025"
          maxLength={20}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 10,
            border: `1.5px solid ${err ? RED : 'var(--border)'}`,
            background: 'var(--bg-card)', color: 'var(--text-prim)',
            fontSize: 13, fontFamily: 'inherit', outline: 'none',
            letterSpacing: '.05em', fontWeight: 700, textTransform: 'uppercase',
          }}
        />
        <button
          onClick={connect}
          disabled={saving || !code.trim()}
          style={{
            padding: '9px 16px', borderRadius: 10, border: 'none',
            background: BLUE, color: '#fff', fontSize: 13, fontWeight: 800,
            cursor: saving || !code.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            opacity: saving || !code.trim() ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {saving ? '…' : 'Connect'}
        </button>
      </div>

      {err && (
        <p style={{ fontSize: 11, color: RED, marginTop: 6, margin: '6px 0 0' }}>
          {err}
        </p>
      )}
    </div>
  )
}
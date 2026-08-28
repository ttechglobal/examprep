'use client'
// src/components/student/SessionHistory.jsx — v2
// ─────────────────────────────────────────────────────────────────────────────
// Local-first session history.
//
// Data priority:
//   1. localStorage (ep_session_history) — instant, zero network, works for guests
//   2. Supabase (practice_sessions) — synced in background for auth users only
//
// When a session is saved (by the session page), it should call
// appendLocalSession(sessionData) from this module to keep the cache fresh.
//
// Data savings: the old version called supabase.auth.getUser() + a DB query
// on every page render. This version reads from localStorage in < 1ms.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const GREEN = '#22c55e'
const GOLD  = '#FFB800'
const RED   = '#f43f5e'
const BLUE  = '#1264E5'

const LOCAL_KEY  = 'ep_session_history'
const MAX_LOCAL  = 20   // keep last 20 sessions in localStorage
const CACHE_SECS = 300  // only re-fetch from Supabase every 5 min

function scoreColor(pct) {
  return pct >= 70 ? GREEN : pct >= 40 ? GOLD : RED
}
function modeLabel(mode) {
  return { study: 'Study', practice: 'Practice', timed: 'Speed Round', quick5: 'Quick 5', mock: 'Mock Exam' }[mode] ?? 'Practice'
}
function modeIcon(mode) {
  return { study: '📖', practice: '📝', timed: '⏱️', quick5: '⚡', mock: '📋' }[mode] ?? '📝'
}

// ── Local storage helpers (exported so session page can call them) ─────────────

export function readLocalSessions() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function appendLocalSession(session) {
  // session shape: { id?, mode, questions_count, correct_count, subject_name, created_at, duration_secs }
  try {
    const existing = readLocalSessions()
    const entry = normalise(session)
    // Deduplicate by id if present
    const filtered = session.id ? existing.filter(s => s.id !== session.id) : existing
    const updated = [entry, ...filtered].slice(0, MAX_LOCAL)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
    return updated
  } catch { return [] }
}

function writeLocalSessions(sessions) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(sessions.slice(0, MAX_LOCAL))) } catch {}
}

function normalise(s) {
  const count   = s.questions_count ?? s.count ?? 0
  const correct = s.correct_count   ?? s.correct ?? 0
  const pct     = count ? Math.round((correct / count) * 100) : 0
  const secs    = s.duration_secs ?? s.time ?? 0
  const timeStr = secs > 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : secs ? `${secs}s` : null
  return {
    id:      s.id ?? null,
    subject: s.subject_name ?? s.subject ?? 'Mixed',
    mode:    s.mode ?? 'practice',
    date:    s.created_at
      ? new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : 'Today',
    count, correct, pct, timeStr,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SessionHistory({ limit = 6 }) {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    let cancelled = false

    // Step 1: read localStorage immediately — no await, no spinner for returning users
    const local = readLocalSessions()
    if (local.length) {
      setSessions(local.slice(0, limit))
      setLoading(false)
    }

    // Step 2: check if we need to sync from Supabase
    const lastSync = Number(localStorage.getItem('ep_session_sync') ?? '0')
    const needsSync = (Date.now() - lastSync) > CACHE_SECS * 1000

    if (!needsSync) return  // local data is fresh enough

    // Step 3: background sync — only for authenticated users
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return

        const { data } = await supabase
          .from('practice_sessions')
          .select('id, mode, questions_count, correct_count, subject_name, created_at, duration_secs')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
          .limit(MAX_LOCAL)

        if (cancelled || !data) return

        const normalised = data.map(normalise)
        writeLocalSessions(normalised)
        localStorage.setItem('ep_session_sync', String(Date.now()))
        if (!cancelled) setSessions(normalised.slice(0, limit))
      } catch { /* non-fatal — local data already showing */ }
      finally { if (!cancelled) setLoading(false) }
    })()

    return () => { cancelled = true }
  }, [limit])

  if (loading && !sessions.length) {
    return (
      <div>
        <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-prim)', marginBottom: 14 }}>Recent Sessions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 100, borderRadius: 16, background: 'var(--bg-subtle)', animation: 'pulse2 1.4s infinite' }} />
          ))}
          <style>{`@keyframes pulse2 { 0%,100%{opacity:.6} 50%{opacity:.3} }`}</style>
        </div>
      </div>
    )
  }

  if (!sessions.length) {
    return (
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: '28px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 6 }}>No sessions yet</div>
        <div style={{ fontSize: 12, color: 'var(--text-tert)', lineHeight: 1.6 }}>Start a practice session and your history will appear here.</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-prim)' }}>Recent Sessions</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
        {sessions.map((s, i) => {
          const col = scoreColor(s.pct)
          return (
            <div key={s.id ?? i} style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.subject}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{modeIcon(s.mode)}</span>
                    <span>{modeLabel(s.mode)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: col }}>{s.pct}%</div>
                  <div style={{ fontSize: 9, color: 'var(--text-tert)' }}>{s.correct}/{s.count}</div>
                </div>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.pct}%`, borderRadius: 999, background: col, transition: 'width .6s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--text-tert)' }}>{s.date}</span>
                {s.timeStr && <span style={{ fontSize: 10, color: 'var(--text-tert)' }}>{s.timeStr}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
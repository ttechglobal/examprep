'use client'
// src/components/student/SessionHistory.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Practice session history card — shown on the practice page.
// Fetches from practice_sessions table.
// Can be imported anywhere; self-contained.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const GREEN  = '#22c55e'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const RED    = '#f43f5e'
const BLUE   = '#1264E5'

function scoreColor(pct) {
  return pct >= 70 ? GREEN : pct >= 40 ? GOLD : RED
}

function modeLabel(mode) {
  return { study:'Study', practice:'Practice', timed:'Speed Round', quick5:'Quick 5', mock:'Mock Exam' }[mode] ?? 'Practice'
}

function modeIcon(mode) {
  return { study:'📖', practice:'📝', timed:'⏱️', quick5:'⚡', mock:'📋' }[mode] ?? '📝'
}

export default function SessionHistory({ limit = 6 }) {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data } = await supabase
          .from('practice_sessions')
          .select('id, mode, questions_count, correct_count, subject_name, created_at, duration_secs')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit)

        setSessions((data ?? []).map(s => {
          const count   = s.questions_count ?? 0
          const correct = s.correct_count   ?? 0
          const pct     = count ? Math.round((correct / count) * 100) : 0
          const secs    = s.duration_secs ?? 0
          const time    = secs > 60 ? `${Math.floor(secs/60)}m ${secs%60}s` : secs ? `${secs}s` : null
          return {
            id:      s.id,
            subject: s.subject_name ?? 'Mixed',
            mode:    s.mode ?? 'practice',
            date:    new Date(s.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short' }),
            count, correct, pct, time,
          }
        }))
      } catch { /* fail silently */ }
      finally { setLoading(false) }
    }
    load()
  }, [limit])

  if (loading) {
    return (
      <div>
        <div style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', marginBottom:14 }}>Recent Sessions</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
          {[...Array(3)].map((_,i) => (
            <div key={i} style={{ height:100, borderRadius:16, background:'var(--bg-subtle)', animation:'pulse2 1.4s infinite' }}/>
          ))}
        </div>
      </div>
    )
  }

  if (!sessions.length) {
    return (
      <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', padding:'28px 20px', textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
        <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No sessions yet</div>
        <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.6 }}>Start a practice session and your history will appear here.</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)' }}>Recent Sessions</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
        {sessions.map(s => {
          const col = scoreColor(s.pct)
          return (
            <div key={s.id} style={{ background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', padding:'14px', display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.subject}</div>
                  <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
                    <span>{modeIcon(s.mode)}</span>
                    <span>{modeLabel(s.mode)}</span>
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:col }}>{s.pct}%</div>
                  <div style={{ fontSize:9, color:'var(--text-tert)' }}>{s.correct}/{s.count}</div>
                </div>
              </div>
              <div style={{ height:5, borderRadius:999, background:'var(--bg-subtle)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${s.pct}%`, borderRadius:999, background:col, transition:'width .6s ease' }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:10, color:'var(--text-tert)' }}>{s.date}</span>
                {s.time && <span style={{ fontSize:10, color:'var(--text-tert)' }}>{s.time}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
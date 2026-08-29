'use client'
// src/components/student/DailyChallenge.js
// ─────────────────────────────────────────────────────────────────────────────
// Teaser card shown on Home and Practice pages.
// Shows today's challenge status and links to /student/daily-challenge.
// Does NOT render the question inline — the full experience is on its own page.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import Link from 'next/link'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const RED    = '#f43f5e'

// Countdown to midnight
function useCountdown() {
  const [t, setT] = useState('')
  useEffect(() => {
    function tick() {
      const now = new Date()
      const midnight = new Date(); midnight.setHours(24, 0, 0, 0)
      const diff = midnight - now
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setT(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return t
}

export default function DailyChallenge({ profile }) {
  const countdown = useCountdown()
  const [status,  setStatus]  = useState(null)  // null | 'pending' | 'partial' | 'done_correct' | 'done_wrong'
  const [subject, setSubject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const subs = [...(profile?.subjects_waec??[]), ...(profile?.subjects_jamb??[]), ...(profile?.subjects??[])]
    const param = subs.length ? `?subjects=${encodeURIComponent([...new Set(subs)].join(','))}` : ''
    fetch(`/api/student/daily-quiz${param}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setStatus('pending'); return }
        setSubject(data.question?.subject_name ?? null)
        const s = data.state
        if (!s || s.attempts_used === 0)  setStatus('pending')
        else if (s.completed && s.correct) setStatus('done_correct')
        else if (s.completed && !s.correct) setStatus('done_wrong')
        else setStatus('partial')
      })
      .catch(() => setStatus('pending'))
      .finally(() => setLoading(false))
  }, [profile])

  // Visual config per status
  const cfg = {
    pending:      { icon:'🧩', title:'Daily Challenge', sub: subject ? `Today's ${subject} question is waiting.` : "Today's question is ready.", btn:'Start Challenge →', btnBg:NAVY, btnShadow:'0 4px 0 #03153d', accent:BLUE },
    partial:      { icon:'⚡', title:'Challenge in progress', sub:'You have one attempt left. Choose carefully.', btn:'Continue →', btnBg:ORANGE, btnShadow:`0 4px 0 #8a3800`, accent:ORANGE },
    done_correct: { icon:'🎉', title:'Challenge complete!', sub:'You nailed it. Come back tomorrow for a new one.', btn:'View results →', btnBg:`${GREEN}22`, btnShadow:'none', accent:GREEN },
    done_wrong:   { icon:'💪', title:'Good effort!', sub:'See the answer and explanation. Try again tomorrow.', btn:'View results →', btnBg:`${RED}18`, btnShadow:'none', accent:RED },
  }[status] ?? { icon:'🧩', title:'Daily Challenge', sub:'Loading…', btn:'Open →', btnBg:NAVY, btnShadow:'none', accent:BLUE }

  const isDone = status === 'done_correct' || status === 'done_wrong'

  return (
    <div>
      {/* Section header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:18, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em' }}>Daily Challenge</span>
        {!isDone && countdown ? (
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background:'var(--bg-subtle)', border:'1px solid var(--border)' }}>
            <span style={{ fontSize:10 }}>⏰</span>
            <span style={{ fontSize:10, fontWeight:800, color:'var(--text-tert)', fontVariantNumeric:'tabular-nums' }}>{countdown}</span>
          </div>
        ) : isDone ? (
          <span style={{ fontSize:11, fontWeight:800, color:status==='done_correct'?GREEN:RED, background:status==='done_correct'?`${GREEN}15`:`${RED}10`, padding:'4px 10px', borderRadius:999 }}>
            {status==='done_correct' ? '✓ Done' : '✗ Missed'}
          </span>
        ) : null}
      </div>

      {/* Card */}
      <Link href="/student/daily-challenge" style={{ textDecoration:'none' }}>
        <div style={{
          borderRadius:20,
          background: isDone
            ? 'var(--bg-card)'
            : `linear-gradient(135deg, ${NAVY} 0%, #0e3494 100%)`,
          border: isDone
            ? `1.5px solid ${cfg.accent}40`
            : '1px solid rgba(24,183,242,.2)',
          padding:'20px 22px',
          position:'relative', overflow:'hidden',
          cursor:'pointer',
          boxShadow: isDone ? 'none' : '0 8px 28px rgba(6,42,120,.25)',
          transition:'all .15s',
        }}>
          {/* Glow orb */}
          {!isDone && <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.15) 0%,transparent 70%)', pointerEvents:'none' }}/>}

          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            {/* Icon */}
            <div style={{ width:52, height:52, borderRadius:16, flexShrink:0, background: isDone ? `${cfg.accent}15` : 'rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, border: isDone ? `1px solid ${cfg.accent}30` : '1px solid rgba(255,255,255,.15)' }}>
              {loading ? '⏳' : cfg.icon}
            </div>

            {/* Text */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:16, fontWeight:900, color: isDone ? 'var(--text-prim)' : '#fff', letterSpacing:'-.02em', marginBottom:3 }}>
                {cfg.title}
              </div>
              <div style={{ fontSize:12, color: isDone ? 'var(--text-tert)' : 'rgba(255,255,255,.55)', lineHeight:1.45 }}>
                {cfg.sub}
              </div>
            </div>

            {/* CTA */}
            <div style={{ flexShrink:0 }}>
              <div style={{
                padding:'10px 16px', borderRadius:12, fontSize:12, fontWeight:800,
                background: isDone ? `${cfg.accent}18` : 'rgba(255,255,255,.14)',
                color: isDone ? cfg.accent : '#fff',
                border: isDone ? `1px solid ${cfg.accent}30` : '1px solid rgba(255,255,255,.2)',
                whiteSpace:'nowrap',
              }}>
                {cfg.btn}
              </div>
            </div>
          </div>

          {/* Partial progress bar */}
          {status === 'partial' && (
            <div style={{ marginTop:14, height:3, borderRadius:999, background:'rgba(255,255,255,.1)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:'50%', borderRadius:999, background:ORANGE }}/>
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}
'use client'
// src/components/student/DailyQuests.jsx
// Clean, simple daily quests card — no XP bars, no streak dots, no "view all".
// Just the quests: icon + label + XP reward + completion state.
// Used by: practice page (right column), home page, any future page.

import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'

// Default quests — in production these come from the DB / API
const DEFAULT_QUESTS = [
  { id:'q1', icon:'📐', label:'Solve 8 Algebra questions',    xp:20 },
  { id:'q2', icon:'🧬', label:'Biology speed round',          xp:15 },
  { id:'q3', icon:'⚗️', label:'Score 60%+ in Chemistry',     xp:25 },
  { id:'q4', icon:'📖', label:"Revise today's lesson",        xp:10 },
]

export default function DailyQuests({ quests = DEFAULT_QUESTS, onStart }) {
  const { dark } = useTheme()
  // Track done state locally — in production this syncs with DB
  const [done, setDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ep_quests_done') || '{}') } catch { return {} }
  })

  function markDone(id) {
    const next = { ...done, [id]: true }
    setDone(next)
    try { localStorage.setItem('ep_quests_done', JSON.stringify(next)) } catch {}
  }

  const completedCount = quests.filter(q => done[q.id]).length

  return (
    <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 2px 16px rgba(6,42,120,.06)', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 18px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:18 }}>🔥</span>
          <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Daily Quests</span>
        </div>
        <span style={{ fontSize:12, fontWeight:800, color:completedCount === quests.length ? GREEN : ORANGE }}>
          {completedCount} / {quests.length}
        </span>
      </div>

      {/* Quest rows */}
      <div style={{ borderTop:'1px solid var(--border)' }}>
        {quests.map((q, i) => {
          const isDone = !!done[q.id]
          return (
            <div
              key={q.id}
              onClick={() => { if (!isDone) { onStart?.(); markDone(q.id) } }}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 18px', borderBottom:i < quests.length - 1 ? '1px solid var(--border)' : 'none', cursor:isDone ? 'default' : 'pointer', transition:'background .1s' }}
              onMouseEnter={e => { if (!isDone) e.currentTarget.style.background = dark ? 'rgba(255,255,255,.03)' : 'rgba(6,42,120,.02)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {/* Check circle */}
              <div style={{ width:24, height:24, borderRadius:8, flexShrink:0, background:isDone ? GREEN : 'transparent', border:`2px solid ${isDone ? GREEN : dark ? 'rgba(255,255,255,.2)' : 'rgba(6,42,120,.18)'}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}>
                {isDone && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>

              {/* Icon + label */}
              <span style={{ fontSize:18, flexShrink:0 }}>{q.icon}</span>
              <span style={{ flex:1, fontSize:13, fontWeight:isDone ? 600 : 700, color:isDone ? 'var(--text-tert)' : 'var(--text-prim)', textDecoration:isDone ? 'line-through' : 'none', lineHeight:1.35 }}>{q.label}</span>

              {/* XP badge */}
              <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                <span style={{ fontSize:12, fontWeight:800, color:isDone ? 'var(--text-tert)' : ORANGE }}>+{q.xp} XP</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
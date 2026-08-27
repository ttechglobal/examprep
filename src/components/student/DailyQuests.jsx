'use client'
// src/components/student/DailyQuests.jsx
// Daily quests — 2 quests per day, personalised to the student's subjects.
// Quest set rotates daily (based on date seed) and is unique per user's subject list.
// Completion stored in localStorage keyed by date + user subject hash.
// No DB calls — all local. When a student creates an account, quests can sync later.

import { useState, useMemo } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const BLUE   = '#1264E5'

// Quest templates — filled in with the student's actual subjects
const QUEST_TEMPLATES = [
  { id:'a', icon:'⚡', template:'Answer 10 {subject} questions',  xp:25, mode:'custom',  count:10 },
  { id:'b', icon:'🔥', template:'Complete a {subject} Speed Round', xp:30, mode:'timed',  count:20 },
  { id:'c', icon:'📝', template:'Score 70%+ in {subject}',         xp:35, mode:'custom',  count:15 },
  { id:'d', icon:'⏱️', template:'Finish 5 {subject} questions',    xp:20, mode:'quick5',  count:5  },
  { id:'e', icon:'🎯', template:'Practice {subject} for 10 mins',  xp:25, mode:'custom',  count:20 },
  { id:'f', icon:'📖', template:'Study 8 {subject} topics',        xp:20, mode:'custom',  count:8  },
  { id:'g', icon:'🏆', template:'Beat your best in {subject}',     xp:40, mode:'custom',  count:20 },
  { id:'h', icon:'🧠', template:'Master {subject} today',          xp:30, mode:'custom',  count:15 },
]

function seededRandom(seed) {
  // Simple deterministic RNG — same seed always gives same sequence
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function generateDailyQuests(subjects) {
  if (!subjects?.length) {
    // Fallback quests if no subjects set
    return [
      { id:'fallback_a', icon:'📚', label:'Set up your subjects on your profile', xp:0, action:'profile' },
      { id:'fallback_b', icon:'⚡', label:'Complete your first practice session', xp:25, mode:'quick5' },
    ]
  }

  const dateKey = getTodayKey()
  // Seed combines date + subject list for uniqueness per user per day
  const seed = [...dateKey, ...subjects.join('')].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const rand = seededRandom(seed)

  // Pick 2 different subjects from the student's list
  const shuffledSubjects = [...subjects].sort(() => rand() - 0.5)
  const subA = shuffledSubjects[0]
  const subB = shuffledSubjects[1] ?? shuffledSubjects[0]

  // Pick 2 different quest templates
  const shuffledTemplates = [...QUEST_TEMPLATES].sort(() => rand() - 0.5)
  const tplA = shuffledTemplates[0]
  const tplB = shuffledTemplates[1]

  return [
    {
      id: `${dateKey}_a`,
      icon:  tplA.icon,
      label: tplA.template.replace('{subject}', subA),
      xp:    tplA.xp,
      mode:  tplA.mode,
      subject: subA,
    },
    {
      id: `${dateKey}_b`,
      icon:  tplB.icon,
      label: tplB.template.replace('{subject}', subB),
      xp:    tplB.xp,
      mode:  tplB.mode,
      subject: subB,
    },
  ]
}

export default function DailyQuests({ onStart, profile }) {
  const { dark } = useTheme()

  // Get subjects from profile — prefer subjects_waec, fall back to subjects array
  const subjects = useMemo(() => {
    const raw = profile?.subjects_waec?.length ? profile.subjects_waec
              : profile?.subjects_jamb?.length ? profile.subjects_jamb
              : profile?.subjects ?? []
    return raw
  }, [profile])

  const quests = useMemo(() => generateDailyQuests(subjects), [subjects])

  const todayKey = getTodayKey()
  const storageKey = `ep_quests_${todayKey}`

  const [done, setDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}') } catch { return {} }
  })

  function markDone(id) {
    const next = { ...done, [id]: true }
    setDone(next)
    try {
      // Clear old date keys, save today's
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith('ep_quests_') && k !== storageKey) localStorage.removeItem(k)
      }
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {}
  }

  function handleQuestClick(quest) {
    if (done[quest.id]) return
    markDone(quest.id)
    onStart?.(quest.mode ?? 'custom')
  }

  const completedCount = quests.filter(q => done[q.id]).length
  const allDone = completedCount === quests.length

  return (
    <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 18px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:18 }}>🔥</span>
          <div>
            <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Daily Quests</span>
            <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:1 }}>Resets at midnight</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {allDone && <span style={{ fontSize:11, fontWeight:800, color:GREEN }}>✓ All done!</span>}
          <div style={{ display:'flex', gap:4 }}>
            {quests.map(q => (
              <div key={q.id} style={{ width:8, height:8, borderRadius:'50%', background:done[q.id] ? GREEN : dark ? 'rgba(255,255,255,.15)' : 'rgba(6,42,120,.12)', transition:'background .3s' }}/>
            ))}
          </div>
        </div>
      </div>

      {/* Quest rows */}
      <div style={{ borderTop:'1px solid var(--border)' }}>
        {quests.map((q, i) => {
          const isDone = !!done[q.id]
          return (
            <div
              key={q.id}
              onClick={() => handleQuestClick(q)}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 18px', borderBottom:i < quests.length-1 ? '1px solid var(--border)' : 'none', cursor:isDone ? 'default' : 'pointer', transition:'background .1s', opacity: isDone ? 0.65 : 1 }}
              onMouseEnter={e => { if (!isDone) e.currentTarget.style.background = dark ? 'rgba(255,255,255,.03)' : 'rgba(6,42,120,.02)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {/* Check circle */}
              <div style={{ width:24, height:24, borderRadius:8, flexShrink:0, background:isDone ? GREEN : 'transparent', border:`2px solid ${isDone ? GREEN : dark ? 'rgba(255,255,255,.2)' : 'rgba(6,42,120,.18)'}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
                {isDone && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>

              <span style={{ fontSize:18, flexShrink:0 }}>{q.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontSize:13, fontWeight:isDone ? 600 : 700, color:isDone ? 'var(--text-tert)' : 'var(--text-prim)', textDecoration:isDone ? 'line-through' : 'none', lineHeight:1.35 }}>{q.label}</span>
                {q.subject && !isDone && (
                  <div style={{ fontSize:10, color:BLUE, fontWeight:700, marginTop:2 }}>{q.subject}</div>
                )}
              </div>

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
'use client'
// src/app/student/battle/setup/page.js
import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { useTheme }            from '@/contexts/ThemeContext'
import { getLocalExamType, getLocalSubjects } from '@/lib/localProfile'
import { readLocalBattleStats } from '@/lib/battleAI'

const NAVY = '#062A78', GOLD = '#FFB800', BLUE = '#1264E5'
const SUBJ_ICON = { 'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐','Further Mathematics':'📐','English Language':'📖','Use of English':'📖','Economics':'📊','Government':'🏛️','Geography':'🌍','Literature in English':'📚','Agricultural Science':'🌱','Commerce':'💼','Accounting':'🧮','default':'📝' }
const getIcon = n => SUBJ_ICON[n] ?? SUBJ_ICON.default

function Section({ step, title, children, dark }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 18, boxShadow: dark ? '0 2px 8px rgba(0,0,0,.2)' : '0 1px 4px rgba(6,42,120,.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: NAVY, color: '#fff', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(6,42,120,.3)' }}>{step}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)' }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

function Chip({ label, icon, selected, onSelect, dark }) {
  return (
    <button onClick={onSelect} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 11, fontFamily: 'inherit',
      border: `1.5px solid ${selected ? (dark ? 'rgba(255,184,0,.5)' : 'rgba(255,184,0,.6)') : 'var(--border)'}`,
      background: selected ? (dark ? 'rgba(255,184,0,.1)' : 'rgba(255,184,0,.07)') : 'var(--bg-card)',
      color: selected ? (dark ? GOLD : '#a06000') : 'var(--text-sec)',
      fontSize: 13, fontWeight: selected ? 800 : 600, cursor: 'pointer',
      boxShadow: selected ? '0 2px 6px rgba(255,184,0,.15)' : (dark ? '0 1px 3px rgba(0,0,0,.2)' : '0 1px 3px rgba(6,42,120,.05)'),
      transition: 'all .12s',
    }}>
      {icon && <span style={{ fontSize: 14 }}>{icon}</span>}{label}
    </button>
  )
}

export default function BattleSetupPage() {
  const router   = useRouter()
  const { dark } = useTheme()
  const [subjects, setSubjects] = useState([])
  const [topics,   setTopics]   = useState([])
  const [loadingS, setLoadingS] = useState(true)
  const [loadingT, setLoadingT] = useState(false)
  const [subject,  setSubject]  = useState(null)
  const [qSet,     setQSet]     = useState(null)
  const [topic,    setTopic]    = useState(null)
  const [count,    setCount]    = useState(10)
  const [timerOn,  setTimerOn]  = useState(false)
  const [timerSec, setTimerSec] = useState(30)

  useEffect(() => {
    const local = getLocalSubjects()
    if (local?.length) { setSubjects(local.map(s => typeof s === 'string' ? { id: null, name: s } : s)); setLoadingS(false) }
    const exam = getLocalExamType() || 'WAEC'
    fetch(`/api/student/subjects?exam=${exam}`)
      .then(r => r.ok ? r.json() : null).then(d => { if (d?.subjects?.length) setSubjects(d.subjects) })
      .catch(() => {}).finally(() => setLoadingS(false))
  }, [])

  useEffect(() => {
    if (!subject?.id || qSet !== 'topic') return
    setLoadingT(true); setTopic(null)
    fetch(`/api/student/subjects/${subject.id}/topics`)
      .then(r => r.ok ? r.json() : null).then(d => { if (d?.topics) setTopics(d.topics) })
      .catch(() => {}).finally(() => setLoadingT(false))
  }, [subject?.id, qSet])

  const canStart = subject && qSet && (qSet === 'random' || topic)

  function handleStart() {
    if (!canStart) return
    const config = { opponent: 'computer', subject_id: subject.id, subject_name: subject.name, questionSet: qSet, topic_id: qSet === 'topic' ? topic?.id : null, topic_name: qSet === 'topic' ? topic?.name : null, count, timerEnabled: timerOn, timerSecs: timerOn ? timerSec : null }
    try { sessionStorage.setItem('battle_config', JSON.stringify(config)) } catch {}
    router.push('/student/battle/session')
  }

  const spinStyle = { width: 22, height: 22, borderRadius: '50%', border: `2px solid var(--border)`, borderTopColor: BLUE, animation: 'spin .7s linear infinite', margin: '10px auto', display: 'block' }

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg-base)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '0 16px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 52, gap: 12 }}>
            <button onClick={() => router.push('/student/battle')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tert)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', padding: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Battle
            </button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 900, color: 'var(--text-prim)' }}>Set up your match</div>
            <div style={{ width: 60 }}/>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '18px 14px 100px', maxWidth: 520, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Step 1 — Subject */}
          <Section step="1" title="Choose your subject" dark={dark}>
            {loadingS ? <div style={spinStyle}/> : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {subjects.map(s => (
                  <Chip key={s.id ?? s.name} label={s.name} icon={getIcon(s.name)}
                    selected={subject?.id === s.id || subject?.name === s.name}
                    onSelect={() => { setSubject(s); setTopic(null); setQSet(null) }} dark={dark}/>
                ))}
              </div>
            )}
          </Section>

          {/* Step 2 — Question set */}
          {subject && (
            <Section step="2" title="Question set" dark={dark}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[{ v: 'topic', label: 'Topic Practice', desc: 'Drill one topic', icon: '📚' }, { v: 'random', label: 'Random Mix', desc: 'All topics', icon: '🎲' }].map(({ v, label, desc, icon }) => (
                  <button key={v} onClick={() => { setQSet(v); setTopic(null) }} style={{
                    padding: '14px 12px', borderRadius: 13, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                    border: `1.5px solid ${qSet === v ? (dark ? 'rgba(255,184,0,.45)' : 'rgba(255,184,0,.5)') : 'var(--border)'}`,
                    background: qSet === v ? (dark ? 'rgba(255,184,0,.08)' : 'rgba(255,184,0,.05)') : 'var(--bg-subtle)',
                    boxShadow: qSet === v ? '0 2px 8px rgba(255,184,0,.12)' : 'none', display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)' }}>{label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tert)' }}>{desc}</span>
                    {qSet === v && <div style={{ width: 16, height: 16, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' }}><svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2L7.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                  </button>
                ))}
              </div>
              {qSet === 'topic' && (
                <div style={{ marginTop: 12 }}>
                  {loadingT ? <div style={spinStyle}/> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                      {topics.map(t => (
                        <button key={t.id} onClick={() => setTopic(t)} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', borderRadius: 11,
                          border: `1.5px solid ${topic?.id === t.id ? (dark ? 'rgba(255,184,0,.45)' : 'rgba(255,184,0,.5)') : 'var(--border)'}`,
                          background: topic?.id === t.id ? (dark ? 'rgba(255,184,0,.08)' : 'rgba(255,184,0,.05)') : 'var(--bg-subtle)',
                          cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: topic?.id === t.id ? 700 : 600, color: 'var(--text-prim)',
                        }}>
                          {t.name}
                          {topic?.id === t.id && <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill={GOLD}/><path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Section>
          )}

          {/* Step 3 — Count */}
          {subject && qSet && (qSet === 'random' || topic) && (
            <Section step="3" title="How many questions?" dark={dark}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {[{ v: 5, sub: '~3 min' }, { v: 10, sub: '~6 min' }, { v: 15, sub: '~9 min' }, { v: 20, sub: '~12 min' }].map(({ v, sub }) => (
                  <button key={v} onClick={() => setCount(v)} style={{
                    padding: '11px 6px', borderRadius: 11, fontFamily: 'inherit', cursor: 'pointer',
                    border: `1.5px solid ${count === v ? (dark ? 'rgba(255,184,0,.45)' : 'rgba(255,184,0,.5)') : 'var(--border)'}`,
                    background: count === v ? (dark ? 'rgba(255,184,0,.1)' : 'rgba(255,184,0,.07)') : 'var(--bg-subtle)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  }}>
                    <span style={{ fontSize: 17, fontWeight: 900, color: count === v ? (dark ? GOLD : '#a06000') : 'var(--text-prim)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-tert)', fontWeight: 600 }}>{sub}</span>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* Step 4 — Timer */}
          {subject && qSet && (qSet === 'random' || topic) && (
            <Section step="4" title="Timer per question" dark={dark}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: timerOn ? 12 : 0 }}>
                <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>{timerOn ? `${timerSec}s per question` : 'No time limit'}</span>
                <button onClick={() => setTimerOn(t => !t)} style={{ width: 42, height: 22, borderRadius: 11, border: `1px solid ${timerOn ? NAVY : 'var(--border)'}`, background: timerOn ? NAVY : 'var(--bg-inset)', cursor: 'pointer', padding: 0, position: 'relative', transition: 'background .15s', boxShadow: timerOn ? '0 2px 6px rgba(6,42,120,.3)' : 'none' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: timerOn ? 22 : 3, transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}/>
                </button>
              </div>
              {timerOn && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
                  {[15, 30, 45, 60].map(s => (
                    <button key={s} onClick={() => setTimerSec(s)} style={{ padding: '9px 4px', borderRadius: 10, fontFamily: 'inherit', cursor: 'pointer', fontSize: 13, fontWeight: timerSec === s ? 800 : 600, border: `1.5px solid ${timerSec === s ? (dark ? 'rgba(255,184,0,.45)' : 'rgba(255,184,0,.5)') : 'var(--border)'}`, background: timerSec === s ? (dark ? 'rgba(255,184,0,.1)' : 'rgba(255,184,0,.07)') : 'var(--bg-subtle)', color: timerSec === s ? (dark ? GOLD : '#a06000') : 'var(--text-sec)' }}>
                      {s}s
                    </button>
                  ))}
                </div>
              )}
            </Section>
          )}
        </div>

        {/* Fixed CTA */}
        <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg-card)', borderTop: '1px solid var(--border)', padding: '10px 14px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
          <button onClick={handleStart} disabled={!canStart} style={{
            width: '100%', padding: '14px', borderRadius: 15, border: 'none', fontFamily: 'inherit',
            background: canStart ? NAVY : 'var(--bg-subtle)', color: canStart ? '#fff' : 'var(--text-tert)',
            fontSize: 15, fontWeight: 900, cursor: canStart ? 'pointer' : 'not-allowed', letterSpacing: '-.01em',
            boxShadow: canStart ? '0 4px 0 #031548, 0 6px 20px rgba(6,42,120,.2)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .1s',
          }}
          onPointerDown={e => { if (!canStart) return; e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = '0 1px 0 #031548' }}
          onPointerUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = canStart ? '0 4px 0 #031548, 0 6px 20px rgba(6,42,120,.2)' : 'none' }}
          onPointerLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = canStart ? '0 4px 0 #031548, 0 6px 20px rgba(6,42,120,.2)' : 'none' }}
          >
            ⚔️ Start Battle
          </button>
        </div>
      </div>
    </>
  )
}

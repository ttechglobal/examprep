'use client'
// src/app/student/practice/page.js — v6
// Redesigned to match prototype exactly:
// - WAEC/JAMB switcher pill at top
// - Zara coach banner
// - Recommended quest hero card (glowing blue, ring + Start CTA)
// - 2×2 mode grid (Weak areas, Mixed, Speed round, Mock exam)
// - Subject selector 2×2 grid with active checkmark
// - Setup modal opens as bottom sheet with two-step flow

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CoachBanner from '@/components/ui/CoachBanner'
import { practiceCoach } from '@/lib/coach'
import { useUser } from '@/contexts/UserContext'

const ACCENT = {
  'Chemistry':'#9b7ae0','Physics':'#18B7F2','Biology':'#4ade80',
  'Mathematics':'#FFB800','Further Mathematics':'#FFB800',
  'English Language':'#a78bfa','Use of English':'#a78bfa',
  'Economics':'#fcd34d','Government':'#f87171','Geography':'#34d399',
  'Literature in English':'#f9a8d4','Agricultural Science':'#86efac',
  'Commerce':'#818cf8','Accounting':'#fde68a','default':'#9b7ae0',
}
const ICON = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📝',
}
const getAccent = n => ACCENT[n] ?? ACCENT.default
const getIcon   = n => ICON[n]   ?? ICON.default

// ── Shimmer button ────────────────────────────────────────────────────────────
function PressBtn({ onClick, children, gold = false, style = {} }) {
  const [p, setP] = useState(false)
  const bg     = gold ? 'linear-gradient(135deg,#FFB800,#FF6A00)' : '#1264E5'
  const shadow = gold ? (p ? '0 2px 0 #b85000' : '0 5px 0 #b85000, 0 8px 20px rgba(255,106,0,.25)')
                      : (p ? '0 2px 0 #0a3fa0' : '0 5px 0 #0a3fa0, 0 8px 20px rgba(18,100,229,.3)')
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)} onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
        cursor: 'pointer', background: bg, color: '#fff',
        fontSize: 13, fontWeight: 900, letterSpacing: '-.015em',
        transform: p ? 'translateY(2px)' : '', boxShadow: shadow,
        transition: 'transform .1s, box-shadow .1s',
        position: 'relative', overflow: 'hidden', fontFamily: 'inherit',
        ...style,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent)', backgroundSize: '200% 100%', animation: 'exl-shimmer 2.5s infinite', pointerEvents: 'none' }} />
      {children}
    </button>
  )
}

// ── Setup Modal — bottom sheet, two-step, matches prototype ───────────────────
export function PracticeSetupModal({ subjects, nextTopics, profile, onClose, onStart, onMockExam }) {
  const [step,       setStep]       = useState(1)
  const [subject,    setSubject]    = useState(subjects?.[0] ?? null)
  const [type,       setType]       = useState('quick5')
  const [count,      setCount]      = useState(5)
  const [answerMode, setAnswerMode] = useState('practice')
  const [allTopics,  setAllTopics]  = useState([])
  const [topicId,    setTopicId]    = useState(null)
  const [topicName,  setTopicName]  = useState(null)
  const [loadingTopics, setLoadingTopics] = useState(false)

  const accent   = getAccent(subject?.name ?? '')
  const recTopic = nextTopics?.[subject?.id] ?? null

  useEffect(() => {
    setTopicId(recTopic?.topicId ?? null)
    setTopicName(recTopic?.topicName ?? null)
  }, [subject?.id]) // eslint-disable-line

  useEffect(() => {
    if (step !== 2 || type !== 'topic' || !subject?.id) return
    setLoadingTopics(true)
    createClient().from('topics')
      .select('id, name, is_core, order_index')
      .eq('subject_id', subject.id)
      .order('order_index', { nullsLast: true })
      .order('name')
      .then(({ data }) => {
        setAllTopics(data ?? [])
        setLoadingTopics(false)
        if (!topicId && recTopic) { setTopicId(recTopic.topicId); setTopicName(recTopic.topicName) }
      })
  }, [step, type, subject?.id]) // eslint-disable-line

  function handleBackdrop(e) { if (e.target === e.currentTarget) onClose() }

  function handleNext() {
    if (type === 'mock') { onMockExam?.(); return }
    // Quick 5 skips step 2 — go straight
    if (type === 'quick5') {
      const topic = recTopic ?? null
      onStart({ subject, type: 'topic', count: 5, answerMode: 'practice', topic, duration: null })
      return
    }
    setStep(2)
  }

  function handleStart() {
    const topic = type === 'topic'
      ? { topicId, topicName, isCore: allTopics.find(t => t.id === topicId)?.is_core ?? false }
      : recTopic
    onStart({ subject, type, count, answerMode, topic, duration: null })
  }

  const isMock   = type === 'mock'
  const isQuick5 = type === 'quick5'
  const isTopic  = type === 'topic'
  const isStep2Ready = !isTopic || !!topicId

  const TYPES = [
    { key: 'quick5', icon: '⚡', label: 'Quick 5',    desc: 'Recommended · ~4 min', color: '#1264E5', xp: '+50 XP' },
    { key: 'weak',   icon: '🎯', label: 'Weak areas', desc: 'Lowest scores first',  color: '#f87171', xp: '+40 XP' },
    { key: 'mixed',  icon: '🌀', label: 'Mixed',      desc: 'All topics shuffled',  color: '#18B7F2', xp: '+35 XP' },
    { key: 'timed',  icon: '⏱️', label: 'Speed round', desc: 'Race the clock',      color: '#4ade80', xp: '+60 XP' },
    { key: 'mock',   icon: '📝', label: 'Mock exam',  desc: 'Full simulation',      color: '#FFB800', xp: '+200 XP' },
  ]

  return (
    <div onClick={handleBackdrop} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: '26px 26px 0 0',
        borderTop: '1px solid var(--border)', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -12px 48px rgba(0,0,0,.3)',
        width: '100%', maxWidth: 520,
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '10px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {step === 2 && (
                <button onClick={() => setStep(1)} style={{ width: 28, height: 28, borderRadius: 8, fontSize: 14, cursor: 'pointer', background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
              )}
              <p style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.02em' }}>
                {step === 1 ? 'Choose your quest' : 'Customise session'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2].map(s => (
                  <div key={s} style={{ width: s === step ? 14 : 5, height: 5, borderRadius: 3, background: s === step ? accent : 'var(--border)', transition: 'all .2s' }} />
                ))}
              </div>
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, fontSize: 13, cursor: 'pointer', background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-tert)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {step === 1 && (
            <>
              {/* Subject pills */}
              <div>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>Subject</span>
                <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }}>
                  {(subjects ?? []).map(sub => {
                    const a = getAccent(sub.name); const on = subject?.id === sub.id
                    return (
                      <button key={sub.id} onClick={() => setSubject(sub)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 999, flexShrink: 0, cursor: 'pointer', background: on ? `${a}18` : 'var(--bg-subtle)', border: `2px solid ${on ? a : 'var(--border)'}`, transition: 'all .12s' }}>
                        <span style={{ fontSize: 13 }}>{getIcon(sub.name)}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: on ? a : 'var(--text-sec)', whiteSpace: 'nowrap' }}>{sub.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mode grid — Quick 5 hero + 2×2 grid + Mock full-width */}
              <div>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>What kind of practice?</span>

                {/* Quick 5 hero */}
                {(() => {
                  const t = TYPES[0]; const on = type === t.key
                  return (
                    <button onClick={() => setType(t.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left', marginBottom: 9, background: on ? 'rgba(18,100,229,.1)' : 'var(--bg-subtle)', border: `1.5px solid ${on ? 'rgba(18,100,229,.4)' : 'var(--border)'}`, transition: 'all .15s', fontFamily: 'inherit' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(18,100,229,.15)', border: '1px solid rgba(18,100,229,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{t.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                          <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-prim)' }}>{t.label}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'rgba(255,184,0,.15)', border: '1px solid rgba(255,184,0,.25)', color: '#FFB800' }}>{t.xp}</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-tert)' }}>{t.desc}</span>
                      </div>
                      {on && <span style={{ fontSize: 16, color: '#1264E5', flexShrink: 0 }}>✓</span>}
                    </button>
                  )
                })()}

                {/* 2×2 grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 9 }}>
                  {TYPES.slice(1, 5).filter(t => t.key !== 'mock').map(t => {
                    const on = type === t.key
                    return (
                      <button key={t.key} onClick={() => setType(t.key)} style={{ display: 'flex', flexDirection: 'column', padding: 13, borderRadius: 14, border: `1px solid ${on ? t.color + '45' : t.color + '22'}`, background: on ? `${t.color}14` : `${t.color}08`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all .15s' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${t.color}18`, border: `1px solid ${t.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, marginBottom: 7 }}>{t.icon}</div>
                        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 2 }}>{t.label}</p>
                        <p style={{ fontSize: 10, color: 'var(--text-tert)', marginBottom: 6 }}>{t.desc}</p>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,184,0,.1)', color: '#FFB800', border: '1px solid rgba(255,184,0,.2)', alignSelf: 'flex-start' }}>{t.xp}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Mock exam — full width */}
                {(() => {
                  const t = TYPES.find(x => x.key === 'mock'); const on = type === t.key
                  return (
                    <button onClick={() => setType(t.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left', background: on ? 'rgba(255,184,0,.1)' : 'rgba(255,184,0,.06)', border: `1.5px solid ${on ? 'rgba(255,184,0,.4)' : 'rgba(255,184,0,.2)'}`, transition: 'all .15s', fontFamily: 'inherit' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,184,0,.15)', border: '1px solid rgba(255,184,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{t.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)' }}>{t.label}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,184,0,.15)', color: '#FFB800' }}>WAEC · JAMB</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-tert)' }}>{t.desc}</span>
                      </div>
                      {on && <span style={{ fontSize: 16, color: '#FFB800', flexShrink: 0 }}>✓</span>}
                    </button>
                  )
                })()}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Topic picker */}
              {isTopic && (
                <div>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>Choose topic</span>
                  {loadingTopics ? (
                    <div style={{ height: 36, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${accent}`, borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
                      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                      <span style={{ fontSize: 12, color: 'var(--text-tert)' }}>Loading topics…</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {allTopics.map(t => {
                        const on = topicId === t.id; const isRec = recTopic?.topicId === t.id
                        return (
                          <button key={t.id} onClick={() => { setTopicId(t.id); setTopicName(t.name) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', background: on ? `${accent}15` : 'var(--bg-subtle)', border: `2px solid ${on ? accent : 'var(--border)'}`, transition: 'all .12s', fontFamily: 'inherit' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: on ? accent : 'var(--border)', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: on ? 800 : 600, color: on ? 'var(--text-prim)' : 'var(--text-sec)', flex: 1 }}>{t.name}</span>
                            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                              {t.is_core && <span style={{ fontSize: 9, fontWeight: 700, color: '#ffc36b' }}>🔥 Core</span>}
                              {isRec && !on && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(24,183,242,.15)', color: '#18B7F2' }}>Recommended</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Question count */}
              <div>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>How many questions?</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {[5, 10, 20, 30].map(n => (
                    <button key={n} onClick={() => setCount(n)} style={{ padding: '12px 0', borderRadius: 11, fontSize: 15, fontWeight: 800, cursor: 'pointer', transition: 'all .12s', background: count === n ? '#1264E5' : 'var(--bg-subtle)', color: count === n ? '#fff' : 'var(--text-sec)', border: `2px solid ${count === n ? '#1264E5' : 'var(--border)'}`, fontFamily: 'inherit' }}>
                      {n}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 5 }}>~{Math.round(count * 1.4)} minutes</p>
              </div>

              {/* Answer mode */}
              <div>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>Answer mode</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { key: 'practice', icon: '🏆', label: 'Practice mode', desc: 'Answers shown at the end' },
                    { key: 'study',    icon: '📖', label: 'Study mode',    desc: 'Answer shown right away' },
                  ].map(am => {
                    const on = answerMode === am.key
                    return (
                      <button key={am.key} onClick={() => setAnswerMode(am.key)} style={{ padding: '12px 11px', borderRadius: 14, cursor: 'pointer', textAlign: 'left', background: on ? `${accent}12` : 'var(--bg-subtle)', border: `2px solid ${on ? accent : 'var(--border)'}`, display: 'flex', flexDirection: 'column', gap: 5, transition: 'all .12s', fontFamily: 'inherit' }}>
                        <span style={{ fontSize: 18 }}>{am.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: on ? accent : 'var(--text-prim)' }}>{am.label}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-tert)', lineHeight: 1.4 }}>{am.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <div style={{ height: 4 }} />
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: '12px 20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          {step === 1 ? (
            <PressBtn onClick={handleNext} gold={isMock}>
              {isMock ? 'Set up mock exam →' : isQuick5 ? '▶ Start Quick 5 now' : 'Continue →'}
            </PressBtn>
          ) : (
            <PressBtn onClick={handleStart} style={{ background: accent, boxShadow: `0 5px 0 ${accent}88, 0 8px 20px ${accent}30` }}>
              {`Start ${count} questions →`}
            </PressBtn>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main practice page ────────────────────────────────────────────────────────
export default function PracticePage() {
  const router     = useRouter()
  const supabase   = createClient()
  const { userId } = useUser()

  const [subjects,       setSubjects]      = useState([])
  const [profile,        setProfile]       = useState(null)
  const [nextTopics,     setNextTopics]    = useState({})
  const [subjectMastery, setSubjectMastery] = useState({})
  const [exam,           setExam]          = useState('WAEC')
  const [loading,        setLoading]       = useState(true)
  const [showModal,      setShowModal]     = useState(false)

  useEffect(() => { if (userId) load(userId) }, [userId]) // eslint-disable-line

  async function load(uid) {
    const [{ data: prof }, { data: paths }, { data: masteryRows }, topicRes] = await Promise.all([
      supabase.from('profiles').select('id, exam_type, full_name').eq('id', uid).single(),
      supabase.from('student_learning_paths')
        .select('subject_id, ordered_subtopic_ids, subjects(id, name)')
        .eq('student_id', uid),
      supabase.from('student_topic_mastery')
        .select('topic_id, score, topics(subject_id)')
        .eq('student_id', uid),
      fetch('/api/student/next-topic'),
    ])

    setProfile(prof)
    const examType = prof?.exam_type ?? 'WAEC'
    setExam(examType === 'JAMB' ? 'JAMB' : 'WAEC')

    const topicScores = {}
    for (const row of masteryRows ?? []) {
      const sid = row.topics?.subject_id; if (!sid) continue
      if (!topicScores[sid]) topicScores[sid] = []
      topicScores[sid].push(row.score ?? 0)
    }

    const enriched = (paths ?? []).map(p => ({ id: p.subject_id, name: p.subjects?.name ?? '' }))
    setSubjects(enriched)

    const masteryMap = {}
    for (const path of paths ?? []) {
      const scores = topicScores[path.subject_id] ?? []
      const pct = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      masteryMap[path.subject_id] = { pct }
    }
    setSubjectMastery(masteryMap)

    if (topicRes.ok) {
      const data = await topicRes.json()
      setNextTopics(data.topics ?? {})
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #1264E5', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!subjects.length) return (
    <div style={{ paddingBottom: 32 }}>
      <h1 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-prim)', marginBottom: 16 }}>Practise</h1>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>📚</p>
        <p style={{ fontWeight: 900, color: 'var(--text-prim)', marginBottom: 6 }}>No subjects yet</p>
        <p style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.5, marginBottom: 20 }}>Add subjects in your profile to get started.</p>
        <a href="/student/profile" style={{ display: 'block', padding: '13px 0', background: '#1264E5', color: '#fff', borderRadius: 14, fontSize: 14, fontWeight: 800, textDecoration: 'none', textAlign: 'center', boxShadow: '0 5px 0 #0a3fa0' }}>Set up my subjects →</a>
      </div>
    </div>
  )

  const heroSubject = subjects.find(s => nextTopics[s.id]) ?? subjects[0]
  const heroTopic   = nextTopics[heroSubject?.id] ?? null
  const heroAccent  = getAccent(heroSubject?.name ?? '')
  const topicHint   = heroTopic?.topicName ?? 'Mixed practice'
  const showBothTabs = profile?.exam_type === 'BOTH'

  const coach = practiceCoach({
    firstName:    profile?.full_name?.split(' ')[0] ?? '',
    weakSubject:  subjects[0]?.name,
    weakTopic:    heroTopic?.topicName,
    sessionCount: 0,
  })

  function handleStart({ subject, type, count, answerMode, topic, duration }) {
    const config = {
      subjects:     [subject.name],
      subject_id:   subject.id,
      examType:     exam,
      count,
      mode:         type,
      answerMode,
      topicName:    topic?.topicName   ?? null,
      topic_id:     topic?.topicId     ?? null,
      isCore:       topic?.isCore      ?? false,
      durationSecs: duration           ?? null,
    }
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    setShowModal(false)
    router.push('/student/practice/session')
  }

  return (
    <div style={{ paddingBottom: 96 }}>

      {/* ── Eyebrow + title ── */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', marginBottom: 3 }}>Let's go</p>
        <h1 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em' }}>Choose your quest</h1>
      </div>

      {/* ── WAEC / JAMB switcher ── */}
      {showBothTabs ? (
        <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: 13, padding: 4, marginBottom: 14, border: '1px solid var(--border)' }}>
          {['WAEC', 'JAMB'].map(e => (
            <button key={e} onClick={() => setExam(e)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: exam === e ? '#1264E5' : 'transparent', color: exam === e ? '#fff' : 'var(--text-tert)', boxShadow: exam === e ? '0 2px 8px rgba(18,100,229,.4)' : 'none', transition: 'all .15s' }}>
              {e}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: 13, padding: 4, marginBottom: 14, border: '1px solid var(--border)' }}>
          {['WAEC', 'JAMB'].map(e => (
            <button key={e} onClick={() => setExam(e)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: exam === e ? '#1264E5' : 'transparent', color: exam === e ? '#fff' : 'var(--text-tert)', boxShadow: exam === e ? '0 2px 8px rgba(18,100,229,.4)' : 'none', transition: 'all .15s' }}>
              {e}
            </button>
          ))}
        </div>
      )}

      {/* ── Zara coach ── */}
      <div style={{ marginBottom: 14 }}>
        <CoachBanner emoji={coach.emoji} message={coach.message} />
      </div>

      {/* ── Recommended quest hero ── */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>Recommended quest</span>
        <div style={{
          borderRadius: 18, overflow: 'hidden', cursor: 'pointer',
          background: 'linear-gradient(145deg,#071B49 0%,#0c2460 50%,#062A78 100%)',
          border: '1.5px solid rgba(24,183,242,.28)', padding: 15,
          animation: 'exl-glow-pulse 3s ease-in-out infinite', position: 'relative',
        }} onClick={() => setShowModal(true)}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(24,183,242,.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${heroAccent}22`, border: `1px solid ${heroAccent}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
              {getIcon(heroSubject?.name ?? '')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <p style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>Quick 5</p>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'rgba(255,184,0,.15)', border: '1px solid rgba(255,184,0,.25)', color: '#FFB800' }}>+50 XP</span>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'rgba(24,183,242,.15)', border: '1px solid rgba(24,183,242,.25)', color: '#18B7F2' }}>~4 min</span>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{topicHint} · {heroSubject?.name}</p>
            </div>
          </div>
          <PressBtn onClick={e => { e.stopPropagation(); setShowModal(true) }}>
            ▶ Start Quick 5
          </PressBtn>
        </div>
      </div>

      {/* ── Or choose differently — 2×2 ── */}
      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>Or choose differently</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { icon: '🎯', label: 'Weak areas',  desc: 'Lowest scores first', color: '#f87171', xp: '+40 XP' },
          { icon: '🌀', label: 'Mixed',        desc: 'All topics shuffled', color: '#18B7F2', xp: '+35 XP' },
          { icon: '⏱️', label: 'Speed round',  desc: 'Race the clock',     color: '#4ade80', xp: '+60 XP' },
          { icon: '📝', label: 'Mock exam',    desc: 'Full simulation',    color: '#FFB800', xp: '+200 XP', href: '/student/exam' },
        ].map(m => (
          <button key={m.label} onClick={() => m.href ? router.push(m.href) : setShowModal(true)}
            style={{ display: 'flex', flexDirection: 'column', padding: 13, borderRadius: 14, border: `1px solid ${m.color}22`, background: `${m.color}08`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all .12s' }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `${m.color}18`, border: `1px solid ${m.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, marginBottom: 7 }}>{m.icon}</div>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 2 }}>{m.label}</p>
            <p style={{ fontSize: 10, color: 'var(--text-tert)', marginBottom: 6 }}>{m.desc}</p>
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'rgba(255,184,0,.1)', color: '#FFB800', border: '1px solid rgba(255,184,0,.2)', alignSelf: 'flex-start' }}>{m.xp}</span>
          </button>
        ))}
      </div>

      {/* ── Subject selector ── */}
      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>Subject</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {subjects.map((sub, i) => {
          const a = getAccent(sub.name); const on = i === 0
          const m = subjectMastery[sub.id]
          return (
            <button key={sub.id} onClick={() => setShowModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 13, border: `1.5px solid ${on ? a + '45' : 'var(--border)'}`, background: on ? `${a}10` : 'var(--bg-card)', cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ width: 27, height: 27, borderRadius: 8, background: `${a}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{getIcon(sub.name)}</div>
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: on ? a : 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</p>
                <p style={{ fontSize: 9, color: 'var(--text-tert)' }}>{m?.pct ?? 0}%</p>
              </div>
              {on && <div style={{ width: 13, height: 13, borderRadius: '50%', background: a, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="7" height="7" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg></div>}
            </button>
          )
        })}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <PracticeSetupModal
          subjects={subjects}
          nextTopics={nextTopics}
          profile={profile}
          onClose={() => setShowModal(false)}
          onStart={handleStart}
          onMockExam={() => { setShowModal(false); router.push('/student/exam') }}
        />
      )}
    </div>
  )
}
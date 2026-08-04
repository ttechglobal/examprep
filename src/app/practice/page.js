'use client'
// src/app/student/practice/page.js — v4
// ─────────────────────────────────────────────────────────────────────────────
// Flow:
//   Page → subject cards (tap any) → PracticeSetupModal
//   Modal steps:
//     1. Subject (pre-filled, switchable)
//     2. Practice type (topic drill / weak / mixed / timed / mock)
//        - Topic drill: shows topic picker (all topics for that subject)
//        - Timed: shows duration picker (not auto-set)
//     3. Questions count (hidden for mock & timed custom)
//     4. Answer mode: Practice (end) | Study (instant)
//   → session or /student/exam
//
// Also exports PracticeSetupModal so the dashboard can use it.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const ACCENT = {
  'Chemistry':'#9b7ae0','Physics':'#ff8fab','Biology':'#6cce8e',
  'Mathematics':'#5cb8ea','Further Mathematics':'#5cb8ea',
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

function PressBtn({ onClick, disabled, children, bg = '#0b1330', shadow = '0 6px 0 #05070f' }) {
  const [p, setP] = useState(false)
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)} onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: '15px 0', borderRadius: 14,
        background: bg, color: '#fff', fontSize: 15, fontWeight: 800,
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1, letterSpacing: '-0.01em',
        transform: p && !disabled ? 'translateY(3px)' : 'none',
        boxShadow: p && !disabled ? shadow.replace('6px', '2px') : shadow,
        transition: 'transform .1s, box-shadow .1s',
      }}>
      {children}
    </button>
  )
}

const SECTION_LABEL = {
  fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 9, display: 'block',
}

// ── Practice Setup Modal — exported so dashboard can use it ───────────────────
export function PracticeSetupModal({
  initialSubject,     // { id, name } — pre-filled subject
  subjects,           // all enrolled subjects
  nextTopics,         // { subjectId → { topicId, topicName, score, isCore } }
  subjectMastery,     // { subjectId → { pct, completed, total } } (optional)
  profile,
  onClose,
  onStart,
  onMockExam,
}) {
  const [subject,    setSubject]    = useState(initialSubject ?? subjects?.[0])
  const [type,       setType]       = useState('topic')
  const [count,      setCount]      = useState(10)
  const [answerMode, setAnswerMode] = useState('practice')
  const [duration,   setDuration]   = useState(null)    // null = not yet chosen (timed only)
  const [topicId,    setTopicId]    = useState(null)    // chosen topic for topic drill
  const [topicName,  setTopicName]  = useState(null)
  const [allTopics,  setAllTopics]  = useState([])      // list for topic picker
  const [loadingTopics, setLoadingTopics] = useState(false)

  const accent  = getAccent(subject?.name ?? '')
  const recTopic = nextTopics?.[subject?.id] ?? null
  const mastery  = subjectMastery?.[subject?.id]

  // When subject changes, reset topic selection & load topics if type is 'topic'
  useEffect(() => {
    setTopicId(recTopic?.topicId ?? null)
    setTopicName(recTopic?.topicName ?? null)
  }, [subject?.id]) // eslint-disable-line

  // Load all topics for this subject when type = topic
  useEffect(() => {
    if (type !== 'topic' || !subject?.id) return
    setLoadingTopics(true)
    const sb = createClient()
    sb.from('topics')
      .select('id, name, is_core')
      .eq('subject_id', subject.id)
      .order('order_index')
      .then(({ data }) => {
        setAllTopics(data ?? [])
        setLoadingTopics(false)
        // Default to recommended topic if none chosen
        if (!topicId && recTopic) {
          setTopicId(recTopic.topicId)
          setTopicName(recTopic.topicName)
        }
      })
  }, [type, subject?.id]) // eslint-disable-line

  function handleBackdrop(e) { if (e.target === e.currentTarget) onClose() }

  function handleStart() {
    if (type === 'mock') { onMockExam?.(); return }
    if (type === 'timed' && !duration) return // must pick duration
    const topic = type === 'topic' ? { topicId, topicName, isCore: allTopics.find(t => t.id === topicId)?.is_core ?? false } : recTopic
    onStart({ subject, type, count, answerMode, topic, duration })
  }

  const isMock       = type === 'mock'
  const isTimed      = type === 'timed'
  const isTopicDrill = type === 'topic'
  const canStart     = !isMock && !(isTimed && !duration)

  // Duration options for timed mode
  const DURATIONS = [
    { secs: 300,  label: '5 min',  qs: 5  },
    { secs: 600,  label: '10 min', qs: 10 },
    { secs: 1200, label: '20 min', qs: 20 },
    { secs: 1800, label: '30 min', qs: 30 },
  ]

  return (
    <div onClick={handleBackdrop} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: '26px 26px 0 0',
        borderTop: '1px solid var(--border)',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -12px 48px rgba(0,0,0,.3)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '10px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.02em' }}>
                Set up practice
              </p>
              {/* Inline mastery progress */}
              {mastery && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                  <div style={{ flex: 1, height: 4, background: 'var(--bg-subtle)', borderRadius: 99, overflow: 'hidden', maxWidth: 120 }}>
                    <div style={{ width: `${mastery.pct}%`, height: '100%', background: accent, borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{mastery.pct}% mastered</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tert)' }}>{mastery.completed}/{mastery.total} topics</span>
                </div>
              )}
            </div>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: 9, fontSize: 13, cursor: 'pointer', flexShrink: 0,
              background: 'var(--bg-subtle)', border: '1px solid var(--border)',
              color: 'var(--text-tert)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* ── Subject ── */}
          <div>
            <span style={SECTION_LABEL}>Subject</span>
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }}>
              {(subjects ?? []).map(sub => {
                const a  = getAccent(sub.name)
                const on = subject?.id === sub.id
                return (
                  <button key={sub.id} onClick={() => setSubject(sub)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 13px', borderRadius: 999, flexShrink: 0, cursor: 'pointer',
                      background: on ? `${a}18` : 'var(--bg-subtle)',
                      border: `2px solid ${on ? a : 'var(--border)'}`,
                      transition: 'all .12s',
                    }}>
                    <span style={{ fontSize: 13 }}>{getIcon(sub.name)}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: on ? a : 'var(--text-sec)', whiteSpace: 'nowrap' }}>
                      {sub.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Practice type ── */}
          <div>
            <span style={SECTION_LABEL}>Practice type</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { key:'topic',  icon:'🎯', label:'Topic drill',   desc:'Focus questions on one specific topic' },
                { key:'weak',   icon:'📈', label:'Weak topics',   desc:'Questions from your lowest mastery areas' },
                { key:'mixed',  icon:'🔀', label:'Mixed',         desc:'Random questions across all topics' },
                { key:'timed',  icon:'⏱️', label:'Timed',         desc:'Race the clock — great for exam stamina' },
                { key:'mock',   icon:'📝', label:'Mock exam',     desc:'Full WAEC or JAMB simulation', badge:'WAEC · JAMB' },
              ].map(pt => {
                const on = type === pt.key
                return (
                  <button key={pt.key} onClick={() => setType(pt.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                      background: on ? 'var(--active-bg)' : 'var(--bg-subtle)',
                      border: `2px solid ${on ? 'var(--active-border)' : 'var(--border)'}`,
                      transition: 'all .12s',
                    }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{pt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: on ? 'var(--active-text)' : 'var(--text-prim)' }}>{pt.label}</span>
                        {pt.badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,195,107,.15)', color: '#ffc36b' }}>{pt.badge}</span>}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-tert)' }}>{pt.desc}</span>
                    </div>
                    {on && <span style={{ fontSize: 13, color: 'var(--active-text)', flexShrink: 0 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Topic picker (topic drill only) ── */}
          {isTopicDrill && (
            <div>
              <span style={SECTION_LABEL}>Choose topic</span>
              {loadingTopics ? (
                <div style={{ height: 36, display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: accent, animation: 'spin .7s linear infinite' }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {allTopics.map(t => {
                    const on = topicId === t.id
                    const isRec = recTopic?.topicId === t.id
                    return (
                      <button key={t.id} onClick={() => { setTopicId(t.id); setTopicName(t.name) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 13px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                          background: on ? `${accent}15` : 'var(--bg-subtle)',
                          border: `2px solid ${on ? accent : 'var(--border)'}`,
                          transition: 'all .12s',
                        }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: on ? accent : 'var(--border)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: on ? 800 : 600, color: on ? 'var(--text-prim)' : 'var(--text-sec)', flex: 1 }}>{t.name}</span>
                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                          {t.is_core && <span style={{ fontSize: 9, fontWeight: 700, color: '#ffc36b' }}>🔥 Core</span>}
                          {isRec && !on && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(155,122,224,.15)', color: '#9b7ae0' }}>Recommended</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Timed: duration picker ── */}
          {isTimed && (
            <div>
              <span style={SECTION_LABEL}>Choose duration</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {DURATIONS.map(d => {
                  const on = duration === d.secs
                  return (
                    <button key={d.secs} onClick={() => { setDuration(d.secs); setCount(d.qs) }}
                      style={{
                        padding: '13px 10px', borderRadius: 13, cursor: 'pointer', textAlign: 'center',
                        background: on ? '#0b1330' : 'var(--bg-subtle)',
                        border: `2px solid ${on ? '#0b1330' : 'var(--border)'}`,
                        transition: 'all .12s',
                      }}>
                      <p style={{ fontSize: 17, fontWeight: 900, color: on ? '#fff' : 'var(--text-prim)', marginBottom: 2 }}>{d.label}</p>
                      <p style={{ fontSize: 10, color: on ? 'rgba(255,255,255,.55)' : 'var(--text-tert)' }}>~{d.qs} questions</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Question count (not for mock or timed) ── */}
          {!isMock && !isTimed && (
            <div>
              <span style={SECTION_LABEL}>Questions</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {[5, 10, 20, 30].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 11,
                      fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'all .12s',
                      background: count === n ? '#0b1330' : 'var(--bg-subtle)',
                      color: count === n ? '#fff' : 'var(--text-sec)',
                      border: `2px solid ${count === n ? '#0b1330' : 'var(--border)'}`,
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Answer mode (not for mock or timed) ── */}
          {!isMock && !isTimed && (
            <div>
              <span style={SECTION_LABEL}>Answer mode</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { key:'practice', icon:'🏆', label:'Practice mode', desc:'Answers shown at the end — like the real exam' },
                  { key:'study',    icon:'📖', label:'Study mode',    desc:'Answer shown right after each question' },
                ].map(am => {
                  const on = answerMode === am.key
                  return (
                    <button key={am.key} onClick={() => setAnswerMode(am.key)}
                      style={{
                        padding: '12px 11px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                        background: on ? 'var(--active-bg)' : 'var(--bg-subtle)',
                        border: `2px solid ${on ? 'var(--active-border)' : 'var(--border)'}`,
                        display: 'flex', flexDirection: 'column', gap: 5, transition: 'all .12s',
                      }}>
                      <span style={{ fontSize: 18 }}>{am.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: on ? 'var(--active-text)' : 'var(--text-prim)' }}>{am.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-tert)', lineHeight: 1.4 }}>{am.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ height: 4 }} />
        </div>

        {/* Pinned CTA */}
        <div style={{
          flexShrink: 0, padding: '12px 20px',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--border)', background: 'var(--bg-card)',
        }}>
          {isMock ? (
            <PressBtn onClick={handleStart}>Set up mock exam →</PressBtn>
          ) : isTimed ? (
            <PressBtn onClick={handleStart} disabled={!duration}>
              {duration ? `Start ${count}-question timed session →` : 'Choose a duration first'}
            </PressBtn>
          ) : (
            <PressBtn onClick={handleStart} disabled={isTopicDrill && !topicId} bg={accent} shadow={`0 6px 0 ${accent}88`}>
              Start {count} questions →
            </PressBtn>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Subject card ──────────────────────────────────────────────────────────────
function SubjectCard({ sub, topic, mastery, onStart }) {
  const a = getAccent(sub.name)
  const pct = mastery?.pct ?? 0
  const pctColor = pct >= 70 ? '#6cce8e' : pct >= 40 ? '#fcd34d' : pct > 0 ? '#ff8fab' : 'var(--text-tert)'

  return (
    <button onClick={() => onStart(sub)}
      style={{
        textAlign: 'left', cursor: 'pointer', borderRadius: 18,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        transition: 'border-color .15s', width: '100%',
      }}
      className="active:scale-[.97]"
    >
      {/* Coloured top */}
      <div style={{ padding: '14px 14px 12px', background: `${a}12`, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${a}22`, border: `1px solid ${a}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
          }}>
            {getIcon(sub.name)}
          </div>
          {pct > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: pctColor }}>{pct}%</span>}
        </div>
        <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-prim)', lineHeight: 1.2 }}>{sub.name}</p>
      </div>

      {/* Progress bar */}
      {mastery && (
        <div style={{ padding: '6px 14px 0' }}>
          <div style={{ height: 3, background: 'var(--bg-subtle)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(pct, 2)}%`, height: '100%', background: a, borderRadius: 99, transition: 'width .7s' }} />
          </div>
          <p style={{ fontSize: 9, color: 'var(--text-tert)', marginTop: 3, fontWeight: 600 }}>
            {mastery.completed}/{mastery.total} topics
          </p>
        </div>
      )}

      {/* Next topic */}
      <div style={{ padding: '8px 14px 12px', flex: 1 }}>
        {topic ? (
          <>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginBottom: 3 }}>
              {topic.isCore ? '🔥 Next core topic' : 'Recommended next'}
            </p>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sec)', lineHeight: 1.3 }}>{topic.topicName}</p>
          </>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-tert)' }}>Mixed questions</p>
        )}
      </div>

      <div style={{ padding: '0 14px 12px' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: a }}>Start practice →</span>
      </div>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PracticePage() {
  const router   = useRouter()
  const supabase = createClient()

  const [subjects,       setSubjects]      = useState([])
  const [profile,        setProfile]       = useState(null)
  const [nextTopics,     setNextTopics]    = useState({})
  const [subjectMastery, setSubjectMastery] = useState({})
  const [loading,        setLoading]       = useState(true)
  const [modal,          setModal]         = useState(null) // null | subject obj

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: paths }, { data: prog }, topicRes] = await Promise.all([
        supabase.from('profiles').select('id, exam_type').eq('id', user.id).single(),
        supabase.from('student_learning_paths')
          .select('subject_id, ordered_subtopic_ids, subjects(id, name)')
          .eq('student_id', user.id),
        supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
        fetch('/api/student/next-topic'),
      ])

      setProfile(prof)

      const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))
      const enriched = (paths ?? []).map(p => ({ id: p.subject_id, name: p.subjects?.name ?? '' }))
      setSubjects(enriched)

      // Build mastery per subject from lesson progress
      const masteryMap = {}
      for (const path of paths ?? []) {
        const ids   = path.ordered_subtopic_ids ?? []
        const done  = ids.filter(id => completedIds.has(id)).length
        const pct   = ids.length > 0 ? Math.round((done / ids.length) * 100) : 0
        masteryMap[path.subject_id] = { pct, completed: done, total: ids.length }
      }
      setSubjectMastery(masteryMap)

      if (topicRes.ok) {
        const data = await topicRes.json()
        setNextTopics(data.topics ?? {})
      }

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  function startSession({ subject, type, count, answerMode, topic, duration }) {
    const config = {
      subjects:    [subject.name],
      subject_id:  subject.id,
      examType:    profile?.exam_type ?? 'WAEC',
      count,
      mode:        type,
      answerMode,
      topicName:   topic?.topicName ?? null,
      topic_id:    topic?.topicId   ?? null,
      isCore:      topic?.isCore    ?? false,
      durationSecs: duration ?? null,
    }
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    setModal(null)
    router.push('/student/practice/session')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', border: '3px solid #9b7ae0', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (subjects.length === 0) return (
    <div style={{ paddingBottom: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em', marginBottom: 16 }}>Practise</h1>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>📚</p>
        <p style={{ fontWeight: 900, color: 'var(--text-prim)', marginBottom: 6 }}>No subjects yet</p>
        <p style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.5, marginBottom: 20 }}>
          Add subjects in your profile to start practising.
        </p>
        <Link href="/student/profile" style={{ display: 'block', padding: '13px 0', background: '#0b1330', color: '#fff', borderRadius: 14, fontSize: 14, fontWeight: 800, textDecoration: 'none', textAlign: 'center', boxShadow: '0 5px 0 #05070f' }}>
          Set up my subjects →
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ paddingBottom: 96 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em' }}>Practise</h1>
        <p style={{ fontSize: 13, color: 'var(--text-sec)', marginTop: 3 }}>Tap a subject to start</p>
      </div>

      {/* Subject grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {subjects.map(sub => (
          <SubjectCard
            key={sub.id}
            sub={sub}
            topic={nextTopics[sub.id] ?? null}
            mastery={subjectMastery[sub.id] ?? null}
            onStart={(s) => setModal(s)}
          />
        ))}
      </div>

      {/* Mock exam entry */}
      <button onClick={() => router.push('/student/exam')}
        style={{
          width: '100%', padding: '16px 18px', borderRadius: 18, cursor: 'pointer',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', marginBottom: 10,
        }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(255,195,107,.12)', border: '1px solid rgba(255,195,107,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          📝
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 2 }}>Mock exam</p>
          <p style={{ fontSize: 11, color: 'var(--text-sec)' }}>Full WAEC or JAMB simulation</p>
        </div>
        <span style={{ fontSize: 16, color: 'var(--text-tert)' }}>›</span>
      </button>

      <Link href="/student/progress" style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>View my progress</span>
          <span style={{ fontSize: 13, color: 'var(--text-tert)' }}>›</span>
        </div>
      </Link>

      {modal && (
        <PracticeSetupModal
          initialSubject={modal}
          subjects={subjects}
          nextTopics={nextTopics}
          subjectMastery={subjectMastery}
          profile={profile}
          onClose={() => setModal(null)}
          onStart={startSession}
          onMockExam={() => { setModal(null); router.push('/student/exam') }}
        />
      )}
    </div>
  )
}
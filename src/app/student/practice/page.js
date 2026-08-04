'use client'
// src/app/student/practice/page.js — v5
// ─────────────────────────────────────────────────────────────────────────────
// Layout:
//   1. Big hero "Start Practice" card — the main CTA
//   2. Progress snapshot — overall mastery ring + subject bars (inline summary)
//   3. Mock exam entry
//
// Tapping the hero card or "Start Practice" button opens PracticeSetupModal.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
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

// ── 3D press button ───────────────────────────────────────────────────────────
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

const LABEL = {
  fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 9, display: 'block',
}

// ── Practice Setup Modal ──────────────────────────────────────────────────────
export function PracticeSetupModal({
  initialSubject, subjects, nextTopics, subjectMastery,
  profile, onClose, onStart, onMockExam,
}) {
  const [subject,    setSubject]    = useState(initialSubject ?? subjects?.[0])
  const [type,       setType]       = useState('topic')
  const [count,      setCount]      = useState(10)
  const [answerMode, setAnswerMode] = useState('practice')
  const [duration,   setDuration]   = useState(null)
  const [topicId,    setTopicId]    = useState(null)
  const [topicName,  setTopicName]  = useState(null)
  const [allTopics,  setAllTopics]  = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)

  const accent    = getAccent(subject?.name ?? '')
  const recTopic  = nextTopics?.[subject?.id] ?? null
  const mastery   = subjectMastery?.[subject?.id]

  useEffect(() => {
    setTopicId(recTopic?.topicId ?? null)
    setTopicName(recTopic?.topicName ?? null)
  }, [subject?.id]) // eslint-disable-line

  useEffect(() => {
    if (type !== 'topic' || !subject?.id) return
    setLoadingTopics(true)
    const sb = createClient()
    sb.from('topics').select('id, name, is_core').eq('subject_id', subject.id).order('order_index')
      .then(({ data }) => {
        setAllTopics(data ?? [])
        setLoadingTopics(false)
        if (!topicId && recTopic) { setTopicId(recTopic.topicId); setTopicName(recTopic.topicName) }
      })
  }, [type, subject?.id]) // eslint-disable-line

  function handleBackdrop(e) { if (e.target === e.currentTarget) onClose() }

  function handleStart() {
    if (type === 'mock') { onMockExam?.(); return }
    if (type === 'timed' && !duration) return
    const topic = type === 'topic'
      ? { topicId, topicName, isCore: allTopics.find(t => t.id === topicId)?.is_core ?? false }
      : recTopic
    onStart({ subject, type, count, answerMode, topic, duration })
  }

  const isMock  = type === 'mock'
  const isTimed = type === 'timed'
  const isTopic = type === 'topic'
  const DURATIONS = [
    { secs:300,  label:'5 min',  qs:5  },
    { secs:600,  label:'10 min', qs:10 },
    { secs:1200, label:'20 min', qs:20 },
    { secs:1800, label:'30 min', qs:30 },
  ]

  return (
    <div onClick={handleBackdrop} style={{
      position:'fixed',inset:0,zIndex:200,
      background:'rgba(0,0,0,.65)',backdropFilter:'blur(6px)',
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',
    }}>
      <div style={{
        background:'var(--bg-card)',borderRadius:'26px 26px 0 0',
        borderTop:'1px solid var(--border)',maxHeight:'92vh',
        display:'flex',flexDirection:'column',boxShadow:'0 -12px 48px rgba(0,0,0,.3)',
        width:'100%', maxWidth: 520,
      }}>
        <div style={{display:'flex',justifyContent:'center',padding:'12px 0 0',flexShrink:0}}>
          <div style={{width:36,height:4,borderRadius:2,background:'var(--border)'}} />
        </div>
        <div style={{padding:'10px 20px 14px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
            <div>
              <p style={{fontSize:19,fontWeight:900,color:'var(--text-prim)',letterSpacing:'-0.02em'}}>Set up practice</p>
              {mastery && (
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:5}}>
                  <div style={{flex:1,height:4,background:'var(--bg-subtle)',borderRadius:99,overflow:'hidden',maxWidth:120}}>
                    <div style={{width:`${mastery.pct}%`,height:'100%',background:accent,borderRadius:99}} />
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:accent}}>{mastery.pct}% mastered</span>
                  <span style={{fontSize:11,color:'var(--text-tert)'}}>{mastery.completed}/{mastery.total} topics</span>
                </div>
              )}
            </div>
            <button onClick={onClose} style={{width:30,height:30,borderRadius:9,fontSize:13,cursor:'pointer',flexShrink:0,background:'var(--bg-subtle)',border:'1px solid var(--border)',color:'var(--text-tert)',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'18px 20px',display:'flex',flexDirection:'column',gap:22}}>

          {/* Subject */}
          <div>
            <span style={LABEL}>Subject</span>
            <div style={{display:'flex',gap:7,overflowX:'auto',paddingBottom:4}}>
              {(subjects ?? []).map(sub => {
                const a = getAccent(sub.name); const on = subject?.id === sub.id
                return (
                  <button key={sub.id} onClick={() => setSubject(sub)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 13px',borderRadius:999,flexShrink:0,cursor:'pointer',background:on?`${a}18`:'var(--bg-subtle)',border:`2px solid ${on?a:'var(--border)'}`,transition:'all .12s'}}>
                    <span style={{fontSize:13}}>{getIcon(sub.name)}</span>
                    <span style={{fontSize:12,fontWeight:800,color:on?a:'var(--text-sec)',whiteSpace:'nowrap'}}>{sub.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Practice type */}
          <div>
            <span style={LABEL}>Practice type</span>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {[
                {key:'topic', icon:'🎯', label:'Topic drill',   desc:'Focus on one specific topic'},
                {key:'weak',  icon:'📈', label:'Weak topics',   desc:'Your lowest mastery areas first'},
                {key:'mixed', icon:'🔀', label:'Mixed',         desc:'Random across all topics'},
                {key:'timed', icon:'⏱️', label:'Timed',         desc:'Race the clock — build exam stamina'},
                {key:'mock',  icon:'📝', label:'Mock exam',     desc:'Full WAEC or JAMB simulation', badge:'WAEC · JAMB'},
              ].map(pt => {
                const on = type === pt.key
                return (
                  <button key={pt.key} onClick={() => setType(pt.key)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:14,cursor:'pointer',textAlign:'left',background:on?'var(--active-bg)':'var(--bg-subtle)',border:`2px solid ${on?'var(--active-border)':'var(--border)'}`,transition:'all .12s'}}>
                    <span style={{fontSize:20,flexShrink:0}}>{pt.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:2}}>
                        <span style={{fontSize:13,fontWeight:800,color:on?'var(--active-text)':'var(--text-prim)'}}>{pt.label}</span>
                        {pt.badge && <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:'rgba(255,195,107,.15)',color:'#ffc36b'}}>{pt.badge}</span>}
                      </div>
                      <span style={{fontSize:11,color:'var(--text-tert)'}}>{pt.desc}</span>
                    </div>
                    {on && <span style={{fontSize:13,color:'var(--active-text)',flexShrink:0}}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Topic picker */}
          {isTopic && (
            <div>
              <span style={LABEL}>Choose topic</span>
              {loadingTopics ? (
                <div style={{height:36,display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:18,height:18,borderRadius:'50%',border:`2px solid ${accent}`,borderTopColor:'transparent',animation:'spin .7s linear infinite'}} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  <span style={{fontSize:12,color:'var(--text-tert)'}}>Loading topics…</span>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {allTopics.map(t => {
                    const on = topicId === t.id; const isRec = recTopic?.topicId === t.id
                    return (
                      <button key={t.id} onClick={() => { setTopicId(t.id); setTopicName(t.name) }} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 13px',borderRadius:12,cursor:'pointer',textAlign:'left',background:on?`${accent}15`:'var(--bg-subtle)',border:`2px solid ${on?accent:'var(--border)'}`,transition:'all .12s'}}>
                        <div style={{width:6,height:6,borderRadius:'50%',background:on?accent:'var(--border)',flexShrink:0}} />
                        <span style={{fontSize:13,fontWeight:on?800:600,color:on?'var(--text-prim)':'var(--text-sec)',flex:1}}>{t.name}</span>
                        <div style={{display:'flex',gap:5,flexShrink:0}}>
                          {t.is_core && <span style={{fontSize:9,fontWeight:700,color:'#ffc36b'}}>🔥 Core</span>}
                          {isRec && !on && <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:'rgba(155,122,224,.15)',color:'#9b7ae0'}}>Recommended</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Duration picker */}
          {isTimed && (
            <div>
              <span style={LABEL}>Duration</span>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {DURATIONS.map(d => {
                  const on = duration === d.secs
                  return (
                    <button key={d.secs} onClick={() => { setDuration(d.secs); setCount(d.qs) }} style={{padding:'13px 10px',borderRadius:13,cursor:'pointer',textAlign:'center',background:on?'#0b1330':'var(--bg-subtle)',border:`2px solid ${on?'#0b1330':'var(--border)'}`,transition:'all .12s'}}>
                      <p style={{fontSize:17,fontWeight:900,color:on?'#fff':'var(--text-prim)',marginBottom:2}}>{d.label}</p>
                      <p style={{fontSize:10,color:on?'rgba(255,255,255,.55)':'var(--text-tert)'}}>~{d.qs} questions</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Question count */}
          {!isMock && !isTimed && (
            <div>
              <span style={LABEL}>Questions</span>
              <div style={{display:'flex',gap:8}}>
                {[5,10,20,30].map(n => (
                  <button key={n} onClick={() => setCount(n)} style={{flex:1,padding:'10px 0',borderRadius:11,fontSize:14,fontWeight:800,cursor:'pointer',transition:'all .12s',background:count===n?'#0b1330':'var(--bg-subtle)',color:count===n?'#fff':'var(--text-sec)',border:`2px solid ${count===n?'#0b1330':'var(--border)'}`}}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Answer mode */}
          {!isMock && !isTimed && (
            <div>
              <span style={LABEL}>Answer mode</span>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {[
                  {key:'practice',icon:'🏆',label:'Practice mode',desc:'Answers shown at the end'},
                  {key:'study',   icon:'📖',label:'Study mode',   desc:'Answer shown right away'},
                ].map(am => {
                  const on = answerMode === am.key
                  return (
                    <button key={am.key} onClick={() => setAnswerMode(am.key)} style={{padding:'12px 11px',borderRadius:14,cursor:'pointer',textAlign:'left',background:on?'var(--active-bg)':'var(--bg-subtle)',border:`2px solid ${on?'var(--active-border)':'var(--border)'}`,display:'flex',flexDirection:'column',gap:5,transition:'all .12s'}}>
                      <span style={{fontSize:18}}>{am.icon}</span>
                      <span style={{fontSize:12,fontWeight:800,color:on?'var(--active-text)':'var(--text-prim)'}}>{am.label}</span>
                      <span style={{fontSize:10,color:'var(--text-tert)',lineHeight:1.4}}>{am.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{height:4}} />
        </div>

        <div style={{flexShrink:0,padding:'12px 20px',paddingBottom:'max(20px, env(safe-area-inset-bottom))',borderTop:'1px solid var(--border)',background:'var(--bg-card)'}}>
          {isMock ? (
            <PressBtn onClick={handleStart}>Set up mock exam →</PressBtn>
          ) : isTimed ? (
            <PressBtn onClick={handleStart} disabled={!duration}>
              {duration ? `Start ${count}-question timed session →` : 'Choose a duration first'}
            </PressBtn>
          ) : (
            <PressBtn onClick={handleStart} disabled={isTopic && !topicId} bg={accent} shadow={`0 6px 0 ${accent}88`}>
              Start {count} questions →
            </PressBtn>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Progress snapshot ─────────────────────────────────────────────────────────
function ProgressSnapshot({ subjects, overallPct, weekTotal }) {
  if (!subjects?.length) return null

  const ring = 2 * Math.PI * 22 // r=22
  const dash = ring * (overallPct / 100)
  const overallColor = overallPct >= 70 ? '#6cce8e' : overallPct >= 40 ? '#fcd34d' : '#ff8fab'

  return (
    <div style={{ borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>Your progress</span>
        <Link href="/student/progress" style={{ fontSize: 11, fontWeight: 700, color: '#9b7ae0', textDecoration: 'none' }}>See full details →</Link>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        {/* Ring */}
        <div style={{ flexShrink: 0 }}>
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="var(--bg-subtle)" strokeWidth="5" />
            <circle cx="28" cy="28" r="22" fill="none" stroke={overallColor} strokeWidth="5"
              strokeDasharray={`${dash} ${ring}`} strokeLinecap="round"
              transform="rotate(-90 28 28)" style={{ transition: 'stroke-dasharray .8s ease' }} />
            <text x="28" y="32" textAnchor="middle" fontSize="11" fontWeight="900" fill={overallColor}>{overallPct}%</text>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 2 }}>Overall mastery</p>
          <p style={{ fontSize: 12, color: 'var(--text-sec)' }}>
            {overallPct >= 70 ? 'Strong — keep going!' : overallPct >= 40 ? 'Building up steadily' : 'Just getting started'}
          </p>
          {weekTotal > 0 && (
            <p style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 3 }}>+{weekTotal} questions this week</p>
          )}
        </div>
      </div>

      {/* Subject bars */}
      <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {subjects.slice(0, 4).map(sub => {
          const a   = getAccent(sub.name)
          const pct = sub.pct ?? 0
          const tier = pct >= 70 ? 'Strong' : pct >= 40 ? 'Building' : 'Needs work'
          const tierColor = pct >= 70 ? '#6cce8e' : pct >= 40 ? '#fcd34d' : '#ff8fab'
          return (
            <div key={sub.name}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13 }}>{getIcon(sub.name)}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)' }}>{sub.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: tierColor }}>{tier}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: tierColor }}>{pct}%</span>
                </div>
              </div>
              <div style={{ height: 5, background: 'var(--bg-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(pct, 2)}%`, height: '100%', background: a, borderRadius: 99, transition: 'width .7s' }} />
              </div>
              <p style={{ fontSize: 9, color: 'var(--text-tert)', marginTop: 2 }}>{sub.completed}/{sub.total} topics</p>
            </div>
          )
        })}
        {subjects.length > 4 && (
          <Link href="/student/progress" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', textDecoration: 'none', textAlign: 'center', paddingTop: 2 }}>
            +{subjects.length - 4} more subjects →
          </Link>
        )}
      </div>
    </div>
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
  const [weekTotal,      setWeekTotal]     = useState(0)
  const [loading,        setLoading]       = useState(true)
  const [modal,          setModal]         = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: paths }, { data: prog }, topicRes, { data: attempts }] = await Promise.all([
        supabase.from('profiles').select('id, exam_type').eq('id', user.id).single(),
        supabase.from('student_learning_paths')
          .select('subject_id, ordered_subtopic_ids, subjects(id, name)')
          .eq('student_id', user.id),
        supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
        fetch('/api/student/next-topic'),
        supabase.from('question_attempts').select('id')
          .eq('student_id', user.id)
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ])

      setProfile(prof)
      setWeekTotal((attempts ?? []).length)

      const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))
      const enriched = (paths ?? []).map(p => ({ id: p.subject_id, name: p.subjects?.name ?? '' }))
      setSubjects(enriched)

      const masteryMap = {}
      for (const path of paths ?? []) {
        const ids  = path.ordered_subtopic_ids ?? []
        const done = ids.filter(id => completedIds.has(id)).length
        const pct  = ids.length > 0 ? Math.round((done / ids.length) * 100) : 0
        masteryMap[path.subject_id] = { pct, completed: done, total: ids.length, name: path.subjects?.name ?? '' }
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
      subjects: [subject.name], subject_id: subject.id,
      examType: profile?.exam_type ?? 'WAEC', count, mode: type, answerMode,
      topicName: topic?.topicName ?? null, topic_id: topic?.topicId ?? null,
      isCore: topic?.isCore ?? false, durationSecs: duration ?? null,
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

  const masteryList    = Object.values(subjectMastery)
  const overallPct     = masteryList.length
    ? Math.round(masteryList.reduce((s, m) => s + m.pct, 0) / masteryList.length)
    : 0
  const subjectForSnap = masteryList.map(m => ({ ...m }))

  // No subjects yet
  if (subjects.length === 0) return (
    <div style={{ paddingBottom: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em', marginBottom: 16 }}>Practise</h1>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>📚</p>
        <p style={{ fontWeight: 900, color: 'var(--text-prim)', marginBottom: 6 }}>No subjects yet</p>
        <p style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.5, marginBottom: 20 }}>
          Add subjects in your profile to get started.
        </p>
        <Link href="/student/profile" style={{ display: 'block', padding: '13px 0', background: '#0b1330', color: '#fff', borderRadius: 14, fontSize: 14, fontWeight: 800, textDecoration: 'none', textAlign: 'center', boxShadow: '0 5px 0 #05070f' }}>
          Set up my subjects →
        </Link>
      </div>
    </div>
  )

  // Pick the most relevant subject for the hero card (first with a next topic)
  const heroSubject = subjects.find(s => nextTopics[s.id]) ?? subjects[0]
  const heroTopic   = nextTopics[heroSubject?.id] ?? null
  const heroAccent  = getAccent(heroSubject?.name ?? '')

  return (
    <div style={{ paddingBottom: 96 }}>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em' }}>Practise</h1>
        <p style={{ fontSize: 13, color: 'var(--text-sec)', marginTop: 3 }}>A little practice every day adds up</p>
      </div>

      {/* ── Hero practice card — the main CTA ── */}
      <div style={{
        borderRadius: 24, overflow: 'hidden',
        border: `1px solid ${heroAccent}30`,
        boxShadow: `0 12px 40px ${heroAccent}18`,
        marginBottom: 14,
      }}>
        {/* Dark navy top */}
        <div style={{
          background: 'linear-gradient(150deg, #0b1330 0%, #12104a 55%, #0b1330 100%)',
          padding: '22px 20px 20px', position: 'relative', overflow: 'hidden',
        }}>
          {/* Subtle dot pattern */}
          <div style={{ position: 'absolute', inset: 0, opacity: .04, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          {/* Accent glow */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, ${heroAccent}20 0%, transparent 70%)`, pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Subject icon + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: `${heroAccent}20`, border: `1px solid ${heroAccent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                {getIcon(heroSubject?.name ?? '')}
              </div>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.38)', marginBottom: 2 }}>
                  {profile?.exam_type ?? 'WAEC'} · {heroSubject?.name}
                </p>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                  {heroTopic?.topicName ?? 'Mixed practice'}
                  {heroTopic?.isCore && <span style={{ marginLeft: 8, fontSize: 9, color: '#ffc36b' }}>🔥 Core</span>}
                </p>
              </div>
            </div>

            {/* Motivational line */}
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', lineHeight: 1.6, marginBottom: 16 }}>
              A few questions a day is all it takes. Keep your streak going.
            </p>

            {/* CTA button */}
            <button
              onClick={() => setModal(heroSubject)}
              style={{
                width: '100%', padding: '15px 0', borderRadius: 14,
                background: '#fff', color: '#0b1330',
                fontSize: 15, fontWeight: 900, border: 'none', cursor: 'pointer',
                letterSpacing: '-0.01em', transition: 'transform .1s',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'translateY(3px)'}
              onMouseUp={e => e.currentTarget.style.transform = ''}
              onTouchStart={e => e.currentTarget.style.transform = 'translateY(3px)'}
              onTouchEnd={e => e.currentTarget.style.transform = ''}
            >
              Start practice →
            </button>
          </div>
        </div>

        {/* Subject switcher strip */}
        {subjects.length > 1 && (
          <div style={{ background: 'var(--bg-card)', padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 7, overflowX: 'auto' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tert)', whiteSpace: 'nowrap', alignSelf: 'center', marginRight: 2 }}>Switch:</span>
            {subjects.map(sub => {
              const a  = getAccent(sub.name)
              const on = heroSubject?.id === sub.id
              return (
                <button key={sub.id} onClick={() => setModal(sub)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 999, flexShrink: 0, cursor: 'pointer', background: on ? `${a}18` : 'var(--bg-subtle)', border: `1.5px solid ${on ? a : 'var(--border)'}`, transition: 'all .12s' }}>
                  <span style={{ fontSize: 12 }}>{getIcon(sub.name)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: on ? a : 'var(--text-sec)', whiteSpace: 'nowrap' }}>{sub.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Progress snapshot ── */}
      <ProgressSnapshot subjects={subjectForSnap} overallPct={overallPct} weekTotal={weekTotal} />

      {/* ── Mock exam ── */}
      <button onClick={() => router.push('/student/exam')}
        style={{ width: '100%', padding: '16px 18px', borderRadius: 18, cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', marginTop: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(255,195,107,.12)', border: '1px solid rgba(255,195,107,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📝</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 2 }}>Mock exam</p>
          <p style={{ fontSize: 11, color: 'var(--text-sec)' }}>Full WAEC or JAMB simulation</p>
        </div>
        <span style={{ fontSize: 16, color: 'var(--text-tert)' }}>›</span>
      </button>

      {/* Modal */}
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
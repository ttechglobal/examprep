'use client'
// src/components/battle/BattleSetup.jsx
// Battle setup flow shared by both opponents:
//   exam → subject → battle mode (random / topic) → match settings
//
//   <BattleSetup opponent="computer"/>  → /student/battle/setup   (starts a battle vs the computer)
//   <BattleSetup opponent="friend"/>    → /student/battle/1v1/create (creates a 1v1 battle + code)
//
// For friends the timer is always on (10–60 s), because each round needs an end.
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getLocalExamType, getLocalSubjects, readSubjectIdCache, writeSubjectIdCache } from '@/lib/localProfile'
import { pvpCall, PVP_TIMER_OPTIONS } from '@/lib/pvp/client'
import PvpNotice from '@/components/battle/PvpNotice'
import Image from 'next/image'

const NAVY = '#12195A', NAVY2 = '#1A2468', GOLD = '#FFB800', GOLD2 = '#CC8F00'

const SUBJ_STYLE = {
  'Chemistry':            { g:['#7C3AED','#9333EA'], icon:'⚗️' },
  'Physics':              { g:['#DB2777','#EC4899'], icon:'⚡' },
  'Biology':              { g:['#059669','#10B981'], icon:'🧬' },
  'Mathematics':          { g:['#0369A1','#0EA5E9'], icon:'📐' },
  'Further Mathematics':  { g:['#0369A1','#0EA5E9'], icon:'📐' },
  'English Language':     { g:['#DC2626','#EF4444'], icon:'📖' },
  'Use of English':       { g:['#DC2626','#EF4444'], icon:'📖' },
  'Economics':            { g:['#D97706','#F59E0B'], icon:'📊' },
  'Government':           { g:['#065F46','#059669'], icon:'🏛️' },
  'Geography':            { g:['#1D4ED8','#3B82F6'], icon:'🌍' },
  'Literature in English':{ g:['#9333EA','#A855F7'], icon:'📚' },
  'Agricultural Science': { g:['#15803D','#22C55E'], icon:'🌱' },
  'Commerce':             { g:['#B45309','#D97706'], icon:'💼' },
  'Accounting':           { g:['#1E40AF','#3B82F6'], icon:'🧮' },
  'default':              { g:['#4338CA','#6366F1'], icon:'📝' },
}
const getStyle = n => SUBJ_STYLE[n] ?? SUBJ_STYLE.default

// ── Battle Background (same image as main battle page) ────────────────────────
function BattleBg() {
  return (
    <div style={{ position:'absolute', inset:0, zIndex:0 }}>
      <Image
        src="/images/battle/battle-bg.png"
        alt=""
        fill
        priority
        style={{ objectFit:'cover', objectPosition:'center bottom' }}
      />
      {/* Overlay — slightly heavier so cards pop */}
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(180deg, rgba(8,18,80,.62) 0%, rgba(8,18,80,.48) 50%, rgba(8,18,80,.70) 100%)',
      }}/>
    </div>
  )
}

// ── Nav bar ───────────────────────────────────────────────────────────────────
function GameNav({ onBack, backLabel, title }) {
  return (
    <div style={{
      flexShrink:0, zIndex:100,
      background:'rgba(8,16,70,.72)',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      borderBottom:'1px solid rgba(255,255,255,.1)',
      boxShadow:'0 4px 20px rgba(0,0,0,.3)',
      paddingTop:'env(safe-area-inset-top)',
    }}>
      {/* 1fr | title | 1fr keeps the title centred whatever the back label's width */}
      <div style={{ maxWidth:860, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', gap:12, padding:'12px 24px 11px' }}>
        <button onClick={onBack} style={{
          justifySelf:'start', display:'flex', alignItems:'center', gap:6,
          background:'rgba(255,255,255,.13)', border:'1.5px solid rgba(255,255,255,.22)',
          borderRadius:10, padding:'7px 14px', color:'#fff', fontSize:12, fontWeight:800,
          cursor:'pointer', fontFamily:'inherit',
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6l4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {backLabel}
        </button>
        <div style={{ fontSize:15, fontWeight:900, color:'#fff', letterSpacing:'-.02em' }}>{title}</div>
      </div>
    </div>
  )
}

// ── Step progress bar ─────────────────────────────────────────────────────────
function StepBar({ current, total }) {
  return (
    <div style={{ maxWidth:860, margin:'14px auto 0', padding:'0 24px', display:'flex', gap:6, boxSizing:'border-box', width:'100%' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex:1, height:4, borderRadius:999,
          background: i < current ? GOLD : i === current ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.18)',
          boxShadow: i === current ? '0 0 8px rgba(255,184,0,.4)' : i < current ? '0 0 6px rgba(255,184,0,.3)' : 'none',
          transition:'all .3s',
        }}/>
      ))}
    </div>
  )
}

// ── Glass panel wrapper ───────────────────────────────────────────────────────
function Panel({ children, style }) {
  return (
    <div style={{
      background:'rgba(12,20,90,.72)',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      border:'1px solid rgba(255,255,255,.13)',
      borderRadius:24,
      padding:'20px 20px',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'.12em', color:'rgba(255,255,255,.45)', marginBottom:12 }}>
      {children}
    </div>
  )
}

// ── Bottom CTA ────────────────────────────────────────────────────────────────
function BottomCTA({ label, onClick, disabled, gold }) {
  const shadow    = gold ? `0 5px 0 ${GOLD2},0 8px 20px rgba(255,184,0,.35)` : `0 5px 0 #031548,0 8px 20px rgba(26,36,104,.35)`
  const shadowPrs = gold ? `0 1px 0 ${GOLD2}` : `0 1px 0 #031548`
  const bg        = disabled ? 'rgba(255,255,255,.12)' : gold ? `linear-gradient(135deg,${GOLD},#FBBF24)` : 'linear-gradient(135deg,#1264E5,#062A78)'
  const color     = disabled ? 'rgba(255,255,255,.3)' : gold ? NAVY : '#fff'
  return (
    <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:20 }}>
      <div style={{ maxWidth:860, margin:'0 auto', padding:'14px 24px 32px', background:'linear-gradient(to top, rgba(8,16,70,.95) 60%, transparent)' }}>
        <button
          onClick={disabled ? undefined : onClick}
          disabled={disabled}
          style={{ width:'100%', padding:'15px', borderRadius:18, border:'none', background:bg, color, fontSize:15, fontWeight:900, fontFamily:'inherit', cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing:'-.01em', boxShadow: disabled ? 'none' : shadow, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
          onPointerDown={disabled ? undefined : e => { e.currentTarget.style.transform='translateY(3px)'; e.currentTarget.style.boxShadow=shadowPrs }}
          onPointerUp={disabled ? undefined : e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=shadow }}
          onPointerLeave={disabled ? undefined : e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=shadow }}
        >
          {label}
        </button>
      </div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid rgba(255,255,255,.15)', borderTopColor:'#fff', animation:'spin .7s linear infinite', margin:'20px auto' }}/>
}

// ── Exams ─────────────────────────────────────────────────────────────────────
const STEPS = 4
const EXAMS = [
  { v:'WAEC', label:'WAEC', desc:'West African Senior School Certificate' },
  { v:'JAMB', label:'JAMB', desc:'UTME · University admission' },
]

// Exam logo slot. Drop the real logos at public/images/waec-logo.png and
// public/images/jamb-logo.png (the same files the mock exam uses). Until a
// file exists, a clean initials badge shows instead.
const EXAM_COLORS = { WAEC: '#16A34A', JAMB: '#7C3AED' }
// A parent can resize it from CSS by setting --exam-logo (e.g. 112px).
function ExamLogo({ exam, size = 56 }) {
  const [failed, setFailed] = useState(false)
  const color = EXAM_COLORS[exam] ?? '#1264E5'
  const px = `var(--exam-logo, ${size}px)`
  return (
    <div style={{
      width:px, height:px, borderRadius:`calc(${px} * .28)`, flexShrink:0,
      background:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
      overflow:'hidden', padding: failed ? 0 : `calc(${px} * .1)`, boxSizing:'border-box',
      boxShadow:'0 3px 0 rgba(0,0,0,.25)',
    }}>
      {failed
        ? <span style={{ fontSize:`calc(${px} * .26)`, fontWeight:900, color, letterSpacing:'-.02em' }}>{exam}</span>
        : <img src={`/images/${exam.toLowerCase()}-logo.png`} alt={`${exam} logo`}
            onError={() => setFailed(true)}
            style={{ width:'100%', height:'100%', objectFit:'contain' }}/>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
const COMPUTER_TIMER_OPTIONS = [{ v:15,l:'Quick' },{ v:30,l:'Normal' },{ v:45,l:'Relaxed' },{ v:60,l:'Chill' }]

export default function BattleSetup({ opponent = 'computer' }) {
  const router  = useRouter()
  const vsFriend = opponent === 'friend'
  const hubPath  = vsFriend ? '/student/battle/1v1' : '/student/battle'

  // Flow: exam → subject → battle mode (random / topic) → match settings.
  const [exam,      setExam]      = useState(null)
  const [subjects,  setSubjects]  = useState([])
  const [topics,    setTopics]    = useState([])
  const [loadingS,  setLoadingS]  = useState(false)
  const [loadingT,  setLoadingT]  = useState(false)
  const [subject,   setSubject]   = useState(null)
  const [qSet,      setQSet]      = useState(null)
  const [topic,     setTopic]     = useState(null)
  const [count,     setCount]     = useState(10)
  const [timerOn,   setTimerOn]   = useState(true)   // on by default — most students never found the toggle
  const [timerSec,  setTimerSec]  = useState(30)
  const [step,      setStep]      = useState('exam')
  const [creating,  setCreating]  = useState(false)
  const [pvpError,  setPvpError]  = useState(null)

  // Pre-select the profile's main exam.
  useEffect(() => {
    setExam(getLocalExamType() || 'WAEC')
  }, [])

  function chooseExam(v) {
    if (v === exam) return
    setExam(v)
    setSubject(null); setQSet(null); setTopic(null); setTopics([])
  }

  // Load the chosen exam's subjects — shared cache first (ep_subject_ids in
  // localStorage, also written by the practice page), then the API. Subject
  // ids differ per exam, so the list always matches the exam picked above.
  useEffect(() => {
    if (!exam) return
    let cancelled = false
    const localNames = getLocalSubjects(exam)
    if (!localNames?.length) { setSubjects([]); setSubject(null); setLoadingS(false); return }

    const cached = readSubjectIdCache(exam)
    if (cached?.length) {
      const cachedNames = new Set(cached.map(s => s.name))
      if (localNames.every(n => cachedNames.has(n))) {
        const rows = localNames.map(n => cached.find(s => s.name === n)).filter(Boolean)
        setSubjects(rows)
        setSubject(prev => rows.find(r => r.name === prev?.name) ?? rows[0] ?? null)
        setLoadingS(false)
        return
      }
    }

    // Cache miss — show name-only stubs while real ids load, so the UI is never blank.
    setSubjects(localNames.map(n => ({ id: null, name: n })))
    setSubject(null)
    setLoadingS(true)
    fetch(`/api/student/subjects?exam=${exam}&names=${encodeURIComponent(localNames.join(','))}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !Array.isArray(data) || !data.length) return
        const rows = data.map(s => ({ id: s.id, name: s.name }))
        writeSubjectIdCache(exam, rows)
        setSubjects(rows)
        setSubject(rows[0] ?? null)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingS(false) })
    return () => { cancelled = true }
  }, [exam])

  // Load topics for the chosen subject + exam (pre-fetched so Topic Drill is
  // instant). Cached in localStorage for 24h with stale-while-revalidate.
  useEffect(() => {
    if (!subject?.id || !exam) return
    const cacheKey = `battle_topics_${subject.id}_${exam}`
    const TTL      = 24 * 60 * 60 * 1000
    const url      = `/api/student/topics?subject_id=${subject.id}&exam=${exam}`
    const save     = d => { try { localStorage.setItem(cacheKey, JSON.stringify({ topics: d, ts: Date.now() })) } catch {} }

    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const { topics: cached, ts } = JSON.parse(raw)
        if (Array.isArray(cached) && cached.length && Date.now() - ts < TTL) {
          setTopics(cached)
          setLoadingT(false)
          fetch(url).then(r => r.ok ? r.json() : null)
            .then(d => { if (Array.isArray(d) && d.length) { setTopics(d); save(d) } })
            .catch(() => {})
          return
        }
      }
    } catch {}

    setLoadingT(true)
    setTopics([])
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d) && d.length) { setTopics(d); save(d) } })
      .catch(() => {})
      .finally(() => setLoadingT(false))
  }, [subject?.id, exam])

  function handleStart() {
    // Exam is chosen first and subjects are loaded for that exam, so the
    // subject id already belongs to the right exam — no re-resolving needed.
    const config = {
      opponent:'computer',
      exam,
      subject_id: subject.id, subject_name: subject.name,
      questionSet: qSet,
      topic_id:   qSet === 'topic' ? topic?.id   : null,
      topic_name: qSet === 'topic' ? topic?.name : null,
      count, timerEnabled: timerOn, timerSecs: timerOn ? timerSec : null,
    }
    try { sessionStorage.setItem('battle_config', JSON.stringify(config)) } catch {}
    router.push('/student/battle/session')
  }
  // 1v1: the database picks the questions and returns the battle code.
  async function handleCreate() {
    if (creating) return
    setCreating(true)
    const settings = {
      p_exam: exam, p_subject_id: subject.id,
      p_topic_id: qSet === 'topic' ? topic?.id ?? null : null,
      p_question_count: count, p_timer_secs: timerSec,
    }
    const res = await pvpCall('pvp_create', settings)
    setCreating(false)
    if (!res.ok) { setPvpError(res.error); return }
    router.push(`/student/battle/1v1/lobby?m=${res.match_id}`)
  }


  // ── STEP 1: EXAM SELECTION ─────────────────────────────────────────────────
  if (step === 'exam') return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`
        .ecard { transition: transform .12s }
        .ecard:hover { transform: translateY(-3px) }
        .ecard:active { transform: translateY(2px) }
        .egrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px }
        .ecard-in { --exam-logo: 60px; border-radius: 17px; padding: 18px 16px; display: flex; align-items: center; gap: 14px;
                    position: relative; overflow: hidden; text-align: left }
        .ecard-text  { flex: 1; min-width: 0 }
        .ecard-title { font-size: 18px; font-weight: 900; color: #fff; letter-spacing: -.01em }
        .ecard-desc  { font-size: 11px; color: rgba(255,255,255,.55); margin-top: 3px; line-height: 1.35 }
        .ecard-count { font-size: 10px; font-weight: 800; margin-top: 6px }
        /* Desktop: two big cards, logo on top */
        @media (min-width: 768px) {
          .egrid { grid-template-columns: 1fr 1fr; gap: 20px }
          .ecard-in { --exam-logo: 112px; flex-direction: column; justify-content: center; text-align: center;
                      gap: 18px; padding: 36px 28px 32px; min-height: 320px }
          .ecard-text  { flex: none }
          .ecard-title { font-size: 28px }
          .ecard-desc  { font-size: 14px; margin-top: 8px; line-height: 1.5 }
          .ecard-count { font-size: 13px; margin-top: 12px }
        }
      `}</style>
      <BattleBg/>
      <GameNav onBack={() => router.push(hubPath)} backLabel={vsFriend ? '1v1' : 'Battle'} title="Choose Exam"/>
      <StepBar current={0} total={STEPS}/>

      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', position:'relative', zIndex:5, paddingBottom:120 }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 24px 0' }}>
          <Panel>
            <SectionLabel>Which exam are you battling for?</SectionLabel>
            <div className="egrid">
              {EXAMS.map(({ v, label, desc }) => {
                const sel = exam === v
                const n   = getLocalSubjects(v).length
                return (
                  <button key={v} className="ecard"
                    onClick={() => chooseExam(v)}
                    style={{
                      border:`2.5px solid ${sel ? GOLD : 'rgba(255,255,255,.12)'}`,
                      borderRadius:20, padding:0, background:'none', cursor:'pointer', outline:'none',
                      boxShadow: sel ? `0 6px 0 rgba(0,0,0,.3), 0 0 0 2px ${GOLD}44` : '0 5px 0 rgba(0,0,0,.2)',
                    }}>
                    <div className="ecard-in" style={{ background: sel ? `linear-gradient(135deg,${NAVY},#1264E5)` : 'rgba(255,255,255,.08)' }}>
                      <ExamLogo exam={v}/>
                      <div className="ecard-text">
                        <div className="ecard-title">{label}</div>
                        <div className="ecard-desc">{desc}</div>
                        <div className="ecard-count" style={{ color: n ? '#FCD34D' : 'rgba(255,255,255,.4)' }}>
                          {n ? `${n} subject${n === 1 ? '' : 's'} on your profile` : 'No subjects added yet'}
                        </div>
                      </div>
                      {sel && (
                        <div style={{ position:'absolute', top:10, right:10, width:22, height:22, borderRadius:'50%', background:GOLD, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <svg width="11" height="11" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </Panel>
        </div>
      </div>

      <BottomCTA label="Continue →" onClick={() => setStep('subject')} disabled={!exam}/>
    </div>
  )

  // ── STEP 2: SUBJECT SELECTION ──────────────────────────────────────────────
  if (step === 'subject') return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .scard{transition:transform .12s,box-shadow .12s} .scard:hover{transform:translateY(-3px)} .scard:active{transform:translateY(2px)}`}</style>
      <BattleBg/>
      <GameNav onBack={() => setStep('exam')} backLabel="Exam" title="Choose Subject"/>
      <StepBar current={1} total={STEPS}/>

      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', position:'relative', zIndex:5, paddingBottom:120 }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 24px 0' }}>

          <Panel>
            <SectionLabel>Your {exam} Subjects</SectionLabel>
            {loadingS ? <Spinner/> : subjects.length === 0 ? (
              <div style={{ textAlign:'center', padding:'22px 8px' }}>
                <div style={{ fontSize:14, fontWeight:800, color:'#fff' }}>No {exam} subjects yet</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.55)', marginTop:6, lineHeight:1.5 }}>
                  Add your {exam} subjects on your profile, or go back and pick another exam.
                </div>
                <button onClick={() => router.push('/student/profile')}
                  style={{ marginTop:14, border:'1.5px solid rgba(255,255,255,.25)', background:'rgba(255,255,255,.1)', color:'#fff', borderRadius:12, padding:'9px 16px', fontSize:12, fontWeight:800, fontFamily:'inherit', cursor:'pointer' }}>
                  Go to profile
                </button>
              </div>
            ) : (
              <div style={{
                display:'grid',
                gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))',
                gap:12,
              }}>
                {subjects.map(s => {
                  const st  = getStyle(s.name)
                  const sel = subject?.name === s.name
                  return (
                    <button key={s.id ?? s.name} className="scard"
                      onClick={() => setSubject(s)}
                      style={{
                        border:`2.5px solid ${sel ? GOLD : 'transparent'}`,
                        borderRadius:18, padding:0, background:'none', cursor:'pointer',
                        outline:'none',
                        boxShadow: sel
                          ? `0 0 0 2px ${GOLD}55, 0 8px 0 rgba(0,0,0,.25), 0 10px 24px rgba(0,0,0,.2)`
                          : '0 6px 0 rgba(0,0,0,.22), 0 8px 18px rgba(0,0,0,.15)',
                      }}>
                      <div style={{
                        background:`linear-gradient(135deg,${st.g[0]},${st.g[1]})`,
                        borderRadius:15, padding:'18px 14px 14px',
                        display:'flex', flexDirection:'column', alignItems:'flex-start',
                        minHeight:110, position:'relative', overflow:'hidden',
                      }}>
                        {/* Sheen */}
                        <div style={{ position:'absolute', top:0, left:0, right:0, height:'45%', background:'linear-gradient(to bottom,rgba(255,255,255,.25),transparent)', borderRadius:'13px 13px 0 0', pointerEvents:'none' }}/>
                        {/* Press shadow */}
                        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:8, background:'rgba(0,0,0,.22)', borderRadius:'0 0 14px 14px', pointerEvents:'none' }}/>
                        {/* Large decorative background icon */}
                        <div style={{ position:'absolute', right:-6, bottom:-8, fontSize:72, lineHeight:1, opacity:.18, pointerEvents:'none', filter:'blur(1px)', userSelect:'none' }}>{st.icon}</div>
                        {/* Foreground icon */}
                        <div style={{ fontSize:30, marginBottom:8, filter:'drop-shadow(0 2px 4px rgba(0,0,0,.25))', position:'relative', zIndex:1 }}>{st.icon}</div>
                        <div style={{ fontSize:13, fontWeight:900, color:'#fff', letterSpacing:'-.01em', position:'relative', zIndex:1, textAlign:'left', lineHeight:1.25 }}>{s.name}</div>
                        {s.question_count > 0 && <div style={{ fontSize:9, color:'rgba(255,255,255,.65)', fontWeight:700, marginTop:3, position:'relative', zIndex:1 }}>{s.question_count} questions</div>}
                        {sel && (
                          <div style={{ position:'absolute', top:8, right:8, width:22, height:22, borderRadius:'50%', background:GOLD, border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 6px rgba(0,0,0,.3)', zIndex:10 }}>
                            <svg width="11" height="11" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {subject && (
              <div style={{ marginTop:16, background:`linear-gradient(135deg,${getStyle(subject.name).g[0]},${getStyle(subject.name).g[1]})`, borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, boxShadow:'0 5px 0 rgba(0,0,0,.25)' }}>
                <span style={{ fontSize:22 }}>{getStyle(subject.name).icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:900, color:'#fff' }}>{subject.name} selected</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.65)' }}>Tap Continue to pick your mission</div>
                </div>
                <svg style={{ marginLeft:'auto' }} width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8h8M9 5l3 3-3 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            )}
          </Panel>
        </div>
      </div>

      <BottomCTA label="Continue →" onClick={() => { setQSet(null); setTopic(null); setStep('missions') }} disabled={!subject?.id}/>
    </div>
  )

  // ── STEP 3: MISSION SELECTION ──────────────────────────────────────────────
  if (step === 'missions') return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .mcard{transition:transform .12s} .mcard:hover{transform:translateY(-2px)} .mcard:active{transform:translateY(1px)} .trow{transition:background .1s} .trow:hover{filter:brightness(1.06)}`}</style>
      <BattleBg/>
      <GameNav onBack={() => setStep('subject')} backLabel="Subjects" title="Pick Mission"/>
      <StepBar current={2} total={STEPS}/>

      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', position:'relative', zIndex:5, paddingBottom:120 }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 24px 0' }}>
          <Panel>

            {/* Subject banner */}
            <div style={{ background:`linear-gradient(135deg,${getStyle(subject.name).g[0]},${getStyle(subject.name).g[1]})`, borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, marginBottom:20, boxShadow:'0 5px 0 rgba(0,0,0,.25)' }}>
              <span style={{ fontSize:24 }}>{getStyle(subject.name).icon}</span>
              <div>
                <div style={{ fontSize:15, fontWeight:900, color:'#fff' }}>{subject.name}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.65)' }}>{exam} · Choose your battle mode</div>
              </div>
            </div>

            {/* Mode cards */}
            <SectionLabel>Battle Mode</SectionLabel>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
              {[
                { v:'random', icon:'🎲', name:'Random Mix',  desc:'All topics shuffled' },
                { v:'topic',  icon:'🎯', name:'Topic Drill', desc:'Master one topic'    },
              ].map(({ v, icon, name, desc }) => {
                const sel = qSet === v
                return (
                  <button key={v} className="mcard"
                    onClick={() => { setQSet(v); setTopic(null) }}
                    style={{
                      border:`2.5px solid ${sel ? GOLD : 'rgba(255,255,255,.12)'}`,
                      borderRadius:18, padding:0, background:'none', cursor:'pointer', outline:'none',
                      boxShadow: sel ? `0 6px 0 rgba(0,0,0,.3), 0 0 0 2px ${GOLD}44` : '0 5px 0 rgba(0,0,0,.2)',
                    }}>
                    <div style={{ background: sel ? `linear-gradient(135deg,${NAVY},#1264E5)` : 'rgba(255,255,255,.08)', borderRadius:15, padding:'18px 16px 15px', minHeight:100, display:'flex', flexDirection:'column', alignItems:'flex-start', position:'relative', overflow:'hidden' }}>
                      {sel && <div style={{ position:'absolute', top:0, left:0, right:0, height:'40%', background:'linear-gradient(to bottom,rgba(255,255,255,.1),transparent)', pointerEvents:'none' }}/>}
                      <div style={{ fontSize:28, marginBottom:8, position:'relative', zIndex:1 }}>{icon}</div>
                      <div style={{ fontSize:14, fontWeight:900, color:'#fff', position:'relative', zIndex:1 }}>{name}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.55)', marginTop:3, position:'relative', zIndex:1 }}>{desc}</div>
                      {sel && (
                        <div style={{ position:'absolute', top:10, right:10, width:20, height:20, borderRadius:'50%', background:GOLD, display:'flex', alignItems:'center', justifyContent:'center', zIndex:5 }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Topic list — only for Topic Drill */}
            {qSet === 'topic' && (
              <>
                <SectionLabel>Select Topic</SectionLabel>
                {loadingT ? <Spinner/> : topics.length === 0
                  ? <div style={{ textAlign:'center', color:'rgba(255,255,255,.45)', fontSize:13, padding:'20px 0' }}>No topics found for this subject.</div>
                  : topics.map((t, i) => {
                    const sel = topic?.id === t.id
                    return (
                      <button key={t.id} className="trow"
                        onClick={() => setTopic(t)}
                        style={{ width:'100%', border:`2px solid ${sel ? GOLD : 'rgba(255,255,255,.1)'}`, borderRadius:14, padding:0, background:'none', cursor:'pointer', outline:'none', marginBottom:8, boxShadow: sel ? `0 5px 0 rgba(0,0,0,.25), 0 0 0 2px ${GOLD}33` : '0 4px 0 rgba(0,0,0,.15)' }}>
                        <div style={{ background: sel ? 'rgba(255,184,0,.12)' : 'rgba(255,255,255,.07)', borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:12, position:'relative' }}>
                          <div style={{ width:36, height:36, borderRadius:11, background: sel ? GOLD : 'rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color: sel ? NAVY : 'rgba(255,255,255,.7)', flexShrink:0, boxShadow: sel ? `0 3px 0 ${GOLD2}` : '0 2px 0 rgba(0,0,0,.2)' }}>{i + 1}</div>
                          <div style={{ flex:1, textAlign:'left' }}>
                            <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>{t.name}</div>
                            {t.question_count > 0 && <div style={{ fontSize:10, color:'rgba(255,255,255,.45)', marginTop:2 }}>{t.question_count} questions</div>}
                          </div>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8h8M9 5l3 3-3 3" stroke={sel ? GOLD : 'rgba(255,255,255,.4)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </button>
                    )
                  })
                }
              </>
            )}
          </Panel>
        </div>
      </div>

      <BottomCTA label="Continue →" onClick={() => setStep('config')} disabled={!qSet || (qSet === 'topic' && !topic)}/>
    </div>
  )

  // ── STEP 4: MATCH SETTINGS (count + timer) ─────────────────────────────────
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <BattleBg/>
      <GameNav onBack={() => setStep('missions')} backLabel="Mission" title="Match Settings"/>
      <StepBar current={3} total={STEPS}/>

      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', position:'relative', zIndex:5, paddingBottom:120 }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 24px 0', display:'flex', flexDirection:'column', gap:14 }}>

          {/* Questions + Timer side by side on desktop */}
          <Panel>
            <SectionLabel>Number of Questions</SectionLabel>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
              {[{ v:5,sub:'~3 min' },{ v:10,sub:'~6 min',pop:true },{ v:15,sub:'~9 min' },{ v:20,sub:'~12 min' }].map(({ v, sub, pop }) => {
                const sel = count === v
                return (
                  <button key={v} onClick={() => setCount(v)}
                    style={{ border:`2px solid ${sel ? GOLD : 'rgba(255,255,255,.12)'}`, borderRadius:14, padding:0, background:'none', cursor:'pointer', outline:'none', position:'relative', boxShadow: sel ? `0 5px 0 rgba(0,0,0,.3), 0 0 0 2px ${GOLD}44` : '0 4px 0 rgba(0,0,0,.18)' }}>
                    <div style={{ background: sel ? `linear-gradient(135deg,${GOLD},#FBBF24)` : 'rgba(255,255,255,.08)', borderRadius:12, padding:'14px 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:3, position:'relative', overflow:'hidden' }}>
                      {pop && !sel && <div style={{ position:'absolute', top:4, right:4, fontSize:7, fontWeight:900, background:GOLD, color:NAVY, borderRadius:999, padding:'1px 5px', textTransform:'uppercase', zIndex:2 }}>Popular</div>}
                      <div style={{ fontSize:24, fontWeight:900, color: sel ? NAVY : '#fff', lineHeight:1 }}>{v}</div>
                      <div style={{ fontSize:9, color: sel ? NAVY2 : 'rgba(255,255,255,.5)', fontWeight:700 }}>{sub}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            <SectionLabel>Timer</SectionLabel>
            <div style={{ background:'rgba(255,255,255,.07)', border:'1.5px solid rgba(255,255,255,.12)', borderRadius:14, padding:'13px 16px', marginBottom: timerOn || vsFriend ? 12 : 0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>⏱ Time per question</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', marginTop:2 }}>
                  {vsFriend ? `${timerSec}s for both of you to answer each question`
                    : timerOn ? `${timerSec}s per question` : 'No time limit'}
                </div>
              </div>
              {!vsFriend && (
                <button onClick={() => setTimerOn(t => !t)} aria-label="Toggle timer"
                  style={{ width:46, height:26, borderRadius:13, border:`1.5px solid ${timerOn ? GOLD : 'rgba(255,255,255,.2)'}`, background: timerOn ? GOLD : 'rgba(255,255,255,.08)', cursor:'pointer', padding:0, position:'relative', flexShrink:0, transition:'background .15s' }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background: timerOn ? NAVY : '#fff', position:'absolute', top:2, left: timerOn ? 22 : 2, transition:'left .15s', boxShadow:'0 1px 4px rgba(0,0,0,.3)' }}/>
                </button>
              )}
            </div>

            {(timerOn || vsFriend) && (
              <div style={{ display:'grid', gridTemplateColumns: vsFriend ? 'repeat(3,1fr)' : 'repeat(4,1fr)', gap:8 }}>
                {(vsFriend ? PVP_TIMER_OPTIONS : COMPUTER_TIMER_OPTIONS).map(({ v, l }) => {
                  const sel = timerSec === v
                  return (
                    <button key={v} onClick={() => setTimerSec(v)}
                      style={{ border:`2px solid ${sel ? GOLD : 'rgba(255,255,255,.12)'}`, borderRadius:12, padding:0, background:'none', cursor:'pointer', outline:'none', boxShadow: sel ? `0 4px 0 rgba(0,0,0,.25)` : '0 3px 0 rgba(0,0,0,.15)' }}>
                      <div style={{ background: sel ? `linear-gradient(135deg,${GOLD},#FBBF24)` : 'rgba(255,255,255,.08)', borderRadius:10, padding:'11px 4px', textAlign:'center' }}>
                        <div style={{ fontSize:15, fontWeight:900, color: sel ? NAVY : '#fff' }}>{v}s</div>
                        <div style={{ fontSize:9, color: sel ? NAVY2 : 'rgba(255,255,255,.5)', fontWeight:700 }}>{l}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Panel>

          {/* Match summary */}
          <Panel style={{ padding:'14px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <ExamLogo exam={exam} size={40}/>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:900, color:'#fff' }}>{exam} · {subject?.name}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.55)', marginTop:2 }}>
                  {qSet === 'topic' ? `Topic Drill · ${topic?.name ?? ''}` : 'Random Mix'} · {vsFriend ? 'vs a friend' : 'vs Computer'}
                </div>
              </div>
            </div>
          </Panel>

        </div>
      </div>

      <BottomCTA
        label={vsFriend ? (creating ? 'Creating…' : '⚔️  Create battle') : '⚔️  Start Battle'}
        onClick={vsFriend ? handleCreate : handleStart}
        disabled={creating}
        gold/>
      <PvpNotice error={pvpError} onClose={() => setPvpError(null)} onRetry={pvpError === 'PVP_FULL' ? () => { setPvpError(null); handleCreate() } : undefined}/>
    </div>
  )
}
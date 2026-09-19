'use client'
// src/app/student/battle/setup/page.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getLocalExamType, getLocalSubjects } from '@/lib/localProfile'
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
function GameNav({ onBack, backLabel, title, xp }) {
  return (
    <div style={{
      flexShrink:0, zIndex:100,
      background:'rgba(8,16,70,.72)',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      borderBottom:'1px solid rgba(255,255,255,.1)',
      boxShadow:'0 4px 20px rgba(0,0,0,.3)',
      paddingTop:'env(safe-area-inset-top)',
    }}>
      <div style={{ maxWidth:860, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 24px 11px' }}>
        <button onClick={onBack} style={{
          display:'flex', alignItems:'center', gap:6,
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
        {xp != null
          ? <div style={{ background:'rgba(255,184,0,.15)', border:'1.5px solid rgba(255,184,0,.3)', borderRadius:10, padding:'6px 12px', fontSize:11, fontWeight:900, color:'#FCD34D', display:'flex', alignItems:'center', gap:4 }}>⚡ {xp.toLocaleString()}</div>
          : <div style={{ width:72 }}/>
        }
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

// ─────────────────────────────────────────────────────────────────────────────
export default function BattleSetupPage() {
  const router = useRouter()

  const [subjects,  setSubjects]  = useState([])
  const [topics,    setTopics]    = useState([])
  const [loadingS,  setLoadingS]  = useState(true)
  const [loadingT,  setLoadingT]  = useState(false)
  const [subject,   setSubject]   = useState(null)
  const [qSet,      setQSet]      = useState(null)
  const [topic,     setTopic]     = useState(null)
  const [count,     setCount]     = useState(10)
  const [timerOn,   setTimerOn]   = useState(false)
  const [timerSec,  setTimerSec]  = useState(30)
  const [step,      setStep]      = useState('subject')
  const [xp,        setXp]        = useState(null)

  // Load subjects — local cache first, then API with ID resolution.
  // Must pass names= so the API returns real UUIDs (Path A).
  // Without names= it hits the auth-based Path B which returns a plain array
  // with no .subjects property, so IDs never resolve and topic fetch never fires.
  useEffect(() => {
    const exam       = getLocalExamType() || 'WAEC'
    const localNames = getLocalSubjects(exam)   // string[] from localProfile
    if (localNames?.length) {
      setSubjects(localNames.map(n => ({ id: null, name: n })))
      setLoadingS(false)
    }
    if (!localNames?.length) { setLoadingS(false); return }
    // Fetch with names so the API resolves real UUIDs
    fetch(`/api/student/subjects?exam=${exam}&names=${encodeURIComponent(localNames.join(','))}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        // API returns a plain array of { id, name, slug, exam_type }
        if (Array.isArray(d) && d.length) {
          setSubjects(d)
          // If a subject was already selected as a stub (id: null), upgrade it
          setSubject(prev => {
            if (!prev || prev.id) return prev
            const match = d.find(s => s.name === prev.name)
            return match ?? prev
          })
        }
      })
      .catch(() => {}).finally(() => setLoadingS(false))
    fetch('/api/student/battle/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.stats?.total_battle_xp != null) setXp(d.stats.total_battle_xp) })
      .catch(() => {})
  }, [])

  // Load topics — fires whenever subject ID changes (pre-fetch so topics are
  // ready before the user clicks Topic Drill). Matches practice page pattern.
  // Cached in localStorage for 24h with stale-while-revalidate.
  useEffect(() => {
    if (!subject?.id) return
    const exam     = getLocalExamType() || 'WAEC'
    const cacheKey = `battle_topics_${subject.id}_${exam}`
    const TTL      = 24 * 60 * 60 * 1000

    // Serve from cache immediately if fresh
    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const { topics: cached, ts } = JSON.parse(raw)
        if (Array.isArray(cached) && cached.length && Date.now() - ts < TTL) {
          setTopics(cached)
          setLoadingT(false)
          // Revalidate silently in background
          fetch(`/api/student/topics?subject_id=${subject.id}&exam=${exam}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              if (Array.isArray(d) && d.length) {
                setTopics(d)
                try { localStorage.setItem(cacheKey, JSON.stringify({ topics: d, ts: Date.now() })) } catch {}
              }
            }).catch(() => {})
          return
        }
      }
    } catch {}

    // No valid cache — fetch fresh
    setLoadingT(true)
    setTopics([])
    fetch(`/api/student/topics?subject_id=${subject.id}&exam=${exam}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (Array.isArray(d) && d.length) {
          setTopics(d)
          try { localStorage.setItem(cacheKey, JSON.stringify({ topics: d, ts: Date.now() })) } catch {}
        }
      })
      .catch(() => {}).finally(() => setLoadingT(false))
  }, [subject?.id])

  function handleStart() {
    const config = {
      opponent:'computer',
      subject_id: subject.id, subject_name: subject.name,
      questionSet: qSet,
      topic_id:   qSet === 'topic' ? topic?.id   : null,
      topic_name: qSet === 'topic' ? topic?.name : null,
      count, timerEnabled: timerOn, timerSecs: timerOn ? timerSec : null,
    }
    try { sessionStorage.setItem('battle_config', JSON.stringify(config)) } catch {}
    router.push('/student/battle/session')
  }

  // ── STEP 1: SUBJECT SELECTION ──────────────────────────────────────────────
  if (step === 'subject') return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .scard{transition:transform .12s,box-shadow .12s} .scard:hover{transform:translateY(-3px)} .scard:active{transform:translateY(2px)}`}</style>
      <BattleBg/>
      <GameNav onBack={() => router.push('/student/battle')} backLabel="Battle" title="Choose Subject" xp={xp}/>
      <StepBar current={0} total={3}/>

      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', position:'relative', zIndex:5, paddingBottom:120 }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 24px 0' }}>

          <Panel>
            <SectionLabel>Your Subjects</SectionLabel>
            {loadingS ? <Spinner/> : (
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

      <BottomCTA label="Continue →" onClick={() => { setQSet(null); setTopic(null); setStep('missions') }} disabled={!subject}/>
    </div>
  )

  // ── STEP 2: MISSION SELECTION ──────────────────────────────────────────────
  if (step === 'missions') return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .mcard{transition:transform .12s} .mcard:hover{transform:translateY(-2px)} .mcard:active{transform:translateY(1px)} .trow{transition:background .1s} .trow:hover{filter:brightness(1.06)}`}</style>
      <BattleBg/>
      <GameNav onBack={() => setStep('subject')} backLabel="Subjects" title="Pick Mission" xp={xp}/>
      <StepBar current={1} total={3}/>

      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', position:'relative', zIndex:5, paddingBottom:120 }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 24px 0' }}>
          <Panel>

            {/* Subject banner */}
            <div style={{ background:`linear-gradient(135deg,${getStyle(subject.name).g[0]},${getStyle(subject.name).g[1]})`, borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, marginBottom:20, boxShadow:'0 5px 0 rgba(0,0,0,.25)' }}>
              <span style={{ fontSize:24 }}>{getStyle(subject.name).icon}</span>
              <div>
                <div style={{ fontSize:15, fontWeight:900, color:'#fff' }}>{subject.name}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.65)' }}>Choose your battle mode</div>
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
                          {sel && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:`linear-gradient(to bottom,${GOLD},#FF6A00)`, borderRadius:'4px 0 0 4px' }}/>}
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

  // ── STEP 3: CONFIG (Count + Timer + Match Preview) ─────────────────────────
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <BattleBg/>
      <GameNav onBack={() => setStep('missions')} backLabel="Mission" title="Match Settings" xp={xp}/>
      <StepBar current={2} total={3}/>

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
            <div style={{ background:'rgba(255,255,255,.07)', border:'1.5px solid rgba(255,255,255,.12)', borderRadius:14, padding:'13px 16px', marginBottom: timerOn ? 12 : 0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>⏱ Time per question</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', marginTop:2 }}>{timerOn ? `${timerSec}s per question` : 'No time limit'}</div>
              </div>
              <button onClick={() => setTimerOn(t => !t)}
                style={{ width:46, height:26, borderRadius:13, border:`1.5px solid ${timerOn ? GOLD : 'rgba(255,255,255,.2)'}`, background: timerOn ? GOLD : 'rgba(255,255,255,.08)', cursor:'pointer', padding:0, position:'relative', flexShrink:0, transition:'background .15s' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background: timerOn ? NAVY : '#fff', position:'absolute', top:2, left: timerOn ? 22 : 2, transition:'left .15s', boxShadow:'0 1px 4px rgba(0,0,0,.3)' }}/>
              </button>
            </div>

            {timerOn && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {[{ v:15,l:'Quick' },{ v:30,l:'Normal' },{ v:45,l:'Relaxed' },{ v:60,l:'Chill' }].map(({ v, l }) => {
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

          {/* Match preview card */}
          <Panel>
            <SectionLabel>Your Match</SectionLabel>
            <div style={{ background:`linear-gradient(135deg,${NAVY},#1264E5)`, borderRadius:16, overflow:'hidden', boxShadow:'0 6px 0 rgba(0,0,0,.3)', border:'1px solid rgba(255,255,255,.1)' }}>
              {/* VS header */}
              <div style={{ padding:'16px 18px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 52px 1fr', alignItems:'center', gap:8 }}>
                  {/* Player */}
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', border:'2px solid rgba(255,255,255,.4)', background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 2px 8px rgba(0,0,0,.2)' }}>🎓</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:900, color:'#fff' }}>You</div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,.55)' }}>Challenger</div>
                    </div>
                  </div>
                  {/* VS */}
                  <div style={{ display:'flex', justifyContent:'center' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:GOLD, color:NAVY, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, fontStyle:'italic', boxShadow:`0 3px 0 ${GOLD2}` }}>VS</div>
                  </div>
                  {/* Computer */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexDirection:'row-reverse' }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', border:'2px solid rgba(255,255,255,.4)', background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 2px 8px rgba(0,0,0,.2)' }}>🤖</div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:13, fontWeight:900, color:'#fff' }}>Computer</div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,.55)' }}>Difficulty: Easy</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Match details strip */}
              <div style={{ background:'rgba(0,0,0,.25)', padding:'12px 18px', display:'flex', gap:20, flexWrap:'wrap', alignItems:'center', borderTop:'1px solid rgba(255,255,255,.08)' }}>
                {[
                  { icon: getStyle(subject.name).icon, val: subject.name,                                        label:'Subject' },
                  { icon:'🎯', val: qSet === 'topic' ? (topic?.name ?? '—') : 'Random Mix',                     label:'Mode'    },
                  { icon:'📋', val: `${count} questions · ${timerOn ? timerSec + 's timer' : 'No timer'}`,      label:'Settings' },
                ].map(({ icon, val, label }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:16 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:900, color:'#fff' }}>{val}</div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,.45)' }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

        </div>
      </div>

      <BottomCTA label="⚔️  Start Battle" onClick={handleStart} gold/>
    </div>
  )
}
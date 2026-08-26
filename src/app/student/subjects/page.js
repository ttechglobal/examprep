'use client'
// src/app/student/subjects/page.js
// Subject selection page — used in two contexts:
//   1. First-time setup: after onboarding, before first practice session
//   2. Settings: reached from profile page to change subjects
//
// The page fetches all available subjects from the DB for the selected exam,
// lets the student pick theirs, and saves via PATCH /api/student/subjects.

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/contexts/ThemeContext'
import Link from 'next/link'

// ─── BRAND ────────────────────────────────────────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const RED    = '#f43f5e'

const SUBJECT_COLOR = {
  'Mathematics':          '#FF6A00',
  'Further Mathematics':  '#FF6A00',
  'English Language':     '#22c55e',
  'Use of English':       '#22c55e',
  'Physics':              '#7C3AED',
  'Chemistry':            '#1264E5',
  'Biology':              '#18B7F2',
  'Economics':            '#f43f5e',
  'Government':           '#9b7ae0',
  'Geography':            '#34d399',
  'Literature in English':'#f9a8d4',
  'Agricultural Science': '#86efac',
  'Commerce':             '#818cf8',
  'Accounting':           '#fde68a',
  'default':              '#1264E5',
}
const SUBJECT_ICON = {
  'Mathematics':'🧮','Further Mathematics':'📐',
  'English Language':'📖','Use of English':'📖',
  'Physics':'⚡','Chemistry':'⚗️','Biology':'🧬',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📝',
}
const col  = n => SUBJECT_COLOR[n] ?? SUBJECT_COLOR.default
const icon = n => SUBJECT_ICON[n]  ?? SUBJECT_ICON.default

// ─── BG ───────────────────────────────────────────────────────────────────────
function AppBackground({ dark }) {
  return (
    <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage: dark?'radial-gradient(circle,rgba(255,255,255,.03) 1px,transparent 1px)':'radial-gradient(circle,rgba(6,42,120,.06) 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>
      {dark?(<>
        <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', background:'rgba(18,100,229,.08)', filter:'blur(70px)', top:-100, right:-80 }}/>
        <div style={{ position:'absolute', width:280, height:280, borderRadius:'50%', background:'rgba(6,42,120,.15)', filter:'blur(60px)', bottom:-80, left:-80 }}/>
      </>):(<>
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(18,100,229,.05)', filter:'blur(60px)', top:-60, right:-40 }}/>
        <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'rgba(255,184,0,.04)', filter:'blur(50px)', bottom:-40, left:-50 }}/>
      </>)}
    </div>
  )
}

// ─── SUBJECT CARD ─────────────────────────────────────────────────────────────
function SubjectCard({ subject, selected, onClick }) {
  const c = col(subject.name)
  const i = icon(subject.name)
  return (
    <button
      onClick={() => onClick(subject.name)}
      style={{
        display:'flex', flexDirection:'column', alignItems:'flex-start', gap:0,
        padding:'16px 16px 14px', borderRadius:18,
        border:`2px solid ${selected ? c : 'var(--border)'}`,
        background: selected ? `${c}10` : 'var(--bg-card)',
        cursor:'pointer', textAlign:'left', fontFamily:'inherit',
        transition:'all .15s', position:'relative', overflow:'hidden',
        boxShadow: selected ? `0 4px 16px ${c}25` : '0 1px 8px rgba(6,42,120,.05)',
        transform: selected ? 'translateY(-1px)' : 'none',
      }}
    >
      {/* Selected checkmark */}
      {selected && (
        <div style={{ position:'absolute', top:10, right:10, width:22, height:22, borderRadius:'50%', background:c, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      )}

      {/* Icon */}
      <div style={{ width:44, height:44, borderRadius:14, background:`${c}16`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:10, flexShrink:0 }}>{i}</div>

      {/* Name */}
      <div style={{ fontSize:13, fontWeight:800, color: selected ? c : 'var(--text-prim)', lineHeight:1.3, paddingRight:selected?20:0 }}>{subject.name}</div>

      {/* Question count */}
      {subject.question_count > 0 && (
        <div style={{ fontSize:10, fontWeight:600, color:'var(--text-tert)', marginTop:4 }}>
          {subject.question_count.toLocaleString()} questions
        </div>
      )}
      {subject.question_count === 0 && (
        <div style={{ fontSize:10, fontWeight:600, color:ORANGE, marginTop:4 }}>Coming soon</div>
      )}
    </button>
  )
}

// ─── EXAM TAB ─────────────────────────────────────────────────────────────────
function ExamTabs({ exams, active, onChange }) {
  return (
    <div style={{ display:'flex', background:'var(--bg-card)', borderRadius:14, padding:4, border:'1px solid var(--border)', gap:3 }}>
      {exams.map(e => {
        const on = e === active
        return (
          <button key={e} onClick={() => onChange(e)} style={{ flex:1, padding:'10px 0', borderRadius:10, fontSize:14, fontWeight:on?900:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:on?BLUE:'transparent', color:on?'#fff':'var(--text-tert)', boxShadow:on?`0 2px 10px ${BLUE}40`:'none', transition:'all .15s' }}>{e}</button>
        )
      })}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SubjectSetupPage() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const { dark }    = useTheme()

  // from=practice means redirect back to practice after saving
  // from=profile means redirect back to profile
  const from = searchParams?.get('from') ?? 'practice'

  const [profileExams,    setProfileExams]    = useState(['WAEC','JAMB'])
  const [activeExam,      setActiveExam]      = useState('WAEC')
  const [allSubjects,     setAllSubjects]     = useState({}) // { WAEC: [...], JAMB: [...] }
  const [selected,        setSelected]        = useState({}) // { WAEC: Set, JAMB: Set }
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState('')
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  // Load profile + existing subject selections
  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/onboarding'); return }

        const { data: prof } = await supabase
          .from('profiles')
          .select('exam_type, subjects, subjects_waec, subjects_jamb')
          .eq('id', user.id)
          .single()

        if (prof) {
          // Determine which exams this student has
          const exams = prof.exam_type === 'BOTH'
            ? ['WAEC','JAMB']
            : [prof.exam_type ?? 'WAEC']
          setProfileExams(exams)
          setActiveExam(exams[0])

          // Pre-populate selections from saved profile data
          const waecSaved = prof.subjects_waec ?? prof.subjects ?? []
          const jambSaved = prof.subjects_jamb ?? []
          setSelected({
            WAEC: new Set(waecSaved),
            JAMB: new Set(jambSaved),
          })
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    init()
  }, [])

  // Load available subjects from DB whenever exam tab changes
  useEffect(() => {
    if (!activeExam) return
    if (allSubjects[activeExam]) return // already loaded

    setLoadingSubjects(true)
    fetch(`/api/admin/subjects?exam=${activeExam}&active=true&limit=50`)
      .then(r => r.json())
      .then(data => {
        // Admin subjects API returns { subjects: [...] }
        const list = data.subjects ?? data ?? []
        setAllSubjects(prev => ({ ...prev, [activeExam]: list }))
      })
      .catch(() => {
        // Fallback: use student subjects API (returns only student's own subjects)
        // but for setup we need ALL available subjects
        setAllSubjects(prev => ({ ...prev, [activeExam]: [] }))
      })
      .finally(() => setLoadingSubjects(false))
  }, [activeExam])

  function toggle(subjectName) {
    setSelected(prev => {
      const current = new Set(prev[activeExam] ?? [])
      if (current.has(subjectName)) current.delete(subjectName)
      else current.add(subjectName)
      return { ...prev, [activeExam]: current }
    })
  }

  async function save() {
    const waecSel = [...(selected.WAEC ?? new Set())]
    const jambSel = [...(selected.JAMB ?? new Set())]

    // Validate: must have at least 1 subject for at least one exam
    const hasAny = waecSel.length > 0 || jambSel.length > 0
    if (!hasAny) {
      setError('Please select at least one subject.')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Save WAEC subjects
      if (profileExams.includes('WAEC')) {
        const r = await fetch('/api/student/subjects', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exam: 'WAEC', subjects: waecSel }),
        })
        if (!r.ok) throw new Error('Failed to save WAEC subjects')
      }

      // Save JAMB subjects
      if (profileExams.includes('JAMB')) {
        const r = await fetch('/api/student/subjects', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exam: 'JAMB', subjects: jambSel }),
        })
        if (!r.ok) throw new Error('Failed to save JAMB subjects')
      }

      // Redirect based on where we came from
      if (from === 'practice') router.push('/student/practice?modal=1')
      else if (from === 'profile') router.push('/student/profile')
      else router.push('/student/home')

    } catch (e) {
      setError(e.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const subjects       = allSubjects[activeExam] ?? []
  const selCount       = (selected[activeExam] ?? new Set()).size
  const totalSelected  = (selected.WAEC?.size ?? 0) + (selected.JAMB?.size ?? 0)

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid var(--border)`, borderTopColor:BLUE, animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>
      <AppBackground dark={dark}/>

      <div style={{ minHeight:'100dvh', position:'relative', zIndex:1, display:'flex', flexDirection:'column', maxWidth:640, margin:'0 auto', padding:'0 0 120px' }}>

        {/* Header */}
        <div style={{ padding:'20px 20px 0', display:'flex', alignItems:'center', gap:12 }}>
          <Link href={from === 'profile' ? '/student/profile' : '/student/practice'} style={{ textDecoration:'none' }}>
            <div style={{ width:36, height:36, borderRadius:11, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </Link>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em' }}>
              {from === 'profile' ? 'Edit subjects' : 'Choose your subjects'}
            </div>
            <div style={{ fontSize:12, color:'var(--text-tert)', marginTop:2 }}>
              {from === 'profile' ? 'Change what you study and practise' : 'Select all the subjects you want to practise'}
            </div>
          </div>
        </div>

        {/* Exam tabs — only show if student has both exams */}
        {profileExams.length > 1 && (
          <div style={{ padding:'16px 20px 0' }}>
            <ExamTabs exams={profileExams} active={activeExam} onChange={setActiveExam}/>
          </div>
        )}

        {/* Instruction */}
        <div style={{ padding:'16px 20px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:13, color:'var(--text-tert)' }}>
            {selCount > 0
              ? <><span style={{ fontWeight:800, color:BLUE }}>{selCount}</span> subject{selCount !== 1 ? 's' : ''} selected for {activeExam}</>
              : `Tap to select your ${activeExam} subjects`
            }
          </div>
          {selCount > 0 && (
            <button onClick={() => setSelected(p => ({ ...p, [activeExam]: new Set() }))} style={{ fontSize:11, fontWeight:700, color:RED, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0 }}>Clear all</button>
          )}
        </div>

        {/* Subject grid */}
        <div style={{ flex:1, padding:'0 20px' }}>
          {loadingSubjects ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[...Array(6)].map((_,i) => (
                <div key={i} style={{ height:96, borderRadius:18, background:'var(--bg-card)', border:'1px solid var(--border)', animation:'pulse 1.5s ease-in-out infinite', opacity:.6 }}/>
              ))}
              <style>{`@keyframes pulse{0%,100%{opacity:.6}50%{opacity:.3}}`}</style>
            </div>
          ) : subjects.length === 0 ? (
            <div style={{ padding:'40px 0', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📚</div>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No subjects found</div>
              <div style={{ fontSize:13, color:'var(--text-tert)', lineHeight:1.6 }}>
                {activeExam} subjects haven't been added to the platform yet.<br/>
                Contact your admin or try a different exam.
              </div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {subjects.map(subject => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  selected={(selected[activeExam] ?? new Set()).has(subject.name)}
                  onClick={toggle}
                />
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ margin:'12px 20px 0', padding:'12px 14px', borderRadius:12, background:`${RED}10`, border:`1px solid ${RED}30`, fontSize:13, color:RED }}>
            {error}
          </div>
        )}

        {/* Fixed bottom CTA */}
        <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:640, padding:'16px 20px', paddingBottom:'max(20px,env(safe-area-inset-bottom))', background:dark?'rgba(10,13,28,.95)':'rgba(249,250,255,.97)', backdropFilter:'blur(16px)', borderTop:'1px solid var(--border)' }}>
          {/* Summary of selections */}
          {totalSelected > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              {profileExams.map(exam => {
                const count = selected[exam]?.size ?? 0
                if (count === 0) return null
                return (
                  <div key={exam} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background:BLUE+'14', border:`1px solid ${BLUE}25` }}>
                    <span style={{ fontSize:10, fontWeight:800, color:BLUE }}>{exam}</span>
                    <span style={{ fontSize:10, fontWeight:600, color:'var(--text-tert)' }}>{count} subject{count!==1?'s':''}</span>
                  </div>
                )
              })}
            </div>
          )}

          <button
            onClick={save}
            disabled={saving || totalSelected === 0}
            style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', cursor:saving||totalSelected===0?'not-allowed':'pointer', background:totalSelected===0?'var(--border)':BLUE, color:'#fff', fontSize:15, fontWeight:900, fontFamily:'inherit', boxShadow:totalSelected>0?`0 5px 0 #0a3fa0,0 8px 24px ${BLUE}40`:'none', transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
          >
            {saving ? (
              <><div style={{ width:18, height:18, borderRadius:'50%', border:'2.5px solid rgba(255,255,255,.4)', borderTopColor:'#fff', animation:'spin .7s linear infinite' }}/> Saving…</>
            ) : totalSelected === 0 ? 'Select at least one subject' : (
              <>Save & start practising →</>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
'use client'
// src/app/student/profile/page.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// Profile page — redesigned with three grouped modal sheets:
//
//   Sheet 1 — My Information  : name, username, bio, class, school
//   Sheet 2 — Exams & Subjects: which exams → then subjects per exam
//   Sheet 3 — Goals & Targets : university, course, per-subject WAEC grades,
//                               JAMB target score
//
// XP comes from PointsContext (no local xp state).
// Layout shell (sidebar, bottom nav, background) comes from student/layout.js.
// This page renders its own topbar and content only.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/contexts/ThemeContext'
import { usePoints } from '@/contexts/PointsContext'
import { DesktopTopbar, MobileTopbar } from '@/components/student/StudentTopbar'
import Link from 'next/link'

// ── Brand ─────────────────────────────────────────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const RED    = '#f43f5e'
const CYAN   = '#18B7F2'

// ── Rank ladder ───────────────────────────────────────────────────────────────
const RANKS = [
  { name:'Bronze',    minXp:0,     maxXp:1000,  color:'#cd7f32', icon:'🥉' },
  { name:'Silver I',  minXp:1000,  maxXp:3000,  color:'#9ca3af', icon:'🥈' },
  { name:'Silver II', minXp:3000,  maxXp:5000,  color:'#6b7280', icon:'🥈' },
  { name:'Gold I',    minXp:5000,  maxXp:8000,  color:GOLD,      icon:'🥇' },
  { name:'Gold II',   minXp:8000,  maxXp:12000, color:GOLD,      icon:'🥇' },
  { name:'Platinum',  minXp:12000, maxXp:20000, color:CYAN,      icon:'💎' },
  { name:'Diamond',   minXp:20000, maxXp:35000, color:BLUE,      icon:'💠' },
  { name:'Legend',    minXp:35000, maxXp:Infinity, color:ORANGE, icon:'👑' },
]
const getRank     = xp => RANKS.find(r => xp >= r.minXp && xp < r.maxXp) ?? RANKS[RANKS.length - 1]
const getNextRank = xp => { const i = RANKS.findIndex(r => xp >= r.minXp && xp < r.maxXp); return RANKS[i + 1] ?? null }

// ── Subject meta ──────────────────────────────────────────────────────────────
const SUBJ_COLOR = {
  'Mathematics':'#FF6A00','Further Mathematics':'#FF6A00',
  'English Language':'#22c55e','Use of English':'#22c55e',
  'Physics':'#7C3AED','Chemistry':'#1264E5','Biology':'#18B7F2',
  'Economics':'#f43f5e','Government':'#9b7ae0','Geography':'#34d399',
  'Literature in English':'#f9a8d4','Agricultural Science':'#86efac',
  'Commerce':'#818cf8','Accounting':'#fde68a','default':'#1264E5',
}
const SUBJ_ICON = {
  'Mathematics':'🧮','Further Mathematics':'📐',
  'English Language':'📖','Use of English':'📖',
  'Physics':'⚡','Chemistry':'⚗️','Biology':'🧬',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📝',
}
const sc = n => SUBJ_COLOR[n] ?? SUBJ_COLOR.default
const si = n => SUBJ_ICON[n]  ?? SUBJ_ICON.default

// WAEC grade options
const WAEC_GRADES = ['A1','B2','B3','C4','C5','C6','D7','E8','F9']

// Class levels
const CLASS_LEVELS = ['JSS1','JSS2','JSS3','SS1','SS2','SS3']

// ── Shared primitives ─────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border)', overflow:'hidden', ...style }}>
      {children}
    </div>
  )
}

function SectionLabel({ children, action }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
      <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>{children}</span>
      {action}
    </div>
  )
}

function Row({ icon, label, value, onTap, last = false }) {
  const { dark } = useTheme()
  return (
    <div
      onClick={onTap}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 18px', borderBottom:last?'none':'1px solid var(--border)', cursor:onTap?'pointer':'default', transition:'background .1s' }}
      onMouseEnter={e => { if (onTap) e.currentTarget.style.background = dark?'rgba(255,255,255,.03)':'rgba(6,42,120,.02)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {icon && <span style={{ fontSize:16, flexShrink:0 }}>{icon}</span>}
      <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--text-prim)' }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:12, color:'var(--text-tert)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value || 'Not set'}</span>
        {onTap && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </div>
  )
}

// ── Sheet backdrop + container ─────────────────────────────────────────────────
function Sheet({ title, onClose, children, wide = false }) {
  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.65)', backdropFilter:'blur(8px)', display:'flex', alignItems:'flex-end', justifyContent:'center', padding:0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <style>{`
        @keyframes ep-sheet-up { from { transform:translateY(100%) } to { transform:translateY(0) } }
        @keyframes ep-sheet-fade { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
      <div style={{
        width:'100%', maxWidth: wide ? 640 : 520,
        maxHeight:'92dvh', overflowY:'auto',
        background:'var(--bg-card)',
        borderRadius:'24px 24px 0 0',
        border:'1px solid var(--border)',
        boxShadow:'0 -8px 40px rgba(0,0,0,.4)',
        animation:'ep-sheet-up .3s cubic-bezier(0.32,0.72,0,1)',
        paddingBottom:'env(safe-area-inset-bottom, 16px)',
      }}>
        {/* Handle + header */}
        <div style={{ padding:'12px 20px 0', position:'sticky', top:0, background:'var(--bg-card)', zIndex:1 }}>
          <div style={{ width:36, height:4, borderRadius:999, background:'var(--border)', margin:'0 auto 14px' }}/>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:14, borderBottom:'1px solid var(--border)', marginBottom:20 }}>
            <span style={{ fontSize:18, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.025em' }}>{title}</span>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, background:'var(--bg-subtle)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div style={{ padding:'0 20px 24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Text input row ─────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, multiline = false, hint }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-tert)', marginBottom:6 }}>{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--bg-subtle)', color:'var(--text-prim)', fontSize:14, fontFamily:'inherit', outline:'none', resize:'none', lineHeight:1.5 }}
        />
      ) : (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--bg-subtle)', color:'var(--text-prim)', fontSize:14, fontFamily:'inherit', outline:'none' }}
        />
      )}
      {hint && <p style={{ fontSize:11, color:'var(--text-tert)', marginTop:5 }}>{hint}</p>}
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-tert)', marginBottom:6 }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--bg-subtle)', color:'var(--text-prim)', fontSize:14, fontFamily:'inherit', outline:'none', cursor:'pointer' }}
      >
        <option value="">Select…</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

function SaveButton({ onClick, saving, label = 'Save changes' }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', cursor:saving?'not-allowed':'pointer', fontFamily:'inherit', fontWeight:900, fontSize:15, background:`linear-gradient(135deg,${NAVY},${BLUE})`, color:'#fff', boxShadow:`0 4px 16px ${BLUE}40`, opacity:saving?0.7:1, marginTop:4 }}
    >
      {saving ? 'Saving…' : label}
    </button>
  )
}

// ── SHEET 1: My Information ────────────────────────────────────────────────────
function InfoSheet({ profile, onClose, onSaved }) {
  const [fullName,   setFullName]   = useState(profile?.full_name   ?? '')
  const [username,   setUsername]   = useState(profile?.username    ?? '')
  const [schoolName, setSchoolName] = useState(profile?.school_name ?? '')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/student/profile', {
        method:  'PATCH',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          full_name:   fullName.trim(),
          username:    username.trim(),
          school_name: schoolName.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      onSaved({ full_name:fullName.trim(), username:username.trim(), school_name:schoolName.trim() })
      onClose()
    } catch(e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet title="My Information" onClose={onClose}>
      <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Ada Okafor"/>
      <Field label="Username" value={username} onChange={setUsername} placeholder="ada_okafor" hint="Shown on the leaderboard"/>
      <Field
        label="School"
        value={schoolName}
        onChange={setSchoolName}
        placeholder="e.g. King's College Lagos"
        hint="You'll be able to connect to your school via a school code later"
      />
      {error && <p style={{ fontSize:12, color:RED, marginBottom:12 }}>{error}</p>}
      <SaveButton onClick={save} saving={saving}/>
    </Sheet>
  )
}

// ── SHEET 2: Exams & Subjects ──────────────────────────────────────────────────
function SubjectsSheet({ profile, onClose, onSaved }) {
  // Step 1 = choose exams, Step 2 = choose subjects per exam
  const [step,          setStep]          = useState(1)
  const [activeExams,   setActiveExams]   = useState(() => {
    const exams = []
    if (profile?.subjects_waec?.length || profile?.exam_types?.includes?.('WAEC')) exams.push('WAEC')
    if (profile?.subjects_jamb?.length || profile?.exam_types?.includes?.('JAMB')) exams.push('JAMB')
    return exams.length ? exams : ['WAEC']
  })
  const [currentExam,   setCurrentExam]   = useState(null)  // which exam we're editing subjects for
  const [waecSubjects,  setWaecSubjects]  = useState(profile?.subjects_waec ?? [])
  const [jambSubjects,  setJambSubjects]  = useState(profile?.subjects_jamb ?? [])
  const [allSubjects,   setAllSubjects]   = useState([])    // available from DB
  const [loadingSubjs,  setLoadingSubjs]  = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState(null)

  // Fetch available subjects when entering step 2
  useEffect(() => {
    if (!currentExam) return
    setLoadingSubjs(true)
    // Fetch ALL subjects for this exam type from the admin route (with explicit filter),
    // or fall back to a hardcoded list if the route doesn't support filtering.
    // The admin GET ignores query params so we filter client-side after fetch.
    fetch(`/api/admin/subjects`)
      .then(r => r.json())
      .then(d => {
        const raw = Array.isArray(d) ? d : (d.subjects ?? [])
        // Filter to the current exam, deduplicate by name
        const filtered = raw.filter(s => s.exam_type === currentExam && s.is_active !== false)
        const seen = new Set()
        const names = []
        for (const s of filtered) {
          const name = s.name ?? s
          if (!seen.has(name)) { seen.add(name); names.push(name) }
        }
        // Sort alphabetically but keep Use of English / English Language first
        names.sort((a, b) => {
          const priority = n => /english/i.test(n) ? 0 : /mathematics/i.test(n) ? 1 : 2
          return priority(a) - priority(b) || a.localeCompare(b)
        })
        setAllSubjects(names)
      })
      .catch(() => setAllSubjects([]))
      .finally(() => setLoadingSubjs(false))
  }, [currentExam])

  function toggleExam(exam) {
    setActiveExams(prev =>
      prev.includes(exam) ? prev.filter(e => e !== exam) : [...prev, exam]
    )
  }

  function goBackToExams() {
    setStep(1)
    // Reset subject list so it re-fetches cleanly if exam is changed
    setAllSubjects([])
    // Keep currentExam set so summary rows still show the right subjects
  }

  function toggleSubject(name, exam) {
    if (exam === 'WAEC') {
      setWaecSubjects(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])
    } else {
      // JAMB: max 4 subjects
      setJambSubjects(prev => {
        if (prev.includes(name)) return prev.filter(s => s !== name)
        if (prev.length >= 4) return prev  // silently cap at 4
        return [...prev, name]
      })
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const saves = []
      if (activeExams.includes('WAEC')) {
        saves.push(fetch('/api/student/subjects', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exam:'WAEC', subjects: waecSubjects }) }))
      }
      if (activeExams.includes('JAMB')) {
        saves.push(fetch('/api/student/subjects', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ exam:'JAMB', subjects: jambSubjects }) }))
      }
      const results = await Promise.all(saves)
      for (const res of results) {
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Save failed') }
      }
      onSaved({ subjects_waec: waecSubjects, subjects_jamb: jambSubjects, exam_types: activeExams })
      onClose()
    } catch(e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Step 1: exam toggles
  if (step === 1) {
    return (
      <Sheet title="Exams & Subjects" onClose={onClose}>
        <p style={{ fontSize:13, color:'var(--text-tert)', marginBottom:20, lineHeight:1.6 }}>
          Select the exams you are preparing for. You can pick both.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24 }}>
          {['WAEC','JAMB'].map(exam => {
            const on = activeExams.includes(exam)
            const meta = { WAEC:{ icon:'📋', desc:'WASSCE — 9 subjects' }, JAMB:{ icon:'🎓', desc:'UTME — 4 subjects' } }[exam]
            return (
              <button
                key={exam}
                onClick={() => toggleExam(exam)}
                style={{
                  padding:'18px 16px', borderRadius:16, cursor:'pointer', fontFamily:'inherit',
                  border: `2px solid ${on ? BLUE : 'var(--border)'}`,
                  background: on ? `${BLUE}10` : 'var(--bg-card)',
                  display:'flex', flexDirection:'column', alignItems:'flex-start', gap:6,
                  textAlign:'left', transition:'all .15s',
                }}
              >
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%' }}>
                  <span style={{ fontSize:22 }}>{meta.icon}</span>
                  {on && (
                    <div style={{ width:20, height:20, borderRadius:'50%', background:BLUE, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </div>
                <div style={{ fontSize:15, fontWeight:900, color: on ? BLUE : 'var(--text-prim)' }}>{exam}</div>
                <div style={{ fontSize:11, color:'var(--text-tert)' }}>{meta.desc}</div>
              </button>
            )
          })}
        </div>

        {/* Per-exam subject summary rows */}
        {activeExams.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <p style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-tert)', marginBottom:10 }}>Your subjects</p>
            {activeExams.map(exam => {
              const subs = exam === 'WAEC' ? waecSubjects : jambSubjects
              return (
                <div
                  key={exam}
                  onClick={() => { setCurrentExam(exam); setStep(2) }}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', borderRadius:13, border:'1px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', marginBottom:8 }}
                >
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>{exam} Subjects</div>
                    <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>
                      {subs.length > 0
                        ? subs.slice(0,3).map(s => typeof s === 'string' ? s : s.name ?? s).join(', ') + (subs.length > 3 ? ` +${subs.length - 3} more` : '')
                        : 'Tap to select subjects'}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              )
            })}
          </div>
        )}

        {error && <p style={{ fontSize:12, color:RED, marginBottom:12 }}>{error}</p>}
        <SaveButton onClick={save} saving={saving} label={`Save — ${activeExams.join(' & ')}`}/>
      </Sheet>
    )
  }

  // Step 2: subject picker for currentExam
  const selected = currentExam === 'WAEC' ? waecSubjects : jambSubjects
  const isJAMB   = currentExam === 'JAMB'

  return (
    <Sheet title={`${currentExam} Subjects`} onClose={onClose} wide>
      <button
        onClick={goBackToExams}
        style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, color:BLUE, background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0, marginBottom:16 }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to exams
      </button>

      {isJAMB && (
        <div style={{ padding:'10px 14px', borderRadius:11, background:`${ORANGE}10`, border:`1px solid ${ORANGE}30`, marginBottom:16 }}>
          <p style={{ fontSize:12, fontWeight:700, color:ORANGE, margin:0 }}>
            JAMB requires exactly 4 subjects — <strong>{selected.length}</strong> selected
          </p>
        </div>
      )}

      {loadingSubjs ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 0' }}>
          <div style={{ width:24, height:24, borderRadius:'50%', border:`2.5px solid var(--border)`, borderTopColor:BLUE, animation:'spin .7s linear infinite' }}/>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:10, marginBottom:20 }}>
          {allSubjects.map(name => {
            const on    = selected.includes(name)
            const color = sc(name)
            const capped = isJAMB && !on && selected.length >= 4
            return (
              <button
                key={name}
                onClick={() => !capped && toggleSubject(name, currentExam)}
                style={{
                  padding:'14px 12px', borderRadius:14, cursor: capped?'not-allowed':'pointer',
                  border: `2px solid ${on ? color : 'var(--border)'}`,
                  background: on ? `${color}12` : 'var(--bg-card)',
                  display:'flex', flexDirection:'column', alignItems:'flex-start', gap:5,
                  fontFamily:'inherit', textAlign:'left', opacity: capped ? 0.4 : 1,
                  transition:'all .12s',
                }}
              >
                <span style={{ fontSize:20 }}>{si(name)}</span>
                <span style={{ fontSize:12, fontWeight: on?800:600, color: on ? color : 'var(--text-prim)', lineHeight:1.3 }}>{name}</span>
                {on && (
                  <div style={{ width:16, height:16, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', alignSelf:'flex-end', marginTop:'auto' }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l1.8 1.8L6.5 2" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      <button
        onClick={goBackToExams}
        style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:900, fontSize:15, background:`linear-gradient(135deg,${NAVY},${BLUE})`, color:'#fff', boxShadow:`0 4px 16px ${BLUE}40` }}
      >
        Done — {selected.length} subject{selected.length !== 1 ? 's' : ''} selected
      </button>
    </Sheet>
  )
}

// ── SHEET 3: Goals & Targets ───────────────────────────────────────────────────
function GoalsSheet({ profile, onClose, onSaved, focus }) {
  // Tab: 'university' | 'jamb' | 'waec'
  // Determined by which row the user tapped, so the sheet opens to the right section
  const [activeTab, setActiveTab] = useState(() => {
    if (focus === 'jamb') return 'jamb'
    if (focus === 'waec') return 'waec'
    return 'university'
  })
  const [university,  setUniversity]  = useState(profile?.target_university ?? '')
  const [course,      setCourse]      = useState(profile?.target_course     ?? '')
  // Per-subject JAMB scores: { "Use of English": 75, "Mathematics": 80, ... }
  // Initialise from stored breakdown, or distribute stored total evenly, or default 50 each
  const [jambBreakdown, setJambBreakdown] = useState(() => {
    const jambSubs = profile?.subjects_jamb ?? []
    if (!jambSubs.length) return {}
    const stored = profile?.target_jamb_breakdown
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) return stored
    // If only a total is stored, spread it evenly as a starting point
    const total = profile?.target_jamb
    const each = (total && jambSubs.length) ? Math.round(total / jambSubs.length) : 50
    return Object.fromEntries(jambSubs.map(s => [s, each]))
  })
  // Per-subject WAEC grade targets: { subjectName: gradeString }
  const [waecGrades,  setWaecGrades]  = useState(() => {
    try {
      const stored = profile?.target_waec
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) return stored
      return {}
    } catch { return {} }
  })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  const waecSubs  = profile?.subjects_waec ?? []
  const jambSubs  = profile?.subjects_jamb ?? []

  // Default to 'jamb' tab if JAMB subjects are set but no WAEC; otherwise 'university'
  // (already handled by focus prop — this just ensures a valid tab is always active)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          target_university: university.trim(),
          target_course:     course.trim(),
          // Save total (for backward compat with practice page) and breakdown
          target_jamb:           Object.values(jambBreakdown).reduce((s, v) => s + v, 0) || null,
          target_jamb_breakdown: Object.keys(jambBreakdown).length ? jambBreakdown : null,
          target_waec:       waecGrades,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      const jambTotal = Object.values(jambBreakdown).reduce((s, v) => s + v, 0)
      onSaved({ target_university:university.trim(), target_course:course.trim(), target_jamb:jambTotal||null, target_jamb_breakdown:jambBreakdown, target_waec:waecGrades })
      onClose()
    } catch(e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Tab labels — only show tabs that are relevant (no JAMB tab if no JAMB subjects set)
  const tabs = [
    { id:'university', label:'🏛 University' },
    ...(jambSubs.length > 0 ? [{ id:'jamb', label:'📋 JAMB' }] : []),
    ...(waecSubs.length > 0 ? [{ id:'waec', label:'✏️ WAEC Grades' }] : []),
  ]

  return (
    <Sheet title="Goals & Targets" onClose={onClose}>

      {/* Tab switcher */}
      {tabs.length > 1 && (
        <div style={{ display:'flex', gap:6, marginBottom:20, background:'var(--bg-subtle)', borderRadius:12, padding:4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex:1, padding:'8px 10px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'inherit',
                fontWeight: activeTab === t.id ? 900 : 600, fontSize:12,
                background: activeTab === t.id ? 'var(--bg-card)' : 'transparent',
                color: activeTab === t.id ? BLUE : 'var(--text-tert)',
                boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                transition:'all .12s',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab: University & Course */}
      {activeTab === 'university' && (
        <>
          <Field label="Target university" value={university} onChange={setUniversity} placeholder="University of Lagos"/>
          <Field label="Target course" value={course} onChange={setCourse} placeholder="Medicine & Surgery"/>
        </>
      )}

      {/* Tab: JAMB per-subject score sliders */}
      {activeTab === 'jamb' && (
        <div>
          {/* Running total */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderRadius:14, background:`linear-gradient(135deg,${NAVY},${BLUE})`, marginBottom:20 }}>
            <div>
              <p style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:'.08em', margin:0 }}>Total JAMB Score</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,.5)', margin:'2px 0 0' }}>Each subject is out of 100</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <span style={{ fontSize:32, fontWeight:900, color:GOLD, lineHeight:1 }}>
                {Object.values(jambBreakdown).reduce((s,v) => s+v, 0)}
              </span>
              <span style={{ fontSize:14, color:'rgba(255,255,255,.5)', marginLeft:3 }}>/400</span>
            </div>
          </div>

          {jambSubs.length === 0 ? (
            <p style={{ fontSize:13, color:'var(--text-tert)', lineHeight:1.6 }}>
              Set your JAMB subjects first, then come back to set your score targets.
            </p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {jambSubs.map(subj => {
                const score = jambBreakdown[subj] ?? 50
                const pct   = score  // score IS the pct (0–100)
                const color = score >= 80 ? GREEN : score >= 60 ? BLUE : score >= 40 ? ORANGE : RED
                return (
                  <div key={subj}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:16 }}>{si(subj)}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>{subj}</span>
                      </div>
                      <span style={{ fontSize:16, fontWeight:900, color, minWidth:32, textAlign:'right' }}>{score}</span>
                    </div>
                    {/* Score bar track */}
                    <div style={{ position:'relative', height:36 }}>
                      <div style={{ position:'absolute', top:'50%', left:0, right:0, height:6, borderRadius:999, background:'var(--bg-subtle)', border:'1px solid var(--border)', transform:'translateY(-50%)' }}/>
                      <div style={{ position:'absolute', top:'50%', left:0, height:6, borderRadius:999, background:color, width:`${pct}%`, transform:'translateY(-50%)', transition:'width .15s' }}/>
                      <input
                        type="range" min={0} max={100} step={1}
                        value={score}
                        onChange={e => setJambBreakdown(prev => ({ ...prev, [subj]: Number(e.target.value) }))}
                        style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', opacity:0, cursor:'pointer', margin:0 }}
                      />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
                      <span style={{ fontSize:10, color:'var(--text-tert)' }}>0</span>
                      <span style={{ fontSize:10, color:'var(--text-tert)' }}>100</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: WAEC per-subject grade targets */}
      {activeTab === 'waec' && (
        <>
          <p style={{ fontSize:12, color:'var(--text-tert)', marginBottom:14, lineHeight:1.5 }}>
            Set your target grade for each subject. This helps us focus your practice where you need it most.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
            {waecSubs.map(subj => (
              <div key={subj} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-card)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:16 }}>{si(subj)}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>{subj}</span>
                </div>
                <select
                  value={waecGrades[subj] ?? ''}
                  onChange={e => setWaecGrades(prev => ({ ...prev, [subj]: e.target.value }))}
                  style={{ padding:'6px 10px', borderRadius:9, border:'1.5px solid var(--border)', background:'var(--bg-subtle)', color:'var(--text-prim)', fontSize:13, fontFamily:'inherit', outline:'none', cursor:'pointer', fontWeight:700 }}
                >
                  <option value="">Target…</option>
                  {WAEC_GRADES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </>
      )}

      {tabs.length === 0 && (
        <p style={{ fontSize:13, color:'var(--text-tert)', lineHeight:1.6, marginBottom:16 }}>
          Set your subjects first — then you can set per-subject grade targets here.
        </p>
      )}

      {error && <p style={{ fontSize:12, color:RED, marginBottom:12 }}>{error}</p>}
      <SaveButton onClick={save} saving={saving}/>
    </Sheet>
  )
}

// ── Avatar + rank card ─────────────────────────────────────────────────────────
function AvatarCard({ profile, xp, onEditInfo }) {
  const { dark } = useTheme()
  const rank    = getRank(xp)
  const next    = getNextRank(xp)
  const xpInLvl = xp - rank.minXp
  const xpRange = (next?.minXp ?? xp + 1) - rank.minXp
  const pct     = Math.min(100, xpRange > 0 ? Math.round((xpInLvl / xpRange) * 100) : 100)
  const level   = Math.floor(xp / 2000) + 1
  const dName   = profile?.full_name || profile?.username || 'Student'
  const initials = (dName || 'ST').slice(0, 2).toUpperCase()

  return (
    <Card>
      {/* Cover banner */}
      <div style={{ height:64, background:`linear-gradient(135deg,${NAVY},${BLUE})`, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, right:0, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.2),transparent 70%)', pointerEvents:'none' }}/>
      </div>

      <div style={{ padding:'0 20px 20px', position:'relative' }}>
        {/* Avatar */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop:-32, marginBottom:12 }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, border:'3px solid var(--bg-card)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:900, color:GOLD, flexShrink:0 }}>
            {initials}
          </div>
          <button
            onClick={onEditInfo}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:11, border:`1.5px solid ${BLUE}`, background:'transparent', cursor:'pointer', fontFamily:'inherit', fontWeight:800, fontSize:13, color:BLUE }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9.5 1.5l3 3L4 13H1v-3L9.5 1.5z" stroke={BLUE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Edit Profile
          </button>
        </div>

        {/* Name */}
        <div style={{ fontSize:20, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em', marginBottom:2 }}>{dName}</div>
        {profile?.username && <div style={{ fontSize:12, color:'var(--text-tert)', marginBottom:3 }}>@{profile.username}</div>}
        {profile?.school_name && <div style={{ fontSize:12, color:'var(--text-tert)', marginBottom:12 }}>🏫 {profile.school_name}</div>}
        {!profile?.school_name && <div style={{ marginBottom:12 }}/>}

        {/* Rank strip */}
        <div style={{ padding:'14px', borderRadius:14, background:dark?'rgba(255,255,255,.04)':'rgba(6,42,120,.04)', border:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:22 }}>{rank.icon}</span>
              <div>
                <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)' }}>{rank.name}</div>
                <div style={{ fontSize:10, color:'var(--text-tert)' }}>Level {level}</div>
              </div>
            </div>
            {next && (
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:13, fontWeight:900, color:BLUE }}>{(next.minXp - xp).toLocaleString()} XP</div>
                <div style={{ fontSize:10, color:'var(--text-tert)' }}>to {next.name}</div>
              </div>
            )}
          </div>
          <div style={{ height:6, borderRadius:999, background:dark?'rgba(255,255,255,.1)':'rgba(6,42,120,.08)', overflow:'hidden', marginBottom:6 }}>
            <div style={{ height:'100%', width:`${pct}%`, borderRadius:999, background:`linear-gradient(90deg,${rank.color},${next?.color??rank.color})`, transition:'width .8s ease' }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:10, color:'var(--text-tert)' }}>{xp.toLocaleString()} XP total</span>
            <Link href="/student/leaderboard" style={{ textDecoration:'none', fontSize:10, fontWeight:700, color:BLUE }}>View all ranks →</Link>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ── Goals summary card ─────────────────────────────────────────────────────────
function GoalsSummary({ profile, onEdit }) {
  const hasWaecGrades = profile?.target_waec && typeof profile.target_waec === 'object' && Object.keys(profile.target_waec).length > 0
  const waecSubs = profile?.subjects_waec ?? []

  return (
    <Card>
      {/* University */}
      <Row icon="🏛️" label="University"  value={profile?.target_university} onTap={onEdit}/>
      <Row icon="📚" label="Course"       value={profile?.target_course}     onTap={onEdit}/>
      <Row icon="📋" label="JAMB Target"
        value={profile?.target_jamb ? `${profile.target_jamb} / 400` : null}
        onTap={() => onEdit('jamb')}/>

      {/* WAEC per-subject grades */}
      {waecSubs.length > 0 && (
        <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.06em' }}>WAEC Grade Targets</span>
            <button onClick={onEdit} style={{ fontSize:11, fontWeight:700, color:BLUE, background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Edit →</button>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {waecSubs.map(subj => {
              const grade = hasWaecGrades ? profile.target_waec[subj] : null
              const color = grade ? (grade === 'A1' ? GREEN : grade.startsWith('B') ? BLUE : grade.startsWith('C') ? ORANGE : RED) : 'var(--text-tert)'
              return (
                <div key={subj} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:20, background:'var(--bg-subtle)', border:'1px solid var(--border)' }}>
                  <span style={{ fontSize:11, color:'var(--text-prim)', fontWeight:600 }}>{subj}</span>
                  <span style={{ fontSize:11, fontWeight:900, color }}>{grade || '—'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router         = useRouter()
  const { dark, toggle } = useTheme()
  const { totalPoints: xp } = usePoints()

  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [sheet,    setSheet]    = useState(null)  // null | { type: 'info'|'subjects'|'goals', focus?: string }

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        try { const g = JSON.parse(localStorage.getItem('ep_guest') || '{}'); setProfile({ ...g, isGuest:true }) } catch {}
        setLoading(false); return
      }
      const res = await fetch('/api/student/profile')
      if (res.ok) { const d = await res.json(); setProfile(d) }
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function patchProfile(updates) {
    setProfile(p => ({ ...p, ...updates }))
  }

  async function logout() {
    const s = createClient()
    await s.auth.signOut()
    router.replace('/onboarding')
  }

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid var(--border)`, borderTopColor:BLUE, animation:'spin .7s linear infinite' }}/>
    </div>
  )

  const dName   = profile?.full_name || profile?.username || 'Student'
  const isGuest = !!profile?.isGuest

  // Guest banner
  const guestBanner = isGuest && (
    <div style={{ borderRadius:16, padding:'16px 18px', background:`${ORANGE}08`, border:`1.5px solid ${ORANGE}30`, marginBottom:4 }}>
      <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:4 }}>Back up your progress 📲</div>
      <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5, marginBottom:10 }}>Create a free account to save progress and sync across devices.</div>
      <Link href="/register" style={{ textDecoration:'none' }}>
        <button style={{ padding:'9px 18px', borderRadius:10, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:900, fontSize:13, background:ORANGE, color:'#fff' }}>Create Free Account →</button>
      </Link>
    </div>
  )

  // Subjects section
  const subjectsSection = (
    <div>
      <SectionLabel action={<button onClick={() => setSheet('subjects')} style={{ fontSize:12, fontWeight:700, color:BLUE, background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Edit →</button>}>
        Exams & Subjects
      </SectionLabel>
      <Card>
        {['WAEC','JAMB'].map((exam, i) => {
          const subs = exam === 'WAEC' ? profile?.subjects_waec : profile?.subjects_jamb
          return (
            <div
              key={exam}
              onClick={() => setSheet('subjects')}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 18px', borderBottom: i === 0 ? '1px solid var(--border)' : 'none', cursor:'pointer' }}
            >
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>{exam}</div>
                <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>
                  {subs?.length ? subs.slice(0,3).join(', ') + (subs.length > 3 ? ` +${subs.length - 3}` : '') : 'Not set up'}
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          )
        })}
      </Card>
    </div>
  )

  // Goals section
  const goalsSection = (
    <div>
      <SectionLabel action={<button onClick={() => setSheet({ type:'goals', focus:null })} style={{ fontSize:12, fontWeight:700, color:BLUE, background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Edit →</button>}>
        Goals & Targets
      </SectionLabel>
      <GoalsSummary profile={profile} onEdit={(focus) => setSheet({ type:'goals', focus })}/>
    </div>
  )

  // Settings section
  const settingsSection = (
    <div>
      <SectionLabel>Settings</SectionLabel>
      <Card style={{ marginBottom:10 }}>
        <Row icon="🎨" label="Appearance"    value={dark?'Dark Mode':'Light Mode'} onTap={toggle}/>
        <Row icon="🔔" label="Notifications" value="On"/>
        <Row icon="🔑" label="Account"       value="Change password"/>
        <Row icon="🌐" label="Language"      value="English" last/>
      </Card>
      <button
        onClick={logout}
        style={{ width:'100%', padding:'13px', borderRadius:13, border:`1.5px solid ${RED}30`, cursor:'pointer', fontFamily:'inherit', fontWeight:800, fontSize:14, background:'transparent', color:RED, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
      >
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M7 16H3a1 1 0 01-1-1V3a1 1 0 011-1h4M12 13l4-4-4-4M16 9H7" stroke={RED} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Log Out
      </button>
    </div>
  )

  const premiumCard = (
    <div style={{ borderRadius:18, padding:'20px', background:`linear-gradient(135deg,${NAVY},${BLUE})`, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
      <div style={{ fontSize:13, fontWeight:900, color:'#fff', marginBottom:4 }}>👑 Upgrade to Premium</div>
      <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', lineHeight:1.5, marginBottom:14 }}>Unlimited practice, AI explanations, offline mode and more.</div>
      <button style={{ width:'100%', padding:'11px', borderRadius:11, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:900, fontSize:13, background:GOLD, color:NAVY }}>⚡ Activate Premium</button>
    </div>
  )

  const helpCard = (
    <Card>
      {[['❓','Help Center'],['💬','Contact Support'],['📩','Send Feedback']].map(([icon, label], i) => (
        <Row key={i} icon={icon} label={label} last={i === 2}/>
      ))}
    </Card>
  )

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} * {box-sizing:border-box}`}</style>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex" style={{ flex:1, minWidth:0, flexDirection:'column' }}>
        <DesktopTopbar name={dName}/>
        {guestBanner}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'flex-start' }}>
          {/* Left column */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <AvatarCard profile={profile} xp={xp} onEditInfo={() => setSheet('info')}/>
            {subjectsSection}
            {goalsSection}
          </div>
          {/* Right column — sticky */}
          <div style={{ position:'sticky', top:20, display:'flex', flexDirection:'column', gap:16 }}>
            {premiumCard}
            {settingsSection}
            {helpCard}
          </div>
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="lg:hidden" style={{ minHeight:'100dvh', paddingBottom:80 }}>
        <MobileTopbar title="Profile"/>
        <div style={{ padding:'16px 16px 0', display:'flex', flexDirection:'column', gap:18 }}>
          {guestBanner}
          <AvatarCard profile={profile} xp={xp} onEditInfo={() => setSheet('info')}/>
          {subjectsSection}
          {goalsSection}
          {premiumCard}
          {settingsSection}
          {helpCard}
        </div>
      </div>

      {/* ── SHEETS ── */}
      {(sheet === 'info' || sheet?.type === 'info') && (
        <InfoSheet
          profile={profile}
          onClose={() => setSheet(null)}
          onSaved={patchProfile}
        />
      )}
      {(sheet === 'subjects' || sheet?.type === 'subjects') && (
        <SubjectsSheet
          profile={profile}
          onClose={() => setSheet(null)}
          onSaved={patchProfile}
        />
      )}
      {(sheet?.type === 'goals' || sheet === 'goals') && (
        <GoalsSheet
          profile={profile}
          focus={sheet?.focus ?? null}
          onClose={() => setSheet(null)}
          onSaved={patchProfile}
        />
      )}
    </>
  )
}
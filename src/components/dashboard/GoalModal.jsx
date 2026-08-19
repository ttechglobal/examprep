'use client'
// src/components/dashboard/GoalModal.jsx — v6
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES vs v5:
//  • Accepts `initialPage` prop — callers can pass the page index to open
//    directly (e.g. profile edit page passes 0 for goals, 1 for JAMB subjects).
//    Default is 0 (same behaviour as before).
//  • Saves current page to sessionStorage on every page change, and restores
//    it on mount — so reopening the modal picks up where you left off within
//    the same session. Cleared on successful save.
//  • Added `mode` prop: 'full' (default, all steps) or 'subjects-only'
//    (skips Goals page, jumps straight to subject selection — for the
//    "Change subjects →" link in the practice modal).
//  • handleSave: writes subjects_waec and subjects_jamb as SEPARATE columns
//    so the practice page can show different lists per exam tab.
//    Also still writes the merged `subjects` column for backward compat.
//  • Falls back gracefully if subjects_waec/subjects_jamb columns don't exist.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const SUBJECT_STYLES = {
  'Mathematics':                 { bg: 'rgba(92,184,234,.15)',  text: '#5cb8ea',  border: 'rgba(92,184,234,.3)'  },
  'Further Mathematics':         { bg: 'rgba(92,184,234,.15)',  text: '#5cb8ea',  border: 'rgba(92,184,234,.3)'  },
  'English Language':            { bg: 'rgba(167,139,250,.15)', text: '#a78bfa',  border: 'rgba(167,139,250,.3)' },
  'Use of English':              { bg: 'rgba(167,139,250,.15)', text: '#a78bfa',  border: 'rgba(167,139,250,.3)' },
  'Physics':                     { bg: 'rgba(255,143,171,.15)', text: '#ff8fab',  border: 'rgba(255,143,171,.3)' },
  'Chemistry':                   { bg: 'rgba(155,122,224,.15)', text: '#9b7ae0',  border: 'rgba(155,122,224,.3)' },
  'Biology':                     { bg: 'rgba(108,206,142,.15)', text: '#6cce8e',  border: 'rgba(108,206,142,.3)' },
  'Economics':                   { bg: 'rgba(252,211,77,.15)',  text: '#fcd34d',  border: 'rgba(252,211,77,.3)'  },
  'Government':                  { bg: 'rgba(248,113,113,.15)', text: '#f87171',  border: 'rgba(248,113,113,.3)' },
  'Literature in English':       { bg: 'rgba(249,168,212,.15)', text: '#f9a8d4',  border: 'rgba(249,168,212,.3)' },
  'Geography':                   { bg: 'rgba(52,211,153,.15)',  text: '#34d399',  border: 'rgba(52,211,153,.3)'  },
  'Agricultural Science':        { bg: 'rgba(134,239,172,.15)', text: '#86efac',  border: 'rgba(134,239,172,.3)' },
  'Commerce':                    { bg: 'rgba(129,140,248,.15)', text: '#818cf8',  border: 'rgba(129,140,248,.3)' },
  'History':                     { bg: 'rgba(253,186,116,.15)', text: '#fdba74',  border: 'rgba(253,186,116,.3)' },
  'Accounting':                  { bg: 'rgba(253,224,138,.15)', text: '#fde68a',  border: 'rgba(253,224,138,.3)' },
  'Computer Science':            { bg: 'rgba(103,232,249,.15)', text: '#67e8f9',  border: 'rgba(103,232,249,.3)' },
  'Civic Education':             { bg: 'rgba(108,206,142,.15)', text: '#6cce8e',  border: 'rgba(108,206,142,.3)' },
  'Christian Religious Studies': { bg: 'rgba(216,180,254,.15)', text: '#d8b4fe',  border: 'rgba(216,180,254,.3)' },
  'Islamic Religious Studies':   { bg: 'rgba(253,186,116,.15)', text: '#fdba74',  border: 'rgba(253,186,116,.3)' },
  'Yoruba':                      { bg: 'rgba(252,211,77,.15)',  text: '#fcd34d',  border: 'rgba(252,211,77,.3)'  },
  'Igbo':                        { bg: 'rgba(252,211,77,.15)',  text: '#fcd34d',  border: 'rgba(252,211,77,.3)'  },
  'Hausa':                       { bg: 'rgba(252,211,77,.15)',  text: '#fcd34d',  border: 'rgba(252,211,77,.3)'  },
  'default':                     { bg: 'rgba(155,122,224,.15)', text: '#9b7ae0',  border: 'rgba(155,122,224,.3)' },
}
const getS = n => SUBJECT_STYLES[n] ?? SUBJECT_STYLES.default

const USE_OF_ENGLISH = 'Use of English'

const JAMB_ELECTIVES = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Economics', 'Government', 'Geography', 'History',
  'Commerce', 'Accounting', 'Agricultural Science', 'Further Mathematics',
  'Computer Science', 'Civic Education', 'Christian Religious Studies',
  'Islamic Religious Studies', 'Literature in English', 'Yoruba', 'Igbo', 'Hausa',
]

const WAEC_SUBJECTS = [
  'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology',
  'Economics', 'Government', 'Literature in English', 'Geography', 'History',
  'Commerce', 'Accounting', 'Agricultural Science', 'Further Mathematics',
  'Computer Science', 'Civic Education', 'Christian Religious Studies',
  'Islamic Religious Studies', 'Yoruba', 'Igbo', 'Hausa',
]

const WAEC_GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6']

// Session storage key for page progress
const GOAL_PAGE_KEY = 'exl_goal_modal_page'

function seedJambSubjects(profile) {
  const src = profile?.subjects_jamb?.length ? profile.subjects_jamb : (profile?.subjects ?? [])
  const valid = src.filter(s => s === USE_OF_ENGLISH || JAMB_ELECTIVES.includes(s))
  if (!valid.includes(USE_OF_ENGLISH)) valid.unshift(USE_OF_ENGLISH)
  return valid.slice(0, 4)
}
function seedWaecSubjects(profile) {
  const src = profile?.subjects_waec?.length ? profile.subjects_waec : (profile?.subjects ?? [])
  return src.filter(s => WAEC_SUBJECTS.includes(s))
}

function SubjectBtn({ name, selected, onClick, disabled }) {
  const s = getS(name)
  return (
    <button onClick={onClick} disabled={disabled && !selected}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px',
        borderRadius: 12, fontSize: 11, fontWeight: 700, border: '1.5px solid',
        cursor: disabled && !selected ? 'not-allowed' : 'pointer',
        textAlign: 'left', width: '100%', transition: 'all .12s',
        background: selected ? s.bg : 'var(--bg-card)',
        borderColor: selected ? s.border : 'var(--border)',
        color: selected ? s.text : 'var(--text-sec)',
        opacity: !selected && disabled ? 0.4 : 1,
        fontFamily: 'inherit',
      }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: selected ? s.text : 'transparent', border: selected ? 'none' : `1.5px solid ${s.text}40`, transition: 'all .12s' }}>
        {selected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
      </div>
      <span style={{ flex: 1, lineHeight: 1.3 }}>{name}</span>
    </button>
  )
}

function StepDots({ total, current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ borderRadius: 99, transition: 'all .25s', width: i === current ? 18 : 5, height: 5, background: i === current ? '#1264E5' : i < current ? 'rgba(18,100,229,.35)' : 'var(--border)' }} />
      ))}
    </div>
  )
}

function CtaButton({ onClick, disabled, children, variant = 'primary' }) {
  const [p, setP] = useState(false)
  const bg     = variant === 'primary' ? '#1264E5' : 'var(--bg-subtle)'
  const shadow = variant === 'primary'
    ? (p ? '0 2px 0 #0a3fa0' : '0 5px 0 #0a3fa0, 0 8px 20px rgba(18,100,229,.25)')
    : '0 3px 0 var(--border)'
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{ width: '100%', padding: '14px 0', borderRadius: 14, fontSize: 14, fontWeight: 900, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', background: bg, color: variant === 'primary' ? '#fff' : 'var(--text-sec)', opacity: disabled ? 0.4 : 1, boxShadow: shadow, transform: p && !disabled ? 'translateY(3px)' : '', transition: 'transform .1s, box-shadow .1s', letterSpacing: '-0.015em', fontFamily: 'inherit', position: 'relative', overflow: 'hidden' }}>
      {variant === 'primary' && !disabled && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent)', backgroundSize: '200% 100%', animation: 'shimmer 2.5s infinite', pointerEvents: 'none' }} />}
      {children}
    </button>
  )
}

function SectionLabel({ children }) {
  return <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tert)', marginBottom: 8 }}>{children}</p>
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-sec)', marginBottom: 5 }}>{label}</p>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 11, fontSize: 13, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-prim)', outline: 'none', fontFamily: 'inherit' }}
        onFocus={e => e.target.style.borderColor = 'rgba(155,122,224,.5)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GoalModal({ profile, onClose, onSave, initialPage = 0, mode = 'full' }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const initExams = () => {
    if (profile?.exam_type === 'BOTH') return new Set(['WAEC', 'JAMB'])
    if (profile?.exam_type === 'JAMB') return new Set(['JAMB'])
    return new Set(['WAEC'])
  }
  const [selectedExams,    setSelectedExams]    = useState(initExams)
  const [jambSubjects,     setJambSubjects]     = useState(() => seedJambSubjects(profile))
  const [waecSubjects,     setWaecSubjects]     = useState(() => seedWaecSubjects(profile))
  const [universityCourse, setUniCourse]        = useState(profile?.university_course ?? '')
  const [targetUniversity, setTargetUni]        = useState(profile?.target_university ?? '')
  const [desiredProfession,setProfession]       = useState(profile?.desired_profession ?? '')
  const [waecGrades,       setWaecGrades]       = useState(profile?.waec_target_grades ?? {})
  const [jambScores,       setJambScores]       = useState(() => {
    const existing = profile?.jamb_target_scores ?? {}
    const seeded = { [USE_OF_ENGLISH]: existing[USE_OF_ENGLISH] ?? 70 }
    seedJambSubjects(profile).forEach(s => { seeded[s] = existing[s] ?? 70 })
    return seeded
  })

  const examType      = selectedExams.has('WAEC') && selectedExams.has('JAMB') ? 'BOTH' : selectedExams.has('JAMB') ? 'JAMB' : 'WAEC'
  const jambAutoTotal = jambSubjects.reduce((sum, s) => sum + (Number(jambScores[s]) || 0), 0)
  const jambSlots     = 3 - (jambSubjects.filter(s => s !== USE_OF_ENGLISH).length)

  // Build pages list — 'subjects-only' mode skips the Goals page
  const pages = mode === 'subjects-only' ? [] : ['Goals']
  if (examType === 'JAMB' || examType === 'BOTH') pages.push('JAMB Subjects')
  if (examType === 'WAEC' || examType === 'BOTH') pages.push('WAEC Subjects')
  pages.push('Targets')

  // Restore page from sessionStorage, then apply initialPage, clamp to valid range
  const getInitialPage = () => {
    try {
      const saved = parseInt(sessionStorage.getItem(GOAL_PAGE_KEY) ?? '', 10)
      if (!isNaN(saved) && saved > 0 && saved < pages.length) return saved
    } catch {}
    return Math.min(initialPage, pages.length - 1)
  }

  const [page, setPage] = useState(getInitialPage)
  const totalPages       = pages.length
  const currentPageLabel = pages[page]

  // Persist page to sessionStorage whenever it changes
  useEffect(() => {
    try { sessionStorage.setItem(GOAL_PAGE_KEY, String(page)) } catch {}
  }, [page])

  function nextPage() { setPage(p => Math.min(p + 1, totalPages - 1)) }
  function prevPage() { setPage(p => Math.max(p - 1, 0)) }

  function toggleJamb(s) {
    if (s === USE_OF_ENGLISH) return
    setJambSubjects(prev => {
      if (prev.includes(s)) return prev.filter(x => x !== s)
      if (prev.length >= 4) return prev
      return [...prev, s]
    })
    setJambScores(prev => ({ ...prev, [s]: prev[s] ?? 70 }))
  }
  function toggleWaec(s) {
    setWaecSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function setJambScore(s, raw) {
    setJambScores(prev => ({ ...prev, [s]: Math.min(100, Math.max(0, Number(raw) || 0)) }))
  }

  const allSubjects = [...new Set([
    ...(examType === 'JAMB' || examType === 'BOTH' ? jambSubjects : []),
    ...(examType === 'WAEC' || examType === 'BOTH' ? waecSubjects : []),
  ])]

  async function handleSave() {
    setSaving(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()

    const updates = {
      exam_type:           examType,
      subjects:            allSubjects,
      subjects_waec:       waecSubjects,
      subjects_jamb:       jambSubjects,
      university_course:   universityCourse.trim() || null,
      target_university:   targetUniversity.trim()  || null,
      desired_profession:  desiredProfession.trim() || null,
      waec_target_grades:  waecGrades,
      jamb_target_scores:  jambScores,
      jamb_total_target:   jambAutoTotal > 0 ? jambAutoTotal : null,
      goals_set:           true,
    }

    let { error: err } = await supabase.from('profiles').update(updates).eq('id', user.id)

    if (err && (err.message?.includes('subjects_waec') || err.message?.includes('subjects_jamb'))) {
      console.warn('[GoalModal] per-exam columns not yet in DB, saving without them:', err.message)
      const { subjects_waec: _w, subjects_jamb: _j, ...legacyUpdates } = updates
      const { error: err2 } = await supabase.from('profiles').update(legacyUpdates).eq('id', user.id)
      err = err2
    }

    if (err) { setSaving(false); setError(err.message); return }

    console.debug('[GoalModal] saved — waec:', waecSubjects, '| jamb:', jambSubjects, '| examType:', examType)

    try {
      const { data: subjectRows } = await supabase
        .from('subjects').select('id, name, exam_type').in('name', allSubjects)

      if (subjectRows?.length) {
        const { data: existingPaths } = await supabase
          .from('student_learning_paths').select('subject_id').eq('student_id', user.id)
        const existingIds = new Set((existingPaths ?? []).map(p => p.subject_id))
        const newPaths = subjectRows
          .filter(s => !existingIds.has(s.id))
          .map(s => ({ student_id: user.id, subject_id: s.id, ordered_subtopic_ids: [], last_calculated_at: new Date().toISOString() }))
        if (newPaths.length) {
          await supabase.from('student_learning_paths')
            .upsert(newPaths, { onConflict: 'student_id,subject_id', ignoreDuplicates: true })
        }
      }
    } catch (e) {
      console.error('[GoalModal] learning_paths sync error:', e.message)
    }

    // Clear saved page on successful save — next open starts fresh
    try { sessionStorage.removeItem(GOAL_PAGE_KEY) } catch {}

    setSaving(false)
    onSave?.({ ...profile, ...updates })
  }

  const PAGE_TITLES = {
    'Goals':         'Set your goals',
    'JAMB Subjects': 'JAMB subjects',
    'WAEC Subjects': 'WAEC subjects',
    'Targets':       'Target scores',
  }

  return (
    <>
      <style>{`
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes goal-slide{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes goal-fade{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        .goal-sheet{animation:goal-slide .28s cubic-bezier(.32,0,.67,0)}
        .goal-handle{display:flex}
        @media(min-width:768px){
          .goal-backdrop{align-items:center!important}
          .goal-sheet{border-radius:22px!important;border:1px solid var(--border)!important;max-width:540px!important;animation:goal-fade .22s ease!important}
          .goal-handle{display:none!important}
        }
      `}</style>
      <div className="goal-backdrop" onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div className="goal-sheet" onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 512, background: 'var(--bg-card)', borderRadius: '26px 26px 0 0', borderTop: '1px solid var(--border)', maxHeight: '94dvh', display: 'flex', flexDirection: 'column', boxShadow: '0 -24px 64px rgba(0,0,0,.4)' }}>

          {/* Handle */}
          <div className="goal-handle" style={{ justifyContent: 'center', padding: '12px 0 0', flexShrink: 0, display: 'flex' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
          </div>

          {/* Header */}
          <div style={{ padding: '10px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {page > 0 && (
                <button onClick={prevPage} style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: 'var(--text-sec)', fontSize: 14 }}>←</button>
              )}
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.02em', lineHeight: 1 }}>{PAGE_TITLES[currentPageLabel]}</h2>
                <StepDots total={totalPages} current={page} />
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 13, color: 'var(--text-tert)' }}>✕</button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Goals page */}
            {currentPageLabel === 'Goals' && (
              <>
                <div>
                  <SectionLabel>Which exam are you sitting?</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[{ label: 'WAEC', sub: 'West African exams', val: 'WAEC' }, { label: 'JAMB', sub: 'University entrance', val: 'JAMB' }].map(({ label, sub, val }) => {
                      const active = selectedExams.has(val)
                      return (
                        <button key={val} onClick={() => { setSelectedExams(prev => { const next = new Set(prev); if (next.has(val)) { if (next.size === 1) return prev; next.delete(val) } else next.add(val); return next }); setPage(0) }}
                          style={{ padding: '12px 8px', borderRadius: 12, textAlign: 'center', border: `2px solid ${active ? '#6366f1' : 'var(--border)'}`, background: active ? 'rgba(99,102,241,.08)' : 'var(--bg-card)', cursor: 'pointer', position: 'relative', transition: 'all .12s', fontFamily: 'inherit' }}>
                          {active && <span style={{ position: 'absolute', top: 5, right: 8, fontSize: 9, color: '#6366f1', fontWeight: 900 }}>✓</span>}
                          <div style={{ fontSize: 15, fontWeight: 900, color: active ? '#6366f1' : 'var(--text-prim)' }}>{label}</div>
                          <div style={{ fontSize: 10, color: active ? '#6366f1' : 'var(--text-tert)', marginTop: 2 }}>{sub}</div>
                        </button>
                      )
                    })}
                  </div>
                  {examType === 'BOTH' && <p style={{ fontSize: 11, color: '#9b7ae0', background: 'rgba(155,122,224,.1)', border: '1px solid rgba(155,122,224,.2)', padding: '8px 12px', borderRadius: 10, marginTop: 8 }}>You'll select subjects for JAMB and WAEC separately in the next steps.</p>}
                </div>
                <div>
                  <SectionLabel>Your aspirations</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Field label="🎓 University course" value={universityCourse} onChange={setUniCourse} placeholder="e.g. Medicine, Engineering, Law…" />
                    <Field label="🏛️ Target university"  value={targetUniversity}  onChange={setTargetUni}  placeholder="e.g. University of Lagos, OAU…" />
                    <Field label="💼 Desired profession" value={desiredProfession} onChange={setProfession} placeholder="e.g. Doctor, Engineer, Lawyer…" />
                  </div>
                </div>
                <CtaButton onClick={nextPage}>Next: Subjects →</CtaButton>
              </>
            )}

            {/* JAMB Subjects */}
            {currentPageLabel === 'JAMB Subjects' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 14, background: 'rgba(167,139,250,.1)', border: '1.5px solid rgba(167,139,250,.3)' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#a78bfa' }}>{USE_OF_ENGLISH}</p>
                    <p style={{ fontSize: 10, color: 'rgba(167,139,250,.7)' }}>Always required for JAMB</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#a78bfa' }}>1/4</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-sec)' }}>{jambSlots > 0 ? `Choose ${jambSlots} more subject${jambSlots !== 1 ? 's' : ''}` : 'All 4 subjects selected ✓'}</p>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: jambSubjects.length === 4 ? 'rgba(74,222,128,.15)' : 'rgba(251,191,36,.15)', color: jambSubjects.length === 4 ? '#4ade80' : '#fbbf24', border: `1px solid ${jambSubjects.length === 4 ? 'rgba(74,222,128,.3)' : 'rgba(251,191,36,.3)'}` }}>{jambSubjects.length}/4</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {JAMB_ELECTIVES.map(s => <SubjectBtn key={s} name={s} selected={jambSubjects.includes(s)} disabled={jambSubjects.length >= 4} onClick={() => toggleJamb(s)} />)}
                </div>
                <CtaButton onClick={nextPage} disabled={jambSubjects.length < 4}>{examType === 'BOTH' ? 'Next: WAEC Subjects →' : 'Next: Target Scores →'}</CtaButton>
              </>
            )}

            {/* WAEC Subjects */}
            {currentPageLabel === 'WAEC Subjects' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-sec)' }}>Select all your WAEC subjects</p>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: waecSubjects.length >= 7 ? 'rgba(74,222,128,.15)' : 'rgba(251,191,36,.15)', color: waecSubjects.length >= 7 ? '#4ade80' : '#fbbf24', border: `1px solid ${waecSubjects.length >= 7 ? 'rgba(74,222,128,.3)' : 'rgba(251,191,36,.3)'}` }}>{waecSubjects.length} selected</span>
                </div>
                {waecSubjects.length < 7 && <p style={{ fontSize: 11, color: '#9b7ae0', background: 'rgba(155,122,224,.1)', border: '1px solid rgba(155,122,224,.2)', padding: '8px 12px', borderRadius: 10 }}>Most students sit 8–9 subjects for WAEC</p>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {WAEC_SUBJECTS.map(s => <SubjectBtn key={s} name={s} selected={waecSubjects.includes(s)} onClick={() => toggleWaec(s)} />)}
                </div>
                <CtaButton onClick={nextPage} disabled={waecSubjects.length === 0}>Next: Target Scores →</CtaButton>
              </>
            )}

            {/* Targets */}
            {currentPageLabel === 'Targets' && (
              <>
                {(examType === 'WAEC' || examType === 'BOTH') && waecSubjects.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff', background: '#22c55e', padding: '3px 8px', borderRadius: 999 }}>WAEC</span>
                      <div><p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>Target grade per subject</p><p style={{ fontSize: 10, color: 'var(--text-tert)' }}>A1 is the highest grade</p></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {waecSubjects.map(s => {
                        const chosen = waecGrades[s] ?? 'A1'; const sc = getS(s)
                        return (
                          <div key={s} style={{ background: 'var(--bg-subtle)', borderRadius: 14, padding: '11px 12px' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-prim)', marginBottom: 8 }}>{s}</p>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              {WAEC_GRADES.map(g => (
                                <button key={g} onClick={() => setWaecGrades(prev => ({ ...prev, [s]: g }))} style={{ padding: '5px 10px', fontSize: 11, fontWeight: 800, borderRadius: 8, cursor: 'pointer', border: '1.5px solid', transition: 'all .12s', background: chosen === g ? sc.bg : 'var(--bg-card)', borderColor: chosen === g ? sc.border : 'var(--border)', color: chosen === g ? sc.text : 'var(--text-sec)', fontFamily: 'inherit' }}>{g}</button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {(examType === 'JAMB' || examType === 'BOTH') && jambSubjects.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff', background: '#9b7ae0', padding: '3px 8px', borderRadius: 999 }}>JAMB</span>
                        <div><p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>Target score per subject</p><p style={{ fontSize: 10, color: 'var(--text-tert)' }}>Each subject is out of 100</p></div>
                      </div>
                      <div style={{ textAlign: 'right' }}><p style={{ fontSize: 20, fontWeight: 900, color: '#9b7ae0', lineHeight: 1 }}>{jambAutoTotal}</p><p style={{ fontSize: 10, color: 'var(--text-tert)' }}>/ 400 total</p></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {jambSubjects.map(s => {
                        const val = jambScores[s] ?? 70; const barColor = val >= 70 ? '#4ade80' : val >= 50 ? '#fbbf24' : '#f87171'
                        return (
                          <div key={s} style={{ background: 'var(--bg-subtle)', borderRadius: 14, padding: '11px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-prim)' }}>{s}</p>
                              <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-prim)' }}>{val}<span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tert)' }}>/100</span></span>
                            </div>
                            <div style={{ height: 4, background: 'var(--bg-card)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                              <div style={{ width: `${val}%`, height: '100%', background: barColor, borderRadius: 999, transition: 'width .3s' }} />
                            </div>
                            <input type="range" min="0" max="100" step="5" value={val} onChange={e => setJambScore(s, e.target.value)} style={{ width: '100%', accentColor: '#9b7ae0', cursor: 'pointer' }} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {error && <p style={{ fontSize: 12, color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', padding: '10px 14px', borderRadius: 11 }}>{error}</p>}
                <CtaButton onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save goals ✓'}</CtaButton>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
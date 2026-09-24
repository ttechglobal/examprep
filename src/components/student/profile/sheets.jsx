'use client'
// src/components/student/profile/sheets.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Edit sheets for the profile page.
//
// InfoSheet / SubjectsSheet / GoalsSheet moved here from profile page v4 with
// their save logic unchanged:
//   Auth users  → /api/student/profile PATCH or /api/student/subjects PATCH
//   Guest users → setLocalProfile() (localStorage)
// New in v5: PlansSheet, CareerSheet, ParentsSheet, LanguageSheet, AccountSheet.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useId } from 'react'
import Link from 'next/link'
import { normalizePhone, formatPhoneForDisplay } from '@/lib/auth/phone'
import { setLocalProfile, cacheAuthProfile } from '@/lib/localProfile'
import JoinSchool from '@/components/student/JoinSchool'
import { SubjectGlyph, Close, Check } from './icons'
import {
  NAVY, BLUE, GOLD, ORANGE, GREEN, RED, WAEC_GRADES, ALL_SUBJECTS,
  normalizeSubjectsForExam, TRIAL_END,
} from './profileModel'

// Selection colour per subject in the picker.
const SUBJ_COLOR = {
  'Mathematics': '#FF6A00', 'Further Mathematics': '#FF6A00',
  'English Language': '#22c55e', 'Use of English': '#22c55e',
  'Physics': '#7C3AED', 'Chemistry': '#1264E5', 'Biology': '#18B7F2',
  'Economics': '#f43f5e', 'Government': '#9b7ae0', 'Geography': '#34d399',
  'Literature in English': '#f9a8d4', 'Agricultural Science': '#86efac',
  'Commerce': '#818cf8', 'Accounting': '#eab308',
}
const sc = n => SUBJ_COLOR[n] ?? BLUE

// ── Sheet ─────────────────────────────────────────────────────────────────────
// Bottom sheet on mobile, centred dialog from 768px. Escape and backdrop close
// it; focus moves into the dialog on open and returns to the trigger on close.
export function Sheet({ title, onClose, children, wide = false }) {
  const panelRef = useRef(null)
  const titleId  = useId()
  // Callers pass inline arrows; a ref keeps the effect below mount-only.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const trigger = document.activeElement
    panelRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      trigger?.focus?.()
    }
  }, [])

  return (
    <div
      className="ep-sheet-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <style>{`
        @keyframes ep-sheet-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes ep-sheet-in { from { opacity: 0; transform: scale(.97) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        .ep-sheet-container:focus { outline: none }
        @media (min-width: 768px) {
          .ep-sheet-container {
            border-radius: 24px !important;
            border: 1px solid var(--border) !important;
            animation: ep-sheet-in .25s ease !important;
            padding-bottom: 18px !important;
          }
          .ep-sheet-backdrop { justify-content: center !important; align-items: center !important; }
        }
        @media (prefers-reduced-motion: reduce) { .ep-sheet-container { animation: none !important } }
      `}</style>
      <div
        ref={panelRef}
        role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className="ep-sheet-container"
        style={{
          width: '100%', maxWidth: wide ? 640 : 520,
          maxHeight: '92dvh', overflowY: 'auto',
          background: 'var(--bg-card)',
          borderRadius: '24px 24px 0 0',
          border: '1px solid var(--border)',
          boxShadow: '0 -8px 40px rgba(0,0,0,.4)',
          animation: 'ep-sheet-up .3s cubic-bezier(0.32,0.72,0,1)',
          // Clears the mobile bottom nav (80px) + safe area; desktop centres instead.
          paddingBottom: 'max(96px, calc(env(safe-area-inset-bottom, 0px) + 80px))',
        }}
      >
        <div style={{ padding: '12px 20px 0', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border)', margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
            <h2 id={titleId} style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.025em' }}>{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-tert)' }}>
              <Close />
            </button>
          </div>
        </div>
        <div style={{ padding: '0 20px 24px' }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, multiline = false, hint, type = 'text' }) {
  const id = useId()
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginBottom: 6 }}>{label}</label>
      {multiline ? (
        <textarea id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-prim)', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none', lineHeight: 1.5 }} />
      ) : (
        <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-prim)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
      )}
      {hint && <p style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 5 }}>{hint}</p>}
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  const id = useId()
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginBottom: 6 }}>{label}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-prim)', fontSize: 14, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function SaveButton({ onClick, saving, label = 'Save changes' }) {
  return (
    <button onClick={onClick} disabled={saving}
      style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: 15, background: `linear-gradient(135deg,${NAVY},${BLUE})`, color: '#fff', boxShadow: `0 4px 16px ${BLUE}40`, opacity: saving ? 0.7 : 1, marginTop: 4 }}>
      {saving ? 'Saving…' : label}
    </button>
  )
}


// ── SHEET 1: My Information ────────────────────────────────────────────────────
export function InfoSheet({ profile, isGuest, onClose, onSaved }) {
  const [fullName,         setFullName]         = useState(profile?.full_name          ?? '')
  const [username,         setUsername]         = useState(profile?.username           ?? '')
  const [classLevel,       setClassLevel]       = useState(profile?.class_level        ?? '')
  const [phoneNumber,      setPhoneNumber]      = useState(profile?.phone_number       ?? '')
  const [studentSchoolName, setStudentSchoolName] = useState(profile?.student_school_name ?? '')
  const [saving,           setSaving]           = useState(false)
  const [error,            setError]            = useState(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const trimName   = fullName.trim()
      const trimUser   = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_')
      const trimPhone  = phoneNumber.trim()
      const trimSchool = studentSchoolName.trim()
      if (!trimName) throw new Error('Full name is required')
      if (trimUser && trimUser.length < 3) throw new Error('Username must be at least 3 characters')
      const phoneLogin = profile?.signup_method === 'phone'
      if (!phoneLogin && trimPhone && !normalizePhone(trimPhone)) throw new Error('Enter a full 11-digit phone number, like 0801 234 5678')

      const patch = {
        full_name:           trimName,
        username:            trimUser  || undefined,
        class_level:         classLevel || undefined,
        ...(profile?.signup_method === 'phone' ? {} : { phone_number: trimPhone ? normalizePhone(trimPhone) : null }),
        student_school_name: trimSchool || null,
      }

      if (isGuest) {
        setLocalProfile({ ...patch, full_name: trimName, username: trimUser })
        try { localStorage.setItem('ep_student_name', trimName) } catch {}
      } else {
        const res  = await fetch('/api/student/profile', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        const data = await res.json()
        if (!res.ok) {
          if (data.error?.includes('unique') || data.error?.includes('duplicate')) throw new Error('That username is taken — try another')
          throw new Error(data.error ?? 'Save failed')
        }
        setLocalProfile(patch)
        try { localStorage.setItem('ep_student_name', trimName) } catch {}
      }

      onSaved(patch)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet title="My Information" onClose={onClose}>
      {isGuest && (
        <div style={{ padding: '10px 14px', borderRadius: 11, background: `${ORANGE}10`, border: `1px solid ${ORANGE}30`, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ORANGE, margin: 0 }}>
            Saved on this device only. Create an account to sync across devices.
          </p>
        </div>
      )}
      <Field label="Full name"  value={fullName}          onChange={setFullName}          placeholder="Ada Okafor" />
      <Field label="Username"   value={username}          onChange={setUsername}          placeholder="ada_okafor" hint="Shown on the leaderboard — no spaces" />
      {profile?.signup_method === 'phone' ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tert)', marginBottom: 6 }}>Phone number</div>
          <div style={{ padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-sec)', fontSize: 14, fontWeight: 600 }}>{formatPhoneForDisplay(phoneNumber)}</div>
          <p style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 5 }}>You sign in with this number, so it can't be changed here.</p>
        </div>
      ) : (
        <Field label="Phone number" value={phoneNumber}     onChange={setPhoneNumber}       placeholder="08012345678" hint="Optional — not shown publicly" />
      )}
      <Field label="Your school" value={studentSchoolName} onChange={setStudentSchoolName} placeholder="e.g. Kings College Lagos" hint="The school you attend" />
      <SelectField label="Class" value={classLevel}       onChange={setClassLevel}        options={['SS1', 'SS2', 'SS3']} />
      {error && <p style={{ fontSize: 12, color: RED, marginBottom: 12 }}>{error}</p>}
      <SaveButton onClick={save} saving={saving} />
    </Sheet>
  )
}


// ── SHEET 2: Exams & Subjects ──────────────────────────────────────────────────
export function SubjectsSheet({ profile, isGuest, onClose, onSaved, initialExam = null }) {
  // initialExam jumps straight to that exam's subject picker (from a subject tile).
  const [step,         setStep]        = useState(initialExam ? 2 : 1)
  const [activeExams,  setActiveExams] = useState(() => {
    const exams = []
    if (profile?.subjects_waec?.length || profile?.exam_types?.includes?.('WAEC')) exams.push('WAEC')
    if (profile?.subjects_jamb?.length || profile?.exam_types?.includes?.('JAMB')) exams.push('JAMB')
    if (initialExam && !exams.includes(initialExam)) exams.push(initialExam)
    return exams.length ? exams : ['WAEC']
  })
  const [currentExam,  setCurrentExam] = useState(initialExam)
  const [waecSubjects, setWaecSubjects]= useState(profile?.subjects_waec ?? [])
  const [jambSubjects, setJambSubjects]= useState(normalizeSubjectsForExam(profile?.subjects_jamb ?? [], 'JAMB'))
  const [allSubjects,  setAllSubjects] = useState([])
  const [loadingSubjs, setLoadingSubjs]= useState(false)
  const [saving,       setSaving]      = useState(false)
  const [error,        setError]       = useState(null)

  useEffect(() => {
    if (!currentExam) return

    // Always merge the available list with any currently-selected subjects
    // that might not be in the list (e.g. saved under a different exam name).
    // This guarantees every selected subject is visible so the user can see
    // and deselect them even if they were stored incorrectly during onboarding.
    function mergeWithSelected(list) {
      const currentSelected = currentExam === 'WAEC' ? waecSubjects : jambSubjects
      const inList = new Set(list)
      const extras = currentSelected.filter(s => !inList.has(s))
      // Prepend orphaned subjects so they appear first (highlighted, easy to remove)
      return extras.length ? [...extras, ...list] : list
    }

    if (isGuest) {
      const base = ALL_SUBJECTS[currentExam]
      setAllSubjects(mergeWithSelected(base))
      return
    }

    setLoadingSubjs(true)
    fetch(`/api/admin/subjects`)
      .then(r => r.json())
      .then(d => {
        const raw = Array.isArray(d) ? d : (d.subjects ?? [])
        const filtered = raw.filter(s => s.exam_type === currentExam && s.is_active !== false)
        const seen = new Set()
        const names = []
        for (const s of filtered) {
          const name = s.name ?? s
          if (!seen.has(name)) { seen.add(name); names.push(name) }
        }
        names.sort((a, b) => {
          const priority = n => /english/i.test(n) ? 0 : /mathematics/i.test(n) ? 1 : 2
          return priority(a) - priority(b) || a.localeCompare(b)
        })
        setAllSubjects(mergeWithSelected(names))
      })
      .catch(() => {
        const base = ALL_SUBJECTS[currentExam]
        setAllSubjects(mergeWithSelected(base))
      })
      .finally(() => setLoadingSubjs(false))
  // waecSubjects/jambSubjects intentionally omitted — only re-run when exam changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExam, isGuest])

  function toggleExam(exam) {
    setActiveExams(prev => prev.includes(exam) ? prev.filter(e => e !== exam) : [...prev, exam])
  }

  function toggleSubject(name, exam) {
    if (exam === 'WAEC') {
      setWaecSubjects(prev => {
        if (prev.includes(name)) return prev.filter(s => s !== name)  // always allow deselect
        if (prev.length >= 9) return prev   // WAEC: only block adding beyond 9
        return [...prev, name]
      })
    } else {
      setJambSubjects(prev => {
        if (prev.includes(name)) return prev.filter(s => s !== name)  // always allow deselect
        if (prev.length >= 4) return prev   // JAMB: only block adding beyond 4
        return [...prev, name]
      })
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const patch = {
        subjects_waec: waecSubjects,
        subjects_jamb: jambSubjects,
        exam_types:    activeExams,
        exam_type:     activeExams[0] ?? 'WAEC',
        subjects:      activeExams.includes('WAEC') ? waecSubjects : jambSubjects,
      }

      if (isGuest) {
        setLocalProfile(patch)
      } else {
        const saves = []
        if (activeExams.includes('WAEC')) {
          saves.push(fetch('/api/student/subjects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exam: 'WAEC', subjects: waecSubjects }) }))
        }
        if (activeExams.includes('JAMB')) {
          saves.push(fetch('/api/student/subjects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exam: 'JAMB', subjects: jambSubjects }) }))
        }
        const results = await Promise.all(saves)
        for (const res of results) {
          if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Save failed') }
        }
        // Update local cache so the layout context reflects the new subjects
        // without requiring a full page reload.
        setLocalProfile(patch)
        cacheAuthProfile({ ...profile, ...patch })
      }

      onSaved(patch)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Step 1: exam toggles + subject summary
  if (step === 1) {
    return (
      <Sheet title="Exams & Subjects" onClose={onClose}>
        {isGuest && (
          <div style={{ padding: '10px 14px', borderRadius: 11, background: `${ORANGE}10`, border: `1px solid ${ORANGE}30`, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ORANGE, margin: 0 }}>Saved on this device only.</p>
          </div>
        )}
        <p style={{ fontSize: 13, color: 'var(--text-tert)', marginBottom: 20, lineHeight: 1.6 }}>
          Select the exams you are preparing for.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {['WAEC', 'JAMB'].map(exam => {
            const on   = activeExams.includes(exam)
            const meta = { WAEC: { icon: '📋', desc: 'WASSCE — 9 subjects' }, JAMB: { icon: '🎓', desc: 'UTME — 4 subjects' } }[exam]
            return (
              <button key={exam} onClick={() => toggleExam(exam)}
                style={{ padding: '18px 16px', borderRadius: 16, cursor: 'pointer', fontFamily: 'inherit', border: `2px solid ${on ? BLUE : 'var(--border)'}`, background: on ? `${BLUE}10` : 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, textAlign: 'left', transition: 'all .15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: 22 }}>{meta.icon}</span>
                  {on && (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: on ? BLUE : 'var(--text-prim)' }}>{exam}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tert)' }}>{meta.desc}</div>
              </button>
            )
          })}
        </div>

        {activeExams.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginBottom: 10 }}>Your subjects</p>
            {activeExams.map(exam => {
              const subs = exam === 'WAEC' ? waecSubjects : jambSubjects
              return (
                <div key={exam} onClick={() => { setCurrentExam(exam); setStep(2) }}
                  style={{ borderRadius: 13, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', marginBottom: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>{exam} Subjects</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 2 }}>
                        {subs.length > 0
                          ? `${subs.length} subject${subs.length !== 1 ? 's' : ''} selected — tap to edit`
                          : 'Tap to select subjects'}
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  {subs.length > 0 && (
                    <div style={{ padding: '0 12px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {subs.map(name => (
                        <span key={name} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-prim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 14, lineHeight: 0 }}><SubjectGlyph name={name} /></span> {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {error && <p style={{ fontSize: 12, color: RED, marginBottom: 12 }}>{error}</p>}
        <SaveButton onClick={save} saving={saving} label={`Save — ${activeExams.join(' & ')}`} />
      </Sheet>
    )
  }

  // Step 2: subject picker
  const selected = currentExam === 'WAEC' ? waecSubjects : jambSubjects
  const isJAMB   = currentExam === 'JAMB'

  return (
    <Sheet title={`${currentExam} Subjects`} onClose={onClose} wide>
      <button onClick={() => { setStep(1); setAllSubjects([]) }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: BLUE, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 16 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back to exams
      </button>

      <div style={{ padding: '10px 14px', borderRadius: 11, background: `${ORANGE}10`, border: `1px solid ${ORANGE}30`, marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: ORANGE, margin: 0 }}>
          {isJAMB ? (
            selected.length > 4
              ? <><strong style={{ color: RED }}>Too many! Remove {selected.length - 4} subject{selected.length - 4 !== 1 ? 's' : ''}</strong> — JAMB requires exactly 4</>
              : selected.length === 4
              ? <>JAMB: <strong>4 subjects selected</strong> — you're good! Tap any to deselect.</>
              : <>JAMB: pick exactly <strong>4 subjects</strong> — {selected.length} of 4 selected</>
          ) : (
            <>WAEC: pick up to <strong>9 subjects</strong> — {selected.length} of 9 selected</>
          )}
        </p>
      </div>

      {loadingSubjs ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2.5px solid var(--border)`, borderTopColor: BLUE, animation: 'spin .7s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
          {allSubjects.map(name => {
            const on     = selected.includes(name)
            const color  = sc(name)
            // Can always deselect. Can only add if under the limit.
            const addBlocked = !on && selected.length >= (isJAMB ? 4 : 9)
            return (
              <button key={name} onClick={() => !addBlocked && toggleSubject(name, currentExam)}
                style={{ padding: '14px 12px', borderRadius: 14, cursor: addBlocked ? 'not-allowed' : 'pointer', border: `2px solid ${on ? color : 'var(--border)'}`, background: on ? `${color}12` : 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, fontFamily: 'inherit', textAlign: 'left', opacity: addBlocked ? 0.4 : 1, transition: 'all .12s' }}>
                <span style={{ fontSize: 22, lineHeight: 0 }}><SubjectGlyph name={name} /></span>
                <span style={{ fontSize: 12, fontWeight: on ? 800 : 600, color: on ? color : 'var(--text-prim)', lineHeight: 1.3 }}>{name}</span>
                {on && (
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginTop: 'auto' }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l1.8 1.8L6.5 2" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {isJAMB && selected.length !== 4 && (
        <div style={{ padding: '10px 14px', borderRadius: 11, background: `${RED}10`, border: `1px solid ${RED}30`, marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: RED, margin: 0 }}>
            {selected.length > 4
              ? `Remove ${selected.length - 4} subject${selected.length - 4 !== 1 ? 's' : ''} — JAMB requires exactly 4.`
              : `Pick ${4 - selected.length} more subject${4 - selected.length !== 1 ? 's' : ''} — JAMB requires exactly 4.`}
          </p>
        </div>
      )}
      <button onClick={() => { setStep(1); setAllSubjects([]) }}
        style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: 15, background: `linear-gradient(135deg,${NAVY},${BLUE})`, color: '#fff', boxShadow: `0 4px 16px ${BLUE}40` }}>
        {isJAMB && selected.length === 4 ? '✓ Done — 4 subjects selected' : `Done — ${selected.length} subject${selected.length !== 1 ? 's' : ''} selected`}
      </button>
    </Sheet>
  )
}


// ── SHEET 3: Goals & Targets ───────────────────────────────────────────────────
export function GoalsSheet({ profile, isGuest, onClose, onSaved, focus }) {
  const [activeTab, setActiveTab] = useState(() => {
    if (focus === 'jamb') return 'jamb'
    if (focus === 'waec') return 'waec'
    return 'university'
  })

  // Read goals — from ep_goals (guest) or profile (auth)
  const storedGoals = (() => {
    try { return JSON.parse(localStorage.getItem('ep_goals') || '{}') } catch { return {} }
  })()

  const [university,    setUniversity]    = useState(profile?.target_university ?? storedGoals.university ?? '')
  const [course,        setCourse]        = useState(profile?.target_course     ?? storedGoals.course     ?? '')
  const [jambBreakdown, setJambBreakdown] = useState(() => {
    const jambSubs = profile?.subjects_jamb ?? []
    if (!jambSubs.length) return {}
    const stored = profile?.target_jamb_breakdown ?? storedGoals.target_jamb_breakdown
    // FIX: build breakdown from current jambSubs only.
    // The old code returned `stored` directly, which included stale keys
    // from previous subject selections. Those extra keys still summed in
    // the total even when the student's sliders showed 0 for their current
    // subjects. Now: only include current subjects. Missing keys default to
    // 0 (not 50) so an unset target is honest rather than a guess.
    return Object.fromEntries(
      jambSubs.map(s => [s, (stored && typeof stored === 'object' && typeof stored[s] === 'number') ? stored[s] : 0])
    )
  })
  const [waecGrades, setWaecGrades] = useState(() => {
    try {
      const stored = profile?.target_waec ?? storedGoals.target_waec
      return (stored && typeof stored === 'object' && !Array.isArray(stored)) ? stored : {}
    } catch { return {} }
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const waecSubs = profile?.subjects_waec ?? []
  const jambSubs = profile?.subjects_jamb ?? []

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const jambTotal = Object.values(jambBreakdown).reduce((s, v) => s + v, 0)
      const patch = {
        target_university:       university.trim(),
        target_course:           course.trim(),
        target_jamb:             jambTotal || null,
        target_jamb_breakdown:   Object.keys(jambBreakdown).length ? jambBreakdown : null,
        target_waec:             waecGrades,
        // local keys for ep_goals
        university:              university.trim(),
        course:                  course.trim(),
      }

      if (isGuest) {
        // Save to ep_goals locally
        try { localStorage.setItem('ep_goals', JSON.stringify(patch)) } catch {}
      } else {
        const res  = await fetch('/api/student/profile', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_university:      university.trim(),
            target_course:          course.trim(),
            target_jamb:            jambTotal || null,
            target_jamb_breakdown:  Object.keys(jambBreakdown).length ? jambBreakdown : null,
            target_waec:            waecGrades,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Save failed')
        // Mirror to local cache
        try { localStorage.setItem('ep_goals', JSON.stringify(patch)) } catch {}
      }

      onSaved({ target_university: university.trim(), target_course: course.trim(), target_jamb: jambTotal || null, target_jamb_breakdown: jambBreakdown, target_waec: waecGrades })
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'university', label: '🏛 University' },
    ...(jambSubs.length > 0 ? [{ id: 'jamb', label: '📋 JAMB' }] : []),
    ...(waecSubs.length > 0 ? [{ id: 'waec', label: '✏️ WAEC Grades' }] : []),
  ]

  return (
    <Sheet title="Goals & Targets" onClose={onClose}>
      {isGuest && (
        <div style={{ padding: '10px 14px', borderRadius: 11, background: `${ORANGE}10`, border: `1px solid ${ORANGE}30`, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ORANGE, margin: 0 }}>Saved on this device only.</p>
        </div>
      )}

      {tabs.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--bg-subtle)', borderRadius: 12, padding: 4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: activeTab === t.id ? 900 : 600, fontSize: 12, background: activeTab === t.id ? 'var(--bg-card)' : 'transparent', color: activeTab === t.id ? BLUE : 'var(--text-tert)', boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none', transition: 'all .12s' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'university' && (
        <>
          <Field label="Target university" value={university} onChange={setUniversity} placeholder="University of Lagos" />
          <Field label="Target course"     value={course}     onChange={setCourse}     placeholder="Medicine & Surgery" />
        </>
      )}

      {activeTab === 'jamb' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, background: `linear-gradient(135deg,${NAVY},${BLUE})`, marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.08em', margin: 0 }}>Total JAMB Score</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', margin: '2px 0 0' }}>Each subject is out of 100</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{Object.values(jambBreakdown).reduce((s, v) => s + v, 0)}</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', marginLeft: 3 }}>/400</span>
            </div>
          </div>

          {jambSubs.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-tert)', lineHeight: 1.6 }}>Set your JAMB subjects first.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {jambSubs.map(subj => {
                const score = jambBreakdown[subj] ?? 50
                const color = score >= 80 ? GREEN : score >= 60 ? BLUE : score >= 40 ? ORANGE : RED
                return (
                  <div key={subj}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18, lineHeight: 0 }}><SubjectGlyph name={subj} /></span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>{subj}</span>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 900, color, minWidth: 32, textAlign: 'right' }}>{score}</span>
                    </div>
                    <div style={{ position: 'relative', height: 36 }}>
                      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 6, borderRadius: 999, background: 'var(--bg-subtle)', border: '1px solid var(--border)', transform: 'translateY(-50%)' }} />
                      <div style={{ position: 'absolute', top: '50%', left: 0, height: 6, borderRadius: 999, background: color, width: `${score}%`, transform: 'translateY(-50%)', transition: 'width .15s' }} />
                      <input type="range" min={0} max={100} step={1} value={score}
                        onChange={e => setJambBreakdown(prev => ({ ...prev, [subj]: Number(e.target.value) }))}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-tert)' }}>0</span>
                      <span style={{ fontSize: 10, color: 'var(--text-tert)' }}>100</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'waec' && (
        <>
          <p style={{ fontSize: 12, color: 'var(--text-tert)', marginBottom: 14, lineHeight: 1.5 }}>
            Set your target grade for each subject.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {waecSubs.map(subj => (
              <div key={subj} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, lineHeight: 0 }}><SubjectGlyph name={subj} /></span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>{subj}</span>
                </div>
                <select value={waecGrades[subj] ?? ''} onChange={e => setWaecGrades(prev => ({ ...prev, [subj]: e.target.value }))}
                  style={{ padding: '6px 10px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-prim)', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  <option value="">Target…</option>
                  {WAEC_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            ))}
          </div>
        </>
      )}

      {error && <p style={{ fontSize: 12, color: RED, marginBottom: 12 }}>{error}</p>}
      <SaveButton onClick={save} saving={saving} />
    </Sheet>
  )
}




// ═════════════════════════════════════════════════════════════════════════════
// New in v5
// ═════════════════════════════════════════════════════════════════════════════

const P = { fontSize: 14, lineHeight: 1.6, color: 'var(--text-sec)', margin: '0 0 16px' }

function Note({ tone = 'info', children }) {
  const c = tone === 'warn' ? ORANGE : tone === 'ok' ? GREEN : BLUE
  return (
    <div style={{ padding: '10px 14px', borderRadius: 11, background: `${c}10`, border: `1px solid ${c}30`, marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: c, margin: 0, lineHeight: 1.5 }}>{children}</p>
    </div>
  )
}

function SecondaryButton({ children, onClick, danger = false }) {
  const c = danger ? RED : 'var(--text-prim)'
  return (
    <button type="button" onClick={onClick}
      style={{ width: '100%', padding: '13px', borderRadius: 14, border: `1.5px solid ${danger ? `${RED}40` : 'var(--border)'}`, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, background: 'transparent', color: c, marginTop: 10 }}>
      {children}
    </button>
  )
}

function SignupLink() {
  return (
    <Link href="/onboarding?mode=signup"
      style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '14px', borderRadius: 14, fontWeight: 900, fontSize: 15, background: `linear-gradient(135deg,${NAVY},${BLUE})`, color: '#fff', boxShadow: `0 4px 16px ${BLUE}40` }}>
      Create free account
    </Link>
  )
}

// ── See Plans ─────────────────────────────────────────────────────────────────
const PREMIUM_INCLUDES = [
  'Every WAEC and JAMB past question, with worked explanations',
  'Lessons for every subtopic in your subjects',
  'Full timed Exam Mode with a topic-by-topic score report',
  'Weekly progress reports for your parents',
]

export function PlansSheet({ plan, onClose }) {
  const trialEnds = TRIAL_END.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  return (
    <Sheet title="Your plan" onClose={onClose}>
      <p style={{ ...P, marginBottom: 6, fontWeight: 800, fontSize: 16, color: 'var(--text-prim)' }}>{plan.title}</p>
      <p style={P}>
        {plan.kind === 'trial' && `You have full access until ${trialEnds}. Nothing is charged when the trial ends.`}
        {plan.kind === 'paid'  && plan.detail}
        {plan.kind === 'free'  && 'Your free trial has ended. You can keep practising with free questions.'}
      </p>
      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', margin: '0 0 10px' }}>Premium includes</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'grid', gap: 10 }}>
        {PREMIUM_INCLUDES.map(item => (
          <li key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--text-sec)', lineHeight: 1.5 }}>
            <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: `${GREEN}20`, color: GREEN, display: 'grid', placeItems: 'center', marginTop: 1 }}><Check /></span>
            {item}
          </li>
        ))}
      </ul>
      <SaveButton onClick={onClose} label="Got it" />
    </Sheet>
  )
}

// ── Career Quest ──────────────────────────────────────────────────────────────
export function CareerSheet({ onClose, onSetGoals }) {
  return (
    <Sheet title="Career Quest" onClose={onClose}>
      <Note>Career Quest is coming soon.</Note>
      <p style={P}>
        You’ll answer a few questions about what you enjoy and what you’re good at, and see
        careers that fit, with the university courses and JAMB subjects each one needs.
      </p>
      <p style={P}>Already know where you’re headed? Set your university and course now so your practice lines up with it.</p>
      <SaveButton onClick={onSetGoals} label="Set my university goal" />
    </Sheet>
  )
}

// ── Parents Report ────────────────────────────────────────────────────────────
export function ParentsSheet({ profile, isGuest, onClose, onSaved }) {
  const [email,  setEmail]  = useState(profile?.parent_email ?? '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  async function save(value) {
    setSaving(true)
    setError(null)
    try {
      const res  = await fetch('/api/student/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_email: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Couldn’t save the email. Check your connection and try again.')
      const saved = value.trim().toLowerCase() || null
      cacheAuthProfile({ ...profile, parent_email: saved })
      onSaved({ parent_email: saved })
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (isGuest) {
    return (
      <Sheet title="Parents Report" onClose={onClose}>
        <p style={P}>
          Every week your parent gets an email with the days you studied, the topics you covered,
          and how your scores changed.
        </p>
        <Note tone="warn">Reports need a free account so your progress can be sent from our servers.</Note>
        <SignupLink />
      </Sheet>
    )
  }

  return (
    <Sheet title="Parents Report" onClose={onClose}>
      <p style={P}>
        Every week your parent gets an email with the days you studied, the topics you covered,
        and how your scores changed.
      </p>
      {profile?.parent_email && <Note tone="ok">Weekly reports go to {profile.parent_email}.</Note>}
      <Field label="Parent’s email" type="email" value={email} onChange={setEmail} placeholder="parent@example.com" hint="Only used for the weekly report." />
      {error && <p role="alert" style={{ fontSize: 12, color: RED, marginBottom: 12 }}>{error}</p>}
      <SaveButton onClick={() => save(email)} saving={saving} label={profile?.parent_email ? 'Update email' : 'Send weekly reports'} />
      {profile?.parent_email && (
        <SecondaryButton onClick={() => save('')}>Stop weekly reports</SecondaryButton>
      )}
    </Sheet>
  )
}

// ── Language ──────────────────────────────────────────────────────────────────
export function LanguageSheet({ onClose }) {
  return (
    <Sheet title="Language" onClose={onClose}>
      <div role="radiogroup" aria-label="App language" style={{ borderRadius: 13, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 14 }}>
        <div role="radio" aria-checked="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-prim)' }}>
          English
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: BLUE, color: '#fff', display: 'grid', placeItems: 'center' }}><Check /></span>
        </div>
      </div>
      <p style={P}>WAEC and JAMB are written in English, so the app is too. More languages for menus and tips are planned.</p>
      <SaveButton onClick={onClose} label="Done" />
    </Sheet>
  )
}

// ── Account & Security ────────────────────────────────────────────────────────
function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 16px', fontSize: 14 }}>
      <span style={{ color: 'var(--text-tert)', fontWeight: 600 }}>{label}</span>
      <span style={{ color: 'var(--text-prim)', fontWeight: 600, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

export function AccountSheet({ profile, isGuest, onClose, onLinked, onEditInfo, onLogout }) {
  const signIn = profile?.signup_method === 'phone'
    ? formatPhoneForDisplay(profile?.phone_number)
    : profile?.email

  if (isGuest) {
    return (
      <Sheet title="Account & Security" onClose={onClose}>
        <Note tone="warn">You’re using ExamPrep as a guest. Your progress is saved on this device only.</Note>
        <p style={P}>Create a free account to back up your progress and use it on any phone or computer.</p>
        <SignupLink />
      </Sheet>
    )
  }

  return (
    <Sheet title="Account & Security" onClose={onClose}>
      <div style={{ borderRadius: 13, border: '1px solid var(--border)', marginBottom: 16 }}>
        {signIn && <DetailRow label="Signed in with" value={signIn} />}
        {profile?.class_level && <div style={{ borderTop: '1px solid var(--border)' }}><DetailRow label="Class" value={profile.class_level} /></div>}
        {profile?.student_school_name && <div style={{ borderTop: '1px solid var(--border)' }}><DetailRow label="Your school" value={profile.student_school_name} /></div>}
      </div>

      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', margin: '0 0 10px' }}>School connection</p>
      {profile?.school_id ? (
        <Note tone="ok">Connected{profile?.school_name ? ` to ${profile.school_name}` : ''}. Your teachers can see your progress.</Note>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <JoinSchool profile={profile} onLinked={onLinked} compact={false} />
        </div>
      )}

      <SaveButton onClick={onEditInfo} label="Edit my details" />
      <SecondaryButton danger onClick={onLogout}>Log out</SecondaryButton>
    </Sheet>
  )
}

// ── Notifications ─────────────────────────────────────────────────────────────
// Reflects the browser's real permission; the browser owns turning it off.
export function NotificationsSheet({ state, onEnable, onClose }) {
  const [busy, setBusy]     = useState(false)
  const [failed, setFailed] = useState(false)

  async function enable() {
    setBusy(true)
    setFailed(false)
    const ok = await onEnable().catch(() => false)
    setBusy(false)
    if (ok) onClose()
    else setFailed(true)
  }

  return (
    <Sheet title="Notifications" onClose={onClose}>
      <p style={P}>We send a daily practice reminder and let you know when your streak is at risk.</p>

      {state === 'granted' && (
        <>
          <Note tone="ok">Notifications are on for this device.</Note>
          <p style={P}>To turn them off, open your browser or phone settings, find ExamPrep, and switch notifications off.</p>
          <SaveButton onClick={onClose} label="Done" />
        </>
      )}

      {state === 'default' && (
        <>
          {failed && <Note tone="warn">Notifications weren’t turned on. If your browser asked, choose Allow.</Note>}
          <SaveButton onClick={enable} saving={busy} label="Turn on notifications" />
        </>
      )}

      {state === 'denied' && (
        <>
          <Note tone="warn">Notifications are blocked for this site.</Note>
          <p style={P}>Open your browser’s site settings for ExamPrep, allow notifications, then come back to this page.</p>
          <SaveButton onClick={onClose} label="Done" />
        </>
      )}

      {state === 'unsupported' && (
        <>
          <Note tone="warn">This browser doesn’t support notifications.</Note>
          <p style={P}>Install ExamPrep to your home screen, or open it in Chrome, to get reminders.</p>
          <SaveButton onClick={onClose} label="Done" />
        </>
      )}
    </Sheet>
  )
}

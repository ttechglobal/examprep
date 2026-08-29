'use client'
// src/app/student/profile/page.js — v4
// ─────────────────────────────────────────────────────────────────────────────
// Local-first profile page.
//
// Profile source: useStudentUser() from layout (instant, already resolved for
//   both guest [ep_guest] and authenticated [Supabase] users).
//   No fallback fetch. No redundant auth calls. No hard redirects.
//
// Saves:
//   Auth users  → /api/student/profile PATCH or /api/student/subjects PATCH
//   Guest users → setLocalProfile() from localProfile.js (localStorage)
//
// After every save, localProfile is updated so topbar + other pages stay fresh.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useRouter }       from 'next/navigation'
import { useStudentUser }  from '@/app/student/layout'
import { useTheme }        from '@/contexts/ThemeContext'
import { usePoints }       from '@/contexts/PointsContext'
import { setLocalProfile, cacheAuthProfile } from '@/lib/localProfile'
import Link from 'next/link'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const RED    = '#f43f5e'
const CYAN   = '#18B7F2'

// ── Rank ladder ───────────────────────────────────────────────────────────────
const RANKS = [
  { name: 'Bronze',    minXp: 0,     maxXp: 1000,     color: '#cd7f32', icon: '🥉' },
  { name: 'Silver I',  minXp: 1000,  maxXp: 3000,     color: '#9ca3af', icon: '🥈' },
  { name: 'Silver II', minXp: 3000,  maxXp: 5000,     color: '#6b7280', icon: '🥈' },
  { name: 'Gold I',    minXp: 5000,  maxXp: 8000,     color: GOLD,      icon: '🥇' },
  { name: 'Gold II',   minXp: 8000,  maxXp: 12000,    color: GOLD,      icon: '🥇' },
  { name: 'Platinum',  minXp: 12000, maxXp: 20000,    color: CYAN,      icon: '💎' },
  { name: 'Diamond',   minXp: 20000, maxXp: 35000,    color: BLUE,      icon: '💠' },
  { name: 'Legend',    minXp: 35000, maxXp: Infinity,  color: ORANGE,    icon: '👑' },
]
const getRank     = xp => RANKS.find(r => xp >= r.minXp && xp < r.maxXp) ?? RANKS[RANKS.length - 1]
const getNextRank = xp => { const i = RANKS.findIndex(r => xp >= r.minXp && xp < r.maxXp); return RANKS[i + 1] ?? null }

// ── Subject meta ──────────────────────────────────────────────────────────────
const SUBJ_COLOR = {
  'Mathematics': '#FF6A00', 'Further Mathematics': '#FF6A00',
  'English Language': '#22c55e', 'Use of English': '#22c55e',
  'Physics': '#7C3AED', 'Chemistry': '#1264E5', 'Biology': '#18B7F2',
  'Economics': '#f43f5e', 'Government': '#9b7ae0', 'Geography': '#34d399',
  'Literature in English': '#f9a8d4', 'Agricultural Science': '#86efac',
  'Commerce': '#818cf8', 'Accounting': '#fde68a', 'default': '#1264E5',
}
const SUBJ_ICON = {
  'Mathematics': '🧮', 'Further Mathematics': '📐',
  'English Language': '📖', 'Use of English': '📖',
  'Physics': '⚡', 'Chemistry': '⚗️', 'Biology': '🧬',
  'Economics': '📊', 'Government': '🏛️', 'Geography': '🌍',
  'Literature in English': '📚', 'Agricultural Science': '🌱',
  'Commerce': '💼', 'Accounting': '🧮', 'default': '📝',
}
const sc = n => SUBJ_COLOR[n] ?? SUBJ_COLOR.default
const si = n => SUBJ_ICON[n]  ?? SUBJ_ICON.default

const WAEC_GRADES  = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9']

// All available subjects (for guest subject picker — no API needed)
const ALL_SUBJECTS_WAEC = [
  'English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics',
  'Economics', 'Government', 'Geography', 'Commerce', 'Further Mathematics',
  'Literature in English', 'Agricultural Science', 'Accounting',
  'Christian Religious Studies',
]
const ALL_SUBJECTS_JAMB = [
  'Use of English', 'Mathematics', 'Biology', 'Chemistry', 'Physics',
  'Economics', 'Government', 'Geography', 'Commerce', 'Further Mathematics',
  'Accounting', 'Christian Religious Studies',
]


// ── Shared primitives ─────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

function SectionLabel({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.02em' }}>{children}</span>
      {action}
    </div>
  )
}

function Row({ icon, label, value, onTap, last = false }) {
  const { dark } = useTheme()
  return (
    <div
      onClick={onTap}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: last ? 'none' : '1px solid var(--border)', cursor: onTap ? 'pointer' : 'default', transition: 'background .1s' }}
      onMouseEnter={e => { if (onTap) e.currentTarget.style.background = dark ? 'rgba(255,255,255,.03)' : 'rgba(6,42,120,.02)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {icon && <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>}
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-prim)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-tert)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || 'Not set'}</span>
        {onTap && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  )
}

// ── Sheet backdrop ─────────────────────────────────────────────────────────────
function Sheet({ title, onClose, children, wide = false }) {
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
        @media (min-width: 768px) {
          .ep-sheet-container {
            border-radius: 24px !important;
            border: 1px solid var(--border) !important;
            animation: ep-sheet-in .25s ease !important;
            padding-bottom: 18px !important;
          }
          .ep-sheet-backdrop {
            justify-content: center !important;
            align-items: center !important;
          }
        }
      `}</style>
      <div className="ep-sheet-container" style={{
        width: '100%', maxWidth: wide ? 640 : 520,
        maxHeight: '92dvh', overflowY: 'auto',
        background: 'var(--bg-card)',
        borderRadius: '24px 24px 0 0',
        border: '1px solid var(--border)',
        boxShadow: '0 -8px 40px rgba(0,0,0,.4)',
        animation: 'ep-sheet-up .3s cubic-bezier(0.32,0.72,0,1)',
        // Bottom padding clears the mobile bottom nav (80px) + safe area.
        // On desktop the sheet centres so no nav overlap — handled via media query.
        paddingBottom: 'max(96px, calc(env(safe-area-inset-bottom, 0px) + 80px))',
      }}>
        <div style={{ padding: '12px 20px 0', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border)', margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.025em' }}>{title}</span>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div style={{ padding: '0 20px 24px' }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, multiline = false, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginBottom: 6 }}>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-prim)', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none', lineHeight: 1.5 }} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-prim)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
      )}
      {hint && <p style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 5 }}>{hint}</p>}
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginBottom: 6 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
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
function InfoSheet({ profile, isGuest, onClose, onSaved }) {
  const [fullName,   setFullName]   = useState(profile?.full_name   ?? '')
  const [username,   setUsername]   = useState(profile?.username    ?? '')
  const [classLevel, setClassLevel] = useState(profile?.class_level ?? '')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const trimName = fullName.trim()
      const trimUser = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_')
      if (!trimName) throw new Error('Full name is required')
      if (trimUser && trimUser.length < 3) throw new Error('Username must be at least 3 characters')

      const patch = { full_name: trimName, username: trimUser || undefined, class_level: classLevel || undefined }

      if (isGuest) {
        // Guest: save to localStorage only
        setLocalProfile({ ...patch, full_name: trimName, username: trimUser })
        try { localStorage.setItem('ep_student_name', trimName) } catch {}
      } else {
        // Auth user: save via API
        const res  = await fetch('/api/student/profile', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        const data = await res.json()
        if (!res.ok) {
          if (data.error?.includes('unique') || data.error?.includes('duplicate')) throw new Error('That username is taken — try another')
          throw new Error(data.error ?? 'Save failed')
        }
        // Keep local cache in sync
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
      <Field label="Full name"  value={fullName}   onChange={setFullName}   placeholder="Ada Okafor" />
      <Field label="Username"   value={username}   onChange={setUsername}   placeholder="ada_okafor" hint="Shown on the leaderboard — no spaces" />
      <SelectField label="Class" value={classLevel} onChange={setClassLevel} options={['SS1', 'SS2', 'SS3']} />
      {error && <p style={{ fontSize: 12, color: RED, marginBottom: 12 }}>{error}</p>}
      <SaveButton onClick={save} saving={saving} />
    </Sheet>
  )
}


// ── SHEET 2: Exams & Subjects ──────────────────────────────────────────────────
function SubjectsSheet({ profile, isGuest, onClose, onSaved }) {
  const [step,         setStep]        = useState(1)
  const [activeExams,  setActiveExams] = useState(() => {
    const exams = []
    if (profile?.subjects_waec?.length || profile?.exam_types?.includes?.('WAEC')) exams.push('WAEC')
    if (profile?.subjects_jamb?.length || profile?.exam_types?.includes?.('JAMB')) exams.push('JAMB')
    return exams.length ? exams : ['WAEC']
  })
  const [currentExam,  setCurrentExam] = useState(null)
  const [waecSubjects, setWaecSubjects]= useState(profile?.subjects_waec ?? [])
  const [jambSubjects, setJambSubjects]= useState(profile?.subjects_jamb ?? [])
  const [allSubjects,  setAllSubjects] = useState([])
  const [loadingSubjs, setLoadingSubjs]= useState(false)
  const [saving,       setSaving]      = useState(false)
  const [error,        setError]       = useState(null)

  useEffect(() => {
    if (!currentExam) return

    if (isGuest) {
      // Guests use the hardcoded list — no API call needed
      const list = currentExam === 'WAEC' ? ALL_SUBJECTS_WAEC : ALL_SUBJECTS_JAMB
      setAllSubjects(list)
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
        setAllSubjects(names)
      })
      .catch(() => {
        // Fall back to hardcoded list if API fails
        setAllSubjects(currentExam === 'WAEC' ? ALL_SUBJECTS_WAEC : ALL_SUBJECTS_JAMB)
      })
      .finally(() => setLoadingSubjs(false))
  }, [currentExam, isGuest])

  function toggleExam(exam) {
    setActiveExams(prev => prev.includes(exam) ? prev.filter(e => e !== exam) : [...prev, exam])
  }

  function toggleSubject(name, exam) {
    if (exam === 'WAEC') {
      setWaecSubjects(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])
    } else {
      setJambSubjects(prev => {
        if (prev.includes(name)) return prev.filter(s => s !== name)
        if (prev.length >= 4) return prev
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
        setLocalProfile(patch)
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
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 13, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>{exam} Subjects</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 2 }}>
                      {subs.length > 0
                        ? subs.slice(0, 3).join(', ') + (subs.length > 3 ? ` +${subs.length - 3} more` : '')
                        : 'Tap to select subjects'}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
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

      {isJAMB && (
        <div style={{ padding: '10px 14px', borderRadius: 11, background: `${ORANGE}10`, border: `1px solid ${ORANGE}30`, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: ORANGE, margin: 0 }}>
            JAMB requires exactly 4 subjects — <strong>{selected.length}</strong> selected
          </p>
        </div>
      )}

      {loadingSubjs ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2.5px solid var(--border)`, borderTopColor: BLUE, animation: 'spin .7s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
          {allSubjects.map(name => {
            const on     = selected.includes(name)
            const color  = sc(name)
            const capped = isJAMB && !on && selected.length >= 4
            return (
              <button key={name} onClick={() => !capped && toggleSubject(name, currentExam)}
                style={{ padding: '14px 12px', borderRadius: 14, cursor: capped ? 'not-allowed' : 'pointer', border: `2px solid ${on ? color : 'var(--border)'}`, background: on ? `${color}12` : 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, fontFamily: 'inherit', textAlign: 'left', opacity: capped ? 0.4 : 1, transition: 'all .12s' }}>
                <span style={{ fontSize: 20 }}>{si(name)}</span>
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

      <button onClick={() => { setStep(1); setAllSubjects([]) }}
        style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: 15, background: `linear-gradient(135deg,${NAVY},${BLUE})`, color: '#fff', boxShadow: `0 4px 16px ${BLUE}40` }}>
        Done — {selected.length} subject{selected.length !== 1 ? 's' : ''} selected
      </button>
    </Sheet>
  )
}


// ── SHEET 3: Goals & Targets ───────────────────────────────────────────────────
function GoalsSheet({ profile, isGuest, onClose, onSaved, focus }) {
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
    if (stored && typeof stored === 'object') return stored
    const total = profile?.target_jamb ?? storedGoals.target_jamb
    const each  = (total && jambSubs.length) ? Math.round(total / jambSubs.length) : 50
    return Object.fromEntries(jambSubs.map(s => [s, each]))
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
                        <span style={{ fontSize: 16 }}>{si(subj)}</span>
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
                  <span style={{ fontSize: 16 }}>{si(subj)}</span>
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


// ── Connect School ─────────────────────────────────────────────────────────────
function ConnectSchool({ profile, isGuest, onLinked }) {
  const { dark }          = useTheme()
  const [code,   setCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [err,    setErr]  = useState(null)
  const [done,   setDone] = useState(false)

  const isConnected = !!(profile?.school_id)
  const schoolLabel = profile?.school_name || (isConnected ? 'School connected' : null)

  async function connect() {
    if (isGuest) { setErr('Create an account to connect your school.'); return }
    const clean = code.trim().toUpperCase()
    if (!clean) return
    setSaving(true); setErr(null)
    try {
      const res  = await fetch('/api/admin/access-codes/redeem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Invalid code')
      setDone(true)
      onLinked?.({ school_id: data.school_id })
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  if (done || isConnected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: dark ? 'rgba(34,197,94,.08)' : 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.25)' }}>
        <span style={{ fontSize: 18 }}>🏫</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: GREEN }}>School connected</div>
          {schoolLabel && <div style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{schoolLabel}</div>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>✓</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, background: dark ? 'rgba(255,255,255,.03)' : 'rgba(6,42,120,.03)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>🏫</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)' }}>Connect your school</div>
          <div style={{ fontSize: 11, color: 'var(--text-tert)' }}>Enter the code your teacher gave you</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setErr(null) }}
          onKeyDown={e => e.key === 'Enter' && connect()}
          placeholder="e.g. KINGS2025" maxLength={20}
          style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${err ? RED : 'var(--border)'}`, background: 'var(--bg-card)', color: 'var(--text-prim)', fontSize: 13, fontFamily: 'inherit', outline: 'none', letterSpacing: '.05em', fontWeight: 700, textTransform: 'uppercase' }} />
        <button onClick={connect} disabled={saving || !code.trim()}
          style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: BLUE, color: '#fff', fontSize: 13, fontWeight: 800, cursor: saving || !code.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving || !code.trim() ? 0.6 : 1, whiteSpace: 'nowrap' }}>
          {saving ? '…' : 'Connect'}
        </button>
      </div>
      {err && <p style={{ fontSize: 11, color: RED, marginTop: 6, margin: 0 }}>{err}</p>}
    </div>
  )
}


// ── Avatar + rank card ─────────────────────────────────────────────────────────
function AvatarCard({ profile, xp, isGuest, onEditInfo, onLinked }) {
  const { dark } = useTheme()
  const rank     = getRank(xp)
  const next     = getNextRank(xp)
  const xpInLvl  = xp - rank.minXp
  const xpRange  = (next?.minXp ?? xp + 1) - rank.minXp
  const pct      = Math.min(100, xpRange > 0 ? Math.round((xpInLvl / xpRange) * 100) : 100)
  const level    = Math.floor(xp / 2000) + 1
  const dName    = profile?.full_name || profile?.username || 'Student'
  const initials = dName.slice(0, 2).toUpperCase()

  return (
    <Card>
      <div style={{ height: 64, background: `linear-gradient(135deg,${NAVY},${BLUE})`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle,rgba(24,183,242,.2),transparent 70%)', pointerEvents: 'none' }} />
      </div>

      <div style={{ padding: '0 20px 20px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -32, marginBottom: 12 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg,${NAVY},${BLUE})`, border: '3px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: GOLD, flexShrink: 0 }}>
            {initials}
          </div>
          <button onClick={onEditInfo}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 11, border: `1.5px solid ${BLUE}`, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, color: BLUE }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9.5 1.5l3 3L4 13H1v-3L9.5 1.5z" stroke={BLUE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Edit Profile
          </button>
        </div>

        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.03em', marginBottom: 2 }}>{dName}</div>
        {profile?.username && <div style={{ fontSize: 12, color: 'var(--text-tert)', marginBottom: 3 }}>@{profile.username}</div>}
        {isGuest && <div style={{ fontSize: 11, color: ORANGE, fontWeight: 700, marginBottom: 8 }}>Guest · progress saved locally</div>}

        <div style={{ padding: '14px', borderRadius: 14, background: dark ? 'rgba(255,255,255,.04)' : 'rgba(6,42,120,.04)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>{rank.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-prim)' }}>{rank.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-tert)' }}>Level {level}</div>
              </div>
            </div>
            {next && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: BLUE }}>{(next.minXp - xp).toLocaleString()} XP</div>
                <div style={{ fontSize: 10, color: 'var(--text-tert)' }}>to {next.name}</div>
              </div>
            )}
          </div>
          <div style={{ height: 6, borderRadius: 999, background: dark ? 'rgba(255,255,255,.1)' : 'rgba(6,42,120,.08)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: `linear-gradient(90deg,${rank.color},${next?.color ?? rank.color})`, transition: 'width .8s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: 'var(--text-tert)' }}>{xp.toLocaleString()} XP total</span>
            <Link href="/student/leaderboard" style={{ textDecoration: 'none', fontSize: 10, fontWeight: 700, color: BLUE }}>View all ranks →</Link>
          </div>
        </div>

        {!isGuest && (
          <div style={{ marginTop: 14 }}>
            <ConnectSchool profile={profile} isGuest={isGuest} onLinked={onLinked} />
          </div>
        )}

        <button onClick={onEditInfo}
          style={{ width: '100%', padding: '11px', borderRadius: 12, border: `1.5px solid ${BLUE}`, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, background: 'transparent', color: BLUE, marginTop: 12 }}>
          Edit Profile
        </button>
      </div>
    </Card>
  )
}


// ── Goals summary card ─────────────────────────────────────────────────────────
function GoalsSummary({ profile, onEdit }) {
  // Read from profile OR local ep_goals fallback
  const local = (() => { try { return JSON.parse(localStorage.getItem('ep_goals') || '{}') } catch { return {} } })()
  const university = profile?.target_university ?? local.university ?? null
  const course     = profile?.target_course     ?? local.course     ?? null
  const jambTarget = profile?.target_jamb       ?? local.target_jamb ?? null
  const waecSubs   = profile?.subjects_waec ?? []
  const waecGrades = profile?.target_waec ?? local.target_waec ?? {}
  const hasGrades  = typeof waecGrades === 'object' && Object.keys(waecGrades).length > 0

  return (
    <Card>
      <Row icon="🏛️" label="University"  value={university}                              onTap={onEdit} />
      <Row icon="📚" label="Course"       value={course}                                  onTap={onEdit} />
      <Row icon="📋" label="JAMB Target"  value={jambTarget ? `${jambTarget} / 400` : null} onTap={() => onEdit('jamb')} />

      {waecSubs.length > 0 && (
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-tert)', textTransform: 'uppercase', letterSpacing: '.06em' }}>WAEC Grade Targets</span>
            <button onClick={onEdit} style={{ fontSize: 11, fontWeight: 700, color: BLUE, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Edit →</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {waecSubs.map(subj => {
              const grade = hasGrades ? waecGrades[subj] : null
              const color = grade ? (grade === 'A1' ? GREEN : grade.startsWith('B') ? BLUE : grade.startsWith('C') ? ORANGE : RED) : 'var(--text-tert)'
              return (
                <div key={subj} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-prim)', fontWeight: 600 }}>{subj}</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color }}>{grade || '—'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}


// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router              = useRouter()
  const { dark, toggle }    = useTheme()
  const { totalPoints: xp } = usePoints()
  const layoutProfile       = useStudentUser()  // instant — from layout

  // Local profile state seeded from layout context, patched on save
  const [profile, setProfile] = useState(null)
  const [sheet,   setSheet]   = useState(null)

  useEffect(() => {
    if (layoutProfile !== null) setProfile(layoutProfile)
  }, [layoutProfile])

  function patchProfile(updates) {
    setProfile(p => ({ ...p, ...updates }))
  }

  async function logout() {
    const { createClient } = await import('@/lib/supabase/client')
    const s = createClient()
    await s.auth.signOut()
    // Clear local auth cache but preserve guest data
    try { localStorage.removeItem('ep_profile_cache') } catch {}
    router.replace('/onboarding')
  }

  // Skeleton while layout resolves
  if (!profile) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {[180, 120, 100].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: 0.6 }} />
      ))}
    </div>
  )

  const isGuest = !!profile.isGuest

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Guest banner */}
      {isGuest && (
        <div style={{ borderRadius: 16, padding: '16px 18px', background: `${ORANGE}08`, border: `1.5px solid ${ORANGE}30`, marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 4 }}>Back up your progress 📲</div>
          <div style={{ fontSize: 12, color: 'var(--text-tert)', lineHeight: 1.5, marginBottom: 10 }}>Create a free account to save progress and sync across devices.</div>
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: 13, background: ORANGE, color: '#fff' }}>Create Free Account →</button>
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <AvatarCard profile={profile} xp={xp} isGuest={isGuest} onEditInfo={() => setSheet({ type: 'info' })} onLinked={patchProfile} />

        {/* Exams & Subjects */}
        <div>
          <SectionLabel action={<button onClick={() => setSheet({ type: 'subjects' })} style={{ fontSize: 12, fontWeight: 700, color: BLUE, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Edit →</button>}>
            Exams & Subjects
          </SectionLabel>
          <Card>
            {['WAEC', 'JAMB'].map((exam, i) => {
              const subs = exam === 'WAEC' ? profile?.subjects_waec : profile?.subjects_jamb
              return (
                <div key={exam} onClick={() => setSheet({ type: 'subjects' })}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: i === 0 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>{exam}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 2 }}>
                      {subs?.length ? subs.slice(0, 3).join(', ') + (subs.length > 3 ? ` +${subs.length - 3}` : '') : 'Not set up'}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )
            })}
          </Card>
        </div>

        {/* Goals & Targets */}
        <div>
          <SectionLabel action={<button onClick={() => setSheet({ type: 'goals', focus: null })} style={{ fontSize: 12, fontWeight: 700, color: BLUE, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Edit →</button>}>
            Goals & Targets
          </SectionLabel>
          <GoalsSummary profile={profile} onEdit={focus => setSheet({ type: 'goals', focus })} />
        </div>

        {/* Premium card */}
        <div style={{ borderRadius: 18, padding: '20px', background: `linear-gradient(135deg,${NAVY},${BLUE})`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.06)', pointerEvents: 'none' }} />
          <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', marginBottom: 4 }}>👑 Upgrade to Premium</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', lineHeight: 1.5, marginBottom: 14 }}>Unlimited practice, AI explanations, offline mode and more.</div>
          <button style={{ width: '100%', padding: '11px', borderRadius: 11, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: 13, background: GOLD, color: NAVY }}>⚡ Activate Premium</button>
        </div>

        {/* Settings */}
        <div>
          <SectionLabel>Settings</SectionLabel>
          <Card style={{ marginBottom: 10 }}>
            <Row icon="🎨" label="Appearance"    value={dark ? 'Dark Mode' : 'Light Mode'} onTap={toggle} />
            <Row icon="🔔" label="Notifications" value="On" />
            <Row icon="🌐" label="Language"      value="English" last />
          </Card>
          {!isGuest && (
            <button onClick={logout}
              style={{ width: '100%', padding: '13px', borderRadius: 13, border: `1.5px solid ${RED}30`, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, background: 'transparent', color: RED, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M7 16H3a1 1 0 01-1-1V3a1 1 0 011-1h4M12 13l4-4-4-4M16 9H7" stroke={RED} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Log Out
            </button>
          )}
        </div>

        {/* Help */}
        <Card>
          {[['❓', 'Help Center'], ['💬', 'Contact Support'], ['📩', 'Send Feedback']].map(([icon, label], i) => (
            <Row key={i} icon={icon} label={label} last={i === 2} />
          ))}
        </Card>
      </div>

      {/* Sheets */}
      {sheet?.type === 'info' && (
        <InfoSheet profile={profile} isGuest={isGuest} onClose={() => setSheet(null)} onSaved={patchProfile} />
      )}
      {sheet?.type === 'subjects' && (
        <SubjectsSheet profile={profile} isGuest={isGuest} onClose={() => setSheet(null)} onSaved={patchProfile} />
      )}
      {sheet?.type === 'goals' && (
        <GoalsSheet profile={profile} isGuest={isGuest} focus={sheet?.focus ?? null} onClose={() => setSheet(null)} onSaved={patchProfile} />
      )}
    </>
  )
}
// src/app/student/profile/page.js
// Fixes in this version:
// 1. Exam label: 'BOTH' → 'WAEC & JAMB' everywhere it appears
// 2. Subjects display: shows all subjects with JAMB/WAEC split when exam_type is BOTH
// 3. All badge/pill backgrounds use theme-aware classes (no hardcoded colors that break in light mode)
// 4. Exam selector buttons show 'WAEC & JAMB' instead of 'BOTH'

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import GoalModal from '@/components/dashboard/GoalModal'

// ── Helpers ───────────────────────────────────────────────────────────────────
function examLabel(examType) {
  if (examType === 'BOTH') return 'WAEC & JAMB'
  return examType ?? 'WAEC'
}

// JAMB subjects list (for splitting display when BOTH)
const JAMB_SUBJECTS_SET = new Set([
  'Use of English', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Economics', 'Government', 'Geography', 'History', 'Commerce', 'Accounting',
  'Agricultural Science', 'Further Mathematics', 'Computer Science',
  'Civic Education', 'Christian Religious Studies', 'Islamic Religious Studies',
  'Literature in English', 'Yoruba', 'Igbo', 'Hausa',
])

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children, action }) {
  return (
    <div className="bg-card rounded-3xl border border-default overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-default">
        <h3 className="text-sm font-black text-primary uppercase tracking-wide">{title}</h3>
        {action}
      </div>
      <div className="px-5 py-4 space-y-3">
        {children}
      </div>
    </div>
  )
}

// ── Editable field ────────────────────────────────────────────────────────────
function EditableField({ label, value, placeholder, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value ?? '')
  const [saving, setSaving]   = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(val)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-tertiary mb-0.5">{label}</p>
        {editing ? (
          <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="w-full text-sm border border-default rounded-xl px-3 py-2 bg-card text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400"
            autoFocus />
        ) : (
          <p className="text-sm font-medium text-primary truncate">{value || <span className="text-tertiary">{placeholder}</span>}</p>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setEditing(false)} className="text-xs text-secondary hover:text-primary font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="text-xs font-black text-indigo-600 hover:text-indigo-500 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="text-xs font-bold text-indigo-500 hover:text-indigo-400 flex-shrink-0">Edit</button>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile,       setProfile]       = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [message,       setMessage]       = useState(null)
  const [parentEmail,   setParentEmail]   = useState('')
  const [parentReports, setParentReports] = useState(false)
  const [saving,        setSaving]        = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setParentEmail(data?.parent_email ?? '')
      setParentReports(data?.parent_reports_enabled ?? false)
      setLoading(false)
    }
    init()
  }, [])

  async function updateProfile(updates) {
    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)
    if (!error) {
      setProfile(prev => ({ ...prev, ...updates }))
      setMessage({ type: 'success', text: 'Saved ✓' })
      setTimeout(() => setMessage(null), 2000)
    } else {
      setMessage({ type: 'error', text: error.message })
    }
  }

  async function saveParentSettings() {
    setSaving(true)
    await updateProfile({ parent_email: parentEmail || null, parent_reports_enabled: parentReports })
    setSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const initials = (profile?.full_name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const examType = profile?.exam_type ?? 'WAEC'

  // Split subjects for display when doing both exams
  const allSubjects    = profile?.subjects ?? []
  const jambSubjects   = allSubjects.filter(s => JAMB_SUBJECTS_SET.has(s))
  // WAEC = all subjects the student has (they overlap, so just show all for WAEC)
  // Show WAEC subjects as the full list since WAEC has more subjects
  const waecSubjects   = allSubjects // all subjects apply to WAEC

  return (
    <div className="space-y-5">
      {showGoalModal && profile && (
        <GoalModal
          profile={profile}
          onClose={() => {
            setShowGoalModal(false)
            supabase.from('profiles').select('*').eq('id', profile.id).single()
              .then(({ data }) => setProfile(data))
          }}
        />
      )}

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>{message.text}</div>
      )}

      {/* Avatar header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-2xl font-black">{initials}</span>
          </div>
          <div>
            <h2 className="text-xl font-black">{profile?.full_name}</h2>
            {/* Fix: show WAEC & JAMB instead of BOTH */}
            <p className="text-indigo-200 text-sm">{examLabel(examType)} Student</p>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <Section title="Personal Info">
        <EditableField label="Full name" value={profile?.full_name} placeholder="Your name" onSave={val => updateProfile({ full_name: val })} />
        <div className="h-px bg-subtle -mx-5" />
        <EditableField label="School" value={profile?.school_name} placeholder="Your school" onSave={val => updateProfile({ school_name: val })} />
        <div className="h-px bg-subtle -mx-5" />
        <EditableField label="Class / Year" value={profile?.class_year} placeholder="e.g. SS3" onSave={val => updateProfile({ class_year: val })} />
      </Section>

      {/* Exams & Subjects */}
      <Section title="Exams & Subjects">
        {/* Exam selector — shows WAEC & JAMB instead of BOTH */}
        <div>
          <p className="text-xs text-tertiary mb-2">Exams you're sitting</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'WAEC',  label: 'WAEC' },
              { value: 'JAMB',  label: 'JAMB' },
              { value: 'BOTH',  label: 'WAEC & JAMB' },
            ].map(({ value, label }) => (
              <button key={value} onClick={() => updateProfile({ exam_type: value })}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                  examType === value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-subtle text-secondary hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-tertiary mt-2">Changing this updates your Learn tab immediately.</p>
        </div>

        {/* Subjects — split by exam when doing BOTH */}
        {examType === 'BOTH' ? (
          <div className="space-y-4">
            {/* WAEC subjects — all subjects */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black text-white bg-emerald-600 px-2 py-0.5 rounded-full">WAEC</span>
                <p className="text-xs text-tertiary">{waecSubjects.length} subjects</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {waecSubjects.map(subject => {
                  const color = getSubjectColor(subject)
                  return (
                    <span key={`waec-${subject}`} className={`text-xs px-2.5 py-1 rounded-full font-medium ${color.bg} ${color.text}`}>
                      {subject}
                    </span>
                  )
                })}
              </div>
            </div>
            {/* JAMB subjects */}
            {jambSubjects.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-black text-white bg-indigo-600 px-2 py-0.5 rounded-full">JAMB</span>
                  <p className="text-xs text-tertiary">{jambSubjects.length} subjects</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {jambSubjects.map(subject => {
                    const color = getSubjectColor(subject)
                    return (
                      <span key={`jamb-${subject}`} className={`text-xs px-2.5 py-1 rounded-full font-medium ${color.bg} ${color.text}`}>
                        {subject}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-xs text-tertiary mb-2">Your subjects</p>
            <div className="flex flex-wrap gap-2">
              {allSubjects.map(subject => {
                const color = getSubjectColor(subject)
                return (
                  <span key={subject} className={`text-xs px-2.5 py-1 rounded-full font-medium ${color.bg} ${color.text}`}>
                    {subject}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-tertiary">To change your subjects, use the Goals modal or retake the diagnostic.</p>
      </Section>

      {/* Goals */}
      <Section title="My Goals" action={
        <button onClick={() => setShowGoalModal(true)} className="text-xs font-bold text-indigo-500 hover:text-indigo-400">Edit</button>
      }>
        {profile?.university_course ? (
          <div className="flex items-center gap-3">
            <span className="text-xl">🎓</span>
            <div>
              <p className="text-xs text-tertiary">Target university course</p>
              <p className="text-sm font-bold text-primary">{profile.university_course}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-tertiary">No course target set yet</p>
        )}

        <div>
          <p className="text-xs text-tertiary mb-1">Exam date</p>
          <input type="date" defaultValue={profile?.exam_date ?? ''}
            onChange={e => updateProfile({ exam_date: e.target.value || null })}
            className="text-sm border border-default rounded-xl px-3 py-2 bg-subtle text-primary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <p className="text-xs text-tertiary mt-1">Used to prioritise your study suggestions.</p>
        </div>

        {/* WAEC target grades — ALL subjects, theme-aware pills */}
        {Object.keys(profile?.waec_target_grades ?? {}).length > 0 && (
          <div>
            <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-2">WAEC Targets</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(profile.waec_target_grades).map(([sub, grade]) => (
                <span key={sub} className="text-xs px-2.5 py-1 rounded-xl font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {sub.slice(0, 5)} · {grade}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* JAMB target scores — theme-aware pills */}
        {Object.keys(profile?.jamb_target_scores ?? {}).length > 0 && (
          <div>
            <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-2">JAMB Targets</p>
            <div className="flex items-center gap-2 mb-2">
              {profile.jamb_total_target && (
                <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                  {profile.jamb_total_target}<span className="text-xs font-normal text-tertiary">/400</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(profile.jamb_target_scores).map(([sub, score]) => (
                <span key={sub} className="text-xs px-2.5 py-1 rounded-xl font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {sub.slice(0, 4)} · {score}
                </span>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Parent reports */}
      <Section title="Parent Reports">
        <div>
          <p className="text-xs text-tertiary mb-1.5">Parent's email address</p>
          <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)}
            placeholder="parent@example.com"
            className="w-full text-sm border border-default rounded-xl px-3 py-2 bg-subtle text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <p className="text-xs text-tertiary mt-1">Weekly summary emails with your progress.</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-primary">Enable parent reports</p>
          <button onClick={() => setParentReports(p => !p)}
            className={`relative w-11 h-6 rounded-full transition-colors ${parentReports ? 'bg-indigo-600' : 'bg-subtle border border-default'}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${parentReports ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <button onClick={saveParentSettings} disabled={saving}
          className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : 'Save parent settings'}
        </button>
      </Section>

      {/* Account */}
      <Section title="Account">
        <button className="w-full flex items-center justify-between py-3 px-4 border border-default rounded-2xl hover:bg-subtle transition-colors">
          <span className="text-sm font-medium text-primary">Change password</span>
          <span className="text-secondary">→</span>
        </button>
        <button className="w-full flex items-center justify-between py-3 px-4 border border-default rounded-2xl hover:bg-subtle transition-colors">
          <span className="text-sm font-medium text-primary">Notification preferences</span>
          <span className="text-secondary">→</span>
        </button>
      </Section>

      <button onClick={handleSignOut}
        className="w-full py-3 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-bold rounded-2xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
        Sign out
      </button>

      <div className="h-4" />
    </div>
  )
}
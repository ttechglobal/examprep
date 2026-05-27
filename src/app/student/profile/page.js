'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import GoalModal from '@/components/dashboard/GoalModal'

// ── Section wrapper ───────────────────────────────────────────
function Section({ title, children, action }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-gray-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── Inline editable field ─────────────────────────────────────
function EditableField({ label, value, onSave, placeholder, type = 'text' }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(val)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        {editing ? (
          <input
            type={type}
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={placeholder}
            className="w-full text-sm border-b border-indigo-400 outline-none py-0.5 bg-transparent"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          />
        ) : (
          <p className="text-sm font-medium text-gray-800 truncate">{value || <span className="text-gray-400">{placeholder}</span>}</p>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => { setEditing(false); setVal(value ?? '') }} className="text-xs text-gray-400 px-2 py-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="text-xs font-bold text-indigo-600 px-2 py-1">{saving ? '…' : 'Save'}</button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="text-xs font-bold text-indigo-600 flex-shrink-0">Edit</button>
      )}
    </div>
  )
}

// ── Main Profile page ─────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [parentEmail, setParentEmail] = useState('')
  const [parentReports, setParentReports] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setParentEmail(data?.parent_email ?? '')
      setParentReports(data?.send_parent_reports ?? false)
      setLoading(false)
    })
  }, [])

  const updateProfile = async (updates) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (data) setProfile(data)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const saveParentSettings = async () => {
    setSaving(true)
    await updateProfile({ parent_email: parentEmail || null, send_parent_reports: parentReports })
    setMessage({ type: 'success', text: 'Parent settings saved' })
    setSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'
  const examType = profile?.exam_type ?? 'WAEC'

  return (
    <div className="space-y-5">

      {showGoalModal && profile && (
        <GoalModal
          profile={profile}
          onClose={() => {
            setShowGoalModal(false)
            supabase.from('profiles').select('*').eq('id', profile.id).single().then(({ data }) => setProfile(data))
          }}
        />
      )}

      {/* Message */}
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Avatar header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-2xl font-black">{initials}</span>
          </div>
          <div>
            <h2 className="text-xl font-black">{profile?.full_name}</h2>
            <p className="text-indigo-200 text-sm">{examType} Student</p>
          </div>
        </div>
      </div>

      {/* ── Personal Info ── */}
      <Section title="Personal Info">
        <EditableField
          label="Full name"
          value={profile?.full_name}
          placeholder="Your name"
          onSave={val => updateProfile({ full_name: val })}
        />
        <div className="h-px bg-gray-50 -mx-5 my-1" />
        <EditableField
          label="School"
          value={profile?.school_name}
          placeholder="Your school"
          onSave={val => updateProfile({ school_name: val })}
        />
        <div className="h-px bg-gray-50 -mx-5 my-1" />
        <EditableField
          label="Class / Year"
          value={profile?.class_year}
          placeholder="e.g. SS3"
          onSave={val => updateProfile({ class_year: val })}
        />
      </Section>

      {/* ── Exam & Subject Management ── */}
      <Section title="Exams & Subjects">
        {/* Exam type */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Exams you're sitting</p>
          <div className="flex gap-2">
            {['WAEC', 'JAMB', 'BOTH'].map(exam => (
              <button
                key={exam}
                onClick={() => updateProfile({ exam_type: exam })}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                  examType === exam
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {exam}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Changing this will update your Learn tab immediately.</p>
        </div>

        {/* Subjects */}
        <div>
          <p className="text-xs text-gray-400 mb-2">Your subjects</p>
          <div className="flex flex-wrap gap-2">
            {(profile?.subjects ?? []).map(subject => {
              const color = getSubjectColor(subject)
              return (
                <span key={subject} className={`text-sm px-3 py-1.5 rounded-full font-medium ${color.bg} ${color.text}`}>
                  {subject}
                </span>
              )
            })}
          </div>
          {/* TODO: Add subject editor — add/remove subjects and regenerate learning path */}
          <p className="text-xs text-gray-400 mt-3">
            To change your subjects, contact support or retake the diagnostic.
          </p>
        </div>
      </Section>

      {/* ── Goals ── */}
      <Section
        title="My Goals"
        action={
          <button onClick={() => setShowGoalModal(true)} className="text-xs font-bold text-indigo-600 hover:underline">
            Edit
          </button>
        }
      >
        {/* University course */}
        {profile?.university_course ? (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">🎓</span>
            <div>
              <p className="text-xs text-gray-400">Target university course</p>
              <p className="text-sm font-bold text-gray-800">{profile.university_course}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-4">No course target set yet</p>
        )}

        {/* Exam date */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">Exam date</p>
          <input
            type="date"
            defaultValue={profile?.exam_date ?? ''}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
            onChange={e => updateProfile({ exam_date: e.target.value || null })}
          />
          <p className="text-xs text-gray-400 mt-1">Used to prioritise your study suggestions</p>
        </div>

        {/* WAEC targets */}
        {Object.keys(profile?.waec_target_grades ?? {}).length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">WAEC Targets</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(profile.waec_target_grades).map(([sub, grade]) => {
                const color = getSubjectColor(sub)
                return (
                  <span key={sub} className={`text-xs px-2.5 py-1 rounded-full ${color.bg} ${color.text} font-medium`}>
                    {sub}: {grade}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* JAMB targets */}
        {Object.keys(profile?.jamb_target_scores ?? {}).length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">JAMB Targets</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(profile.jamb_target_scores).map(([sub, score]) => {
                const color = getSubjectColor(sub)
                return (
                  <span key={sub} className={`text-xs px-2.5 py-1 rounded-full ${color.bg} ${color.text} font-medium`}>
                    {sub}: {score}
                  </span>
                )
              })}
            </div>
            {profile?.jamb_total_target && (
              <p className="text-sm font-bold text-indigo-700 mt-2">Total target: {profile.jamb_total_target}/400</p>
            )}
          </div>
        )}

        {!profile?.goals_set && (
          <button
            onClick={() => setShowGoalModal(true)}
            className="w-full mt-3 py-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold rounded-xl hover:bg-amber-100 transition-colors"
          >
            🎯 Set your exam goals
          </button>
        )}
      </Section>

      {/* ── Parent / Guardian ── */}
      <Section title="Parent / Guardian">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Parent or guardian email</label>
            <input
              type="email"
              value={parentEmail}
              onChange={e => setParentEmail(e.target.value)}
              placeholder="parent@email.com"
              className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Weekly progress reports</p>
              <p className="text-xs text-gray-400">Send a summary to your parent each week</p>
            </div>
            <button
              onClick={() => setParentReports(p => !p)}
              className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                parentReports ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                parentReports ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <button
            onClick={saveParentSettings}
            disabled={saving}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save parent settings'}
          </button>
        </div>
      </Section>

      {/* ── Account ── */}
      <Section title="Account">
        <div className="space-y-3">
          {/* TODO: Change password flow */}
          <button className="w-full flex items-center justify-between py-3 px-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
            <span className="text-sm font-medium text-gray-700">Change password</span>
            <span className="text-gray-400">→</span>
          </button>

          {/* TODO: Notification preferences */}
          <button className="w-full flex items-center justify-between py-3 px-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
            <span className="text-sm font-medium text-gray-700">Notification preferences</span>
            <span className="text-gray-400">→</span>
          </button>
        </div>
      </Section>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full py-3 border border-red-200 text-red-600 text-sm font-bold rounded-2xl hover:bg-red-50 transition-colors"
      >
        Sign out
      </button>

      <div className="h-4" /> {/* bottom spacing */}
    </div>
  )
}
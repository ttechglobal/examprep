'use client'
// src/app/student/profile/page.js — prototype-faithful redesign
// Matches prototype-v3 exactly:
//   1. Dark navy hero card with dot pattern, initials avatar, badge shelf
//   2. 3-stat row (Streak / Questions / Avg score)
//   3. Subject mastery card (icon + bar + status)
//   4. Exam targets card
//   5. Account settings card (icon rows with chevrons)
// All existing data logic (GoalModal, EditableField, parent reports, sign out) preserved.

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import GoalModal from '@/components/dashboard/GoalModal'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import Link from 'next/link'
import { Suspense, lazy } from 'react'

// ── Subject icon map ──────────────────────────────────────────────────────────
const ICONS = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📖',
}
const getIcon = n => ICONS[n] ?? ICONS.default

// ── Badge definitions ─────────────────────────────────────────────────────────
function buildBadges(profile, stats) {
  return [
    { emoji: '🔥', label: '12-day streak',       earned: (stats?.streak ?? 0) >= 3 },
    { emoji: '💯', label: '100 questions done',  earned: (stats?.totalQs ?? 0) >= 100 },
    { emoji: '⚗️', label: 'Subject focused',     earned: (profile?.subjects?.length ?? 0) > 0 },
    { emoji: '🏅', label: 'National top 10',     earned: false },
    { emoji: '🏆', label: 'Locked: 30-day streak', earned: false },
    { emoji: '⏱️', label: 'Locked: Exam mode',   earned: false },
    { emoji: '🎓', label: 'Locked: Subject master', earned: false },
  ]
}

// ── Helper: exam label ────────────────────────────────────────────────────────
function examLabel(t) {
  if (t === 'BOTH') return 'WAEC & JAMB'
  return t ?? 'WAEC'
}

// ── Editable field (kept from original) ──────────────────────────────────────
function EditableField({ label, value, placeholder, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value ?? '')
  const [saving, setSaving]   = useState(false)

  async function handleSave() {
    setSaving(true); await onSave(val); setSaving(false); setEditing(false)
  }

  return (
    <div style={{ padding: '9px 0' }}>
      <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginBottom: 3 }}>{label}</p>
      {editing ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
            style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--active-border)', background: 'var(--bg-subtle)', color: 'var(--text-prim)', fontSize: 13, outline: 'none' }} />
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '8px 12px', borderRadius: 10, background: '#0b1330', color: '#fff', fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => { setEditing(false); setVal(value ?? '') }}
            style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', fontSize: 12, cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: val ? 'var(--text-prim)' : 'var(--text-tert)' }}>{val || placeholder}</p>
          <button onClick={() => setEditing(true)} style={{ fontSize: 11, fontWeight: 700, color: 'var(--indigo)', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
        </div>
      )}
    </div>
  )
}

// ── Setting row (icon + label + chevron) ─────────────────────────────────────
function SettingRow({ icon, iconBg, label, sub, color, onClick, href }) {
  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
      onClick={onClick}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: color ?? 'var(--text-prim)' }}>{label}</p>
        {sub && <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 1 }}>{sub}</p>}
      </div>
      <span style={{ color: 'var(--text-tert)', fontSize: 15 }}>›</span>
    </div>
  )
  if (href) return <Link href={href} style={{ display: 'block', textDecoration: 'none' }}>{content}</Link>
  return content
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router   = useRouter()
  const supabase = createClient()
  const isDark   = useIsDark()

  const [profile,        setProfile]        = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [showGoalModal,  setShowGoalModal]  = useState(false)
  const [showEditSheet,  setShowEditSheet]  = useState(false)
  const [message,        setMessage]        = useState(null)
  const [subjectMastery, setSubjectMastery] = useState([])
  const [stats,          setStats]          = useState({ streak: 0, totalQs: 0, avgScore: 0 })
  const [parentEmail,    setParentEmail]    = useState('')
  const [parentReports,  setParentReports]  = useState(false)
  const [saving,         setSaving]         = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: paths }, { data: prog }, { data: attempts }, { data: streak }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('student_learning_paths')
          .select('subject_id, ordered_subtopic_ids, subjects(name)')
          .eq('student_id', user.id),
        supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
        supabase.from('question_attempts')
          .select('is_correct')
          .eq('student_id', user.id),
        supabase.from('student_streaks')
          .select('current_streak')
          .eq('student_id', user.id).maybeSingle(),
      ])

      setProfile(prof)
      setParentEmail(prof?.parent_email ?? '')
      setParentReports(prof?.parent_reports_enabled ?? false)

      // Subject mastery
      const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))
      const mastery = (paths ?? []).map(path => {
        const name  = path.subjects?.name ?? ''
        const ids   = path.ordered_subtopic_ids ?? []
        const total = ids.length
        const done  = ids.filter(id => completedIds.has(id)).length
        const pct   = total > 0 ? Math.round((done / total) * 100) : 0
        return { name, pct, completed: done, total }
      })
      setSubjectMastery(mastery)

      // Stats
      const totalQs = (attempts ?? []).length
      const correct = (attempts ?? []).filter(a => a.is_correct).length
      setStats({
        streak:   streak?.current_streak ?? 0,
        totalQs,
        avgScore: totalQs > 0 ? Math.round((correct / totalQs) * 100) : 0,
      })

      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line

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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const initials   = (profile?.full_name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const examType   = profile?.exam_type ?? 'WAEC'
  const allSubjects = profile?.subjects ?? []
  const badges      = buildBadges(profile, stats)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 100 }}>

      {/* Success / error message */}
      {message && (
        <div style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`, color: message.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
          {message.text}
        </div>
      )}

      {/* ── Hero card — dark navy gradient + dot pattern ── */}
      <div style={{ borderRadius: 20, background: 'linear-gradient(155deg,#0b1330 0%,#1e2a6e 100%)', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, border: '1px solid rgba(255,255,255,.08)', position: 'relative', overflow: 'hidden' }}>
        {/* Dot pattern overlay */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .05, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="pgrd" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#fff"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#pgrd)"/>
        </svg>
        {/* Avatar */}
        <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(255,255,255,.14)', border: '2px solid rgba(255,255,255,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#fff', position: 'relative', zIndex: 1 }}>
          {initials}
        </div>
        {/* Name + subtitle */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-.02em' }}>{profile?.full_name ?? 'Student'}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.42)', marginTop: 2 }}>
            {examLabel(examType)} {new Date().getFullYear() + 1} · {allSubjects.length} subjects{profile?.school_name ? ` · ${profile.school_name}` : ''}
          </p>
        </div>
        {/* Badge shelf */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', gap: 7, overflowX: 'auto', padding: '2px 0' }}>
          {badges.map((b, i) => (
            <div key={i} title={b.label} style={{ width: 46, height: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0, border: `1.5px solid ${b.earned ? 'rgba(255,195,107,.35)' : 'rgba(255,255,255,.12)'}`, background: b.earned ? 'rgba(255,195,107,.12)' : 'rgba(255,255,255,.06)', opacity: b.earned ? 1 : 0.5 }}>
              {b.emoji}
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
        {[
          { val: stats.streak,   lbl: 'Streak',    suffix: stats.streak === 1 ? ' day' : ' days' },
          { val: stats.totalQs,  lbl: 'Questions',  suffix: '' },
          { val: `${stats.avgScore}%`, lbl: 'Avg score', suffix: '' },
        ].map(({ val, lbl, suffix }) => (
          <div key={lbl} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 13, padding: '10px 6px', textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-prim)' }}>{typeof val === 'number' ? val.toLocaleString() : val}</p>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tert)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 1 }}>{lbl}</p>
          </div>
        ))}
      </div>

      {/* ── Subject mastery card ── */}
      {subjectMastery.length > 0 && (
        <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>Subject mastery</p>
            <Link href="/student/progress" style={{ fontSize: 11, fontWeight: 700, color: 'var(--indigo)', textDecoration: 'none' }}>Details →</Link>
          </div>
          <div style={{ padding: '6px 12px' }}>
            {subjectMastery.map((sub, i) => {
              const colors = resolveSubjectColors(sub.name, isDark)
              const pctColor = sub.pct >= 70 ? 'var(--success)' : sub.pct >= 40 ? 'var(--warning)' : 'var(--danger)'
              const statusLabel = sub.pct >= 70 ? 'Strong' : sub.pct >= 40 ? 'Building' : 'Starting'
              return (
                <div key={sub.name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderBottom: i < subjectMastery.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                    {getIcon(sub.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)' }}>{sub.name}</p>
                      <span style={{ fontSize: 11, fontWeight: 900, color: pctColor }}>{sub.pct}%</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--bg-inset)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: colors.solid, width: `${sub.pct}%`, transition: 'width .7s' }} />
                    </div>
                    <p style={{ fontSize: 9, color: 'var(--text-tert)', marginTop: 3 }}>{sub.completed} / {sub.total} topics · {statusLabel}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Exam targets card ── */}
      <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>🎯 Exam targets</p>
          <button onClick={() => setShowGoalModal(true)} style={{ padding: '3px 9px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 9, fontWeight: 700, color: 'var(--text-sec)', cursor: 'pointer' }}>Edit</button>
        </div>
        <div style={{ padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { key: 'Exam',   val: examLabel(profile?.exam_type) },
            { key: 'Course', val: profile?.university_course || '—' },
            { key: 'Uni',    val: profile?.target_university || '—' },
          ].map(({ key, val }) => (
            <div key={key} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', width: 44, flexShrink: 0 }}>{key}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Account card ── */}
      <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>Account</p>
        </div>
        <div style={{ padding: '2px 13px 4px' }}>
          <SettingRow icon="✏️" iconBg="#eff6ff" label="Edit profile" sub={profile?.full_name} onClick={() => setShowEditSheet(true)} />
          <SettingRow icon="👨‍👩‍👧" iconBg="#fef3c7" label="Parent reports" sub="Weekly progress to parent email" href="/student/profile/parent" />
          <SettingRow icon="🏫" iconBg="#f0fdf4" label="School & class" sub={profile?.school_name ?? 'Not connected'} href="/student/profile/school" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', cursor: 'pointer' }} onClick={handleSignOut}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🚪</div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', flex: 1 }}>Sign out</p>
            <span style={{ color: 'var(--text-tert)', fontSize: 15 }}>›</span>
          </div>
        </div>
      </div>

      {/* ── Edit profile sheet (inline expand) ── */}
      {showEditSheet && (
        <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)' }}>Edit profile</p>
            <button onClick={() => setShowEditSheet(false)} style={{ fontSize: 13, color: 'var(--text-sec)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
          <EditableField label="Full name" value={profile?.full_name} placeholder="Your name" onSave={val => updateProfile({ full_name: val })} />
          <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
          <EditableField label="School" value={profile?.school_name} placeholder="Your school" onSave={val => updateProfile({ school_name: val })} />
          <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
          <EditableField label="Class / Year" value={profile?.class_year} placeholder="e.g. SS3" onSave={val => updateProfile({ class_year: val })} />
        </div>
      )}

      {/* ── Parent reports inline ── */}
      <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '14px 16px' }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 12 }}>Parent reports</p>
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginBottom: 5 }}>Parent email</p>
          <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} placeholder="parent@example.com"
            style={{ width: '100%', padding: '9px 11px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-prim)', fontSize: 13, outline: 'none' }} />
          <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 4 }}>Weekly summary emails with your progress.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-prim)' }}>Enable parent reports</p>
          <button onClick={() => setParentReports(p => !p)}
            style={{ position: 'relative', width: 44, height: 24, borderRadius: 999, background: parentReports ? '#4f46e5' : 'var(--bg-subtle)', border: `1px solid ${parentReports ? '#4f46e5' : 'var(--border)'}`, cursor: 'pointer', transition: 'background .2s' }}>
            <div style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.2)', left: parentReports ? 22 : 2, transition: 'left .2s' }} />
          </button>
        </div>
        <button onClick={saveParentSettings} disabled={saving}
          style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#0b1330', color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 4px 0 #05070f', opacity: saving ? 0.5 : 1 }}>
          {saving ? 'Saving…' : 'Save parent settings'}
        </button>
      </div>

      {/* Goal modal */}
      {showGoalModal && profile && (
        <GoalModal
          profile={profile}
          onClose={() => setShowGoalModal(false)}
          onSave={updated => { setProfile(updated); setShowGoalModal(false) }}
        />
      )}
    </div>
  )
}
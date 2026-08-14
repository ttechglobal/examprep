'use client'
// src/app/student/profile/page.js — v5 full prototype redesign
// ─────────────────────────────────────────────────────────────────────────────
// Matches the prototype exactly:
//   • Dark navy hero card: dot pattern, initials avatar, name, exam label
//   • 3-stat row: Streak / Questions / Avg score
//   • Badge shelf: earned (gold) vs locked (dim)
//   • Subject mastery card: icon + bar + semantic % colour
//   • Exam targets card: Course / Uni / JAMB score
//   • Account settings card: rows with icon + label + chevron
//   • Edit profile inline sheet
//   • Parent reports toggle + email field
//   • Sign out (red)
//   • All tokens: no --indigo, no Tailwind dynamic classes
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import GoalModal from '@/components/dashboard/GoalModal'
import CoachBanner from '@/components/ui/CoachBanner'
import { profileCoach } from '@/lib/coach'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'

const ICONS = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📖',
}
const getIcon = n => ICONS[n] ?? ICONS.default

function examLabel(t) {
  if (t === 'BOTH') return 'WAEC & JAMB'
  return t ?? 'WAEC'
}

function buildBadges(profile, stats) {
  return [
    { emoji: '🔥', label: `${stats?.streak ?? 0} day streak`,      earned: (stats?.streak  ?? 0) >= 3 },
    { emoji: '💯', label: '100 questions done',                      earned: (stats?.totalQs ?? 0) >= 100 },
    { emoji: '📚', label: 'Subject focused',                         earned: (profile?.subjects?.length ?? 0) > 0 },
    { emoji: '🏅', label: 'Locked: National top 10',                 earned: false },
    { emoji: '🏆', label: 'Locked: 30-day streak',                   earned: false },
    { emoji: '⏱️', label: 'Locked: Exam mode',                       earned: false },
    { emoji: '🎓', label: 'Locked: Subject master',                  earned: false },
  ]
}

// ── Shared atoms ──────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>{children}</p>
}

function Widget({ header, children, noPad }) {
  return (
    <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      {header && (
        <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {header}
        </div>
      )}
      <div style={noPad ? {} : { padding: '4px 14px' }}>{children}</div>
    </div>
  )
}

function SettingRow({ icon, iconBg, label, sub, danger, onClick, href, right }) {
  const inner = (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', textDecoration: 'none' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: iconBg ?? 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: danger ? 'var(--danger)' : 'var(--text-prim)', lineHeight: 1.2 }}>{label}</p>
        {sub && <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 1 }}>{sub}</p>}
      </div>
      {right ?? <span style={{ color: 'var(--text-tert)', fontSize: 16 }}>›</span>}
    </div>
  )
  if (href) return <Link href={href} style={{ display: 'block', textDecoration: 'none' }}>{inner}</Link>
  return inner
}

function Toggle({ on, onToggle }) {
  return (
    <button onClick={onToggle} style={{ position: 'relative', width: 42, height: 24, borderRadius: 999, background: on ? '#9b7ae0' : 'var(--bg-inset)', border: `1px solid ${on ? '#9b7ae0' : 'var(--border)'}`, cursor: 'pointer', flexShrink: 0, transition: 'background .2s' }}>
      <div style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.25)', left: on ? 20 : 2, transition: 'left .2s' }} />
    </button>
  )
}

function EditableField({ label, value, placeholder, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value ?? '')
  const [saving, setSaving]   = useState(false)

  async function handleSave() {
    setSaving(true); await onSave(val); setSaving(false); setEditing(false)
  }

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginBottom: 4 }}>{label}</p>
      {editing ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} autoFocus
            style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: '1.5px solid rgba(155,122,224,.5)', background: 'var(--bg-subtle)', color: 'var(--text-prim)', fontSize: 13, outline: 'none' }} />
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 12px', borderRadius: 10, background: '#1264E5', color: '#fff', fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 3px 0 #05070f' }}>
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => { setEditing(false); setVal(value ?? '') }} style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', fontSize: 12, cursor: 'pointer' }}>✕</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: val ? 'var(--text-prim)' : 'var(--text-tert)' }}>{val || placeholder}</p>
          <button onClick={() => setEditing(true)} style={{ fontSize: 11, fontWeight: 700, color: '#9b7ae0', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router   = useRouter()
  const supabase = createClient()
  const isDark   = useIsDark()
  const { userId } = useUser()

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
    if (userId) init(userId)
  }, [userId]) // eslint-disable-line

  async function init(uid) {
    // Limit question_attempts to last 90 days — avoids scanning entire history
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString()

    const [{ data: prof }, { data: paths }, { data: prog }, { data: attempts }, { data: streak }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('student_learning_paths').select('subject_id, ordered_subtopic_ids, subjects(id, name)').eq('student_id', uid),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', uid),
      supabase.from('question_attempts').select('is_correct').eq('student_id', uid).gte('created_at', ninetyDaysAgo),
      supabase.from('student_streaks').select('current_streak').eq('student_id', uid).maybeSingle(),
    ])

    setProfile(prof)
    setParentEmail(prof?.parent_email ?? '')
    setParentReports(prof?.parent_reports_enabled ?? false)

    const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))
    setSubjectMastery((paths ?? []).map(path => {
      const name     = path.subjects?.name ?? ''
      const examType = path.subjects?.exam_type ?? ''
      const ids      = path.ordered_subtopic_ids ?? []
      const done     = ids.filter(id => completedIds.has(id)).length
      const pct      = ids.length > 0 ? Math.round((done / ids.length) * 100) : 0
      return { id: path.subject_id, name, examType, pct, completed: done, total: ids.length }
    }))

    const totalQs = (attempts ?? []).length
    const correct = (attempts ?? []).filter(a => a.is_correct).length
    setStats({ streak: streak?.current_streak ?? 0, totalQs, avgScore: totalQs > 0 ? Math.round((correct / totalQs) * 100) : 0 })
    setLoading(false)
  }

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
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#9b7ae0', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const initials  = (profile?.full_name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const examType  = profile?.exam_type ?? 'WAEC'
  const badges    = buildBadges(profile, stats)
  const jambTotal = profile?.jamb_total_target ?? 0
  const streakColor = stats.streak >= 14 ? '#fbbf24' : stats.streak >= 7 ? '#f87171' : 'var(--text-prim)'
  const firstName = (profile?.full_name ?? '').split(' ')[0]

  const now      = new Date()
  const nextJune = new Date(now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear(), 5, 1)
  const daysToExam = Math.max(0, Math.ceil((nextJune - now) / 86400000))
  const coach = profileCoach({ firstName, totalQs: stats.totalQs, streakDays: stats.streak, examType, daysToExam })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 112, maxWidth: 560, margin: '0 auto' }}>

      {/* ── Coach banner ── */}
      <CoachBanner emoji={coach.emoji} message={coach.message} />

      {/* Toast */}
      {message && (
        <div style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: message.type === 'success' ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)', border: `1px solid ${message.type === 'success' ? 'rgba(74,222,128,.3)' : 'rgba(248,113,113,.3)'}`, color: message.type === 'success' ? '#4ade80' : '#f87171' }}>
          {message.text}
        </div>
      )}

      {/* ── Hero card — matches prototype exactly ── */}
      <div style={{ borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(155deg,#050b1a 0%,#062A78 45%,#1a1060 100%)', border: '1px solid rgba(24,183,242,.15)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .04, backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '18px 18px', pointerEvents: 'none' }} />
        <div style={{ padding: '22px 18px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ width: 68, height: 68, borderRadius: 18, background: 'linear-gradient(135deg,#18B7F2,#062A78)', border: '2.5px solid rgba(24,183,242,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff', boxShadow: '0 8px 24px rgba(18,100,229,.4)', marginBottom: 10 }}>
            {initials}
          </div>
          <p style={{ fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', marginBottom: 3 }}>{profile?.full_name ?? 'Student'}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>
            {examLabel(examType)} · {profile?.class_year ?? 'SS3'}{profile?.school_name ? ` · ${profile.school_name}` : ''}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 999, background: 'rgba(255,106,0,.12)', border: '1.5px solid rgba(255,106,0,.28)', fontSize: 11, fontWeight: 800, color: '#FF6A00' }}>
              🔥 {stats.streak} days
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, background: 'rgba(255,184,0,.12)', border: '1.5px solid rgba(255,184,0,.28)', fontSize: 11, fontWeight: 800, color: '#FFB800' }}>
              ✦ {stats.totalQs > 0 ? Math.round(stats.totalQs * 2.4).toLocaleString() : 0} XP
            </div>
          </div>
        </div>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid rgba(255,255,255,.1)' }}>
          {[
            { val: `${stats.streak} 🔥`, lbl: 'Streak' },
            { val: stats.totalQs.toLocaleString(), lbl: 'Questions' },
            { val: `${stats.avgScore}%`, lbl: 'Accuracy' },
          ].map(({ val, lbl }, i) => (
            <div key={lbl} style={{ padding: '12px 6px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,.1)' : 'none' }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{val}</p>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginTop: 3 }}>{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── My subjects — prominently editable ── */}
      <div style={{ borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📚</span>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)' }}>My subjects</p>
          </div>
          <button onClick={() => setShowGoalModal(true)}
            style={{ fontSize: 11, fontWeight: 800, color: '#1264E5', background: 'rgba(18,100,229,.1)', border: '1px solid rgba(18,100,229,.2)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Edit ✏️
          </button>
        </div>
        <div style={{ padding: '10px 16px 12px' }}>
          {profile?.subjects?.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(profile.subjects ?? []).map(s => (
                <span key={s} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)' }}>{s}</span>
              ))}
            </div>
          ) : (
            <button onClick={() => setShowGoalModal(true)} style={{ fontSize: 12, color: 'var(--text-tert)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              Tap Edit to add your subjects →
            </button>
          )}
        </div>
      </div>

      {/* ── 2×2 info grid — all tappable to edit ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { icon: '🎯', lbl: 'Goal',      val: profile?.university_course || 'Tap to set' },
          { icon: '📋', lbl: 'Exam',      val: examLabel(examType) + ` ${new Date().getFullYear() + 1}` },
          { icon: '📅', lbl: 'Days left', val: `${daysToExam} days` },
          { icon: '🏫', lbl: 'School',    val: profile?.school_name || 'Not connected' },
        ].map(({ icon, lbl, val }) => (
          <button key={lbl} onClick={() => setShowGoalModal(true)}
            style={{ padding: 12, borderRadius: 13, background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s' }}>
            <p style={{ fontSize: 16, marginBottom: 4 }}>{icon}</p>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--text-tert)', marginBottom: 2 }}>{lbl}</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-prim)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</p>
          </button>
        ))}
      </div>

      {/* ── Settings rows — matches prototype ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[
          { icon: '📥', lbl: 'Downloads',     sub: 'Offline past questions', href: '/student/downloads' },
          { icon: '🌙', lbl: 'Dark mode',       sub: '',                             onClick: () => setShowEditSheet(v => !v) },
          { icon: '🔔', lbl: 'Notifications',   sub: '',                             onClick: () => {} },
          { icon: '👨‍👩‍👧', lbl: 'Parent report', sub: 'Weekly email',                onClick: () => {} },
          { icon: '🏫', lbl: 'My class',        sub: profile?.school_name ?? '',     href: '/student/community' },
          { icon: '📤', lbl: 'Share app',       sub: '',                             onClick: () => {} },
        ].map(({ icon, lbl, sub, href, onClick }) => {
          const inner = (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderRadius: 13, background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', textDecoration: 'none' }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-prim)' }}>{lbl}</p>
                {sub && <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 1 }}>{sub}</p>}
              </div>
              <span style={{ color: 'var(--text-tert)', fontSize: 18 }}>›</span>
            </div>
          )
          if (href) return <Link key={lbl} href={href} style={{ textDecoration: 'none' }}>{inner}</Link>
          return <div key={lbl} onClick={onClick}>{inner}</div>
        })}

        <button onClick={handleSignOut} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(220,38,38,.25)', background: 'rgba(220,38,38,.07)', color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sign out
        </button>
      </div>

      {/* Goal modal */}
      {showGoalModal && profile && (
        <GoalModal key={profile.id} profile={profile} onClose={() => setShowGoalModal(false)} onSave={updated => { setProfile(updated); setShowGoalModal(false) }} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
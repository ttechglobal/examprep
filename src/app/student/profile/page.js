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
import Link from 'next/link'

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
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 12px', borderRadius: 10, background: '#0b1330', color: '#fff', fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 3px 0 #05070f' }}>
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
        supabase.from('student_learning_paths').select('subject_id, ordered_subtopic_ids, subjects(name)').eq('student_id', user.id),
        supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
        supabase.from('question_attempts').select('is_correct').eq('student_id', user.id),
        supabase.from('student_streaks').select('current_streak').eq('student_id', user.id).maybeSingle(),
      ])

      setProfile(prof)
      setParentEmail(prof?.parent_email ?? '')
      setParentReports(prof?.parent_reports_enabled ?? false)

      const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))
      setSubjectMastery((paths ?? []).map(path => {
        const name  = path.subjects?.name ?? ''
        const ids   = path.ordered_subtopic_ids ?? []
        const done  = ids.filter(id => completedIds.has(id)).length
        const pct   = ids.length > 0 ? Math.round((done / ids.length) * 100) : 0
        return { name, pct, completed: done, total: ids.length }
      }))

      const totalQs = (attempts ?? []).length
      const correct = (attempts ?? []).filter(a => a.is_correct).length
      setStats({ streak: streak?.current_streak ?? 0, totalQs, avgScore: totalQs > 0 ? Math.round((correct / totalQs) * 100) : 0 })
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
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#9b7ae0', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const initials  = (profile?.full_name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const examType  = profile?.exam_type ?? 'WAEC'
  const badges    = buildBadges(profile, stats)
  const jambTotal = profile?.jamb_total_target ?? 0
  const streakColor = stats.streak >= 14 ? '#fbbf24' : stats.streak >= 7 ? '#f87171' : 'var(--text-prim)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 112 }}>

      {/* Toast */}
      {message && (
        <div style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`, color: message.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
          {message.text}
        </div>
      )}

      {/* ── Hero card ── */}
      <div style={{ borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(155deg,#050b1a 0%,#0b1330 45%,#1a1060 100%)', border: '1px solid rgba(255,255,255,.08)', position: 'relative' }}>
        {/* Dot grid overlay */}
        <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .045, pointerEvents: 'none' }}>
          <defs><pattern id="pgrd2" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#fff"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#pgrd2)"/>
        </svg>

        <div style={{ padding: '22px 18px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
          {/* Avatar */}
          <div style={{ width: 76, height: 76, borderRadius: 22, background: 'rgba(155,122,224,.2)', border: '2px solid rgba(155,122,224,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,.35)' }}>
            {initials}
          </div>

          {/* Name + subtitle */}
          <div>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', marginBottom: 3 }}>
              {profile?.full_name ?? 'Student'}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', fontWeight: 500 }}>
              {examLabel(examType)} {new Date().getFullYear() + 1}
              {profile?.subjects?.length ? ` · ${profile.subjects.length} subjects` : ''}
              {profile?.school_name ? ` · ${profile.school_name}` : ''}
            </p>
          </div>

          {/* Badge shelf */}
          <div style={{ width: '100%', display: 'flex', gap: 7, overflowX: 'auto', padding: '2px 0', justifyContent: 'center' }}>
            {badges.map((b, i) => (
              <div key={i} title={b.label} style={{ width: 44, height: 44, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, border: `1.5px solid ${b.earned ? 'rgba(255,195,107,.4)' : 'rgba(255,255,255,.1)'}`, background: b.earned ? 'rgba(255,195,107,.12)' : 'rgba(255,255,255,.05)', opacity: b.earned ? 1 : 0.45, transition: 'opacity .2s' }}>
                {b.emoji}
              </div>
            ))}
          </div>
        </div>

        {/* Stats row — attached to bottom of hero card */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          {[
            { val: stats.streak,   col: streakColor,          suffix: ' 🔥', lbl: 'Streak' },
            { val: stats.totalQs,  col: '#fff',                suffix: '',    lbl: 'Questions' },
            { val: `${stats.avgScore}%`, col: stats.avgScore >= 70 ? '#4ade80' : stats.avgScore >= 40 ? '#fbbf24' : '#f87171', suffix: '', lbl: 'Accuracy' },
          ].map(({ val, col, suffix, lbl }, i) => (
            <div key={lbl} style={{ padding: '12px 6px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,.07)' : 'none' }}>
              <p style={{ fontSize: 20, fontWeight: 900, color: col, lineHeight: 1 }}>{typeof val === 'number' ? val.toLocaleString() : val}{suffix}</p>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginTop: 3 }}>{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Subject mastery ── */}
      {subjectMastery.length > 0 && (
        <Widget
          header={<><SectionLabel>Subject mastery</SectionLabel><Link href="/student/progress" style={{ fontSize: 11, fontWeight: 700, color: '#9b7ae0', textDecoration: 'none' }}>Details →</Link></>}
        >
          {subjectMastery.map((sub, i) => {
            const colors   = resolveSubjectColors(sub.name, isDark)
            const pctColor = sub.pct >= 70 ? '#4ade80' : sub.pct >= 40 ? '#fbbf24' : '#f87171'
            const status   = sub.pct >= 70 ? 'Strong' : sub.pct >= 40 ? 'Building' : 'Starting'
            return (
              <div key={sub.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < subjectMastery.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  {getIcon(sub.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)' }}>{sub.name}</p>
                    <span style={{ fontSize: 11, fontWeight: 900, color: pctColor }}>{sub.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-inset)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: colors.solid, width: `${Math.max(sub.pct, 2)}%`, transition: 'width .7s' }} />
                  </div>
                  <p style={{ fontSize: 9, color: 'var(--text-tert)', marginTop: 3 }}>{sub.completed}/{sub.total} topics · {status}</p>
                </div>
              </div>
            )
          })}
        </Widget>
      )}

      {/* ── Exam targets ── */}
      <Widget
        header={
          <><SectionLabel>🎯 Exam targets</SectionLabel>
          <button onClick={() => setShowGoalModal(true)} style={{ padding: '3px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: 10, fontWeight: 700, color: 'var(--text-sec)', cursor: 'pointer' }}>
            Edit
          </button></>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, paddingBottom: 4 }}>
          {[
            { k: 'Exam',   v: examLabel(examType) },
            { k: 'Course', v: profile?.university_course || '—' },
            { k: 'Uni',    v: profile?.target_university  || '—' },
            ...(jambTotal > 0 ? [{ k: 'JAMB', v: `${jambTotal} / 400`, vc: '#9b7ae0' }] : []),
          ].map(({ k, v, vc }) => (
            <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', width: 44, flexShrink: 0 }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: vc ?? 'var(--text-prim)' }}>{v}</span>
            </div>
          ))}
        </div>
      </Widget>

      {/* ── Account settings ── */}
      <Widget header={<SectionLabel>Account</SectionLabel>}>
        <SettingRow icon="✏️" iconBg="rgba(155,122,224,.12)" label="Edit profile" sub={profile?.full_name} onClick={() => setShowEditSheet(v => !v)} />
        <SettingRow icon="👨‍👩‍👧" iconBg="rgba(251,191,36,.12)" label="Parent reports" sub="Weekly progress email to parent" href="/student/profile/parent" />
        <SettingRow icon="🏫" iconBg="rgba(108,206,142,.12)" label="School & class" sub={profile?.school_name ?? 'Not connected'} href="/student/profile/school" />
        <SettingRow icon="📊" iconBg="rgba(92,184,234,.12)"  label="My progress"   sub="Subjects, topics & mastery breakdown" href="/student/progress" />
        <SettingRow icon="👥" iconBg="rgba(155,122,224,.12)" label="Community"     sub="Leaderboard & class challenges" href="/student/community" />
        <SettingRow icon="🚪" iconBg="var(--danger-bg)" label="Sign out" danger onClick={handleSignOut} right={<span />} />
      </Widget>

      {/* ── Edit profile inline ── */}
      {showEditSheet && (
        <Widget header={
          <><SectionLabel>Edit profile</SectionLabel>
          <button onClick={() => setShowEditSheet(false)} style={{ fontSize: 13, color: 'var(--text-sec)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button></>
        }>
          <EditableField label="Full name"   value={profile?.full_name}   placeholder="Your name"   onSave={val => updateProfile({ full_name: val })} />
          <EditableField label="School"      value={profile?.school_name} placeholder="Your school"  onSave={val => updateProfile({ school_name: val })} />
          <EditableField label="Class / Year" value={profile?.class_year} placeholder="e.g. SS3"     onSave={val => updateProfile({ class_year: val })} />
        </Widget>
      )}

      {/* ── Parent reports ── */}
      <Widget header={<SectionLabel>Parent reports</SectionLabel>}>
        <div style={{ paddingTop: 4, paddingBottom: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginBottom: 5 }}>Parent email</p>
            <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} placeholder="parent@example.com"
              style={{ width: '100%', padding: '9px 11px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-prim)', fontSize: 13, outline: 'none' }} />
            <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 3 }}>Weekly summary emails with your progress.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-prim)' }}>Enable parent reports</p>
            <Toggle on={parentReports} onToggle={() => setParentReports(p => !p)} />
          </div>
          <button onClick={saveParentSettings} disabled={saving}
            style={{ width: '100%', padding: '12px', borderRadius: 13, background: '#0b1330', color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 4px 0 #05070f', opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Saving…' : 'Save parent settings'}
          </button>
        </div>
      </Widget>

      {/* Goal modal */}
      {showGoalModal && profile && (
        <GoalModal profile={profile} onClose={() => setShowGoalModal(false)} onSave={updated => { setProfile(updated); setShowGoalModal(false) }} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
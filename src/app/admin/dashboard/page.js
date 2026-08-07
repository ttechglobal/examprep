// src/app/admin/dashboard/page.js
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Link from 'next/link'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const SUBJECT_CFG = {
  'Chemistry':        { icon: '⚗️',  color: '#9b7ae0' },
  'Physics':          { icon: '⚡',  color: '#ff8fab' },
  'Biology':          { icon: '🧬',  color: '#6cce8e' },
  'Mathematics':      { icon: '📐',  color: '#5cb8ea' },
  'Further Mathematics': { icon: '📐', color: '#5cb8ea' },
  'English Language': { icon: '📖',  color: '#a78bfa' },
  'Use of English':   { icon: '📖',  color: '#a78bfa' },
  'Economics':        { icon: '📊',  color: '#fcd34d' },
  'Government':       { icon: '🏛️', color: '#f87171' },
  'Geography':        { icon: '🌍',  color: '#34d399' },
  'default':          { icon: '📝',  color: '#9ca3af' },
}

function StatCard({ label, value, sub, color = '#6366f1', href }) {
  const inner = (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '16px 20px', flex: 1, minWidth: 0, transition: 'border-color .15s' }}>
      <p style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 900, color: '#111827', lineHeight: 1, marginBottom: 3, letterSpacing: '-0.03em' }}>{value ?? '—'}</p>
      {sub && <p style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</p>}
      <div style={{ height: 3, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden', marginTop: 10 }}>
        <div style={{ height: '100%', background: color, width: '60%', borderRadius: 99 }} />
      </div>
    </div>
  )
  if (href) return <Link href={href} style={{ flex: 1, minWidth: 0, textDecoration: 'none', display: 'flex' }}>{inner}</Link>
  return inner
}

function SubjectRow({ subject, questionCount, attemptCount, accuracy, topicCount }) {
  const cfg = SUBJECT_CFG[subject.name] ?? SUBJECT_CFG.default
  const pctColor = accuracy >= 70 ? '#16a34a' : accuracy >= 50 ? '#d97706' : '#dc2626'
  const examBadges = subject.exam_type ? [subject.exam_type] : []

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: '1px solid #f3f4f6' }}>
      {/* Icon */}
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cfg.color}14`, border: `1px solid ${cfg.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
        {cfg.icon}
      </div>

      {/* Name + exams */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{subject.name}</p>
          {examBadges.map(e => (
            <span key={e} style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 5,
              background: e === 'WAEC' ? '#eff6ff' : e === 'JAMB' ? '#f5f3ff' : '#f0fdf4',
              color: e === 'WAEC' ? '#1d4ed8' : e === 'JAMB' ? '#7c3aed' : '#15803d',
              border: `1px solid ${e === 'WAEC' ? '#bfdbfe' : e === 'JAMB' ? '#ddd6fe' : '#bbf7d0'}`,
            }}>{e}</span>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
          {topicCount} topics · {questionCount.toLocaleString()} questions
        </p>
      </div>

      {/* Accuracy */}
      {attemptCount > 0 && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: pctColor, lineHeight: 1 }}>{accuracy}%</p>
          <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{attemptCount.toLocaleString()} attempts</p>
        </div>
      )}

      {/* Action */}
      <Link href={`/admin/past-questions?subject=${encodeURIComponent(subject.name)}`}
        style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textDecoration: 'none', flexShrink: 0, padding: '6px 12px', borderRadius: 8, background: '#eef2ff', border: '1px solid #e0e7ff' }}>
        View →
      </Link>
    </div>
  )
}

export default async function AdminDashboardPage() {
  const db = svc()

  const [
    { data: subjects },
    { data: topics },
    { data: questions },
    { data: attempts },
    { data: students },
    { data: schools },
    { data: recentQs },
  ] = await Promise.all([
    db.from('subjects').select('id, name, slug, exam_type, is_active').eq('is_active', true).order('order_index'),
    db.from('topics').select('id, subject_id'),
    db.from('questions').select('id, subject_id, exam_type, created_at'),
    db.from('question_attempts').select('id, subject_id, is_correct').limit(10000),
    db.from('profiles').select('id').eq('role', 'student'),
    db.from('schools').select('id, name'),
    db.from('questions').select('id, question_text, subject_id, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  // Aggregate stats
  const totalQs       = questions?.length ?? 0
  const totalAttempts = attempts?.length ?? 0
  const totalStudents = students?.length ?? 0
  const totalSchools  = schools?.length ?? 0
  const correctCount  = (attempts ?? []).filter(a => a.is_correct).length
  const successRate   = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0

  // Questions added this week
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const newThisWeek = (questions ?? []).filter(q => q.created_at > weekAgo).length

  // Per-subject aggregates
  const topicsBySubject = {}
  for (const t of (topics ?? [])) {
    topicsBySubject[t.subject_id] = (topicsBySubject[t.subject_id] ?? 0) + 1
  }
  const qsBySubject = {}
  for (const q of (questions ?? [])) {
    if (q.subject_id) qsBySubject[q.subject_id] = (qsBySubject[q.subject_id] ?? 0) + 1
  }
  const attemptsBySubject = {}
  for (const a of (attempts ?? [])) {
    if (!a.subject_id) continue
    if (!attemptsBySubject[a.subject_id]) attemptsBySubject[a.subject_id] = { total: 0, correct: 0 }
    attemptsBySubject[a.subject_id].total++
    if (a.is_correct) attemptsBySubject[a.subject_id].correct++
  }

  const subjectRows = (subjects ?? []).map(s => {
    const att = attemptsBySubject[s.id]
    return {
      subject:       s,
      questionCount: qsBySubject[s.id] ?? 0,
      topicCount:    topicsBySubject[s.id] ?? 0,
      attemptCount:  att?.total ?? 0,
      accuracy:      att?.total ? Math.round((att.correct / att.total) * 100) : 0,
    }
  })

  const greeting = getGreeting()

  return (
    <>
      <style>{`
        .admin-stat-row { display: flex; gap: 14px; flex-wrap: wrap; }
        .admin-stat-row > * { flex: 1; min-width: 140px; }
        .admin-grid { display: grid; grid-template-columns: 1fr 260px; gap: 20px; align-items: flex-start; }
        @media (max-width: 900px) {
          .admin-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .admin-stat-row > * { min-width: 120px; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 3 }}>{greeting}</p>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111827', letterSpacing: '-0.025em', lineHeight: 1.1 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>Past questions · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/admin/questions/upload"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb', fontSize: 13, fontWeight: 700, color: '#374151', textDecoration: 'none', boxShadow: '0 1px 2px rgba(0,0,0,.04)', whiteSpace: 'nowrap' }}>
            ⬆️ Upload Questions
          </Link>
          <Link href="/admin/past-questions"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#4f46e5', fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 3px 0 #2d3a9e', whiteSpace: 'nowrap' }}>
            🗃 Question Bank
          </Link>
        </div>
      </div>

      {/* ── Stat row ── */}
      <div className="admin-stat-row" style={{ marginBottom: 24 }}>
        <StatCard label="Total Questions" value={totalQs.toLocaleString()} sub={`+${newThisWeek} this week`} color="#6366f1" href="/admin/past-questions" />
        <StatCard label="Total Attempts"  value={totalAttempts.toLocaleString()} sub="across all students" color="#34d399" />
        <StatCard label="Success Rate"    value={`${successRate}%`} sub="platform average" color="#f59e0b" />
        <StatCard label="Students"        value={totalStudents.toLocaleString()} sub={`${totalSchools} school${totalSchools !== 1 ? 's' : ''}`} color="#a78bfa" href="/admin/users" />
      </div>

      <div className="admin-grid">

        {/* ── LEFT: subjects ── */}
        <div>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>Questions by subject</p>
              <Link href="/admin/subjects-manager" style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textDecoration: 'none' }}>Manage subjects →</Link>
            </div>
            <div style={{ padding: '0 20px' }}>
              {subjectRows.length > 0 ? (
                subjectRows.map(r => (
                  <SubjectRow
                    key={r.subject.id}
                    subject={r.subject}
                    questionCount={r.questionCount}
                    topicCount={r.topicCount}
                    attemptCount={r.attemptCount}
                    accuracy={r.accuracy}
                  />
                ))
              ) : (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
                  <p style={{ fontWeight: 800, color: '#111827', marginBottom: 4 }}>No subjects set up yet</p>
                  <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Add subjects and upload questions to get started.</p>
                  <Link href="/admin/subjects-manager" style={{ display: 'inline-block', padding: '9px 18px', background: '#4f46e5', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                    Set up subjects →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Quick actions */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 14 }}>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9ca3af', marginBottom: 10 }}>QUICK ACTIONS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: '⬆️', label: 'Upload Questions',  sub: 'Add from PDF',              href: '/admin/questions/upload' },
                { icon: '🔍', label: 'Question Bank',     sub: `${totalQs} questions`,       href: '/admin/questions' },
                { icon: '🌿', label: 'Topic Tree',        sub: 'Manage curriculum',           href: '/admin/curriculum' },
                { icon: '⭐', label: 'Core Topics',       sub: 'Set exam frequency',          href: '/admin/core-topics' },
                { icon: '📈', label: 'Analytics',         sub: 'Student performance',         href: '/admin/analytics' },
              ].map(a => (
                <Link key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 10, background: '#f9fafb', border: '1px solid #f3f4f6', textDecoration: 'none', transition: 'border-color .12s' }}>
                  <span style={{ fontSize: 15, width: 22, textAlign: 'center', flexShrink: 0 }}>{a.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{a.label}</p>
                    <p style={{ fontSize: 10, color: '#9ca3af' }}>{a.sub}</p>
                  </div>
                  <span style={{ fontSize: 12, color: '#d1d5db' }}>›</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent uploads */}
          {(recentQs ?? []).length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9ca3af' }}>RECENTLY ADDED</p>
                <Link href="/admin/questions" style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textDecoration: 'none' }}>All →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(recentQs ?? []).map(q => (
                  <div key={q.id} style={{ padding: '7px 0', borderBottom: '1px solid #f9fafb' }}>
                    <p style={{ fontSize: 11, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.question_text?.slice(0, 60)}{(q.question_text?.length ?? 0) > 60 ? '…' : ''}
                    </p>
                    <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                      {new Date(q.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schools */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#9ca3af' }}>SCHOOLS</p>
              <Link href="/admin/schools" style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textDecoration: 'none' }}>All →</Link>
            </div>
            {(schools ?? []).length > 0 ? (
              (schools ?? []).slice(0, 5).map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
                  <span style={{ fontSize: 13 }}>🏫</span>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 12, color: '#9ca3af' }}>No partner schools yet</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
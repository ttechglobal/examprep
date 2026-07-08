// src/app/admin/dashboard/page.js — EXL Studio style
// Good morning greeting + stat row + subject-grouped content cards

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
  if (h < 12) return 'GOOD MORNING'
  if (h < 17) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}

// ── Stat card — matches EXL top row ───────────────────────────────────────────
function StatCard({ label, value, sub, barColor }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 900, color: '#111827', lineHeight: 1, marginBottom: 4 }}>{value ?? '—'}</p>
      {sub && <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>{sub}</p>}
      <div style={{ height: 3, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: barColor ?? '#6366f1', width: '100%', borderRadius: 99 }} />
      </div>
    </div>
  )
}

// ── Subject section — matches EXL "Chemistry / 3 games" row ──────────────────
function SubjectSection({ name, icon, color, items, addLabel, addHref }) {
  return (
    <div style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 16, marginRight: 2 }}>{icon}</span>
          <span style={{ fontSize: 15, fontWeight: 900, color: '#111827' }}>{name}</span>
        </div>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{items.length} items</span>
      </div>

      {/* Card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {items.map(item => (
          <ContentCard key={item.id} item={item} accentColor={color} />
        ))}
        {/* Add new placeholder */}
        <Link href={addHref ?? '#'} style={{
          borderRadius: 16, border: '2px dashed #e5e7eb',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: 160, cursor: 'pointer', textDecoration: 'none', gap: 6,
          transition: 'border-color .15s',
        }}
        className="hover:border-gray-400"
        >
          <span style={{ fontSize: 22, color: '#d1d5db' }}>+</span>
          <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>{addLabel ?? `New ${name} content`}</p>
        </Link>
      </div>
    </div>
  )
}

// ── Content card — matches EXL game card ─────────────────────────────────────
function ContentCard({ item, accentColor }) {
  const pctColor = item.pct >= 70 ? '#34d399' : item.pct >= 40 ? '#fbbf24' : '#f87171'

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
      {/* Coloured top image area */}
      <div style={{
        height: 100, background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <span style={{ fontSize: 36 }}>{item.icon ?? '📖'}</span>
        {/* Status pill */}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 999,
          background: item.status === 'published' ? '#065f46' : item.status === 'in_review' ? '#92400e' : '#374151',
          border: `1px solid ${item.status === 'published' ? '#34d399' : item.status === 'in_review' ? '#fbbf24' : '#6b7280'}`,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.status === 'published' ? '#34d399' : item.status === 'in_review' ? '#fbbf24' : '#6b7280' }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {item.status === 'published' ? 'LIVE' : item.status === 'in_review' ? 'REVIEW' : 'DRAFT'}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '12px 14px 14px' }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 4, lineHeight: 1.3 }}>{item.name}</p>
        <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
          {item.questionCount ?? 0} questions · {item.attemptCount ?? 0} attempts
        </p>

        {/* Accuracy bar */}
        {item.pct !== null && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ height: 4, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden', display: 'flex', gap: 2 }}>
              <div style={{ height: '100%', background: '#34d399', width: `${Math.min(item.pct, 100)}%`, borderRadius: 99, transition: 'width .7s' }} />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <Link href={item.editHref ?? '#'}
            style={{ flex: 1, padding: '7px 0', borderRadius: 9, background: '#f9fafb', border: '1px solid #e5e7eb', fontSize: 11, fontWeight: 700, color: '#374151', textDecoration: 'none', textAlign: 'center', display: 'block' }}>
            Edit
          </Link>
          <Link href={item.viewHref ?? '#'}
            style={{ flex: 1, padding: '7px 0', borderRadius: 9, background: '#f0fdf4', border: '1px solid #a7f3d0', fontSize: 11, fontWeight: 700, color: '#065f46', textDecoration: 'none', textAlign: 'center', display: 'block' }}>
            View ↗
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Quick action row (EXL "Quick actions" sidebar widget) ─────────────────────
function QuickAction({ icon, label, sub, href }) {
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#fff', border: '1px solid #e5e7eb', textDecoration: 'none', transition: 'border-color .15s' }} className="hover:border-gray-300">
      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>{label}</p>
        {sub && <p style={{ fontSize: 10, color: '#9ca3af' }}>{sub}</p>}
      </div>
    </Link>
  )
}

export default async function AdminDashboardPage() {
  const db = svc()

  const [
    { data: subjects },
    { data: subtopics },
    { data: students },
    { data: questions },
    { data: attempts },
    { data: schools },
  ] = await Promise.all([
    db.from('subjects').select('id, name, slug, exam_type'),
    db.from('subtopics').select('id, name, slug, lesson_status, topic_id, topics(subject_id)'),
    db.from('profiles').select('id').eq('role', 'student'),
    db.from('questions').select('id, subject_id, topic_id'),
    db.from('question_attempts').select('id, subject_id, is_correct').limit(5000),
    db.from('schools').select('id, name'),
  ])

  const totalStudents  = students?.length ?? 0
  const totalQs        = questions?.length ?? 0
  const totalAttempts  = attempts?.length ?? 0
  const totalSchools   = schools?.length ?? 0

  const correctCount   = (attempts ?? []).filter(a => a.is_correct).length
  const successRate    = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0

  // Total XP estimate (5 + correct*2 per session, rough estimate from attempts)
  const xpEarned = correctCount * 2 + Math.floor(totalAttempts / 10) * 5

  // Group subtopics by subject
  const bySubject = {}
  for (const sub of (subjects ?? [])) { bySubject[sub.id] = { ...sub, subtopics: [] } }
  for (const st of (subtopics ?? [])) {
    const sid = st.topics?.subject_id
    if (sid && bySubject[sid]) bySubject[sid].subtopics.push(st)
  }

  // Per-subject question count + accuracy
  const qBySubject = {}
  const attemptsBySubject = {}
  for (const q of (questions ?? [])) {
    if (!q.subject_id) continue
    qBySubject[q.subject_id] = (qBySubject[q.subject_id] ?? 0) + 1
  }
  for (const a of (attempts ?? [])) {
    if (!a.subject_id) continue
    if (!attemptsBySubject[a.subject_id]) attemptsBySubject[a.subject_id] = { total: 0, correct: 0 }
    attemptsBySubject[a.subject_id].total++
    if (a.is_correct) attemptsBySubject[a.subject_id].correct++
  }

  const SUBJECT_CFG = {
    'Chemistry':   { icon: '⚗️', color: '#9b7ae0' },
    'Physics':     { icon: '⚡', color: '#ff8fab' },
    'Biology':     { icon: '🧬', color: '#6cce8e' },
    'Mathematics': { icon: '📐', color: '#5cb8ea' },
    'English Language': { icon: '📖', color: '#a78bfa' },
    'Economics':   { icon: '📊', color: '#fcd34d' },
    'Government':  { icon: '🏛️', color: '#f87171' },
    'default':     { icon: '📝', color: '#9ca3af' },
  }

  const subjectSections = Object.values(bySubject).map(subj => {
    const cfg    = SUBJECT_CFG[subj.name] ?? SUBJECT_CFG.default
    const aData  = attemptsBySubject[subj.id]
    const subPct = aData?.total ? Math.round((aData.correct / aData.total) * 100) : null
    const items  = subj.subtopics.slice(0, 6).map(st => ({
      id:           st.id,
      name:         st.name,
      icon:         cfg.icon,
      status:       st.lesson_status ?? 'draft',
      questionCount: qBySubject[subj.id] ?? 0,
      attemptCount:  aData?.total ?? 0,
      pct:           subPct,
      editHref:     `/admin/curriculum/${subj.slug}`,
      viewHref:     `/admin/subjects/${subj.slug}/${st.id}`,
    }))
    return {
      id:      subj.id,
      name:    subj.name,
      icon:    cfg.icon,
      color:   cfg.color,
      items,
      addHref: `/admin/curriculum/${subj.slug}`,
    }
  })

  const greeting = getGreeting()

  return (
    <div>
      {/* ── Top bar: greeting + actions ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>{greeting}</p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111827', letterSpacing: '-0.025em', lineHeight: 1.05 }}>Content Library</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/admin/questions/upload"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb', fontSize: 13, fontWeight: 700, color: '#374151', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
            ↑ Upload Questions
          </Link>
          <Link href="/admin/curriculum"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#4f46e5', fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 3px 0 #2d3a9e' }}>
            + New Lesson
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'flex-start' }}>

        {/* ── LEFT: stats + subject sections ── */}
        <div>
          {/* Stat row — EXL top stats */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '20px 24px', marginBottom: 28, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <StatCard label="Students" value={totalStudents.toLocaleString()} sub="+10 this week" barColor="#6366f1" />
            <div style={{ width: 1, background: '#f3f4f6' }} />
            <StatCard label="Attempts" value={totalAttempts.toLocaleString()} sub={`${Math.min(totalAttempts, 999)} this week`} barColor="#34d399" />
            <div style={{ width: 1, background: '#f3f4f6' }} />
            <StatCard label="Success Rate" value={`${successRate}%`} sub="across all questions" barColor="#fbbf24" />
            <div style={{ width: 1, background: '#f3f4f6' }} />
            <StatCard label="XP Earned" value={xpEarned.toLocaleString()} sub="lifetime total" barColor="#a78bfa" />
          </div>

          {/* Subject sections */}
          {subjectSections.length > 0 ? (
            subjectSections.map(section => (
              <SubjectSection
                key={section.id}
                name={section.name}
                icon={section.icon}
                color={section.color}
                items={section.items}
                addHref={section.addHref}
                addLabel={`New ${section.name} lesson`}
              />
            ))
          ) : (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📚</p>
              <p style={{ fontWeight: 900, color: '#111827' }}>No content yet</p>
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Set up your curriculum to get started.</p>
              <Link href="/admin/curriculum" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: '#4f46e5', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>Set up curriculum →</Link>
            </div>
          )}
        </div>

        {/* ── RIGHT: sidebar widgets ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Activity chart placeholder */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ca3af', marginBottom: 12 }}>ACTIVITY · 14 DAYS</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
              {[40, 65, 30, 80, 55, 70, 45, 90, 60, 75, 50, 85, 70, 95].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 3, background: '#e9d5ff', transition: 'height .5s' }}
                  className="hover:bg-violet-400" />
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ca3af', marginBottom: 10 }}>QUICK ACTIONS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <QuickAction icon="◼" label="All Content" sub={`${(subtopics ?? []).length} subtopics`} href="/admin/curriculum" />
              <QuickAction icon="◎" label="Students" sub={`${totalStudents} enrolled`} href="/admin/users" />
              <QuickAction icon="◇" label="Question Bank" sub={`${totalQs} questions`} href="/admin/questions" />
              <QuickAction icon="↑" label="Upload Questions" sub="Add from PDFs" href="/admin/questions/upload" />
            </div>
          </div>

          {/* Needs attention */}
          {(() => {
            const unpublished = (subtopics ?? []).filter(s => s.lesson_status !== 'published').length
            const inReview    = (subtopics ?? []).filter(s => s.lesson_status === 'in_review').length
            if (!unpublished && !inReview) return null
            return (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ca3af', marginBottom: 10 }}>NEEDS ATTENTION</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {inReview > 0 && (
                    <Link href="/admin/reviewers" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', textDecoration: 'none' }}>
                      <span style={{ fontSize: 13 }}>🔍</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>{inReview} lessons in review</p>
                        <p style={{ fontSize: 10, color: '#d97706' }}>Awaiting approval</p>
                      </div>
                    </Link>
                  )}
                  {unpublished > 0 && (
                    <Link href="/admin/curriculum" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 10, background: '#f9fafb', border: '1px solid #e5e7eb', textDecoration: 'none' }}>
                      <span style={{ fontSize: 13 }}>📝</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{unpublished} unpublished</p>
                        <p style={{ fontSize: 10, color: '#9ca3af' }}>Drafts + in review</p>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Schools */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ca3af' }}>SCHOOLS</p>
              <Link href="/admin/schools" style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textDecoration: 'none' }}>All →</Link>
            </div>
            {(schools ?? []).slice(0, 4).map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 13 }}>🏫</span>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
              </div>
            ))}
            {(schools?.length ?? 0) === 0 && <p style={{ fontSize: 12, color: '#9ca3af' }}>No partner schools yet</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
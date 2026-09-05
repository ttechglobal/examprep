// src/app/admin/dashboard/page.js — Command Centre v2
// ─────────────────────────────────────────────────────────────────────────────
// Three-pillar hub: Questions · Content · Platform
// Each pillar has rich action cards so the admin can jump straight to any task.
// Stats row at top gives a live pulse of the platform.
// ─────────────────────────────────────────────────────────────────────────────

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
  if (h < 12) return { word: 'Good morning', emoji: '☀️' }
  if (h < 17) return { word: 'Good afternoon', emoji: '⚡' }
  return { word: 'Good evening', emoji: '🌙' }
}

// ── Pillar definitions ─────────────────────────────────────────────────────
// Each pillar has a theme colour, icon, label, and an array of action cards.
// Cards can be "primary" (large, prominent) or "secondary" (smaller row items).
const PILLARS = [
  {
    id: 'questions',
    label: 'Questions',
    icon: '🗃',
    accent: '#6366f1',
    accentLight: '#eef2ff',
    accentBorder: '#e0e7ff',
    desc: 'Source, tag, and manage every question on the platform.',
    actions: [
      {
        href: '/admin/questions/upload',
        icon: '📤',
        label: 'Upload Questions',
        desc: 'Extract from a past-question PDF and tag each item',
        primary: true,
      },
      {
        href: '/admin/questions/import',
        icon: '⬆',
        label: 'Import via Sdash API',
        desc: 'Pull questions straight from an external source',
      },
      {
        href: '/admin/questions',
        icon: '🔍',
        label: 'Question Bank',
        desc: 'Browse, edit, and review every question',
      },
      {
        href: '/admin/past-questions',
        icon: '📅',
        label: 'Past Questions',
        desc: 'Browse by year, subject, and exam board',
      },
      {
        href: '/admin/coverage',
        icon: '📊',
        label: 'Year Coverage',
        desc: 'See which years are fully covered per subject',
      },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: '📚',
    accent: '#0ea5e9',
    accentLight: '#f0f9ff',
    accentBorder: '#bae6fd',
    desc: 'Build and publish lessons, flashcards, and formulas.',
    actions: [
      {
        href: '/admin/curriculum',
        icon: '🌿',
        label: 'Topic Tree',
        desc: 'Manage subjects, topics, and subtopics',
        primary: true,
      },
      {
        href: '/admin/subjects-manager',
        icon: '📑',
        label: 'Subjects',
        desc: 'Add subjects and set WAEC / JAMB exam tags',
      },
      {
        href: '/admin/core-topics',
        icon: '⭐',
        label: 'Core Topics',
        desc: 'Flag high-frequency exam topics for students',
      },
      {
        href: '/admin/flashcards',
        icon: '🃏',
        label: 'Flashcards & Formulas',
        desc: 'Manage study cards and formula sheets',
      },
      {
        href: '/admin/video-lessons',
        icon: '🎬',
        label: 'Video Lessons',
        desc: 'Upload and manage lesson videos per subtopic',
      },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    icon: '⚙️',
    accent: '#10b981',
    accentLight: '#f0fdf4',
    accentBorder: '#bbf7d0',
    desc: 'Manage users, schools, access, and platform health.',
    actions: [
      {
        href: '/admin/users',
        icon: '👤',
        label: 'Students',
        desc: 'View and manage all registered students',
        primary: true,
      },
      {
        href: '/admin/schools',
        icon: '🏫',
        label: 'Schools',
        desc: 'Partner schools, dashboards, and onboarding',
      },
      {
        href: '/admin/access-codes',
        icon: '🎟',
        label: 'Access Codes',
        desc: 'Generate and manage invite and promo codes',
      },
      {
        href: '/admin/analytics',
        icon: '📈',
        label: 'Analytics',
        desc: 'Student performance and platform metrics',
      },
      {
        href: '/admin/reviewers',
        icon: '👁',
        label: 'Reviewers',
        desc: 'Manage content reviewer accounts',
      },
    ],
  },
]

export default async function AdminDashboardPage() {
  const db = svc()

  // Parallel fetch — all independent
  // Previously: question_attempts fetched .limit(5000) rows just to count them.
  // Now: two COUNT queries (total + correct) — zero data transfer, same result.
  const [
    { data: questions },
    { data: students },
    { data: schools },
    { data: subjects },
    { count: totalAttempts },
    { count: correctCount },
    { data: recentQs },
    { data: pendingReviews },
  ] = await Promise.all([
    db.from('questions').select('id, created_at, subject_id').eq('is_active', true),
    db.from('profiles').select('id, created_at').eq('role', 'student'),
    db.from('schools').select('id, name').eq('is_active', true),
    db.from('subjects').select('id, name, exam_type').eq('is_active', true),
    db.from('question_attempts').select('*', { count: 'exact', head: true }),
    db.from('question_attempts').select('*', { count: 'exact', head: true }).eq('is_correct', true),
    db.from('questions').select('id, question_text, subject_id, created_at').order('created_at', { ascending: false }).limit(6),
    db.from('questions').select('id').eq('is_active', false).limit(1),
  ])

  // Stats
  const totalQs       = questions?.length ?? 0
  const totalStudents = students?.length ?? 0
  const totalSchools  = schools?.length ?? 0
  const totalSubjects = subjects?.length ?? 0
  const successRate   = (totalAttempts ?? 0) > 0 ? Math.round(((correctCount ?? 0) / (totalAttempts ?? 1)) * 100) : 0
  const hasPending    = (pendingReviews?.length ?? 0) > 0

  const weekAgo     = new Date(Date.now() - 7 * 86400000).toISOString()
  const newThisWeek = (questions ?? []).filter(q => q.created_at > weekAgo).length
  const newStudents = (students ?? []).filter(s => s.created_at > weekAgo).length

  const subjectMap = {}
  for (const s of subjects ?? []) subjectMap[s.id] = s.name

  const greeting = getGreeting()

  return (
    <>
      <style>{`
        .hub-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 1100px) {
          .hub-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 680px) {
          .hub-grid { grid-template-columns: 1fr; }
        }
        .stat-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }
        @media (max-width: 900px) {
          .stat-row { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 500px) {
          .stat-row { grid-template-columns: repeat(2, 1fr); }
        }
        .action-card:hover {
          border-color: var(--hover-bd) !important;
          background: var(--hover-bg) !important;
        }
        .primary-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0,0,0,.1) !important;
        }
        .secondary-action:hover {
          background: #f9fafb !important;
        }
        .stat-card-link:hover > div {
          border-color: #a5b4fc !important;
          box-shadow: 0 4px 16px rgba(99,102,241,.1) !important;
        }
        .subject-link {
          background: transparent;
          transition: background .12s;
        }
        .subject-link:hover {
          background: #f8fafc !important;
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
          {greeting.emoji} {greeting.word}
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
              Admin Studio
            </h1>
            <p style={{ fontSize: 13, color: '#64748b' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {hasPending && (
                <span style={{ marginLeft: 10, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontSize: 10, fontWeight: 700 }}>
                  ● Pending reviews
                </span>
              )}
            </p>
          </div>
          {/* Quick-fire CTA */}
          <Link href="/admin/questions/upload" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 11, background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 800, textDecoration: 'none', letterSpacing: '-0.01em', boxShadow: '0 4px 0 rgba(0,0,0,.25)', transition: 'box-shadow .12s, transform .12s', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 15 }}>📤</span> Upload Questions
          </Link>
        </div>
      </div>

      {/* ── Stats pulse ── */}
      <div className="stat-row" style={{ marginBottom: 28 }}>
        {[
          { label: 'Questions',   value: totalQs.toLocaleString(),       sub: `+${newThisWeek} this week`,     color: '#6366f1', href: '/admin/questions' },
          { label: 'Students',    value: totalStudents.toLocaleString(),  sub: `+${newStudents} this week`,     color: '#10b981', href: '/admin/users' },
          { label: 'Schools',     value: totalSchools.toLocaleString(),   sub: 'partner schools',               color: '#0ea5e9', href: '/admin/schools' },
          { label: 'Subjects',    value: totalSubjects.toLocaleString(),  sub: 'WAEC + JAMB',                   color: '#f59e0b', href: '/admin/subjects-manager' },
          { label: 'Success Rate',value: `${successRate}%`,               sub: `${totalAttempts.toLocaleString()} attempts`, color: '#ec4899', href: '/admin/analytics' },
        ].map(s => (
          <Link key={s.label} href={s.href} className="stat-card-link" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '14px 16px', transition: 'border-color .15s, box-shadow .15s' }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 3 }}>{s.value}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <p style={{ fontSize: 10, color: '#94a3b8' }}>{s.sub}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Three-pillar hub ── */}
      <div className="hub-grid" style={{ marginBottom: 28 }}>
        {PILLARS.map(pillar => (
          <div key={pillar.id} style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Pillar header */}
            <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid #f1f5f9', background: pillar.accentLight }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fff', border: `1px solid ${pillar.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0, boxShadow: `0 2px 6px ${pillar.accent}18` }}>
                  {pillar.icon}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>{pillar.label}</p>
                </div>
              </div>
              <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{pillar.desc}</p>
            </div>

            {/* Actions */}
            <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Primary action — big card */}
              {(() => {
                const a = pillar.actions.find(x => x.primary)
                if (!a) return null
                return (
                  <Link href={a.href} className="primary-card" key={a.href} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 14px',
                    borderRadius: 13,
                    background: `linear-gradient(135deg, ${pillar.accentLight}, #fff)`,
                    border: `1.5px solid ${pillar.accentBorder}`,
                    textDecoration: 'none',
                    transition: 'transform .15s, box-shadow .15s',
                    boxShadow: `0 2px 8px ${pillar.accent}12`,
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fff', border: `1px solid ${pillar.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0, boxShadow: `0 2px 6px ${pillar.accent}18` }}>
                      {a.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 2, letterSpacing: '-0.01em' }}>{a.label}</p>
                      <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{a.desc}</p>
                    </div>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: pillar.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </Link>
                )
              })()}

              {/* Secondary actions — compact list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {pillar.actions.filter(a => !a.primary).map(a => (
                  <Link key={a.href} href={a.href} className="secondary-action" style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    background: 'transparent',
                    transition: 'background .12s',
                  }}>
                    <span style={{ fontSize: 15, width: 22, textAlign: 'center', flexShrink: 0, lineHeight: 1 }}>{a.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{a.label}</p>
                      <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.desc}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}><path d="M4 7H10M7 4.5L10 7L7 9.5" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom row: Recent uploads + subject quick-links ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Recent questions */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Recently Added</p>
            <Link href="/admin/questions" style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', textDecoration: 'none' }}>All questions →</Link>
          </div>
          <div style={{ padding: '4px 0' }}>
            {(recentQs ?? []).length > 0 ? (recentQs ?? []).map((q, i) => {
              const subName = subjectMap[q.subject_id] ?? 'Unknown'
              return (
                <div key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 18px', borderBottom: i < (recentQs?.length ?? 0) - 1 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                      {q.question_text?.replace(/<[^>]+>/g, '').slice(0, 72)}{(q.question_text?.length ?? 0) > 72 ? '…' : ''}
                    </p>
                    <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                      {subName} · {new Date(q.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              )
            }) : (
              <div style={{ padding: '28px 18px', textAlign: 'center' }}>
                <p style={{ fontSize: 24, marginBottom: 6 }}>📭</p>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>No questions uploaded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Subject quick-links */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Active Subjects</p>
            <Link href="/admin/subjects-manager" style={{ fontSize: 10, fontWeight: 700, color: '#0ea5e9', textDecoration: 'none' }}>Manage →</Link>
          </div>
          <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(subjects ?? []).length > 0 ? (subjects ?? []).map(s => {
              const ICONS = { Physics: '⚡', Chemistry: '⚗️', Biology: '🧬', Mathematics: '📐', 'Further Mathematics': '📐', 'English Language': '📖', 'Use of English': '📖', Economics: '📊', Government: '🏛️', Geography: '🌍', 'Literature in English': '📚', 'Agricultural Science': '🌱', Commerce: '💼', Accounting: '🧮', 'Computer Science': '💻' }
              const icon = ICONS[s.name] ?? '📝'
              const examCol = s.exam_type === 'WAEC' ? '#1d4ed8' : s.exam_type === 'JAMB' ? '#7c3aed' : '#0ea5e9'
              const examBg  = s.exam_type === 'WAEC' ? '#eff6ff' : s.exam_type === 'JAMB' ? '#f5f3ff' : '#f0f9ff'
              return (
                <Link key={s.id} href={`/admin/past-questions?subject=${encodeURIComponent(s.name)}`} className="subject-link" style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                  borderRadius: 9, textDecoration: 'none',
                }}>
                  <span style={{ fontSize: 15, flexShrink: 0, width: 20, textAlign: 'center' }}>{icon}</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{s.name}</span>
                  {s.exam_type && (
                    <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: examBg, color: examCol, border: `1px solid ${examCol}22`, flexShrink: 0 }}>
                      {s.exam_type}
                    </span>
                  )}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}><path d="M3 6H9M6.5 3.5L9 6L6.5 8.5" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              )
            }) : (
              <div style={{ padding: '24px 4px', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>No subjects configured yet</p>
                <Link href="/admin/subjects-manager" style={{ display: 'inline-block', padding: '8px 14px', borderRadius: 9, background: '#0ea5e9', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                  Set up subjects →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
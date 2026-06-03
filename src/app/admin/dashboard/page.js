// src/app/admin/dashboard/page.js
// Full command center — replaces the lesson-only dashboard.
// Shows: platform stats, content health, questions health, quick actions.

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Link from 'next/link'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const db = svc()

  // ── Parallel data fetch ─────────────────────────────────────────────────────
  const [
    { data: subjects },
    { count: totalStudents },
    { count: totalQuestions },
    { count: activeThisWeek },
  ] = await Promise.all([
    db.from('subjects').select(`
      id, name, slug, exam_type, is_active,
      topics (
        id,
        subtopics ( id, lesson_status )
      )
    `).order('order_index'),

    db.from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student'),

    db.from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),

    db.from('student_streaks')
      .select('*', { count: 'exact', head: true })
      .gte('last_active_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),
  ])

  // ── Lesson content stats ────────────────────────────────────────────────────
  const subjectStats = (subjects ?? []).map(subject => {
    const allSubs  = subject.topics.flatMap(t => t.subtopics)
    const total    = allSubs.length
    const published = allSubs.filter(s => s.lesson_status === 'published').length
    const inReview  = allSubs.filter(s => s.lesson_status === 'in_review').length
    const draft     = allSubs.filter(s => s.lesson_status === 'draft').length
    const pct       = total > 0 ? Math.round((published / total) * 100) : 0
    return { ...subject, total, published, inReview, draft, pct }
  })

  const totalLessons   = subjectStats.reduce((a, s) => a + s.total, 0)
  const totalPublished = subjectStats.reduce((a, s) => a + s.published, 0)
  const totalInReview  = subjectStats.reduce((a, s) => a + s.inReview, 0)
  const totalDraft     = subjectStats.reduce((a, s) => a + s.draft, 0)

  // ── Questions needing attention ─────────────────────────────────────────────
  const { count: untaggedCount } = await db
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('subtopic_id', null)

  const { count: missingImageCount } = await db
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('has_image', true)
    .is('image_url', null)

  return (
    <div className="space-y-8">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Platform health at a glance</p>
      </div>

      {/* ── Top stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students',   value: totalStudents  ?? 0, icon: '👥', color: 'indigo', href: '/admin/users' },
          { label: 'Active This Week', value: activeThisWeek ?? 0, icon: '🔥', color: 'orange', href: '/admin/analytics' },
          { label: 'Total Questions',  value: totalQuestions ?? 0, icon: '❓', color: 'violet', href: '/admin/questions' },
          { label: 'Published Lessons',value: totalPublished,       icon: '✅', color: 'green',  href: '/admin/curriculum' },
        ].map(stat => (
          <Link key={stat.label} href={stat.href}
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-200 hover:shadow-sm transition-all group">
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-2xl font-black text-gray-900">{(stat.value).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* ── Attention needed ───────────────────────────────────────────────── */}
      {(untaggedCount > 0 || missingImageCount > 0 || totalInReview > 0) && (
        <div className="space-y-3">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">Needs Attention</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {untaggedCount > 0 && (
              <Link href="/admin/questions?untagged=true"
                className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 hover:bg-red-100 transition-colors">
                <span className="text-xl">🏷</span>
                <div>
                  <p className="text-sm font-black text-red-800">{untaggedCount} untagged questions</p>
                  <p className="text-xs text-red-600">No topic/subtopic mapping</p>
                </div>
              </Link>
            )}
            {missingImageCount > 0 && (
              <Link href="/admin/questions?missing_image=true"
                className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 hover:bg-amber-100 transition-colors">
                <span className="text-xl">🖼</span>
                <div>
                  <p className="text-sm font-black text-amber-800">{missingImageCount} missing images</p>
                  <p className="text-xs text-amber-600">Questions flagged as has_image with no URL</p>
                </div>
              </Link>
            )}
            {totalInReview > 0 && (
              <Link href="/admin/curriculum"
                className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 hover:bg-blue-100 transition-colors">
                <span className="text-xl">📋</span>
                <div>
                  <p className="text-sm font-black text-blue-800">{totalInReview} lessons in review</p>
                  <p className="text-xs text-blue-600">Awaiting publish approval</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Lesson content progress ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">Lesson Content</h2>
          <Link href="/admin/curriculum" className="text-xs font-bold text-indigo-600 hover:text-indigo-500">
            Manage →
          </Link>
        </div>

        {/* Overall progress bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-700">Overall lesson coverage</p>
            <p className="text-sm font-black text-gray-900">
              {totalPublished} / {totalLessons} published
            </p>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
              style={{ width: `${totalLessons > 0 ? Math.round((totalPublished / totalLessons) * 100) : 0}%` }}
            />
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {totalPublished} published</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> {totalInReview} in review</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> {totalDraft} draft</span>
          </div>
        </div>

        {/* Per-subject breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {subjectStats.map(subject => (
            <Link key={subject.id} href={`/admin/subjects/${subject.slug}`}
              className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">{subject.name}</p>
                  <p className="text-xs text-gray-400">{subject.exam_type}</p>
                </div>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                  subject.pct === 100 ? 'bg-green-100 text-green-700' :
                  subject.pct >= 50   ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-500'
                }`}>
                  {subject.pct}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${subject.pct}%` }}
                />
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                <span className="text-green-600">✓ {subject.published}</span>
                {subject.inReview > 0 && <span className="text-blue-500">● {subject.inReview}</span>}
                {subject.draft > 0    && <span>○ {subject.draft}</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Quick actions ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/admin/questions/upload',  label: 'Upload Questions',  icon: '⬆️', color: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100' },
            { href: '/admin/curriculum',        label: 'Generate Lesson',   icon: '✍️', color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' },
            { href: '/admin/subjects-manager',  label: 'Add Subject',       icon: '📚', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
            { href: '/admin/video-lessons/new', label: 'New Video',         icon: '🎬', color: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100' },
          ].map(action => (
            <Link key={action.href} href={action.href}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-sm font-bold transition-colors ${action.color}`}>
              <span className="text-lg">{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
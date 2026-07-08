// src/app/api/admin/analytics/route.js
// Returns platform-wide analytics for the admin analytics page.

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = svc()

  const now = new Date()
  const weekAgo  = new Date(now - 7  * 86400000).toISOString()
  const monthAgo = new Date(now - 30 * 86400000).toISOString()

  const [
    { count: totalStudents },
    { count: activeWeek },
    { count: activeMonth },
    { count: totalQuestions },
    { count: totalAttempts },
    { count: totalLessons },
    { data: dailyAttempts },
    { data: subjectActivity },
    { data: newStudentsByDay },
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    db.from('student_streaks').select('*', { count: 'exact', head: true }).gte('last_active_date', weekAgo.split('T')[0]),
    db.from('student_streaks').select('*', { count: 'exact', head: true }).gte('last_active_date', monthAgo.split('T')[0]),
    db.from('questions').select('*', { count: 'exact', head: true }).eq('is_active', true),
    db.from('question_attempts').select('*', { count: 'exact', head: true }),
    db.from('subtopics').select('*', { count: 'exact', head: true }).eq('lesson_status', 'published'),

    // Daily attempts last 14 days
    db.from('question_attempts')
      .select('created_at')
      .gte('created_at', new Date(now - 14 * 86400000).toISOString()),

    // Per-subject attempt counts
    db.from('question_attempts')
      .select('subjects(name)')
      .gte('created_at', monthAgo)
      .not('subject_id', 'is', null),

    // New student signups last 30 days
    db.from('profiles')
      .select('created_at')
      .eq('role', 'student')
      .gte('created_at', monthAgo),
  ])

  // Bucket daily attempts
  const dailyBuckets = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86400000)
    const key = d.toISOString().split('T')[0]
    dailyBuckets[key] = 0
  }
  for (const a of dailyAttempts ?? []) {
    const key = a.created_at?.split('T')[0]
    if (key && dailyBuckets[key] !== undefined) dailyBuckets[key]++
  }

  // Subject activity counts
  const subjectCounts = {}
  for (const a of subjectActivity ?? []) {
    const name = a.subjects?.name
    if (name) subjectCounts[name] = (subjectCounts[name] ?? 0) + 1
  }
  const subjectBreakdown = Object.entries(subjectCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  // New students by day
  const newStudentBuckets = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86400000)
    const key = d.toISOString().split('T')[0]
    newStudentBuckets[key] = 0
  }
  for (const s of newStudentsByDay ?? []) {
    const key = s.created_at?.split('T')[0]
    if (key && newStudentBuckets[key] !== undefined) newStudentBuckets[key]++
  }

  return NextResponse.json({
    summary: {
      totalStudents:   totalStudents   ?? 0,
      activeWeek:      activeWeek      ?? 0,
      activeMonth:     activeMonth     ?? 0,
      totalQuestions:  totalQuestions  ?? 0,
      totalAttempts:   totalAttempts   ?? 0,
      totalLessons:    totalLessons    ?? 0,
      weeklyActRate:   totalStudents > 0 ? Math.round(((activeWeek ?? 0) / totalStudents) * 100) : 0,
    },
    dailyAttempts: Object.entries(dailyBuckets).map(([date, count]) => ({ date, count })),
    subjectBreakdown,
    newStudents: Object.entries(newStudentBuckets).map(([date, count]) => ({ date, count })),
  })
}
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Get current user + school
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await service
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.school_id) {
    return NextResponse.json({ error: 'No school assigned' }, { status: 403 })
  }

  const schoolId = adminProfile.school_id

  // Get all students in this school
  const { data: students } = await service
    .from('profiles')
    .select('id, full_name, exam_type, subjects, created_at, daily_lessons_used')
    .eq('school_id', schoolId)
    .eq('role', 'student')
    .order('full_name')

  if (!students?.length) {
    return NextResponse.json({
      students: [],
      subjectStats: [],
      weeklyEngagement: [],
      summary: { totalStudents: 0, activeThisWeek: 0, lessonsThisWeek: 0 }
    })
  }

  const studentIds = students.map(s => s.id)

  // Get lesson progress for all students
  const { data: allProgress } = await service
    .from('lesson_progress')
    .select('student_id, subtopic_id, completed, started_at, completed_at')
    .in('student_id', studentIds)

  // Get question attempts for all students
  const { data: allAttempts } = await service
    .from('question_attempts')
    .select('student_id, question_id, is_correct, created_at, questions(subtopic_id, subject_id, subjects(name))')
    .in('student_id', studentIds)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  // Get streaks
  const { data: allStreaks } = await service
    .from('student_streaks')
    .select('student_id, current_streak, last_active_date')
    .in('student_id', studentIds)

  const streakMap = {}
  allStreaks?.forEach(s => { streakMap[s.student_id] = s })

  // Get weekly stats
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: weeklyStats } = await service
    .from('weekly_stats')
    .select('student_id, subject_id, lessons_completed, questions_attempted, correct_rate, week_start, subjects(name)')
    .in('student_id', studentIds)
    .gte('week_start', weekAgo.split('T')[0])

  // Get subtopic details for progress
  const completedSubtopicIds = [...new Set(
    (allProgress ?? []).filter(p => p.completed).map(p => p.subtopic_id)
  )]

  let subtopicDetails = []
  if (completedSubtopicIds.length) {
    const { data } = await service
      .from('subtopics')
      .select('id, name, topic_id, topics(name, subject_id, subjects(name))')
      .in('id', completedSubtopicIds)
    subtopicDetails = data ?? []
  }

  const subtopicMap = {}
  subtopicDetails.forEach(s => { subtopicMap[s.id] = s })

  // ── Compute per-student stats ──────────────────────────────────
  const activeThisWeek = new Set(
    (allProgress ?? [])
      .filter(p => p.started_at && new Date(p.started_at) >= new Date(weekAgo))
      .map(p => p.student_id)
  )

  const enrichedStudents = students.map(student => {
    const progress = (allProgress ?? []).filter(p => p.student_id === student.id)
    const completedLessons = progress.filter(p => p.completed).length
    const streak = streakMap[student.id]
    const lastActive = streak?.last_active_date ?? null
    const isActiveThisWeek = activeThisWeek.has(student.id)

    const studentWeeklyStats = (weeklyStats ?? []).filter(w => w.student_id === student.id)
    const avgCorrectRate = studentWeeklyStats.length
      ? Math.round(studentWeeklyStats.reduce((a, w) => a + parseFloat(w.correct_rate ?? 0), 0) / studentWeeklyStats.length)
      : null

    return {
      id: student.id,
      full_name: student.full_name,
      exam_type: student.exam_type,
      subjects: student.subjects ?? [],
      completedLessons,
      currentStreak: streak?.current_streak ?? 0,
      lastActive,
      isActiveThisWeek,
      avgCorrectRate,
      joinedAt: student.created_at,
    }
  })

  // ── Compute subject-level weak topics ─────────────────────────
  const subjectAttemptMap = {}
  ;(allAttempts ?? []).forEach(attempt => {
    const subjectName = attempt.questions?.subjects?.name
    if (!subjectName) return
    if (!subjectAttemptMap[subjectName]) {
      subjectAttemptMap[subjectName] = { total: 0, correct: 0 }
    }
    subjectAttemptMap[subjectName].total++
    if (attempt.is_correct) subjectAttemptMap[subjectName].correct++
  })

  const subjectStats = Object.entries(subjectAttemptMap).map(([name, data]) => ({
    name,
    total: data.total,
    correct: data.correct,
    correctRate: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
  })).sort((a, b) => a.correctRate - b.correctRate)

  // ── Weekly engagement (last 4 weeks) ──────────────────────────
  const weeklyEngagement = []
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000)
    const label = `${weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`

    const activeStudents = new Set(
      (allProgress ?? [])
        .filter(p => {
          const d = new Date(p.started_at)
          return d >= weekStart && d < weekEnd
        })
        .map(p => p.student_id)
    ).size

    weeklyEngagement.push({ label, activeStudents, week: i })
  }

  return NextResponse.json({
    students: enrichedStudents,
    subjectStats,
    weeklyEngagement,
    summary: {
      totalStudents: students.length,
      activeThisWeek: activeThisWeek.size,
      lessonsThisWeek: (allProgress ?? []).filter(p =>
        p.started_at && new Date(p.started_at) >= new Date(weekAgo)
      ).length,
    }
  })
}
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') ?? 'csv'
  const period = searchParams.get('period') ?? 'week'

  const supabase = await createClient()
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await service
    .from('profiles')
    .select('school_id, schools(name)')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.school_id) {
    return NextResponse.json({ error: 'No school assigned' }, { status: 403 })
  }

  const schoolId = adminProfile.school_id
  const schoolName = adminProfile.schools?.name ?? 'School'

  // Date range
  const daysBack = period === 'month' ? 30 : 7
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

  // Get students
  const { data: students } = await service
    .from('profiles')
    .select('id, full_name, exam_type, subjects, created_at')
    .eq('school_id', schoolId)
    .eq('role', 'student')
    .order('full_name')

  if (!students?.length) {
    return new NextResponse('No students found', { status: 404 })
  }

  const studentIds = students.map(s => s.id)

  // Get lesson progress
  const { data: progress } = await service
    .from('lesson_progress')
    .select('student_id, completed, completed_at')
    .in('student_id', studentIds)
    .gte('started_at', since)

  // Get question attempts
  const { data: attempts } = await service
    .from('question_attempts')
    .select('student_id, is_correct, created_at')
    .in('student_id', studentIds)
    .gte('created_at', since)

  // Get streaks
  const { data: streaks } = await service
    .from('student_streaks')
    .select('student_id, current_streak, last_active_date')
    .in('student_id', studentIds)

  const streakMap = {}
  streaks?.forEach(s => { streakMap[s.student_id] = s })

  // Build report rows
  const rows = students.map(student => {
    const studentProgress = progress?.filter(p => p.student_id === student.id) ?? []
    const studentAttempts = attempts?.filter(a => a.student_id === student.id) ?? []
    const completedLessons = studentProgress.filter(p => p.completed).length
    const totalAttempts = studentAttempts.length
    const correctAttempts = studentAttempts.filter(a => a.is_correct).length
    const accuracy = totalAttempts > 0
      ? Math.round((correctAttempts / totalAttempts) * 100) : 0
    const streak = streakMap[student.id]

    return {
      name: student.full_name ?? '',
      exam: student.exam_type ?? '',
      subjects: (student.subjects ?? []).join('; '),
      lessons_completed: completedLessons,
      questions_attempted: totalAttempts,
      accuracy_pct: accuracy,
      current_streak: streak?.current_streak ?? 0,
      last_active: streak?.last_active_date ?? 'Never',
      joined: new Date(student.created_at).toLocaleDateString(),
    }
  })

  if (format === 'csv') {
    const periodLabel = period === 'month' ? 'Last 30 days' : 'Last 7 days'
    const headers = [
      'Student Name',
      'Exam',
      'Subjects',
      'Lessons Completed',
      'Questions Attempted',
      'Accuracy %',
      'Current Streak',
      'Last Active',
      'Joined',
    ]

    const csvLines = [
      `# ${schoolName} — Student Report (${periodLabel})`,
      `# Generated: ${new Date().toLocaleDateString()}`,
      '',
      headers.join(','),
      ...rows.map(r => [
        `"${r.name}"`,
        r.exam,
        `"${r.subjects}"`,
        r.lessons_completed,
        r.questions_attempted,
        r.accuracy_pct,
        r.current_streak,
        r.last_active,
        r.joined,
      ].join(',')),
    ]

    return new NextResponse(csvLines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${schoolName.replace(/\s/g, '_')}_report_${period}.csv"`,
      },
    })
  }

  return NextResponse.json({ rows, school: schoolName, period })
}
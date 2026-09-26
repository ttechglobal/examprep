// src/app/api/school/report/route.js — v2
// Three report types:
//   ?type=students&period=month   → all-students progress table (CSV or JSON)
//   ?type=subjects&period=month   → per-subject topic accuracy (JSON for PDF)
//   ?type=management&period=month → executive summary (JSON for PDF)
//
// The PDF is assembled client-side from the JSON data.
// CSV is still available for the students report.
//
// v2: school_admin role required; totals grouped in Postgres (no 1,000-row
// cut-off); activity and streaks come from real practice data (the old
// student_streaks table is never written, so everyone showed as inactive).

import { createClient }     from '@/lib/supabase/server'
import { supabaseAdmin }    from '@/lib/server/supabaseAdmin'
import { schoolStudentIds, selectAll } from '@/lib/server/paging'
import { requireSchoolAdmin, selectByIds, loadSchoolStats, groupTopicsBySubject, csvCell } from '@/lib/server/schoolStats'
import { effectiveStreak }  from '@/lib/streak'
import { NextResponse }     from 'next/server'

// Completed lessons per student in the period. lesson_progress may not exist
// on every deployment — then everyone simply has 0.
async function completedLessons(db, studentIds, since) {
  const done = {}
  try {
    for (let i = 0; i < studentIds.length; i += 200) {
      const part = studentIds.slice(i, i + 200)
      const rows = await selectAll(() => db.from('lesson_progress')
        .select('student_id')
        .in('student_id', part)
        .eq('completed', true)
        .gte('started_at', since)
        .order('student_id'))
      for (const r of rows) done[r.student_id] = (done[r.student_id] ?? 0) + 1
    }
  } catch { /* table missing — report without lessons */ }
  return done
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type   = searchParams.get('type')   ?? 'students'
  const period = searchParams.get('period') ?? 'month'
  const format = searchParams.get('format') ?? 'json'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    return await buildReport({ userId: user.id, type, period, format })
  } catch (err) {
    console.error('[school/report] error:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not build report' }, { status: 500 })
  }
}

async function buildReport({ userId, type, period, format }) {
  const db = supabaseAdmin()
  const { profile: adminProfile, error: denied } = await requireSchoolAdmin(
    db, userId, 'school_id, role, schools(name, city, state)'
  )
  if (denied) return denied

  const schoolId    = adminProfile.school_id
  const schoolName  = adminProfile.schools?.name ?? 'School'
  const schoolCity  = adminProfile.schools?.city ?? ''
  const daysBack    = period === 'week' ? 7 : 30
  const since       = new Date(Date.now() - daysBack * 86400000).toISOString()
  const periodLabel = period === 'week' ? 'Last 7 days' : 'Last 30 days'

  const { cohort, studentIds } = await schoolStudentIds(db, schoolId)
  let activeCohort = cohort
  if (cohort) {
    const { data } = await db.from('cohorts').select('id, name, session').eq('id', cohort.id).maybeSingle()
    activeCohort = data ?? cohort
  }

  if (!studentIds.length) {
    return NextResponse.json({ error: 'No students found' }, { status: 404 })
  }

  const [profiles, stats, progress] = await Promise.all([
    selectByIds(db, 'profiles', 'id, full_name, exam_type, subjects, streak_days, last_active_date', studentIds),
    loadSchoolStats(db, studentIds, since),
    completedLessons(db, studentIds, since),
  ])

  const profileMap = {}
  for (const p of profiles) profileMap[p.id] = p
  const lessonsDone = progress

  const weekAgo = new Date(Date.now() - 7 * 86400000)

  // Per-student stats
  const studentStats = studentIds.map(id => {
    const p   = profileMap[id] ?? { id, full_name: 'Unknown' }
    const s   = stats.byStudent.get(id) ?? { answered: 0, correct: 0, lastActive: null }
    const lastActive = s.lastActive ?? (p.last_active_date ?? null)
    return {
      id,
      name:        p.full_name ?? '',
      exam:        p.exam_type ?? '',
      subjects:    p.subjects ?? [],
      accuracy:    s.answered > 0 ? Math.round((s.correct / s.answered) * 100) : null,
      correct:     s.correct,
      total:       s.answered,
      lessons:     lessonsDone[id] ?? 0,
      streak:      effectiveStreak(p),
      lastActive,
      isActive:    !!lastActive && new Date(lastActive) >= weekAgo,
      subjectAcc:  stats.subjectsByStudent.get(id) ?? {},
    }
  })

  // ── STUDENTS REPORT ────────────────────────────────────────────────────────
  if (type === 'students') {
    if (format === 'csv') {
      const headers = ['Student Name','Exam','Subjects','Lessons','Questions','Accuracy %','Streak','Last Active']
      const lines   = [
        `# ${schoolName.replace(/[\r\n]/g, ' ')} — Student Report (${periodLabel})`,
        `# Generated: ${new Date().toLocaleDateString('en-GB')}`,
        `# Cohort: ${activeCohort?.name ?? 'All students'}`,
        '',
        headers.join(','),
        ...studentStats.map(s => [
          csvCell(s.name),
          csvCell(s.exam),
          csvCell(s.subjects.join('; ')),
          s.lessons,
          s.total,
          s.accuracy ?? 0,
          s.streak,
          s.lastActive ? new Date(s.lastActive).toLocaleDateString('en-GB') : 'Never',
        ].join(',')),
      ]
      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${schoolName.replace(/[^A-Za-z0-9_-]+/g, '_')}_students_${period === 'week' ? 'week' : 'month'}.csv"`,
        },
      })
    }

    return NextResponse.json({
      type: 'students', schoolName, schoolCity, periodLabel,
      cohort: activeCohort?.name ?? null,
      generatedAt: new Date().toISOString(),
      students: studentStats,
      summary: {
        total:        studentStats.length,
        active:       studentStats.filter(s => s.isActive).length,
        avgAccuracy:  studentStats.filter(s => s.accuracy !== null).length > 0
          ? Math.round(studentStats.filter(s => s.accuracy !== null)
              .reduce((a, s) => a + s.accuracy, 0) / studentStats.filter(s => s.accuracy !== null).length)
          : null,
        totalLessons: studentStats.reduce((a, s) => a + s.lessons, 0),
      },
    })
  }

  // ── SUBJECT REPORT ─────────────────────────────────────────────────────────
  if (type === 'subjects') {
    const subjects = groupTopicsBySubject(stats.topics, 'name')

    return NextResponse.json({
      type: 'subjects', schoolName, schoolCity, periodLabel,
      cohort: activeCohort?.name ?? null,
      generatedAt: new Date().toISOString(),
      totalStudents: studentIds.length,
      subjects,
    })
  }

  // ── MANAGEMENT REPORT ──────────────────────────────────────────────────────
  if (type === 'management') {
    const total    = studentStats.length
    const active   = studentStats.filter(s => s.isActive).length
    const engRate  = total > 0 ? Math.round((active / total) * 100) : 0
    const accs     = studentStats.filter(s => s.accuracy !== null).map(s => s.accuracy)
    const avgAcc   = accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null
    const totalLes = studentStats.reduce((a, s) => a + s.lessons, 0)
    const totalQs  = studentStats.reduce((a, s) => a + s.total, 0)

    const atRisk    = studentStats.filter(s => !s.isActive || (s.accuracy !== null && s.accuracy < 40))
    const topPerf   = [...studentStats].filter(s => s.accuracy !== null)
      .sort((a, b) => b.accuracy - a.accuracy).slice(0, 5)

    // Subject summaries
    const subAcc = {}
    for (const m of stats.subjectsByStudent.values()) {
      for (const [name, d] of Object.entries(m)) {
        const cur = (subAcc[name] ??= { correct: 0, total: 0 })
        cur.correct += d.correct
        cur.total   += d.total
      }
    }
    const subjectSummary = Object.entries(subAcc).map(([name, d]) => ({
      name, accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : null, total: d.total,
    })).sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))

    return NextResponse.json({
      type: 'management', schoolName, schoolCity, periodLabel,
      cohort: activeCohort?.name ?? null,
      session: activeCohort?.session ?? null,
      generatedAt: new Date().toISOString(),
      summary: { total, active, engRate, avgAccuracy: avgAcc, totalLessons: totalLes, totalQuestions: totalQs },
      atRisk: atRisk.map(s => ({ name: s.name, accuracy: s.accuracy, isActive: s.isActive })),
      topPerformers: topPerf.map(s => ({ name: s.name, accuracy: s.accuracy, streak: s.streak })),
      subjectSummary,
    })
  }

  return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
}
// src/app/api/school/report/route.js
// REBUILT — three report types:
//   ?type=students&period=month   → all-students progress table (CSV or JSON)
//   ?type=subjects&period=month   → per-subject topic accuracy (JSON for PDF)
//   ?type=management&period=month → executive summary (JSON for PDF)
//
// The PDF is assembled client-side from the JSON data.
// CSV is still available for the students report.

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type   = searchParams.get('type')   ?? 'students'
  const period = searchParams.get('period') ?? 'month'
  const format = searchParams.get('format') ?? 'json'

  const supabase = await createClient()
  const db = svc()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await db
    .from('profiles')
    .select('school_id, schools(name, city, state)')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.school_id) {
    return NextResponse.json({ error: 'No school assigned' }, { status: 403 })
  }

  const schoolId   = adminProfile.school_id
  const schoolName = adminProfile.schools?.name ?? 'School'
  const schoolCity = adminProfile.schools?.city ?? ''
  const daysBack   = period === 'week' ? 7 : 30
  const since      = new Date(Date.now() - daysBack * 86400000).toISOString()
  const periodLabel = period === 'week' ? 'Last 7 days' : 'Last 30 days'

  // Get active cohort students
  const { data: activeCohort } = await db
    .from('cohorts')
    .select('id, name, session')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .maybeSingle()

  let studentIds = []
  if (activeCohort) {
    const { data: members } = await db
      .from('cohort_members')
      .select('student_id')
      .eq('cohort_id', activeCohort.id)
    studentIds = (members ?? []).map(m => m.student_id)
  } else {
    const { data: students } = await db
      .from('profiles')
      .select('id')
      .eq('school_id', schoolId)
      .eq('role', 'student')
    studentIds = (students ?? []).map(s => s.id)
  }

  if (!studentIds.length) {
    return NextResponse.json({ error: 'No students found' }, { status: 404 })
  }

  // Core data fetch
  const [
    { data: profiles },
    { data: attempts },
    { data: progress },
    { data: streaks },
  ] = await Promise.all([
    db.from('profiles').select('id, full_name, exam_type, subjects').in('id', studentIds),
    db.from('question_attempts')
      .select('student_id, is_correct, subject_id, topic_id, subjects(name), topics(name)')
      .in('student_id', studentIds).gte('created_at', since),
    db.from('lesson_progress')
      .select('student_id, completed').in('student_id', studentIds).gte('started_at', since),
    db.from('student_streaks')
      .select('student_id, current_streak, last_active_date').in('student_id', studentIds),
  ])

  const streakMap   = {}
  ;(streaks ?? []).forEach(s => { streakMap[s.student_id] = s })
  const profileMap  = {}
  ;(profiles ?? []).forEach(p => { profileMap[p.id] = p })

  const weekAgo = new Date(Date.now() - 7 * 86400000)

  // Per-student stats
  const studentStats = studentIds.map(id => {
    const p         = profileMap[id] ?? { id, full_name: 'Unknown' }
    const att       = (attempts ?? []).filter(a => a.student_id === id)
    const prog      = (progress ?? []).filter(x => x.student_id === id)
    const streak    = streakMap[id]
    const correct   = att.filter(a => a.is_correct).length
    const total     = att.length
    const accuracy  = total > 0 ? Math.round((correct / total) * 100) : null
    const lessons   = prog.filter(x => x.completed).length
    const lastActive = streak?.last_active_date
    const isActive   = lastActive && new Date(lastActive) >= weekAgo

    const subjectAcc = {}
    att.forEach(a => {
      const sn = a.subjects?.name
      if (!sn) return
      if (!subjectAcc[sn]) subjectAcc[sn] = { correct: 0, total: 0 }
      subjectAcc[sn].total++
      if (a.is_correct) subjectAcc[sn].correct++
    })

    return {
      id,
      name:        p.full_name ?? '',
      exam:        p.exam_type ?? '',
      subjects:    p.subjects ?? [],
      accuracy,
      correct,
      total,
      lessons,
      streak:      streak?.current_streak ?? 0,
      lastActive:  lastActive ?? null,
      isActive:    !!isActive,
      subjectAcc,
    }
  })

  // ── STUDENTS REPORT ────────────────────────────────────────────────────────
  if (type === 'students') {
    if (format === 'csv') {
      const headers = ['Student Name','Exam','Subjects','Lessons','Questions','Accuracy %','Streak','Last Active']
      const lines   = [
        `# ${schoolName} — Student Report (${periodLabel})`,
        `# Generated: ${new Date().toLocaleDateString('en-GB')}`,
        `# Cohort: ${activeCohort?.name ?? 'All students'}`,
        '',
        headers.join(','),
        ...studentStats.map(s => [
          `"${s.name}"`,
          s.exam,
          `"${s.subjects.join('; ')}"`,
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
          'Content-Disposition': `attachment; filename="${schoolName.replace(/\s/g, '_')}_students_${period}.csv"`,
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
    const topicMap = {}
    ;(attempts ?? []).forEach(a => {
      const sn = a.subjects?.name
      const tn = a.topics?.name
      if (!sn || !tn || !a.topic_id) return
      const key = `${sn}||${a.topic_id}`
      if (!topicMap[key]) topicMap[key] = { subjectName: sn, topicName: tn, topicId: a.topic_id, correct: 0, total: 0 }
      topicMap[key].total++
      if (a.is_correct) topicMap[key].correct++
    })

    const subjectGroups = {}
    Object.values(topicMap).forEach(t => {
      if (!subjectGroups[t.subjectName]) subjectGroups[t.subjectName] = []
      subjectGroups[t.subjectName].push({
        topicId:   t.topicId,
        topicName: t.topicName,
        correct:   t.correct,
        total:     t.total,
        accuracy:  Math.round((t.correct / t.total) * 100),
      })
    })

    const subjects = Object.entries(subjectGroups).map(([name, topics]) => {
      const totAtt = topics.reduce((a, t) => a + t.total, 0)
      const totCor = topics.reduce((a, t) => a + t.correct, 0)
      return {
        name,
        accuracy: totAtt > 0 ? Math.round((totCor / totAtt) * 100) : null,
        topics: topics.sort((a, b) => a.accuracy - b.accuracy),
      }
    }).sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))

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
    ;(attempts ?? []).forEach(a => {
      const sn = a.subjects?.name; if (!sn) return
      if (!subAcc[sn]) subAcc[sn] = { correct: 0, total: 0 }
      subAcc[sn].total++
      if (a.is_correct) subAcc[sn].correct++
    })
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
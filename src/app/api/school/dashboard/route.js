// src/app/api/school/dashboard/route.js
// REBUILT — now returns cohort-aware data with topic-level breakdown.
//
// UPDATED: at-risk segmentation. Previously a flat boolean filter
// (!isActiveThisWeek || accuracy < 40). Now three tiers, giving teachers
// a specific, actionable read instead of one generic "at risk" bucket:
//
//   dropped     — was active in the prior week, inactive THIS week
//                 (a specific, recent drop-off — most actionable)
//   inactive    — hasn't been active at all recently (longer-term disengagement)
//   struggling  — active this week but accuracy < 40% (trying but failing)
//
// `atRisk` (flat array of IDs) is KEPT for backward compatibility with the
// existing PDF report generator (school/report/route.js) and any other
// caller expecting the old shape. `atRiskSegmented` is the new array with
// tier info, additive — nothing that reads `atRisk` needs to change.
//
// Returns:
//   school:           { id, name, city, state }
//   cohort:           active cohort or null
//   allCohorts:       all cohorts for this school (history)
//   summary:          { totalStudents, activeThisWeek, avgAccuracy, lessonsThisWeek, totalQuestionsThisWeek }
//   students:         enriched student list with per-student accuracy + streak
//   subjectTopics:    per-subject → per-topic cohort accuracy (the diagnostic lens)
//   weeklyEngagement: last 4 weeks active student counts
//   atRisk:           student ids with 0 activity in 7+ days OR <40% accuracy (legacy, unchanged shape)
//   atRiskSegmented:  [{ id, tier }] — tier is 'dropped' | 'inactive' | 'struggling'

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
  const db = svc()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get school admin profile
  const { data: adminProfile } = await db
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.school_id) {
    return NextResponse.json({ error: 'No school assigned' }, { status: 403 })
  }

  const schoolId = adminProfile.school_id

  // Parallel: school info + all cohorts + active cohort
  const [
    { data: school },
    { data: allCohorts },
  ] = await Promise.all([
    db.from('schools').select('id, name, city, state').eq('id', schoolId).single(),
    db.from('cohorts').select('id, name, session, invite_code, invite_active, is_active, created_at')
      .eq('school_id', schoolId).order('created_at', { ascending: false }),
  ])

  const activeCohort = (allCohorts ?? []).find(c => c.is_active) ?? null

  // Get students — from active cohort if exists, else all school students
  let studentIds = []
  let cohortMembers = []

  if (activeCohort) {
    const { data: members } = await db
      .from('cohort_members')
      .select('student_id, joined_at')
      .eq('cohort_id', activeCohort.id)

    cohortMembers = members ?? []
    studentIds = cohortMembers.map(m => m.student_id)
  } else {
    const { data: schoolStudents } = await db
      .from('profiles')
      .select('id')
      .eq('school_id', schoolId)
      .eq('role', 'student')

    studentIds = (schoolStudents ?? []).map(s => s.id)
  }

  if (!studentIds.length) {
    return NextResponse.json({
      school,
      cohort: activeCohort,
      allCohorts: allCohorts ?? [],
      summary: { totalStudents: 0, activeThisWeek: 0, avgAccuracy: null, lessonsThisWeek: 0, totalQuestionsThisWeek: 0 },
      students: [],
      subjectTopics: [],
      weeklyEngagement: [],
      atRisk: [],
      atRiskSegmented: [],
    })
  }

  // Parallel data fetch
  const weekAgo       = new Date(Date.now() - 7 * 86400000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const [
    { data: profiles },
    { data: allAttempts },
    { data: allProgress },
    { data: allStreaks },
  ] = await Promise.all([
    db.from('profiles')
      .select('id, full_name, exam_type, subjects, created_at')
      .in('id', studentIds),

    db.from('question_attempts')
      .select('student_id, is_correct, created_at, subject_id, topic_id, subtopic_id, subjects(name), topics(name)')
      .in('student_id', studentIds)
      .gte('created_at', thirtyDaysAgo),

    db.from('lesson_progress')
      .select('student_id, completed, started_at')
      .in('student_id', studentIds),

    db.from('student_streaks')
      .select('student_id, current_streak, last_active_date')
      .in('student_id', studentIds),
  ])

  const profileMap  = {}
  ;(profiles ?? []).forEach(p => { profileMap[p.id] = p })

  const streakMap = {}
  ;(allStreaks ?? []).forEach(s => { streakMap[s.student_id] = s })

  const weekAgoDate   = new Date(Date.now() - 7 * 86400000)
  const twoWeeksAgo    = new Date(Date.now() - 14 * 86400000)

  // ── Per-student enrichment ─────────────────────────────────────────────────
  const enrichedStudents = studentIds.map(id => {
    const profile   = profileMap[id] ?? { id, full_name: 'Unknown' }
    const attempts  = (allAttempts ?? []).filter(a => a.student_id === id)
    const progress  = (allProgress ?? []).filter(p => p.student_id === id)
    const streak    = streakMap[id]

    const correct     = attempts.filter(a => a.is_correct).length
    const total       = attempts.length
    const accuracy    = total > 0 ? Math.round((correct / total) * 100) : null

    const lessonsThisWeek = progress.filter(
      p => p.completed && p.started_at && new Date(p.started_at) >= weekAgoDate
    ).length

    const lastActive       = streak?.last_active_date ?? null
    const isActiveThisWeek = lastActive && new Date(lastActive) >= weekAgoDate

    // Per-subject accuracy for this student
    const subjectAcc = {}
    attempts.forEach(a => {
      const sName = a.subjects?.name
      if (!sName) return
      if (!subjectAcc[sName]) subjectAcc[sName] = { correct: 0, total: 0 }
      subjectAcc[sName].total++
      if (a.is_correct) subjectAcc[sName].correct++
    })

    return {
      id,
      full_name:       profile.full_name,
      exam_type:       profile.exam_type,
      subjects:        profile.subjects ?? [],
      accuracy,
      correct,
      total,
      currentStreak:   streak?.current_streak ?? 0,
      lastActive,
      isActiveThisWeek,
      lessonsThisWeek,
      subjectAcc,
      joinedCohortAt:  cohortMembers.find(m => m.student_id === id)?.joined_at ?? null,
    }
  })

  // ── Summary stats ──────────────────────────────────────────────────────────
  const activeThisWeek  = enrichedStudents.filter(s => s.isActiveThisWeek).length
  const accuracies      = enrichedStudents.map(s => s.accuracy).filter(a => a !== null)
  const avgAccuracy     = accuracies.length
    ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length) : null
  const lessonsThisWeek = enrichedStudents.reduce((a, s) => a + s.lessonsThisWeek, 0)

  const totalQuestionsThisWeek = (allAttempts ?? []).filter(a => {
    return a.created_at && new Date(a.created_at) >= weekAgoDate
  }).length

  // ── At-risk students — segmented into three tiers ─────────────────────────
  // Legacy flat array kept for backward compat with existing PDF reports
  // and any other caller still expecting the old shape.
  const atRisk = enrichedStudents
    .filter(s => !s.isActiveThisWeek || (s.accuracy !== null && s.accuracy < 40))
    .map(s => s.id)

  const atRiskSegmented = enrichedStudents
    .filter(s => !s.isActiveThisWeek || (s.accuracy !== null && s.accuracy < 40))
    .map(s => {
      const wasActiveLastWeek = s.lastActive && new Date(s.lastActive) >= twoWeeksAgo
      const tier =
        !s.isActiveThisWeek && wasActiveLastWeek ? 'dropped' :
        !s.isActiveThisWeek                      ? 'inactive' :
                                                    'struggling'
      return { id: s.id, tier }
    })

  // ── Topic-level diagnostic lens ────────────────────────────────────────────
  // Build: subjectName → topicName → { correct, total }
  const topicAccMap = {}
  ;(allAttempts ?? []).forEach(a => {
    const sName = a.subjects?.name
    const tName = a.topics?.name
    if (!sName || !tName || !a.topic_id) return
    if (!topicAccMap[sName]) topicAccMap[sName] = {}
    if (!topicAccMap[sName][a.topic_id]) {
      topicAccMap[sName][a.topic_id] = { topicName: tName, correct: 0, total: 0 }
    }
    topicAccMap[sName][a.topic_id].total++
    if (a.is_correct) topicAccMap[sName][a.topic_id].correct++
  })

  const subjectTopics = Object.entries(topicAccMap).map(([subjectName, topicsById]) => {
    const topics = Object.entries(topicsById).map(([topicId, data]) => ({
      topicId,
      topicName: data.topicName,
      correct:   data.correct,
      total:     data.total,
      accuracy:  Math.round((data.correct / data.total) * 100),
    })).sort((a, b) => a.accuracy - b.accuracy) // weakest first

    const subjectTotal   = topics.reduce((a, t) => a + t.total, 0)
    const subjectCorrect = topics.reduce((a, t) => a + t.correct, 0)

    return {
      subjectName,
      accuracy: subjectTotal > 0 ? Math.round((subjectCorrect / subjectTotal) * 100) : null,
      topics,
    }
  }).sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100)) // weakest subject first

  // ── Weekly engagement (last 4 weeks) ─────────────────────────────────────
  const weeklyEngagement = []
  for (let i = 3; i >= 0; i--) {
    const wStart = new Date(Date.now() - (i + 1) * 7 * 86400000)
    const wEnd   = new Date(Date.now() - i * 7 * 86400000)
    const label  = wStart.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    const active = new Set(
      (allProgress ?? [])
        .filter(p => p.started_at &&
          new Date(p.started_at) >= wStart &&
          new Date(p.started_at) < wEnd)
        .map(p => p.student_id)
    ).size
    weeklyEngagement.push({ label, active })
  }

  return NextResponse.json({
    school,
    cohort:           activeCohort,
    allCohorts:       allCohorts ?? [],
    summary:          { totalStudents: studentIds.length, activeThisWeek, avgAccuracy, lessonsThisWeek, totalQuestionsThisWeek },
    students:         enrichedStudents.sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '')),
    subjectTopics,
    weeklyEngagement,
    atRisk,
    atRiskSegmented,
  })
}
// src/app/api/school/dashboard/route.js
//
// Single source of truth: question_attempts.
// lesson_progress and student_streaks are not written by any student action,
// so they are not queried here. All activity, accuracy, and topic data comes
// from question_attempts only.

import { createClient }            from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }            from 'next/server'

function svc() {
  return svcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function GET() {
  const supabase = await createClient()
  const db       = svc()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile, error: profileError } = await db
    .from('profiles')
    .select('school_id, role, full_name, schools(id, name, city, state)')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[school/dashboard] profile fetch error:', profileError.message)
  }

  if (!adminProfile?.school_id)
    return NextResponse.json({ error: 'No school assigned' }, { status: 403 })

  const schoolId = adminProfile.school_id
  const school   = adminProfile.schools ?? null

  // ── Cohorts ──────────────────────────────────────────────────────────────────
  const { data: allCohorts } = await db
    .from('cohorts')
    .select('id, name, session, invite_code, invite_active, is_active, created_at')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  const activeCohort = (allCohorts ?? []).find(c => c.is_active) ?? null

  // ── Resolve student IDs ──────────────────────────────────────────────────────
  let studentIds    = []
  let cohortMembers = []

  if (activeCohort) {
    const { data: members } = await db
      .from('cohort_members')
      .select('student_id, joined_at')
      .eq('cohort_id', activeCohort.id)
    cohortMembers = members ?? []
    studentIds    = cohortMembers.map(m => m.student_id)
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
      cohort:           activeCohort,
      allCohorts:       allCohorts ?? [],
      adminName:        adminProfile.full_name ?? '',
      summary:          { totalStudents: 0, activeThisWeek: 0, avgAccuracy: null, totalQuestionsThisWeek: 0 },
      students:         [],
      subjectTopics:    [],
      weeklyEngagement: [],
      atRiskSegmented:  [],
    })
  }

  // ── Parallel fetch — question_attempts only ──────────────────────────────────
  const now       = Date.now()
  const weekAgo   = new Date(now - 7  * 86400000).toISOString()
  const thirtyAgo = new Date(now - 30 * 86400000).toISOString()

  const [
    { data: profiles },
    { data: recentAttempts },  // last 30 days — accuracy, topic breakdown, last_active
    { data: weekAttempts },    // last 7 days — weekly question count (lean)
  ] = await Promise.all([
    db.from('profiles')
      .select('id, full_name, exam_type, subjects, created_at')
      .in('id', studentIds),

    db.from('question_attempts')
      .select('student_id, is_correct, created_at, subject_id, topic_id, subjects(name), topics(name)')
      .in('student_id', studentIds)
      .gte('created_at', thirtyAgo),

    db.from('question_attempts')
      .select('student_id, created_at')
      .in('student_id', studentIds)
      .gte('created_at', weekAgo),
  ])

  const profileMap = {}
  ;(profiles ?? []).forEach(p => { profileMap[p.id] = p })

  const weekAgoDate     = new Date(now - 7  * 86400000)
  const twoWeeksAgoDate = new Date(now - 14 * 86400000)

  // ── Per-student enrichment ───────────────────────────────────────────────────
  const enrichedStudents = studentIds.map(id => {
    const profile  = profileMap[id] ?? { id, full_name: 'Unknown' }
    const attempts = (recentAttempts ?? []).filter(a => a.student_id === id)

    const correct = attempts.filter(a => a.is_correct).length
    const total   = attempts.length

    // accuracy: null if no attempts yet
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : null

    // last_active: most recent created_at across all 30d attempts
    // question_attempts.created_at is set by the DB (now()) on insert — reliable.
    let lastActive = null
    for (const a of attempts) {
      if (!lastActive || a.created_at > lastActive) lastActive = a.created_at
    }

    // daysSinceLastPractice: derived from question_attempts, not student_streaks
    let daysSinceLastPractice = null
    if (lastActive) {
      daysSinceLastPractice = Math.floor((now - new Date(lastActive).getTime()) / 86400000)
    }

    const isActiveThisWeek = daysSinceLastPractice !== null && daysSinceLastPractice <= 7

    // Per-subject accuracy (for student card detail)
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
      full_name:            profile.full_name,
      exam_type:            profile.exam_type,
      subjects:             profile.subjects ?? [],
      accuracy,
      correct,
      total,                          // questions answered in last 30 days
      lastActive,                     // ISO string of most recent attempt
      daysSinceLastPractice,          // derived from question_attempts — reliable
      isActiveThisWeek,
      subjectAcc,
      joinedCohortAt:       cohortMembers.find(m => m.student_id === id)?.joined_at ?? null,
    }
  })

  // ── Summary ──────────────────────────────────────────────────────────────────
  const activeThisWeek     = enrichedStudents.filter(s => s.isActiveThisWeek).length
  const totalCorrectAll    = enrichedStudents.reduce((a, s) => a + s.correct, 0)
  const totalAttemptsAll   = enrichedStudents.reduce((a, s) => a + s.total,   0)
  const avgAccuracy        = totalAttemptsAll > 0
    ? Math.round((totalCorrectAll / totalAttemptsAll) * 100)
    : null
  const totalQuestionsThisWeek = (weekAttempts ?? []).length

  // ── At-risk segmentation ─────────────────────────────────────────────────────
  const atRiskSegmented = enrichedStudents
    .filter(s => !s.isActiveThisWeek || (s.accuracy !== null && s.accuracy < 40))
    .map(s => {
      const wasActiveRecently = s.lastActive && new Date(s.lastActive) >= twoWeeksAgoDate
      const tier =
        !s.isActiveThisWeek && wasActiveRecently ? 'dropped'    :
        !s.isActiveThisWeek                      ? 'inactive'   :
                                                    'struggling'
      return {
        id:                   s.id,
        name:                 s.full_name,
        tier,
        accuracy:             s.accuracy,
        daysSinceLastPractice: s.daysSinceLastPractice,
      }
    })

  // ── Topic-level diagnostic from question_attempts ───────────────────────────
  // Built from the 30d attempts — subject_id/topic_id FK-joined to get names.
  // Rows without topic_id are skipped (untagged questions don't contribute to breakdown).
  const topicAccMap = {}
  ;(recentAttempts ?? []).forEach(a => {
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
    const topics = Object.entries(topicsById).map(([topicId, d]) => ({
      topicId,
      topicName: d.topicName,
      correct:   d.correct,
      total:     d.total,
      accuracy:  Math.round((d.correct / d.total) * 100),
    })).sort((a, b) => a.accuracy - b.accuracy)

    const subjectTotal   = topics.reduce((a, t) => a + t.total,   0)
    const subjectCorrect = topics.reduce((a, t) => a + t.correct, 0)

    return {
      subjectName,
      accuracy: subjectTotal > 0 ? Math.round((subjectCorrect / subjectTotal) * 100) : null,
      topics,
    }
  }).sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))

  // ── Weekly engagement — distinct active students per 7-day window ─────────────
  // Counts any student who answered at least one question in that week.
  // Uses recentAttempts (30d) which covers the last 4 weeks.
  const weeklyEngagement = []
  for (let i = 3; i >= 0; i--) {
    const wStart = new Date(now - (i + 1) * 7 * 86400000)
    const wEnd   = new Date(now - i       * 7 * 86400000)
    const label  = wStart.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    const activeSet = new Set()
    ;(recentAttempts ?? []).forEach(a => {
      if (a.created_at && new Date(a.created_at) >= wStart && new Date(a.created_at) < wEnd)
        activeSet.add(a.student_id)
    })
    weeklyEngagement.push({ label, active: activeSet.size })
  }

  return NextResponse.json(
    {
      school,
      adminName:        adminProfile.full_name ?? '',
      cohort:           activeCohort,
      allCohorts:       allCohorts ?? [],
      summary: {
        totalStudents:         studentIds.length,
        activeThisWeek,
        avgAccuracy,
        totalQuestionsThisWeek,
      },
      students:         enrichedStudents.sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '')),
      subjectTopics,
      weeklyEngagement,
      atRiskSegmented,
    },
    { headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=300' } }
  )
}
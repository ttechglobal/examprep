// src/app/api/school/dashboard/route.js — v2
//
// School admin dashboard data. Source of truth: question_attempts, grouped in
// Postgres (lib/server/schoolStats.js). lesson_progress and student_streaks
// are not written by any student action, so they are not queried here.
//
// v2: school_admin role required; totals come from SQL functions instead of
// downloading every answer (which Supabase capped at 1,000 rows); rosters are
// paged so big schools aren't cut off.

import { createClient }       from '@/lib/supabase/server'
import { supabaseAdmin }      from '@/lib/server/supabaseAdmin'
import { schoolStudentIds }   from '@/lib/server/paging'
import { requireSchoolAdmin, selectByIds, loadSchoolStats, groupTopicsBySubject } from '@/lib/server/schoolStats'
import { appDay }             from '@/lib/dates'
import { NextResponse }       from 'next/server'

const DAY_MS = 86_400_000

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const db = supabaseAdmin()
    const { profile: adminProfile, error: denied } = await requireSchoolAdmin(
      db, user.id, 'school_id, role, full_name, schools(id, name, city, state, slots_purchased, slots_used)'
    )
    if (denied) return denied

    const schoolId = adminProfile.school_id
    const school   = adminProfile.schools ?? null

    // ── Cohorts + roster ───────────────────────────────────────────────────────
    const { data: allCohorts } = await db
      .from('cohorts')
      .select('id, name, session, invite_code, invite_active, is_active, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })

    const { cohort, members: cohortMembers, studentIds } = await schoolStudentIds(db, schoolId)
    const activeCohort = cohort ? (allCohorts ?? []).find(c => c.id === cohort.id) ?? cohort : null

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

    // ── Stats (grouped in SQL) ────────────────────────────────────────────────
    const now       = Date.now()
    const weekAgo   = new Date(now - 7  * DAY_MS).toISOString()
    const thirtyAgo = new Date(now - 30 * DAY_MS).toISOString()

    const [profiles, stats30, weekStats, engagement] = await Promise.all([
      selectByIds(db, 'profiles', 'id, full_name, exam_type, subjects, created_at', studentIds),
      loadSchoolStats(db, studentIds, thirtyAgo),
      db.rpc('stats_by_student', { p_student_ids: studentIds, p_since: weekAgo }),
      db.rpc('active_students_by_bucket', { p_student_ids: studentIds, p_end: appDay(), p_bucket_days: 7, p_buckets: 4 }),
    ])
    if (weekStats.error)  throw weekStats.error
    if (engagement.error) throw engagement.error

    const profileMap = {}
    for (const p of profiles) profileMap[p.id] = p
    const joinedAt = {}
    for (const m of cohortMembers) joinedAt[m.student_id] = m.joined_at

    const twoWeeksAgoDate = new Date(now - 14 * DAY_MS)

    // ── Per-student enrichment ───────────────────────────────────────────────
    const enrichedStudents = studentIds.map(id => {
      const profile = profileMap[id] ?? { id, full_name: 'Unknown' }
      const s       = stats30.byStudent.get(id) ?? { answered: 0, correct: 0, lastActive: null }
      const total   = s.answered
      const correct = s.correct
      const lastActive = s.lastActive
      const daysSinceLastPractice = lastActive
        ? Math.floor((now - new Date(lastActive).getTime()) / DAY_MS)
        : null

      return {
        id,
        full_name:             profile.full_name,
        exam_type:             profile.exam_type,
        subjects:              profile.subjects ?? [],
        accuracy:              total > 0 ? Math.round((correct / total) * 100) : null,
        correct,
        total,                 // questions answered in last 30 days
        lastActive,            // ISO string of most recent attempt
        daysSinceLastPractice,
        isActiveThisWeek:      daysSinceLastPractice !== null && daysSinceLastPractice <= 7,
        subjectAcc:            stats30.subjectsByStudent.get(id) ?? {},
        joinedCohortAt:        joinedAt[id] ?? null,
      }
    })

    // ── Summary ──────────────────────────────────────────────────────────────
    const activeThisWeek   = enrichedStudents.filter(s => s.isActiveThisWeek).length
    const totalCorrectAll  = enrichedStudents.reduce((a, s) => a + s.correct, 0)
    const totalAttemptsAll = enrichedStudents.reduce((a, s) => a + s.total,   0)
    const avgAccuracy      = totalAttemptsAll > 0 ? Math.round((totalCorrectAll / totalAttemptsAll) * 100) : null
    const totalQuestionsThisWeek = (weekStats.data ?? []).reduce((a, r) => a + (Number(r.answered) || 0), 0)

    // ── At-risk segmentation ─────────────────────────────────────────────────
    const atRiskSegmented = enrichedStudents
      .filter(s => !s.isActiveThisWeek || (s.accuracy !== null && s.accuracy < 40))
      .map(s => {
        const wasActiveRecently = s.lastActive && new Date(s.lastActive) >= twoWeeksAgoDate
        const tier =
          !s.isActiveThisWeek && wasActiveRecently ? 'dropped'  :
          !s.isActiveThisWeek                      ? 'inactive' :
                                                     'struggling'
        return {
          id:                    s.id,
          name:                  s.full_name,
          tier,
          accuracy:              s.accuracy,
          daysSinceLastPractice: s.daysSinceLastPractice,
        }
      })

    // ── Topic diagnostic + weekly engagement ─────────────────────────────────
    const subjectTopics = groupTopicsBySubject(stats30.topics, 'subjectName')

    // Oldest week first, labelled by its first day (as before).
    const weeklyEngagement = [...(engagement.data ?? [])]
      .sort((a, b) => b.bucket - a.bucket)
      .map(b => ({
        label:  new Date(`${String(b.bucket_start).slice(0, 10)}T12:00:00Z`)
                  .toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
        active: Number(b.active) || 0,
      }))

    return NextResponse.json(
      {
        school,
        adminName:  adminProfile.full_name ?? '',
        cohort:     activeCohort,
        allCohorts: allCohorts ?? [],
        summary: {
          totalStudents: studentIds.length,
          activeThisWeek,
          avgAccuracy,
          totalQuestionsThisWeek,
        },
        students: enrichedStudents.sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '')),
        subjectTopics,
        weeklyEngagement,
        atRiskSegmented,
      },
      { headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=300' } }
    )
  } catch (err) {
    console.error('[school/dashboard] error:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load dashboard' }, { status: 500 })
  }
}

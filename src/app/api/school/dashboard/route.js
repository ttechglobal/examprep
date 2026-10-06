// src/app/api/school/dashboard/route.js — v4
//
// School admin dashboard data. Source of truth: question_attempts, grouped in
// Postgres (lib/server/schoolStats.js). lesson_progress and student_streaks
// are not written by any student action, so they are not queried here.
//
// v2: school_admin role required; totals come from SQL functions instead of
// downloading every answer (which Supabase capped at 1,000 rows); rosters are
// paged so big schools aren't cut off.
// v3: the roster is the whole school, each student says whether they have
// Premium (and from where), and the school comes with its slot balance
// (20261007_schools_and_admin_log.sql).
// v4: lighter on the database. The roster and every student's Premium come from
// ONE query (school_roster, 20261013) instead of five round trips; every query
// that doesn't depend on another runs at the same time; and the result is kept
// for 90 seconds per school (lib/server/memo.js), so opening the dashboard twice
// or from two devices runs the queries once. Adding or removing a student on
// the Slots tab clears it.

import { createClient }       from '@/lib/supabase/server'
import { supabaseAdmin }      from '@/lib/server/supabaseAdmin'
import { selectAll }          from '@/lib/server/paging'
import { requireSchoolAdmin, loadSchoolStats, groupTopicsBySubject } from '@/lib/server/schoolStats'
import { appDay }             from '@/lib/dates'
import { memo, schoolDashboardKey } from '@/lib/server/memo'
import { slotBalance, schoolRosterRows, premiumOf, studentContact } from '@/lib/server/schoolSlots'
import { NextResponse }       from 'next/server'

const DAY_MS = 86_400_000
const CACHE_MS = 90_000

async function loadDashboard(db, schoolId) {
  // Everything that doesn't depend on anything else, at once.
  const [slots, cohortsRes, roster] = await Promise.all([
    slotBalance(db, schoolId),
    db.from('cohorts')
      .select('id, name, session, invite_code, invite_active, is_active, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false }),
    schoolRosterRows(db, schoolId),
  ])
  if (cohortsRes.error) throw cohortsRes.error
  const allCohorts = cohortsRes.data ?? []
  const cohort = allCohorts.find(c => c.is_active) ?? null   // the newest active one (list is newest first)
  const studentIds = roster.map(r => r.id)

  if (!studentIds.length) {
    return {
      slots, cohort, allCohorts,
      summary: { totalStudents: 0, premiumStudents: 0, activeThisWeek: 0, avgAccuracy: null, totalQuestionsThisWeek: 0 },
      students: [], subjectTopics: [], weeklyEngagement: [], atRiskSegmented: [],
    }
  }

  // ── Stats (grouped in SQL) ────────────────────────────────────────────────
  const now       = Date.now()
  const weekAgo   = new Date(now - 7  * DAY_MS).toISOString()
  const thirtyAgo = new Date(now - 30 * DAY_MS).toISOString()

  const [members, stats30, weekStats, engagement] = await Promise.all([
    cohort
      ? selectAll(() => db.from('cohort_members').select('student_id, joined_at').eq('cohort_id', cohort.id).order('student_id'))
      : [],
    loadSchoolStats(db, studentIds, thirtyAgo),
    db.rpc('stats_by_student', { p_student_ids: studentIds, p_since: weekAgo }),
    db.rpc('active_students_by_bucket', { p_student_ids: studentIds, p_end: appDay(), p_bucket_days: 7, p_buckets: 4 }),
  ])
  if (weekStats.error)  throw weekStats.error
  if (engagement.error) throw engagement.error

  const joinedAt = {}
  for (const m of members) joinedAt[m.student_id] = m.joined_at
  const twoWeeksAgoDate = new Date(now - 14 * DAY_MS)

  // ── Per-student enrichment ───────────────────────────────────────────────
  const enrichedStudents = roster.map(profile => {
    const id      = profile.id
    const s       = stats30.byStudent.get(id) ?? { answered: 0, correct: 0, lastActive: null }
    const total   = s.answered
    const correct = s.correct
    const lastActive = s.lastActive
    const daysSinceLastPractice = lastActive
      ? Math.floor((now - new Date(lastActive).getTime()) / DAY_MS)
      : null
    const plan = premiumOf(profile, now)

    return {
      id,
      full_name:             profile.full_name?.trim() || profile.username || 'No name yet',
      contact:               studentContact(profile),
      premium:               plan.premium,      // 'school' | 'own' | null
      premiumUntil:          plan.until,
      exam_type:             profile.exam_type,
      subjects:              Array.isArray(profile.subjects) ? profile.subjects : [],
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

  // ── Weekly engagement: oldest week first, labelled by its first day ──────
  const weeklyEngagement = [...(engagement.data ?? [])]
    .sort((a, b) => b.bucket - a.bucket)
    .map(b => ({
      label:  new Date(`${String(b.bucket_start).slice(0, 10)}T12:00:00Z`)
                .toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      active: Number(b.active) || 0,
    }))

  return {
    slots, cohort, allCohorts,
    summary: {
      totalStudents: studentIds.length,
      premiumStudents: enrichedStudents.filter(s => s.premium).length,
      activeThisWeek,
      avgAccuracy,
      totalQuestionsThisWeek,
    },
    students: enrichedStudents.sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '')),
    subjectTopics: groupTopicsBySubject(stats30.topics, 'subjectName'),
    weeklyEngagement,
    atRiskSegmented,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const db = supabaseAdmin()
    const { profile: adminProfile, error: denied } = await requireSchoolAdmin(
      db, user.id, 'school_id, role, full_name, schools(id, name, city, state, contact_name, contact_email, contact_phone)'
    )
    if (denied) return denied

    const schoolId = adminProfile.school_id
    const { slots, ...rest } = await memo(schoolDashboardKey(schoolId), CACHE_MS, () => loadDashboard(db, schoolId))

    return NextResponse.json(
      { ...rest, school: { ...adminProfile.schools, slots }, adminName: adminProfile.full_name ?? '' },
      { headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=300' } }
    )
  } catch (err) {
    console.error('[school/dashboard] error:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load dashboard' }, { status: 500 })
  }
}

// src/lib/server/paging.js
// Supabase (PostgREST) returns at most 1,000 rows per request and says nothing
// when it cuts a result short. Use selectAll() for any list that can grow past
// that (e.g. every student in a school). For totals, counts and rankings,
// don't page raw rows at all — group in SQL with an RPC.

const PAGE = 1000

/**
 * @param {() => any} makeQuery  returns a fresh query builder each call; must
 *                               include a stable .order() so pages don't overlap
 * @param {number} max           hard stop, in rows
 */
export async function selectAll(makeQuery, max = 50_000) {
  const rows = []
  for (let from = 0; from < max; from += PAGE) {
    const { data, error } = await makeQuery().range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  return rows
}

/**
 * Every student in a school: profiles linked to it (added with a slot, or
 * joined with the school's invite code). Also returns the school's newest
 * active cohort (for its invite code) and that cohort's join dates.
 *
 * v2: the roster is the whole school. It used to be only the newest active
 * cohort, so students added with a slot (who join no cohort) and students of
 * older cohorts were missing from the dashboard, reports and school board.
 */
export async function schoolStudentIds(db, schoolId) {
  const [cohortRes, students] = await Promise.all([
    db.from('cohorts').select('id, name')
      .eq('school_id', schoolId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1),
    selectAll(() => db.from('profiles').select('id')
      .eq('school_id', schoolId).eq('role', 'student').order('id')),
  ])
  if (cohortRes.error) throw cohortRes.error
  const cohort = cohortRes.data?.[0] ?? null
  const members = cohort
    ? await selectAll(() => db.from('cohort_members').select('student_id, joined_at').eq('cohort_id', cohort.id).order('student_id'))
    : []
  return { cohort, members, studentIds: students.map(s => s.id) }
}

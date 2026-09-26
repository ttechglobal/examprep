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

/** Every student id in a school's active cohort, or in the school if it has no active cohort. */
export async function schoolStudentIds(db, schoolId) {
  // Newest active cohort (the school dashboard picks the same one).
  const { data: cohorts, error } = await db
    .from('cohorts')
    .select('id, name')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  const activeCohort = cohorts?.[0] ?? null

  if (activeCohort) {
    const members = await selectAll(() => db
      .from('cohort_members').select('student_id, joined_at')
      .eq('cohort_id', activeCohort.id).order('student_id'))
    return { cohort: activeCohort, members, studentIds: members.map(m => m.student_id) }
  }

  const students = await selectAll(() => db
    .from('profiles').select('id')
    .eq('school_id', schoolId).eq('role', 'student').order('id'))
  return { cohort: null, members: [], studentIds: students.map(s => s.id) }
}

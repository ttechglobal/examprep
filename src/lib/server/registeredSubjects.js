// Registered exam subjects for independent Battle missions and Practice challenges.
// Account subjects win; device hints are used only when account subjects are empty.
const EXAMS = ['WAEC', 'JAMB']
const ALIASES = { 'Use of English': 'English Language', 'English Language': 'Use of English' }

// The student's registered subject rows, per exam they sit. The account's own
// subjects win; the phone's list is used for an exam the account has none for.
export async function registeredSubjects(db, profile, hints) {
  const saved = exam => {
    const list = exam === 'WAEC' ? profile.subjects_waec : profile.subjects_jamb
    return Array.isArray(list) && list.length ? list : null
  }
  const primary = (profile.exam_types?.length ? profile.exam_types : [profile.exam_type]).filter(e => EXAMS.includes(e))
  const out = []
  for (const exam of EXAMS) {
    const names = saved(exam)
      ?? (primary.includes(exam) && Array.isArray(profile.subjects) && profile.subjects.length ? profile.subjects : null)
      ?? hints[exam] ?? []
    if (!names.length) continue
    const queryNames = [...new Set(names.flatMap(n => [n, ALIASES[n]].filter(Boolean)))]
    const { data: rows, error } = await db.from('subjects')
      .select('id, name').in('name', queryNames).eq('exam_type', exam).eq('is_active', true)
    if (error) throw error
    const seen = new Set()
    for (const row of rows ?? []) {
      const name = names.includes(row.name) ? row.name : ALIASES[row.name] ?? row.name
      if (seen.has(name)) continue
      seen.add(name)
      out.push({ subject: { id: row.id, name }, exam })
    }
  }
  return out
}


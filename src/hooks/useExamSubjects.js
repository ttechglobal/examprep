'use client'
// src/hooks/useExamSubjects.js
// ─────────────────────────────────────────────────────────────────────────────
// The student's subjects for one exam (WAEC or JAMB), with database ids.
// Used by the practice setup sheet and the mock exam setup.
//
//   1. This session's memory → instant on every reopen
//   2. The device cache (lib/localProfile subject-id cache, 24 h) → instant,
//      works offline
//   3. Otherwise the names show straight away (id: null) and
//      GET /api/student/subjects resolves the ids in the background.
//
// Subject names come from the profile the layout already loaded
// (subjects_waec / subjects_jamb). English is named per exam: WAEC "English
// Language", JAMB "Use of English".
//
// Returns { subjects: [{ id, name }], loading, hasAny }
//   hasAny: the student has picked subjects for this exam at all.
//
// v1 (moved out of the Practice page, which resolved ids for one exam only;
//     the mock setup reused those ids for the other exam).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { readSubjectIdCache, writeSubjectIdCache } from '@/lib/localProfile'

const ENGLISH = { WAEC: 'English Language', JAMB: 'Use of English' }
const memory  = new Map()          // `${exam}|${names}` → [{ id, name }]

/** The subject names a profile has for one exam, with English named for that exam. */
export function examSubjectNames(profile, exam) {
  const raw = exam === 'JAMB'
    ? (profile?.subjects_jamb ?? profile?.subjects ?? [])
    : (profile?.subjects_waec ?? profile?.subjects ?? [])
  return raw.map(n => (/^(english language|use of english)$/i.test(n) ? ENGLISH[exam] : n))
}

export function useExamSubjects(profile, exam) {
  const names = examSubjectNames(profile, exam)
  const key   = `${exam}|${names.join(',')}`
  const [state, setState] = useState(() => ({ subjects: memory.get(key) ?? [], loading: false }))

  useEffect(() => {
    if (!profile) return
    if (!names.length) { setState({ subjects: [], loading: false }); return }
    if (memory.has(key)) { setState({ subjects: memory.get(key), loading: false }); return }

    // The device cache counts only if it covers every current subject.
    const cached = readSubjectIdCache(exam)
    if (cached?.length) {
      const byName = new Map(cached.map(s => [s.name, s]))
      if (names.every(n => byName.get(n)?.id)) {
        const rows = names.map(n => byName.get(n))
        memory.set(key, rows)
        setState({ subjects: rows, loading: false })
        return
      }
    }

    let cancelled = false
    setState({ subjects: names.map(name => ({ id: null, name })), loading: true })
    fetch(`/api/student/subjects?exam=${exam}&names=${encodeURIComponent(names.join(','))}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(data => {
        const byName = new Map((Array.isArray(data) ? data : []).map(s => [s.name, { id: s.id, name: s.name }]))
        const rows   = names.map(name => byName.get(name) ?? { id: null, name })
        if (rows.every(s => s.id)) {
          memory.set(key, rows)
          writeSubjectIdCache(exam, rows)
        }
        if (!cancelled) setState({ subjects: rows, loading: false })
      })
      .catch(() => { if (!cancelled) setState(s => ({ ...s, loading: false })) })

    return () => { cancelled = true }
  }, [key, exam, !!profile]) // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, hasAny: names.length > 0 }
}

// src/lib/server/dailyQuiz.js
// ─────────────────────────────────────────────────────────────────────────────
// Today's two daily-challenge questions, shared by the GET route (which shows
// them) and the attempt route (which checks a submission is for one of them).
//
// Deterministic: the same subjects on the same day always give the same two
// questions. Each pick costs two tiny queries (a count, then one row at a
// seeded offset in id order) instead of loading 200 full questions, and picks
// are memoised per server instance for the day.
// ─────────────────────────────────────────────────────────────────────────────

import { appDay } from '@/lib/dates'

export const SUBJECT_GROUPS = {
  sciences:     ['Physics', 'Chemistry', 'Biology'],
  social:       ['Economics', 'Government', 'Commerce', 'Geography'],
  maths:        ['Mathematics', 'Further Mathematics'],
  languages:    ['English Language', 'Use of English', 'Literature in English'],
  agricultural: ['Agricultural Science'],
}

export const QUESTION_COLS = `
  id, question_text, options, correct_answer, explanation, hint,
  difficulty, year, exam_type, subject_id, topic_id,
  subjects ( id, name ),
  topics   ( id, name )
`

export function todayStr() { return appDay() }

export function dateSeed(dateStr) {
  const d   = new Date(`${dateStr}T00:00:00Z`)
  const doy = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000)
  return d.getUTCFullYear() * 1000 + doy
}

function seededPick(arr, seed) {
  if (!arr?.length) return null
  return arr[Math.abs(seed) % arr.length]
}

/** The two subjects for today, drawn from different subject groups when possible. */
export function pickSubjects(userSubjects, seed) {
  if (!userSubjects?.length) return [null, null]
  const groups = Object.entries(SUBJECT_GROUPS)
    .map(([key, members]) => ({ key, subjects: members.filter(m => userSubjects.includes(m)) }))
    .filter(g => g.subjects.length > 0)

  if (groups.length >= 2) {
    const g1 = seededPick(groups, seed)
    const g2 = seededPick(groups.filter(g => g.key !== g1.key), seed + 3)
    return [seededPick(g1.subjects, seed + 1), seededPick(g2.subjects, seed + 7)]
  }
  const pool = groups.length === 1 ? groups[0].subjects : userSubjects
  const s1 = seededPick(pool, seed)
  return [s1, seededPick(pool, seed + 5) ?? s1]
}

// ── Per-instance memo (keys include the date, so it resets daily) ───────────
const memo = new Map()
function remember(key, compute) {
  if (memo.has(key)) return memo.get(key)
  const p = compute().catch(err => { memo.delete(key); throw err })
  if (memo.size > 500) memo.clear()
  memo.set(key, p)
  return p
}

async function questionAtSeed(db, filter, seed) {
  const { count, error } = await filter(db.from('questions').select('id', { count: 'exact', head: true }))
  if (error) throw error
  if (!count) return null
  const offset = Math.abs(seed) % count
  const { data, error: e2 } = await filter(db.from('questions').select('id'))
    .order('id').range(offset, offset)
  if (e2) throw e2
  return data?.[0]?.id ?? null
}

/** Question id for one slot: from the subject if possible, else from the whole bank. */
export function pickQuestionId(db, subjectName, seed, excludeId, day) {
  return remember(`${day}|${subjectName ?? '*'}|${seed}|${excludeId ?? ''}`, async () => {
    if (subjectName) {
      // Same name can exist under WAEC and JAMB; any active one will do.
      const { data: subjectRows } = await db
        .from('subjects').select('id').eq('name', subjectName).eq('is_active', true)
        .order('id').limit(1)
      const subjectId = subjectRows?.[0]?.id
      if (subjectId) {
        const id = await questionAtSeed(db, q => {
          q = q.eq('subject_id', subjectId).eq('is_active', true)
          return excludeId ? q.neq('id', excludeId) : q
        }, seed)
        if (id) return id
      }
    }
    return questionAtSeed(db, q => {
      q = q.eq('is_active', true)
      return excludeId ? q.neq('id', excludeId) : q
    }, seed)
  })
}

/**
 * The (up to) two slots for a student today.
 * existingBySlot: today's attempt rows keyed by slot — a started question
 * always stays that student's question for the day.
 * @returns [{ slot, subjectName, questionId }]
 */
export async function todaysSlots(db, userSubjects, existingBySlot = {}, day = todayStr()) {
  const seed = dateSeed(day)
  const [subject1, subject2] = pickSubjects(userSubjects, seed)
  const slots = []
  let firstId = null
  for (const [slot, subjectName, slotSeed] of [[1, subject1, seed], [2, subject2, seed + 13]]) {
    const existing = existingBySlot[slot]?.question_id ?? null
    const questionId = existing ?? await pickQuestionId(db, subjectName, slotSeed, slot === 2 ? firstId : null, day)
    if (slot === 1) firstId = questionId
    slots.push({ slot, subjectName, questionId })
  }
  return slots
}

/** Every subject on the student's profile (all exams). */
export async function profileSubjects(db, userId) {
  const { data: prof } = await db
    .from('profiles').select('subjects_waec, subjects_jamb, subjects').eq('id', userId).single()
  return [...new Set([
    ...(prof?.subjects_waec ?? []),
    ...(prof?.subjects_jamb ?? []),
    ...(prof?.subjects      ?? []),
  ])]
}

/** Options as an array, whether stored as an array or as {A,B,C,D}. */
export function optionsArray(options) {
  const LETTERS = ['A', 'B', 'C', 'D', 'E']
  if (Array.isArray(options)) return options
  if (options && typeof options === 'object') return LETTERS.map(l => options[l]).filter(v => v != null)
  return []
}

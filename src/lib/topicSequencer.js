// src/lib/topicSequencer.js
// ─────────────────────────────────────────────────────────────────────────────
// Pure function — no DB calls, no side effects.
// Sequences a flat question pool so that core topics appear first,
// with weaker topics getting proportionally more slots.
//
// Used by:
//   - /api/diagnostic/questions  (no studentAcc — deterministic core-first)
//   - /api/practice/questions    (with studentAcc — weighted by weakness)
//
// Backward compat: if coreTopicIds is empty/null → returns standard random
// shuffle, identical to the original behaviour.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object[]} questions   - Full question pool. Each question must have a topic_id.
 * @param {string[]} coreTopicIds - Ordered topic IDs (priority ASC — index 0 = highest priority).
 * @param {Object|null} studentAcc - { [topicId]: { total: number, correct: number } } or null.
 * @param {number} count         - How many questions to return.
 * @returns {Object[]} Sequenced question array of length ≤ count.
 */
export function sequenceQuestions({ questions, coreTopicIds, studentAcc, count }) {
  // ── Fallback: no core topics defined → pure random shuffle ────────────────
  if (!coreTopicIds?.length) {
    return shuffle(questions).slice(0, count)
  }

  const coreSet = new Set(coreTopicIds)

  // ── Partition the pool into core and non-core ─────────────────────────────
  const byTopic = {}   // topicId → question[]
  const nonCore = []

  for (const q of questions) {
    const tid = q.topic_id
    if (!tid) { nonCore.push(q); continue }
    if (coreSet.has(tid)) {
      if (!byTopic[tid]) byTopic[tid] = []
      byTopic[tid].push(q)
    } else {
      nonCore.push(q)
    }
  }

  // ── Compute weakness score per core topic ─────────────────────────────────
  // Score: 0.0 = mastered, 1.0 = never attempted
  // Topics with score = 0 (mastered ≥70% with ≥5 attempts) get no slots.
  const MASTERY_THRESHOLD = 0.70
  const MIN_ATTEMPTS_FOR_MASTERY = 5

  function weaknessScore(topicId) {
    if (!studentAcc) return 1.0   // diagnostic mode — no history → treat as unknown
    const acc = studentAcc[topicId]
    if (!acc || acc.total === 0) return 1.0   // never attempted
    const accuracy = acc.correct / acc.total
    if (acc.total >= MIN_ATTEMPTS_FOR_MASTERY && accuracy >= MASTERY_THRESHOLD) return 0.0
    return 1.0 - accuracy   // e.g. 40% accuracy → score 0.6
  }

  // ── Build ordered list of core topics that still need practice ────────────
  const activeCoreTopics = coreTopicIds
    .filter(tid => (byTopic[tid]?.length ?? 0) > 0)  // must have questions
    .map(tid => ({ tid, score: weaknessScore(tid) }))
    .filter(({ score }) => score > 0)  // skip fully mastered topics

  // ── Allocate slots ────────────────────────────────────────────────────────
  // Core topics get up to CORE_FRACTION of total count, distributed by score.
  // Non-core fills the remainder.
  const CORE_FRACTION = 0.60
  const coreSlots = Math.min(
    Math.round(count * CORE_FRACTION),
    activeCoreTopics.reduce((n, { tid }) => n + (byTopic[tid]?.length ?? 0), 0)
  )
  const otherSlots = count - coreSlots

  // Weighted slot allocation across active core topics
  const totalScore = activeCoreTopics.reduce((s, { score }) => s + score, 0)
  const coreQuestions = []

  if (totalScore > 0) {
    for (const { tid, score } of activeCoreTopics) {
      const slots = Math.max(1, Math.round((score / totalScore) * coreSlots))
      const pool  = shuffle([...(byTopic[tid] ?? [])])
      coreQuestions.push(...pool.slice(0, slots))
    }
  }

  // Trim to exactly coreSlots (rounding may overshoot by 1-2)
  const coreFinal  = shuffle(coreQuestions).slice(0, coreSlots)
  const otherFinal = shuffle(nonCore).slice(0, otherSlots)

  // ── Interleave: avoid serving ALL core questions back-to-back ─────────────
  // Pattern: serve 2 core, then 1 other, repeat. This keeps it feeling natural.
  const result = []
  let ci = 0, oi = 0
  let coreRun = 0
  const CORE_RUN_MAX = 2   // max consecutive core questions before inserting one other

  while (result.length < count && (ci < coreFinal.length || oi < otherFinal.length)) {
    if (ci < coreFinal.length && coreRun < CORE_RUN_MAX) {
      result.push(coreFinal[ci++])
      coreRun++
    } else if (oi < otherFinal.length) {
      result.push(otherFinal[oi++])
      coreRun = 0
    } else if (ci < coreFinal.length) {
      // exhausted other pool — keep going with core
      result.push(coreFinal[ci++])
    } else {
      break
    }
  }

  return result.slice(0, count)
}

// ── Helper: Fisher-Yates shuffle (pure, returns new array) ───────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Fetch core topic IDs for a set of subjects + exam type from Supabase.
 * Returns a map: { [subjectId]: string[] } where the array is topic IDs ordered by priority.
 *
 * Uses service role client (passed in) — no RLS.
 * Returns empty object on any error so callers always get a safe default.
 *
 * @param {Object} db          - Supabase service role client
 * @param {string[]} subjectIds
 * @param {string} examType    - 'WAEC' | 'JAMB' | 'BOTH'
 */
export async function fetchCoreTopicMap(db, subjectIds, examType) {
  try {
    if (!subjectIds?.length) return {}

    // Match exact exam type OR 'BOTH' entries (which apply to all exams)
    const examFilter = examType === 'BOTH'
      ? ['WAEC', 'JAMB', 'BOTH']
      : [examType, 'BOTH']

    const { data, error } = await db
      .from('core_topics')
      .select('subject_id, topic_id, priority')
      .in('subject_id', subjectIds)
      .in('exam_type', examFilter)
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (error || !data?.length) return {}

    // Build map: subjectId → [topicId, ...] ordered by priority
    const map = {}
    for (const row of data) {
      if (!map[row.subject_id]) map[row.subject_id] = []
      // Avoid duplicates (a topic could appear for both WAEC and BOTH)
      if (!map[row.subject_id].includes(row.topic_id)) {
        map[row.subject_id].push(row.topic_id)
      }
    }
    return map
  } catch {
    return {}   // never throw — callers fall through to random shuffle
  }
}

/**
 * Fetch student accuracy per topic for a set of subject IDs.
 * Returns { [topicId]: { total, correct } }
 *
 * @param {Object} db
 * @param {string} studentId
 * @param {string[]} subjectIds
 */
export async function fetchStudentAccuracy(db, studentId, subjectIds) {
  try {
    if (!studentId || !subjectIds?.length) return {}

    const { data, error } = await db
      .from('question_attempts')
      .select('topic_id, is_correct')
      .eq('student_id', studentId)
      .in('subject_id', subjectIds)
      .not('topic_id', 'is', null)

    if (error || !data?.length) return {}

    const acc = {}
    for (const row of data) {
      if (!acc[row.topic_id]) acc[row.topic_id] = { total: 0, correct: 0 }
      acc[row.topic_id].total++
      if (row.is_correct) acc[row.topic_id].correct++
    }
    return acc
  } catch {
    return {}
  }
}
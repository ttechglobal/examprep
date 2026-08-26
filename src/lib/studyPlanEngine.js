// src/lib/studyPlanEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// Study plan rebuild engine for ExamPrep.
//
// Exports:
//   rebuildStudyPlan(db, studentId, subjectIds)
//     - Called after every practice session and after the diagnostic save.
//     - Recomputes student_learning_paths for each subject based on current
//       question_attempts accuracy data.
//     - Injects spaced-repetition review topics at the END of each plan.
//     - Never throws — errors are caught and logged so the parent request
//       always completes.
//
//   seedCoreTopicsForSubject(db, studentId, subjectId)
//     - Called once after the diagnostic save for each enrolled subject.
//     - Seeds student_learning_paths with all subtopics for the subject,
//       ordered by: weak subtopics first, then by exam_frequency DESC.
//     - Safe to call multiple times — uses upsert (onConflict = student+subject).
//
// STUDY PLAN LOGIC (rebuildStudyPlan):
//   1. Pull student's question_attempts for each subject (recent 500, capped
//      for performance).
//   2. Compute per-topic accuracy: { total, correct }.
//   3. Run updateReviewSchedule (spacedRepetition) for touched topics.
//   4. Fetch all subtopics for the subject ordered by exam_frequency DESC.
//   5. Sort subtopics into three buckets:
//        a. WEAK     — accuracy < 50% (or never attempted)
//        b. IMPROVING — accuracy 50–69%
//        c. MASTERED  — accuracy ≥ 70% with ≥ 3 attempts
//   6. Order: WEAK first → IMPROVING → MASTERED (at the end as refreshers).
//      Within each bucket, higher exam_frequency wins ties.
//   7. Append REVIEW items (topics due for spaced-repetition review) AFTER
//      all WEAK and IMPROVING items, before MASTERED.
//   8. Upsert student_learning_paths with the resulting ordered_subtopic_ids.
// ─────────────────────────────────────────────────────────────────────────────

import { updateReviewSchedule, getTopicsDueForReview } from '@/lib/spacedRepetition'

// ── Constants ─────────────────────────────────────────────────────────────────
const MASTERY_SCORE   = 70   // % — topic is considered mastered above this
const MIN_ATTEMPTS    = 3    // attempts required before mastery is recognised
const RECENT_CAP      = 500  // max attempts fetched per subject (performance)

// ── rebuildStudyPlan ──────────────────────────────────────────────────────────
/**
 * Rebuild the ordered learning path for each of the student's subjects.
 *
 * @param {object}   db         - Supabase service role client (no RLS)
 * @param {string}   studentId  - UUID from auth.users
 * @param {string[]} subjectIds - UUIDs of subjects to rebuild plans for
 */
export async function rebuildStudyPlan(db, studentId, subjectIds) {
  if (!studentId || !subjectIds?.length) return

  for (const subjectId of subjectIds) {
    try {
      await _rebuildForSubject(db, studentId, subjectId)
    } catch (err) {
      // Never propagate — a failed plan rebuild should not break the
      // practice-save or diagnostic-save request.
      console.error(`[studyPlanEngine] rebuildStudyPlan error for subject ${subjectId}:`, err.message)
    }
  }
}

async function _rebuildForSubject(db, studentId, subjectId) {
  // 1. Fetch recent attempts for this subject
  const { data: attempts, error: attErr } = await db
    .from('question_attempts')
    .select('topic_id, subtopic_id, is_correct')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })
    .limit(RECENT_CAP)

  if (attErr) {
    console.error(`[studyPlanEngine] attempts fetch error for subject ${subjectId}:`, attErr.message)
  }

  // 2. Build per-topic and per-subtopic accuracy maps
  const topicAcc    = {}   // topicId    → { total, correct }
  const subtopicAcc = {}   // subtopicId → { total, correct }

  for (const a of attempts ?? []) {
    if (a.topic_id) {
      if (!topicAcc[a.topic_id]) topicAcc[a.topic_id] = { total: 0, correct: 0 }
      topicAcc[a.topic_id].total++
      if (a.is_correct) topicAcc[a.topic_id].correct++
    }
    if (a.subtopic_id) {
      if (!subtopicAcc[a.subtopic_id]) subtopicAcc[a.subtopic_id] = { total: 0, correct: 0 }
      subtopicAcc[a.subtopic_id].total++
      if (a.is_correct) subtopicAcc[a.subtopic_id].correct++
    }
  }

  // 3. Update spaced-repetition review schedule for touched topics
  const touchedTopicIds = Object.keys(topicAcc)
  if (touchedTopicIds.length) {
    try {
      await updateReviewSchedule(db, studentId, topicAcc, touchedTopicIds)
    } catch (e) {
      console.warn('[studyPlanEngine] updateReviewSchedule failed:', e.message)
    }
  }

  // 4. Fetch all subtopics for this subject, with their topic's exam_frequency
  const { data: subtopics, error: subErr } = await db
    .from('subtopics')
    .select('id, exam_frequency, topic_id, topics!inner(subject_id, order_index)')
    .eq('topics.subject_id', subjectId)
    .order('exam_frequency', { ascending: false })

  if (subErr || !subtopics?.length) {
    console.warn(`[studyPlanEngine] no subtopics found for subject ${subjectId}:`, subErr?.message)
    return
  }

  // 5. Get topics due for spaced-repetition review
  let reviewTopicIds = new Set()
  try {
    const dueTopics = await getTopicsDueForReview(db, studentId, subjectId)
    reviewTopicIds  = new Set((dueTopics ?? []).map(t => t.topic_id))
  } catch (e) {
    console.warn('[studyPlanEngine] getTopicsDueForReview failed:', e.message)
  }

  // 6. Bucket and order subtopics
  const buckets = { weak: [], improving: [], review: [], mastered: [] }

  for (const s of subtopics) {
    const acc = subtopicAcc[s.id]

    // Not attempted yet → treat as weak
    if (!acc || acc.total === 0) {
      buckets.weak.push(s)
      continue
    }

    const pct = (acc.correct / acc.total) * 100

    if (acc.total >= MIN_ATTEMPTS && pct >= MASTERY_SCORE) {
      // Check if this topic is due for a spaced-repetition review
      if (reviewTopicIds.has(s.topic_id)) {
        buckets.review.push(s)
      } else {
        buckets.mastered.push(s)
      }
    } else if (pct >= 50) {
      buckets.improving.push(s)
    } else {
      buckets.weak.push(s)
    }
  }

  // Within each bucket, subtopics are already sorted by exam_frequency (from query).
  // Final order: WEAK → IMPROVING → REVIEW → MASTERED
  const ordered = [
    ...buckets.weak,
    ...buckets.improving,
    ...buckets.review,
    ...buckets.mastered,
  ]

  const orderedIds = ordered.map(s => s.id)
  if (!orderedIds.length) return

  // 7. Upsert student_learning_paths
  const { error: upsertErr } = await db
    .from('student_learning_paths')
    .upsert({
      student_id:           studentId,
      subject_id:           subjectId,
      ordered_subtopic_ids: orderedIds,
      last_calculated_at:   new Date().toISOString(),
    }, { onConflict: 'student_id,subject_id' })

  if (upsertErr) {
    console.error(`[studyPlanEngine] upsert error for subject ${subjectId}:`, upsertErr.message)
  }
}

// ── seedCoreTopicsForSubject ──────────────────────────────────────────────────
/**
 * Seed an initial learning path for a subject immediately after the diagnostic.
 *
 * Uses the student's diagnostic answers (via student_topic_mastery or
 * diagnostic_results) to place weak subtopics first. Falls back to pure
 * exam_frequency ordering when no weakness data is available.
 *
 * Safe to call multiple times — upserts on (student_id, subject_id).
 *
 * @param {object} db         - Supabase service role client
 * @param {string} studentId  - UUID
 * @param {string} subjectId  - UUID
 */
export async function seedCoreTopicsForSubject(db, studentId, subjectId) {
  if (!studentId || !subjectId) return

  // Fetch all subtopics for the subject ordered by exam_frequency
  const { data: subtopics, error: subErr } = await db
    .from('subtopics')
    .select('id, exam_frequency, topic_id, topics!inner(subject_id)')
    .eq('topics.subject_id', subjectId)
    .order('exam_frequency', { ascending: false })

  if (subErr || !subtopics?.length) {
    console.warn(`[studyPlanEngine] seedCoreTopics: no subtopics for subject ${subjectId}`)
    return
  }

  // Fetch existing diagnostic result to get weak_subtopic_ids if available
  const { data: diagResult } = await db
    .from('diagnostic_results')
    .select('weak_subtopic_ids')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .maybeSingle()

  const weakSet = new Set(diagResult?.weak_subtopic_ids ?? [])

  // Partition: weak first (preserving exam_frequency order within), then rest
  const weak  = subtopics.filter(s => weakSet.has(s.id))
  const other = subtopics.filter(s => !weakSet.has(s.id))
  const ordered = [...weak, ...other]

  const orderedIds = ordered.map(s => s.id)
  if (!orderedIds.length) return

  // Only seed if no learning path exists yet for this subject — don't overwrite
  // a plan that rebuildStudyPlan has already computed from real attempt data.
  const { data: existing } = await db
    .from('student_learning_paths')
    .select('last_calculated_at')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .maybeSingle()

  // If a path exists and was calculated after the student started attempting
  // questions (not just seeded), skip the seed — rebuildStudyPlan owns it now.
  if (existing?.last_calculated_at) {
    // Check if there are real attempts for this subject yet
    const { count } = await db
      .from('question_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)

    if (count > 0) {
      // Real data exists — let rebuildStudyPlan handle it
      return
    }
  }

  const { error: upsertErr } = await db
    .from('student_learning_paths')
    .upsert({
      student_id:           studentId,
      subject_id:           subjectId,
      ordered_subtopic_ids: orderedIds,
      last_calculated_at:   new Date().toISOString(),
    }, { onConflict: 'student_id,subject_id' })

  if (upsertErr) {
    console.error(`[studyPlanEngine] seedCoreTopics upsert error:`, upsertErr.message)
  }
}
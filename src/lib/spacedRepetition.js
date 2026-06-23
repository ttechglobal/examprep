// src/lib/spacedRepetition.js
// ─────────────────────────────────────────────────────────────────────────────
// SM-2-lite scheduling for ExamPrep.
//
// ALGORITHM:
//   After a practice session on a topic, compute next_review_at based on
//   the student's latest accuracy score for that topic.
//
//   score >= 85%  → review in 14 days  (solid, retention likely)
//   score >= 70%  → review in 7 days   (mastered threshold, reinforce)
//   score >= 50%  → review in 3 days   (improving but fragile)
//   score <  50%  → no review (topic stays as 'weak' in active plan)
//   first attempt → no review (not enough signal yet)
//
// RESET:
//   If a student's score DROPS from a previous session on a topic that was
//   previously scheduled for review, reset next_review_at to 3 days.
//   This handles the case where a student appeared to master something but
//   has clearly forgotten it.
//
// STUDY PLAN INTEGRATION:
//   rebuildStudyPlan calls updateReviewSchedule after computing accuracies.
//   Topics with next_review_at <= now() are injected into the plan as
//   source='review'. Active weak/improving topics are unaffected — review
//   items always land at the END of the plan, never displacing active gaps.
//
// DB:
//   Reads/writes student_topic_mastery.next_review_at (timestamptz, nullable).
//   Also reads student_topic_mastery.score (previous score, for reset logic).
// ─────────────────────────────────────────────────────────────────────────────

const INTERVALS = {
  STRONG:    14, // score >= 85% — 14 days
  MASTERED:   7, // score >= 70% — 7 days
  FRAGILE:    3, // score >= 50% — 3 days
  RESET:      3, // score dropped on a previously-reviewed topic
}

const SCORE_STRONG   = 85
const SCORE_MASTERED = 70
const SCORE_FRAGILE  = 50
const MIN_ATTEMPTS   = 3  // don't schedule review until student has real signal

/**
 * Compute the next review date for a topic given the current score.
 * Returns a Date object or null (null = don't schedule).
 *
 * @param {number}      currentScore   - current accuracy % (0–100)
 * @param {number}      attemptCount   - total attempts on this topic
 * @param {number|null} previousScore  - score from previous session (null if first)
 * @param {Date|null}   currentReview  - existing next_review_at (null if none)
 * @returns {Date|null}
 */
export function computeNextReview(currentScore, attemptCount, previousScore = null, currentReview = null) {
  // Not enough attempts yet — don't schedule
  if (attemptCount < MIN_ATTEMPTS) return null

  // Score too low — topic needs active work, not scheduled review
  if (currentScore < SCORE_FRAGILE) return null

  const now = new Date()

  // Determine interval
  let days
  if (currentScore >= SCORE_STRONG) {
    days = INTERVALS.STRONG
  } else if (currentScore >= SCORE_MASTERED) {
    days = INTERVALS.MASTERED
  } else {
    // score >= 50 (fragile)
    // If score DROPPED from last time and topic was previously scheduled,
    // use the reset interval (shorter = come back sooner)
    const dropped = previousScore !== null && currentScore < previousScore
    const wasScheduled = currentReview !== null
    days = (dropped && wasScheduled) ? INTERVALS.RESET : INTERVALS.FRAGILE
  }

  const next = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  return next
}

/**
 * After a practice session, update next_review_at for all topics touched.
 * Called from rebuildStudyPlan — no need to call separately.
 *
 * @param {object}   db         - Supabase service client
 * @param {string}   studentId  - UUID
 * @param {object}   accMap     - topicId → { total, correct } from question_attempts
 * @param {string[]} topicIds   - subset of topics to update (touched in this session)
 */
export async function updateReviewSchedule(db, studentId, accMap, topicIds) {
  if (!topicIds?.length) return

  // Fetch existing mastery rows for these topics
  const { data: existingRows } = await db
    .from('student_topic_mastery')
    .select('topic_id, score, next_review_at, attempts')
    .eq('student_id', studentId)
    .in('topic_id', topicIds)

  const masteryByTopic = {}
  ;(existingRows ?? []).forEach(r => { masteryByTopic[r.topic_id] = r })

  const updates = []

  for (const topicId of topicIds) {
    const acc = accMap[topicId]
    if (!acc || acc.total === 0) continue

    const currentScore  = Math.round((acc.correct / acc.total) * 100)
    const attemptCount  = acc.total
    const existing      = masteryByTopic[topicId]
    const previousScore = existing?.score ?? null
    const currentReview = existing?.next_review_at ? new Date(existing.next_review_at) : null

    const nextReview = computeNextReview(currentScore, attemptCount, previousScore, currentReview)

    // Determine status
    const status =
      currentScore >= 70 && attemptCount >= 3 ? 'mastered' :
      currentScore >= 50 ? 'improving' :
      'weak'

    updates.push({
      student_id:     studentId,
      topic_id:       topicId,
      score:          currentScore,
      status,
      attempts:       attemptCount,
      last_tested_at: new Date().toISOString(),
      next_review_at: nextReview ? nextReview.toISOString() : null,
    })
  }

  if (!updates.length) return

  await db
    .from('student_topic_mastery')
    .upsert(updates, { onConflict: 'student_id,topic_id' })
}

/**
 * Fetch topics due for review for a student, across all subjects.
 * Returns topicIds where next_review_at <= now().
 * Called by rebuildStudyPlan to inject review items.
 *
 * @param {object} db
 * @param {string} studentId
 * @param {string} subjectId  - filter to one subject
 * @returns {Array} array of { topic_id, score, next_review_at, last_tested_at }
 */
export async function getTopicsDueForReview(db, studentId, subjectId) {
  const now = new Date().toISOString()

  // Get all topic IDs for this subject so we can filter
  const { data: topicRows } = await db
    .from('topics')
    .select('id')
    .eq('subject_id', subjectId)

  if (!topicRows?.length) return []

  const subjectTopicIds = topicRows.map(t => t.id)

  const { data: dueRows } = await db
    .from('student_topic_mastery')
    .select('topic_id, score, next_review_at, last_tested_at, status')
    .eq('student_id', studentId)
    .in('topic_id', subjectTopicIds)
    .lte('next_review_at', now)
    .not('next_review_at', 'is', null)

  return dueRows ?? []
}

/**
 * Human-readable label for how overdue a review is.
 * Used by the UI to show "8 days since last practice".
 *
 * @param {string} lastTestedAt - ISO string
 * @returns {string}
 */
export function daysSinceLabel(lastTestedAt) {
  if (!lastTestedAt) return null
  const days = Math.floor((Date.now() - new Date(lastTestedAt).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Practiced today'
  if (days === 1) return 'Last practiced yesterday'
  return `Last practiced ${days} days ago`
}
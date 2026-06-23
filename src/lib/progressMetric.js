// src/lib/progressMetric.js
// ─────────────────────────────────────────────────────────────────────────────
// Cross-activity progress metric.
//
// THE IDEA: show genuine knowledge growth, not points. "You knew 20% of
// Isotopes two weeks ago — now you're at 65%." Pulled from EVERY activity
// type: practice questions, theory self-ratings, games, and lesson videos
// watched. The unit is always a topic (or subject, when aggregated).
//
// HOW EACH ACTIVITY CONTRIBUTES A "KNOWLEDGE SIGNAL" (0-100 per attempt):
//
//   Practice question   → 100 if correct, 0 if wrong (question_attempts)
//   Theory self-rating  → nailed_it=100, close=60, missed_it=20 (theory_attempts)
//   Game play            → game's own score field, 0-100 (game_plays)
//   Video lesson watched → completion alone = 50 (exposure, not mastery —
//                           capped lower since watching ≠ understanding;
//                           only counts until the student has a real score
//                           signal from practice/theory/games on that topic)
//
// ALL signals for a topic, in a time window, are averaged (most recent
// signals weighted slightly higher) to produce a single "knowledge score"
// for that topic at that point in time. Comparing two windows = the delta
// you show the student.
//
// This file is pure computation — no DB writes. Callers fetch raw rows
// and pass them in. Keeps it testable and keeps DB access in API routes.
// ─────────────────────────────────────────────────────────────────────────────

const SELF_RATING_SCORE = {
  nailed_it: 100,
  close:     60,
  missed_it: 20,
}

// Video exposure score — deliberately capped lower than a real performance
// signal. Watching a lesson is NOT the same as knowing the material; this
// number reflects that honestly rather than treating a view as mastery.
const VIDEO_EXPOSURE_SCORE = 50

/**
 * Convert a raw activity row into a { topicId, score, timestamp, weight } signal.
 * weight: how much this signal type counts relative to others when averaging.
 * Practice and theory are the strongest signals (1.0), games are supporting (0.7),
 * video exposure is the weakest (0.4) since watching isn't the same as knowing.
 */
function normaliseSignal(row, type) {
  switch (type) {
    case 'practice':
      return {
        topicId:   row.topic_id,
        score:     row.is_correct ? 100 : 0,
        timestamp: row.created_at,
        weight:    1.0,
      }
    case 'theory':
      return {
        topicId:   row.topic_id,
        score:     SELF_RATING_SCORE[row.self_rating] ?? 50,
        timestamp: row.created_at,
        weight:    1.0,
      }
    case 'game':
      return {
        topicId:   row.topic_id,
        score:     row.score ?? 50,
        timestamp: row.completed_at,
        weight:    0.7,
      }
    case 'video':
      // row.topic_id is resolved by the caller from subtopic_id → topic_id
      // before this function runs, since lesson_views is keyed by subtopic.
      return {
        topicId:   row.topic_id,
        score:     VIDEO_EXPOSURE_SCORE,
        timestamp: row.completed_at ?? row.created_at,
        weight:    0.4,
      }
    default:
      return null
  }
}

/**
 * Compute a weighted-average knowledge score (0-100) for a set of signals,
 * all assumed to belong to the same topic.
 * Recency weighting: signals in the most recent half of the window count
 * 1.3x — reflects that recent performance is more representative of current
 * knowledge than performance from weeks ago.
 */
function weightedAverage(signals) {
  if (!signals.length) return null

  const timestamps = signals.map(s => new Date(s.timestamp).getTime())
  const minT = Math.min(...timestamps)
  const maxT = Math.max(...timestamps)
  const midT = (minT + maxT) / 2

  let totalWeight = 0
  let totalScore  = 0

  for (const s of signals) {
    const t = new Date(s.timestamp).getTime()
    const recencyMultiplier = t >= midT ? 1.3 : 1.0
    const w = s.weight * recencyMultiplier
    totalWeight += w
    totalScore  += s.score * w
  }

  return Math.round(totalScore / totalWeight)
}

/**
 * Main entry point. Given raw activity rows (already fetched from DB) for
 * a date range, compute knowledge score per topic.
 *
 * @param {object} rawRows
 *   { practice: [...], theory: [...], games: [...], videos: [...] }
 *   videos rows must already have topic_id resolved (see
 *   fetchActivityWindow in progress_metric_api.js for the subtopic→topic
 *   resolution step).
 * @returns {object} topicId -> { score, signalCount }
 */
export function computeTopicKnowledgeScores(rawRows) {
  const byTopic = {} // topicId -> signal[]

  const allSignals = [
    ...(rawRows.practice ?? []).map(r => normaliseSignal(r, 'practice')),
    ...(rawRows.theory   ?? []).map(r => normaliseSignal(r, 'theory')),
    ...(rawRows.games    ?? []).map(r => normaliseSignal(r, 'game')),
    ...(rawRows.videos   ?? []).map(r => normaliseSignal(r, 'video')),
  ].filter(Boolean).filter(s => s.topicId)

  for (const signal of allSignals) {
    if (!byTopic[signal.topicId]) byTopic[signal.topicId] = []
    byTopic[signal.topicId].push(signal)
  }

  const result = {}
  for (const [topicId, signals] of Object.entries(byTopic)) {
    result[topicId] = {
      score:       weightedAverage(signals),
      signalCount: signals.length,
    }
  }
  return result
}

/**
 * Compare two time windows (e.g. "this week" vs "2 weeks ago", or
 * "diagnostic" vs "now") and produce student-facing deltas.
 *
 * @param {object} beforeScores  topicId -> { score, signalCount } (earlier window)
 * @param {object} afterScores   topicId -> { score, signalCount } (current window)
 * @param {object} topicNames    topicId -> name (for display)
 * @returns {Array} sorted by improvement descending, only topics with real signal in BOTH windows
 */
export function computeProgressDeltas(beforeScores, afterScores, topicNames = {}) {
  const deltas = []

  for (const [topicId, after] of Object.entries(afterScores)) {
    const before = beforeScores[topicId]
    // Only show a delta if we have a real "before" signal — otherwise it's
    // not a fair comparison (e.g. brand new topic this week)
    if (!before || before.signalCount === 0) continue

    deltas.push({
      topicId,
      topicName:   topicNames[topicId] ?? 'Unknown topic',
      beforeScore: before.score,
      afterScore:  after.score,
      delta:       after.score - before.score,
    })
  }

  return deltas.sort((a, b) => b.delta - a.delta)
}

/**
 * Build the single best "headline" progress message for a student —
 * picks the topic with the strongest positive delta, or falls back to
 * an encouraging message if no topic shows enough signal yet.
 *
 * This is the actual sentence shown on the dashboard / study plan.
 */
export function buildProgressHeadline(deltas) {
  if (!deltas.length) {
    return {
      type:    'no_signal',
      message: "Keep practising this week — once you've done a few sessions, we'll show you exactly how much you've improved.",
    }
  }

  const best = deltas[0]

  if (best.delta >= 15) {
    return {
      type:    'strong_improvement',
      topicId: best.topicId,
      message: `You've improved ${best.delta}% in ${best.topicName} — from ${best.beforeScore}% to ${best.afterScore}%. That's real progress.`,
    }
  }

  if (best.delta > 0) {
    return {
      type:    'mild_improvement',
      topicId: best.topicId,
      message: `You're up ${best.delta}% in ${best.topicName} this week. Keep going — it adds up.`,
    }
  }

  if (best.delta === 0) {
    return {
      type:    'steady',
      message: "You're holding steady this week. Try a topic you haven't touched in a while for a fresh win.",
    }
  }

  // Best delta is negative — every topic dropped. Be honest but constructive.
  return {
    type:    'needs_attention',
    topicId: best.topicId,
    message: `${best.topicName} dipped a little this week (${Math.abs(best.delta)}%) — completely normal. A short session will bring it back.`,
  }
}

/**
 * "Among top X% of learners this week" — computed from a cohort's delta
 * distribution. Caller fetches all students' deltas for the relevant cohort
 * (school or platform-wide) and passes the student's own best delta plus
 * the full distribution.
 *
 * @param {number} studentBestDelta
 * @param {number[]} allDeltas  - every other student's best delta this week
 * @returns {string|null}
 */
export function computePercentileMessage(studentBestDelta, allDeltas) {
  if (!allDeltas.length || studentBestDelta <= 0) return null

  const better = allDeltas.filter(d => d <= studentBestDelta).length
  const percentile = Math.round((better / allDeltas.length) * 100)

  if (percentile >= 90) return `You're in the top 10% of learners this week 🔥`
  if (percentile >= 75) return `You're in the top 25% of learners this week`
  if (percentile >= 50) return `You're improving faster than half of all learners this week`
  return null // don't show a discouraging percentile
}
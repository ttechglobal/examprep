// src/lib/localMastery.js
// ─────────────────────────────────────────────────────────────────────────────
// Local-first performance tracking. Works for guests and authenticated users.
//
// What this stores:
//   Per exam → per subject → per topic: a list of recent attempt results with
//   dates. This is the raw material for computing performance insight over any
//   time window — no pre-computed scores that go stale.
//
// Storage key: ep_local_mastery (localStorage)
//
// Shape:
//   {
//     WAEC: {
//       "subject_uuid": {
//         name: "Physics",
//         topics: {
//           "topic_uuid": {
//             name: "Wave Motion",
//             attempts: [
//               { c: true,  d: "2026-08-29" },   // c = is_correct, d = date
//               { c: false, d: "2026-08-27" },
//             ]
//             // capped at MAX_ATTEMPTS_PER_TOPIC, oldest trimmed first
//           }
//         }
//       }
//     },
//     JAMB: { ... }
//   }
//
// Usage:
//   import { updateLocalMastery, getPerformanceInsight, getSubjectTrend } from '@/lib/localMastery'
//
//   // After every session (called from saveSessionLocally):
//   updateLocalMastery(exam, results, subjectName)
//
//   // For progress page — topic breakdown for a time window:
//   getPerformanceInsight(exam, subjectId, periodDays)
//
//   // For subject trend line (weekly scores):
//   getSubjectTrend(exam, subjectId)
//
//   // For merging server data on login:
//   mergeServerAttempts(serverAttempts)
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY           = 'ep_local_mastery'
const MAX_ATTEMPTS_PER_TOPIC = 50   // enough for rolling window + trend without bloating storage
const MIN_ATTEMPTS_TO_SCORE  = 5    // fewer than this → "not enough data"

// ── Storage helpers ───────────────────────────────────────────────────────────

function read() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch { return {} }
}

function write(data) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

// Returns 'YYYY-MM-DD' in the device's local timezone — never UTC.
// toISOString() is UTC and causes wrong-day bugs for evening sessions.
function localDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Record results from a completed session into local mastery.
 * Called from saveSessionLocally — synchronous, never throws.
 *
 * @param {string} exam         - 'WAEC' | 'JAMB'
 * @param {Array}  results      - [{ topic_id, subject_id, is_correct, topic_name?, subject_name? }]
 * @param {string} subjectName  - display name of the subject (from payload.subject_name)
 */
export function updateLocalMastery(exam, results, subjectName) {
  if (!exam || !results?.length) return
  try {
    const data  = read()
    const today = localDateStr()

    if (!data[exam]) data[exam] = {}

    for (const r of results) {
      const subjectId = r.subject_id
      const topicId   = r.topic_id
      if (!subjectId || !topicId) continue

      // Ensure subject bucket exists
      if (!data[exam][subjectId]) {
        data[exam][subjectId] = { name: subjectName || '', topics: {} }
      }
      // Keep subject name updated in case it was blank before
      if (subjectName && !data[exam][subjectId].name) {
        data[exam][subjectId].name = subjectName
      }

      // Ensure topic bucket exists
      if (!data[exam][subjectId].topics[topicId]) {
        data[exam][subjectId].topics[topicId] = {
          name:     r.topic_name || '',
          attempts: [],
        }
      }

      const topic = data[exam][subjectId].topics[topicId]

      // Keep topic name updated
      if (r.topic_name && !topic.name) topic.name = r.topic_name

      // Prepend newest attempt (compact shape: c = correct, d = date)
      topic.attempts.unshift({ c: r.is_correct ? 1 : 0, d: today })

      // Trim to cap — oldest fall off the end
      if (topic.attempts.length > MAX_ATTEMPTS_PER_TOPIC) {
        topic.attempts = topic.attempts.slice(0, MAX_ATTEMPTS_PER_TOPIC)
      }
    }

    write(data)
  } catch (err) {
    console.warn('[localMastery] updateLocalMastery failed:', err.message)
  }
}

// ── Read helpers ──────────────────────────────────────────────────────────────

/**
 * Filter attempts to those within the last `days` calendar days.
 * days = 0 means no filter (all time).
 */
function filterByDays(attempts, days) {
  if (!days) return attempts
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = localDateStr(cutoff)
  return attempts.filter(a => a.d >= cutoffStr)
}

/**
 * Compute a score and enough_data flag from a filtered attempts list.
 * Returns null score when below the minimum threshold.
 */
function computeScore(filtered) {
  const total   = filtered.length
  const correct = filtered.filter(a => a.c).length
  if (total < MIN_ATTEMPTS_TO_SCORE) {
    return { score: null, correct, total, enough_data: false, attempts_needed: MIN_ATTEMPTS_TO_SCORE - total }
  }
  return { score: Math.round((correct / total) * 100), correct, total, enough_data: true, attempts_needed: 0 }
}

// ── Performance insight (topic breakdown for a period) ────────────────────────

/**
 * Returns topic-level performance for a subject over a time window.
 * Used by the student progress page topic breakdown.
 *
 * @param {string} exam       - 'WAEC' | 'JAMB'
 * @param {string} subjectId
 * @param {number} periodDays - 7 | 14 | 30 | 90 | 0 (all time)
 *
 * @returns {{
 *   subject_name:   string,
 *   period_days:    number,
 *   weeks_of_data:  number,
 *   total_attempts: number,
 *   subject_score:  number | null,
 *   topics:         Array<{
 *     topic_id, topic_name, correct, total, score, enough_data, attempts_needed
 *   }>
 * }}
 */
export function getPerformanceInsight(exam, subjectId, periodDays = 30) {
  try {
    const data    = read()
    const subject = data[exam]?.[subjectId]

    if (!subject) {
      return {
        subject_name: '', period_days: periodDays, weeks_of_data: 0,
        total_attempts: 0, subject_score: null, topics: [],
      }
    }

    const topics = []
    let   grandTotal   = 0
    let   grandCorrect = 0
    let   earliestDate = null

    for (const [topicId, topic] of Object.entries(subject.topics)) {
      const filtered = filterByDays(topic.attempts, periodDays)
      if (!filtered.length) continue

      const { score, correct, total, enough_data, attempts_needed } = computeScore(filtered)
      grandTotal   += total
      grandCorrect += correct

      // Track earliest attempt date for weeks_of_data
      const oldest = filtered[filtered.length - 1]?.d
      if (oldest && (!earliestDate || oldest < earliestDate)) earliestDate = oldest

      topics.push({ topic_id: topicId, topic_name: topic.name, correct, total, score, enough_data, attempts_needed })
    }

    // Sort: enough_data first, then by score ascending (weakest first), then no-data at bottom
    topics.sort((a, b) => {
      if (a.enough_data && !b.enough_data) return -1
      if (!a.enough_data && b.enough_data) return  1
      if (a.enough_data && b.enough_data) return (a.score ?? 0) - (b.score ?? 0)
      return b.total - a.total   // among no-data: most attempts first
    })

    // Subject score = average of scored topics
    const scoredTopics = topics.filter(t => t.enough_data)
    const subjectScore = scoredTopics.length
      ? Math.round(scoredTopics.reduce((s, t) => s + t.score, 0) / scoredTopics.length)
      : null

    // Weeks of data
    let weeksOfData = 0
    if (earliestDate) {
      const diffMs   = Date.now() - new Date(earliestDate).getTime()
      weeksOfData    = Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)))
    }

    return {
      subject_name:   subject.name,
      period_days:    periodDays,
      weeks_of_data:  weeksOfData,
      total_attempts: grandTotal,
      subject_score:  subjectScore,
      topics,
    }
  } catch (err) {
    console.warn('[localMastery] getPerformanceInsight failed:', err.message)
    return { subject_name: '', period_days: periodDays, weeks_of_data: 0, total_attempts: 0, subject_score: null, topics: [] }
  }
}

// ── Subject trend (weekly scores for the trend line) ─────────────────────────

/**
 * Returns weekly accuracy scores for a subject, newest first.
 * Used for the subject trend sparkline on the progress page.
 *
 * Each week is Mon–Sun. Weeks with zero attempts are omitted (gap in line).
 *
 * @param {string} exam
 * @param {string} subjectId
 * @param {number} maxWeeks  - how many weeks back to look (default 12)
 *
 * @returns {Array<{ week: string, score: number, attempts: number }>}
 *   week = Monday date string 'YYYY-MM-DD', score = 0–100, oldest first
 */
export function getSubjectTrend(exam, subjectId, maxWeeks = 12) {
  try {
    const data    = read()
    const subject = data[exam]?.[subjectId]
    if (!subject) return []

    // Build a map of date → { correct, total } across all topics
    const dailyMap = {}

    for (const topic of Object.values(subject.topics)) {
      for (const a of topic.attempts) {
        if (!dailyMap[a.d]) dailyMap[a.d] = { correct: 0, total: 0 }
        dailyMap[a.d].total++
        if (a.c) dailyMap[a.d].correct++
      }
    }

    // Find the Monday of a given date
    function mondayOf(dateStr) {
      const d   = new Date(dateStr)
      const dow = d.getDay()                      // 0 = Sun
      d.setDate(d.getDate() - ((dow + 6) % 7))   // back to Monday
      return localDateStr(d)
    }

    // Roll up daily → weekly
    const weekMap = {}
    for (const [date, counts] of Object.entries(dailyMap)) {
      const mon = mondayOf(date)
      if (!weekMap[mon]) weekMap[mon] = { correct: 0, total: 0 }
      weekMap[mon].correct += counts.correct
      weekMap[mon].total   += counts.total
    }

    // Cutoff: maxWeeks ago
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - maxWeeks * 7)
    const cutoffStr = localDateStr(cutoff)

    // Build sorted result, filter to cutoff, skip empty weeks
    const weeks = Object.entries(weekMap)
      .filter(([mon]) => mon >= cutoffStr)
      .map(([mon, { correct, total }]) => ({
        week:     mon,
        score:    total > 0 ? Math.round((correct / total) * 100) : 0,
        attempts: total,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))  // oldest first

    return weeks
  } catch (err) {
    console.warn('[localMastery] getSubjectTrend failed:', err.message)
    return []
  }
}

// ── Subject list (for the progress page overview) ─────────────────────────────

/**
 * Returns all subjects with data for a given exam.
 * Used to render the subject picker and overview cards.
 *
 * @param {string} exam
 * @returns {Array<{ subject_id, subject_name, total_attempts, scored_topics, subject_score }>}
 */
export function getSubjectOverview(exam) {
  try {
    const data = read()
    const examData = data[exam]
    if (!examData) return []

    return Object.entries(examData).map(([subjectId, subject]) => {
      let total = 0, scoredTopics = 0, scoreSum = 0

      for (const topic of Object.values(subject.topics)) {
        total += topic.attempts.length
        const { score, enough_data } = computeScore(topic.attempts)
        if (enough_data) { scoredTopics++; scoreSum += score }
      }

      return {
        subject_id:    subjectId,
        subject_name:  subject.name,
        total_attempts: total,
        scored_topics:  scoredTopics,
        subject_score:  scoredTopics > 0 ? Math.round(scoreSum / scoredTopics) : null,
      }
    }).filter(s => s.total_attempts > 0)
      .sort((a, b) => (a.subject_score ?? -1) - (b.subject_score ?? -1))  // weakest first
  } catch (err) {
    console.warn('[localMastery] getSubjectOverview failed:', err.message)
    return []
  }
}

// ── Merge server data on login ────────────────────────────────────────────────

/**
 * Merge server-side question_attempts rows into local mastery.
 * Called once after login — fills in history from before the device was used,
 * or from other devices. Skips dates already present to avoid double-counting.
 *
 * @param {Array} serverAttempts - [{ exam_type, subject_id, subject_name, topic_id, topic_name, is_correct, created_at }]
 */
export function mergeServerAttempts(serverAttempts) {
  if (!serverAttempts?.length) return
  try {
    const data = read()

    for (const a of serverAttempts) {
      const exam      = a.exam_type
      const subjectId = a.subject_id
      const topicId   = a.topic_id
      if (!exam || !subjectId || !topicId) continue

      const dateStr = a.created_at?.slice(0, 10)
      if (!dateStr) continue

      if (!data[exam])               data[exam] = {}
      if (!data[exam][subjectId])    data[exam][subjectId] = { name: a.subject_name || '', topics: {} }
      if (!data[exam][subjectId].topics[topicId]) {
        data[exam][subjectId].topics[topicId] = { name: a.topic_name || '', attempts: [] }
      }

      const topic = data[exam][subjectId].topics[topicId]

      // Only add if this date isn't already represented (rough dedup)
      // A perfect dedup would need question_id, but date-level is sufficient for trend accuracy
      const alreadyHasDate = topic.attempts.some(ex => ex.d === dateStr)
      if (!alreadyHasDate) {
        topic.attempts.push({ c: a.is_correct ? 1 : 0, d: dateStr })
      }

      // Re-sort newest first and trim
      topic.attempts.sort((x, y) => y.d.localeCompare(x.d))
      if (topic.attempts.length > MAX_ATTEMPTS_PER_TOPIC) {
        topic.attempts = topic.attempts.slice(0, MAX_ATTEMPTS_PER_TOPIC)
      }
    }

    write(data)
  } catch (err) {
    console.warn('[localMastery] mergeServerAttempts failed:', err.message)
  }
}

// ── Clear (on sign-out or subject change) ─────────────────────────────────────

/**
 * Clear local mastery data. Call when a student changes their exam/subjects,
 * NOT on sign-out (we want to preserve guest data across sign-out).
 */
export function clearLocalMastery() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

/**
 * Export raw local mastery data — used for debugging or backup.
 */
export function exportLocalMastery() {
  return read()
}
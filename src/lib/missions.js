// src/lib/missions.js
// ─────────────────────────────────────────────────────────────────────────────
// Weekly battle missions: the rules, in one place. Pure functions, no I/O.
//
// A mission is "answer N questions on <topic> in battles this week". Topics are
// the ones that appear most across past papers (lib/server/topicFrequency.js),
// only from the subjects the student registered. Weeks run Monday to Sunday.
//
// Always 3 missions a week, however many subjects a student has: a student with
// nine subjects gets three of them this week and others the next, so over a
// month every subject comes round (the subject done longest ago goes first).
// ─────────────────────────────────────────────────────────────────────────────

export const MISSION_XP        = 50   // paid once per finished mission
export const MISSIONS_PER_WEEK = 3
export const MISSION_POOL_SIZE = 8    // a subject's top-ranked topics that missions draw from
export const MIN_TOPIC_QUESTIONS = 15 // fewer playable questions than this and a topic is skipped
export const RECENT_WEEKS      = 4    // a topic isn't repeated for this many weeks
export const HISTORY_WEEKS     = 12   // how far back subject rotation looks

// Questions to answer, by the player's battle rank tier (lib/ranks.js).
// Rookie and Skilled 10, Advanced and Elite 15, Champion and above 20.
export function missionTarget(rank) {
  if (rank >= 41) return 20
  if (rank >= 21) return 15
  return 10
}

// How many missions this student gets this week. Fixed at 3 for now; the place
// to raise it to 4 or 5 later, by rank or by how steadily they finish.
export function missionCountFor() {
  return MISSIONS_PER_WEEK
}

// The topics a subject's missions may use: playable (enough questions in the bank),
// the most-examined first. Topics that appear in past papers come first, in rank
// order; if past-paper tagging is thin, the best-stocked remaining topics fill the
// pool, so a subject never ends up with no missions just because its past papers
// aren't all imported yet.
export function eligibleTopics(topics) {
  const playable = (topics ?? []).filter(t => t.bank_count >= MIN_TOPIC_QUESTIONS)
  const examined = playable.filter(t => t.past_count > 0)
    .sort((a, b) => a.rank - b.rank || b.past_count - a.past_count)
  const rest = playable.filter(t => !(t.past_count > 0))
    .sort((a, b) => b.bank_count - a.bank_count)
  return [...examined, ...rest].slice(0, MISSION_POOL_SIZE)
}

function shuffled(list, random) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * @param {Array<{ subject: {id,name}, exam: string, topics: Array }>} pools
 *        one per registered subject; topics from getTopicFrequency
 * @param {object} opts
 *        count       missions to make
 *        recent      Set of topic ids done recently (skipped unless nothing else is left)
 *        subjectLast Map of subject id → the latest week_start (YYYY-MM-DD) it had a mission
 * @returns {Array<{ subject, exam, topic }>}
 *
 * Subjects take turns: the one that went longest without a mission goes first
 * (never-used ones before all), ties broken at random. One topic per subject
 * per round, so three missions are three different subjects whenever the
 * student has three. With fewer subjects than missions, a subject is used again
 * with another topic.
 */
export function pickMissions(pools, { count = MISSIONS_PER_WEEK, recent = new Set(), subjectLast = new Map(), random = Math.random } = {}) {
  const queues = shuffled(pools, random)
    .map(p => {
      const eligible = eligibleTopics(p.topics)
      return {
        ...p,
        last: subjectLast.get(p.subject.id) ?? '',   // '' sorts before any date
        queue: [
          ...shuffled(eligible.filter(t => !recent.has(t.topic_id)), random),
          ...shuffled(eligible.filter(t => recent.has(t.topic_id)), random),
        ],
      }
    })
    .filter(p => p.queue.length)
    .sort((a, b) => (a.last < b.last ? -1 : a.last > b.last ? 1 : 0))   // stable: keeps the shuffle for ties

  const picked = []
  while (picked.length < count && queues.some(p => p.queue.length)) {
    for (const p of queues) {
      if (picked.length >= count) break
      const topic = p.queue.shift()
      if (topic) picked.push({ subject: p.subject, exam: p.exam, topic })
    }
  }
  return picked
}

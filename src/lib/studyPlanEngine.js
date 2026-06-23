// src/lib/studyPlanEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// The single source of truth for building/updating a student's study plan.
//
// Called by:
//   - /api/diagnostic/save  (after diagnostic completes)
//   - /api/student/practice/save  (after every practice session)
//
// What it does per subject:
//   1. Loads core topics for the subject (if any)
//   2. Loads the student's accuracy per topic from question_attempts
//   3. Loads all prerequisite edges for topics in the subject
//   4. Determines which topics belong in the plan and at what status
//   5. Injects prerequisite topics above weak topics where needed
//   6. SR-1: updates spaced-repetition review schedule for attempted topics
//   7. SR-2: injects topics due for review (source='review'), appended AFTER
//      all active plan items — review never displaces a weak/improving gap
//   8. Upserts into student_study_plan_items (one row per student × topic)
//   9. Removes mastered topics (accuracy ≥ 70%, ≥ 3 attempts) from the plan
//
// Thresholds:
//   MASTERY     : accuracy >= 70% AND attempts >= 3  → remove from plan
//   IMPROVING   : accuracy >= 50% (but not mastered)
//   WEAK        : accuracy < 50%
//   UNTESTED    : 0 attempts (only included if seeded by core topics)
//   REVIEW      : previously mastered/improving topic whose spaced-repetition
//                 next_review_at has arrived — see spacedRepetition.js
// ─────────────────────────────────────────────────────────────────────────────

import { updateReviewSchedule, getTopicsDueForReview } from '@/lib/spacedRepetition'

const MASTERY_PCT       = 70
const MASTERY_MIN_TRIES = 3
const IMPROVING_PCT     = 50

// ── Coaching-voice insight message generator ──────────────────────────────────
// Replaces flat status labels with second-person, specific, forward-looking
// language. Multiple variants per status, rotated by attemptCount so the same
// student doesn't see the identical line every session.
function insightMessage(status, prereqForTopicName = null, accuracyPct = null, attemptCount = 0) {
  // ── Prerequisite injection ──────────────────────────────────────────────
  if (prereqForTopicName) {
    return `You'll need this before ${prereqForTopicName} — it builds directly on it`
  }

  switch (status) {
    case 'weak': {
      const pctText = accuracyPct !== null ? `${accuracyPct}%` : null
      const variants = pctText ? [
        `You're getting ${pctText} here — the concept isn't clicking yet, but that's fixable. One focused session will shift this.`,
        `${pctText} accuracy tells me there's a gap in the foundation. Let's close it — it won't take long.`,
        `This is your biggest opportunity right now. You're at ${pctText} — a few targeted attempts and you'll be past it.`,
      ] : [
        `This is where you're losing marks. One focused session here is worth more than three on topics you already know.`,
        `This topic is costing you points. Let's fix it — it's the highest-leverage thing you can do right now.`,
        `You're dropping marks here. The fix is targeted practice, not more time — let's be efficient.`,
      ]
      return variants[attemptCount % variants.length]
    }

    case 'improving': {
      const pctText = accuracyPct !== null ? `${accuracyPct}%` : null
      const variants = pctText ? [
        `You're at ${pctText} — you understand the basics. Push past 70% and this topic is done.`,
        `${pctText} and climbing. You're close — one more session should get you over the line.`,
        `Good progress — ${pctText} means the concept is landing. Keep the momentum, you're almost there.`,
      ] : [
        `You're improving here — keep going. You're in the zone where one good session makes a real difference.`,
        `You're on the right track. Don't stop now — you're close to having this topic locked down.`,
        `Progress is showing. A bit more practice and you can tick this one off completely.`,
      ]
      return variants[attemptCount % variants.length]
    }

    case 'untested': {
      const variants = [
        `You haven't touched this yet. It's a key exam topic — starting it today puts you ahead.`,
        `This one is fresh ground. Starting now means you'll have more time to revisit it before your exam.`,
        `Untested means opportunity. Get a baseline on this topic so you know exactly where you stand.`,
      ]
      return variants[attemptCount % variants.length]
    }

    default:
      return `Keep going — you're making real progress`
  }
}

// ── Review (spaced repetition) insight message ────────────────────────────────
function reviewInsightMessage(lastTestedAt) {
  if (!lastTestedAt) return "Time to revisit this — let's see if it's still solid"
  const days = Math.floor((Date.now() - new Date(lastTestedAt).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 1) return "You practiced this recently — a quick review keeps it sharp"
  if (days <= 7) return `It's been ${days} days since you practiced this — time for a quick check`
  if (days <= 14) return `${days} days since you last touched this — let's make sure it's still there`
  return `It's been ${days} days. Memory fades — a short session now saves you later`
}

// ── Coach summary — the headline sentence at the top of the study plan page ──
// Pure function, no DB calls. Called client-side or server-side with the
// array of plan items for the active subject.
//
// Usage:
//   import { buildCoachSummary } from '@/lib/studyPlanEngine'
//   const summary = buildCoachSummary(activeItems, subjectName)
export function buildCoachSummary(items, subjectName = null) {
  if (!items || items.length === 0) return null

  const weak      = items.filter(i => i.status === 'weak')
  const improving = items.filter(i => i.status === 'improving')
  const untested  = items.filter(i => i.status === 'untested')
  const total     = items.length

  const subj = subjectName ? ` in ${subjectName}` : ''

  if (weak.length >= 3) {
    return `You have ${weak.length} topics${subj} where you're dropping marks. Start with the first one — each session moves the needle.`
  }
  if (weak.length === 2) {
    return `Two topics${subj} need real attention right now. Fix these and your score moves significantly.`
  }
  if (weak.length === 1) {
    const topicName = weak[0].topicName
    return `"${topicName}" is your clearest gap right now${subj}. One focused session here is your best move.`
  }
  if (improving.length >= 2) {
    return `You're making progress${subj}. ${improving.length} topics are close to done — push them over the line.`
  }
  if (improving.length === 1) {
    const topicName = improving[0].topicName
    return `"${topicName}" is almost there${subj}. A bit more practice and you can tick it off.`
  }
  if (untested.length > 0) {
    return `${untested.length} topic${untested.length !== 1 ? 's' : ''}${subj} still need${untested.length === 1 ? 's' : ''} a first look. Get a baseline so you know exactly where you stand.`
  }
  if (total > 0) {
    return `You're in good shape${subj}. Keep the practice up and these remaining topics will fall into place.`
  }
  return null
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Rebuilds study plan items for one or more subjects for a student.
 *
 * @param {object} db          - Supabase service-role client
 * @param {string} studentId   - UUID of the student
 * @param {string[]} subjectIds - Array of subject UUIDs to rebuild
 */
export async function rebuildStudyPlan(db, studentId, subjectIds) {
  if (!subjectIds?.length) return

  for (const subjectId of subjectIds) {
    await rebuildSubjectPlan(db, studentId, subjectId)
  }
}

async function rebuildSubjectPlan(db, studentId, subjectId) {
  // ── 1. Load all topics for this subject ──────────────────────────────────
  const { data: allTopics } = await db
    .from('topics')
    .select('id, name, slug, order_index')
    .eq('subject_id', subjectId)
    .order('order_index', { ascending: true })

  if (!allTopics?.length) return

  const topicIds = allTopics.map(t => t.id)
  const topicMap = {}
  allTopics.forEach(t => { topicMap[t.id] = t })

  // ── 2. Load core topics for this subject ─────────────────────────────────
  const { data: coreRows } = await db
    .from('core_topics')
    .select('topic_id, priority')
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  const coreTopicIds = new Set((coreRows ?? []).map(r => r.topic_id))
  const coreHasPriority = {} // topicId → priority number
  ;(coreRows ?? []).forEach(r => { coreHasPriority[r.topic_id] = r.priority })

  // ── 3. Load student's accuracy per topic ─────────────────────────────────
  const { data: attempts } = await db
    .from('question_attempts')
    .select('topic_id, is_correct')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .not('topic_id', 'is', null)

  const accMap = {} // topicId → { total, correct }
  ;(attempts ?? []).forEach(a => {
    if (!accMap[a.topic_id]) accMap[a.topic_id] = { total: 0, correct: 0 }
    accMap[a.topic_id].total++
    if (a.is_correct) accMap[a.topic_id].correct++
  })

  const attemptedTopicIds = new Set(Object.keys(accMap))

  // ── 4. Load prerequisite edges for this subject's topics ─────────────────
  // topic_prerequisites: topic_id REQUIRES requires_topic_id
  const { data: prereqEdges } = await db
    .from('topic_prerequisites')
    .select('topic_id, requires_topic_id')
    .in('topic_id', topicIds)

  // Build: topicId → [prerequisiteTopicId, ...]
  const prereqMap = {} // for a dependent topic, what does it require?
  ;(prereqEdges ?? []).forEach(e => {
    if (!prereqMap[e.topic_id]) prereqMap[e.topic_id] = []
    prereqMap[e.topic_id].push(e.requires_topic_id)
  })

  // ── 5. Determine which topics belong in the plan ─────────────────────────
  //
  // A topic is included if:
  //   A) It is a core topic AND the student hasn't mastered it yet
  //   B) The student has attempted it AND hasn't mastered it
  //
  // A topic is excluded if:
  //   - It is mastered (accuracy >= 70%, attempts >= 3)
  //   - It has never been attempted AND is not a core topic

  const planTopics = [] // { topicId, status, source, accuracyPct, attemptCount }

  for (const topic of allTopics) {
    const acc = accMap[topic.id]
    const total = acc?.total ?? 0
    const correct = acc?.correct ?? 0
    const pct = total > 0 ? Math.round((correct / total) * 100) : null

    // Check mastery
    if (total >= MASTERY_MIN_TRIES && pct >= MASTERY_PCT) {
      // Mastered — ensure it's removed from the plan (handled in upsert step)
      continue
    }

    const isCore = coreTopicIds.has(topic.id)
    const hasAttempts = attemptedTopicIds.has(topic.id)

    if (!isCore && !hasAttempts) continue // not seeded, not attempted → skip

    let status
    if (total === 0) {
      status = 'untested'
    } else if (pct < IMPROVING_PCT) {
      status = 'weak'
    } else {
      status = 'improving'
    }

    planTopics.push({
      topicId:      topic.id,
      topicName:    topic.name,
      status,
      source:       isCore && total === 0 ? 'core' : 'weak',
      accuracyPct:  pct,
      attemptCount: total,
    })
  }

  // ── 6. Inject prerequisites for weak/improving topics ────────────────────
  //
  // For each topic in the plan that has prerequisites defined:
  //   - Check if each prerequisite is mastered
  //   - If NOT mastered: inject the prerequisite into the plan (if not already there)
  //     with source='prerequisite' and a link back to the dependent topic

  const planTopicIds = new Set(planTopics.map(t => t.topicId))
  const prereqInjections = [] // { topicId, topicName, status, source, prerequisiteForTopicId, prerequisiteForTopicName }

  for (const item of planTopics) {
    const prereqs = prereqMap[item.topicId] ?? []
    for (const prereqId of prereqs) {
      // Skip if already in the plan
      if (planTopicIds.has(prereqId)) continue

      const prereqTopic = topicMap[prereqId]
      if (!prereqTopic) continue

      const prereqAcc = accMap[prereqId]
      const prereqTotal = prereqAcc?.total ?? 0
      const prereqPct = prereqTotal > 0 ? Math.round((prereqAcc.correct / prereqTotal) * 100) : null

      // Only inject if not mastered
      if (prereqTotal >= MASTERY_MIN_TRIES && prereqPct >= MASTERY_PCT) continue

      prereqInjections.push({
        topicId:                prereqId,
        topicName:              prereqTopic.name,
        status:                 prereqTotal === 0 ? 'untested' : (prereqPct < IMPROVING_PCT ? 'weak' : 'improving'),
        source:                 'prerequisite',
        accuracyPct:            prereqPct,
        attemptCount:           prereqTotal,
        prerequisiteForTopicId: item.topicId,
        prerequisiteForTopicName: item.topicName,
      })

      planTopicIds.add(prereqId) // don't inject same prereq twice
    }
  }

  // ── 7. Merge plan + injections, assign sort order ─────────────────────────
  //
  // Sort order logic:
  //   - Prerequisites come immediately before the topic they unlock (sort_order = dependent's order - 0.5)
  //   - Core topics take priority over non-core
  //   - Within the same tier: weak < improving < untested
  //   - Within the same status: more attempts first (student is actively working on these)

  const statusWeight = { weak: 0, improving: 1, untested: 2 }

  // Assign a base sort order to planTopics
  const sortedPlanTopics = [...planTopics].sort((a, b) => {
    const aIsCore = coreTopicIds.has(a.topicId) ? 0 : 1
    const bIsCore = coreTopicIds.has(b.topicId) ? 0 : 1
    if (aIsCore !== bIsCore) return aIsCore - bIsCore

    const sw = (statusWeight[a.status] ?? 2) - (statusWeight[b.status] ?? 2)
    if (sw !== 0) return sw

    // More attempts = higher priority (they're actively working on it)
    return b.attemptCount - a.attemptCount
  })

  // Build the final ordered list with prerequisites interleaved
  const finalPlan = []
  let sortIdx = 0

  for (const item of sortedPlanTopics) {
    // Find any prerequisite injections for this topic
    const myPrereqs = prereqInjections.filter(p => p.prerequisiteForTopicId === item.topicId)

    // Place prerequisites immediately before the dependent topic
    for (const prereq of myPrereqs) {
      finalPlan.push({ ...prereq, sortOrder: sortIdx })
      sortIdx++
    }

    finalPlan.push({ ...item, sortOrder: sortIdx })
    sortIdx++
  }

  // ── SR-1. Update spaced-repetition review schedule for attempted topics ──
  // Fire-and-forget in spirit — if this fails it doesn't block the plan
  // rebuild, since attempts are already saved and the schedule just catches
  // up on the next rebuild.
  const attemptedTopicIdsList = Object.keys(accMap)
  try {
    await updateReviewSchedule(db, studentId, accMap, attemptedTopicIdsList)
  } catch (e) {
    console.error('[studyPlan] updateReviewSchedule error:', e.message)
  }

  // ── SR-2. Inject topics due for review into the plan ─────────────────────
  // Topics the student previously mastered (or improved) but whose review
  // date has arrived are added back as source='review'. They do NOT
  // displace weak/improving topics — they're appended at the end of the
  // sorted plan so active gaps always come first.
  try {
    const reviewDue = await getTopicsDueForReview(db, studentId, subjectId)

    for (const reviewItem of reviewDue) {
      // Skip if already in the plan (weak/improving doesn't need review injection)
      if (planTopicIds.has(reviewItem.topic_id)) continue

      const topic = topicMap[reviewItem.topic_id]
      if (!topic) continue

      finalPlan.push({
        topicId:                  reviewItem.topic_id,
        topicName:                topic.name,
        status:                   'review',
        source:                   'review',
        accuracyPct:               reviewItem.score ?? null,
        attemptCount:              0, // not counted for sort — always lands at the end
        sortOrder:                 sortIdx,
        prerequisiteForTopicId:    null,
        prerequisiteForTopicName:  null,
        lastTestedAt:              reviewItem.last_tested_at ?? null,
        nextReviewAt:              reviewItem.next_review_at ?? null,
      })
      sortIdx++
    }
  } catch (e) {
    console.error('[studyPlan] review injection error:', e.message)
  }

  // ── 8. Upsert into student_study_plan_items ───────────────────────────────
  if (finalPlan.length === 0) {
    // Nothing in the plan — still clean up any mastered rows
    await db
      .from('student_study_plan_items')
      .delete()
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('status', 'mastered') // belt-and-suspenders cleanup
    return
  }

  const upsertRows = finalPlan.map(item => ({
    student_id:                studentId,
    subject_id:                subjectId,
    topic_id:                  item.topicId,
    source:                    item.source,
    status:                    item.status,
    prerequisite_for_topic_id: item.prerequisiteForTopicId ?? null,
    insight_message:           item.status === 'review'
      ? reviewInsightMessage(item.lastTestedAt)
      : insightMessage(item.status, item.prerequisiteForTopicName ?? null, item.accuracyPct ?? null, item.attemptCount ?? 0),
    sort_order:                item.sortOrder,
    accuracy_pct:              item.accuracyPct ?? null,
    attempt_count:             item.attemptCount,
    last_tested_at:            item.lastTestedAt ?? null,
    next_review_at:            item.nextReviewAt ?? null,
    last_updated_at:           new Date().toISOString(),
  }))

  await db
    .from('student_study_plan_items')
    .upsert(upsertRows, {
      onConflict:        'student_id,topic_id',
      ignoreDuplicates:  false,
    })

  // ── 9. Remove mastered topics from plan ───────────────────────────────────
  // Build the set of topicIds that are mastered (skipped in step 5)
  const masteredTopicIds = allTopics
    .map(t => t.id)
    .filter(id => {
      const acc = accMap[id]
      if (!acc) return false
      const pct = Math.round((acc.correct / acc.total) * 100)
      return acc.total >= MASTERY_MIN_TRIES && pct >= MASTERY_PCT
    })

  if (masteredTopicIds.length) {
    await db
      .from('student_study_plan_items')
      .delete()
      .eq('student_id', studentId)
      .in('topic_id', masteredTopicIds)
  }
}

// ── Seed core topics on first diagnostic ─────────────────────────────────────
// Called when a student completes a diagnostic for a subject that has core
// topics. Seeds untested core topics immediately so the plan is populated
// even before the student has practiced.
export async function seedCoreTopicsForSubject(db, studentId, subjectId) {
  // Check if student already has plan items for this subject
  const { data: existing } = await db
    .from('student_study_plan_items')
    .select('id')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .limit(1)

  // Already seeded — let the full rebuild handle it
  if (existing?.length) return

  // Get core topics
  const { data: coreRows } = await db
    .from('core_topics')
    .select('topic_id, priority, topics(id, name, slug)')
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  if (!coreRows?.length) return

  const seedRows = coreRows.map((row, idx) => ({
    student_id:                studentId,
    subject_id:                subjectId,
    topic_id:                  row.topic_id,
    source:                    'core',
    status:                    'untested',
    prerequisite_for_topic_id: null,
    insight_message:           insightMessage('untested', null, null, 0),
    sort_order:                idx,
    accuracy_pct:              null,
    attempt_count:             0,
    last_updated_at:           new Date().toISOString(),
  }))

  await db
    .from('student_study_plan_items')
    .upsert(seedRows, { onConflict: 'student_id,topic_id', ignoreDuplicates: true })
}
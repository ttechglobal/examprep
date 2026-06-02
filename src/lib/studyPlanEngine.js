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
//   6. Upserts into student_study_plan_items (one row per student × topic)
//   7. Removes mastered topics (accuracy ≥ 70%, ≥ 3 attempts) from the plan
//
// Thresholds:
//   MASTERY     : accuracy >= 70% AND attempts >= 3  → remove from plan
//   IMPROVING   : accuracy >= 50% (but not mastered)
//   WEAK        : accuracy < 50%
//   UNTESTED    : 0 attempts (only included if seeded by core topics)
// ─────────────────────────────────────────────────────────────────────────────

const MASTERY_PCT       = 70
const MASTERY_MIN_TRIES = 3
const IMPROVING_PCT     = 50

// ── Insight message generator ─────────────────────────────────────────────────
function insightMessage(status, prereqForTopicName = null) {
  if (prereqForTopicName) {
    return `Recommended before you continue with ${prereqForTopicName}`
  }
  switch (status) {
    case 'weak':
      return "You struggled here in your last session — let's fix that"
    case 'improving':
      return "You're close — a bit more practice and you'll have this"
    case 'untested':
      return "Start here — this is a key topic for your exam"
    default:
      return "Keep going — you're making progress"
  }
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
    insight_message:           insightMessage(item.status, item.prerequisiteForTopicName ?? null),
    sort_order:                item.sortOrder,
    accuracy_pct:              item.accuracyPct ?? null,
    attempt_count:             item.attemptCount,
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
    insight_message:           'Start here — this is a key topic for your exam',
    sort_order:                idx,
    accuracy_pct:              null,
    attempt_count:             0,
    last_updated_at:           new Date().toISOString(),
  }))

  await db
    .from('student_study_plan_items')
    .upsert(seedRows, { onConflict: 'student_id,topic_id', ignoreDuplicates: true })
}
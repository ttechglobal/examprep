// src/lib/curriculumSave.js
// Helper used by /api/admin/curriculum POST route.
// Replaces all exam_type string writes with exam_types[] array writes.
//
// Drop-in: import { saveTopicsToDb } from '@/lib/curriculumSave'
// and call it instead of the inline loop in the curriculum POST route.

/**
 * Convert a single exam_type string to exam_types array.
 * Handles legacy 'BOTH' and any future exam codes.
 */
export function toExamTypesArray(raw) {
  if (!raw) return ['WAEC']
  if (raw === 'BOTH') return ['WAEC', 'JAMB']
  // Could be comma-separated in future: 'WAEC,IGCSE'
  if (raw.includes(',')) return raw.split(',').map(s => s.trim())
  return [raw]
}

/**
 * Derive exam_types[] for a topic from its subtopics' exam_types arrays.
 * The topic covers all exams that any of its subtopics cover.
 */
export function deriveTopicExamTypes(subtopics = []) {
  const set = new Set()
  for (const s of subtopics) {
    const arr = Array.isArray(s.exam_types) ? s.exam_types
              : Array.isArray(s.exam_type)  ? s.exam_type  // shouldn't happen
              : toExamTypesArray(s.exam_type ?? '')
    arr.forEach(e => set.add(e))
  }
  return set.size > 0 ? [...set] : ['WAEC']
}

/**
 * Save a topics array (from the curriculum merge result) to the DB.
 * Each topic has { title, exam_type, subtopics: [{ title, exam_type, ... }] }
 *
 * Returns { topics_saved, topics_skipped, subtopics_saved, subtopics_skipped, errors, failed_topics }
 */
export async function saveTopicsToDb(db, { subjectId, topics, replaceExisting = false }) {
  const results = {
    topics_saved: 0, topics_skipped: 0,
    subtopics_saved: 0, subtopics_skipped: 0,
    errors: [], failed_topics: [],
  }

  function slugify(str) {
    return (str ?? '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
  }

  // Load existing topics for upsert logic
  const { data: existingTopics } = await db
    .from('topics').select('id, name, slug').eq('subject_id', subjectId)

  const existingTopicBySlug = {}
  const existingTopicByName = {}
  ;(existingTopics ?? []).forEach(t => {
    existingTopicBySlug[t.slug] = t
    existingTopicByName[t.name.toLowerCase().trim()] = t
  })

  for (let ti = 0; ti < topics.length; ti++) {
    const topic = topics[ti]
    const topicTitle = (topic.title ?? topic.name ?? '').trim()
    if (!topicTitle) {
      results.errors.push(`Topic ${ti + 1}: missing title — skipped`)
      results.failed_topics.push({ index: ti + 1, title: '(untitled)', reason: 'Missing title' })
      continue
    }

    const topicSlug   = slugify(topicTitle)
    const topicExamTypes = deriveTopicExamTypes(topic.subtopics ?? [])
    const existingTopic  = existingTopicBySlug[topicSlug] || existingTopicByName[topicTitle.toLowerCase().trim()]

    let savedTopicId

    if (existingTopic && !replaceExisting) {
      results.topics_skipped++
      savedTopicId = existingTopic.id
    } else {
      const { data: savedTopic, error: topicError } = await db
        .from('topics')
        .upsert({
          subject_id:  subjectId,
          slug:        topicSlug,
          name:        topicTitle,
          exam_types:  topicExamTypes,   // ← array
          order_index: ti + 1,
        }, { onConflict: 'subject_id,slug' })
        .select('id, name')
        .single()

      if (topicError) {
        results.errors.push(`Topic "${topicTitle}": ${topicError.message}`)
        results.failed_topics.push({ index: ti + 1, title: topicTitle, reason: topicError.message })
        continue
      }

      savedTopicId = savedTopic.id
      results.topics_saved++
    }

    // Load existing subtopics for upsert
    const { data: existingSubs } = await db
      .from('subtopics').select('id, slug').eq('topic_id', savedTopicId)
    const existingSubMap = {}
    ;(existingSubs ?? []).forEach(s => { existingSubMap[s.slug] = s })

    const usedSlugs = new Set()

    for (let si = 0; si < (topic.subtopics ?? []).length; si++) {
      const sub      = topic.subtopics[si]
      const subTitle = (sub.title ?? sub.name ?? '').trim()
      if (!subTitle) {
        results.errors.push(`Topic "${topicTitle}" → Subtopic ${si + 1}: missing title — skipped`)
        continue
      }

      let subSlug = slugify(subTitle)
      if (usedSlugs.has(subSlug)) subSlug = `${subSlug}-${si + 1}`
      usedSlugs.add(subSlug)

      const existing = existingSubMap[subSlug]
      if (existing && !replaceExisting) { results.subtopics_skipped++; continue }

      const { error: subError } = await db
        .from('subtopics')
        .upsert({
          topic_id:         savedTopicId,
          slug:             subSlug,
          name:             subTitle,
          exam_types:       toExamTypesArray(sub.exam_type ?? 'WAEC'),  // ← array
          order_index:      si + 1,
          objectives:       Array.isArray(sub.objectives) ? sub.objectives : [],
          exam_frequency:   existing?.exam_frequency ?? 3,
          lesson_status:    existing?.lesson_status  ?? 'draft',
          lesson_generated: existing?.lesson_generated ?? false,
          lesson_content:   existing?.lesson_content  ?? null,
        }, { onConflict: 'topic_id,slug' })

      if (subError) {
        results.errors.push(`Topic "${topicTitle}" → Subtopic "${subTitle}": ${subError.message}`)
      } else {
        results.subtopics_saved++
      }
    }
  }

  return results
}
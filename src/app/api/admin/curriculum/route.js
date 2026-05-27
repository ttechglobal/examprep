import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { mergeCurricula, deriveTopicExamType, normaliseExamType } from '@/lib/curriculumMerger'

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function slugify(str) {
  return (str ?? '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

// ── GET — fetch curriculum tree ──────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })

  const db = service()
  const { data: topics, error } = await db
    .from('topics')
    .select(`
      id, name, slug, exam_type, order_index,
      subtopics (
        id, name, slug, exam_type, order_index,
        lesson_status, lesson_generated, objectives, exam_frequency
      )
    `)
    .eq('subject_id', subjectId)
    .order('order_index')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sorted = (topics ?? []).map(t => ({
    ...t,
    subtopics: [...(t.subtopics ?? [])].sort((a, b) => a.order_index - b.order_index),
  }))

  return NextResponse.json(sorted)
}

// ── POST — save curriculum upload ────────────────────────────
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subjectId, examType, topics, replaceExisting = false } = await request.json()

  if (!subjectId || !examType || !topics?.length) {
    return NextResponse.json({ error: 'subjectId, examType, and topics are required' }, { status: 400 })
  }

  const db = service()

  const { data: subject, error: subjectError } = await db
    .from('subjects')
    .select('id, name, waec_uploaded, jamb_uploaded, waec_raw_curriculum, jamb_raw_curriculum')
    .eq('id', subjectId)
    .single()

  if (subjectError || !subject) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
  }

  const { data: existingWithLessons } = await db
    .from('subtopics')
    .select('id, name, lesson_generated, topics!inner(subject_id)')
    .eq('topics.subject_id', subjectId)
    .eq('lesson_generated', true)

  const affectedLessons = existingWithLessons?.length ?? 0

  // Save raw curriculum
  const updateData = {
    [`${examType.toLowerCase()}_uploaded`]: true,
    [`${examType.toLowerCase()}_raw_curriculum`]: JSON.stringify(topics),
  }
  await db.from('subjects').update(updateData).eq('id', subjectId)

  const otherRaw = examType === 'WAEC'
    ? subject.jamb_raw_curriculum
    : subject.waec_raw_curriculum

  // Both exams exist — run merge
  if (otherRaw) {
    let otherTopics
    try {
      otherTopics = JSON.parse(otherRaw)
    } catch {
      const saveResult = await saveCurriculumDirectly(db, subjectId, topics, examType, replaceExisting)
      return NextResponse.json({
        status: 'saved_single',
        examType,
        ...saveResult,
        hasErrors: saveResult.errors?.length > 0,
      })
    }

    const waecTopics = examType === 'WAEC' ? topics : otherTopics
    const jambTopics = examType === 'JAMB' ? topics : otherTopics
    const mergeResult = mergeCurricula(waecTopics, jambTopics)

    return NextResponse.json({
      status: 'merge_ready',
      mergeResult,
      affectedLessons,
      subjectName: subject.name,
    })
  }

  // Single exam — save directly
  const saveResult = await saveCurriculumDirectly(db, subjectId, topics, examType, replaceExisting)

  return NextResponse.json({
    status: 'saved_single',
    examType,
    ...saveResult,
    hasErrors: saveResult.errors?.length > 0,
  })
}

// ── PUT — confirm and save reviewed merge ────────────────────
export async function PUT(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subjectId, mergedTopics, replaceExisting = false } = await request.json()

  if (!subjectId || !mergedTopics?.length) {
    return NextResponse.json({ error: 'subjectId and mergedTopics are required' }, { status: 400 })
  }

  const db = service()
  const result = await saveMergedCurriculum(db, subjectId, mergedTopics, replaceExisting)

  await db.from('subjects').update({ merged: true }).eq('id', subjectId)

  return NextResponse.json({ status: 'merged', ...result })
}

// ─────────────────────────────────────────────────────────────
// Core save function — with duplicate prevention
// ─────────────────────────────────────────────────────────────
async function saveCurriculumDirectly(db, subjectId, topics, examType, replaceExisting = false) {
  const results = {
    topics_created: 0,
    topics_skipped: 0,
    subtopics_created: 0,
    subtopics_skipped: 0,
    errors: [],
    failed_topics: [],
  }

  // Load ALL existing topics for this subject upfront
  const { data: existingTopics } = await db
    .from('topics')
    .select('id, name, slug')
    .eq('subject_id', subjectId)

  // Build lookup maps
  const existingTopicBySlug = {}
  const existingTopicByName = {}
  existingTopics?.forEach(t => {
    existingTopicBySlug[t.slug] = t
    existingTopicByName[t.name.toLowerCase().trim()] = t
  })

  for (let ti = 0; ti < topics.length; ti++) {
    const topic = topics[ti]
    const topicTitle = topic.title ?? topic.name ?? ''

    if (!topicTitle.trim()) {
      results.errors.push(`Topic ${ti + 1}: missing title — skipped`)
      results.failed_topics.push({ index: ti + 1, title: '(untitled)', reason: 'Missing title' })
      continue
    }

    const topicSlug = slugify(topicTitle)
    const topicExamType = normaliseExamType(topic.exam_tag ?? examType)

    // Check if topic already exists (by slug OR by name)
    const existingTopic =
      existingTopicBySlug[topicSlug] ||
      existingTopicByName[topicTitle.toLowerCase().trim()]

    let savedTopicId

    if (existingTopic && !replaceExisting) {
      // Skip — use existing topic ID for subtopics
      results.topics_skipped++
      savedTopicId = existingTopic.id
    } else {
      // Insert or replace
      const { data: savedTopic, error: topicError } = await db
        .from('topics')
        .upsert({
          subject_id: subjectId,
          slug: topicSlug,
          name: topicTitle,
          exam_type: topicExamType,
          order_index: ti + 1,
        }, { onConflict: 'subject_id,slug' })
        .select('id, name')
        .single()

      if (topicError) {
        results.errors.push(`Topic "${topicTitle}": ${topicError.message}`)
        results.failed_topics.push({
          index: ti + 1,
          title: topicTitle,
          reason: topicError.message,
        })
        continue
      }

      savedTopicId = savedTopic.id
      if (!existingTopic) results.topics_created++
      else results.topics_created++ // replaced
    }

    const subtopics = topic.subtopics ?? []

    if (subtopics.length === 0) {
      results.errors.push(`Topic "${topicTitle}": has no subtopics`)
      results.failed_topics.push({
        index: ti + 1,
        title: topicTitle,
        reason: 'No subtopics in JSON',
      })
      continue
    }

    // Load existing subtopics for this topic
    const { data: existingSubtopics } = await db
      .from('subtopics')
      .select('id, name, slug')
      .eq('topic_id', savedTopicId)

    const existingSubBySlug = {}
    const existingSubByName = {}
    existingSubtopics?.forEach(s => {
      existingSubBySlug[s.slug] = s
      existingSubByName[s.name.toLowerCase().trim()] = s
    })

    const usedSlugs = new Set()

    for (let si = 0; si < subtopics.length; si++) {
      const sub = subtopics[si]
      const subTitle = sub.title ?? sub.name ?? ''

      if (!subTitle.trim()) {
        results.errors.push(`Topic "${topicTitle}" → Subtopic ${si + 1}: missing title — skipped`)
        continue
      }

      let subSlug = slugify(subTitle)
      if (usedSlugs.has(subSlug)) subSlug = `${subSlug}-${si + 1}`
      usedSlugs.add(subSlug)

      // Check for duplicate
      const existingSub =
        existingSubBySlug[subSlug] ||
        existingSubByName[subTitle.toLowerCase().trim()]

      if (existingSub && !replaceExisting) {
        results.subtopics_skipped++
        continue
      }

      const { error: subError } = await db
        .from('subtopics')
        .upsert({
          topic_id: savedTopicId,
          slug: subSlug,
          name: subTitle,
          exam_type: normaliseExamType(sub.exam_tag ?? examType),
          order_index: si + 1,
          objectives: Array.isArray(sub.objectives) ? sub.objectives : [],
          exam_frequency: 3,
          lesson_status: 'draft',
          lesson_generated: false,
        }, { onConflict: 'topic_id,slug' })

      if (subError) {
        results.errors.push(`Topic "${topicTitle}" → Subtopic "${subTitle}": ${subError.message}`)
      } else {
        results.subtopics_created++
      }
    }
  }

  return results
}

// ─────────────────────────────────────────────────────────────
// Save merged curriculum — preserves lesson content
// ─────────────────────────────────────────────────────────────
async function saveMergedCurriculum(db, subjectId, mergedTopics, replaceExisting = false) {
  const results = {
    topics_saved: 0,
    topics_skipped: 0,
    subtopics_saved: 0,
    subtopics_skipped: 0,
    errors: [],
    failed_topics: [],
  }

  const { data: existingSubtopics } = await db
    .from('subtopics')
    .select('id, name, slug, lesson_generated, lesson_status, lesson_content, topics!inner(subject_id)')
    .eq('topics.subject_id', subjectId)

  const existingSubMap = {}
  existingSubtopics?.forEach(s => { existingSubMap[s.slug] = s })

  const { data: existingTopics } = await db
    .from('topics')
    .select('id, name, slug')
    .eq('subject_id', subjectId)

  const existingTopicBySlug = {}
  const existingTopicByName = {}
  existingTopics?.forEach(t => {
    existingTopicBySlug[t.slug] = t
    existingTopicByName[t.name.toLowerCase().trim()] = t
  })

  for (let ti = 0; ti < mergedTopics.length; ti++) {
    const topic = mergedTopics[ti]
    const topicTitle = topic.title ?? topic.name ?? ''

    if (!topicTitle.trim()) {
      results.errors.push(`Merged topic ${ti + 1}: missing title — skipped`)
      results.failed_topics.push({ index: ti + 1, title: '(untitled)', reason: 'Missing title' })
      continue
    }

    const topicSlug = slugify(topicTitle)
    const derivedExamType = deriveTopicExamType(
      (topic.subtopics ?? []).map(s => ({ exam_type: s.exam_type }))
    )

    const existingTopic =
      existingTopicBySlug[topicSlug] ||
      existingTopicByName[topicTitle.toLowerCase().trim()]

    let savedTopicId

    if (existingTopic && !replaceExisting) {
      results.topics_skipped++
      savedTopicId = existingTopic.id
    } else {
      const { data: savedTopic, error: topicError } = await db
        .from('topics')
        .upsert({
          subject_id: subjectId,
          slug: topicSlug,
          name: topicTitle,
          exam_type: derivedExamType,
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

    const subtopics = topic.subtopics ?? []
    const usedSlugs = new Set()

    for (let si = 0; si < subtopics.length; si++) {
      const sub = subtopics[si]
      const subTitle = sub.title ?? sub.name ?? ''

      if (!subTitle.trim()) {
        results.errors.push(`Topic "${topicTitle}" → Subtopic ${si + 1}: missing title — skipped`)
        continue
      }

      let subSlug = slugify(subTitle)
      if (usedSlugs.has(subSlug)) subSlug = `${subSlug}-${si + 1}`
      usedSlugs.add(subSlug)

      const existing = existingSubMap[subSlug]

      if (existing && !replaceExisting) {
        results.subtopics_skipped++
        continue
      }

      const { error: subError } = await db
        .from('subtopics')
        .upsert({
          topic_id: savedTopicId,
          slug: subSlug,
          name: subTitle,
          exam_type: sub.exam_type ?? 'BOTH',
          order_index: si + 1,
          objectives: Array.isArray(sub.objectives) ? sub.objectives : [],
          exam_frequency: existing?.exam_frequency ?? 3,
          lesson_status: existing?.lesson_status ?? 'draft',
          lesson_generated: existing?.lesson_generated ?? false,
          lesson_content: existing?.lesson_content ?? null,
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
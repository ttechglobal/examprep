import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { mergeCurricula, deriveTopicExamType, normaliseExamType } from '@/lib/curriculumMerger'

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET — fetch curriculum tree for a subject
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

// POST — save raw curriculum upload (single exam)
// Returns merge preview if both exams now exist
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subjectId, examType, topics } = await request.json()

  if (!subjectId || !examType || !topics?.length) {
    return NextResponse.json({ error: 'subjectId, examType, and topics are required' }, { status: 400 })
  }

  const db = service()

  // Store the raw upload in a staging table concept
  // We use a JSON column on subjects to track raw uploads
  const uploadKey = examType === 'WAEC' ? 'waec_raw' : 'jamb_raw'

  // Get existing raw uploads for this subject
  const { data: subject } = await db
    .from('subjects')
    .select('id, name, waec_uploaded, jamb_uploaded, waec_raw_curriculum, jamb_raw_curriculum')
    .eq('id', subjectId)
    .single()

  // Check for existing subtopics with lessons — warn admin
  const { data: existingSubtopics } = await db
    .from('subtopics')
    .select('id, name, lesson_generated, topics!inner(subject_id)')
    .eq('topics.subject_id', subjectId)
    .eq('lesson_generated', true)

  const affectedLessons = existingSubtopics?.length ?? 0

  // Save raw curriculum to subject record
  const updateData = {
    [`${examType.toLowerCase()}_uploaded`]: true,
    [`${examType.toLowerCase()}_raw_curriculum`]: JSON.stringify(topics),
  }

  await db.from('subjects').update(updateData).eq('id', subjectId)

  // Get the other exam's raw curriculum if it exists
  const otherExam = examType === 'WAEC' ? 'JAMB' : 'WAEC'
  const otherRaw = examType === 'WAEC'
    ? subject?.jamb_raw_curriculum
    : subject?.waec_raw_curriculum

  // If both exams uploaded — run merge
  if (otherRaw) {
    const otherTopics = JSON.parse(otherRaw)
    const waecTopics = examType === 'WAEC' ? topics : otherTopics
    const jambTopics = examType === 'JAMB' ? topics : otherTopics

    const mergeResult = mergeCurricula(waecTopics, jambTopics)

    return NextResponse.json({
      status: 'merge_ready',
      mergeResult,
      affectedLessons,
      subjectName: subject?.name,
    })
  }

  // Only one exam uploaded — save directly
  const saveResult = await saveCurriculumDirectly(db, subjectId, topics, examType)

  return NextResponse.json({
    status: 'saved_single',
    examType,
    ...saveResult,
  })
}

// PUT — confirm and save a reviewed merge
export async function PUT(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subjectId, mergedTopics } = await request.json()

  if (!subjectId || !mergedTopics?.length) {
    return NextResponse.json({ error: 'subjectId and mergedTopics are required' }, { status: 400 })
  }

  const db = service()
  const result = await saveMergedCurriculum(db, subjectId, mergedTopics)

  // Mark subject as merged
  await db.from('subjects').update({ merged: true }).eq('id', subjectId)

  return NextResponse.json({ status: 'merged', ...result })
}

// ─────────────────────────────────────────────────────────────
// Save a single-exam curriculum directly (no merge needed yet)
// ─────────────────────────────────────────────────────────────
async function saveCurriculumDirectly(db, subjectId, topics, examType) {
  const results = { topics_created: 0, subtopics_created: 0, errors: [] }

  for (let ti = 0; ti < topics.length; ti++) {
    const topic = topics[ti]
    const topicSlug = slugify(topic.title)
    const topicExamType = normaliseExamType(topic.exam_tag ?? examType)

    console.log(`Saving topic: "${topic.title}" with ${topic.subtopics?.length ?? 0} subtopics`)

    const { data: savedTopic, error: topicError } = await db
      .from('topics')
      .upsert({
        subject_id: subjectId,
        slug: topicSlug,
        name: topic.title,
        exam_type: topicExamType,
        order_index: ti + 1,
      }, { onConflict: 'subject_id,slug' })
      .select()
      .single()

    if (topicError) {
      console.error(`Topic error:`, topicError)
      results.errors.push(`Topic "${topic.title}": ${topicError.message}`)
      continue
    }

    console.log(`Saved topic ID: ${savedTopic.id}, now saving ${topic.subtopics?.length} subtopics`)
    results.topics_created++

    for (let si = 0; si < (topic.subtopics ?? []).length; si++) {
      const sub = topic.subtopics[si]
      const subSlug = slugify(sub.title)

      console.log(`  Saving subtopic: "${sub.title}"`)

      const { error: subError } = await db
        .from('subtopics')
        .upsert({
          topic_id: savedTopic.id,
          slug: subSlug,
          name: sub.title,
          exam_type: normaliseExamType(sub.exam_tag ?? examType),
          order_index: si + 1,
          objectives: sub.objectives ?? [],
          exam_frequency: 3,
          lesson_status: 'draft',
          lesson_generated: false,
        }, { onConflict: 'topic_id,slug' })

      if (subError) {
        console.error(`  Subtopic error:`, subError)
        results.errors.push(`Subtopic "${sub.title}": ${subError.message}`)
      } else {
        results.subtopics_created++
        console.log(`  Saved subtopic: "${sub.title}"`)
      }
    }
  }

  console.log(`Final results:`, results)
  return results
}

// ─────────────────────────────────────────────────────────────
// Save merged curriculum (after admin review)
// Preserves lesson_generated flag on existing subtopics
// ─────────────────────────────────────────────────────────────
async function saveMergedCurriculum(db, subjectId, mergedTopics) {
  const results = { topics_saved: 0, subtopics_saved: 0, errors: [] }

  // Get existing subtopics to preserve lesson data
  const { data: existingSubtopics } = await db
    .from('subtopics')
    .select('id, name, slug, lesson_generated, lesson_status, lesson_content, topics!inner(subject_id)')
    .eq('topics.subject_id', subjectId)

  const existingMap = {}
  existingSubtopics?.forEach(s => {
    existingMap[s.slug] = s
  })

  for (let ti = 0; ti < mergedTopics.length; ti++) {
    const topic = mergedTopics[ti]
    const topicSlug = slugify(topic.title)

    // Derive exam_type from subtopics
    const derivedExamType = deriveTopicExamType(
      topic.subtopics.map(s => ({ exam_type: s.exam_type }))
    )

    const { data: savedTopic, error: topicError } = await db
      .from('topics')
      .upsert({
        subject_id: subjectId,
        slug: topicSlug,
        name: topic.title,
        exam_type: derivedExamType,
        order_index: ti + 1,
      }, { onConflict: 'subject_id,slug' })
      .select()
      .single()

    if (topicError) {
      results.errors.push(`Topic "${topic.title}": ${topicError.message}`)
      continue
    }
    results.topics_saved++

    for (let si = 0; si < (topic.subtopics ?? []).length; si++) {
      const sub = topic.subtopics[si]
      const subSlug = slugify(sub.title)
      const existing = existingMap[subSlug]

      const { error: subError } = await db
        .from('subtopics')
        .upsert({
          topic_id: savedTopic.id,
          slug: subSlug,
          name: sub.title,
          exam_type: sub.exam_type,
          order_index: si + 1,
          objectives: sub.objectives ?? [],
          exam_frequency: existing?.exam_frequency ?? 3,
          lesson_status: existing?.lesson_status ?? 'draft',
          lesson_generated: existing?.lesson_generated ?? false,
          lesson_content: existing?.lesson_content ?? null,
        }, { onConflict: 'topic_id,slug' })

      if (subError) {
        results.errors.push(`Subtopic "${sub.title}": ${subError.message}`)
      } else {
        results.subtopics_saved++
      }
    }
  }

  return results
}

function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
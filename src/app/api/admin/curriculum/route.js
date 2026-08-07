import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// NOTE: mergeCurricula import removed — one subject = one exam, no merging.

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
        exam_frequency
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
// Always saves directly. No merge logic. examType comes from the
// subject's own exam_type field (passed by the upload page).
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
    .select('id, name')
    .eq('id', subjectId)
    .single()

  if (subjectError || !subject) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
  }

  const saveResult = await saveCurriculumDirectly(db, subjectId, topics, examType, replaceExisting)

  return NextResponse.json({
    status: 'saved',
    examType,
    subjectName: subject.name,
    ...saveResult,
    hasErrors: saveResult.errors?.length > 0,
  })
}

// ── PUT — removed (was: confirm and save reviewed merge) ─────
// Merge flow has been removed. This handler no longer exists.

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
    const topicExamType = ['WAEC', 'JAMB', 'IGCSE'].includes((topic.exam_tag ?? '').toUpperCase())
      ? topic.exam_tag.toUpperCase()
      : examType

    // Check if topic already exists (by slug OR by name)
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
      results.topics_created++
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

      const existingSub =
        existingSubBySlug[subSlug] ||
        existingSubByName[subTitle.toLowerCase().trim()]

      if (existingSub && !replaceExisting) {
        results.subtopics_skipped++
        continue
      }

      const subExamType = ['WAEC', 'JAMB', 'IGCSE'].includes((sub.exam_tag ?? '').toUpperCase())
        ? sub.exam_tag.toUpperCase()
        : examType

      const { error: subError } = await db
        .from('subtopics')
        .upsert({
          topic_id: savedTopicId,
          slug: subSlug,
          name: subTitle,
          exam_type: subExamType,
          order_index: si + 1,
          objectives: Array.isArray(sub.objectives) ? sub.objectives : [],
          exam_frequency: 3,
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
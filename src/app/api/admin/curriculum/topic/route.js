import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { normaliseExamType } from '@/lib/curriculumMerger'

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

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subjectId, topicId, topicTitle, examType, subtopics, orderIndex } = await request.json()

  if (!subjectId || !topicTitle || !subtopics?.length) {
    return NextResponse.json({ error: 'subjectId, topicTitle, and subtopics are required' }, { status: 400 })
  }

  const db = service()
  const topicSlug = slugify(topicTitle)

  // Upsert topic
  const { data: savedTopic, error: topicError } = await db
    .from('topics')
    .upsert({
      ...(topicId ? { id: topicId } : {}),
      subject_id: subjectId,
      slug: topicSlug,
      name: topicTitle,
      exam_type: normaliseExamType(examType),
      order_index: orderIndex ?? 99,
    }, { onConflict: topicId ? 'id' : 'subject_id,slug' })
    .select('id, name')
    .single()

  if (topicError) {
    return NextResponse.json({ error: topicError.message }, { status: 500 })
  }

  const results = { saved: 0, errors: [] }
  const usedSlugs = new Set()

  for (let si = 0; si < subtopics.length; si++) {
    const sub = subtopics[si]
    const subTitle = sub.title ?? sub.name ?? ''
    if (!subTitle.trim()) {
      results.errors.push(`Subtopic ${si + 1}: missing title`)
      continue
    }

    let subSlug = slugify(subTitle)
    if (usedSlugs.has(subSlug)) subSlug = `${subSlug}-${si + 1}`
    usedSlugs.add(subSlug)

    const { error } = await db
      .from('subtopics')
      .upsert({
        topic_id: savedTopic.id,
        slug: subSlug,
        name: subTitle,
        exam_type: normaliseExamType(sub.exam_tag ?? examType),
        order_index: si + 1,
        objectives: Array.isArray(sub.objectives) ? sub.objectives : [],
        exam_frequency: 3,
        lesson_status: 'draft',
        lesson_generated: false,
      }, { onConflict: 'topic_id,slug' })

    if (error) {
      results.errors.push(`Subtopic "${subTitle}": ${error.message}`)
    } else {
      results.saved++
    }
  }

  return NextResponse.json({
    topicId: savedTopic.id,
    topicName: savedTopic.name,
    subtopicsSaved: results.saved,
    errors: results.errors,
  })
}
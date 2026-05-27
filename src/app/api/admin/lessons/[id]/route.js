import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { parseLesson } from '@/lib/lessonParser'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('subtopics')
    .select('id, name, slug, lesson_status, lesson_content, objectives, exam_type')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function POST(request, { params }) {
  const supabase = await createClient()
  const { id } = await params
  const { raw_content } = await request.json()

  if (!raw_content) {
    return NextResponse.json({ error: 'raw_content is required' }, { status: 400 })
  }

  const result = parseLesson(raw_content)

  if (!result.valid) {
    return NextResponse.json({ valid: false, errors: result.errors }, { status: 422 })
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error } = await service
    .from('subtopics')
    .update({
      lesson_content: result.lesson,
      lesson_status: 'draft',
      lesson_generated: true,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ valid: true, stats: result.stats })
}

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { id } = await params
  const { action } = await request.json()

  if (!['publish', 'unpublish', 'send_for_review'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const statusMap = {
    publish: 'published',
    unpublish: 'draft',
    send_for_review: 'in_review',
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error } = await service
    .from('subtopics')
    .update({ lesson_status: statusMap[action] })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, status: statusMap[action] })
}
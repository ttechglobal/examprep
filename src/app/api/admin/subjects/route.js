import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  const db = service()
  const { data, error } = await db
    .from('subjects')
    .select(`
      id, name, slug, exam_type, order_index, is_active,
      waec_uploaded, jamb_uploaded, merged,
      topics (
        id,
        subtopics ( id, lesson_generated, lesson_status )
      )
    `)
    .order('order_index')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = (data ?? []).map(subject => {
    const allSubtopics = subject.topics.flatMap(t => t.subtopics)
    return {
      id: subject.id,
      name: subject.name,
      slug: subject.slug,
      exam_type: subject.exam_type,
      order_index: subject.order_index,
      is_active: subject.is_active,
      waec_uploaded: subject.waec_uploaded ?? false,
      jamb_uploaded: subject.jamb_uploaded ?? false,
      merged: subject.merged ?? false,
      topic_count: subject.topics.length,
      subtopic_count: allSubtopics.length,
      lessons_generated: allSubtopics.filter(s => s.lesson_generated).length,
      lessons_published: allSubtopics.filter(s => s.lesson_status === 'published').length,
    }
  })

  return NextResponse.json(enriched)
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = service()
  const { name, exam_type, order_index } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const slug = name.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data, error } = await db
    .from('subjects')
    .insert({
      name: name.trim(),
      slug,
      exam_type: exam_type ?? 'BOTH',
      order_index: order_index ?? 99,
      is_active: true,
      waec_uploaded: false,
      jamb_uploaded: false,
      merged: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
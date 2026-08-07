// src/app/api/admin/subjects/route.js
// exam_type: single string 'WAEC' | 'JAMB' | 'IGCSE' — one row per exam per subject.
// Multiple exams for same subject name = multiple rows (e.g. Maths WAEC + Maths JAMB).

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const VALID_EXAMS = ['WAEC', 'JAMB', 'IGCSE']

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
      topics (
        id,
        subtopics ( id )
      )
    `)
    .order('name')
    .order('exam_type')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = (data ?? []).map(subject => ({
    id:             subject.id,
    name:           subject.name,
    slug:           subject.slug,
    exam_type:      subject.exam_type,
    order_index:    subject.order_index,
    is_active:      subject.is_active,
    topic_count:    subject.topics?.length ?? 0,
    subtopic_count: subject.topics?.reduce((a, t) => a + (t.subtopics?.length ?? 0), 0) ?? 0,
  }))

  return NextResponse.json(enriched)
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = service()
  const { name, exam_type, order_index } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!VALID_EXAMS.includes(exam_type)) {
    return NextResponse.json(
      { error: `exam_type is required and must be one of: ${VALID_EXAMS.join(', ')}` },
      { status: 400 }
    )
  }

  // Slug includes exam to keep it unique: "mathematics-waec", "mathematics-jamb"
  const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const slug     = `${baseSlug}-${exam_type.toLowerCase()}`

  const { data, error } = await db
    .from('subjects')
    .insert({
      name:        name.trim(),
      slug,
      exam_type,
      order_index: order_index ?? 99,
      is_active:   true,
    })
    .select('id, name, slug, exam_type, order_index, is_active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, topic_count: 0, subtopic_count: 0 })
}
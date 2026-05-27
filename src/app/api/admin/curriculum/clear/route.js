import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET — preview what will be deleted
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })

  const db = service()

  const { data: topics } = await db
    .from('topics')
    .select(`
      id, name,
      subtopics ( id, lesson_generated )
    `)
    .eq('subject_id', subjectId)

  const topicCount = topics?.length ?? 0
  const subtopicCount = topics?.reduce((a, t) => a + (t.subtopics?.length ?? 0), 0) ?? 0
  const lessonsCount = topics?.reduce(
    (a, t) => a + (t.subtopics?.filter(s => s.lesson_generated).length ?? 0), 0
  ) ?? 0

  return NextResponse.json({ topicCount, subtopicCount, lessonsCount })
}

// DELETE — clear all topics + subtopics for a subject
export async function DELETE(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })

  const db = service()

  const { error } = await db
    .from('topics')
    .delete()
    .eq('subject_id', subjectId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Reset upload flags
  await db
    .from('subjects')
    .update({
      waec_uploaded: false,
      jamb_uploaded: false,
      merged: false,
      waec_raw_curriculum: null,
      jamb_raw_curriculum: null,
    })
    .eq('id', subjectId)

  return NextResponse.json({ success: true })
}
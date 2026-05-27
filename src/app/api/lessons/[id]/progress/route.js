import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slides_completed, total_slides, completed } = await request.json()

  const { error } = await supabase
    .from('lesson_progress')
    .upsert({
      student_id: user.id,
      subtopic_id: id,
      slides_completed,
      total_slides,
      completed: completed ?? false,
      completed_at: completed ? new Date().toISOString() : null,
    }, { onConflict: 'student_id,subtopic_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
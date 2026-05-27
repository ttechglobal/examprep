import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
  const supabase = await createClient()
  const { subtopicId } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { comment } = await request.json()
  if (!comment?.trim()) {
    return NextResponse.json({ error: 'Comment is required' }, { status: 400 })
  }

  const { data: review, error } = await supabase
    .from('lesson_reviews')
    .insert({
      subtopic_id: subtopicId,
      reviewer_id: user.id,
      comment: comment.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ review })
}

export async function GET(request, { params }) {
  const supabase = await createClient()
  const { subtopicId } = await params

  const { data: reviews, error } = await supabase
    .from('lesson_reviews')
    .select('id, comment, resolved, created_at, reviewer_id')
    .eq('subtopic_id', subtopicId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reviews })
}
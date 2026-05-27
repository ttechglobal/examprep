import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LessonViewer from '@/components/lesson/LessonViewer'

export default async function LessonPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch lesson content
  const { data: subtopic, error } = await supabase
    .from('subtopics')
    .select(`
      id,
      name,
      slug,
      lesson_content,
      lesson_status,
      topic_id,
      topics (
        id,
        name,
        slug,
        subject_id,
        subjects (
          id,
          name,
          slug
        )
      )
    `)
    .eq('id', id)
    .eq('lesson_status', 'published')
    .single()

  if (error || !subtopic) notFound()

  // Get auth user (nullable — guests can view too)
  const { data: { user } } = await supabase.auth.getUser()

  // Get existing progress if logged in
  let existingProgress = null
  if (user) {
    const { data } = await supabase
      .from('lesson_progress')
      .select('slides_completed, completed')
      .eq('student_id', user.id)
      .eq('subtopic_id', id)
      .single()
    existingProgress = data
  }

  return (
    <LessonViewer
      subtopic={subtopic}
      userId={user?.id ?? null}
      existingProgress={existingProgress}
    />
  )
}
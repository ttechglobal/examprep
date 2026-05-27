import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ReviewerLessonClient from '@/components/lesson/ReviewerLessonClient'

export default async function ReviewerLessonPage({ params }) {
  const { subtopicId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: subtopic } = await supabase
    .from('subtopics')
    .select(`
      id, name, slug, lesson_status, lesson_content,
      topics (
        name,
        subjects ( name, slug )
      )
    `)
    .eq('id', subtopicId)
    .single()

  if (!subtopic) notFound()

  // Get existing reviews for this lesson
  const { data: reviews } = await supabase
    .from('lesson_reviews')
    .select('id, comment, resolved, created_at, reviewer_id')
    .eq('subtopic_id', subtopicId)
    .order('created_at', { ascending: true })

  return (
    <ReviewerLessonClient
      subtopic={subtopic}
      reviews={reviews ?? []}
      currentUserId={user.id}
    />
  )
}
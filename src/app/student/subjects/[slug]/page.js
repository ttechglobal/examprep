import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SubjectPageClient from '@/components/lesson/SubjectPageClient'

export default async function SubjectPage({ params }) {
  const { slug } = await params
  const supabase = await createClient()

  // Get subject
  const { data: subject } = await supabase
    .from('subjects')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!subject) notFound()

  // Get topics + subtopics
  const { data: topics } = await supabase
    .from('topics')
    .select(`
      id, name, slug, order_index,
      subtopics (
        id, name, slug, order_index,
        lesson_status, exam_frequency
      )
    `)
    .eq('subject_id', subject.id)
    .order('order_index')

  // Sort subtopics within each topic
  const sortedTopics = (topics ?? []).map(topic => ({
    ...topic,
    subtopics: [...(topic.subtopics ?? [])].sort((a, b) => a.order_index - b.order_index),
  }))

  // Get auth user
  const { data: { user } } = await supabase.auth.getUser()

  // Get lesson progress if logged in
  let progress = []
  if (user) {
    const { data } = await supabase
      .from('lesson_progress')
      .select('subtopic_id, slides_completed, total_slides, completed')
      .eq('student_id', user.id)

    progress = data ?? []
  }

  // Get learning path for this subject
  let learningPath = null
  if (user) {
    const { data } = await supabase
      .from('student_learning_paths')
      .select('ordered_subtopic_ids')
      .eq('student_id', user.id)
      .eq('subject_id', subject.id)
      .single()

    learningPath = data
  }

  return (
    <SubjectPageClient
      subject={subject}
      topics={sortedTopics}
      progress={progress}
      learningPath={learningPath}
    />
  )
}
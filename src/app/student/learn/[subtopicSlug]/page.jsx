import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LessonViewer from '@/components/lesson/LessonViewer'

export default async function LearnSubtopicPage({ params }) {
  const { subtopicSlug } = await params
  const supabase = await createClient()

  const { data: subtopic, error } = await supabase
    .from('subtopics')
    .select(`
      id, name, slug, lesson_content, lesson_status, topic_id,
      topics (
        id, name, slug, subject_id,
        subjects ( id, name, slug )
      )
    `)
    .eq('slug', subtopicSlug)
    .single()

  if (error || !subtopic) notFound()

  if (subtopic.lesson_status !== 'published') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-5xl">📖</div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">Lesson coming soon</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            <span className="font-semibold">{subtopic.name}</span> hasn't been published yet.
          </p>
          <a href="/student/learn" className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-xl">
            ← Back to Learn
          </a>
        </div>
      </div>
    )
  }

  const { data: { user } } = await supabase.auth.getUser()

  let existingProgress = null
  if (user) {
    const { data } = await supabase
      .from('lesson_progress')
      .select('slides_completed, completed')
      .eq('student_id', user.id)
      .eq('subtopic_id', subtopic.id)
      .maybeSingle()
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
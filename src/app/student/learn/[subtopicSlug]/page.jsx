import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { parseLesson } from '@/lib/lessonParser'
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

  // ── Parse lesson_content → lesson object ────────────────────────────────────
  // lesson_content is stored as a JSON string in the DB.
  // LessonViewer needs the parsed { title, slides } object — not the raw string.
  let lesson = null
  if (subtopic.lesson_content) {
    const raw = typeof subtopic.lesson_content === 'string'
      ? subtopic.lesson_content
      : JSON.stringify(subtopic.lesson_content)
    const { valid, lesson: parsed } = parseLesson(raw)
    if (valid) lesson = parsed
    // If parsing fails, lesson stays null — LessonViewer will show error state
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

  // Resolve accent colour from subject
  const subjectName = subtopic.topics?.subjects?.name ?? ''
  const ACCENT_MAP = {
    'Chemistry': '#9b7ae0', 'Physics': '#ff8fab', 'Biology': '#6cce8e',
    'Mathematics': '#5cb8ea', 'Further Mathematics': '#5cb8ea',
    'English Language': '#a78bfa', 'Use of English': '#a78bfa',
    'Economics': '#fcd34d', 'Government': '#f87171', 'Geography': '#34d399',
  }
  const accentColor = ACCENT_MAP[subjectName] ?? '#6366f1'

  return (
    <LessonViewer
      lesson={lesson}             // ← parsed { title, slides } — was missing before
      subtopic={subtopic}
      userId={user?.id ?? null}
      existingProgress={existingProgress}
      accentColor={accentColor}
    />
  )
}
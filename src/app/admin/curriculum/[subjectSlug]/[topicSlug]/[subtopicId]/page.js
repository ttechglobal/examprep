import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import LessonEditorClient from '@/components/admin/LessonEditorClient'
import Link from 'next/link'

export default async function LessonEditorPage({ params }) {
  const { subjectSlug, topicSlug, subtopicId } = await params

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: subject } = await db
    .from('subjects')
    .select('id, name, slug, exam_type')
    .eq('slug', subjectSlug)
    .single()

  if (!subject) notFound()

  const { data: topic } = await db
    .from('topics')
    .select('id, name, slug')
    .eq('subject_id', subject.id)
    .eq('slug', topicSlug)
    .single()

  if (!topic) notFound()

  const { data: subtopic } = await db
    .from('subtopics')
    .select('id, name, slug, exam_type, objectives, lesson_status, lesson_generated, lesson_content')
    .eq('id', subtopicId)
    .single()

  if (!subtopic) notFound()

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap mb-6">
        <Link href="/admin/curriculum" className="hover:text-gray-600">Curriculum</Link>
        <span>/</span>
        <Link href={`/admin/curriculum/${subjectSlug}`} className="hover:text-gray-600">
          {subject.name}
        </Link>
        <span>/</span>
        <Link href={`/admin/curriculum/${subjectSlug}/${topicSlug}`} className="hover:text-gray-600">
          {topic.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-bold">{subtopic.name}</span>
      </div>

      <LessonEditorClient
        subject={subject}
        topic={topic}
        subtopic={subtopic}
      />
    </div>
  )
}
// src/app/admin/curriculum/[subjectSlug]/[topicSlug]/[subtopicId]/page.js
// PATCH to existing subtopic editor: adds "Practice Questions" tab
// that shows GeneratedQuestionsPanel alongside the existing lesson editor.
// This is a server component — keep the same data-fetching pattern.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SubtopicEditorTabs from '@/components/admin/SubtopicEditorTabs'

export default async function SubtopicEditorPage({ params }) {
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
    .select('id, name, slug, exam_type, lesson_status, lesson_generated, lesson_content, objectives, generation_prompt')
    .eq('id', subtopicId)
    .single()

  if (!subtopic) notFound()

  // Count existing generated questions for this subtopic
  const { count: generatedCount } = await db
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('subtopic_id', subtopicId)
    .eq('source', 'ai_generated')
    .eq('is_active', true)

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
        <Link href="/admin/curriculum" className="hover:text-gray-600">Curriculum</Link>
        <span>/</span>
        <Link href={`/admin/curriculum/${subjectSlug}`} className="hover:text-gray-600">{subject.name}</Link>
        <span>/</span>
        <Link href={`/admin/curriculum/${subjectSlug}/${topicSlug}`} className="hover:text-gray-600">{topic.name}</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{subtopic.name}</span>
      </div>

      <SubtopicEditorTabs
        subject={subject}
        topic={topic}
        subtopic={subtopic}
        generatedCount={generatedCount ?? 0}
      />
    </div>
  )
}
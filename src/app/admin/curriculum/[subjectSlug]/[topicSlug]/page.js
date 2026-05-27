import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import SubtopicsPageClient from '@/components/admin/SubtopicsPageClient'
import Link from 'next/link'

export default async function TopicSubtopicsPage({ params }) {
  const { subjectSlug, topicSlug } = await params

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
    .select('id, name, slug, exam_type, order_index')
    .eq('subject_id', subject.id)
    .eq('slug', topicSlug)
    .single()

  if (!topic) notFound()

  const { data: subtopics } = await db
    .from('subtopics')
    .select('id, name, slug, exam_type, order_index, lesson_status, lesson_generated, objectives, exam_frequency')
    .eq('topic_id', topic.id)
    .order('order_index')

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
        <Link href="/admin/curriculum" className="hover:text-gray-600">Curriculum</Link>
        <span>/</span>
        <Link href={`/admin/curriculum/${subjectSlug}`} className="hover:text-gray-600">
          {subject.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-bold">{topic.name}</span>
      </div>

      <SubtopicsPageClient
        subject={subject}
        topic={topic}
        subtopics={subtopics ?? []}
      />
    </div>
  )
}
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function AdminSubjectPage({ params }) {
  const { subjectSlug } = await params
  const supabase = await createClient()

  const { data: subject } = await supabase
    .from('subjects')
    .select('id, name, slug, exam_type')
    .eq('slug', subjectSlug)
    .single()

  if (!subject) notFound()

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

  const sortedTopics = (topics ?? []).map(t => ({
    ...t,
    subtopics: [...(t.subtopics ?? [])].sort((a, b) => a.order_index - b.order_index),
  }))

  const statusColors = {
    published:  'bg-green-100 text-green-700',
    in_review:  'bg-blue-100 text-blue-700',
    draft:      'bg-gray-100 text-gray-500',
  }

  const statusLabels = {
    published: 'Published',
    in_review: 'In Review',
    draft:     'Draft',
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{subject.name}</h1>
        <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
          {subject.exam_type}
        </span>
      </div>

      {/* Topics + subtopics */}
      <div className="space-y-4">
        {sortedTopics.map(topic => (
          <div key={topic.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

            {/* Topic header */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm">{topic.name}</h3>
              <span className="text-xs text-gray-400">
                {topic.subtopics.filter(s => s.lesson_status === 'published').length}/
                {topic.subtopics.length} published
              </span>
            </div>

            {/* Subtopics */}
            <div className="divide-y divide-gray-50">
              {topic.subtopics.map(subtopic => (
                <div
                  key={subtopic.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4">{subtopic.order_index}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{subtopic.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Freq: {'★'.repeat(subtopic.exam_frequency)}{'☆'.repeat(5 - subtopic.exam_frequency)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[subtopic.lesson_status]}`}>
                      {statusLabels[subtopic.lesson_status]}
                    </span>
                    <Link
                      href={`/admin/subjects/${subjectSlug}/${topic.slug}/${subtopic.id}`}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-500 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
                    >
                      {subtopic.lesson_status === 'draft' ? 'Create lesson' : 'Edit'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
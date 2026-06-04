// src/app/admin/subjects/[subjectSlug]/page.js

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const EXAM_COLORS = {
  WAEC: 'bg-blue-100 text-blue-700 border-blue-200',
  JAMB: 'bg-purple-100 text-purple-700 border-purple-200',
  BOTH: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

const STATUS_COLORS = {
  published: 'bg-green-100 text-green-700',
  in_review: 'bg-blue-100 text-blue-700',
  draft:     'bg-gray-100 text-gray-500',
}

export default async function SubjectTopicsPage({ params }) {
  const { subjectSlug } = await params

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: subject } = await db
    .from('subjects')
    .select('id, name, slug, exam_type, is_active')
    .eq('slug', subjectSlug)
    .single()

  if (!subject) notFound()

  const { data: topics } = await db
    .from('topics')
    .select(`
      id, name, slug, exam_type, order_index,
      subtopics ( id, name, slug, lesson_status, lesson_generated, exam_type, order_index )
    `)
    .eq('subject_id', subject.id)
    .order('order_index')

  const allTopics = topics ?? []
  const totalSubtopics  = allTopics.reduce((a, t) => a + (t.subtopics?.length ?? 0), 0)
  const totalPublished  = allTopics.reduce((a, t) => a + (t.subtopics?.filter(s => s.lesson_status === 'published').length ?? 0), 0)
  const totalGenerated  = allTopics.reduce((a, t) => a + (t.subtopics?.filter(s => s.lesson_generated).length ?? 0), 0)
  const pct = totalSubtopics > 0 ? Math.round((totalPublished / totalSubtopics) * 100) : 0

  return (
    <div className="space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
        <Link href="/admin/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <Link href="/admin/subjects" className="hover:text-gray-600">Subjects</Link>
        <span>/</span>
        <span className="text-gray-700 font-bold">{subject.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-black text-gray-900">{subject.name}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${EXAM_COLORS[subject.exam_type] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {subject.exam_type}
              </span>
              {!subject.is_active && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-600 border border-red-200">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {allTopics.length} topics · {totalSubtopics} subtopics
            </p>
          </div>
          <Link
            href={`/admin/curriculum/${subjectSlug}`}
            className="text-xs font-bold px-3 py-2 border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Full Curriculum View →
          </Link>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-green-600 font-medium">✓ {totalPublished} published</span>
          <span className="text-amber-500 font-medium">⏳ {totalGenerated - totalPublished} in draft/review</span>
          <span className="text-gray-400">○ {totalSubtopics - totalGenerated} no lesson yet</span>
          <span className="ml-auto text-gray-400 font-bold">{pct}% live</span>
        </div>
      </div>

      {/* Topics list */}
      <div className="space-y-3">
        {allTopics.map(topic => {
          const subs       = topic.subtopics ?? []
          const pubCount   = subs.filter(s => s.lesson_status === 'published').length
          const topicPct   = subs.length > 0 ? Math.round((pubCount / subs.length) * 100) : 0

          return (
            <div key={topic.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Topic header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {topic.order_index}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{topic.name}</p>
                    <p className="text-xs text-gray-400">{subs.length} subtopics · {pubCount} published</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${EXAM_COLORS[topic.exam_type] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {topic.exam_type}
                  </span>
                  <Link
                    href={`/admin/subjects/${subjectSlug}/${topic.slug}`}
                    className="text-xs font-bold px-3 py-1.5 border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
                  >
                    Open →
                  </Link>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-gray-50">
                <div
                  className={`h-full transition-all ${topicPct === 100 ? 'bg-green-500' : 'bg-indigo-400'}`}
                  style={{ width: `${topicPct}%` }}
                />
              </div>

              {/* Subtopics preview — first 5 */}
              {subs.length > 0 && (
                <div className="divide-y divide-gray-50">
                  {subs.slice(0, 5).map(sub => (
                    <div key={sub.id} className="flex items-center justify-between px-4 py-2.5">
                      <p className="text-xs text-gray-600 truncate flex-1 mr-3">{sub.name}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[sub.lesson_status] ?? STATUS_COLORS.draft}`}>
                          {sub.lesson_status}
                        </span>
                        <Link
                          href={`/admin/subjects/${subjectSlug}/${topic.slug}/${sub.id}`}
                          className="text-xs text-indigo-500 hover:underline font-medium"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  ))}
                  {subs.length > 5 && (
                    <div className="px-4 py-2">
                      <Link
                        href={`/admin/subjects/${subjectSlug}/${topic.slug}`}
                        className="text-xs text-indigo-500 hover:underline"
                      >
                        + {subs.length - 5} more subtopics →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {allTopics.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <p className="text-3xl mb-3">📭</p>
            <p className="text-sm font-bold text-gray-700">No topics yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload the curriculum for {subject.name} to get started.</p>
            <Link
              href="/admin/curriculum/upload"
              className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-colors"
            >
              Upload Curriculum →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
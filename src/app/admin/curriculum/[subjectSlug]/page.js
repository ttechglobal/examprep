import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const EXAM_COLORS = {
  WAEC: 'bg-blue-100 text-blue-700 border-blue-200',
  JAMB: 'bg-purple-100 text-purple-700 border-purple-200',
  BOTH: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

export default async function CurriculumSubjectPage({ params }) {
  const { subjectSlug } = await params

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: subject } = await db
    .from('subjects')
    .select('id, name, slug, exam_type, waec_uploaded, jamb_uploaded, merged')
    .eq('slug', subjectSlug)
    .single()

  if (!subject) notFound()

  const { data: topics } = await db
    .from('topics')
    .select(`
      id, name, slug, exam_type, order_index,
      subtopics (
        id, lesson_status, lesson_generated
      )
    `)
    .eq('subject_id', subject.id)
    .order('order_index')

  const enrichedTopics = (topics ?? []).map(topic => {
    const subs = topic.subtopics ?? []
    return {
      ...topic,
      subtopic_count: subs.length,
      lessons_ready: subs.filter(s => s.lesson_generated).length,
      lessons_published: subs.filter(s => s.lesson_status === 'published').length,
    }
  })

  const totalSubtopics = enrichedTopics.reduce((a, t) => a + t.subtopic_count, 0)
  const totalReady = enrichedTopics.reduce((a, t) => a + t.lessons_ready, 0)
  const overallPct = totalSubtopics > 0
    ? Math.round((totalReady / totalSubtopics) * 100) : 0

  return (
    <div className="space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/admin/curriculum" className="hover:text-gray-600">Curriculum</Link>
        <span>/</span>
        <h1 className="text-gray-900 font-bold">{subject.name}</h1>
      </div>

      {/* Subject header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-black text-gray-900">{subject.name}</h2>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${EXAM_COLORS[subject.exam_type]}`}>
                {subject.exam_type}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {subject.waec_uploaded && <span className="text-xs font-medium text-blue-600">WAEC ✓</span>}
              {subject.jamb_uploaded && <span className="text-xs font-medium text-purple-600">JAMB ✓</span>}
              {subject.merged && <span className="text-xs font-medium text-green-600">Merged ✓</span>}
            </div>
          </div>
          <Link
            href="/admin/curriculum/upload"
            className="text-xs font-bold px-3 py-2 border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Upload new
          </Link>
        </div>

        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>{enrichedTopics.length} topics</span>
          <span>{totalSubtopics} subtopics</span>
          <span className="text-green-600 font-medium">{totalReady} lessons ready</span>
          <span className="text-amber-600 font-medium">{totalSubtopics - totalReady} pending</span>
          <span className="ml-auto font-bold text-gray-600">{overallPct}% complete</span>
        </div>
      </div>

      {/* Topics list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Topics</h2>
          <span className="text-xs text-gray-400">{enrichedTopics.length} topics</span>
        </div>

        {enrichedTopics.map(topic => {
          const pct = topic.subtopic_count > 0
            ? Math.round((topic.lessons_ready / topic.subtopic_count) * 100) : 0

          return (
            <Link
              key={topic.id}
              href={`/admin/curriculum/${subjectSlug}/${topic.slug}`}
              className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <span className="w-7 h-7 rounded-xl bg-gray-100 text-gray-600 text-xs font-black flex items-center justify-center flex-shrink-0">
                {topic.order_index}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{topic.name}</p>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 ${EXAM_COLORS[topic.exam_type] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {topic.exam_type}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{topic.subtopic_count} subtopics</span>
                  <span className="text-green-600 font-medium">{topic.lessons_ready} ready</span>
                  {topic.subtopic_count - topic.lessons_ready > 0 && (
                    <span className="text-amber-500">{topic.subtopic_count - topic.lessons_ready} pending</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-16">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-indigo-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className={`text-xs font-bold ${pct === 100 ? 'text-green-600' : 'text-gray-400'}`}>
                  {pct}%
                </span>
                <span className="text-gray-300">→</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Link from 'next/link'

const EXAM_COLORS = {
  WAEC: 'bg-blue-100 text-blue-700 border-blue-200',
  JAMB: 'bg-purple-100 text-purple-700 border-purple-200',
  BOTH: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

export default async function CurriculumIndexPage() {
  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: subjects } = await db
    .from('subjects')
    .select(`
      id, name, slug, exam_type, is_active,
      waec_uploaded, jamb_uploaded, merged,
      topics (
        id,
        subtopics ( id, lesson_generated, lesson_status )
      )
    `)
    .eq('is_active', true)
    .order('order_index')

  const enriched = (subjects ?? []).map(subject => {
    const allSubtopics = subject.topics.flatMap(t => t.subtopics)
    return {
      ...subject,
      topic_count: subject.topics.length,
      subtopic_count: allSubtopics.length,
      lessons_generated: allSubtopics.filter(s => s.lesson_generated).length,
      lessons_published: allSubtopics.filter(s => s.lesson_status === 'published').length,
    }
  })

  const totalSubtopics = enriched.reduce((a, s) => a + s.subtopic_count, 0)
  const totalGenerated = enriched.reduce((a, s) => a + s.lessons_generated, 0)
  const overallPct = totalSubtopics > 0
    ? Math.round((totalGenerated / totalSubtopics) * 100) : 0

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Curriculum</h1>
          <p className="text-gray-500 text-sm mt-1">
            Browse uploaded curricula and manage lesson content
          </p>
        </div>
        <Link
          href="/admin/curriculum/upload"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-colors"
        >
          Upload Curriculum
        </Link>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-700">Overall lesson completion</p>
          <p className="text-sm font-black text-gray-900">{overallPct}%</p>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {totalGenerated} of {totalSubtopics} subtopics have lessons generated
        </p>
      </div>

      {/* Subject cards */}
      <div className="space-y-3">
        {enriched.map(subject => {
          const pct = subject.subtopic_count > 0
            ? Math.round((subject.lessons_generated / subject.subtopic_count) * 100) : 0

          return (
            <Link
              key={subject.id}
              href={`/admin/curriculum/${subject.slug}`}
              className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{subject.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${EXAM_COLORS[subject.exam_type]}`}>
                      {subject.exam_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {subject.waec_uploaded && (
                      <span className="text-xs font-medium text-blue-600">WAEC ✓</span>
                    )}
                    {subject.jamb_uploaded && (
                      <span className="text-xs font-medium text-purple-600">JAMB ✓</span>
                    )}
                    {subject.merged && (
                      <span className="text-xs font-medium text-green-600">Merged ✓</span>
                    )}
                    {!subject.waec_uploaded && !subject.jamb_uploaded && (
                      <span className="text-xs text-gray-400">No curriculum yet</span>
                    )}
                  </div>
                </div>
                <span className={`text-sm font-black ${
                  pct === 100 ? 'text-green-600' :
                  pct >= 50 ? 'text-indigo-600' : 'text-gray-400'
                }`}>{pct}%</span>
              </div>

              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct === 100 ? 'bg-green-500' :
                    pct >= 50 ? 'bg-indigo-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>{subject.topic_count} topics</span>
                <span>{subject.subtopic_count} subtopics</span>
                <span className="text-green-600 font-medium">
                  {subject.lessons_generated} lessons ready
                </span>
                {subject.subtopic_count - subject.lessons_generated > 0 && (
                  <span className="text-amber-600 font-medium">
                    {subject.subtopic_count - subject.lessons_generated} pending
                  </span>
                )}
              </div>
            </Link>
          )
        })}

        {enriched.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-gray-500 text-sm mb-3">No curricula uploaded yet.</p>
            <Link
              href="/admin/curriculum/upload"
              className="text-sm font-bold text-indigo-600 hover:underline"
            >
              Upload your first curriculum →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
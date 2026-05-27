import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Get all subjects with topic and subtopic counts
  const { data: subjects } = await supabase
    .from('subjects')
    .select(`
      id, name, slug, exam_type,
      topics (
        id,
        subtopics (
          id, lesson_status
        )
      )
    `)
    .order('order_index')

  const stats = (subjects ?? []).map(subject => {
    const allSubtopics = subject.topics.flatMap(t => t.subtopics)
    const total = allSubtopics.length
    const published = allSubtopics.filter(s => s.lesson_status === 'published').length
    const inReview = allSubtopics.filter(s => s.lesson_status === 'in_review').length
    const draft = allSubtopics.filter(s => s.lesson_status === 'draft').length
    const pct = total > 0 ? Math.round((published / total) * 100) : 0

    return {
      ...subject,
      total,
      published,
      inReview,
      draft,
      pct,
    }
  })

  const totalSubtopics = stats.reduce((a, s) => a + s.total, 0)
  const totalPublished = stats.reduce((a, s) => a + s.published, 0)
  const totalInReview = stats.reduce((a, s) => a + s.inReview, 0)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage lessons across all subjects
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Published', value: totalPublished, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'In Review', value: totalInReview, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Lessons', value: totalSubtopics, color: 'text-gray-700', bg: 'bg-gray-50' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Subject list */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-gray-900">Subjects</h2>
        {stats.map(subject => (
          <Link
            key={subject.id}
            href={`/admin/subjects/${subject.slug}`}
            className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900">{subject.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{subject.exam_type}</p>
              </div>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                subject.pct === 100
                  ? 'bg-green-100 text-green-700'
                  : subject.pct >= 50
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {subject.pct}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 rounded-full mb-3">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${subject.pct}%` }}
              />
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs">
              <span className="text-green-600 font-medium">
                ✓ {subject.published} published
              </span>
              {subject.inReview > 0 && (
                <span className="text-blue-600 font-medium">
                  ● {subject.inReview} in review
                </span>
              )}
              {subject.draft > 0 && (
                <span className="text-gray-400">
                  ○ {subject.draft} draft
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
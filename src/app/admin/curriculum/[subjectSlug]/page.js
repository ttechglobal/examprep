// src/app/admin/curriculum/[subjectSlug]/page.js  (REPLACE existing file)
// Adds a "Prerequisites" tab to the subject page alongside the existing curriculum viewer.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CurriculumViewerClient from '@/components/admin/CurriculumViewerClient'
import PrerequisiteMapEditor from '@/components/admin/PrerequisiteMapEditor'

const EXAM_COLORS = {
  WAEC: 'bg-blue-100 text-blue-700 border-blue-200',
  JAMB: 'bg-purple-100 text-purple-700 border-purple-200',
  BOTH: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

export default async function SubjectCurriculumPage({ params, searchParams }) {
  const { subjectSlug }  = await params
  const { tab = 'topics' } = await searchParams

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: subject } = await db
    .from('subjects')
    .select(`
      id, name, slug, exam_type, is_active,
      waec_uploaded, jamb_uploaded, merged,
      prereq_map_status, prereq_depth, prereq_pass_threshold
    `)
    .eq('slug', subjectSlug)
    .single()

  if (!subject) notFound()

  const { data: topics } = await db
    .from('topics')
    .select(`
      id, name, slug, exam_type, order_index,
      subtopics ( id, name, slug, lesson_generated, lesson_status, exam_type, order_index, objectives )
    `)
    .eq('subject_id', subject.id)
    .order('order_index')

  const enrichedTopics = (topics ?? []).map(topic => {
    const subs = topic.subtopics ?? []
    return {
      ...topic,
      subtopic_count:    subs.length,
      lessons_ready:     subs.filter(s => s.lesson_generated).length,
      lessons_published: subs.filter(s => s.lesson_status === 'published').length,
    }
  })

  const totalSubtopics = enrichedTopics.reduce((a, t) => a + t.subtopic_count, 0)
  const totalReady     = enrichedTopics.reduce((a, t) => a + t.lessons_ready, 0)
  const overallPct     = totalSubtopics > 0
    ? Math.round((totalReady / totalSubtopics) * 100) : 0

  const prereqStatus = subject.prereq_map_status ?? 'none'

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
              {prereqStatus === 'approved' && (
                <span className="text-xs font-medium text-emerald-600">Prerequisites ✓</span>
              )}
              {prereqStatus === 'draft' && (
                <span className="text-xs font-medium text-amber-600">Prerequisites — needs approval</span>
              )}
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

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {[
          { id: 'topics',        label: `Topics (${enrichedTopics.length})` },
          {
            id: 'prerequisites',
            label: prereqStatus === 'approved'
              ? '🗺 Prerequisites ✓'
              : prereqStatus === 'draft'
              ? '🗺 Prerequisites ●'
              : '🗺 Prerequisites',
          },
        ].map(t => (
          <Link
            key={t.id}
            href={`/admin/curriculum/${subjectSlug}?tab=${t.id}`}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Tab: Topics */}
      {tab === 'topics' && (
        <CurriculumViewerClient
          subject={subject}
          topics={enrichedTopics}
        />
      )}

      {/* Tab: Prerequisites */}
      {tab === 'prerequisites' && (
        <PrerequisiteMapEditor
          subject={subject}
          topics={enrichedTopics}
        />
      )}
    </div>
  )
}
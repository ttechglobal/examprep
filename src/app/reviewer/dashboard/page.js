import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ReviewerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get all in_review lessons
  const { data: subtopics } = await supabase
    .from('subtopics')
    .select(`
      id, name, slug, lesson_status, updated_at,
      topics (
        name,
        subjects ( name, slug )
      )
    `)
    .eq('lesson_status', 'in_review')
    .order('updated_at', { ascending: false })

  // Get lessons this reviewer has already commented on
  const { data: myReviews } = await supabase
    .from('lesson_reviews')
    .select('subtopic_id, resolved, created_at')
    .eq('reviewer_id', user.id)

  const reviewedIds = new Set(myReviews?.map(r => r.subtopic_id) ?? [])

  const pending = (subtopics ?? []).filter(s => !reviewedIds.has(s.id))
  const reviewed = (subtopics ?? []).filter(s => reviewedIds.has(s.id))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviewer Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Review lessons before they go live to students.
        </p>
      </div>

      {/* Pending review */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-bold text-gray-900">Needs your review</h2>
          {pending.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="bg-card rounded-2xl border border-gray-200 p-6 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-gray-500 text-sm">All caught up! No lessons waiting for review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(subtopic => (
              <Link
                key={subtopic.id}
                href={`/reviewer/lessons/${subtopic.id}`}
                className="flex items-center justify-between bg-card rounded-2xl border border-orange-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{subtopic.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {subtopic.topics?.subjects?.name} · {subtopic.topics?.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full">
                    Awaiting review
                  </span>
                  <span className="text-gray-400 text-sm">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Already reviewed */}
      {reviewed.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-4">Already reviewed</h2>
          <div className="space-y-3">
            {reviewed.map(subtopic => (
              <Link
                key={subtopic.id}
                href={`/reviewer/lessons/${subtopic.id}`}
                className="flex items-center justify-between bg-card rounded-2xl border border-gray-200 p-4 hover:border-indigo-200 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">{subtopic.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {subtopic.topics?.subjects?.name} · {subtopic.topics?.name}
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
                  Reviewed
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
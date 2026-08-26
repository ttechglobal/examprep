// src/app/api/student/mastery/route.js — v1 (clean rebuild)
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/mastery?exam=WAEC
//
// Returns subject-level mastery for the progress page.
// Aggregates topic mastery scores up to subject level.
//
// Response:
// {
//   subjects: [{
//     subject_id, subject_name,
//     accuracy,         // 0-100, weighted average of topic scores
//     questions,        // total attempts across all topics
//     topic_count,      // number of topics with any data
//   }]
// }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const exam = searchParams.get('exam') ?? 'WAEC'

    const service = db()

    // Get student's mastery rows with topic → subject join
    const { data: masteryRows, error } = await service
      .from('student_topic_mastery')
      .select(`
        topic_id, score, attempt_count, subject_id,
        topics ( id, name, subject_id,
          subjects ( id, name )
        )
      `)
      .eq('student_id', user.id)

    if (error) {
      console.error('[mastery] query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Aggregate to subject level
    const subjectMap = {}

    for (const row of masteryRows ?? []) {
      const subj = row.topics?.subjects
      if (!subj) continue
      const sid = subj.id

      if (!subjectMap[sid]) {
        subjectMap[sid] = {
          subject_id:   sid,
          subject_name: subj.name,
          scoreSum:     0,
          topicCount:   0,
          questions:    0,
        }
      }

      subjectMap[sid].scoreSum   += (row.score ?? 0)
      subjectMap[sid].topicCount += 1
      subjectMap[sid].questions  += (row.attempt_count ?? 0)
    }

    const subjects = Object.values(subjectMap).map(s => ({
      subject_id:   s.subject_id,
      subject_name: s.subject_name,
      accuracy:     s.topicCount > 0 ? Math.round(s.scoreSum / s.topicCount) : 0,
      questions:    s.questions,
      topic_count:  s.topicCount,
    })).sort((a, b) => b.accuracy - a.accuracy)

    return NextResponse.json(
      { subjects, exam },
      { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } }
    )
  } catch (err) {
    console.error('[student/mastery] unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
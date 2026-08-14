// src/app/api/student/mastery/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET — returns this student's topic mastery rows, enriched with topic name,
// subject_id, and subject name. Uses the service role key so it can read
// student_topic_mastery, which is not exposed in the PostgREST anon schema.
//
// Response shape:
// {
//   mastery: [
//     { topic_id, score, attempt_count, topic_name, subject_id, subject_name }
//   ]
// }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }        from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'
import { NextResponse }        from 'next/server'

const serviceClient = () =>
  svc(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

export async function GET() {
  // 1. Authenticate via the anon client (session cookie)
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = serviceClient()

  // 2. Fetch mastery rows (service role required — table not in anon schema)
  const { data: masteryRows, error: masteryErr } = await db
    .from('student_topic_mastery')
    .select('topic_id, score, attempt_count')
    .eq('student_id', user.id)
    .order('score', { ascending: true })

  if (masteryErr) {
    console.warn('[/api/student/mastery] fetch error:', masteryErr.message)
    return NextResponse.json({ mastery: [] })
  }

  const rows = masteryRows ?? []
  if (rows.length === 0) return NextResponse.json({ mastery: [] })

  // 3. Fetch topic metadata in one query
  const topicIds = [...new Set(rows.map(r => r.topic_id).filter(Boolean))]
  const { data: topicRows } = await db
    .from('topics')
    .select('id, name, subject_id')
    .in('id', topicIds)

  const topicMap = {}
  for (const t of topicRows ?? []) topicMap[t.id] = t

  // 4. Fetch subject names in one query
  const subjectIds = [...new Set((topicRows ?? []).map(t => t.subject_id).filter(Boolean))]
  const { data: subjectRows } = subjectIds.length
    ? await db.from('subjects').select('id, name').in('id', subjectIds)
    : { data: [] }

  const subjectMap = {}
  for (const s of subjectRows ?? []) subjectMap[s.id] = s.name

  // 5. Enrich and return
  const mastery = rows
    .map(row => {
      const topic = topicMap[row.topic_id]
      if (!topic) return null
      const subject_name = subjectMap[topic.subject_id]
      if (!subject_name) return null
      return {
        topic_id:      row.topic_id,
        score:         row.score,
        attempt_count: row.attempt_count,
        topic_name:    topic.name,
        subject_id:    topic.subject_id,
        subject_name,
      }
    })
    .filter(Boolean)

  return NextResponse.json({ mastery })
}
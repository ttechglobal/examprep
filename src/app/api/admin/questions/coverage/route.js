// src/app/api/admin/questions/coverage/route.js
// GET /api/admin/questions/coverage?subjectId=<uuid>[&examType=WAEC]
// Powers CoverageChart on the admin Past Questions page: past-paper questions
// per topic. Reads the same topic_frequency() as the Topic Frequency page, so
// the numbers match and aren't capped at 1,000 rows. Past papers only: an
// AI-generated question never counts towards how often a topic is examined.
// Returns [{ topic_id, topic_name, order_index, count }].

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { getTopicFrequency } from '@/lib/server/topicFrequency'

export async function GET(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })

  try {
    const { topics } = await getTopicFrequency(supabaseAdmin(), subjectId, searchParams.get('examType'))
    return NextResponse.json(topics.map(t => ({
      topic_id:    t.topic_id,
      topic_name:  t.topic_name,
      order_index: t.order_index,
      count:       t.past_count,
    })))
  } catch (e) {
    console.error('[admin/questions/coverage]', e?.message ?? e)
    return NextResponse.json({ error: 'Could not load coverage' }, { status: 500 })
  }
}

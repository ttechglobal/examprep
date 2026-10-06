// src/app/api/admin/frequency/route.js
// GET /api/admin/frequency?subjectId=<uuid>[&examType=WAEC]
// Topics of a subject ranked by how often they appear across past papers:
// { exam, total_years, total_questions, topics: [{ topic_id, topic_name,
//   past_count, years_appeared, total_years, share_pct, bank_count, rank }] }

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { getTopicFrequency } from '@/lib/server/topicFrequency'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  const examType  = searchParams.get('examType')
  if (!subjectId || !UUID_RE.test(subjectId)) {
    return NextResponse.json({ error: 'subjectId required' }, { status: 400 })
  }

  try {
    const result = await getTopicFrequency(supabaseAdmin(), subjectId, examType)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[admin/frequency]', e?.message ?? e)
    return NextResponse.json({ error: 'Could not load topic frequency' }, { status: 500 })
  }
}

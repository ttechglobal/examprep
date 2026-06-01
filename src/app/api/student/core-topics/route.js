// src/app/api/student/core-topics/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Student-facing read-only endpoint — returns core topic IDs for given subjects.
// Used by the study plan page to badge high-priority topics.
//
// GET /api/student/core-topics?subjectIds=id1,id2&examType=WAEC
//   → { topicIds: string[] }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fetchCoreTopicMap } from '@/lib/topicSequencer'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ topicIds: [] })

  const { searchParams } = new URL(request.url)
  const subjectIds = searchParams.get('subjectIds')?.split(',').filter(Boolean) ?? []
  const examType   = searchParams.get('examType') ?? 'WAEC'

  if (!subjectIds.length) return NextResponse.json({ topicIds: [] })

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const coreMap = await fetchCoreTopicMap(db, subjectIds, examType)

  // Flatten to a unique set of topic IDs across all subjects
  const topicIds = [...new Set(Object.values(coreMap).flat())]

  return NextResponse.json({ topicIds })
}
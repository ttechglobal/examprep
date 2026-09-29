// src/app/api/admin/myquest/fetchbatch/route.js
// ─────────────────────────────────────────────────────────────────────────────
// MyQuest API — Fetch a full paper for the enrichment prompt.
// Called by: app/admin/questions/myquest-import/page.js
//
// GET /api/admin/myquest/fetchbatch?exam=JAMB&exam_year_id=1999&subject=Government
//   exam, exam_year_id and subject are values from /api/admin/myquest/meta.
//
// 200 → { questions, count, total, truncated, noData, message? }
//   total     = MyQuest's pagination.total for the paper
//   truncated = the paper had more than MAX_PAGES pages (see lib/server/myquest)
// 4xx/5xx → { error }
//
// v2 (29 Sep 2026): fetches every page of the paper. v1 stopped at 50 and only
// asked for page 2 when page 1 had fewer than 50 — MyQuest pages are exactly 50,
// so questions 51+ were always dropped. Params are MyQuest's own values, and
// auth / HTTP failures are errors instead of "no data".
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { fetchAllQuestions, MyQuestError, isShortText } from '@/lib/server/myquest'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const exam       = searchParams.get('exam')
  const examYearId = searchParams.get('exam_year_id')
  const subject    = searchParams.get('subject')

  if (!isShortText(exam) || !isShortText(examYearId) || !isShortText(subject)) {
    return NextResponse.json({ error: 'exam, exam_year_id and subject are required' }, { status: 400 })
  }

  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const result = await fetchAllQuestions({ exam, examYearId, subject })
    if (!result.questions.length) {
      return NextResponse.json({ questions: [], count: 0, total: 0, truncated: false, noData: true, message: result.message })
    }
    return NextResponse.json({
      questions: result.questions,
      count: result.questions.length,
      total: result.total,
      truncated: result.truncated,
      noData: false,
    })
  } catch (err) {
    console.error('[myquest/fetchbatch]', err.message)
    const status = err instanceof MyQuestError ? err.status : 500
    const message = err instanceof MyQuestError ? err.message : 'Fetch failed'
    return NextResponse.json({ error: message }, { status })
  }
}

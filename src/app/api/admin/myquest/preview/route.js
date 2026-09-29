// src/app/api/admin/myquest/preview/route.js
// ─────────────────────────────────────────────────────────────────────────────
// MyQuest API — Preview endpoint
// Returns up to 5 questions so admin can verify quality before importing.
// Called by: app/admin/questions/myquest-import/page.js
//
// GET /api/admin/myquest/preview?exam=JAMB&exam_year_id=1999&subject=Government
//   exam, exam_year_id and subject are values from /api/admin/myquest/meta.
//
// 200 → { questions, count, total, noData, message? }
// 4xx/5xx → { error }
//
// v2 (29 Sep 2026): params are MyQuest's own exam / exam_year_id / subject
// values (was a made-up slug + parseInt(year)). Transport and auth failures
// now come back as errors instead of "no data". Uses lib/server/myquest.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { fetchQuestionPage, MyQuestError, isShortText } from '@/lib/server/myquest'

const PREVIEW_SIZE = 5

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
    const page = await fetchQuestionPage({ exam, examYearId, subject, page: 1 })
    if (!page.questions.length) {
      return NextResponse.json({ questions: [], count: 0, total: 0, noData: true, message: page.message })
    }

    const questions = page.questions.slice(0, PREVIEW_SIZE)
    return NextResponse.json({
      questions,
      count: questions.length,
      total: Number(page.pagination?.total) || page.questions.length,
      noData: false,
    })
  } catch (err) {
    console.error('[myquest/preview]', err.message)
    const status = err instanceof MyQuestError ? err.status : 500
    const message = err instanceof MyQuestError ? err.message : 'Preview failed'
    return NextResponse.json({ error: message }, { status })
  }
}

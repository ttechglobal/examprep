// src/app/api/admin/myquest/meta/route.js
// ─────────────────────────────────────────────────────────────────────────────
// MyQuest API — exam, year and subject lists for the import page dropdowns.
// Called by: app/admin/questions/myquest-import/page.js
//
// GET /api/admin/myquest/meta?get=exam
// GET /api/admin/myquest/meta?get=exam_year_id&exam=JAMB
// GET /api/admin/myquest/meta?get=subject&exam=JAMB&exam_year_id=2001
//
// 200 → { items: [{ value, label }], total, message, rawSample }
//        `value` is what the next call must send back to MyQuest unchanged.
//        `message` is set (and items empty) when MyQuest has no entries.
//        `rawSample` is the first few raw items, so the admin can see the shape.
// 4xx/5xx → { error }
//
// v1 (29 Sep 2026): new. The import page used a hard-coded subject map and a
// made-up 1999→today year list instead of asking MyQuest.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { listCatalog, MyQuestError, isShortText } from '@/lib/server/myquest'

const KINDS = new Set(['exam', 'exam_year_id', 'subject'])

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const kind       = searchParams.get('get')
  const exam       = searchParams.get('exam')
  const examYearId = searchParams.get('exam_year_id')

  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: 'get must be one of: exam, exam_year_id, subject' }, { status: 400 })
  }
  if (kind !== 'exam' && !isShortText(exam)) {
    return NextResponse.json({ error: 'exam is required' }, { status: 400 })
  }
  if (kind === 'subject' && !isShortText(examYearId)) {
    return NextResponse.json({ error: 'exam_year_id is required' }, { status: 400 })
  }

  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const result = await listCatalog(kind, { exam, examYearId })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error('[myquest/meta]', kind, err.message)
    const status = err instanceof MyQuestError ? err.status : 500
    const message = err instanceof MyQuestError ? err.message : 'Could not load the list from MyQuest'
    return NextResponse.json({ error: message }, { status })
  }
}

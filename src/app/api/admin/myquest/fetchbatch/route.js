// src/app/api/admin/myquest/fetchbatch/route.js
// ─────────────────────────────────────────────────────────────────────────────
// MyQuest API — Fetch full batch for enrichment prompt
// Fetches all available questions (paginates if needed, caps at 50).
//
// GET /api/admin/myquest/fetchbatch?subject=mathematics&exam=WAEC&year=2024&limit=50
//
// NOTE: exam_year_id is sent as a number to MyQuest (parseInt), not a string.
// ─────────────────────────────────────────────────────────────────────────────

import { requireAdmin } from '@/lib/adminAuth'
import { NextResponse } from 'next/server'

const MYQUEST_BASE = 'https://api.myquest.com.ng/api'

function getApiKey() {
  const key = process.env.MYQUEST_API_KEY
  if (!key) throw new Error('MYQUEST_API_KEY environment variable is not set')
  return key
}

async function fetchPage({ subject, exam, year, page }) {
  const res = await fetch(`${MYQUEST_BASE}/questions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    // exam_year_id must be a number per MyQuest API spec
    body: JSON.stringify({ exam, exam_year_id: parseInt(year, 10), subject, page }),
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  })

  let json
  try { json = await res.json() } catch {
    throw new Error(`MyQuest returned non-JSON (HTTP ${res.status})`)
  }

  // Treat any non-success as noData rather than a hard error
  if (!json?.success) {
    return { noData: true, questions: [], pagination: null, message: json?.message ?? 'No data' }
  }

  const questions  = json.data?.questions ?? []
  const pagination = json.data?.pagination ?? null
  return { noData: !questions.length, questions, pagination }
}

export async function GET(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const subject = searchParams.get('subject')
  const exam    = searchParams.get('exam')
  const year    = searchParams.get('year')
  const limit   = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 50)

  if (!subject || !exam || !year) {
    return NextResponse.json({ error: 'subject, exam, and year are required' }, { status: 400 })
  }

  try {
    const page1 = await fetchPage({ subject, exam, year, page: 1 })

    if (page1.noData) {
      return NextResponse.json({
        questions: [], count: 0, noData: true,
        message: page1.message ?? 'No questions for this combination',
      })
    }

    let allQuestions = [...page1.questions]
    const totalPages = page1.pagination?.total_pages ?? 1

    // Fetch page 2 if needed
    if (totalPages > 1 && allQuestions.length < limit) {
      try {
        const page2 = await fetchPage({ subject, exam, year, page: 2 })
        if (!page2.noData) {
          allQuestions = [...allQuestions, ...page2.questions]
        }
      } catch {
        // non-fatal — proceed with page 1 only
      }
    }

    const questions = allQuestions.slice(0, limit)
    return NextResponse.json({ questions, count: questions.length, noData: false })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
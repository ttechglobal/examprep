// src/app/api/admin/myquest/preview/route.js
// ─────────────────────────────────────────────────────────────────────────────
// MyQuest API — Preview endpoint
// Returns up to 5 questions so admin can verify quality before importing.
//
// GET /api/admin/myquest/preview?subject=physics&exam=WAEC&year=2023
// ─────────────────────────────────────────────────────────────────────────────

import { requireAdmin } from '@/lib/adminAuth'
import { NextResponse } from 'next/server'

const MYQUEST_BASE = 'https://api.myquest.com.ng/api'

function getApiKey() {
  const key = process.env.MYQUEST_API_KEY
  if (!key) throw new Error('MYQUEST_API_KEY environment variable is not set')
  return key
}

// Fetch questions from MyQuest — never cached
async function myquestFetch({ subject, exam, year, page = 1 }) {
  const res = await fetch(`${MYQUEST_BASE}/questions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ exam, exam_year_id: parseInt(year, 10), subject, page }),
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  })

  let json
  try { json = await res.json() } catch {
    throw new Error(`MyQuest returned non-JSON response (HTTP ${res.status})`)
  }

  if (!res.ok) {
    throw new Error(json.message ?? `MyQuest API error ${res.status}`)
  }

  if (!json.success) {
    return { noData: true, questions: [], message: json.message ?? 'No questions found' }
  }

  const questions = json.data?.questions ?? []
  if (!questions.length) {
    return { noData: true, questions: [], message: 'No questions for this combination' }
  }

  return { noData: false, questions, pagination: json.data?.pagination ?? null }
}

export async function GET(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const subject = searchParams.get('subject')
  const exam    = searchParams.get('exam')
  const year    = searchParams.get('year')

  if (!subject || !exam || !year) {
    return NextResponse.json(
      { error: 'subject, exam, and year are required' },
      { status: 400 }
    )
  }

  try {
    const result = await myquestFetch({ subject, exam, year, page: 1 })

    if (result.noData) {
      return NextResponse.json({
        questions: [],
        count: 0,
        noData: true,
        message: result.message,
      })
    }

    // Return only first 5 for preview
    const preview = result.questions.slice(0, 5)
    return NextResponse.json({
      questions: preview,
      count: preview.length,
      total: result.pagination?.total ?? result.questions.length,
      noData: false,
      // Debug: raw shape of first question so admin can see all fields
      _raw_sample: result.questions[0] ?? null,
    })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
// src/app/api/admin/sdash/preview/route.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// FIXES from v1:
//   • Removed next:{revalidate:3600} from question fetches — was caching 404s
//     for 1hr and making ALL wassce requests fail after first miss
//   • sdashGet now reads the response body even on !res.ok to surface real message
//   • Handles both HTTP-level 404 AND json-level status:404 from SdashAPI
//   • Cache only applied to static lists (subjects, years, exams) not questions
//   • Returns 404 as a clean {noData:true} response instead of 502
// ─────────────────────────────────────────────────────────────────────────────

import { requireAdmin } from '@/lib/adminAuth'
import { NextResponse } from 'next/server'

const SDASH_BASE = 'https://sdashapi.com/api'

function getApiKey() {
  const key = process.env.SDASH_API_KEY
  if (!key) throw new Error('SDASH_API_KEY environment variable is not set')
  return key
}

// Fetch a static list (subjects / years / exams) — cached 1 hour
async function sdashGetStatic(path) {
  const res = await fetch(`${SDASH_BASE}${path}`, {
    headers: { AccessToken: getApiKey() },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(20_000),
  })
  const json = await res.json()
  if (!res.ok || (json.status && json.status !== 200)) {
    throw new Error(json.message ?? `SdashAPI error ${res.status}`)
  }
  return json.data
}

// Fetch questions — NEVER cached (avoids caching 404s for year/subject combos)
async function sdashGetQuestions(params) {
  const url = `${SDASH_BASE}/v1/q?${params}`
  const res = await fetch(url, {
    headers: { AccessToken: getApiKey() },
    cache: 'no-store',            // ← critical: never cache question results
    signal: AbortSignal.timeout(25_000),
  })

  // Always read body first, regardless of HTTP status
  let json
  try { json = await res.json() } catch {
    throw new Error(`SdashAPI returned non-JSON response (HTTP ${res.status})`)
  }

  // SdashAPI mirrors status in both HTTP code and json.status
  // A 404 means no questions matched — not a server error
  const status = json.status ?? res.status
  if (status === 404) {
    return { noData: true, message: json.message ?? 'No questions found for these filters' }
  }
  if (status !== 200) {
    throw new Error(json.message ?? `SdashAPI error ${status}`)
  }

  const data = json.data
  const questions = Array.isArray(data) ? data : data ? [data] : []
  return { noData: false, questions }
}

export async function GET(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const mode    = searchParams.get('mode') ?? 'questions'
  const subject = searchParams.get('subject')
  const type    = searchParams.get('type')
  const year    = searchParams.get('year')

  try {
    if (mode === 'subjects') {
      const data = await sdashGetStatic('/v1/subjects')
      return NextResponse.json({ subjects: Array.isArray(data) ? data : [] })
    }
    if (mode === 'years') {
      const data = await sdashGetStatic('/v1/years')
      return NextResponse.json({ years: Array.isArray(data) ? data : [] })
    }
    if (mode === 'exams') {
      const data = await sdashGetStatic('/v1/exams')
      return NextResponse.json({ exams: Array.isArray(data) ? data : [] })
    }

    // mode === 'questions'
    if (!subject || !type || !year) {
      return NextResponse.json(
        { error: 'subject, type, and year are required' },
        { status: 400 }
      )
    }

    const params = new URLSearchParams({ subject, type, year, limit: '5' })
    const result = await sdashGetQuestions(params)

    if (result.noData) {
      // Return 200 with noData flag — NOT a 502 — so the UI can show a helpful message
      return NextResponse.json({
        questions: [],
        count: 0,
        noData: true,
        message: result.message,
      })
    }

    return NextResponse.json({
      questions: result.questions,
      count: result.questions.length,
      noData: false,
    })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
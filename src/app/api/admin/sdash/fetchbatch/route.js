// src/app/api/admin/sdash/fetchbatch/route.js
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SDASH_BASE = 'https://sdashapi.com/api'

/** @param {import('next/server').NextRequest} request */
export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const subject = searchParams.get('subject')
  const type    = searchParams.get('type')
  const year    = searchParams.get('year')
  const limit   = Math.min(parseInt(searchParams.get('limit') ?? '50'), 50)

  if (!subject || !type || !year) {
    return NextResponse.json({ error: 'subject, type, and year are required' }, { status: 400 })
  }

  const apiKey = process.env.SDASH_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'SDASH_API_KEY not configured' }, { status: 500 })

  try {
    const params = new URLSearchParams({ subject, type, year, limit: String(limit) })
    const res = await fetch(`${SDASH_BASE}/v1/q?${params}`, {
      headers: { AccessToken: apiKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    })

    let json
    try { json = await res.json() } catch {
      return NextResponse.json({ error: `SdashAPI returned non-JSON (HTTP ${res.status})` }, { status: 502 })
    }

    const status = json.status ?? res.status
    if (status === 404) {
      return NextResponse.json({ questions: [], count: 0, noData: true, message: json.message ?? 'No questions found' })
    }
    if (status !== 200) {
      return NextResponse.json({ error: json.message ?? `SdashAPI error ${status}` }, { status: 502 })
    }

    const data = json.data
    const questions = Array.isArray(data) ? data : data ? [data] : []
    return NextResponse.json({ questions, count: questions.length, noData: false })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
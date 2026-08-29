// src/app/api/admin/sdash/import/route.js
// ─────────────────────────────────────────────────────────────────────────────
// SdashAPI Import Engine
//
// POST /api/admin/sdash/import
//
// Fetches questions from SdashAPI (sdashapi.com) for a given subject + exam type
// + year, maps them to ExamPrep's question schema, deduplicates against existing
// records, and bulk-inserts into the `questions` table.
//
// Body params:
//   sdashSubject  string   — SdashAPI subject slug (e.g. "mathematics", "physics")
//   sdashType     string   — SdashAPI exam type slug ("utme" | "wassce" | "neco" | "post-utme")
//   year          string   — 4-digit year string e.g. "2023"
//   subjectId     string   — ExamPrep subjects.id (UUID) to tag questions under
//   examType      string   — ExamPrep exam_type ("WAEC" | "JAMB")
//   limit         number?  — max questions to fetch per batch (default 50, max 50)
//   dryRun        boolean? — if true, returns what would be imported without saving
//
// Returns:
//   { fetched, new: N, duplicate: N, saved: N, errors: [...], questions: [...] }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/adminAuth'
import { NextResponse } from 'next/server'

const SDASH_BASE = 'https://sdashapi.com/api'

const svc = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

// ── Map SdashAPI exam type → ExamPrep exam_type ───────────────────────────────
function toExamPrepType(sdashType) {
  const map = {
    utme: 'JAMB',
    wassce: 'WAEC',
    waec: 'WAEC',
    neco: 'WAEC', // store NECO under WAEC bucket for now
    'post-utme': 'JAMB',
    university: 'JAMB',
  }
  return map[sdashType?.toLowerCase()] ?? 'WAEC'
}

// ── Estimate difficulty from question text heuristics ─────────────────────────
// SdashAPI doesn't provide difficulty — we infer it cheaply.
function inferDifficulty(q) {
  const text = (q.question ?? '').toLowerCase()
  const hardKeywords = [
    'derive', 'prove', 'calculate', 'determine', 'evaluate',
    'differentiate', 'integrate', 'synthesis', 'analyse', 'justify',
  ]
  const easyKeywords = [
    'which', 'what is', 'define', 'identify', 'name', 'state', 'list',
  ]
  const hasHard = hardKeywords.some(k => text.includes(k))
  const hasEasy = easyKeywords.some(k => text.includes(k))
  if (hasHard) return 'hard'
  if (hasEasy) return 'easy'
  return 'medium'
}

// ── Map a single SdashAPI question → ExamPrep question row ───────────────────
function mapQuestion(sdashQ, { subjectId, examType, year }) {
  const options = {}
  if (sdashQ.option) {
    for (const [key, val] of Object.entries(sdashQ.option)) {
      if (val != null && String(val).trim()) {
        options[key] = String(val).trim()
      }
    }
  }

  // Build explanation in ExamPrep's { correct, workings } shape
  const explanation = {}
  if (sdashQ.solution) {
    const sol = String(sdashQ.solution).trim()
    explanation.correct = sol
    explanation.workings = []
  }

  const hasImage = !!(sdashQ.image && String(sdashQ.image).startsWith('http'))

  return {
    subject_id:       subjectId,
    exam_type:        examType,
    source:           'past_paper',
    year:             sdashQ.examyear ?? year,
    question_text:    String(sdashQ.question ?? '').trim(),
    options,
    correct_answer:   String(sdashQ.answer ?? '').toLowerCase().trim(),
    explanation:      Object.keys(explanation).length ? explanation : null,
    difficulty:       inferDifficulty(sdashQ),
    has_image:        hasImage,
    image_url:        hasImage ? sdashQ.image : null,
    // Section / passage text (for grouped reading questions)
    passage_text:     sdashQ.section ? String(sdashQ.section).trim() : null,
    // Store the original SdashAPI question ID so we can deduplicate later
    sdash_id:         sdashQ.id ? String(sdashQ.id) : null,
    // topic_id / subtopic_id are NULL until admin tags them
    topic_id:         null,
    subtopic_id:      null,
    is_active:        true,
    is_flagged:       false,
  }
}

// ── Fetch all questions for a subject+type+year from SdashAPI ─────────────────
// SdashAPI returns max 50 per request with no pagination offset, so for a full
// year we fetch in a single call (WAEC/JAMB papers have ≤ 50 OBJ questions).
async function fetchFromSdash({ sdashSubject, sdashType, year, limit = 50 }) {
  const apiKey = process.env.SDASH_API_KEY
  if (!apiKey) throw new Error('SDASH_API_KEY environment variable is not set')

  const params = new URLSearchParams({
    subject: sdashSubject,
    type:    sdashType,
    year:    year,
    limit:   String(Math.min(limit, 50)),
  })

  const url = `${SDASH_BASE}/v1/q?${params}`
  const res = await fetch(url, {
    headers: { AccessToken: apiKey },
    cache: 'no-store',   // never cache question results — avoids persisting 404s
    signal: AbortSignal.timeout(30_000),
  })

  // Always read body regardless of HTTP status
  let json
  try { json = await res.json() } catch {
    throw new Error(`SdashAPI returned non-JSON (HTTP ${res.status})`)
  }

  const status = json.status ?? res.status

  // 404 = no data for this combo — not an error, just empty
  if (status === 404) {
    return { noData: true, questions: [], message: json.message ?? 'No questions found' }
  }
  if (status !== 200) {
    throw new Error(`SdashAPI error ${status}: ${json.message ?? JSON.stringify(json).slice(0, 200)}`)
  }

  const raw = Array.isArray(json.data) ? json.data : json.data ? [json.data] : []
  return { noData: false, questions: raw }
}

// ── Deduplicate: remove questions already in DB (by sdash_id or text hash) ───
async function deduplicateQuestions(db, questions, subjectId, examType) {
  if (!questions.length) return { newQuestions: [], duplicates: 0 }

  // 1. Check by sdash_id (fastest — exact match)
  const sdashIds = questions.map(q => q.sdash_id).filter(Boolean)
  let existingSdashIds = new Set()

  if (sdashIds.length) {
    const { data: existing } = await db
      .from('questions')
      .select('sdash_id')
      .eq('subject_id', subjectId)
      .eq('exam_type', examType)
      .in('sdash_id', sdashIds)

    existingSdashIds = new Set((existing ?? []).map(r => r.sdash_id))
  }

  // 2. For questions without sdash_id, check by first 120 chars of question_text
  const withoutId = questions.filter(q => !q.sdash_id || !existingSdashIds.has(q.sdash_id))
  let existingTexts = new Set()

  if (withoutId.length) {
    const textPrefixes = withoutId.map(q => q.question_text.slice(0, 120))
    const { data: textMatches } = await db
      .from('questions')
      .select('question_text')
      .eq('subject_id', subjectId)
      .eq('exam_type', examType)
      .in('question_text', textPrefixes) // close enough for dedup

    existingTexts = new Set((textMatches ?? []).map(r => r.question_text.slice(0, 120)))
  }

  const newQuestions = questions.filter(q => {
    if (q.sdash_id && existingSdashIds.has(q.sdash_id)) return false
    if (existingTexts.has(q.question_text.slice(0, 120))) return false
    return true
  })

  return { newQuestions, duplicates: questions.length - newQuestions.length }
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  // Auth check
  const authError = await requireAdmin(request)
  if (authError) return authError

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    sdashSubject,
    sdashType,
    year,
    subjectId,
    examType,
    limit = 50,
    dryRun = false,
  } = body

  // Validate required fields
  if (!sdashSubject) return NextResponse.json({ error: 'sdashSubject is required' }, { status: 400 })
  if (!sdashType)    return NextResponse.json({ error: 'sdashType is required' },    { status: 400 })
  if (!year)         return NextResponse.json({ error: 'year is required' },          { status: 400 })
  if (!subjectId)    return NextResponse.json({ error: 'subjectId is required' },    { status: 400 })
  if (!examType)     return NextResponse.json({ error: 'examType is required' },     { status: 400 })

  const db = svc()
  const errors = []

  // ── 1. Fetch from SdashAPI ────────────────────────────────────────────────
  let fetchResult
  try {
    fetchResult = await fetchFromSdash({ sdashSubject, sdashType, year, limit })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }

  if (fetchResult.noData) {
    return NextResponse.json({
      fetched: 0, new: 0, duplicate: 0, saved: 0,
      errors: [],
      noData: true,
      message: `SdashAPI: ${fetchResult.message} (${sdashSubject} / ${sdashType} / ${year})`,
    })
  }

  const rawQuestions = fetchResult.questions

  if (!rawQuestions.length) {
    return NextResponse.json({
      fetched: 0, new: 0, duplicate: 0, saved: 0,
      errors: [],
      message: `No questions returned for ${sdashSubject}/${sdashType}/${year}`,
    })
  }

  // ── 2. Map to ExamPrep schema ─────────────────────────────────────────────
  const mapped = []
  for (const raw of rawQuestions) {
    try {
      if (!raw.question || !raw.answer) {
        errors.push({ sdash_id: raw.id, reason: 'Missing question text or answer' })
        continue
      }
      if (!raw.option || Object.keys(raw.option).length < 2) {
        errors.push({ sdash_id: raw.id, reason: 'Fewer than 2 options' })
        continue
      }
      mapped.push(mapQuestion(raw, { subjectId, examType, year }))
    } catch (err) {
      errors.push({ sdash_id: raw.id, reason: err.message })
    }
  }

  // ── 3. Deduplicate against DB ─────────────────────────────────────────────
  const { newQuestions, duplicates } = await deduplicateQuestions(
    db, mapped, subjectId, examType
  )

  // ── 4. Dry-run: return preview without saving ─────────────────────────────
  if (dryRun) {
    return NextResponse.json({
      fetched:    rawQuestions.length,
      new:        newQuestions.length,
      duplicate:  duplicates,
      saved:      0,
      errors,
      questions:  newQuestions.slice(0, 10), // preview first 10
      dryRun:     true,
    })
  }

  // ── 5. Bulk insert new questions ──────────────────────────────────────────
  let saved = 0
  if (newQuestions.length) {
    // Insert in chunks of 25 to stay within Supabase payload limits
    const CHUNK = 25
    for (let i = 0; i < newQuestions.length; i += CHUNK) {
      const chunk = newQuestions.slice(i, i + CHUNK)
      const { error: insertError } = await db
        .from('questions')
        .insert(chunk)

      if (insertError) {
        errors.push({ reason: `Batch insert failed at offset ${i}: ${insertError.message}` })
      } else {
        saved += chunk.length
      }
    }
  }

  // ── 6. Record an upload batch ─────────────────────────────────────────────
  if (saved > 0) {
    await db.from('upload_batches').insert({
      exam_type:  examType,
      subject_id: subjectId,
      total:      rawQuestions.length,
      saved,
      errors:     errors.length,
      created_by: user.id,
      // Store extra context in a notes field if it exists; safe to fail
    }).catch(() => {})
  }

  return NextResponse.json({
    fetched:   rawQuestions.length,
    new:       newQuestions.length,
    duplicate: duplicates,
    saved,
    errors,
  })
}
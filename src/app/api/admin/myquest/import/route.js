// src/app/api/admin/myquest/import/route.js
// ─────────────────────────────────────────────────────────────────────────────
// MyQuest API — Bulk Import (raw, no enrichment)
// Used by the year-range bulk import mode where questions are saved directly
// without going through the Claude enrichment step.
//
// POST /api/admin/myquest/import
// Body: { mqSubject, exam, year, subjectId, examType, limit?, dryRun? }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/adminAuth'
import { NextResponse } from 'next/server'

const MYQUEST_BASE = 'https://api.myquest.com.ng/api'

const svc = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

function getApiKey() {
  const key = process.env.MYQUEST_API_KEY
  if (!key) throw new Error('MYQUEST_API_KEY environment variable is not set')
  return key
}

// ── Infer difficulty from question text ───────────────────────────────────────
function inferDifficulty(q) {
  const text = (q.question ?? '').toLowerCase()
  const hardKeywords = ['derive', 'prove', 'calculate', 'determine', 'evaluate', 'differentiate', 'integrate', 'synthesis', 'analyse', 'justify']
  const easyKeywords = ['which', 'what is', 'define', 'identify', 'name', 'state', 'list']
  if (hardKeywords.some(k => text.includes(k))) return 'hard'
  if (easyKeywords.some(k => text.includes(k))) return 'easy'
  return 'medium'
}

// ── Map MyQuest question → ExamPrep schema ────────────────────────────────────
function mapQuestion(mq, { subjectId, examType, year }) {
  // MyQuest options shape varies — normalise to {a,b,c,d} object
  const options = {}
  if (mq.option && typeof mq.option === 'object') {
    for (const [key, val] of Object.entries(mq.option)) {
      if (val != null && String(val).trim()) {
        options[key.toLowerCase()] = String(val).trim()
      }
    }
  }

  const explanation = {}
  if (mq.solution || mq.explanation) {
    const sol = String(mq.solution ?? mq.explanation ?? '').trim()
    if (sol) {
      explanation.correct  = sol
      explanation.workings = []
    }
  }

  const hasImage = !!(mq.image && String(mq.image).startsWith('http'))

  return {
    subject_id:     subjectId,
    exam_type:      examType,
    source:         'past_paper',
    year:           mq.year ?? mq.examyear ?? year,
    question_text:  String(mq.question ?? '').trim(),
    options,
    correct_answer: String(mq.answer ?? '').toLowerCase().trim(),
    explanation:    Object.keys(explanation).length ? explanation : null,
    difficulty:     inferDifficulty(mq),
    has_image:      hasImage,
    image_url:      hasImage ? mq.image : null,
    passage_text:   mq.section ? String(mq.section).trim() : null,
    // Use MyQuest's id for deduplication (stored in myquest_id column if it exists,
    // otherwise we rely on text-based dedup)
    sdash_id:       mq.id ? `mq_${String(mq.id)}` : null,
    topic_id:       null,
    subtopic_id:    null,
    is_active:      true,
    is_flagged:     false,
  }
}

// ── Fetch from MyQuest with pagination ───────────────────────────────────────
async function fetchFromMyQuest({ mqSubject, exam, year, limit = 50 }) {
  const apiKey = getApiKey()

  async function fetchPage(page) {
    const res = await fetch(`${MYQUEST_BASE}/questions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ exam, exam_year_id: parseInt(year, 10), subject: mqSubject, page }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    })

    let json
    try { json = await res.json() } catch {
      throw new Error(`MyQuest returned non-JSON (HTTP ${res.status})`)
    }

    if (!res.ok || !json.success) {
      return { noData: true, questions: [], pagination: null }
    }

    return {
      noData: false,
      questions: json.data?.questions ?? [],
      pagination: json.data?.pagination ?? null,
    }
  }

  const page1 = await fetchPage(1)
  if (page1.noData || !page1.questions.length) {
    return { noData: true, questions: [], message: 'No questions for this combination' }
  }

  let all = [...page1.questions]
  const totalPages = page1.pagination?.total_pages ?? 1

  if (totalPages > 1 && all.length < limit) {
    try {
      const page2 = await fetchPage(2)
      if (!page2.noData) all = [...all, ...page2.questions]
    } catch { /* non-fatal */ }
  }

  return { noData: false, questions: all.slice(0, limit) }
}

// ── Deduplication (same logic as sdash import) ────────────────────────────────
async function deduplicateQuestions(db, questions, subjectId, examType) {
  if (!questions.length) return { newQuestions: [], duplicates: 0 }

  const sdashIds = questions.map(q => q.sdash_id).filter(Boolean)
  let existingIds = new Set()

  if (sdashIds.length) {
    const { data: existing } = await db
      .from('questions')
      .select('sdash_id')
      .eq('subject_id', subjectId)
      .eq('exam_type', examType)
      .in('sdash_id', sdashIds)
    existingIds = new Set((existing ?? []).map(r => r.sdash_id))
  }

  const withoutId = questions.filter(q => !q.sdash_id || !existingIds.has(q.sdash_id))
  let existingTexts = new Set()

  if (withoutId.length) {
    const prefixes = withoutId.map(q => q.question_text.slice(0, 120))
    const { data: textMatches } = await db
      .from('questions')
      .select('question_text')
      .eq('subject_id', subjectId)
      .eq('exam_type', examType)
      .in('question_text', prefixes)
    existingTexts = new Set((textMatches ?? []).map(r => r.question_text.slice(0, 120)))
  }

  const newQuestions = questions.filter(q => {
    if (q.sdash_id && existingIds.has(q.sdash_id)) return false
    if (existingTexts.has(q.question_text.slice(0, 120))) return false
    return true
  })

  return { newQuestions, duplicates: questions.length - newQuestions.length }
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { mqSubject, exam, year, subjectId, examType, limit = 50, dryRun = false } = body

  if (!mqSubject)  return NextResponse.json({ error: 'mqSubject is required' },  { status: 400 })
  if (!exam)       return NextResponse.json({ error: 'exam is required' },        { status: 400 })
  if (!year)       return NextResponse.json({ error: 'year is required' },        { status: 400 })
  if (!subjectId)  return NextResponse.json({ error: 'subjectId is required' },  { status: 400 })
  if (!examType)   return NextResponse.json({ error: 'examType is required' },   { status: 400 })

  const db = svc()
  const errors = []

  // 1. Fetch from MyQuest
  let fetchResult
  try {
    fetchResult = await fetchFromMyQuest({ mqSubject, exam, year, limit })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }

  if (fetchResult.noData) {
    return NextResponse.json({
      fetched: 0, new: 0, duplicate: 0, saved: 0, errors: [], noData: true,
      message: `MyQuest: no questions for ${mqSubject} / ${exam} / ${year}`,
    })
  }

  // 2. Map to ExamPrep schema
  const mapped = []
  for (const raw of fetchResult.questions) {
    try {
      if (!raw.question || !raw.answer) {
        errors.push({ id: raw.id, reason: 'Missing question text or answer' })
        continue
      }
      if (!raw.option || Object.keys(raw.option).length < 2) {
        errors.push({ id: raw.id, reason: 'Fewer than 2 options' })
        continue
      }
      mapped.push(mapQuestion(raw, { subjectId, examType, year }))
    } catch (err) {
      errors.push({ id: raw.id, reason: err.message })
    }
  }

  // 3. Deduplicate
  const { newQuestions, duplicates } = await deduplicateQuestions(db, mapped, subjectId, examType)

  // 4. Dry run
  if (dryRun) {
    return NextResponse.json({
      fetched: fetchResult.questions.length,
      new: newQuestions.length,
      duplicate: duplicates,
      saved: 0,
      errors,
      questions: newQuestions.slice(0, 10),
      dryRun: true,
    })
  }

  // 5. Bulk insert
  let saved = 0
  const CHUNK = 25
  for (let i = 0; i < newQuestions.length; i += CHUNK) {
    const chunk = newQuestions.slice(i, i + CHUNK)
    const { error: insertError } = await db.from('questions').insert(chunk)
    if (insertError) {
      errors.push({ reason: `Batch insert failed at offset ${i}: ${insertError.message}` })
    } else {
      saved += chunk.length
    }
  }

  // 6. Record upload batch
  if (saved > 0) {
    await db.from('upload_batches').insert({
      exam_type:  examType,
      subject_id: subjectId,
      total:      fetchResult.questions.length,
      saved,
      errors:     errors.length,
    }).catch(() => {})
  }

  return NextResponse.json({
    fetched: fetchResult.questions.length,
    new: newQuestions.length,
    duplicate: duplicates,
    saved,
    errors,
  })
}
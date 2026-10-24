import { reviewIssues } from '@/lib/questionReview'
import { normalizeQuestionContent } from '@/lib/questionContent'
// src/app/api/admin/myquest/import/route.js
// ─────────────────────────────────────────────────────────────────────────────
// MyQuest API — Bulk Import (raw, no enrichment)
// Used by the year-range bulk import mode where questions are saved directly
// without going through the Claude enrichment step.
// Called by: app/admin/questions/myquest-import/page.js
//
// POST /api/admin/myquest/import
// Body: { exam, examYearId, mqSubject, year, subjectId, examType, dryRun? }
//   exam, examYearId, mqSubject — MyQuest's own values from /api/admin/myquest/meta
//   year                        — the year label saved on each question
//   subjectId, examType         — the ExamPrep subject row the questions go into
//
// v2 (29 Sep 2026): fetches every page of the paper through lib/server/myquest
// (v1 stopped at 50, so questions 51+ of every paper were dropped), sends
// MyQuest's own exam / exam_year_id / subject values, and reports auth / HTTP
// failures as errors instead of "no questions".
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/adminAuth'
import { NextResponse } from 'next/server'
import { ALL_EXAMS } from '@/lib/constants'
import { fetchAllQuestions, MyQuestError, isShortText } from '@/lib/server/myquest'

const svc = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

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
function mapQuestion(raw, { subjectId, examType, year }) {
  const mq = normalizeQuestionContent(raw)
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
    exam_types:     [examType],
    source:         'past_paper',
    year:           mq.year ?? mq.examyear ?? year,
    question_text:  String(mq.question ?? '').trim(),
    options,
    correct_answer: String(mq.answer ?? '').toLowerCase().trim(),
    explanation:    Object.keys(explanation).length ? explanation : null,
    difficulty:     inferDifficulty(mq),
    has_image:      hasImage,
    image_url:      hasImage ? mq.image : null,
    passage_text:   mq.section,
    instruction_text: mq.instruction_text,
    passage_image_url: mq.passage_image_url,
    // Use MyQuest's id for deduplication (stored in myquest_id column if it exists,
    // otherwise we rely on text-based dedup)
    sdash_id:       mq.id ? `mq_${String(mq.id)}` : null,
    topic_id:       null,
    subtopic_id:    null,
    is_active:      true,
    is_flagged:     false,
  }
}

// ── Deduplication (same logic as sdash import) ────────────────────────────────
async function deduplicateQuestions(db, questions, subjectId, examType) {
  const unique = []
  const seen = new Set()
  let duplicates = 0
  for (const row of questions) {
    const fingerprint = JSON.stringify([row.year, row.question_text, row.passage_text, row.instruction_text, row.options])
    if (seen.has(fingerprint)) { duplicates++; continue }
    seen.add(fingerprint)
    // IDs in current MyQuest payloads restart at 1 for each paper/year.
    // Only active records from the same subject, exam and year can block reimport.
    const { data, error } = await db.from('questions')
      .select('id,sdash_id,question_text,passage_text,instruction_text,options')
      .eq('subject_id', subjectId).eq('exam_type', examType).eq('year', row.year)
      .eq('is_active', row.is_active).in('question_text', [row.question_text])
    if (error) throw new Error(`Duplicate check failed: ${error.message}`)
    const duplicate = (data ?? []).some(existing =>
      JSON.stringify([existing.passage_text ?? null, existing.instruction_text ?? null, existing.options]) ===
      JSON.stringify([row.passage_text ?? null, row.instruction_text ?? null, row.options]))
    if (duplicate) duplicates++
    else unique.push(row)
  }
  return { newQuestions: unique, duplicates }
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { exam, examYearId, mqSubject, year, subjectId, examType, dryRun = false } = body ?? {}

  if (!isShortText(exam))            return NextResponse.json({ error: 'exam is required' },        { status: 400 })
  if (!isShortText(examYearId))      return NextResponse.json({ error: 'examYearId is required' },  { status: 400 })
  if (!isShortText(mqSubject))       return NextResponse.json({ error: 'mqSubject is required' },   { status: 400 })
  if (!isShortText(year))            return NextResponse.json({ error: 'year is required' },        { status: 400 })
  if (!isShortText(subjectId))       return NextResponse.json({ error: 'subjectId is required' },   { status: 400 })
  if (!ALL_EXAMS.includes(examType)) return NextResponse.json({ error: `examType must be one of: ${ALL_EXAMS.join(', ')}` }, { status: 400 })

  const db = svc()
  const { data: subject } = await db.from('subjects').select('exam_type').eq('id', subjectId).single()
  if (!subject || subject.exam_type !== examType || (ALL_EXAMS.includes(String(exam).toUpperCase()) && String(exam).toUpperCase() !== examType)) {
    return NextResponse.json({ error: 'Provider exam and selected subject must match' }, { status: 400 })
  }
  const errors = []

  // 1. Fetch from MyQuest
  let fetchResult
  try {
    fetchResult = await fetchAllQuestions({ exam, examYearId, subject: mqSubject })
  } catch (err) {
    console.error('[myquest/import]', err.message)
    const status = err instanceof MyQuestError ? err.status : 500
    const message = err instanceof MyQuestError ? err.message : 'Could not fetch questions from MyQuest'
    return NextResponse.json({ error: message }, { status })
  }

  if (!fetchResult.questions.length) {
    return NextResponse.json({
      fetched: 0, new: 0, duplicate: 0, saved: 0, errors: [], noData: true,
      message: `MyQuest: no questions for ${mqSubject} / ${exam} / ${year}${fetchResult.message ? ` (${fetchResult.message})` : ''}`,
    })
  }

  // 2. Map to ExamPrep schema
  const mapped = []
  for (const source of fetchResult.questions) {
    const raw = normalizeQuestionContent(source)
    try {
      if (!raw.question || !raw.answer) {
        errors.push({ id: raw.id, reason: 'Missing question text or answer' })
        continue
      }
      if (Object.keys(normalizeQuestionContent(raw).option).length < 2) {
        errors.push({ id: raw.id, reason: 'Fewer than 2 options' })
        continue
      }
      const row = mapQuestion(raw, { subjectId, examType, year })
      const issues = reviewIssues({ ...row, subject_name: mqSubject })
      if (issues.length) {
        row.is_active = false
        row.is_flagged = true
        row.explanation = { ...(row.explanation ?? {}), content_review: { status: 'needs_review', issues, source: raw, created_at: new Date().toISOString() } }
      }
      mapped.push(row)
    } catch (err) {
      errors.push({ id: raw.id, reason: err.message })
    }
  }

  // 3. Deduplicate
  const { newQuestions, duplicates } = await deduplicateQuestions(db, mapped, subjectId, examType)

  // 4. Dry run
  const flaggedCount = newQuestions.filter(q => q.is_flagged).length
  if (dryRun) {
    return NextResponse.json({
      fetched: fetchResult.questions.length,
      new: newQuestions.filter(q => q.is_active).length,
      flagged: flaggedCount,
      duplicate: duplicates,
      saved: 0,
      errors,
      truncated: fetchResult.truncated,
      questions: newQuestions.slice(0, 10),
      dryRun: true,
    })
  }

  // 5. Bulk insert
  let saved = 0
  let flagged = 0
  const CHUNK = 25
  for (let i = 0; i < newQuestions.length; i += CHUNK) {
    const chunk = newQuestions.slice(i, i + CHUNK)
    const { error: insertError } = await db.from('questions').insert(chunk)
    if (insertError) {
      errors.push({ reason: `Batch insert failed at offset ${i}: ${insertError.message}` })
    } else {
      saved += chunk.filter(q => q.is_active).length
      flagged += chunk.filter(q => q.is_flagged).length
      const activeYears = new Map()
      for (const row of chunk.filter(q => q.is_active)) activeYears.set(row.year, (activeYears.get(row.year) ?? 0) + 1)
      for (const [paperYear, count] of activeYears) {
        const result = await db.rpc('increment_coverage', { p_subject_id: subjectId, p_exam_type: examType, p_year: Number(paperYear), p_delta: count })
        if (result.error) errors.push({ reason: `Questions saved but coverage refresh failed: ${result.error.message}` })
      }
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
    new: newQuestions.filter(q => q.is_active).length,
    duplicate: duplicates,
    saved,
    flagged,
    errors,
    truncated: fetchResult.truncated,
  })
}
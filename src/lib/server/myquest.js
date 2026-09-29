// src/lib/server/myquest.js
// ─────────────────────────────────────────────────────────────────────────────
// MyQuest API client. Server-only: it reads MYQUEST_API_KEY, so never import
// this from a 'use client' file.
//
// Callers: app/api/admin/myquest/{meta,preview,fetchbatch,import}/route.js
//
// MyQuest is a chain of lookups. Each level only accepts values the level
// above returned, so the admin UI walks it in order:
//
//   POST /api/questions?get=exam           {}                               → exams
//   POST /api/questions?get=exam_year_id   { exam }                         → years for that exam
//   POST /api/questions?get=subject        { exam, exam_year_id: "2001" }   → subjects for exam + year
//   POST /api/questions                    { exam, exam_year_id: 1999,
//                                            subject: "Government", page } → questions (50 per page)
//
// Values are sent back exactly as MyQuest returned them (e.g. "Government",
// not a slug we made up). The docs show exam_year_id as a string for the
// subject call and a number for the questions call, so each call follows its
// own doc (see yearIdForSubjectCall / yearIdForQuestionCall).
//
// v1 (29 Sep 2026): replaces three copies of myquestFetch/fetchPage and the
// hard-coded subject slug map, which sent names MyQuest doesn't use and never
// fetched past page 1 of a paper.
// ─────────────────────────────────────────────────────────────────────────────

const MYQUEST_BASE = 'https://api.myquest.com.ng/api'

// A paper is 50 questions per page. 10 pages (500 questions) is far above any
// real paper; the cap only stops a bad `total_pages` from looping forever.
export const MAX_PAGES = 10

// The exam / year / subject lists rarely change, so cache them per server
// instance for an hour. Questions are never cached.
const LIST_CACHE_MS = 60 * 60 * 1000
const listCache = new Map()

export class MyQuestError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.name = 'MyQuestError'
    this.status = status
  }
}

function apiKey() {
  const key = process.env.MYQUEST_API_KEY
  if (!key) throw new MyQuestError('MYQUEST_API_KEY is not set on the server', 500)
  return key
}

// One POST to MyQuest. Transport, auth and rate-limit failures throw a
// MyQuestError with a message the admin can act on. A 200 with
// success:false is returned as-is: that is MyQuest saying "nothing here".
async function post(path, body, timeoutMs = 30_000) {
  let res
  try {
    res = await fetch(`${MYQUEST_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    if (err instanceof MyQuestError) throw err
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError'
    throw new MyQuestError(
      timedOut ? 'MyQuest did not respond in time. Try again.' : 'Could not reach MyQuest. Try again.',
      504
    )
  }

  if (res.status === 401 || res.status === 403) {
    throw new MyQuestError(`MyQuest rejected the API key (HTTP ${res.status}). Check MYQUEST_API_KEY.`)
  }
  if (res.status === 429) {
    throw new MyQuestError('MyQuest rate limit reached. Wait a minute and try again.', 429)
  }

  let json
  try {
    json = await res.json()
  } catch {
    throw new MyQuestError(`MyQuest returned a non-JSON response (HTTP ${res.status})`)
  }

  if (!res.ok) {
    const detail = typeof json?.message === 'string' ? `: ${json.message}` : ''
    throw new MyQuestError(`MyQuest error (HTTP ${res.status})${detail}`)
  }
  return json ?? {}
}

// ── exam_year_id formatting (per the MyQuest docs) ───────────────────────────
function yearIdForSubjectCall(examYearId) {
  return String(examYearId)
}

function yearIdForQuestionCall(examYearId) {
  const s = String(examYearId)
  return /^\d+$/.test(s) ? Number(s) : s
}

// ── Lists: exams, years, subjects ────────────────────────────────────────────
// The docs don't show what one list item looks like. A plain string/number is
// used as-is. For an object we take the field the next call needs (e.g. the
// subject *name*, since the questions call sends "Government"). An object with
// none of those fields is an error, not a guess; the raw sample returned with
// every list shows what MyQuest actually sent.
const LIST_FIELDS = {
  exam:         { value: ['exam', 'name', 'code'],                label: ['name', 'exam', 'title'] },
  exam_year_id: { value: ['exam_year_id', 'id', 'year'],          label: ['year', 'exam_year', 'name', 'title'] },
  subject:      { value: ['subject', 'name', 'title'],            label: ['subject', 'name', 'title'] },
}

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && String(v).trim() !== '') return v
  }
  return undefined
}

function normalizeItem(kind, item) {
  if (typeof item === 'string' || typeof item === 'number') {
    return { value: String(item), label: String(item) }
  }
  if (item && typeof item === 'object') {
    const value = pick(item, LIST_FIELDS[kind].value)
    if (value === undefined) {
      throw new MyQuestError(
        `Unexpected ${kind} item from MyQuest (fields: ${Object.keys(item).join(', ') || 'none'})`
      )
    }
    const label = pick(item, LIST_FIELDS[kind].label) ?? value
    return { value: String(value), label: String(label) }
  }
  throw new MyQuestError(`Unexpected ${kind} item from MyQuest (${typeof item})`)
}

// kind: 'exam' | 'exam_year_id' | 'subject'
// Returns { items: [{ value, label }], total, message, rawSample }
export async function listCatalog(kind, { exam, examYearId } = {}) {
  const body =
    kind === 'exam'         ? {} :
    kind === 'exam_year_id' ? { exam } :
                              { exam, exam_year_id: yearIdForSubjectCall(examYearId) }

  const cacheKey = JSON.stringify([kind, body])
  const hit = listCache.get(cacheKey)
  if (hit && hit.expires > Date.now()) return hit.result

  const json = await post(`/questions?get=${kind}`, body, 20_000)
  const data = Array.isArray(json.data) ? json.data : []

  if (!json.success || !data.length) {
    // Not cached: an empty answer may be temporary.
    return {
      items: [],
      total: 0,
      message: typeof json.message === 'string' ? json.message : 'MyQuest returned no entries',
      rawSample: data.slice(0, 3),
    }
  }

  const seen = new Set()
  const items = []
  for (const raw of data) {
    const item = normalizeItem(kind, raw)
    if (seen.has(item.value)) continue
    seen.add(item.value)
    items.push(item)
  }

  const result = { items, total: json.total ?? items.length, message: null, rawSample: data.slice(0, 3) }
  listCache.set(cacheKey, { result, expires: Date.now() + LIST_CACHE_MS })
  return result
}

// ── Questions ────────────────────────────────────────────────────────────────
// The doc shows `questions` as "[...]"; accept a real array or a JSON string.
function parseQuestions(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    let parsed
    try { parsed = JSON.parse(raw) } catch {
      throw new MyQuestError('MyQuest returned questions in an unreadable format')
    }
    if (Array.isArray(parsed)) return parsed
    throw new MyQuestError('MyQuest returned questions in an unreadable format')
  }
  return []
}

// One page. Returns { questions, pagination, message }; empty questions means
// MyQuest has nothing for this exam + year + subject.
export async function fetchQuestionPage({ exam, examYearId, subject, page = 1 }) {
  const json = await post('/questions', {
    exam,
    exam_year_id: yearIdForQuestionCall(examYearId),
    subject,
    page,
  })
  if (!json.success) {
    return {
      questions: [],
      pagination: null,
      message: typeof json.message === 'string' ? json.message : 'MyQuest has no questions for this selection',
    }
  }
  return {
    questions: parseQuestions(json.data?.questions),
    pagination: json.data?.pagination ?? null,
    message: null,
  }
}

// Every page of a paper, in order. A failure on a later page throws: a
// half-fetched paper must not look like a complete one.
// Returns { questions, total, truncated, message }
export async function fetchAllQuestions({ exam, examYearId, subject }) {
  const first = await fetchQuestionPage({ exam, examYearId, subject, page: 1 })
  if (!first.questions.length) {
    return { questions: [], total: 0, truncated: false, message: first.message ?? 'MyQuest has no questions for this selection' }
  }

  const totalPages = Number(first.pagination?.total_pages) || 1
  const lastPage = Math.min(totalPages, MAX_PAGES)
  const questions = [...first.questions]

  for (let page = 2; page <= lastPage; page++) {
    const next = await fetchQuestionPage({ exam, examYearId, subject, page })
    if (!next.questions.length) {
      throw new MyQuestError(`MyQuest returned page 1 but not page ${page} of ${totalPages}. Try again.`)
    }
    questions.push(...next.questions)
  }

  return {
    questions,
    total: Number(first.pagination?.total) || questions.length,
    truncated: totalPages > MAX_PAGES,
    message: null,
  }
}

// Shared input checks for the admin routes.
export function isShortText(v, max = 100) {
  return typeof v === 'string' && v.trim() !== '' && v.length <= max
}

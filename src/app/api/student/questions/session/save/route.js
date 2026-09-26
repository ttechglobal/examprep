// src/app/api/student/questions/session/save/route.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/student/questions/session/save
//
// Saves a completed practice / mock / battle session. Called by
// localSessionSync.flushSyncQueue() after the session was saved on the device.
//
// Guests → { ok: true, guest: true } — nothing written; the device queue keeps
//          the session until they sign up.
// Auth   → one database transaction (save_practice_session) that records the
//          session, its answers, the XP and the streak.
//
// Trust model: the phone reports which option was picked, never whether it was
// right. The server re-checks every answer against the question bank, ignores
// unknown or repeated questions, and computes XP with the same formula the
// phone used (lib/xp.js).
//
// Idempotent: the session_id is unique. A retry after a timeout returns
// { ok: true, duplicate: true } and awards nothing twice.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }       from '@/lib/supabase/server'
import { supabaseAdmin }      from '@/lib/server/supabaseAdmin'
import { NextResponse }       from 'next/server'
import { normaliseOptions, checkCorrect } from '@/lib/answers'
import { computeSessionXP }   from '@/lib/xp'
import { createHash }         from 'crypto'

// A JAMB mock is 4 subjects × 40 questions; nothing legitimate is bigger.
const MAX_RESULTS   = 200
const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/
const UUID_RE       = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MODES         = new Set(['practice', 'quick5', 'timed', 'study', 'mock', 'battle', 'weak', 'mixed'])

function bad(error, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

function toInt(v, max) {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : null
}

export async function POST(request) {
  let body
  try { body = await request.json() } catch { return bad('Invalid JSON') }

  const results = Array.isArray(body?.results) ? body.results : null
  if (!results?.length)              return bad('results array required')
  if (results.length > MAX_RESULTS)  return bad(`At most ${MAX_RESULTS} results per session`)

  // Sessions queued by older app versions may lack a session_id. Derive a
  // stable one from the payload so their retries are still de-duplicated.
  const sessionId = typeof body.session_id === 'string' && SESSION_ID_RE.test(body.session_id)
    ? body.session_id
    : 'legacy-' + createHash('sha256')
        .update(JSON.stringify([results, body.duration_secs ?? null, body.mode ?? null]))
        .digest('hex').slice(0, 40)

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: true, guest: true })

  try {
    const db   = supabaseAdmin()
    const mode = MODES.has(body.mode) ? body.mode : 'practice'
    const exam = typeof body.exam === 'string' ? body.exam.slice(0, 16) : null

    // ── Re-check every answer against the question bank ──────────────────────
    // First occurrence of each question wins; repeats are dropped.
    const seen = new Set()
    const picks = []
    for (const r of results) {
      // Only real question-bank ids (uuids); demo questions have none.
      const qid = typeof r?.question_id === 'string' && UUID_RE.test(r.question_id) ? r.question_id : null
      if (!qid || seen.has(qid)) continue
      seen.add(qid)
      const idx = Number.isInteger(r.selectedIdx) && r.selectedIdx >= 0 && r.selectedIdx < 10 ? r.selectedIdx : null
      picks.push({ qid, idx, timeMs: toInt(r.time_taken_ms ?? r.time_spent_ms, 3_600_000) })
    }

    const { data: questions, error: qErr } = await db
      .from('questions')
      .select('id, options, correct_answer, topic_id, subject_id, subjects(name)')
      .in('id', picks.map(p => p.qid))
    if (qErr) throw qErr

    const byId = new Map((questions ?? []).map(q => [q.id, q]))
    const checked = picks
      .filter(p => byId.has(p.qid))
      .map(p => {
        const q = byId.get(p.qid)
        return {
          question_id:   q.id,
          selectedIdx:   p.idx,
          is_correct:    p.idx !== null && checkCorrect(normaliseOptions(q.options), p.idx, q.correct_answer),
          topic_id:      q.topic_id ?? null,
          subject_id:    q.subject_id ?? null,
          subject_name:  q.subjects?.name ?? null,
          exam_type:     exam,
          time_spent_ms: p.timeMs,
        }
      })

    if (!checked.length) return bad('No question-bank questions in this session')

    const correct = checked.filter(c => c.is_correct).length
    const xp = computeSessionXP(mode, checked, { outcome: body.battle_outcome })

    // ── One transaction: session + answers + XP + streak ─────────────────────
    const { data: saved, error: saveErr } = await db.rpc('save_practice_session', {
      p_student:  user.id,
      p_session: {
        session_id:      sessionId,
        exam_type:       exam,
        mode,
        subject_name:    typeof body.subject_name === 'string' ? body.subject_name.slice(0, 120) : null,
        topic_name:      typeof body.topic_name   === 'string' ? body.topic_name.slice(0, 200)   : null,
        questions_count: checked.length,
        correct_count:   correct,
        duration_secs:   toInt(body.duration_secs, 24 * 3600),
      },
      p_attempts: checked.map(({ selectedIdx, ...row }) => row),
      p_xp: xp,
    })
    if (saveErr) throw saveErr

    return NextResponse.json({
      ok:           true,
      duplicate:    !!saved?.duplicate,
      xp_awarded:   saved?.xp_awarded ?? 0,
      total_points: saved?.total_points ?? null,
      streak_days:  saved?.streak_days ?? 0,
      correct,
      total:        checked.length,
    })
  } catch (err) {
    // 500 keeps the session in the device queue so it is retried later.
    console.error('[session/save] failed:', err?.message ?? err)
    return NextResponse.json({ ok: false, error: 'Could not save session' }, { status: 500 })
  }
}

// src/app/api/student/questions/session/save/route.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/student/questions/session/save
//
// Saves a completed practice session to the database.
// Called by localSessionSync.flushSyncQueue() after local save succeeds.
//
// Guests   → { ok: true, guest: true }  — no DB write, queue stays for later
// Auth     → inserts question_attempts rows, awards XP, returns { ok, xp_awarded }
//
// The insert into question_attempts is BEST-EFFORT — if it fails (missing
// columns etc.), XP is still awarded. Never returns 500; always returns 200.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    // ── Parse body ───────────────────────────────────────────────────────────
    let body
    try { body = await request.json() }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const { results } = body ?? {}

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: 'results array required' }, { status: 400 })
    }

    // ── Auth check ───────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: true, guest: true })
    }

    const service = db()
    const userId  = user.id

    // ── Insert question_attempts (best-effort) ────────────────────────────────
    // Schema constraints that must be satisfied:
    //   - question_id  NOT NULL  → skip any result that has no question_id
    //   - context      NOT NULL  → always 'practice' for this route
    //   - context      CHECK IN ('diagnostic','lesson','practice','exam')
    try {
      const rows = results
        .filter(r => !!r.question_id)   // question_id is NOT NULL — drop rows without one
        .map(r => ({
          student_id:  userId,
          question_id: r.question_id,
          is_correct:  r.is_correct ?? false,
          context:     'practice',       // required NOT NULL; this route is always practice
          ...(r.topic_id    ? { topic_id:    r.topic_id    } : {}),
          ...(r.subject_id  ? { subject_id:  r.subject_id  } : {}),
          ...(r.subject_name ? { subject_name: r.subject_name } : {}),
          ...(r.exam_type   ? { exam_type:   r.exam_type   } : {}),
          ...(r.session_id  ? { session_id:  r.session_id  } : {}),
          ...(r.time_spent_ms != null ? { time_spent_ms: r.time_spent_ms } : {}),
        }))

      if (rows.length > 0) {
        const { error: insertError } = await service
          .from('question_attempts')
          .insert(rows)

        if (insertError) {
          console.warn('[session/save] question_attempts insert failed:', insertError.message)
          // XP is still awarded below — a failed insert never blocks XP
        }
      }
    } catch (insertEx) {
      console.error('[session/save] insert threw:', insertEx.message)
      // Never block XP for an insert failure
    }

    // ── Compute XP ───────────────────────────────────────────────────────────
    const correct  = results.filter(r => r.is_correct).length
    const answered = results.length
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0
    const xp = Math.max(5,
      answered * 5 +
      correct  * 10 +
      (accuracy >= 80 ? 50 : accuracy >= 60 ? 25 : 0)
    )

    // ── Award XP to profile ──────────────────────────────────────────────────
    // Use RPC if it exists, otherwise fall back to a raw UPDATE with addition.
    const { error: rpcError } = await service
      .rpc('increment_points', { user_id: userId, points: xp })

    if (rpcError) {
      // RPC doesn't exist — fall back to read-then-write
      const { data: prof } = await service
        .from('profiles')
        .select('total_points')
        .eq('id', userId)
        .single()
      const newTotal = (prof?.total_points ?? 0) + xp
      await service
        .from('profiles')
        .update({ total_points: newTotal })
        .eq('id', userId)
    }

    // ── Compute streak ───────────────────────────────────────────────────────
    let streakDays = 0
    try {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 365)
      const { data: dates } = await service
        .from('question_attempts')
        .select('created_at')
        .eq('student_id', userId)
        .gte('created_at', cutoff.toISOString())

      if (dates?.length) {
        const activeDays = new Set(dates.map(d => d.created_at.slice(0, 10)))
        const cursor = new Date()
        while (activeDays.has(cursor.toISOString().slice(0, 10))) {
          streakDays++
          cursor.setDate(cursor.getDate() - 1)
        }
      }
    } catch { /* streak is cosmetic — never block */ }

    try {
      await service
        .from('profiles')
        .update({ streak_days: streakDays })
        .eq('id', userId)
    } catch { /* streak is cosmetic — never block */ }

    return NextResponse.json({
      ok: true,
      xp_awarded:  xp,
      streak_days: streakDays,
      correct,
      total: results.length,
    })

  } catch (err) {
    // Top-level safety net — should never reach here
    console.error('[session/save] unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
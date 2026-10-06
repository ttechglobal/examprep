// src/app/api/student/sessions/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/sessions?limit=5
//
// The signed-in student's most recent practice sessions, battles included
// (mode 'battle'), newest first. Used by Recent Sessions on the Practice page
// (hooks/useRecentSessions.js), which shows the device's own history first.
//
// Response: { sessions: [{ id, subject, topic, mode, at, count, correct }] }
//   id = session_id (the same id the device uses, so the two lists merge)
// Guests / signed out → 401. Reads ≤ 20 rows via practice_sessions_student_idx.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'

const MAX_LIMIT = 20

export async function GET(request) {
  const raw   = Number(new URL(request.url).searchParams.get('limit') ?? 5)
  if (!Number.isInteger(raw) || raw < 1 || raw > MAX_LIMIT) {
    return NextResponse.json({ error: `limit must be 1–${MAX_LIMIT}` }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin()
      .from('practice_sessions')
      .select('id, session_id, subject_name, topic_name, mode, created_at, questions_count, correct_count')
      .eq('student_id', user.id)                 // own sessions only
      .order('created_at', { ascending: false })
      .limit(raw)
    if (error) throw error

    const sessions = (data ?? []).map(r => ({
      id:      r.session_id ?? r.id,
      subject: r.subject_name ?? 'Mixed',
      topic:   r.topic_name ?? null,
      mode:    r.mode ?? 'practice',
      at:      r.created_at,
      count:   r.questions_count ?? 0,
      correct: r.correct_count ?? 0,
    }))

    return NextResponse.json({ sessions }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error('[student/sessions] error:', err?.message ?? err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

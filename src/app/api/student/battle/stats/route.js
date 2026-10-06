// src/app/api/student/battle/stats/route.js — v2
// GET  → the signed-in student's battle record (defaults for guests), their
//        battle XP (profiles.battle_xp) and all-time battle leaderboard rank
// POST → record one finished match vs the computer: { outcome, xp_awarded, session_id }
//
// v2: POST validates input and updates the record in one atomic statement
// (record_battle_result). XP for the match itself is awarded by the session
// save, which re-checks the answers; this only keeps battle stats.
// v3: keeps recent_form (last 10 results, newest first) and ignores retries
// of the same match (session_id).
// v4: GET adds { battle_xp, rank } for the battle world's top bar
// (20261004_battle_xp.sql, run before deploying).
import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { BATTLE_OUTCOMES, BATTLE_XP_PER_CORRECT, BATTLE_WIN_BONUS } from '@/lib/xp'
import { NextResponse }  from 'next/server'

const defaults = () => ({ battles_played:0, battles_won:0, battles_drawn:0, battles_lost:0, ai_difficulty:'easy', total_battle_xp:0, recent_form:'', last_battle_at:null })
const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/

// A 50-question battle with a win is the most a single match can earn.
const MAX_MATCH_XP = 50 * BATTLE_XP_PER_CORRECT + BATTLE_WIN_BONUS

async function currentUser() {
  const supabase = await createClient()
  return (await supabase.auth.getUser()).data?.user ?? null
}

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ stats: defaults(), battle_xp: null, rank: null, guest: true })
    const db = supabaseAdmin()
    const [statsRes, profileRes, rankRes] = await Promise.all([
      db.from('battle_stats')
        .select('battles_played, battles_won, battles_drawn, battles_lost, ai_difficulty, total_battle_xp, recent_form, last_battle_at')
        .eq('student_id', user.id).maybeSingle(),
      db.from('profiles').select('battle_xp').eq('id', user.id).maybeSingle(),
      db.rpc('battle_leaderboard_me', { p_student: user.id, p_from: null, p_to: null }),
    ])
    const failed = [statsRes, profileRes, rankRes].find(r => r.error)
    if (failed) throw failed.error
    const me = Array.isArray(rankRes.data) ? rankRes.data[0] : rankRes.data
    return NextResponse.json(
      { stats: statsRes.data ?? defaults(), battle_xp: Number(profileRes.data?.battle_xp ?? 0), rank: me?.rank != null ? Number(me.rank) : null },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (e) {
    console.error('[battle/stats] GET:', e?.message ?? e)
    return NextResponse.json({ error: 'Could not load battle stats' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ ok: true, guest: true })

    let body = {}
    try { body = await req.json() } catch {}
    if (!BATTLE_OUTCOMES.includes(body.outcome)) {
      return NextResponse.json({ error: 'outcome must be win, draw or loss' }, { status: 400 })
    }
    const xp = Math.min(Math.max(Math.round(Number(body.xp_awarded) || 0), 0), MAX_MATCH_XP)

    const sessionId = typeof body.session_id === 'string' && SESSION_ID_RE.test(body.session_id) ? body.session_id : null

    const { error } = await supabaseAdmin().rpc('record_battle_result', {
      p_student: user.id, p_outcome: body.outcome, p_xp: xp, p_session_id: sessionId,
    })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[battle/stats] POST:', e?.message ?? e)
    return NextResponse.json({ error: 'Could not save battle result' }, { status: 500 })
  }
}

// src/app/api/student/battle/stats/route.js — v2
// GET  → the signed-in student's battle record (defaults for guests)
// POST → record one finished match vs the computer: { outcome, xp_awarded }
//
// v2: POST validates input and updates the record in one atomic statement
// (record_battle_result). XP for the match itself is awarded by the session
// save, which re-checks the answers; this only keeps battle stats.
import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { BATTLE_OUTCOMES } from '@/lib/xp'
import { NextResponse }  from 'next/server'

const defaults = () => ({ battles_played:0, battles_won:0, battles_drawn:0, battles_lost:0, ai_difficulty:'easy', total_battle_xp:0, last_battle_at:null })

// A 50-question battle with a win is the most a single match can earn.
const MAX_MATCH_XP = 50 * 10 + 20

async function currentUser() {
  const supabase = await createClient()
  return (await supabase.auth.getUser()).data?.user ?? null
}

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ stats: defaults() })
    const { data } = await supabaseAdmin()
      .from('battle_stats')
      .select('battles_played, battles_won, battles_drawn, battles_lost, ai_difficulty, total_battle_xp, last_battle_at')
      .eq('student_id', user.id).maybeSingle()
    return NextResponse.json({ stats: data ?? defaults() })
  } catch { return NextResponse.json({ stats: defaults() }) }
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

    const { error } = await supabaseAdmin().rpc('record_battle_result', {
      p_student: user.id, p_outcome: body.outcome, p_xp: xp,
    })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[battle/stats] POST:', e?.message ?? e)
    return NextResponse.json({ error: 'Could not save battle result' }, { status: 500 })
  }
}

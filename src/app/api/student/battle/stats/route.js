// src/app/api/student/battle/stats/route.js
import { createClient as svc } from '@supabase/supabase-js'
import { createClient }        from '@/lib/supabase/server'
import { NextResponse }        from 'next/server'

const db = () => svc(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const defaults = () => ({ battles_played:0, battles_won:0, battles_drawn:0, battles_lost:0, ai_difficulty:'easy', total_battle_xp:0, last_battle_at:null })
const diff = w => w>=8?'hard':w>=3?'medium':'easy'

export async function GET() {
  try {
    const { data:{ user } } = await createClient().auth.getUser()
    if (!user) return NextResponse.json({ stats: defaults() })
    const { data } = await db().from('battle_stats').select('*').eq('student_id', user.id).maybeSingle()
    return NextResponse.json({ stats: data ?? defaults() })
  } catch { return NextResponse.json({ stats: defaults() }) }
}

export async function POST(req) {
  try {
    const { data:{ user } } = await createClient().auth.getUser()
    if (!user) return NextResponse.json({ ok:true, guest:true })
    const { outcome, xp_awarded=0 } = await req.json()
    const { data:cur } = await db().from('battle_stats').select('*').eq('student_id', user.id).maybeSingle()
    const c = cur ?? defaults()
    const newWins = c.battles_won + (outcome==='win'?1:0)
    await db().from('battle_stats').upsert({ student_id:user.id, battles_played:c.battles_played+1, battles_won:newWins, battles_drawn:c.battles_drawn+(outcome==='draw'?1:0), battles_lost:c.battles_lost+(outcome==='loss'?1:0), ai_difficulty:diff(newWins), total_battle_xp:c.total_battle_xp+xp_awarded, last_battle_at:new Date().toISOString(), updated_at:new Date().toISOString() }, { onConflict:'student_id' })
    return NextResponse.json({ ok:true })
  } catch (e) { return NextResponse.json({ error:e.message }, { status:500 }) }
}

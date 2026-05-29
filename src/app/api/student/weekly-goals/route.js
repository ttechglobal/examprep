// src/app/api/student/weekly-goals/route.js
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function currentWeekStart() {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day  // days back to Monday
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10) // 'YYYY-MM-DD'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('weekly_goals')
      .select('id, text, completed, created_at')
      .eq('student_id', user.id)
      .eq('week_start', currentWeekStart())
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ goals: data ?? [], week_start: currentWeekStart() })
  } catch (e) {
    console.error('[weekly-goals GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { text } = await request.json()
    if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })

    const week = currentWeekStart()
    const { count } = await supabase
      .from('weekly_goals')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('week_start', week)
    if ((count ?? 0) >= 10) return NextResponse.json({ error: 'Max 10 goals per week' }, { status: 400 })

    const { data, error } = await supabase
      .from('weekly_goals')
      .insert({ student_id: user.id, text: text.trim(), week_start: week })
      .select('id, text, completed, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ goal: data })
  } catch (e) {
    console.error('[weekly-goals POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, completed, text } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates = {}
    if (typeof completed === 'boolean') updates.completed = completed
    if (text?.trim()) updates.text = text.trim()
    if (!Object.keys(updates).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    const { data, error } = await supabase
      .from('weekly_goals')
      .update(updates)
      .eq('id', id)
      .eq('student_id', user.id)
      .select('id, text, completed, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ goal: data })
  } catch (e) {
    console.error('[weekly-goals PATCH]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabase
      .from('weekly_goals')
      .delete()
      .eq('id', id)
      .eq('student_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[weekly-goals DELETE]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
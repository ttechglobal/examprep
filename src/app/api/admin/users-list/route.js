import { requireAdmin } from '@/lib/adminAuth'
// src/app/api/admin/users-list/route.js
// GET /api/admin/users-list
// Returns all student profiles with last_active and accuracy data.
// Used by /admin/users page.


import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}


export async function GET() {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const db = svc()

  // Fetch all student profiles, joined with school name
  const { data: profiles, error } = await db
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      exam_type,
      subjects,
      created_at,
      total_points,
      school_id,
      schools ( name )
    `)
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch streak data (last_active + streak count)
  const { data: streaks } = await db
    .from('student_streaks')
    .select('student_id, current_streak, last_active_date')

  const streakMap = {}
  for (const s of streaks ?? []) {
    streakMap[s.student_id] = s
  }

  // Fetch accuracy per student (% correct from question_attempts)
  const { data: accuracyRows } = await db
    .from('question_attempts')
    .select('student_id, is_correct')

  const attemptMap = {}
  for (const row of accuracyRows ?? []) {
    if (!attemptMap[row.student_id]) attemptMap[row.student_id] = { correct: 0, total: 0 }
    attemptMap[row.student_id].total++
    if (row.is_correct) attemptMap[row.student_id].correct++
  }

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const students = (profiles ?? []).map(p => {
    const streak   = streakMap[p.id]
    const attempts = attemptMap[p.id]
    const accuracy = attempts && attempts.total > 0
      ? Math.round((attempts.correct / attempts.total) * 100)
      : null

    return {
      id:              p.id,
      full_name:       p.full_name,
      email:           p.email,
      exam_type:       p.exam_type,
      subjects:        p.subjects ?? [],
      created_at:      p.created_at,
      total_points:    p.total_points ?? 0,
      school_name:     p.schools?.name ?? null,
      last_active:     streak?.last_active_date ?? null,
      streak:          streak?.current_streak ?? 0,
      accuracy,
      isActiveThisWeek: streak?.last_active_date >= weekAgo,
    }
  })

  return NextResponse.json({ students })
}
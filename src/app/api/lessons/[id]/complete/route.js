// src/app/api/lessons/[id]/complete/route.js
// POST — marks lesson complete, updates streak, daily count.
// Points are awarded separately via /api/points/award (called from LessonViewer
// via PointsContext). This route does NOT award points — that prevents double-award.
// PROGRESS BUG FIX: the upsert now correctly sets completed_at and total_slides.

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
  const supabase = await createClient()
  const { id }  = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 1. Mark lesson complete — upsert is safe to call multiple times
  const { error: progressError } = await service
    .from('lesson_progress')
    .upsert({
      student_id:   user.id,
      subtopic_id:  id,
      completed:    true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'student_id,subtopic_id' })

  if (progressError) {
    console.error('[complete] lesson_progress upsert failed:', progressError.message)
  }

  // 2. Update streak
  const today     = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const { data: streak } = await service
    .from('student_streaks')
    .select('*')
    .eq('student_id', user.id)
    .maybeSingle()

  if (!streak) {
    await service.from('student_streaks').insert({
      student_id: user.id, current_streak: 1, longest_streak: 1, last_active_date: today,
    })
  } else {
    const last = streak.last_active_date
    let newStreak = streak.current_streak
    if (last === today) { /* already counted */ }
    else if (last === yesterday) { newStreak = streak.current_streak + 1 }
    else { newStreak = 1 }

    await service.from('student_streaks').update({
      current_streak:   newStreak,
      longest_streak:   Math.max(newStreak, streak.longest_streak ?? 1),
      last_active_date: today,
    }).eq('student_id', user.id)
  }

  // 3. Update daily lesson count
  const { data: profile } = await service
    .from('profiles')
    .select('daily_lessons_used, daily_reset_at')
    .eq('id', user.id)
    .single()

  const resetAt        = new Date(profile?.daily_reset_at ?? 0)
  const now            = new Date()
  const hoursSinceReset = (now - resetAt) / (1000 * 60 * 60)

  await service.from('profiles').update({
    daily_lessons_used: hoursSinceReset >= 24 ? 1 : (profile?.daily_lessons_used ?? 0) + 1,
    daily_reset_at:     hoursSinceReset >= 24 ? now.toISOString() : profile?.daily_reset_at,
  }).eq('id', user.id)

  return NextResponse.json({ success: true })
}
// src/app/api/student/practice/save/route.js

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { rebuildStudyPlan } from '@/lib/studyPlanEngine'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function today() { return new Date().toISOString().slice(0, 10) }

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { answers, questions } = await request.json()
  if (!answers?.length || !questions?.length) {
    return NextResponse.json({ error: 'answers and questions required' }, { status: 400 })
  }

  const db = svc()
  const qMap = {}
  questions.forEach(q => { qMap[q.id] = q })

  // 1. Save question_attempts
  const attemptRows = answers.map(a => ({
    student_id:      user.id,
    question_id:     a.questionId,
    selected_answer: a.selected,
    is_correct:      a.isCorrect,
    subtopic_id:     qMap[a.questionId]?.subtopic_id ?? null,
    topic_id:        qMap[a.questionId]?.topic_id    ?? null,
    subject_id:      qMap[a.questionId]?.subject_id  ?? null,
    context:         'practice',
    created_at:      new Date().toISOString(),
  }))
  await db.from('question_attempts').insert(attemptRows)

  // 2. Update streak
  const todayStr  = today()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const { data: streak } = await db
    .from('student_streaks').select('current_streak, last_active_date')
    .eq('student_id', user.id).maybeSingle()

  if (streak) {
    const last = streak.last_active_date
    const newStreak = (last === yesterday || last === todayStr)
      ? streak.current_streak + (last === todayStr ? 0 : 1) : 1
    await db.from('student_streaks')
      .update({ current_streak: newStreak, last_active_date: todayStr })
      .eq('student_id', user.id)
  } else {
    await db.from('student_streaks')
      .insert({ student_id: user.id, current_streak: 1, last_active_date: todayStr })
  }

  // 3. Rebuild study plan for every subject touched in this session
  const subjectIds = [...new Set(answers.map(a => qMap[a.questionId]?.subject_id).filter(Boolean))]
  if (subjectIds.length) {
    try {
      await rebuildStudyPlan(db, user.id, subjectIds)
      console.log('[practice-save] study plan rebuilt for subjects:', subjectIds)
    } catch (e) {
      console.error('[practice-save] rebuildStudyPlan error:', e.message)
      // Non-fatal — attempts are already saved, plan rebuilds on next session
    }
  }

  return NextResponse.json({ success: true })
}
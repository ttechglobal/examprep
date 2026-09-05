// src/app/api/student/questions/flag/route.js
// POST — student submits a flag on a question (wrong answer, wrong explanation, etc.)
// Saves to question_flags table. Also marks the question as flagged in questions table.

import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }               from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { question_id, reason, detail, student_id } = body

    if (!question_id || !reason) {
      return NextResponse.json({ error: 'question_id and reason are required' }, { status: 400 })
    }

    const service = db()

    // Insert flag record
    const { error: flagError } = await service
      .from('question_flags')
      .insert({
        question_id,
        student_id:  student_id ?? null,
        reason,
        detail:      detail?.trim()?.slice(0, 500) ?? null,
        created_at:  new Date().toISOString(),
      })

    // If question_flags table doesn't exist yet, fall back to marking is_flagged on the question
    if (flagError) {
      // Graceful fallback: mark the question as flagged so admin can see it
      await service
        .from('questions')
        .update({ is_flagged: true, updated_at: new Date().toISOString() })
        .eq('id', question_id)
    } else {
      // Also mark the question as flagged so it surfaces in the admin flag filter
      await service
        .from('questions')
        .update({ is_flagged: true, updated_at: new Date().toISOString() })
        .eq('id', question_id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[flag] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
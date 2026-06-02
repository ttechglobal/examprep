// VERSION: 2025-STUDY-PLAN-FIX
// src/app/api/diagnostic/save/route.js

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { rebuildStudyPlan, seedCoreTopicsForSubject } from '@/lib/studyPlanEngine'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  const { examType, subjects, answers, questions } = body

  console.log('[diag-save] START — subjects:', subjects, '| questions:', questions?.length, '| answer keys:', Object.keys(answers ?? {}).length)

  const service = svc()

  // 1. Merge subjects into profile
  const { data: prof } = await service.from('profiles').select('subjects').eq('id', user.id).single()
  const merged = [...new Set([...(prof?.subjects ?? []), ...(subjects ?? [])])]
  await service.from('profiles').update({ exam_type: examType, subjects: merged }).eq('id', user.id)

  // 2. Resolve subject rows
  const { data: subjectRows } = await service.from('subjects').select('id, name').in('name', subjects ?? [])
  console.log('[diag-save] subjectRows:', subjectRows?.map(s => s.name))
  if (!subjectRows?.length) return NextResponse.json({ success: true, warning: 'no subjects found' })

  const subjectIdByName = {}
  subjectRows.forEach(s => { subjectIdByName[s.name] = s.id })

  // 3. Build and insert question_attempts
  const attemptRows = (questions ?? [])
    .filter(q => answers?.[q.id] !== undefined)
    .map(q => ({
      student_id:      user.id,
      question_id:     q.id,
      selected_answer: answers[q.id]?.selected_answer ?? answers[q.id]?.answer ?? null,
      is_correct:      answers[q.id]?.is_correct ?? false,
      subtopic_id:     q.subtopic_id ?? null,
      topic_id:        q.topic_id ?? null,
      subject_id:      q.subject_id ?? subjectIdByName[q.subject_name] ?? null,
      context:         'diagnostic',
      created_at:      new Date().toISOString(),
    }))
    .filter(r => r.question_id && r.subject_id)

  console.log('[diag-save] attemptRows:', attemptRows.length, '| sample:', JSON.stringify(attemptRows[0] ?? null))

  if (attemptRows.length > 0) {
    const { error: attErr } = await service.from('question_attempts').insert(attemptRows)
    if (attErr) console.error('[diag-save] INSERT ERROR:', attErr.message, attErr.code, attErr.details)
    else console.log('[diag-save] question_attempts inserted OK')
  } else {
    console.warn('[diag-save] NO attempt rows to insert — check answers/questions shape')
    console.log('[diag-save] questions[0]:', JSON.stringify(questions?.[0] ?? null))
    console.log('[diag-save] answers sample:', JSON.stringify(Object.entries(answers ?? {}).slice(0, 1)))
  }

  // 4. Per-subject: diagnostic result + learning path + core topic seed
  for (const sub of subjectRows) {
    const subQs = (questions ?? []).filter(q => q.subject_name === sub.name || q.subject_id === sub.id)
    const weakIds = [...new Set(subQs.filter(q => answers?.[q.id] && !answers[q.id].is_correct && q.subtopic_id).map(q => q.subtopic_id))]
    const total   = subQs.length
    const correct = subQs.filter(q => answers?.[q.id]?.is_correct).length
    const score   = total > 0 ? Math.round((correct / total) * 100) : 0

    console.log(`[diag-save] ${sub.name}: ${correct}/${total} = ${score}%`)

    await service.from('diagnostic_results').upsert({
      student_id: user.id, subject_id: sub.id, exam_type: examType,
      weak_subtopic_ids: weakIds, score, taken_at: new Date().toISOString(),
    }, { onConflict: 'student_id,subject_id' })

    const { data: subs } = await service
      .from('subtopics')
      .select('id, exam_frequency, topics!inner(subject_id)')
      .eq('topics.subject_id', sub.id)
      .order('exam_frequency', { ascending: false })

    if (subs?.length) {
      const ordered = [...subs.filter(s => weakIds.includes(s.id)), ...subs.filter(s => !weakIds.includes(s.id))]
      const { error: lpErr } = await service.from('student_learning_paths').upsert({
        student_id: user.id, subject_id: sub.id,
        ordered_subtopic_ids: ordered.map(s => s.id),
        last_calculated_at: new Date().toISOString(),
      }, { onConflict: 'student_id,subject_id' })
      if (lpErr) console.error('[diag-save] learning_path error:', lpErr.message)
      else console.log('[diag-save] learning_path OK for', sub.name)
    }

    // Seed core topics immediately so the plan isn't blank on first visit
    try {
      await seedCoreTopicsForSubject(service, user.id, sub.id)
      console.log('[diag-save] core topics seeded for', sub.name)
    } catch (e) {
      console.error('[diag-save] seedCoreTopics error:', e.message)
    }
  }

  // 5. Rebuild the full study plan now that all attempts are committed
  const subjectIds = subjectRows.map(s => s.id)
  try {
    await rebuildStudyPlan(service, user.id, subjectIds)
    console.log('[diag-save] study plan rebuilt for subjects:', subjectIds)
  } catch (e) {
    console.error('[diag-save] rebuildStudyPlan error:', e.message)
  }

  console.log('[diag-save] DONE')
  return NextResponse.json({ success: true })
}
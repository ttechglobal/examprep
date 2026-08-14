// src/app/api/student/subjects/route.js — v6
// Supports separate WAEC and JAMB subject lists per student.
// DB schema: profiles table should have two columns:
//   subjects_waec  text[]   (WAEC subject names)
//   subjects_jamb  text[]   (JAMB subject names)
//
// Migration to run in Supabase SQL editor:
//   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subjects_waec text[] DEFAULT '{}';
//   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subjects_jamb text[] DEFAULT '{}';
//   -- Back-fill existing students: copy their current subjects into both columns
//   UPDATE profiles SET subjects_waec = subjects, subjects_jamb = subjects WHERE subjects IS NOT NULL AND array_length(subjects,1) > 0;
//
// Falls back to legacy `profiles.subjects` if subjects_waec/subjects_jamb are empty,
// so existing students are not affected before migration runs.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const SUBJECT_ICONS = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮',
}

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = svc()
  const url = new URL(request.url)
  const examParam = url.searchParams.get('exam') // 'WAEC' | 'JAMB' | null

  const { data: profile } = await db
    .from('profiles')
    .select('subjects, subjects_waec, subjects_jamb, exam_type')
    .eq('id', user.id)
    .single()

  const profileExam = profile?.exam_type ?? 'WAEC'
  const examType    = examParam ?? (profileExam === 'BOTH' ? 'WAEC' : profileExam)

  // Pick the right list: prefer the exam-specific column, fall back to legacy subjects
  let subjectNames = []
  if (examType === 'WAEC') {
    subjectNames = profile?.subjects_waec?.length ? profile.subjects_waec : (profile?.subjects ?? [])
  } else {
    subjectNames = profile?.subjects_jamb?.length ? profile.subjects_jamb : (profile?.subjects ?? [])
  }

  if (!subjectNames.length) return NextResponse.json([])

  const { data: subjectRows } = await db
    .from('subjects')
    .select('id, name, slug, exam_type, is_active')
    .in('name', subjectNames)
    .eq('exam_type', examType)
    .eq('is_active', true)

  const allRows = subjectRows ?? []

  const realIds = allRows.map(s => s.id)
  let countMap = {}
  if (realIds.length) {
    const { data: counts } = await db
      .from('questions').select('subject_id').in('subject_id', realIds).eq('is_active', true)
    ;(counts ?? []).forEach(q => { countMap[q.subject_id] = (countMap[q.subject_id] ?? 0) + 1 })
  }

  const nameOrder = {}
  subjectNames.forEach((name, i) => { nameOrder[name] = i })

  return NextResponse.json(
    allRows
      .map(s => ({
        id: s.id, name: s.name, slug: s.slug, exam_type: s.exam_type,
        emoji: SUBJECT_ICONS[s.name] ?? '📝',
        question_count: countMap[s.id] ?? 0,
      }))
      .sort((a, b) => (nameOrder[a.name] ?? 99) - (nameOrder[b.name] ?? 99))
  )
}

// PATCH — update the student's subject list for a specific exam
// Body: { exam: 'WAEC' | 'JAMB', subjects: ['Chemistry', 'Physics', ...] }
export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { exam, subjects } = await request.json()
  if (!['WAEC', 'JAMB'].includes(exam)) {
    return NextResponse.json({ error: 'exam must be WAEC or JAMB' }, { status: 400 })
  }
  if (!Array.isArray(subjects)) {
    return NextResponse.json({ error: 'subjects must be an array' }, { status: 400 })
  }

  const db = svc()
  const col = exam === 'WAEC' ? 'subjects_waec' : 'subjects_jamb'
  const { error } = await db.from('profiles').update({ [col]: subjects }).eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, exam, subjects })
}
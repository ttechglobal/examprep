// src/app/api/student/subjects/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/subjects?exam=WAEC
//
// Returns the subjects the authenticated student is enrolled in, filtered
// to the requested exam type (WAEC or JAMB only — never IGCSE on student side).
//
// Reads from student_learning_paths joined to subjects so we only return
// subjects the student has actually enrolled in, not every subject in the DB.
// ─────────────────────────────────────────────────────────────────────────────

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
  'Chemistry':             '⚗️',
  'Physics':               '⚡',
  'Biology':               '🧬',
  'Mathematics':           '📐',
  'Further Mathematics':   '📐',
  'English Language':      '📖',
  'Use of English':        '📖',
  'Economics':             '📊',
  'Government':            '🏛️',
  'Geography':             '🌍',
  'Literature in English': '📚',
  'Agricultural Science':  '🌱',
  'Commerce':              '💼',
  'Accounting':            '🧮',
}

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const exam = searchParams.get('exam') // 'WAEC' | 'JAMB'

  const db = svc()

  // Load the student's enrolled subjects via their learning paths
  const { data: paths, error } = await db
    .from('student_learning_paths')
    .select('subject_id, subjects(id, name, slug, exam_type, is_active)')
    .eq('student_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get question counts per subject for the display label
  const subjectIds = (paths ?? []).map(p => p.subject_id).filter(Boolean)
  let countMap = {}
  if (subjectIds.length) {
    const { data: counts } = await db
      .from('questions')
      .select('subject_id')
      .in('subject_id', subjectIds)
      .eq('is_active', true)
    ;(counts ?? []).forEach(q => {
      countMap[q.subject_id] = (countMap[q.subject_id] ?? 0) + 1
    })
  }

  const subjects = (paths ?? [])
    .map(p => p.subjects)
    .filter(s =>
      s &&
      s.is_active &&
      // Only ever return WAEC or JAMB on the student side
      ['WAEC', 'JAMB'].includes(s.exam_type) &&
      // Filter to the requested exam if provided
      (!exam || s.exam_type === exam)
    )
    .map(s => ({
      id:             s.id,
      name:           s.name,
      slug:           s.slug,
      exam_type:      s.exam_type,
      emoji:          SUBJECT_ICONS[s.name] ?? '📝',
      question_count: countMap[s.id] ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json(subjects)
}
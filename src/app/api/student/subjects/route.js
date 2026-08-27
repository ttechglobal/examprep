// src/app/api/student/subjects/route.js — v7
// GET  /api/student/subjects?exam=WAEC  — returns student's saved subjects for that exam
// PATCH /api/student/subjects            — saves { exam, subjects: string[] } to profile
//
// The subjects table has ONE ROW PER EXAM per subject name.
// e.g. Mathematics exists twice: { name:'Mathematics', exam_type:'WAEC' } and { name:'Mathematics', exam_type:'JAMB' }
// The student profile stores subject NAMES (not IDs) in subjects_waec[] and subjects_jamb[].

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db       = svc()
  const url      = new URL(request.url)
  const examParam = url.searchParams.get('exam') ?? 'WAEC'

  const { data: profile } = await db
    .from('profiles')
    .select('subjects, subjects_waec, subjects_jamb, exam_type')
    .eq('id', user.id)
    .single()

  // Pick the right list — prefer exam-specific, fall back to legacy subjects[]
  let subjectNames = []
  if (examParam === 'WAEC') {
    subjectNames = profile?.subjects_waec?.length ? profile.subjects_waec : (profile?.subjects ?? [])
  } else {
    subjectNames = profile?.subjects_jamb?.length ? profile.subjects_jamb : (profile?.subjects ?? [])
  }

  if (!subjectNames.length) return NextResponse.json([])

  // Fetch subject rows matching both name AND exam_type
  // This avoids returning duplicate rows when the same subject exists for multiple exams
  const { data: subjectRows } = await db
    .from('subjects')
    .select('id, name, slug, exam_type, is_active')
    .in('name', subjectNames)
    .eq('exam_type', examParam)
    .eq('is_active', true)

  const rows = subjectRows ?? []

  // Count questions per subject
  const ids = rows.map(s => s.id)
  let countMap = {}
  if (ids.length) {
    const { data: counts } = await db
      .from('questions')
      .select('subject_id')
      .in('subject_id', ids)
      .eq('is_active', true)
    ;(counts ?? []).forEach(q => { countMap[q.subject_id] = (countMap[q.subject_id] ?? 0) + 1 })
  }

  const nameOrder = {}
  subjectNames.forEach((n, i) => { nameOrder[n] = i })

  return NextResponse.json(
    rows
      .map(s => ({
        id:             s.id,
        name:           s.name,
        slug:           s.slug,
        exam_type:      s.exam_type,
        question_count: countMap[s.id] ?? 0,
      }))
      .sort((a, b) => (nameOrder[a.name] ?? 99) - (nameOrder[b.name] ?? 99)),
    { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } }
  )
}

export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { exam, subjects } = body

  if (!['WAEC', 'JAMB'].includes(exam)) {
    return NextResponse.json({ error: 'exam must be WAEC or JAMB' }, { status: 400 })
  }
  if (!Array.isArray(subjects)) {
    return NextResponse.json({ error: 'subjects must be an array of strings' }, { status: 400 })
  }

  // Deduplicate subject names just in case
  const uniqueSubjects = [...new Set(subjects.filter(s => typeof s === 'string' && s.trim()))]

  const db  = svc()
  const col = exam === 'WAEC' ? 'subjects_waec' : 'subjects_jamb'

  const { error } = await db
    .from('profiles')
    .update({ [col]: uniqueSubjects })
    .eq('id', user.id)

  if (error) {
    // Column may not exist yet — tell the client clearly
    if (error.message?.includes('subjects_waec') || error.message?.includes('subjects_jamb') || error.code === '42703') {
      return NextResponse.json({
        error: `The ${col} column does not exist yet. Run the migration: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ${col} text[] DEFAULT '{}';`
      }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { ok: true, exam, subjects: uniqueSubjects },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
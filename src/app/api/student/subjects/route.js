// src/app/api/student/subjects/route.js — v3
// Simplified: reads directly from profiles.subjects (string array)
// cross-referenced against the subjects table. No dependency on
// student_learning_paths which may not exist or have RLS issues.

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

  // Read profile.subjects directly — this is the source of truth
  const { data: profile } = await db
    .from('profiles')
    .select('subjects, exam_type')
    .eq('id', user.id)
    .single()

  const subjectNames = profile?.subjects ?? []

  if (!subjectNames.length) {
    return NextResponse.json([])
  }

  // Look up subjects in DB to get IDs and metadata
  const { data: subjectRows } = await db
    .from('subjects')
    .select('id, name, slug, exam_type, is_active')
    .in('name', subjectNames)

  // For any name not found in DB, create a stub so UI still shows it
  const foundNames = new Set((subjectRows ?? []).map(s => s.name))
  const stubs = subjectNames
    .filter(name => !foundNames.has(name))
    .map((name, i) => ({
      id: `stub-${i}`, name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      exam_type: profile?.exam_type ?? 'WAEC',
      is_active: true,
    }))

  const allRows = [...(subjectRows ?? []), ...stubs]

  // Get question counts
  const realIds = (subjectRows ?? []).map(s => s.id)
  let countMap = {}
  if (realIds.length) {
    const { data: counts } = await db
      .from('questions').select('subject_id').in('subject_id', realIds).eq('is_active', true)
    ;(counts ?? []).forEach(q => { countMap[q.subject_id] = (countMap[q.subject_id] ?? 0) + 1 })
  }

  const result = allRows
    .filter(s => s.is_active !== false)
    .map(s => ({
      id:             s.id,
      name:           s.name,
      slug:           s.slug,
      exam_type:      s.exam_type,
      emoji:          SUBJECT_ICONS[s.name] ?? '📝',
      question_count: countMap[s.id] ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json(result)
}
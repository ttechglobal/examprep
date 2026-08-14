// src/app/api/student/formulas/route.js
// GET /api/student/formulas?topic_id=uuid
// GET /api/student/formulas?subject_id=uuid

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const topicId   = searchParams.get('topic_id')
  const subjectId = searchParams.get('subject_id')
  if (!topicId && !subjectId) return NextResponse.json({ error: 'topic_id or subject_id required' }, { status: 400 })

  const db = svcClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  let q = db.from('key_formulas').select('id, label, formula_plain, formula_latex, description, variables, example, topic_id').eq('is_active', true)
  if (topicId)   q = q.eq('topic_id',   topicId)
  if (subjectId) q = q.eq('subject_id', subjectId)
  const { data: formulas, error } = await q.order('label').limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ formulas: formulas ?? [] })
}
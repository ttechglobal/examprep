// src/app/api/admin/questions/bulk-delete/route.js
// DELETE — hard-delete all questions matching subject + exam + optional year filters.
// Requires admin auth. Always hard-deletes (no soft option for bulk ops).

import { requireAdmin }           from '@/lib/adminAuth'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }            from 'next/server'

function svc() {
  return svcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function DELETE(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  const examType  = searchParams.get('examType')
  const year      = searchParams.get('year')     // optional

  if (!subjectId || !examType) {
    return NextResponse.json(
      { error: 'subjectId and examType are required' },
      { status: 400 }
    )
  }

  const db = svc()
  let q = db.from('questions')
    .delete()
    .eq('subject_id', subjectId)
    .eq('exam_type',  examType)

  if (year) q = q.eq('year', year)

  const { error, count } = await q.select('id', { count: 'exact', head: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: count ?? 0 })
}
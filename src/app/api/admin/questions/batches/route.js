// src/app/api/admin/questions/batches/route.js
// Returns upload batch history, optionally filtered by subjectId and examType.
// Separate from /api/admin/questions/batch (which creates batches — POST only).
// v2 (29 Sep 2026): admin auth is requireAdmin() only. Removed the extra Supabase-login check, which returned 401 to admins signed in with the admin password (see ADMIN_AUTH_FIX.md).

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const adminError = await requireAdmin()
  if (adminError) return adminError

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  const examType  = searchParams.get('examType')
  const limit     = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

  const db = svc()

  let query = db
    .from('upload_batches')
    .select('id, exam_type, subject_id, total, saved, errors, created_at, subjects ( name )')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (subjectId) query = query.eq('subject_id', subjectId)
  if (examType)  query = query.eq('exam_type',  examType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const batches = (data ?? []).map(b => ({
    id:           b.id,
    exam_type:    b.exam_type,
    subject_id:   b.subject_id,
    subject_name: b.subjects?.name ?? null,
    total:        b.total,
    saved:        b.saved,
    errors:       b.errors,
    created_at:   b.created_at,
  }))

  return NextResponse.json({ batches })
}
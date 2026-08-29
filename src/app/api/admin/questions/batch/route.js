import { requireAdmin } from '@/lib/adminAuth'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const db = service()
  const { examType, subjectId, total } = await request.json()

  const { data, error } = await db
    .from('upload_batches')
    .insert({
      exam_type: examType,
      subject_id: subjectId,
      total,
      saved: 0,
      errors: 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function GET() {
  const db = service()
  const { data, error } = await db
    .from('upload_batches')
    .select('*, subjects(name)')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
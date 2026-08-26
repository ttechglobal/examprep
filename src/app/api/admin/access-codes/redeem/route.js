// src/app/api/access-codes/redeem/route.js
// POST — student redeems a code
// Body: { code: string }
// Returns: { ok, duration_days, access_expires_at, type, school_id }

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

function svc() {
  return svcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Login required to redeem a code' }, { status: 401 })

  const { code } = await request.json()
  if (!code?.trim()) return NextResponse.json({ error: 'Enter a code' }, { status: 400 })

  const db = svc()
  const normalised = code.trim().toUpperCase()

  const { data: accessCode } = await db
    .from('access_codes')
    .select('id, type, duration_days, max_uses, uses_count, is_active, expires_at, school_id')
    .eq('code', normalised)
    .single()

  if (!accessCode) return NextResponse.json({ error: 'Code not found. Check for typos and try again.' }, { status: 404 })
  if (!accessCode.is_active) return NextResponse.json({ error: 'This code has been deactivated.' }, { status: 410 })
  if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This code has expired.' }, { status: 410 })
  }
  if (accessCode.max_uses !== null && (accessCode.uses_count ?? 0) >= accessCode.max_uses) {
    return NextResponse.json({ error: 'This code has already been fully used.' }, { status: 410 })
  }

  const { data: existing } = await db
    .from('code_redemptions').select('id')
    .eq('code_id', accessCode.id).eq('student_id', user.id).maybeSingle()

  if (existing) return NextResponse.json({ error: 'You have already redeemed this code.' }, { status: 409 })

  const now             = new Date()
  const accessExpiresAt = new Date(now.getTime() + accessCode.duration_days * 86400000).toISOString()

  const [redemptionResult] = await Promise.all([
    db.from('code_redemptions').insert({
      code_id:           accessCode.id,
      student_id:        user.id,
      redeemed_at:       now.toISOString(),
      access_expires_at: accessExpiresAt,
      school_id:         accessCode.school_id ?? null,
    }),
    db.from('access_codes').update({ uses_count: (accessCode.uses_count ?? 0) + 1 }).eq('id', accessCode.id),
  ])

  if (redemptionResult.error) return NextResponse.json({ error: 'Failed to redeem. Please try again.' }, { status: 500 })

  const profileUpdate = { premium_until: accessExpiresAt }
  if (accessCode.school_id) profileUpdate.school_id = accessCode.school_id
  await db.from('profiles').update(profileUpdate).eq('id', user.id)

  if (accessCode.school_id) {
    const { data: activeCohort } = await db.from('cohorts')
      .select('id').eq('school_id', accessCode.school_id).eq('is_active', true).maybeSingle()
    if (activeCohort) {
      await db.from('cohort_members').upsert({
        cohort_id: activeCohort.id, student_id: user.id, joined_at: now.toISOString(),
      }, { onConflict: 'cohort_id,student_id' })
    }
  }

  return NextResponse.json({ ok: true, duration_days: accessCode.duration_days, access_expires_at: accessExpiresAt, type: accessCode.type, school_id: accessCode.school_id })
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.trim().toUpperCase()
  if (!code) return NextResponse.json({ valid: false, error: 'No code provided' })

  const db = svc()
  const { data: accessCode } = await db
    .from('access_codes')
    .select('type, duration_days, is_active, expires_at, max_uses, uses_count, school_id, schools(name)')
    .eq('code', code).maybeSingle()

  if (!accessCode) return NextResponse.json({ valid: false, error: 'Code not found' })
  if (!accessCode.is_active) return NextResponse.json({ valid: false, error: 'Code deactivated' })
  if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) return NextResponse.json({ valid: false, error: 'Code expired' })
  if (accessCode.max_uses !== null && (accessCode.uses_count ?? 0) >= accessCode.max_uses) return NextResponse.json({ valid: false, error: 'Code fully used' })

  return NextResponse.json({
    valid: true, type: accessCode.type, duration_days: accessCode.duration_days,
    school_name: accessCode.schools?.name ?? null,
    remaining: accessCode.max_uses !== null ? Math.max(0, accessCode.max_uses - (accessCode.uses_count ?? 0)) : null,
  })
}
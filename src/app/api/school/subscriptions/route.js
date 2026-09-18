// src/app/api/school/subscriptions/route.js
//
// Manages premium student slots for a school.
//
// GET    — returns the school's subscription list + slot counts
// POST   — add a student email to premium (consumes one slot)
// DELETE — remove a student from premium (frees one slot)
//
// Slot logic:
//   - schools.slots_purchased  — total slots the school has paid for (default 2)
//   - schools.slots_used       — how many are currently assigned
//   - school_subscriptions     — one row per active subscription, with the
//                                email the admin entered and the student_id
//                                once we find their account
//
// Student lookup:
//   - We find the student by email via auth.users (service role required)
//   - If found: flip profiles.plan = 'premium', create subscription row
//   - If not found: return a clear message — no slot is consumed

import { createClient }            from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }            from 'next/server'

function svc() {
  return svcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ── Auth helper — returns { adminUserId, schoolId, schoolEmail, db } or a Response
async function getAdminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const db = svc()

  const { data: profile } = await db
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'school_admin' || !profile?.school_id) {
    return { error: NextResponse.json({ error: 'No school found for this account' }, { status: 403 }) }
  }

  return { adminUserId: user.id, adminEmail: user.email, schoolId: profile.school_id, db }
}

// ── GET — list active subscriptions + slot counts ────────────────────────────
export async function GET() {
  const ctx = await getAdminContext()
  if (ctx.error) return ctx.error
  const { schoolId, db } = ctx

  const [{ data: school }, { data: subs }] = await Promise.all([
    db.from('schools')
      .select('id, name, slots_purchased, slots_used')
      .eq('id', schoolId)
      .single(),
    db.from('school_subscriptions')
      .select('id, email, student_id, assigned_at, profiles(full_name, exam_type)')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false }),
  ])

  return NextResponse.json({
    slots_purchased: school?.slots_purchased ?? 2,
    slots_used:      school?.slots_used      ?? 0,
    subscriptions:   (subs ?? []).map(s => ({
      id:          s.id,
      email:       s.email,
      student_id:  s.student_id,
      assigned_at: s.assigned_at,
      full_name:   s.profiles?.full_name ?? null,
      exam_type:   s.profiles?.exam_type ?? null,
    })),
  })
}

// ── POST — add a student by email ────────────────────────────────────────────
export async function POST(request) {
  const ctx = await getAdminContext()
  if (ctx.error) return ctx.error
  const { adminUserId, schoolId, db } = ctx

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }

  // 1. Check slots
  const { data: school } = await db
    .from('schools')
    .select('slots_purchased, slots_used, name')
    .eq('id', schoolId)
    .single()

  const purchased = school?.slots_purchased ?? 2
  const used      = school?.slots_used      ?? 0

  if (used >= purchased) {
    return NextResponse.json({
      error: `You have used all ${purchased} slot${purchased !== 1 ? 's' : ''}. Contact us on WhatsApp to buy more.`,
      slots_full: true,
    }, { status: 400 })
  }

  // 2. Check if already subscribed (avoid double-adding same email)
  const { data: existing } = await db
    .from('school_subscriptions')
    .select('id')
    .eq('school_id', schoolId)
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'This student is already on your subscription list.' }, { status: 409 })
  }

  // 3. Look up the student in auth.users by email (service role only)
  const { data: authList } = await db.auth.admin.listUsers({ perPage: 1000 })
  const authUser = (authList?.users ?? []).find(u => u.email?.toLowerCase() === email)

  if (!authUser) {
    return NextResponse.json({
      error: `No ExamPrep account found for ${email}. Ask the student to sign up at examprep.ng first, then add them here.`,
      not_registered: true,
    }, { status: 404 })
  }

  const studentId = authUser.id

  // 4. Insert subscription row + update plan + increment slots_used atomically
  const { data: sub, error: subError } = await db
    .from('school_subscriptions')
    .insert({
      school_id:   schoolId,
      email,
      student_id:  studentId,
      assigned_by: adminUserId,
      status:      'active',
    })
    .select()
    .single()

  if (subError) {
    console.error('[subscriptions POST] insert error:', subError.message)
    return NextResponse.json({ error: 'Failed to add student. Please try again.' }, { status: 500 })
  }

  // Flip student to premium
  await db.from('profiles')
    .update({ plan: 'premium' })
    .eq('id', studentId)

  // Increment slots_used
  await db.from('schools')
    .update({ slots_used: used + 1 })
    .eq('id', schoolId)

  // Fetch their profile name for the response
  const { data: studentProfile } = await db
    .from('profiles')
    .select('full_name, exam_type')
    .eq('id', studentId)
    .single()

  return NextResponse.json({
    ok: true,
    subscription: {
      id:          sub.id,
      email,
      student_id:  studentId,
      assigned_at: sub.assigned_at,
      full_name:   studentProfile?.full_name ?? null,
      exam_type:   studentProfile?.exam_type ?? null,
    },
    slots_used:      used + 1,
    slots_purchased: purchased,
  })
}

// ── DELETE — remove a student, free the slot ─────────────────────────────────
export async function DELETE(request) {
  const ctx = await getAdminContext()
  if (ctx.error) return ctx.error
  const { schoolId, db } = ctx

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { subscription_id } = body
  if (!subscription_id) {
    return NextResponse.json({ error: 'subscription_id required' }, { status: 400 })
  }

  // Fetch the subscription (must belong to this school)
  const { data: sub } = await db
    .from('school_subscriptions')
    .select('id, student_id, status, schools(slots_used)')
    .eq('id', subscription_id)
    .eq('school_id', schoolId)
    .single()

  if (!sub) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }
  if (sub.status !== 'active') {
    return NextResponse.json({ error: 'Already removed' }, { status: 409 })
  }

  // Mark as removed
  await db.from('school_subscriptions')
    .update({ status: 'removed' })
    .eq('id', subscription_id)

  // Revert student to free plan
  if (sub.student_id) {
    await db.from('profiles')
      .update({ plan: 'free' })
      .eq('id', sub.student_id)
  }

  // Decrement slots_used (floor at 0)
  const currentUsed = sub.schools?.slots_used ?? 0
  await db.from('schools')
    .update({ slots_used: Math.max(0, currentUsed - 1) })
    .eq('id', schoolId)

  return NextResponse.json({ ok: true })
}
// src/app/api/student/subjects/route.js — v8
// GET  /api/student/subjects?exam=WAEC&names=Math,Physics
//   → Returns subject rows for the given names + exam.
//   → Does NOT require auth. Names are passed by the client from local profile.
//   → Single DB query. Cached aggressively.
//
// PATCH /api/student/subjects
//   → Saves subject selections to profile (auth required).
//
// Why name-based instead of auth-based:
//   The old version did auth → profile fetch → subject names → subject rows = 3 round trips.
//   This version receives names directly from the client (already in local profile),
//   does ONE query, and returns rows. Guests work too — no auth needed for GET.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const CACHE_SECS = 300 // 5 min — subjects don't change often

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function GET(request) {
  const url       = new URL(request.url)
  const examParam = (url.searchParams.get('exam') ?? 'WAEC').toUpperCase()
  const namesParam = url.searchParams.get('names') // comma-separated subject names

  // ── Path A: client sends subject names directly (local-first) ──────────────
  if (namesParam) {
    const names = namesParam.split(',').map(n => n.trim()).filter(Boolean)
    if (!names.length) return NextResponse.json([], {
      headers: { 'Cache-Control': `public, max-age=${CACHE_SECS}, stale-while-revalidate=600` }
    })

    const db = svc()
    const { data: rows } = await db
      .from('subjects')
      .select('id, name, slug, exam_type')
      .in('name', names)
      .eq('exam_type', examParam)
      .eq('is_active', true)

    const nameOrder = {}
    names.forEach((n, i) => { nameOrder[n] = i })

    return NextResponse.json(
      (rows ?? [])
        .map(s => ({ id: s.id, name: s.name, slug: s.slug, exam_type: s.exam_type }))
        .sort((a, b) => (nameOrder[a.name] ?? 99) - (nameOrder[b.name] ?? 99)),
      { headers: { 'Cache-Control': `public, max-age=${CACHE_SECS}, stale-while-revalidate=600` } }
    )
  }

  // ── Path B: legacy — auth-based lookup (authenticated users, no names param) ─
  // Kept for backward compatibility. Fetches names from profile then resolves rows.
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json([], { status: 200 }) // guests return empty, not 401

    const db = svc()

    // Single query — get profile + resolve in parallel
    const [{ data: profile }] = await Promise.all([
      db.from('profiles')
        .select('subjects, subjects_waec, subjects_jamb')
        .eq('id', user.id)
        .single()
    ])

    let subjectNames = []
    if (examParam === 'WAEC') {
      subjectNames = profile?.subjects_waec?.length ? profile.subjects_waec : (profile?.subjects ?? [])
    } else {
      subjectNames = profile?.subjects_jamb?.length ? profile.subjects_jamb : (profile?.subjects ?? [])
    }

    if (!subjectNames.length) return NextResponse.json([], {
      headers: { 'Cache-Control': `private, max-age=60` }
    })

    const { data: rows } = await db
      .from('subjects')
      .select('id, name, slug, exam_type')
      .in('name', subjectNames)
      .eq('exam_type', examParam)
      .eq('is_active', true)

    const nameOrder = {}
    subjectNames.forEach((n, i) => { nameOrder[n] = i })

    return NextResponse.json(
      (rows ?? [])
        .map(s => ({ id: s.id, name: s.name, slug: s.slug, exam_type: s.exam_type }))
        .sort((a, b) => (nameOrder[a.name] ?? 99) - (nameOrder[b.name] ?? 99)),
      { headers: { 'Cache-Control': `private, max-age=60, stale-while-revalidate=120` } }
    )
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { exam, subjects } = body

  if (!['WAEC', 'JAMB'].includes(exam)) {
    return NextResponse.json({ error: 'exam must be WAEC or JAMB' }, { status: 400 })
  }
  if (!Array.isArray(subjects)) {
    return NextResponse.json({ error: 'subjects must be an array of strings' }, { status: 400 })
  }

  const uniqueSubjects = [...new Set(subjects.filter(s => typeof s === 'string' && s.trim()))]
  const db  = svc()
  const col = exam === 'WAEC' ? 'subjects_waec' : 'subjects_jamb'

  // Build update — always write the exam-specific column.
  // Also update the legacy `subjects` column so older code paths still work.
  const update = {
    [col]:     uniqueSubjects,
    subjects:  uniqueSubjects,   // keep legacy column in sync
  }

  const { error } = await db
    .from('profiles')
    .update(update)
    .eq('id', user.id)

  if (error) {
    // Column doesn't exist yet — tell the dev exactly what to run
    if (error.code === '42703') {
      return NextResponse.json({
        error: `Column missing. Run migration: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ${col} text[] DEFAULT '{}';`
      }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { ok: true, exam, subjects: uniqueSubjects },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
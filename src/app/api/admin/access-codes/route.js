// src/app/api/admin/access-codes/route.js
// GET  — list all codes with redemption stats
// POST — generate one or bulk codes

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'
import crypto                        from 'crypto'

function svc() {
  return svcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ── Code generator ─────────────────────────────────────────────────────────────
// School codes:  KC-A7X2B9   (prefix-XXXXXX)
// Promo codes:   LAUNCH2026  (custom string, uppercased)
// Voucher codes: EP-XXXX-XXXX-XXXX (longer, for physical print)
function generateCode(type, prefix = '') {
  const rand = (n) => crypto.randomBytes(n).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, n * 1.5).slice(0, n)

  if (type === 'school') {
    const pfx = prefix ? prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) : 'EP'
    return `${pfx}-${rand(3)}${rand(3)}`
  }
  if (type === 'voucher') {
    return `EP-${rand(4)}-${rand(4)}-${rand(4)}`
  }
  // promo — use prefix as the whole code if given, else random
  if (prefix) return prefix.toUpperCase().replace(/\s+/g, '-').slice(0, 24)
  return `PROMO-${rand(6)}`
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = svc()

  const { data: codes, error } = await db
    .from('access_codes')
    .select(`
      id, code, type, duration_days, max_uses, uses_count,
      is_active, expires_at, created_at, metadata,
      school_id, schools ( name )
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get redemption details for each code
  const codeIds = (codes ?? []).map(c => c.id)
  let redemptions = []
  if (codeIds.length) {
    const { data } = await db
      .from('code_redemptions')
      .select('code_id, redeemed_at, access_expires_at, student_id')
      .in('code_id', codeIds)
      .order('redeemed_at', { ascending: false })
    redemptions = data ?? []
  }

  const redemptionMap = {}
  for (const r of redemptions) {
    if (!redemptionMap[r.code_id]) redemptionMap[r.code_id] = []
    redemptionMap[r.code_id].push(r)
  }

  const enriched = (codes ?? []).map(c => ({
    ...c,
    school_name: c.schools?.name ?? null,
    redemptions: redemptionMap[c.id] ?? [],
    remaining:   c.max_uses !== null ? Math.max(0, c.max_uses - (c.uses_count ?? 0)) : null,
  }))

  return NextResponse.json({ codes: enriched })
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    type         = 'voucher',   // 'school' | 'promo' | 'voucher'
    school_id    = null,
    prefix       = '',           // school prefix or promo code string
    duration_days = 30,
    max_uses     = 1,            // null = unlimited (school-wide)
    expires_at   = null,         // ISO string or null
    quantity     = 1,            // bulk generation
    note         = '',
  } = body

  if (!['school', 'promo', 'voucher'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  if (quantity < 1 || quantity > 500) {
    return NextResponse.json({ error: 'Quantity must be 1–500' }, { status: 400 })
  }

  const db = svc()

  // Generate unique codes (retry on collision)
  const rows = []
  const attempts = quantity * 5  // over-generate to handle rare collisions
  const generated = new Set()

  for (let i = 0; i < attempts && rows.length < quantity; i++) {
    const code = type === 'promo' && prefix && quantity === 1
      ? prefix.toUpperCase().replace(/\s+/g, '-').slice(0, 24)
      : generateCode(type, prefix)

    if (generated.has(code)) continue
    generated.add(code)

    rows.push({
      code,
      type,
      school_id:    type === 'school' ? school_id : null,
      duration_days,
      max_uses:     type === 'school' ? (max_uses ?? null) : (type === 'promo' ? (max_uses ?? null) : 1),
      uses_count:   0,
      is_active:    true,
      expires_at:   expires_at ?? null,
      created_by:   user.id,
      metadata:     { note: note || null, prefix: prefix || null },
    })
  }

  if (rows.length < quantity) {
    return NextResponse.json({ error: 'Could not generate enough unique codes' }, { status: 500 })
  }

  // Upsert — skip codes that already exist
  const { data: inserted, error } = await db
    .from('access_codes')
    .insert(rows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ codes: inserted, count: inserted.length })
}

export async function PATCH(request) {
  // Toggle is_active on a code
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, is_active } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = svc()
  const { error } = await db
    .from('access_codes')
    .update({ is_active })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
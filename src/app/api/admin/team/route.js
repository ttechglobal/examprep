// src/app/api/admin/team/route.js
// The admin team (admin_users, 20261007_schools_and_admin_log.sql).
// GET  → { team: [...], you: { id, name, owner } }   any admin
// POST { name, email, password } → add a team member  owner only
//      Each member signs in with their own email and password, so the
//      activity log shows who did what.

import { NextResponse }  from 'next/server'
import { adminContext, actorOf, OWNER_ID, ownerName } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { hashPassword, MIN_PASSWORD_LENGTH } from '@/lib/server/adminPasswords'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COLUMNS = 'id, name, email, active, created_at, created_by, last_login_at'

export async function GET() {
  const { admin, error } = await adminContext()
  if (error) return error
  try {
    const { data, error: dbError } = await supabaseAdmin().from('admin_users').select(COLUMNS).order('created_at')
    if (dbError) throw dbError
    const owner = { id: OWNER_ID, name: ownerName(), email: null, active: true, owner: true }
    return NextResponse.json({ team: [owner, ...(data ?? [])], you: admin }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[admin/team] GET:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load the team' }, { status: 500 })
  }
}

export async function POST(request) {
  const { admin, error } = await adminContext({ owner: true })
  if (error) return error

  let body = {}
  try { body = await request.json() } catch {}
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (name.length < 2 || name.length > 80) return NextResponse.json({ error: 'Enter their name (2–80 characters)' }, { status: 400 })
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  if (password.length < MIN_PASSWORD_LENGTH) return NextResponse.json({ error: `The password needs at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 })

  try {
    const { data, error: dbError } = await supabaseAdmin().rpc('admin_team_add', {
      p_actor: actorOf(admin), p_name: name, p_email: email, p_password_hash: await hashPassword(password),
    })
    if (dbError) {
      if (/email_taken/.test(dbError.message ?? '')) return NextResponse.json({ error: 'Someone on the team already uses that email' }, { status: 409 })
      throw dbError
    }
    const { password_hash: _hash, ...member } = data
    return NextResponse.json({ member })
  } catch (err) {
    console.error('[admin/team] POST:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not add the team member' }, { status: 500 })
  }
}

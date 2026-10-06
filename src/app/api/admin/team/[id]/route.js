// src/app/api/admin/team/[id]/route.js
// PATCH { active?: boolean, password?: string } → owner only.
//   active false removes a team member's access at once (their session stops
//   working on the next request); true restores it. password resets theirs.
// Response: { member }

import { NextResponse }  from 'next/server'
import { adminContext, actorOf } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { hashPassword, MIN_PASSWORD_LENGTH } from '@/lib/server/adminPasswords'
import { UUID_RE } from '@/lib/uuid'

export async function PATCH(request, { params }) {
  const { admin, error } = await adminContext({ owner: true })
  if (error) return error
  const { id } = await params
  if (!UUID_RE.test(id ?? '')) return NextResponse.json({ error: 'Invalid team member' }, { status: 400 })

  let body = {}
  try { body = await request.json() } catch {}
  const active = typeof body.active === 'boolean' ? body.active : null
  const password = typeof body.password === 'string' ? body.password : null
  if (active === null && password === null) return NextResponse.json({ error: 'Nothing to change' }, { status: 400 })
  if (password !== null && password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `The password needs at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 })
  }

  try {
    const { data, error: dbError } = await supabaseAdmin().rpc('admin_team_update', {
      p_actor: actorOf(admin), p_id: id, p_active: active,
      p_password_hash: password === null ? null : await hashPassword(password),
    })
    if (dbError) {
      if (/not_found/.test(dbError.message ?? '')) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      throw dbError
    }
    const { password_hash: _hash, ...member } = data
    return NextResponse.json({ member })
  } catch (err) {
    console.error('[admin/team/:id] PATCH:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not update the team member' }, { status: 500 })
  }
}

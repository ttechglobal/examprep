// src/lib/adminAuth.js
// ─────────────────────────────────────────────────────────────────────────────
// Who the admin is. Middleware already rejects unsigned /api/admin/* requests;
// every admin route and the admin layout check again here.
//
//   Owner        signs in with ADMIN_PASSWORD (named ADMIN_OWNER_NAME, default
//                "Owner"); manages the team.
//   Team member  a row in admin_users with their own email and password
//                (20261007_schools_and_admin_log.sql). Checked against the
//                table on every request, so disabling them ends their access
//                at once, not when their 8-hour session runs out.
//
//   const authError = await requireAdmin()          // routes that just need an admin
//   if (authError) return authError
//
//   const { admin, error } = await adminContext()   // routes that record who acted
//   if (error) return error
//   … db.rpc('…', { p_actor: actorOf(admin) })
//
// v2: admins have identities (owner or team member) for the activity log.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/adminSession'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'

export const OWNER_ID = 'owner'
export const ownerName = () => process.env.ADMIN_OWNER_NAME?.trim() || 'Owner'

/** The signed-in admin { id, name, owner }, or null. */
export async function getAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value
  const session = await verifyAdminToken(token)
  if (!session) return null
  if (session.owner) return { id: OWNER_ID, name: ownerName(), owner: true }

  const { data, error } = await supabaseAdmin()
    .from('admin_users').select('id, name, active').eq('id', session.id).maybeSingle()
  if (error) {
    console.error('[adminAuth] admin_users:', error.message)
    return null
  }
  return data?.active ? { id: data.id, name: data.name, owner: false } : null
}

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

/** null when an admin is signed in, otherwise the 401 response to return. */
export async function requireAdmin() {
  return (await getAdmin()) ? null : unauthorized()
}

/** { admin } or { error }. owner: true also requires the owner login. */
export async function adminContext({ owner = false } = {}) {
  const admin = await getAdmin()
  if (!admin) return { error: unauthorized() }
  if (owner && !admin.owner) return { error: NextResponse.json({ error: 'Only the owner can do this' }, { status: 403 }) }
  return { admin }
}

/** The actor the activity log records for this admin. */
export const actorOf = admin => ({ type: 'admin', id: admin.id, name: admin.name })

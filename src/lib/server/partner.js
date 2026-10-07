// src/lib/server/partner.js
// Shared by the /api/partner/* routes (the Teacher Ambassador portal).
// Server-only: uses the service-role client.
//
//   requirePartner()   who is signed in? → { user, db } or { error: NextResponse }
//                      One auth check and nothing else. Whether they are an ambassador
//                      is enforced by the SQL functions each route calls
//                      (ambassador_dashboard returns null, ambassador_generate_code
//                      raises 'ambassador not found'), which saves a query per request.
//   lagosYear()        this year in Nigerian time (the dashboard's default view)

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'

export async function requirePartner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) {
    return { error: NextResponse.json({ error: 'Sign in first' }, { status: 401 }) }
  }
  return { user, db: supabaseAdmin() }
}

export function lagosYear() {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', year: 'numeric' }).format(new Date()))
}

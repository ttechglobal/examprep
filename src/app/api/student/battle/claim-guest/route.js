// src/app/api/student/battle/claim-guest/route.js
// POST { guest_token } → moves a battle guest's 1v1 results onto the account
// that is now signed in. Called by lib/auth/client.js right after sign-up or
// sign-in when the device was playing on a guest (anonymous) login.
//
// The guest token is the guest login's access token. Holding it proves the
// caller owns that guest, so one student can't claim another's battles.
// Safe to retry: a second claim finds nothing left to move.
import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'

export async function POST(req) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.is_anonymous) {
      return NextResponse.json({ ok: false, error: 'Sign in first.' }, { status: 401 })
    }

    let body = {}
    try { body = await req.json() } catch {}
    const token = typeof body.guest_token === 'string' ? body.guest_token : ''
    if (!token || token.length > 4096) {
      return NextResponse.json({ ok: false, error: 'guest_token is required' }, { status: 400 })
    }

    const admin = supabaseAdmin()
    const { data: guestData, error: guestError } = await admin.auth.getUser(token)
    const guest = guestData?.user
    if (guestError || !guest?.is_anonymous || guest.id === user.id) {
      // Expired token, or not a guest login: nothing to move.
      return NextResponse.json({ ok: true, matches: 0, xp: 0 })
    }

    const { data, error } = await admin.rpc('merge_battle_guest', { p_anon: guest.id, p_new: user.id })
    if (error) {
      console.error('[claim-guest] merge failed:', error.message)
      return NextResponse.json({ ok: false, error: 'Could not move your battles. Please try again.' }, { status: 500 })
    }

    // Everything the guest login owned now belongs to the account.
    const { error: deleteError } = await admin.auth.admin.deleteUser(guest.id)
    if (deleteError) console.warn('[claim-guest] guest login not deleted:', deleteError.message)

    return NextResponse.json({ ok: true, ...data })
  } catch (e) {
    console.error('[claim-guest]', e?.message ?? e)
    return NextResponse.json({ ok: false, error: 'Could not move your battles. Please try again.' }, { status: 500 })
  }
}

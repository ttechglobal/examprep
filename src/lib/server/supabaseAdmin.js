// src/lib/server/supabaseAdmin.js
// Service-role Supabase client for API routes. Server-only: never import this
// from a 'use client' file. Bypasses RLS, so every caller must check who the
// user is and what they may see before querying.
import { createClient } from '@supabase/supabase-js'

export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

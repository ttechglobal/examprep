// src/lib/server/rateLimit.js
// A small per-visitor limit for public endpoints that reach the database
// (the project is on Supabase's free plan, so one noisy client shouldn't be able
// to run up queries).
//
//   const limited = rateLimited(request, 'referral-check', 30, 60_000)
//   if (limited) return limited          // a 429 response, or null when fine
//
// In memory, per server instance, like lib/server/memo.js: it stops a script
// hammering one instance, not a distributed attack. Visitors are told apart by
// the first address in x-forwarded-for.

import { NextResponse } from 'next/server'

const windows = new Map()      // `${name}:${ip}` → { count, resetAt }
const MAX_ENTRIES = 5000

function visitor(request) {
  const forwarded = request.headers.get('x-forwarded-for') ?? ''
  return forwarded.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown'
}

/** A 429 response once `limit` requests have come from one visitor within `windowMs`; otherwise null. */
export function rateLimited(request, name, limit, windowMs) {
  const now = Date.now()
  const key = `${name}:${visitor(request)}`
  let entry = windows.get(key)
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs }
    windows.set(key, entry)
    if (windows.size > MAX_ENTRIES) {
      for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k)
      if (windows.size > MAX_ENTRIES) windows.clear()   // all still live: start over rather than grow
    }
  }
  entry.count += 1
  if (entry.count <= limit) return null
  return NextResponse.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)) } })
}

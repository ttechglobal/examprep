// src/lib/auth/redirectToOnboarding.js
// Server helper for the retired auth pages (/signup, /register, /login).
// They all forward to /onboarding with the right mode and any useful params,
// so old links, bookmarks and notifications keep working.

import { redirect } from 'next/navigation'

const KEEP = ['from', 'join', 'error']

export async function redirectToOnboarding(searchParamsPromise, mode) {
  const sp = (await searchParamsPromise) ?? {}
  const q = new URLSearchParams({ mode })
  for (const key of KEEP) {
    const v = sp[key]
    if (typeof v === 'string' && v) q.set(key, v)
  }
  redirect(`/onboarding?${q.toString()}`)
}

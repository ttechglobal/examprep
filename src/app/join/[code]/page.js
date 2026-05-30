// src/app/join/[code]/page.js
// Landing page for invite links: /join/ABC123
// Works for both class codes and cohort/school codes.
// Shows a welcome screen → prompts sign up or log in to join.
// No 404 — always renders something useful.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import Link from 'next/link'

async function lookupCode(code) {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Try class first
  const { data: cls } = await service
    .from('classes')
    .select('id, name, is_active')
    .eq('invite_code', code.toUpperCase())
    .maybeSingle()

  if (cls) return { type: 'class', name: cls.name, active: cls.is_active, code }

  // Try cohort
  const { data: cohort } = await service
    .from('cohorts')
    .select('id, name, invite_active, is_active, schools(name, city)')
    .eq('invite_code', code.toUpperCase())
    .maybeSingle()

  if (cohort) return {
    type: 'cohort',
    name: cohort.name,
    school: cohort.schools?.name,
    city: cohort.schools?.city,
    active: cohort.invite_active && cohort.is_active,
    code,
  }

  return null
}

export default async function JoinPage({ params }) {
  const { code } = await params
  const info = await lookupCode(code)

  // Encode the code so the login/signup page can redirect back and auto-join
  const signupUrl  = `/signup?join=${code}&type=${info?.type ?? 'class'}`
  const loginUrl   = `/login?join=${code}&type=${info?.type ?? 'class'}`

  if (!info) {
    // Code not found — still show something useful, not a 404
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
            <span className="text-3xl">🔍</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-primary mb-2">Invite link not found</h1>
            <p className="text-secondary text-sm leading-relaxed">
              This invite code (<span className="font-mono font-bold text-primary">{code.toUpperCase()}</span>) doesn't match any class or school. It may have expired or been typed incorrectly.
            </p>
          </div>
          <Link href="/signup"
            className="block w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors text-center">
            Create a free account anyway →
          </Link>
          <Link href="/" className="block text-sm text-secondary hover:text-primary transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  if (!info.active) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
            <span className="text-3xl">⏸️</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-primary mb-2">Invites paused</h1>
            <p className="text-secondary text-sm leading-relaxed">
              <span className="font-bold text-primary">{info.name}</span> is not currently accepting new members. Ask your teacher to reopen invites.
            </p>
          </div>
          <Link href="/"
            className="block w-full py-3.5 bg-subtle text-primary text-sm font-bold rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors text-center border border-default">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">

        {/* ExamPrep wordmark */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-white text-sm font-black">EP</span>
            </div>
            <span className="text-xl font-black text-primary tracking-tight">ExamPrep</span>
          </div>
        </div>

        {/* Invite card */}
        <div className="bg-card rounded-3xl shadow-lg overflow-hidden border border-default">
          {/* Coloured banner */}
          <div className={`px-6 py-6 text-white text-center ${
            info.type === 'cohort'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
              : 'bg-gradient-to-r from-indigo-500 to-violet-600'
          }`}>
            <p className="text-4xl mb-2">{info.type === 'cohort' ? '🏫' : '👥'}</p>
            <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">
              {info.type === 'cohort' ? 'You\'ve been invited to join' : 'You\'ve been invited to join'}
            </p>
            <h1 className="text-xl font-black leading-tight">{info.name}</h1>
            {info.school && (
              <p className="text-sm opacity-80 mt-1">{info.school}{info.city ? `, ${info.city}` : ''}</p>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-3">
            <p className="text-sm text-secondary text-center leading-relaxed">
              Join your {info.type === 'cohort' ? 'school' : 'class'} on ExamPrep to track progress together, compete on the leaderboard, and prepare for WAEC and JAMB.
            </p>

            {/* Code badge */}
            <div className="flex justify-center py-2">
              <div className="flex items-center gap-2 bg-subtle rounded-2xl px-4 py-2.5">
                <span className="text-xs text-secondary font-medium">Invite code</span>
                <span className="text-lg font-black text-primary tracking-widest font-mono">{code.toUpperCase()}</span>
              </div>
            </div>

            <Link href={signupUrl}
              className="block w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all text-center shadow-sm">
              Create free account & join →
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-default" />
              <span className="text-xs text-tertiary">or</span>
              <div className="flex-1 h-px bg-default" />
            </div>

            <Link href={loginUrl}
              className="block w-full py-3 border border-default text-primary text-sm font-bold rounded-2xl hover:bg-subtle transition-colors text-center">
              Sign in to existing account
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-tertiary leading-relaxed">
          ExamPrep helps Nigerian students prepare for WAEC and JAMB with personalised study plans and practice questions.
        </p>
      </div>
    </div>
  )
}
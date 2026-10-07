'use client'
// src/app/onboarding/page.js
// ─────────────────────────────────────────────────────────────────────────────
// The single student entry point.
//
//   Signed in             → straight into the app (or back to ?from)
//   ?mode=signin          → sign-in screen (used by every "Sign in" link)
//   ?mode=signup          → sign-up screen, but a first-time visitor sees the
//                           intro slides first (the landing page's "Start practising")
//   First visit           → intro slides, then the sign-up screen
//   Seen the intro before → sign-up screen
//
// Other params: ?from=/path (return after sign-in), ?join=CODE (invite links),
// ?ref=CODE (a teacher's referral code, from /r/CODE; prefilled on sign-up).
// /signup, /register and /login all redirect here, so there is exactly one
// sign-up screen in the product.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { hasSeenIntro, markIntroSeen, continueAsGuest, destinationAfterAuth, isAccountSession } from '@/lib/auth/client'
import { saveReferral } from '@/lib/referral'
import IntroSlides from '@/components/onboarding/IntroSlides'
import AuthPanel from '@/components/onboarding/AuthPanel'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { endLaunchSplash } from '@/lib/launchSplash'
import s from '@/components/onboarding/onboarding.module.css'

function Onboarding() {
  const router = useRouter()
  const params = useSearchParams()
  const mode   = params.get('mode')
  const from   = params.get('from')
  const join   = params.get('join')
  const ref    = params.get('ref')      // a teacher's referral code (see /r/[code])
  const authError = params.get('error') === 'auth_failed'

  const [view, setView] = useState('checking')   // 'checking' | 'intro' | 'auth'

  // Keep a referral code through the intro slides and any page changes before sign-up.
  useEffect(() => { if (ref) saveReferral(ref) }, [ref])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let session = null
      try { ({ data: { session } } = await createClient().auth.getSession()) } catch {}
      if (cancelled) return
      // A battle-guest login (1v1 invite) isn't an account: they still sign up here.
      if (isAccountSession(session)) {
        router.replace(await destinationAfterAuth({ from, join }))
        return
      }
      // mode=signup does NOT skip the slides: the landing page's "Start practising"
      // sends first-time visitors here, and they should meet Zara before the form.
      // Anyone who has seen the slides (or continued as a guest) goes straight to it.
      if (mode === 'signin' || join || from) setView('auth')
      else setView(hasSeenIntro() ? 'auth' : 'intro')
    })()
    return () => { cancelled = true }
  }, [router, mode, from, join])

  // Intro or sign-up is on screen: end the installed-app launch splash.
  useEffect(() => {
    if (view !== 'checking') endLaunchSplash()
  }, [view])

  async function handleAuthed() {
    router.replace(await destinationAfterAuth({ from, join }))
  }

  function handleGuest() {
    continueAsGuest()
    markIntroSeen()
    router.replace('/student/home')
  }

  if (view === 'checking') return <LoadingScreen />

  return (
    <main className={s.screen}>
      <div className={s.bg} aria-hidden="true" />
      <div className={s.column}>
        {view === 'intro' ? (
          <IntroSlides onDone={() => { markIntroSeen(); setView('auth') }} />
        ) : (
          <>
            {authError && (
              <div className={s.error} role="alert" style={{ marginTop: 12 }}>
                That sign-in link didn&apos;t work. Sign in with your phone number or email instead.
              </div>
            )}
            <AuthPanel
              initialMode={mode === 'signin' ? 'signin' : 'signup'}
              refParam={ref}
              onAuthed={handleAuthed}
              onGuest={handleGuest}
            />
          </>
        )}
      </div>
    </main>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Onboarding />
    </Suspense>
  )
}

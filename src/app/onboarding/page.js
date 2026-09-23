'use client'
// src/app/onboarding/page.js
// ─────────────────────────────────────────────────────────────────────────────
// The single student entry point.
//
//   Signed in             → straight into the app (or back to ?from)
//   ?mode=signup|signin   → sign-up / sign-in screen (used by every
//                           "Create account" and "Sign in" link in the app)
//   First visit           → intro slides, then the sign-up screen
//   Seen the intro before → sign-up screen
//
// Other params: ?from=/path (return after sign-in), ?join=CODE (invite links).
// /signup, /register and /login all redirect here, so there is exactly one
// sign-up screen in the product.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { hasSeenIntro, markIntroSeen, continueAsGuest, destinationAfterAuth } from '@/lib/auth/client'
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
  const authError = params.get('error') === 'auth_failed'

  const [view, setView] = useState('checking')   // 'checking' | 'intro' | 'auth'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let session = null
      try { ({ data: { session } } = await createClient().auth.getSession()) } catch {}
      if (cancelled) return
      if (session?.user) {
        router.replace(await destinationAfterAuth({ from, join }))
        return
      }
      if (mode === 'signup' || mode === 'signin' || join || from) setView('auth')
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

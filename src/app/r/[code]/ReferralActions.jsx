'use client'

import { useState } from 'react'
import Link from 'next/link'
import s from '@/components/landing/landing.module.css'
import m from '@/components/landing/studentLanding.module.css'

export default function ReferralActions({ code, downloadUrl }) {
  const [message, setMessage] = useState('')

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setMessage('Code copied. Enter it when you sign up in the app.')
    } catch {
      setMessage('Select and copy the code above, then enter it when you sign up.')
    }
  }

  const signup = code ? `/onboarding?mode=signup&ref=${encodeURIComponent(code)}` : '/onboarding?mode=signup'
  return (
    <div className={m.options}>
      {code && <div className={m.codeBox}>
        <p className={m.codeLabel}>Your teacher&apos;s referral code</p>
        <p className={m.code}>{code}</p>
        <button type="button" className={m.copy} onClick={copyCode}>Copy code</button>
        <p className={m.hint}>Enter this code during signup in the Android app so your teacher gets credit.</p>
        <p role="status" className={m.hint}>{message}</p>
      </div>}
      {downloadUrl ? (
        <a href={downloadUrl} className={`${s.btn} ${s.btnBlue}`}>Download Android APK</a>
      ) : (
        <>
          <button type="button" className={`${s.btn} ${s.btnGhost}`} disabled>Android app · Coming soon</button>
          <p className={m.hint}>The APK is being prepared. Start practising in your browser today.</p>
        </>
      )}
      <Link href={signup} className={`${s.btn} ${s.btnBlue}`}>Practise free in your browser</Link>
      {code && <p className={m.hint}>Your teacher&apos;s code is already filled in for browser signup.</p>}
      <p className={m.hint}>Already have an account? <Link href="/onboarding?mode=signin">Sign in</Link></p>
    </div>
  )
}

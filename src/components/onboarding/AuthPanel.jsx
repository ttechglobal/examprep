'use client'
// src/components/onboarding/AuthPanel.jsx
// The one sign-up / sign-in screen for students.
//   • Phone number + password (default) or email + password
//   • No name, username, exam or survey questions: those live on the profile
//   • On success the parent sends the student straight into the app

import { useState } from 'react'
import Link from 'next/link'
import Zara from './Zara'
import { phoneProblem } from '@/lib/auth/phone'
import { signUp, signIn } from '@/lib/auth/client'
import s from './onboarding.module.css'

export default function AuthPanel({ initialMode = 'signup', onAuthed, onGuest }) {
  const [mode,     setMode]     = useState(initialMode)   // 'signup' | 'signin'
  const [method,   setMethod]   = useState('phone')       // 'phone' | 'email'
  const [phone,    setPhone]    = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [badField, setBadField] = useState(null)
  const [phoneTouched, setPhoneTouched] = useState(false)

  const isSignup = mode === 'signup'
  const phoneIssue = phoneProblem(phone)
  const phoneOk = method === 'phone' && phone && !phoneIssue
  const showPhoneIssue = method === 'phone' && phoneTouched && phone && phoneIssue

  function switchMode() {
    setMode(m => (m === 'signup' ? 'signin' : 'signup'))
    setError(null); setBadField(null)
  }
  function switchMethod(m) {
    setMethod(m); setError(null); setBadField(null)
  }

  async function submit(e) {
    e.preventDefault()
    if (loading) return
    setLoading(true); setError(null); setBadField(null)
    const run = isSignup ? signUp : signIn
    const result = await run({ method, phone, email, password })
    if (!result.ok) {
      setError(result.error); setBadField(result.field ?? null); setLoading(false)
      if (result.field === 'phone') setPhoneTouched(true)
      return
    }
    await onAuthed()   // parent navigates; keep the spinner until it does
  }

  const inputState = field => (badField === field ? s.inputBad : '')

  return (
    <>
      <div className={s.top}>
        <div className={s.brand}>
          <div className={s.brandMark}>EX</div>
          <span className={s.brandName}>ExamPrep A1</span>
        </div>
      </div>

      <div className={s.authBody}>
        <div className={s.greeting}>
          <Zara size={84} />
          <div className={s.bubble}>
            <h1 className={s.hello}>{isSignup ? 'Hi, I\'m Zara 👋' : 'Welcome back 👋'}</h1>
            <p className={s.helloSub}>
              {isSignup
                ? 'I\'ll be your study buddy. Sign up below to get started.'
                : 'Sign in to pick up where you left off.'}
            </p>
          </div>
        </div>

        <form className={s.card} onSubmit={submit} noValidate>
          <div className={s.segmented} role="tablist" aria-label="Sign in with">
            <button type="button" role="tab" aria-selected={method === 'phone'}
              className={`${s.segBtn} ${method === 'phone' ? s.segBtnOn : ''}`}
              onClick={() => switchMethod('phone')}>Phone number</button>
            <button type="button" role="tab" aria-selected={method === 'email'}
              className={`${s.segBtn} ${method === 'email' ? s.segBtnOn : ''}`}
              onClick={() => switchMethod('email')}>Email</button>
          </div>

          {error && <div className={s.error} role="alert">{error}</div>}

          {method === 'phone' ? (
            <div className={s.field}>
              <label className={s.label} htmlFor="ob-phone">Phone number</label>
              <div className={`${s.inputWrap} ${inputState('phone') || (showPhoneIssue ? s.inputBad : phoneOk ? s.inputGood : '')}`}>
                <span className={s.prefix} aria-hidden="true">🇳🇬</span>
                <input
                  id="ob-phone" className={s.input} type="tel" inputMode="tel" autoComplete="tel"
                  placeholder="0801 234 5678" value={phone} maxLength={18}
                  onChange={e => { setPhone(e.target.value); if (badField === 'phone') { setBadField(null); setError(null) } }}
                  onBlur={() => setPhoneTouched(true)}
                  aria-invalid={!!showPhoneIssue || badField === 'phone'}
                  aria-describedby="ob-phone-hint"
                />
              </div>
              <p id="ob-phone-hint" className={`${s.hint} ${showPhoneIssue ? s.hintBad : phoneOk ? s.hintGood : ''}`}>
                {showPhoneIssue ? phoneIssue : phoneOk ? 'Looks good.' : 'Your 11-digit mobile number.'}
              </p>
            </div>
          ) : (
            <div className={s.field}>
              <label className={s.label} htmlFor="ob-email">Email address</label>
              <div className={`${s.inputWrap} ${inputState('email')}`}>
                <input
                  id="ob-email" className={s.input} type="email" inputMode="email" autoComplete="email"
                  placeholder="you@example.com" value={email}
                  onChange={e => { setEmail(e.target.value); if (badField === 'email') { setBadField(null); setError(null) } }}
                  aria-invalid={badField === 'email'}
                />
              </div>
            </div>
          )}

          <div className={s.field}>
            <label className={s.label} htmlFor="ob-password">Password</label>
            <div className={`${s.inputWrap} ${inputState('password')}`}>
              <input
                id="ob-password" className={s.input} type={showPass ? 'text' : 'password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder={isSignup ? 'At least 6 characters' : 'Your password'} value={password}
                onChange={e => { setPassword(e.target.value); if (badField === 'password') { setBadField(null); setError(null) } }}
                aria-invalid={badField === 'password'}
              />
              <button type="button" className={s.eye} onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}>
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className={s.cta} disabled={loading}>
            {loading ? <span className={s.spinner} aria-label="Please wait" /> : isSignup ? 'Create account' : 'Sign in'}
          </button>

          {isSignup && (
            <p className={s.legal}>
              By creating an account you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
            </p>
          )}
        </form>

        <p className={s.switch}>
          {isSignup ? 'Already have an account?' : 'New to ExamPrep?'}
          <button type="button" className={s.link} onClick={switchMode}>
            {isSignup ? 'Sign in' : 'Create an account'}
          </button>
        </p>

        {onGuest && (
          <button type="button" className={s.guest} onClick={onGuest}>Continue as guest</button>
        )}
      </div>
    </>
  )
}

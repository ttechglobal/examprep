'use client'
// src/app/school/signup/page.js
//
// FIX 1: Removed the immediate .update({ role: 'school_admin' }) that ran
//         before email confirmation — it always failed silently (no session).
//         role=school_admin is now passed via emailRedirectTo so the callback
//         writes it after exchangeCodeForSession().
//
// FIX 2: Removed router.push('/school/onboarding') that fired before the
//         user confirmed their email, causing an auth loop. User now sees
//         a "check your email" screen instead.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SchoolSignupPage() {
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [done,     setDone]     = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError(null)

    // Pass role in the redirect URL — callback writes it after session exchange.
    // DO NOT write profile here — no session exists until email is confirmed.
    const redirectTo =
      `${window.location.origin}/api/auth/callback?role=school_admin&next=/school/onboarding`

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: redirectTo,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    // Stay on this page and show confirmation — do NOT redirect.
    // The user has no session yet; pushing to /school/onboarding loops to /login.
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="text-5xl">📬</div>
          <h2 className="text-xl font-black text-gray-900">Check your email</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account and continue setting up your school.
          </p>
          <Link href="/login"
            className="inline-block text-sm text-indigo-600 font-medium hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-black text-indigo-600">ExamPrep</Link>
          <p className="text-gray-500 text-sm mt-1">School account setup</p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xl">🏫</span>
            <h2 className="text-lg font-black text-gray-900">Create school account</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                required placeholder="e.g. Mrs Adaeze Okafor"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@school.edu.ng"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="At least 8 characters"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {loading ? 'Creating account…' : 'Create school account →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
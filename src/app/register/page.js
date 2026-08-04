'use client'
// src/app/register/page.js
// Student account creation — reached after the diagnostic via
// "Save results & create account →" on /diagnostic/results.
//
// FIX: Profile data (exam_type, subjects) is NO LONGER written
// immediately after signUp() — that always failed silently because
// no session exists until the email link is clicked.
//
// Instead, we encode exam_type + subjects into the emailRedirectTo
// URL so /api/auth/callback can write them after the session is
// established via code exchange.
//
// Diagnostic results (answers, questions) are stored in sessionStorage
// as 'pending_diagnostic' keyed by a temp token, also passed through
// the redirect URL so the callback can persist them too.

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const SUBJECTS = [
  'Chemistry', 'Physics', 'Mathematics', 'Biology',
  'English Language', 'Economics', 'Government', 'Geography',
  'Literature in English', 'Agricultural Science',
  'Further Mathematics', 'Commerce',
]

function RegisterForm() {
  const searchParams = useSearchParams()
  const fromDiagnostic = searchParams.get('from') === 'diagnostic'

  const [step, setStep] = useState(1)

  // Step 1 fields
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  // Step 2 fields — pre-filled from diagnostic session if available
  const [examType,  setExamType]  = useState('WAEC')
  const [subjects,  setSubjects]  = useState([])
  const [diagData,  setDiagData]  = useState(null) // { results, setup } from sessionStorage

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [done,    setDone]    = useState(false)

  // Load diagnostic session data if coming from results page
  useEffect(() => {
    try {
      const resultsRaw = sessionStorage.getItem('diagnostic_results')
      const setupRaw   = sessionStorage.getItem('diagnostic_setup')
      if (resultsRaw && setupRaw) {
        const results = JSON.parse(resultsRaw)
        const setup   = JSON.parse(setupRaw)
        setDiagData({ results, setup })
        if (setup.examType) setExamType(setup.examType)
        if (setup.subjects?.length) setSubjects(setup.subjects)
      }
    } catch {}
  }, [])

  function toggleSubject(s) {
    setSubjects(prev =>
      prev.includes(s) ? prev.filter(x => x !== s)
        : prev.length < 9 ? [...prev, s] : prev
    )
  }

  function handleStep1(e) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError(null)
    // If we have diagnostic data, we already know their exam + subjects — skip step 2
    if (diagData) { handleSignup(examType, subjects); return }
    setStep(2)
  }

  async function handleSignup(finalExamType, finalSubjects) {
    if (!finalExamType) { setError('Please select your target exam'); return }
    if (!finalSubjects?.length) { setError('Please select at least one subject'); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Encode profile data into the redirect URL so the callback can write
    // them AFTER the session is established — never before.
    const params = new URLSearchParams({
      exam_type: finalExamType,
      subjects:  finalSubjects.join(','),
    })

    // If we have diagnostic data, stash it in sessionStorage under a token
    // the callback can retrieve. We can't pass it in the URL (too large).
    if (diagData) {
      const token = crypto.randomUUID()
      params.set('diag_token', token)
      sessionStorage.setItem(`diag_pending_${token}`, JSON.stringify({
        examType:  finalExamType,
        subjects:  finalSubjects,
        answers:   diagData.results.answers,
        questions: diagData.results.questions,
      }))
    }

    const redirectTo =
      `${window.location.origin}/api/auth/callback?${params.toString()}`

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

    setDone(true)
    setLoading(false)
  }

  function handleStep2Submit(e) {
    e.preventDefault()
    handleSignup(examType, subjects)
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 text-sm mb-3">
          We sent a confirmation link to <strong>{email}</strong>.
        </p>
        {diagData && (
          <p className="text-sm text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 mb-4">
            Your diagnostic results are saved — your study plan will be ready when you confirm.
          </p>
        )}
        <p className="text-gray-400 text-sm">
          Click the link in the email to activate your account.
        </p>
        <Link href="/login"
          className="inline-block mt-6 text-sm text-indigo-600 font-medium hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Progress bar — only show if not skipping step 2 */}
      {!diagData && (
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
        </div>
      )}

      {diagData && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 mb-5">
          <p className="text-sm text-green-800 font-medium">
            ✓ Your diagnostic results will be saved to your account automatically.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1 — account details */}
      {step === 1 && (
        <>
          <h2 className="text-lg font-bold text-gray-900 mb-5">Create your account</h2>
          <form onSubmit={handleStep1} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                required placeholder="Chidi Okeke"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@example.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="At least 8 characters"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {diagData && (
              <div className="bg-indigo-50 rounded-xl px-3 py-2.5 space-y-1">
                <p className="text-xs font-bold text-indigo-700">From your diagnostic:</p>
                <p className="text-xs text-indigo-600">Exam: {diagData.setup.examType}</p>
                <p className="text-xs text-indigo-600">Subjects: {diagData.setup.subjects?.join(', ')}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {loading ? 'Creating account…' : diagData ? 'Create account →' : 'Continue →'}
            </button>
          </form>
        </>
      )}

      {/* Step 2 — exam + subjects (skipped if we have diagnostic data) */}
      {step === 2 && !diagData && (
        <>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Your exam & subjects</h2>
          <p className="text-sm text-gray-500 mb-5">This shapes your personalised study plan.</p>
          <form onSubmit={handleStep2Submit} className="space-y-5">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Target exam</p>
              <div className="grid grid-cols-3 gap-2">
                {['WAEC', 'JAMB', 'BOTH'].map(t => (
                  <button key={t} type="button" onClick={() => setExamType(t)}
                    className={`py-2.5 text-sm font-bold rounded-xl border-2 transition-colors ${
                      examType === t
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Subjects <span className="text-gray-400 font-normal">({subjects.length} selected)</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SUBJECTS.map(s => {
                  const on = subjects.includes(s)
                  return (
                    <button key={s} type="button"
                      onClick={() => toggleSubject(s)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border-2 text-left transition-colors ${
                        on ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                           : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            <button type="submit" disabled={loading || !subjects.length}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>
        </>
      )}

      <p className="text-center text-sm text-gray-500 mt-5">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
      </p>
    </>
  )
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-indigo-600">ExamPrep</h1>
          <p className="text-gray-500 text-sm mt-1">Join thousands of students preparing for success</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-gray-200 p-6">
          <Suspense fallback={
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
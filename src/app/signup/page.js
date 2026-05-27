'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const AVAILABLE_SUBJECTS = [
  'Mathematics', 'English Language', 'Physics', 'Chemistry',
  'Biology', 'Economics', 'Government', 'Literature in English',
  'Geography', 'Agricultural Science', 'Further Mathematics', 'Commerce',
]

function SignupForm() {
  const searchParams = useSearchParams()
  const fromDiagnostic = searchParams.get('from') === 'diagnostic'

  const [step, setStep] = useState(1)  // 1: account, 2: exam setup (skipped if from diagnostic)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [examType, setExamType] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  // Diagnostic data from sessionStorage — preserved across signup
  const [diagnosticData, setDiagnosticData] = useState(null)

  useEffect(() => {
    // Read diagnostic data as early as possible so it survives navigation
    const resultsRaw = sessionStorage.getItem('diagnostic_results')
    const setupRaw = sessionStorage.getItem('diagnostic_setup')
    if (resultsRaw && setupRaw) {
      try {
        const results = JSON.parse(resultsRaw)
        const setup = JSON.parse(setupRaw)
        setDiagnosticData({ results, setup })
        // Pre-fill exam type and subjects from diagnostic
        if (setup.examType) setExamType(setup.examType)
        if (setup.subjects?.length) setSelectedSubjects(setup.subjects)
      } catch (e) {
        console.error('Could not parse diagnostic data:', e)
      }
    }
  }, [])

  const toggleSubject = (subject) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : prev.length < 9 ? [...prev, subject] : prev
    )
  }

  const handleStep1 = (e) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError(null)
    // If diagnostic was taken, exam/subjects are already set — skip step 2
    if (diagnosticData) {
      handleSignup(null, true)
    } else {
      setStep(2)
    }
  }

  const handleSignup = async (e, skipStep2 = false) => {
    if (e) e.preventDefault()
    if (!skipStep2) {
      if (!examType) { setError('Please select your target exam'); return }
      if (selectedSubjects.length < 1) { setError('Please select at least one subject'); return }
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    const user = authData?.user
    if (user) {
      // Update profile with exam type and subjects
      await supabase
        .from('profiles')
        .update({
          exam_type: examType,
          subjects: selectedSubjects,
        })
        .eq('id', user.id)

      // If diagnostic was taken, save results now linked to the new account
      // Store in sessionStorage so dashboard picks it up after email confirmation + login
      if (diagnosticData) {
        // Keep the pending_diagnostic in sessionStorage so the dashboard
        // auto-saves it via the fire-and-forget pattern on first load
        sessionStorage.setItem('pending_diagnostic', JSON.stringify({
          userId: user.id,
          examType: diagnosticData.setup.examType,
          subjects: diagnosticData.setup.subjects,
          answers: diagnosticData.results.answers,
          questions: diagnosticData.results.questions,
        }))
        // Clear the separate results/setup keys — pending_diagnostic is the canonical store now
        sessionStorage.removeItem('diagnostic_results')
        sessionStorage.removeItem('diagnostic_setup')
      }
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 text-sm mb-2">
          We sent a confirmation link to <strong>{email}</strong>.
        </p>
        {diagnosticData && (
          <p className="text-sm text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 mb-4">
            Your diagnostic results are saved — your study plan will be ready when you sign in.
          </p>
        )}
        <p className="text-gray-400 text-sm">
          Click the link to activate your account and start studying.
        </p>
        <Link
          href="/login"
          className="inline-block mt-6 text-sm text-indigo-600 font-medium hover:underline"
        >
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Step indicator — only show if not skipping to account creation directly */}
      {!diagnosticData && (
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
        </div>
      )}

      {fromDiagnostic && diagnosticData && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 mb-4">
          <p className="text-sm text-green-800 font-medium">
            ✓ Your diagnostic results will be saved automatically when you create your account.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Account details */}
      {step === 1 && (
        <>
          <h2 className="text-lg font-bold text-gray-900 mb-6">Create your account</h2>
          <form onSubmit={handleStep1} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Chidi Okeke"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="At least 8 characters"
              />
            </div>

            {/* If diagnostic was taken, show a summary so they know what's pre-filled */}
            {diagnosticData && (
              <div className="bg-indigo-50 rounded-xl px-3 py-2.5 space-y-1">
                <p className="text-xs font-bold text-indigo-700">From your diagnostic:</p>
                <p className="text-xs text-indigo-600">Exam: {diagnosticData.setup.examType}</p>
                <p className="text-xs text-indigo-600">Subjects: {diagnosticData.setup.subjects.join(', ')}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating account…' : diagnosticData ? 'Create account →' : 'Continue →'}
            </button>
          </form>
        </>
      )}

      {/* Step 2: Exam setup — only shown when no diagnostic data */}
      {step === 2 && !diagnosticData && (
        <>
          <h2 className="text-lg font-bold text-gray-900 mb-6">Your exam setup</h2>
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target exam</label>
              <div className="flex gap-2">
                {['WAEC', 'JAMB', 'BOTH'].map(exam => (
                  <button
                    key={exam}
                    type="button"
                    onClick={() => setExamType(exam)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-colors ${
                      examType === exam
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {exam}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your subjects
                <span className="ml-1 text-gray-400 font-normal">({selectedSubjects.length} selected)</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">Select up to 9 subjects</p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SUBJECTS.map(subject => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedSubjects.includes(subject)
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                        : selectedSubjects.length >= 9
                        ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </form>
        </>
      )}

      <p className="text-center text-sm text-gray-500 mt-4">
        Already have an account?{' '}
        <Link href="/login?from=diagnostic" className="text-indigo-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-indigo-600">ExamPrep</h1>
          <p className="text-gray-500 text-sm mt-1">Your WAEC & JAMB preparation partner</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <Suspense fallback={<div className="text-sm text-gray-400">Loading…</div>}>
            <SignupForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
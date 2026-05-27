'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { EXAM_TYPES } from '@/lib/constants'

const AVAILABLE_SUBJECTS = [
  'Mathematics',
  'English Language',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
  'Government',
  'Literature in English',
  'Geography',
  'Agricultural Science',
  'Further Mathematics',
  'Commerce',
]

export default function SignupPage() {
  const [step, setStep] = useState(1) // 1: account details, 2: exam setup
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [examType, setExamType] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const supabase = createClient()

  const toggleSubject = (subject) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : prev.length < 9 ? [...prev, subject] : prev
    )
  }

  const handleStep1 = (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setError(null)
    setStep(2)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!examType) { setError('Please select your target exam'); return }
    if (selectedSubjects.length < 1) { setError('Please select at least one subject'); return }

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Update profile with exam type and subjects
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({
          exam_type: examType,
          subjects: selectedSubjects,
        })
        .eq('id', user.id)
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm">
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account and start studying.
          </p>
          <Link
            href="/login"
            className="inline-block mt-6 text-sm text-indigo-600 font-medium hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-indigo-600">ExamPrep</h1>
          <p className="text-gray-500 text-sm mt-1">Your WAEC & JAMB preparation partner</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

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
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 transition-colors"
                >
                  Continue →
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Set up your study plan</h2>
              <p className="text-sm text-gray-500 mb-6">Tell us what you're preparing for</p>

              <form onSubmit={handleSignup} className="space-y-5">
                {/* Exam type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target exam
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.values(EXAM_TYPES).map(exam => (
                      <button
                        key={exam}
                        type="button"
                        onClick={() => setExamType(exam)}
                        className={`py-2 text-sm font-medium rounded-lg border-2 transition-colors ${
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

                {/* Subjects */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your subjects
                    <span className="ml-1 text-gray-400 font-normal">
                      ({selectedSubjects.length} selected)
                    </span>
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
                    {loading ? 'Creating...' : 'Create account'}
                  </button>
                </div>
              </form>
            </>
          )}

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
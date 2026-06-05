'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(errorParam === 'auth_failed' ? 'Authentication failed. Please try again.' : null)

  const supabase = createClient()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    // If practice session was taken before login, migrate it so the dashboard picks it up.
    // sessionStorage keys kept as-is — internal only, never shown to the user.
    const resultsRaw = sessionStorage.getItem('diagnostic_results')
    const setupRaw = sessionStorage.getItem('diagnostic_setup')
    if (resultsRaw && setupRaw && user) {
      try {
        const results = JSON.parse(resultsRaw)
        const setup = JSON.parse(setupRaw)
        sessionStorage.setItem('pending_diagnostic', JSON.stringify({
          userId: user.id,
          examType: setup.examType,
          subjects: setup.subjects,
          answers: results.answers,
          questions: results.questions,
        }))
        sessionStorage.removeItem('diagnostic_results')
        sessionStorage.removeItem('diagnostic_setup')
      } catch (e) {
        console.error('Could not migrate practice data:', e)
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const roleRedirects = {
      superadmin: '/admin/dashboard',
      admin: '/admin/dashboard',
      reviewer: '/reviewer/dashboard',
      school_admin: '/school/dashboard',
      student: '/student/dashboard',
    }

    window.location.href = roleRedirects[profile?.role] ?? '/student/dashboard'
  }

  return (
    <>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Welcome back</h2>

      {/* "from=diagnostic" param still works for backward compat — message reworded */}
      {from === 'diagnostic' && (
        <p className="text-sm text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 mb-4">
          Sign in to save your practice results and start your study plan.
        </p>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
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
            placeholder="Your password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Signing in…' : 'Sign in →'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-4">
        Don't have an account?{' '}
        <Link href="/signup" className="text-indigo-600 font-medium hover:underline">
          Create one free
        </Link>
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-indigo-600">ExamPrep</h1>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-gray-200 p-6">
          <Suspense fallback={<div className="h-40 flex items-center justify-center"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

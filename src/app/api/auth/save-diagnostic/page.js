'use client'
// src/app/auth/save-diagnostic/page.js
//
// Bridge page hit after email confirmation when the student came from the diagnostic.
// The callback can't read sessionStorage (it's server-side), so we land here first,
// read the pending diagnostic data out of sessionStorage, POST it to the save API,
// then redirect to the dashboard.

import { useEffect } from 'react'
import { useRouter, useSearchParams, Suspense } from 'next/navigation'

function SaveBridge() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const next  = searchParams.get('next') ?? '/student/dashboard'

  useEffect(() => {
    async function run() {
      try {
        if (token) {
          const raw = sessionStorage.getItem(`diag_pending_${token}`)
          if (raw) {
            const { examType, subjects, answers, questions } = JSON.parse(raw)
            await fetch('/api/diagnostic/save', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ examType, subjects, answers, questions }),
            })
            sessionStorage.removeItem(`diag_pending_${token}`)
            // Clean up any remaining diagnostic session keys
            sessionStorage.removeItem('diagnostic_results')
            sessionStorage.removeItem('diagnostic_setup')
          }
        }
      } catch {
        // Non-fatal — student still lands on dashboard, just without pre-saved diagnostic
      } finally {
        router.replace(next)
      }
    }
    run()
  }, [token, next, router])

  return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-secondary">Setting up your account…</p>
      </div>
    </div>
  )
}

export default function SaveDiagnosticPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SaveBridge />
    </Suspense>
  )
}
'use client'
// src/app/diagnostic/page.js
// ─────────────────────────────────────────────────────────────────────────────
// FIX: subjectsToShow always shows ALL_SUBJECTS.
//
// Previous bug: when signed-in and enrolledSubjects.length > 0, the page
// showed ONLY enrolledSubjects — hiding Physics and other subjects the
// student hadn't enrolled in yet.
//
// Fix: always render ALL_SUBJECTS. Enrolled subjects get a highlighted
// "enrolled" badge so they're easy to find. Already-diagnosed subjects
// keep the "Retake" label.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSubjectColor } from '@/lib/theme'

const ALL_SUBJECTS = [
  'Mathematics', 'English Language', 'Physics', 'Chemistry',
  'Biology', 'Economics', 'Government', 'Literature in English',
  'Geography', 'Agricultural Science', 'Further Mathematics', 'Commerce',
]

function DiagnosticSetup() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const presetSubject = searchParams.get('subject') ?? ''
  const presetExam    = searchParams.get('exam') ?? ''

  const [examType,        setExamType]        = useState(presetExam)
  const [selectedSubject, setSelectedSubject] = useState(presetSubject)
  const [error,           setError]           = useState(null)
  const [loadingProfile,  setLoadingProfile]  = useState(true)
  const [isSignedIn,      setIsSignedIn]      = useState(false)

  const [enrolledSubjects,  setEnrolledSubjects]  = useState([])
  const [diagnosedSubjects, setDiagnosedSubjects] = useState(new Set())

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setIsSignedIn(true)

        const [{ data: profile }, { data: diagResults }] = await Promise.all([
          supabase
            .from('profiles')
            .select('exam_type, subjects')
            .eq('id', user.id)
            .single(),
          supabase
            .from('diagnostic_results')
            .select('subject_id, subjects(name)')
            .eq('student_id', user.id),
        ])

        if (profile?.exam_type && !presetExam) setExamType(profile.exam_type)
        if (profile?.subjects?.length) setEnrolledSubjects(profile.subjects)

        const names = new Set(
          (diagResults ?? []).map(r => r.subjects?.name).filter(Boolean)
        )
        setDiagnosedSubjects(names)

        // Pre-select first undiagnosed enrolled subject if none preset
        if (!presetSubject && profile?.subjects?.length) {
          const firstUndone = profile.subjects.find(s => !names.has(s))
          if (firstUndone) setSelectedSubject(firstUndone)
        }
      }
      setLoadingProfile(false)
    })
  }, [])

  const handleStart = () => {
    if (!examType)        { setError('Please select your target exam'); return }
    if (!selectedSubject) { setError('Please select a subject to test'); return }
    setError(null)

    sessionStorage.setItem('diagnostic_setup', JSON.stringify({
      examType,
      subjects:      [selectedSubject],
      questionCount: 10,
      isPractice:    isSignedIn,
    }))

    router.push('/diagnostic/test')
  }

  // ── FIX: always show ALL subjects — enrolled ones get a badge ────────────
  const subjectsToShow = ALL_SUBJECTS

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Diagnostic Test</h1>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
            {isSignedIn
              ? "Pick one subject. We'll find your weak areas and add them to your study plan."
              : '10 quick questions to see where you stand. No account needed.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Exam type */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">
              Target exam
            </p>
            <div className="flex gap-2">
              {['WAEC', 'JAMB'].map(et => (
                <button
                  key={et}
                  onClick={() => setExamType(et)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
                    examType === et
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {et}
                </button>
              ))}
            </div>
          </div>

          {/* Subject picker */}
          <div className="px-5 py-4">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">
              Choose one subject
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {subjectsToShow.map(subject => {
                const color      = getSubjectColor(subject)
                const isSelected = selectedSubject === subject
                const isDone     = diagnosedSubjects.has(subject)
                const isEnrolled = enrolledSubjects.includes(subject)

                return (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={`
                      w-full flex items-center justify-between px-4 py-3 rounded-xl
                      border-2 text-left transition-all
                      ${isSelected
                        ? `${color.bg} border-current ${color.text}`
                        : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                      }
                    `}
                  >
                    <span className={`text-sm font-bold ${isSelected ? color.text : 'text-gray-700'}`}>
                      {subject}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {isEnrolled && !isSelected && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                          Enrolled
                        </span>
                      )}
                      {isDone && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/30 text-current' : 'bg-gray-200 text-gray-500'
                        }`}>
                          Retake
                        </span>
                      )}
                      {isSelected && (
                        <svg className={`w-4 h-4 ${color.text}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 font-bold text-center">{error}</p>
        )}

        <button
          onClick={handleStart}
          disabled={!examType || !selectedSubject}
          className="w-full py-4 bg-indigo-600 text-white font-black text-sm rounded-2xl
                     hover:bg-indigo-500 active:scale-[0.98] transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          Start diagnostic →
        </button>

        {!isSignedIn && (
          <p className="text-center text-xs text-gray-400">
            Results are saved only if you're signed in.{' '}
            <a href="/login" className="text-indigo-600 font-bold hover:underline">Sign in</a>
          </p>
        )}
      </div>
    </div>
  )
}

export default function DiagnosticPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DiagnosticSetup />
    </Suspense>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

const AVAILABLE_SUBJECTS = [
  'Mathematics', 'English Language', 'Physics', 'Chemistry',
  'Biology', 'Economics', 'Government', 'Literature in English',
  'Geography', 'Agricultural Science',
]

function PracticeSetup() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetCount = parseInt(searchParams.get('questions') ?? '0')
  const presetExam = searchParams.get('exam') ?? ''

  const [examType, setExamType] = useState(presetExam)
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [questionCount, setQuestionCount] = useState(presetCount || 10)
  const [error, setError] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [isSignedIn, setIsSignedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setIsSignedIn(true)
        const { data: profile } = await supabase
          .from('profiles')
          .select('exam_type, subjects')
          .eq('id', user.id)
          .single()

        if (profile?.exam_type && !presetExam) setExamType(profile.exam_type)
        if (profile?.subjects?.length) setSelectedSubjects(profile.subjects)
      }
      setLoadingProfile(false)
    })
  }, [])

  const toggleSubject = (subject) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : prev.length < 4 ? [...prev, subject] : prev
    )
  }

  const handleStart = () => {
    if (!examType) { setError('Please select your target exam'); return }
    if (!selectedSubjects.length) { setError('Please select at least one subject'); return }
    setError(null)

    // Internal key names kept as-is — sessionStorage keys are not user-visible
    sessionStorage.setItem('diagnostic_setup', JSON.stringify({
      examType,
      subjects: selectedSubjects,
      questionCount,
      isPractice: isSignedIn,
    }))

    router.push('/diagnostic/test')
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-indigo-600">ExamPrep</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isSignedIn ? 'Practice Questions' : 'Free practice questions — no account needed'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {isSignedIn ? 'Set up your practice session' : "Let's personalise your study plan"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isSignedIn
              ? 'Choose how many questions and which subjects to cover.'
              : "Answer a few questions and we'll show you exactly where to focus."}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Exam type */}
          {!presetExam && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Which exam are you preparing for?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['WAEC', 'JAMB', 'BOTH'].map(exam => (
                  <button
                    key={exam}
                    type="button"
                    onClick={() => setExamType(exam)}
                    className={`py-2.5 text-sm font-medium rounded-lg border-2 transition-colors ${
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
          )}

          {/* Subjects */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subjects
              <span className="ml-1 text-gray-400 font-normal">
                ({selectedSubjects.length} selected, up to 4)
              </span>
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {AVAILABLE_SUBJECTS.map(subject => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => toggleSubject(subject)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedSubjects.includes(subject)
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                      : selectedSubjects.length >= 4
                      ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>

          {/* Question count */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of questions
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { count: 10, time: '15 mins' },
                { count: 20, time: '30 mins' },
                { count: 30, time: '45 mins' },
              ].map(option => (
                <button
                  key={option.count}
                  type="button"
                  onClick={() => setQuestionCount(option.count)}
                  className={`py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                    questionCount === option.count
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="font-bold block">{option.count} Qs</span>
                  <span className="text-xs opacity-70">{option.time}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-colors"
          >
            Start practice →
          </button>
        </div>
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
      <PracticeSetup />
    </Suspense>
  )
}

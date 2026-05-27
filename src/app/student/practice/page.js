'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'

const OPTIONS = [
  { count: 10, time: '15 mins', label: 'Quick' },
  { count: 20, time: '30 mins', label: 'Standard' },
  { count: 30, time: '45 mins', label: 'Full' },
]

export default function PracticePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [questionCount, setQuestionCount] = useState(10)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase
        .from('profiles')
        .select('subjects, exam_type, full_name')
        .eq('id', user.id)
        .single()
      setProfile(prof)
      setSubjects(prof?.subjects ?? [])
      setLoading(false)
    })
  }, [])

  const handleStart = () => {
    const setup = {
      examType: profile?.exam_type ?? 'WAEC',
      subjects: selectedSubject === 'all' ? subjects : [selectedSubject],
      questionCount,
      isPractice: true,
    }
    sessionStorage.setItem('diagnostic_setup', JSON.stringify(setup))
    router.push('/diagnostic/test')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Practice Questions</h1>
        <p className="text-gray-500 text-sm mt-1">
          Test yourself. Every question makes you sharper. 🧠
        </p>
      </div>

      {/* Subject filter */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3">Subject</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSubject('all')}
            className={`text-sm px-4 py-2 rounded-full border-2 font-medium transition-colors ${
              selectedSubject === 'all'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            All subjects
          </button>
          {subjects.map(subject => {
            const color = getSubjectColor(subject)
            const active = selectedSubject === subject
            return (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`text-sm px-4 py-2 rounded-full border-2 font-medium transition-colors ${
                  active
                    ? `${color.border} ${color.bg} ${color.text}`
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {subject}
              </button>
            )
          })}
        </div>
      </div>

      {/* Question count */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3">
          How many questions?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {OPTIONS.map(opt => (
            <button
              key={opt.count}
              onClick={() => setQuestionCount(opt.count)}
              className={`py-4 rounded-2xl border-2 text-center transition-colors ${
                questionCount === opt.count
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className={`block text-lg font-black ${questionCount === opt.count ? 'text-indigo-700' : 'text-gray-800'}`}>
                {opt.count}
              </span>
              <span className={`block text-xs font-medium mt-0.5 ${questionCount === opt.count ? 'text-indigo-500' : 'text-gray-400'}`}>
                {opt.label}
              </span>
              <span className={`block text-xs mt-0.5 ${questionCount === opt.count ? 'text-indigo-400' : 'text-gray-300'}`}>
                {opt.time}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Info card */}
      <div className="bg-indigo-50 rounded-2xl px-4 py-3 flex items-start gap-3">
        <span className="text-xl mt-0.5">⏱</span>
        <div>
          <p className="text-sm font-semibold text-indigo-800">
            You'll have {questionCount === 10 ? '15' : questionCount === 20 ? '30' : '45'} minutes
          </p>
          <p className="text-xs text-indigo-600 mt-0.5">
            Warnings at 10 min, 5 min, 1 min and 30 seconds. Your results update your study plan.
          </p>
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-base font-black rounded-2xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-200"
      >
        Start {questionCount} Questions 🚀
      </button>

    </div>
  )
}
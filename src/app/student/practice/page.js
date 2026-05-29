'use client'
// src/app/student/practice/page.js
// Practice setup page — choose subject + question count, then start.
// Passes config to /student/practice/session via sessionStorage.

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'

const COUNT_OPTIONS = [
  { count: 10, label: 'Quick',    time: '~15 mins', desc: 'Great for a short session' },
  { count: 20, label: 'Standard', time: '~30 mins', desc: 'Covers more ground'       },
  { count: 30, label: 'Full',     time: '~45 mins', desc: 'Maximum practice'          },
]

export default function PracticePage() {
  const router  = useRouter()
  const supabase = createClient()

  const [profile, setProfile]               = useState(null)
  const [subjects, setSubjects]             = useState([])
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [count, setCount]                   = useState(10)
  const [loading, setLoading]               = useState(true)

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

  function handleStart() {
    const config = {
      examType:       profile?.exam_type ?? 'WAEC',
      subjects:       selectedSubject === 'all' ? subjects : [selectedSubject],
      count,
    }
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    router.push('/student/practice/session')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Practice Questions</h1>
        <p className="text-gray-500 text-sm mt-1">
          Every question you answer makes you sharper. 🧠
        </p>
      </div>

      {/* Subject selector */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
        <p className="text-sm font-black text-gray-900">Subject</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSubject('all')}
            className={`text-sm px-4 py-2 rounded-full border-2 font-bold transition-colors ${
              selectedSubject === 'all'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            All subjects
          </button>
          {subjects.map(subject => {
            const color  = getSubjectColor(subject)
            const active = selectedSubject === subject
            return (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`text-sm px-4 py-2 rounded-full border-2 font-bold transition-colors ${
                  active
                    ? `border-current ${color.bg} ${color.text}`
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {subject}
              </button>
            )
          })}
        </div>
      </div>

      {/* Count selector */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
        <p className="text-sm font-black text-gray-900">How many questions?</p>
        <div className="grid grid-cols-3 gap-3">
          {COUNT_OPTIONS.map(opt => (
            <button
              key={opt.count}
              onClick={() => setCount(opt.count)}
              className={`py-4 rounded-2xl border-2 text-center transition-all ${
                count === opt.count
                  ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className={`block text-2xl font-black ${count === opt.count ? 'text-indigo-700' : 'text-gray-800'}`}>
                {opt.count}
              </span>
              <span className={`block text-xs font-bold mt-0.5 ${count === opt.count ? 'text-indigo-600' : 'text-gray-500'}`}>
                {opt.label}
              </span>
              <span className={`block text-xs mt-0.5 ${count === opt.count ? 'text-indigo-400' : 'text-gray-300'}`}>
                {opt.time}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Info strip */}
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
        <span className="text-lg mt-0.5">⏱</span>
        <div>
          <p className="text-sm font-bold text-indigo-800">
            ~{count === 10 ? '15' : count === 20 ? '30' : '45'} minutes
          </p>
          <p className="text-xs text-indigo-600 mt-0.5">
            Your results update your personalised study plan after each session.
          </p>
        </div>
      </div>

      {/* Start */}
      <button
        onClick={handleStart}
        disabled={subjects.length === 0}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-base font-black rounded-2xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-200 disabled:opacity-40"
      >
        Start {count} Questions →
      </button>

      {subjects.length === 0 && (
        <p className="text-center text-xs text-gray-400">
          Set up your subjects in your profile first.
        </p>
      )}
    </div>
  )
}
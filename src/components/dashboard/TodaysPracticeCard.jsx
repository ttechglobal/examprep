'use client'
// src/components/dashboard/TodaysPracticeCard.jsx
//
// The dashboard's primary action. One button, no mode-picking, no subject
// picking — reuses the exact mechanism PracticeHQPage.startSession() uses
// (sessionStorage 'practice_config' + push to /student/practice/session),
// so /api/practice/questions Branch C (the weak-topic-aware sequencer)
// handles the question selection for free.
//
// Why this exists: the old dashboard made practice a *choice* (Timed /
// Topic / Mock) before a student had done anything. Decision points kill
// daily habits. This card removes the decision — count is fixed at 10,
// subjects come from the student's profile, mode is a soft "daily" tag.

import { useRouter } from 'next/navigation'

const DAILY_COUNT = 10

export default function TodaysPracticeCard({ profile }) {
  const router = useRouter()

  function start() {
    const config = {
      mode: 'daily',
      examType: profile?.exam_type ?? 'WAEC',
      subjects: profile?.subjects ?? [],
      count: DAILY_COUNT,
      revealMode: 'immediate',
    }
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    router.push('/student/practice/session')
  }

  const minutes = Math.round(DAILY_COUNT * 0.6)

  return (
    <button
      onClick={start}
      className="w-full text-left rounded-2xl px-5 py-5 transition-all active:scale-[0.98]
                 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800"
    >
      <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
        Today's {DAILY_COUNT}
      </p>
      <p className="text-lg font-black text-primary mt-1">Quick practice, mixed subjects</p>
      <p className="text-sm text-secondary mt-0.5">
        {DAILY_COUNT} questions &middot; about {minutes} min
      </p>
      <span className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl
                        bg-emerald-600 text-white text-sm font-black">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        Start practicing
      </span>
    </button>
  )
}
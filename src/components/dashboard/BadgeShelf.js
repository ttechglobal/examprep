'use client'
// src/components/dashboard/BadgeShelf.jsx
// Compact badge shelf for the dashboard.
// Shows 3 most recent earned badges + a count. Tapping opens a full modal.

import { useState } from 'react'
import { BADGE_DEFS, getBadgeColors, computeEarnedBadges } from '@/lib/badges'

function BadgeModal({ earnedIds, onClose }) {
  const [filter, setFilter] = useState('all')
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  const categories = ['all','lessons','practice','goals','streak']
  const shown = BADGE_DEFS.filter(b => filter === 'all' || b.category === filter)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-card dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[88vh] flex flex-col"
        style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="px-5 pt-3 pb-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">Badges</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{earnedIds.length} of {BADGE_DEFS.length} earned</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-subtle dark:hover:bg-gray-800 text-gray-400 dark:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Category filter */}
        <div className="px-5 pb-3 flex gap-2 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                filter === c ? 'bg-indigo-600 text-white' : 'bg-subtle dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}>
              {c}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 min-h-0">
          <div className="grid grid-cols-2 gap-3">
            {shown.map(b => {
              const earned = earnedIds.includes(b.id)
              const colors = getBadgeColors(b.tier)
              return (
                <div key={b.id} className={`rounded-2xl p-4 border-2 transition-all ${
                  earned
                    ? `${colors.bg} ${colors.ring} ring-1`
                    : 'bg-base dark:bg-gray-800 border-transparent opacity-50'
                }`}>
                  <div className="text-2xl mb-2">{earned ? b.emoji : '🔒'}</div>
                  <p className={`text-sm font-black ${earned ? colors.text : 'text-gray-400 dark:text-gray-600'}`}>{b.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">{b.desc}</p>
                  {earned && (
                    <span className={`inline-block mt-2 text-[10px] font-black px-2 py-0.5 rounded-full capitalize ${colors.bg} ${colors.text}`}>
                      {b.tier}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect } from 'react'

export default function BadgeShelf({ completedLessons = 0, practiceSessions = 0, streak = 0, goalsCompletedWeeks = 0 }) {
  const [modalOpen, setModalOpen] = useState(false)

  const earnedIds = computeEarnedBadges({ completedLessons, practiceSessions, streak, goalsCompletedWeeks })
  const recent    = BADGE_DEFS.filter(b => earnedIds.includes(b.id)).slice(-3).reverse()

  if (earnedIds.length === 0) return null

  return (
    <>
      <button onClick={() => setModalOpen(true)}
        className="w-full bg-card dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm px-5 py-4 flex items-center gap-4 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 active:scale-[0.98] transition-all text-left">
        <div className="flex -space-x-1 flex-shrink-0">
          {recent.map(b => (
            <div key={b.id} className={`w-9 h-9 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-base ${getBadgeColors(b.tier).bg}`}>
              {b.emoji}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-900 dark:text-gray-100">
            {earnedIds.length} {earnedIds.length === 1 ? 'Badge' : 'Badges'} Earned
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
            {recent.map(b => b.label).join(' · ')}
          </p>
        </div>
        <svg className="w-4 h-4 text-gray-300 dark:text-gray-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
      </button>

      {modalOpen && <BadgeModal earnedIds={earnedIds} onClose={() => setModalOpen(false)} />}
    </>
  )
}
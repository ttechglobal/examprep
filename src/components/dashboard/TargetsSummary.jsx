// src/components/dashboard/TargetsSummary.jsx
//
// Restored previous design: emoji icon bubbles, sectioned layout, colour-coded
// score pills. Dark mode aware — bg/border/text all adapt.

'use client'
import { memo } from 'react'

export const TargetsSummary = memo(function TargetsSummary({ profile, onEdit, isDark }) {
  const waecGrades = profile?.waec_target_grades  ?? {}
  const jambScores = profile?.jamb_target_scores  ?? {}
  const examType   = profile?.exam_type ?? ''
  const hasWaec    = Object.keys(waecGrades).length > 0 && (examType === 'WAEC' || examType === 'BOTH')
  const hasJamb    = Object.keys(jambScores).length > 0 && (examType === 'JAMB' || examType === 'BOTH')
  const hasCourse  = Boolean(profile?.university_course)
  const hasUni     = Boolean(profile?.target_university)
  const hasAny     = hasWaec || hasJamb || hasCourse || hasUni

  const jambTotal  = profile?.jamb_total_target
    ?? Object.values(jambScores).reduce((s, v) => s + (Number(v) || 0), 0)

  // Theme-aware surface colours
  const cardBg     = isDark ? '#111827' : '#fdfcfa'
  const cardBorder = isDark ? '#1f2937' : '#ede9e3'
  const divider    = isDark ? '#1f2937' : '#ede9e3'

  // Icon bubble colours — subtle tints that work in both modes
  const bubbleCourse = isDark ? '#2e1065' : '#ede9fe'
  const bubbleUni    = isDark ? '#1e3a5f' : '#dbeafe'
  const bubbleJamb   = isDark ? '#1e1b4b' : '#e0e7ff'
  const bubbleWaec   = isDark ? '#052e16' : '#d1fae5'

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm"
      style={{ border: `1px solid ${cardBorder}`, background: cardBg }}>

      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${divider}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: isDark ? '#451a03' : '#fef3c7' }}>
            <span className="text-base">🎯</span>
          </div>
          <p className="text-sm font-black text-primary">My Targets</p>
        </div>
        <button onClick={onEdit}
          className="text-xs font-bold text-secondary hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
          Edit
        </button>
      </div>

      {/* Empty state */}
      {!hasAny ? (
        <div className="px-5 py-5 text-center space-y-3">
          <p className="text-xs text-secondary leading-relaxed">
            Set your targets to stay motivated and track your progress.
          </p>
          <button onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-400 transition-colors">
            Set targets →
          </button>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-5">

          {/* Target Course */}
          {hasCourse && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: bubbleCourse }}>
                <span className="text-base">🎓</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-secondary mb-0.5">
                  Target Course
                </p>
                <p className="text-sm font-black text-primary truncate">
                  {profile.university_course}
                </p>
              </div>
            </div>
          )}

          {/* Target University */}
          {hasUni && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: bubbleUni }}>
                <span className="text-base">🏛️</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-secondary mb-0.5">
                  Target University
                </p>
                <p className="text-sm font-black text-primary truncate">
                  {profile.target_university}
                </p>
              </div>
            </div>
          )}

          {/* JAMB Target */}
          {hasJamb && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: bubbleJamb }}>
                  <span className="text-base">📊</span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">
                    JAMB Target
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-black text-primary">{jambTotal} total</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                      style={{ background: '#4f46e5' }}>
                      JAMB
                    </span>
                  </div>
                </div>
              </div>
              {/* Per-subject score pills */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(jambScores).map(([sub, score]) => {
                  const n      = Number(score)
                  const bg     = isDark
                    ? (n >= 70 ? '#052e16' : n >= 50 ? '#451a03' : '#450a0a')
                    : (n >= 70 ? '#e0e7ff' : n >= 50 ? '#e0e7ff' : '#e0e7ff')
                  const border = isDark
                    ? (n >= 70 ? '#166534' : n >= 50 ? '#92400e' : '#991b1b')
                    : '#c7d2fe'
                  const color  = isDark
                    ? (n >= 70 ? '#4ade80' : n >= 50 ? '#fbbf24' : '#f87171')
                    : '#3730a3'
                  const scoreColor = isDark
                    ? (n >= 70 ? '#4ade80' : n >= 50 ? '#fbbf24' : '#f87171')
                    : '#4f46e5'
                  return (
                    <div key={sub}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                      style={{ background: bg, border: `1px solid ${border}` }}>
                      <span className="text-xs font-bold" style={{ color }}>{sub}</span>
                      <span className="text-xs font-black" style={{ color: scoreColor }}>{score}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* WAEC Target */}
          {hasWaec && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: bubbleWaec }}>
                  <span className="text-base">📝</span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">
                    WAEC Target Grades
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-black text-primary">
                      {Object.keys(waecGrades).length} subjects
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                      style={{ background: '#059669' }}>
                      WAEC
                    </span>
                  </div>
                </div>
              </div>
              {/* Per-subject grade pills — colour-coded: A1-B3 green, C4-C6 amber, D7+ red */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(waecGrades).map(([sub, grade]) => {
                  const n      = parseInt(grade.replace(/\D/g, '')) || 0
                  const bg     = isDark
                    ? (n <= 3 ? '#052e16' : n <= 6 ? '#451a03' : '#450a0a')
                    : (n <= 3 ? '#d1fae5' : n <= 6 ? '#fef3c7' : '#fee2e2')
                  const color  = isDark
                    ? (n <= 3 ? '#4ade80' : n <= 6 ? '#fbbf24' : '#f87171')
                    : (n <= 3 ? '#065f46' : n <= 6 ? '#92400e' : '#991b1b')
                  const border = isDark
                    ? (n <= 3 ? '#166534' : n <= 6 ? '#92400e' : '#991b1b')
                    : (n <= 3 ? '#6ee7b7' : n <= 6 ? '#fcd34d' : '#fca5a5')
                  return (
                    <div key={sub}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl"
                      style={{ background: bg, border: `1px solid ${border}` }}>
                      <span className="text-xs font-bold" style={{ color }}>{sub}</span>
                      <span className="text-xs font-black ml-1" style={{ color }}>{grade}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
})
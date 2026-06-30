'use client'
// src/components/admin/QuestionStudentPreview.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Admin Objective 4: Preview Mode — shows EXACTLY what the student will see.
//
// Used in two places:
//   1. Upload pipeline Step 5 (preview before saving)
//   2. Question bank edit page
//
// Features:
//   - Renders question using the real QuestionCard component — not a mock
//   - QA score badge (0–100) calculated by scoreQuestion()
//   - Issues list: admin sees every formatting problem before publishing
//   - Simulated answer state so admin can tap options and see feedback
//   - Toggle between "Preview" and "Raw JSON" tabs
//   - Mobile viewport simulation: card shown at 390px wide
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import QuestionCard from '@/components/quiz/QuestionCard'
import { scoreQuestion } from '@/lib/mathRenderer'

// ── QA Score badge ────────────────────────────────────────────────────────────
function QABadge({ score, issues }) {
  const [open, setOpen] = useState(false)
  const color = score >= 85 ? 'bg-green-100 text-green-700 border-green-200'
              : score >= 60 ? 'bg-amber-100 text-amber-700 border-amber-200'
              :               'bg-red-100 text-red-700 border-red-200'
  const emoji = score >= 85 ? '✅' : score >= 60 ? '⚠️' : '❌'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${color} hover:opacity-80 transition-opacity`}
      >
        <span>{emoji}</span>
        <span>QA Score: {score}/100</span>
        {issues.length > 0 && (
          <span className="bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
            {issues.length}
          </span>
        )}
        <span className="ml-0.5">{open ? '▲' : '▼'}</span>
      </button>

      {open && issues.length > 0 && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-72 space-y-2">
          <p className="text-xs font-black text-gray-700 mb-1">Issues to fix before publishing:</p>
          {issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-red-500 flex-shrink-0 mt-0.5">·</span>
              <p className="text-xs text-gray-600 leading-snug">{issue}</p>
            </div>
          ))}
        </div>
      )}

      {open && issues.length === 0 && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-56">
          <p className="text-xs text-green-700 font-bold">✓ No issues found — ready to publish</p>
        </div>
      )}
    </div>
  )
}

// ── Main preview component ────────────────────────────────────────────────────
export default function QuestionStudentPreview({ question, showRawTab = true }) {
  const isDark = useIsDark()
  const [tab,            setTab]            = useState('preview')
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [revealed,       setRevealed]       = useState(false)

  const handleAnswer = useCallback((questionId, key) => {
    setSelectedAnswer(key)
    setRevealed(true)
  }, [])

  const handleReset = () => {
    setSelectedAnswer(null)
    setRevealed(false)
  }

  const { score, issues } = scoreQuestion(question)
  // Falls back to no colour (component's own default) if this admin question
  // object doesn't carry subject data in this context — defensive, not a crash.
  const subjName = question.subjects?.name ?? question.subject_name
  const color = subjName ? resolveSubjectColors(subjName, isDark) : undefined

  return (
    <div className="space-y-4">
      {/* ── Header bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setTab('preview')}
            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-colors ${
              tab === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            👁 Student View
          </button>
          {showRawTab && (
            <button
              onClick={() => setTab('raw')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-colors ${
                tab === 'raw' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {} Raw JSON
            </button>
          )}
        </div>

        <QABadge score={score} issues={issues} />
      </div>

      {/* ── Student view tab ──────────────────────────────────────────────── */}
      {tab === 'preview' && (
        <div>
          {/* Mobile frame */}
          <div
            className="mx-auto rounded-3xl overflow-hidden border-2 border-gray-200 shadow-xl bg-gray-50"
            style={{ maxWidth: 390 }}
          >
            {/* Simulated status bar */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-[10px] text-gray-400 font-medium">Student preview</span>
              </div>
              {(selectedAnswer || revealed) && (
                <button
                  onClick={handleReset}
                  className="text-[10px] text-indigo-600 font-bold hover:underline"
                >
                  Reset answer
                </button>
              )}
            </div>

            {/* Question area */}
            <div className="p-4 bg-white">
              <QuestionCard
                question={question}
                selectedAnswer={selectedAnswer}
                revealed={revealed}
                onAnswer={handleAnswer}
                showExplanation={true}
                color={color}
              />
            </div>
          </div>

          {/* Interaction hint */}
          {!selectedAnswer && (
            <p className="text-center text-xs text-gray-400 mt-3">
              Tap an option above to see the full student experience including explanation
            </p>
          )}
        </div>
      )}

      {/* ── Raw JSON tab ──────────────────────────────────────────────────── */}
      {tab === 'raw' && (
        <div>
          <pre className="bg-gray-900 text-green-300 text-xs rounded-2xl p-4 overflow-auto max-h-[500px] leading-relaxed">
            {JSON.stringify(question, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
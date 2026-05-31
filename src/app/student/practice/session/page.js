'use client'
// src/app/student/practice/session/page.js
// Improvements in this version:
// 1. Submission confirmation flow: low-time warning → confirm dialog → summary screen → review
// 2. Question grid moved to collapsible row at TOP of screen (not bottom)
// 3. ExplanationModal ported from diagnostic QuestionCard — same "Why?" pattern
// 4. Full light/dark mode for all answer states
// 5. answer bleed prevention: key={question.id} on QuestionCard
// 6. Bottom nav hidden via data-hide-nav attribute (BottomNavWrapper reads it)

import { useState, useEffect, useRef, useCallback, createPortal } from 'react'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'

// ── Timer ─────────────────────────────────────────────────────────────────────
function totalSeconds(cfg) {
  if (cfg.durationSecs) return cfg.durationSecs
  const c = cfg.count ?? 20
  if (c <= 10)  return 15 * 60
  if (c <= 20)  return 20 * 60
  if (c <= 30)  return 30 * 60
  return              40 * 60
}
function formatTime(s) {
  if (s <= 0) return '0:00'
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${m}:${String(sec).padStart(2,'0')}`
}
function timerBg(secs, total) {
  const p = secs / Math.max(total, 1)
  if (p > 0.4)  return 'bg-subtle'
  if (p > 0.15) return 'bg-amber-50 dark:bg-amber-950/30'
  return 'bg-red-50 dark:bg-red-950/30'
}
function timerText(secs, total) {
  const p = secs / Math.max(total, 1)
  if (p > 0.4)  return 'text-primary'
  if (p > 0.15) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

// ── Explanation modal — matches diagnostic QuestionCard exactly ───────────────
function ExplanationModal({ question, selectedKey, onClose }) {
  const isCorrect   = selectedKey === question.correct_answer
  const explanation = question.explanation ?? {}

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const wrongOptions = Object.entries(explanation.wrong_options ?? {})
    .filter(([k]) => k !== question.correct_answer)

  const modal = (
    <div className="fixed inset-0 z-[300] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="mt-auto bg-card rounded-t-3xl w-full max-w-lg mx-auto shadow-2xl pb-10 flex flex-col max-h-[88vh]"
        onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-subtle" />
        </div>

        {/* Result banner */}
        <div className={`mx-5 mb-3 mt-2 flex items-center gap-3 px-4 py-3 rounded-2xl flex-shrink-0 ${
          isCorrect
            ? 'bg-green-100 dark:bg-green-950/40 border border-green-300 dark:border-green-700'
            : 'bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-700'
        }`}>
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
            isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>{isCorrect ? '✓' : '✗'}</span>
          <div>
            <p className={`text-sm font-black ${isCorrect ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
              {isCorrect ? 'Correct!' : 'Not quite'}
            </p>
            {!isCorrect && (
              <p className="text-xs text-secondary mt-0.5">
                Correct answer: <strong className="text-primary">{question.correct_answer}</strong>
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="ml-auto w-8 h-8 rounded-full bg-card flex items-center justify-center text-secondary hover:text-primary transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 pb-4 space-y-5">
          {explanation.correct && (
            <div>
              <p className="text-xs font-black text-secondary uppercase tracking-wide mb-1.5">
                Why {question.correct_answer} is correct
              </p>
              <p className="text-sm text-primary leading-relaxed">{explanation.correct}</p>
            </div>
          )}

          {explanation.workings?.length > 0 && (
            <div>
              <p className="text-xs font-black text-secondary uppercase tracking-wide mb-2">
                Step-by-step working
              </p>
              <div className="bg-subtle rounded-2xl overflow-hidden divide-y divide-default">
                {explanation.workings.map((w, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      {w.step ?? i + 1}
                    </span>
                    <p className="text-sm text-primary leading-relaxed">{w.instruction ?? w}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wrongOptions.length > 0 && (
            <div>
              <p className="text-xs font-black text-secondary uppercase tracking-wide mb-2">Why other options are wrong</p>
              <div className="space-y-2">
                {wrongOptions.map(([key, reason]) => (
                  <div key={key} className="bg-subtle rounded-xl px-4 py-3">
                    <span className="text-xs font-black text-tertiary">Option {key} — </span>
                    <span className="text-sm text-primary">{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

// ── Question number grid (top collapsible row) ────────────────────────────────
function QuestionGrid({ total, current, answers, onJump }) {
  const [open, setOpen] = useState(false)
  const answered = new Set(answers.map((_, i) => i))

  return (
    <div>
      {/* Summary row — always visible */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {/* Toggle button */}
        <button onClick={() => setOpen(o => !o)}
          className="flex-shrink-0 h-8 px-3 rounded-xl bg-subtle border border-default text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center gap-1.5">
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
          <span>{answers.length}/{total}</span>
        </button>

        {/* Scrollable mini dots row */}
        {Array.from({ length: total }, (_, i) => {
          const isAnswered = answered.has(i)
          const isCurrent  = i === current
          return (
            <button key={i} onClick={() => onJump(i)}
              className={`flex-shrink-0 w-7 h-7 rounded-lg text-xs font-black transition-all ${
                isCurrent
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isAnswered
                  ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                  : 'bg-subtle text-secondary hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
              }`}>
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* Expanded legend */}
      {open && (
        <div className="mt-2 flex gap-3 px-1">
          <span className="flex items-center gap-1 text-xs text-secondary">
            <span className="w-3 h-3 rounded bg-indigo-600 inline-block" /> Current
          </span>
          <span className="flex items-center gap-1 text-xs text-secondary">
            <span className="w-3 h-3 rounded bg-indigo-100 dark:bg-indigo-950/60 inline-block" /> Answered
          </span>
          <span className="flex items-center gap-1 text-xs text-secondary">
            <span className="w-3 h-3 rounded bg-subtle border border-default inline-block" /> Skipped
          </span>
        </div>
      )}
    </div>
  )
}

// ── QuestionCard ──────────────────────────────────────────────────────────────
// key={question.id} on parent forces remount — no state bleed
function QuestionCard({ question, onAnswer, revealMode, isExamMode, savedAnswer }) {
  const [selected,  setSelected]  = useState(savedAnswer ?? null)
  const [revealed,  setRevealed]  = useState(false)
  const [showModal, setShowModal] = useState(false)

  const color   = getSubjectColor(question.subject_name)
  const correct = question.correct_answer
  const options = question.options ?? {}
  const explanation = question.explanation ?? {}
  const isRight = selected === correct

  function handleSelect(key) {
    if (revealed) return
    setSelected(key)
    if (revealMode === 'immediate') setRevealed(true)
  }

  function handleNext() {
    onAnswer({ questionId: question.id, selected, isCorrect: selected === correct })
  }

  return (
    <div className="space-y-4">
      {/* Tags — hidden in exam mode */}
      {!isExamMode && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${color.bg} ${color.text}`}>
            {question.subject_name}
          </span>
          {question.topic_name && (
            <span className="text-xs text-secondary bg-subtle px-2.5 py-1 rounded-full border border-default">
              {question.topic_name}
            </span>
          )}
          {question.difficulty && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              question.difficulty === 'easy'
                ? 'bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800'
                : question.difficulty === 'hard'
                ? 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800'
            }`}>
              {question.difficulty}
            </span>
          )}
        </div>
      )}

      {/* Question text */}
      <div className="bg-subtle rounded-2xl px-4 py-4 border border-default">
        <p className="text-base font-semibold text-primary leading-relaxed">
          {question.question_text}
        </p>
      </div>

      {/* Options — clear, accessible highlight in both modes */}
      <div className="space-y-2.5">
        {Object.entries(options).map(([key, val]) => {
          // Unselected, unrevealed
          let cls = 'bg-card border-default text-primary hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer'
          if (revealed) {
            if (key === correct)
              // Correct answer — strong green, dark text in both modes
              cls = 'bg-green-100 dark:bg-green-900/50 border-green-500 dark:border-green-500 text-green-900 dark:text-green-100 cursor-default'
            else if (key === selected)
              // Student's wrong pick — strong red, dark text
              cls = 'bg-red-100 dark:bg-red-900/50 border-red-500 dark:border-red-500 text-red-900 dark:text-red-100 cursor-default'
            else
              // Other options — fade out
              cls = 'bg-card border-default text-tertiary opacity-50 cursor-default'
          } else if (selected === key) {
            // Selected but not yet confirmed — clear indigo
            cls = 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-500 dark:border-indigo-400 text-indigo-900 dark:text-indigo-100 cursor-pointer'
          }

          return (
            <button key={key} onClick={() => handleSelect(key)}
              className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-150 ${cls}`}>
              <span className="text-sm font-black flex-shrink-0 w-5 mt-0.5">{key}.</span>
              <span className="text-sm leading-relaxed flex-1">{val}</span>
              {revealed && key === correct && (
                <svg className="w-5 h-5 text-green-700 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              )}
              {revealed && key === selected && key !== correct && (
                <svg className="w-5 h-5 text-red-700 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {/* Post-answer row (immediate mode): result pill + Why? button */}
      {revealed && revealMode === 'immediate' && (
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${
            isRight
              ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700'
              : 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700'
          }`}>
            <span>{isRight ? '🎉' : '🤔'}</span>
            <span>{isRight ? 'Correct!' : `Answer: ${correct}`}</span>
          </div>
          {(explanation.correct || explanation.workings?.length > 0) && (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-full hover:bg-indigo-500 active:scale-95 transition-all">
              <span>💡</span>
              <span>Why?</span>
            </button>
          )}
        </div>
      )}

      {/* Single Next button */}
      {selected !== null && (revealMode === 'end' || revealed) && (
        <button onClick={handleNext}
          className={`w-full py-4 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}>
          Next question →
        </button>
      )}
      {selected === null && (
        <p className="text-center text-xs text-tertiary pt-1">Tap an answer to continue</p>
      )}

      {showModal && (
        <ExplanationModal question={question} selectedKey={selected} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}

// ── Summary screen — shown after submit, before review ────────────────────────
function SummaryScreen({ questions, answers, onReview, onFinish }) {
  const total    = questions.length
  const correct  = answers.filter(a => a.isCorrect).length
  const wrong    = answers.filter(a => a.selected !== null && !a.isCorrect).length
  const skipped  = answers.filter(a => a.selected === null).length
  const pct      = total > 0 ? Math.round((correct / total) * 100) : 0

  const grade = pct >= 80 ? { label: 'Excellent', emoji: '🏆', color: 'text-green-600 dark:text-green-400' }
    : pct >= 60 ? { label: 'Good',      emoji: '👍', color: 'text-blue-600 dark:text-blue-400' }
    : pct >= 40 ? { label: 'Fair',      emoji: '📈', color: 'text-amber-600 dark:text-amber-400' }
    :             { label: 'Keep at it', emoji: '💪', color: 'text-red-600 dark:text-red-400' }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-2 space-y-6 pb-8">
      {/* Score ring */}
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg-subtle)" strokeWidth="12" />
          <circle cx="60" cy="60" r="52" fill="none"
            stroke={pct >= 70 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 326.7} 326.7`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-primary">{pct}%</span>
          <span className="text-xs text-secondary">{grade.label}</span>
        </div>
      </div>

      <span className="text-4xl">{grade.emoji}</span>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        <div className="bg-green-50 dark:bg-green-950/40 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-green-700 dark:text-green-400">{correct}</p>
          <p className="text-xs text-green-700 dark:text-green-500 mt-0.5">Correct</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/40 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-red-700 dark:text-red-400">{wrong}</p>
          <p className="text-xs text-red-700 dark:text-red-500 mt-0.5">Wrong</p>
        </div>
        <div className="bg-subtle rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-secondary">{skipped}</p>
          <p className="text-xs text-secondary mt-0.5">Skipped</p>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-xs space-y-2">
        <button onClick={onReview}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black rounded-2xl hover:opacity-90 transition-all">
          Review answers →
        </button>
        <button onClick={onFinish}
          className="w-full py-3 bg-subtle border border-default text-primary text-sm font-bold rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
          Finish without reviewing
        </button>
      </div>
    </div>
  )
}

// ── Review mode — question by question with explanation modal ─────────────────
function ReviewMode({ questions, answers, onDone }) {
  const [idx,       setIdx]       = useState(0)
  const [showModal, setShowModal] = useState(false)

  const q   = questions[idx]
  const ans = answers[idx]
  if (!q) return null

  const color   = getSubjectColor(q.subject_name)
  const correct = q.correct_answer
  const options = q.options ?? {}
  const isRight = ans?.selected === correct

  const explanation = q.explanation ?? {}
  const hasExplanation = !!(explanation.correct || explanation.workings?.length > 0)

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-card rounded-2xl shadow-sm px-4 py-3 sticky top-0 z-10">
        <p className="text-xs font-bold text-secondary">Reviewing answers</p>
        <span className="text-xs font-black text-primary">{idx + 1}/{questions.length}</span>
        <button onClick={onDone} className="text-xs font-bold text-indigo-500 hover:text-indigo-400">
          Done →
        </button>
      </div>

      {/* Result indicator */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${
        isRight
          ? 'bg-green-100 dark:bg-green-950/40 border border-green-300 dark:border-green-700'
          : 'bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-700'
      }`}>
        <span className={`text-lg`}>{isRight ? '✓' : '✗'}</span>
        <p className={`text-sm font-black ${isRight ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
          {isRight ? 'You got this right' : `You answered ${ans?.selected ?? 'nothing'} · Correct: ${correct}`}
        </p>
      </div>

      {/* Question */}
      <div className="bg-subtle rounded-2xl px-4 py-4 border border-default">
        <p className="text-base font-semibold text-primary leading-relaxed">{q.question_text}</p>
      </div>

      {/* Options read-only */}
      <div className="space-y-2.5">
        {Object.entries(options).map(([key, val]) => {
          let cls = 'bg-card border-default text-tertiary opacity-50'
          if (key === correct)                          cls = 'bg-green-100 dark:bg-green-900/50 border-green-500 text-green-900 dark:text-green-100'
          else if (key === ans?.selected && key !== correct) cls = 'bg-red-100 dark:bg-red-900/50 border-red-500 text-red-900 dark:text-red-100'
          return (
            <div key={key} className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border-2 ${cls}`}>
              <span className="text-sm font-black flex-shrink-0 w-5 mt-0.5">{key}.</span>
              <span className="text-sm leading-relaxed flex-1">{val}</span>
              {key === correct && <svg className="w-5 h-5 text-green-700 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
              {key === ans?.selected && key !== correct && <svg className="w-5 h-5 text-red-700 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>}
            </div>
          )
        })}
      </div>

      {/* Why? button — same style as diagnostic */}
      {hasExplanation && (
        <button onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 active:scale-[0.98] transition-all">
          <span>💡</span>
          <span>Why is this the answer?</span>
        </button>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {idx > 0 && (
          <button onClick={() => { setIdx(i => i - 1); setShowModal(false) }}
            className="flex-1 py-3 bg-subtle border border-default rounded-2xl text-sm font-bold text-secondary hover:text-primary">
            ← Previous
          </button>
        )}
        {idx < questions.length - 1 ? (
          <button onClick={() => { setIdx(i => i + 1); setShowModal(false) }}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-500">
            Next →
          </button>
        ) : (
          <button onClick={onDone}
            className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl text-sm font-black hover:opacity-90">
            Done →
          </button>
        )}
      </div>

      {showModal && (
        <ExplanationModal question={q} selectedKey={ans?.selected ?? null} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}

// ── Confirmation dialog ───────────────────────────────────────────────────────
function ConfirmDialog({ answeredCount, total, secondsLeft, onConfirm, onCancel }) {
  const isLowTime = secondsLeft > 0 && secondsLeft < 5 * 60
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-card rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
        {isLowTime && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-5 py-3 flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <p className="text-xs font-black text-amber-800 dark:text-amber-400">
              Only {formatTime(secondsLeft)} remaining!
            </p>
          </div>
        )}
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="font-black text-primary text-base">Submit your answers?</p>
            <p className="text-sm text-secondary mt-1 leading-relaxed">
              You've answered {answeredCount} of {total} questions.{' '}
              {total - answeredCount > 0 && `${total - answeredCount} unanswered will be marked wrong. `}
              You cannot change answers after submitting.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-3 bg-subtle border border-default text-primary text-sm font-bold rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm}
              className="flex-1 py-3 bg-red-600 text-white text-sm font-black rounded-2xl hover:bg-red-500 transition-colors">
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Low-time warning banner ───────────────────────────────────────────────────
function LowTimeWarning({ secondsLeft, onDismiss }) {
  if (secondsLeft <= 0 || secondsLeft > 5 * 60) return null
  return (
    <div className="fixed top-20 left-0 right-0 z-20 px-4 pointer-events-none">
      <div className="max-w-lg mx-auto bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3 pointer-events-auto">
        <span className="text-xl flex-shrink-0">⏰</span>
        <p className="text-sm font-bold text-amber-800 dark:text-amber-300 flex-1">
          {secondsLeft < 60 ? 'Less than a minute left!' : `${Math.ceil(secondsLeft / 60)} minutes remaining`}
        </p>
        <button onClick={onDismiss} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Main session ──────────────────────────────────────────────────────────────
export default function PracticeSessionPage() {
  const router = useRouter()

  const [config,       setConfig]       = useState(null)
  const [questions,    setQuestions]    = useState([])
  const [index,        setIndex]        = useState(0)
  const [answers,      setAnswers]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [secondsLeft,  setSecondsLeft]  = useState(0)
  const [totalSecs,    setTotalSecs]    = useState(0)
  const [phase,        setPhase]        = useState('quiz')  // 'quiz' | 'confirm' | 'summary' | 'review'
  const [lowTimeDismissed, setLowTimeDismissed] = useState(false)
  const timerRef   = useRef(null)
  const answersRef = useRef([])
  const lowTimeRef = useRef(false)    // track if we've shown the 5-min warning

  // Hide bottom nav while in session
  useEffect(() => {
    document.body.dataset.hideNav = 'true'
    return () => { delete document.body.dataset.hideNav }
  }, [])

  const finishSession = useCallback((finalAnswers, finalQuestions) => {
    clearInterval(timerRef.current)
    sessionStorage.setItem('practice_results', JSON.stringify({
      answers:   finalAnswers,
      questions: finalQuestions.map(q => ({
        id:            q.id,
        subject_name:  q.subject_name,
        topic_name:    q.topic_name    ?? '',
        subtopic_name: q.subtopic_name ?? '',
        subtopic_id:   q.subtopic_id,
        topic_id:      q.topic_id,
        subject_id:    q.subject_id,
        difficulty:    q.difficulty,
        correct_answer:q.correct_answer,
        question_text: q.question_text,
        options:       q.options,
        explanation:   q.explanation,
      })),
    }))

    // Fire-and-forget mastery update
    const topicIds = [...new Set(finalQuestions.map(q => q.topic_id).filter(Boolean))]
    topicIds.forEach(topicId => {
      const qs = finalQuestions.filter(q => q.topic_id === topicId)
      const as = finalAnswers.filter(a => qs.some(q => q.id === a.questionId))
      if (!as.length) return
      fetch('/api/prerequisites/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, score: Math.round((as.filter(a => a.isCorrect).length / as.length) * 100) }),
      }).catch(() => {})
    })

    router.push('/student/practice/results')
  }, [router])

  useEffect(() => {
    const raw = sessionStorage.getItem('practice_config')
    if (!raw) { router.push('/student/practice'); return }
    const cfg = JSON.parse(raw)
    setConfig(cfg)

    const secs = totalSeconds(cfg)
    setTotalSecs(secs); setSecondsLeft(secs)

    const params = new URLSearchParams({
      subjects: cfg.subjects.join(','),
      exam:     cfg.examType ?? 'WAEC',
      count:    String(cfg.count ?? 20),
      mode:     cfg.mode ?? 'practice',
    })
    if (cfg.topic_id) params.set('topic_id', cfg.topic_id)

    fetch(`/api/practice/questions?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setQuestions(d.questions ?? [])
        setLoading(false)
      })
      .catch(() => { setError('Failed to load questions. Check connection and try again.'); setLoading(false) })
  }, [])

  useEffect(() => {
    if (loading || questions.length === 0 || totalSecs === 0) return
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        const next = s - 1
        // Auto-submit when time runs out
        if (next <= 0) {
          clearInterval(timerRef.current)
          const padded = [...answersRef.current]
          while (padded.length < questions.length) {
            padded.push({ questionId: questions[padded.length]?.id, selected: null, isCorrect: false })
          }
          finishSession(padded, questions)
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [loading, questions.length, totalSecs])

  function handleAnswer(result) {
    const next = [...answers, result]
    answersRef.current = next
    setAnswers(next)

    const revealMode = config?.revealMode ?? 'immediate'
    if (index + 1 >= questions.length) {
      // Last question answered
      clearInterval(timerRef.current)
      if (revealMode === 'end') {
        setPhase('summary')
      } else {
        finishSession(next, questions)
      }
    } else {
      setIndex(i => i + 1)
    }
  }

  function handleSubmitEarly() {
    setPhase('confirm')
  }

  function handleConfirmSubmit() {
    clearInterval(timerRef.current)
    // Pad unanswered questions
    const padded = [...answers]
    while (padded.length < questions.length) {
      padded.push({ questionId: questions[padded.length]?.id, selected: null, isCorrect: false })
    }
    answersRef.current = padded
    setAnswers(padded)
    setPhase('summary')
  }

  function handleJump(i) { setIndex(i) }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-secondary">Loading questions…</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
      <p className="text-4xl">😕</p>
      <p className="font-bold text-primary">No questions available</p>
      <p className="text-sm text-secondary">{error}</p>
      <button onClick={() => router.push('/student/practice')}
        className="px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500">
        Back to Practice
      </button>
    </div>
  )

  const revealMode  = config?.revealMode ?? 'immediate'
  const isExamMode  = config?.mode === 'exam'
  const isMockMode  = config?.mode === 'mock'
  const showGrid    = revealMode === 'end'
  const showSubmit  = (isMockMode || isExamMode) && answers.length > 0 && answers.length < questions.length
  const showLowTime = !lowTimeDismissed && secondsLeft > 0 && secondsLeft <= 5 * 60 && secondsLeft > 0 && !lowTimeRef.current

  // Summary phase
  if (phase === 'summary') {
    return (
      <SummaryScreen
        questions={questions}
        answers={answers}
        onReview={() => setPhase('review')}
        onFinish={() => finishSession(answers, questions)}
      />
    )
  }

  // Review phase
  if (phase === 'review') {
    return (
      <ReviewMode
        questions={questions}
        answers={answers}
        onDone={() => finishSession(answers, questions)}
      />
    )
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Confirm dialog */}
      {phase === 'confirm' && (
        <ConfirmDialog
          answeredCount={answers.length}
          total={questions.length}
          secondsLeft={secondsLeft}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setPhase('quiz')}
        />
      )}

      {/* Low-time warning */}
      {showLowTime && (
        <LowTimeWarning secondsLeft={secondsLeft} onDismiss={() => setLowTimeDismissed(true)} />
      )}

      {/* Timer bar */}
      <div className="flex items-center justify-between bg-card rounded-2xl shadow-sm px-4 py-3 sticky top-0 z-10">
        <button onClick={() => {
          if (confirm('Exit? Progress will be lost.')) {
            clearInterval(timerRef.current)
            router.push('/student/practice')
          }
        }} className="text-xs font-bold text-secondary hover:text-primary transition-colors">← Exit</button>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${timerBg(secondsLeft, totalSecs)}`}>
          <svg className={`w-3.5 h-3.5 ${timerText(secondsLeft, totalSecs)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
          </svg>
          <span className={`text-sm font-black tabular-nums ${timerText(secondsLeft, totalSecs)}`}>
            {formatTime(secondsLeft)}
          </span>
        </div>

        {showGrid
          ? <span className="text-xs text-tertiary font-medium">{index + 1}/{questions.length}</span>
          : <span className="text-xs text-tertiary font-medium">{index + 1}/{questions.length}</span>
        }
      </div>

      {/* Question number grid (top row, mock/exam) */}
      {showGrid && (
        <QuestionGrid total={questions.length} current={index} answers={answers} onJump={handleJump} />
      )}

      {/* Progress bar */}
      <div className="h-1 bg-subtle rounded-full overflow-hidden">
        <div className="h-full bg-indigo-600 rounded-full transition-all duration-300"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Question card — key forces remount on question change (no state bleed) */}
      {questions[index] && (
        <QuestionCard
          key={questions[index].id}
          question={questions[index]}
          onAnswer={handleAnswer}
          revealMode={revealMode}
          isExamMode={isExamMode}
          savedAnswer={answers[index]?.selected ?? null}
        />
      )}

      {/* Submit early button (mock/exam only) */}
      {showSubmit && (
        <button onClick={handleSubmitEarly}
          className="w-full py-3 bg-subtle border border-default rounded-2xl text-sm font-bold text-secondary hover:text-red-600 hover:border-red-300 dark:hover:border-red-700 transition-colors">
          Submit test — {answers.length}/{questions.length} answered
        </button>
      )}
    </div>
  )
}
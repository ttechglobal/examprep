'use client'
// src/components/lesson/VideoLessonPlayer.jsx
//
// TAILWIND v4 COLOUR FIX:
// - Progress bar fill: ${color.accent} → inline style
// - Subject tag pill: ${color.bg} ${color.text} → inline style
// - getSubjectColor replaced with SUBJECT_STYLES map

import { useState } from 'react'

const SUBJECT_STYLES = {
  'Mathematics':           { bg: '#eff6ff', text: '#1d4ed8', accent: '#3b82f6' },
  'Further Mathematics':   { bg: '#f0f9ff', text: '#0369a1', accent: '#0ea5e9' },
  'English Language':      { bg: '#faf5ff', text: '#7e22ce', accent: '#a855f7' },
  'Physics':               { bg: '#ecfeff', text: '#0e7490', accent: '#06b6d4' },
  'Chemistry':             { bg: '#f0fdf4', text: '#15803d', accent: '#22c55e' },
  'Biology':               { bg: '#ecfdf5', text: '#047857', accent: '#10b981' },
  'Economics':             { bg: '#fffbeb', text: '#b45309', accent: '#f59e0b' },
  'Government':            { bg: '#fef2f2', text: '#b91c1c', accent: '#ef4444' },
  'Literature in English': { bg: '#fdf2f8', text: '#9d174d', accent: '#ec4899' },
  'Geography':             { bg: '#f0fdfa', text: '#0f766e', accent: '#14b8a6' },
  'Agricultural Science':  { bg: '#f7fee7', text: '#4d7c0f', accent: '#84cc16' },
  'Commerce':              { bg: '#eef2ff', text: '#4338ca', accent: '#6366f1' },
  'default':               { bg: '#eef2ff', text: '#4338ca', accent: '#6366f1' },
}
function getSubjectStyle(name) { return SUBJECT_STYLES[name] ?? SUBJECT_STYLES.default }

const DIFFICULTY_LABELS = {
  easy:   { label: 'Easy',   style: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' },
  medium: { label: 'Medium', style: 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400' },
  hard:   { label: 'Hard',   style: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400' },
}

// ── Video embed ────────────────────────────────────────────────────────────────
function VideoEmbed({ url }) {
  if (!url) {
    return (
      <div className="w-full aspect-video rounded-2xl bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-3xl mb-2">🎬</p>
          <p className="text-sm">Video coming soon</p>
        </div>
      </div>
    )
  }
  const isYouTube = /youtube\.com|youtu\.be/.test(url)
  if (isYouTube) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
    const vid = match?.[1]
    if (!vid) return null
    return (
      <div className="w-full aspect-video rounded-2xl overflow-hidden bg-gray-900">
        <iframe src={`https://www.youtube.com/embed/${vid}`}
          className="w-full h-full" allow="encrypted-media" allowFullScreen title="Video Lesson" />
      </div>
    )
  }
  return <video src={url} controls className="w-full rounded-2xl bg-gray-900" playsInline />
}

// ── Single question ────────────────────────────────────────────────────────────
function PracticeQuestion({ question, index, batchTotal, onNext, isLast, subjectStyle }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const correct = question.correct_answer
  const isRight = selected === correct
  const diff    = DIFFICULTY_LABELS[question.difficulty]
  const opts    = question.options ?? {}
  const expl    = question.explanation ?? {}

  function pick(key) {
    if (revealed) return
    setSelected(key)
    setRevealed(true)
  }

  return (
    <div className="space-y-4">
      {/* Progress bar — inline style for fill colour */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-subtle rounded-full overflow-hidden">
          <div
            style={{ width: `${((index + 1) / batchTotal) * 100}%`, backgroundColor: subjectStyle.accent }}
            className="h-full rounded-full transition-all"
          />
        </div>
        <span className="text-xs font-bold text-tertiary flex-shrink-0">{index + 1}/{batchTotal}</span>
      </div>

      {/* Tags — inline style for subject pill */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          style={{ backgroundColor: subjectStyle.bg, color: subjectStyle.text }}
          className="text-xs font-bold px-2.5 py-1 rounded-full"
        >
          {question.subject_name ?? 'General'}
        </span>
        {diff && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${diff.style}`}>
            {diff.label}
          </span>
        )}
      </div>

      {/* Question */}
      <p className="text-sm font-semibold text-primary leading-relaxed">{question.question_text}</p>

      {/* Options */}
      <div className="space-y-2">
        {Object.entries(opts).map(([key, val]) => {
          const isCorrect = key === correct
          const isSelected = key === selected
          let optStyle = 'bg-card border-default text-primary hover:border-indigo-300'
          if (revealed) {
            if (isCorrect)                     optStyle = 'bg-green-50 border-green-400 text-green-800 dark:bg-green-950/30 dark:border-green-600 dark:text-green-300'
            else if (isSelected && !isCorrect) optStyle = 'bg-red-50 border-red-400 text-red-800 dark:bg-red-950/30 dark:border-red-600 dark:text-red-300'
            else                               optStyle = 'bg-subtle border-default text-tertiary'
          }
          return (
            <button key={key} onClick={() => pick(key)} disabled={revealed}
              className={`w-full flex items-start gap-3 px-4 py-3 border-2 rounded-2xl text-left transition-all ${optStyle}`}>
              <span className="font-black flex-shrink-0 text-sm w-5">{key}.</span>
              <span className="text-sm leading-relaxed">{val}</span>
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      {revealed && (
        <div className={`rounded-2xl px-4 py-3 space-y-1 ${
          isRight
            ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
        }`}>
          <p className={`text-xs font-black ${isRight ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            {isRight ? '✓ Correct!' : `✗ Correct answer: ${correct}`}
          </p>
          {(expl.text || expl.summary) && (
            <p className="text-xs text-secondary leading-relaxed">{expl.text ?? expl.summary}</p>
          )}
        </div>
      )}

      {revealed && (
        <button onClick={() => onNext()}
          className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
          {isLast ? 'See results →' : 'Next question →'}
        </button>
      )}
    </div>
  )
}

// ── Practice section ────────────────────────────────────────────────────────────
function PracticeSection({ questions, subjectStyle }) {
  const BATCH = 5
  const [batchStart, setBatchStart] = useState(0)
  const [qIndex,     setQIndex]     = useState(0)
  const [phase,      setPhase]      = useState('quiz')
  const [score,      setScore]      = useState(0)

  const batch    = questions.slice(batchStart, batchStart + BATCH)
  const total    = batch.length
  const isLast   = qIndex === total - 1
  const allDone  = batchStart + BATCH >= questions.length

  function handleNext(wasCorrect) {
    if (wasCorrect) setScore(s => s + 1)
    if (isLast) {
      setPhase('result')
    } else {
      setQIndex(i => i + 1)
    }
  }

  function nextBatch() {
    setBatchStart(s => s + BATCH)
    setQIndex(0)
    setScore(0)
    setPhase('quiz')
  }

  if (phase === 'result') {
    const pct = Math.round((score / total) * 100)
    const resultColor = pct >= 70 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'
    return (
      <div className="bg-card rounded-2xl border border-default p-5 text-center space-y-4">
        <p className="text-3xl">{pct >= 70 ? '🎉' : pct >= 50 ? '💪' : '📚'}</p>
        <div>
          <p style={{ color: resultColor }} className="text-2xl font-black">{pct}%</p>
          <p className="text-sm text-secondary mt-1">{score}/{total} correct</p>
        </div>
        {!allDone && (
          <button onClick={nextBatch}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500">
            Next {Math.min(BATCH, questions.length - batchStart - BATCH)} questions →
          </button>
        )}
        {allDone && (
          <p className="text-xs text-tertiary">You've completed all {questions.length} practice questions for this video.</p>
        )}
      </div>
    )
  }

  return (
    <PracticeQuestion
      question={batch[qIndex]}
      index={qIndex}
      batchTotal={total}
      onNext={handleNext}
      isLast={isLast}
      subjectStyle={subjectStyle}
    />
  )
}

// ── Main player ────────────────────────────────────────────────────────────────
export default function VideoLessonPlayer({ lesson }) {
  const [showPractice, setShowPractice] = useState(false)
  const subjectStyle = getSubjectStyle(lesson.subjects?.name ?? '')
  const questions    = lesson.practice_questions ?? []

  return (
    <div className="space-y-5">
      {/* Meta */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {/* Subject badge — inline style */}
          <span
            style={{ backgroundColor: subjectStyle.bg, color: subjectStyle.text }}
            className="text-xs font-bold px-2.5 py-1 rounded-full"
          >
            {lesson.subjects?.name ?? 'General'}
          </span>
          {lesson.topics?.name && (
            <span className="text-xs text-tertiary">{lesson.topics.name}</span>
          )}
        </div>
        <h1 className="text-xl font-black text-primary leading-tight">{lesson.title}</h1>
      </div>

      {/* Video */}
      <VideoEmbed url={lesson.video_url} />

      {/* Practice toggle */}
      {questions.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowPractice(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-card border border-default rounded-2xl hover:bg-subtle transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: subjectStyle.bg }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              >
                📝
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-primary">Practice questions</p>
                <p className="text-xs text-secondary">{questions.length} questions · test your understanding</p>
              </div>
            </div>
            <svg
              className={`w-4 h-4 text-tertiary transition-transform flex-shrink-0 ${showPractice ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          {showPractice && (
            <div className="bg-card rounded-2xl border border-default p-4">
              <PracticeSection questions={questions} subjectStyle={subjectStyle} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
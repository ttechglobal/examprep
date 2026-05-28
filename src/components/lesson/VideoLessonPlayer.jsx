'use client'

// src/components/lesson/VideoLessonPlayer.jsx
// Student-facing video player + 10 practice questions
// Questions shown one at a time after the video. Wrong answers show explanations.

import { useState } from 'react'
import { getSubjectColor } from '@/lib/theme'

const DIFFICULTY_LABELS = {
  easy:   { label: 'Easy',   style: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium', style: 'bg-yellow-100 text-yellow-700' },
  hard:   { label: 'Hard',   style: 'bg-red-100 text-red-700' },
  mixed:  { label: 'Tricky', style: 'bg-purple-100 text-purple-700' },
}

// ── Video player (YouTube or direct URL) ─────────────────────────────────────
function VideoEmbed({ url }) {
  if (!url) {
    return (
      <div className="w-full aspect-video rounded-3xl bg-gray-900 flex items-center justify-center">
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
      <div className="w-full aspect-video rounded-3xl overflow-hidden bg-gray-900">
        <iframe
          src={`https://www.youtube.com/embed/${vid}`}
          className="w-full h-full"
          allow="encrypted-media"
          allowFullScreen
          title="Video Lesson"
        />
      </div>
    )
  }

  return (
    <video
      src={url}
      controls
      className="w-full rounded-3xl bg-gray-900"
      playsInline
    />
  )
}

// ── Single question ───────────────────────────────────────────────────────────
function PracticeQuestion({ question, index, total, onNext, isLast, color }) {
  const [selected, setSelected]   = useState(null)
  const [revealed, setRevealed]   = useState(false)

  const correct  = question.correct_answer
  const isRight  = selected === correct
  const diff     = DIFFICULTY_LABELS[question.difficulty] ?? DIFFICULTY_LABELS.medium

  const handleSelect = (key) => {
    if (revealed) return
    setSelected(key)
    setRevealed(true)
  }

  const handleNext = () => onNext(selected)

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Question {index + 1} of {total}</span>
        <span className={`px-2 py-0.5 rounded-full font-bold ${diff.style}`}>
          {diff.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color.accent} rounded-full transition-all duration-500`}
          style={{ width: `${((index) / total) * 100}%` }}
        />
      </div>

      {/* Question text */}
      <div className={`${color.bg} rounded-3xl px-5 py-4`}>
        <p className={`text-base font-bold ${color.text} leading-snug`}>
          {question.question}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {Object.entries(question.options).map(([key, text]) => {
          let base = 'border-gray-200 bg-white text-gray-800'
          let icon = null

          if (revealed) {
            if (key === correct) {
              base = 'border-green-400 bg-green-50 text-green-900'
              icon = <span className="ml-auto text-green-600 font-black flex-shrink-0">✓</span>
            } else if (key === selected) {
              base = 'border-red-300 bg-red-50 text-red-800'
              icon = <span className="ml-auto text-red-500 font-black flex-shrink-0">✗</span>
            } else {
              base = 'border-gray-100 bg-gray-50 text-gray-400'
            }
          } else if (key === selected) {
            base = `border-indigo-400 bg-indigo-50 text-indigo-900`
          }

          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 ${base}`}
            >
              <span className="w-6 h-6 rounded-full border-2 border-current flex-shrink-0 flex items-center justify-center text-xs font-black mt-0.5">
                {key}
              </span>
              <span className="text-sm leading-snug flex-1">{text}</span>
              {icon}
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {revealed && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Result banner */}
          <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${
            isRight ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <span className="text-xl">{isRight ? '🎉' : '💡'}</span>
            <p className={`text-sm font-bold ${isRight ? 'text-green-800' : 'text-red-800'}`}>
              {isRight ? 'Correct!' : `The correct answer is ${correct}`}
            </p>
          </div>

          {/* Why correct */}
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5">
              Why {correct} is correct
            </p>
            <p className="text-sm text-gray-800 leading-relaxed">
              {question.correct_explanation}
            </p>
          </div>

          {/* Why selected was wrong (if they got it wrong) */}
          {!isRight && selected && question.wrong_explanations?.[selected] && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5">
              <p className="text-xs font-black text-red-500 uppercase tracking-wide mb-1.5">
                Why {selected} is wrong
              </p>
              <p className="text-sm text-red-800 leading-relaxed">
                {question.wrong_explanations[selected]}
              </p>
            </div>
          )}

          {/* Next button */}
          <button
            onClick={handleNext}
            className={`w-full py-4 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}
          >
            {isLast ? 'See my score 🏆' : 'Next question →'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Score screen ──────────────────────────────────────────────────────────────
function ScoreScreen({ score, total, onRetry, color }) {
  const pct = Math.round((score / total) * 100)
  const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '💪' : '📚'
  const msg   = pct >= 80
    ? 'Excellent! You really understood this video.'
    : pct >= 60
    ? 'Good effort! Watch the video again on anything you missed.'
    : "Keep practising — this topic takes time. You'll get there."

  return (
    <div className="text-center space-y-5 py-6">
      <p className="text-6xl">{emoji}</p>
      <div>
        <p className="text-4xl font-black text-gray-900">{pct}%</p>
        <p className="text-gray-500 text-sm mt-1">{score} of {total} correct</p>
      </div>

      {/* Score bar */}
      <div className="mx-auto max-w-xs">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${color.accent} rounded-full transition-all duration-1000`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">{msg}</p>

      <button
        onClick={onRetry}
        className={`mx-auto px-8 py-3.5 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}
      >
        Try again →
      </button>
    </div>
  )
}

// ── Main VideoLessonPlayer ────────────────────────────────────────────────────
export default function VideoLessonPlayer({ lesson }) {
  const [phase, setPhase]       = useState('video')    // 'video' | 'questions' | 'score'
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers]   = useState([])          // { selected, correct }[]

  const subjectName = lesson.subjects?.name ?? ''
  const color       = getSubjectColor(subjectName)
  const questions   = lesson.practice_questions ?? []

  const handleStartQuestions = () => {
    setPhase('questions')
    setQuestionIndex(0)
    setAnswers([])
  }

  const handleNext = (selected) => {
    const q = questions[questionIndex]
    setAnswers(prev => [...prev, { selected, correct: q.correct_answer }])

    if (questionIndex + 1 >= questions.length) {
      setPhase('score')
    } else {
      setQuestionIndex(i => i + 1)
    }
  }

  const handleRetry = () => {
    setPhase('questions')
    setQuestionIndex(0)
    setAnswers([])
  }

  const score = answers.filter(a => a.selected === a.correct).length

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-24">
      {/* Lesson header */}
      <div className={`${color.bg} rounded-3xl px-5 py-4`}>
        <div className="flex items-center gap-2 mb-1">
          {lesson.subjects?.name && (
            <span className={`text-xs font-black ${color.text} opacity-60`}>
              {lesson.subjects.name}
            </span>
          )}
          {lesson.topics?.name && (
            <>
              <span className={`text-xs ${color.text} opacity-40`}>·</span>
              <span className={`text-xs ${color.text} opacity-60`}>{lesson.topics.name}</span>
            </>
          )}
        </div>
        <h1 className={`text-lg font-black ${color.text} leading-snug`}>{lesson.title}</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/50 ${color.text}`}>
            {lesson.exam_type}
          </span>
          {questions.length > 0 && (
            <span className={`text-xs ${color.text} opacity-60`}>
              {questions.length} practice questions
            </span>
          )}
        </div>
      </div>

      {/* Phase: Video */}
      {phase === 'video' && (
        <div className="space-y-4">
          <VideoEmbed url={lesson.video_url} />

          {questions.length > 0 && (
            <button
              onClick={handleStartQuestions}
              className={`w-full py-4 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}
            >
              Start practice questions ({questions.length}) →
            </button>
          )}
        </div>
      )}

      {/* Phase: Questions */}
      {phase === 'questions' && questions.length > 0 && (
        <PracticeQuestion
          key={questionIndex}
          question={questions[questionIndex]}
          index={questionIndex}
          total={questions.length}
          isLast={questionIndex + 1 >= questions.length}
          color={color}
          onNext={handleNext}
        />
      )}

      {/* Phase: Score */}
      {phase === 'score' && (
        <ScoreScreen
          score={score}
          total={questions.length}
          onRetry={handleRetry}
          color={color}
        />
      )}
    </div>
  )
}
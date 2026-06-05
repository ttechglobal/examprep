'use client'
// src/components/lesson/VideoLessonPlayer.jsx
// Fixes:
// - Full dark mode compliance using CSS tokens
// - Practice questions: 5 at a time (not 10 at once)
// - Cleaner question UI

import { useState } from 'react'
import { getSubjectColor } from '@/lib/theme'

const DIFFICULTY_LABELS = {
  easy:   { label: 'Easy',   style: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' },
  medium: { label: 'Medium', style: 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400' },
  hard:   { label: 'Hard',   style: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400' },
}

// ── Video embed ───────────────────────────────────────────────────────────────
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

// ── Single question ───────────────────────────────────────────────────────────
function PracticeQuestion({ question, index, batchTotal, onNext, isLast, color }) {
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
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-subtle rounded-full overflow-hidden">
          <div className={`h-full ${color.accent} rounded-full transition-all`}
            style={{ width: `${((index + 1) / batchTotal) * 100}%` }} />
        </div>
        <span className="text-xs font-bold text-tertiary flex-shrink-0">{index + 1}/{batchTotal}</span>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${color.bg} ${color.text}`}>
          {question.subject_name ?? 'Question'}
        </span>
        {diff && <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${diff.style}`}>{diff.label}</span>}
      </div>

      {/* Question text */}
      <div className="bg-card border border-default rounded-2xl px-4 py-4">
        <p className="text-sm font-medium text-primary leading-relaxed">{question.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {Object.entries(opts).map(([key, text]) => {
          let cls = 'border-default bg-card text-primary hover:border-indigo-300 dark:hover:border-indigo-700'
          if (revealed) {
            if (key === correct)       cls = 'border-green-400 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300'
            else if (key === selected) cls = 'border-red-300 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300'
            else                       cls = 'border-default bg-subtle text-tertiary'
          } else if (key === selected) {
            cls = 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200'
          }
          return (
            <button key={key} onClick={() => pick(key)}
              className={`w-full text-left text-sm px-4 py-3 rounded-2xl border-2 transition-all ${cls}`}>
              <span className="font-bold mr-2">{key}.</span>{text}
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      {revealed && (
        <div className="space-y-2">
          {isRight ? (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-4">
              <p className="text-sm font-black text-green-700 dark:text-green-400 mb-1">✓ Correct!</p>
              {expl.correct && <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed">{expl.correct}</p>}
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-2xl p-4">
              <p className="text-sm font-black text-orange-700 dark:text-orange-400 mb-1">
                The correct answer is {correct}
              </p>
              {expl.correct && <p className="text-sm text-orange-800 dark:text-orange-300 leading-relaxed">{expl.correct}</p>}
            </div>
          )}

          <button onClick={() => onNext({ selected, correct, isRight })}
            className={`w-full py-4 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}>
            {isLast ? 'See my score 🏆' : 'Next question →'}
          </button>
        </div>
      )}

      {!revealed && selected === null && (
        <p className="text-center text-xs text-tertiary">Tap an answer to continue</p>
      )}
    </div>
  )
}

// ── Score screen ──────────────────────────────────────────────────────────────
function ScoreScreen({ score, total, onRetry, onNext, hasMore, color }) {
  const pct     = Math.round((score / total) * 100)
  const passing = pct >= 60

  return (
    <div className="space-y-4 text-center">
      <div className={`${color.bg} rounded-3xl p-6`}>
        <p className="text-5xl font-black" style={{ color: passing ? '#16a34a' : '#dc2626' }}>{pct}%</p>
        <p className={`text-lg font-black mt-1 ${color.text}`}>{score} / {total} correct</p>
        <p className={`text-sm mt-1 ${color.text} opacity-70`}>
          {pct >= 80 ? 'Excellent work! 🏆' : pct >= 60 ? 'Good effort! Keep it up 💪' : 'Keep practising — you\'ll get there! 📚'}
        </p>
      </div>

      <div className="flex gap-3">
        <button onClick={onRetry}
          className="flex-1 py-3.5 border border-default text-secondary text-sm font-bold rounded-2xl hover:bg-subtle transition-colors">
          Retry batch
        </button>
        {hasMore && (
          <button onClick={onNext}
            className={`flex-1 py-3.5 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90`}>
            Next 5 →
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main player ───────────────────────────────────────────────────────────────
export default function VideoLessonPlayer({ lesson }) {
  const subjectName = lesson.subjects?.name ?? ''
  const color       = getSubjectColor(subjectName)
  const allQuestions = lesson.practice_questions ?? []

  // 5 questions per batch
  const BATCH_SIZE = 5
  const [phase, setPhase]           = useState('video')
  const [batchStart, setBatchStart] = useState(0)
  const [qIndex, setQIndex]         = useState(0)
  const [answers, setAnswers]       = useState([])

  const batch   = allQuestions.slice(batchStart, batchStart + BATCH_SIZE)
  const hasMore = batchStart + BATCH_SIZE < allQuestions.length

  function startQuestions() {
    setBatchStart(0); setQIndex(0); setAnswers([]); setPhase('questions')
  }

  function handleAnswer(result) {
    const next = [...answers, result]
    setAnswers(next)
    if (qIndex + 1 >= batch.length) {
      setPhase('score')
    } else {
      setQIndex(i => i + 1)
    }
  }

  function handleRetry() {
    setQIndex(0); setAnswers([]); setPhase('questions')
  }

  function handleNextBatch() {
    setBatchStart(s => s + BATCH_SIZE); setQIndex(0); setAnswers([]); setPhase('questions')
  }

  const score = answers.filter(a => a.isRight).length

  return (
    <div className="space-y-5 pb-8">
      {/* Lesson header */}
      <div className={`${color.bg} rounded-3xl px-5 py-4`}>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {lesson.subjects?.name && (
            <span className={`text-xs font-black ${color.text} opacity-60`}>{lesson.subjects.name}</span>
          )}
          {lesson.topics?.name && (
            <><span className={`text-xs ${color.text} opacity-40`}>·</span>
            <span className={`text-xs ${color.text} opacity-60`}>{lesson.topics.name}</span></>
          )}
        </div>
        <h1 className={`text-lg font-black ${color.text} leading-snug`}>{lesson.title}</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-card/50 dark:bg-black/20 ${color.text}`}>
            {lesson.exam_type}
          </span>
          {allQuestions.length > 0 && (
            <span className={`text-xs ${color.text} opacity-60`}>{allQuestions.length} practice questions</span>
          )}
        </div>
      </div>

      {/* Video phase */}
      {phase === 'video' && (
        <div className="space-y-4">
          <VideoEmbed url={lesson.video_url} />
          {allQuestions.length > 0 && (
            <button onClick={startQuestions}
              className={`w-full py-4 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}>
              Start practice questions ({allQuestions.length}) →
            </button>
          )}
        </div>
      )}

      {/* Questions phase — 5 at a time */}
      {phase === 'questions' && batch.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-secondary">
              Questions {batchStart + 1}–{Math.min(batchStart + BATCH_SIZE, allQuestions.length)} of {allQuestions.length}
            </p>
            <button onClick={() => setPhase('video')} className="text-xs text-tertiary hover:text-secondary">← Back to video</button>
          </div>
          <PracticeQuestion
            key={`${batchStart}-${qIndex}`}
            question={batch[qIndex]}
            index={qIndex}
            batchTotal={batch.length}
            isLast={qIndex + 1 >= batch.length}
            color={color}
            onNext={handleAnswer}
          />
        </>
      )}

      {/* Score phase */}
      {phase === 'score' && (
        <>
          <ScoreScreen
            score={score}
            total={batch.length}
            onRetry={handleRetry}
            onNext={handleNextBatch}
            hasMore={hasMore}
            color={color}
          />
          <button onClick={() => setPhase('video')} className="w-full py-3 text-sm text-secondary hover:text-primary">
            ← Back to video
          </button>
        </>
      )}
    </div>
  )
}
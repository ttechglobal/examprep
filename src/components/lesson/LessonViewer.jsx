'use client'
// src/components/lesson/LessonViewer.jsx
// Change from previous: completion screen now has a "Retake lesson" button
// that resets currentIndex to 0, completed to false, earnedPoints to 0.
// Everything else identical to existing working version.

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import SlideRenderer from './SlideRenderer'
import SignupPrompt from '@/components/auth/SignupPrompt'
import { useLessonNav } from '@/contexts/LessonNavContext'
import { usePoints } from '@/contexts/PointsContext'
import Link from 'next/link'

function ExitModal({ onKeep, onExit }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
         style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
        <div className="text-center space-y-1">
          <p className="text-lg font-black text-gray-900 dark:text-white">Leave this lesson?</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Your progress is saved automatically.</p>
        </div>
        <div className="space-y-2.5">
          <button onClick={onKeep}
            className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
            Keep learning
          </button>
          <button onClick={onExit}
            className="w-full py-3.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Exit lesson
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LessonViewer({ subtopic, userId, existingProgress }) {
  const router = useRouter()
  const { open: openLesson, close: closeLesson } = useLessonNav()
  const { awardPoints } = usePoints()

  const lesson      = subtopic.lesson_content
  const slides      = lesson?.slides ?? []
  const totalSlides = slides.length
  const subjectName = subtopic.topics?.subjects?.name ?? ''
  const color       = getSubjectColor(subjectName)

  const [currentIndex,    setCurrentIndex]    = useState(
    existingProgress?.slides_completed
      ? Math.min(existingProgress.slides_completed, totalSlides - 1) : 0
  )
  const [completed,       setCompleted]       = useState(existingProgress?.completed ?? false)
  const [earnedPoints,    setEarnedPoints]    = useState(0)
  const [showSignupPrompt,setShowSignupPrompt]= useState(false)
  const [showExitModal,   setShowExitModal]   = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [slideUnlocked,   setSlideUnlocked]   = useState(false)

  const currentSlide  = slides[currentIndex]
  const progressPct   = totalSlides > 0 ? Math.round(((currentIndex + 1) / totalSlides) * 100) : 0
  const isInteraction = currentSlide?.type === 'interaction'
  const isStudentAttempt = currentSlide?.type === 'worked_example' && currentSlide?.mode === 'student_attempt'
  const isEndQuiz     = currentSlide?.type === 'end_quiz'
  const requiresAction = isInteraction || isStudentAttempt || isEndQuiz
  const canGoNext     = !requiresAction || slideUnlocked

  useEffect(() => { openLesson(); return () => closeLesson() }, [openLesson, closeLesson])
  useEffect(() => { setSlideUnlocked(false) }, [currentIndex])

  const saveProgress = useCallback(async (idx, isComplete = false) => {
    if (!userId) return
    setSaving(true)
    try {
      await fetch(`/api/lessons/${subtopic.id}/progress`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides_completed: idx + 1, total_slides: totalSlides, completed: isComplete }),
      })
    } catch (e) { console.error(e) }
    setSaving(false)
  }, [userId, subtopic.id, totalSlides])

  const handleNext = useCallback(() => {
    if (!canGoNext) return
    if (currentIndex + 1 >= totalSlides) { handleComplete(); return }
    const next = currentIndex + 1
    setCurrentIndex(next)
    saveProgress(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [canGoNext, currentIndex, totalSlides, saveProgress])

  const handleComplete = useCallback(async () => {
    if (!userId) { setShowSignupPrompt(true); return }
    setCompleted(true)
    await saveProgress(totalSlides - 1, true)
    try { await fetch(`/api/lessons/${subtopic.id}/complete`, { method: 'POST' }) } catch {}
    const result = await awardPoints('lesson_complete', subtopic.id)
    if (result?.awarded) setEarnedPoints(result.points_awarded ?? 10)
  }, [userId, subtopic.id, totalSlides, saveProgress, awardPoints])

  const handleExit = useCallback(async () => {
    await saveProgress(currentIndex)
    closeLesson()
    router.back()
  }, [currentIndex, saveProgress, closeLesson, router])

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowRight' && canGoNext) handleNext()
      if (e.key === 'Escape') setShowExitModal(true)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [handleNext, canGoNext])

  // ── Completion screen — with Retake button ─────────────────────────────────
  if (completed && userId) {
    return (
      <div className="fixed inset-0 bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-6 z-50">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="text-6xl animate-bounce">🎉</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Lesson complete!</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              You finished <span className="font-semibold text-gray-900 dark:text-white">{subtopic.name}</span>
            </p>
          </div>

          {earnedPoints > 0 && (
            <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950/40
                            border border-indigo-100 dark:border-indigo-800 rounded-2xl px-5 py-3">
              <span className="text-2xl">⭐</span>
              <div className="text-left">
                <p className="text-sm font-black text-indigo-700 dark:text-indigo-400">+{earnedPoints} points earned</p>
                <p className="text-xs text-indigo-500">Added to your total</p>
              </div>
            </div>
          )}

          <div className={`${color.bg} border rounded-2xl p-4`}>
            <p className={`text-sm font-medium ${color.text}`}>Your progress has been saved. Keep going! 💪</p>
          </div>

          <div className="space-y-2.5 w-full">
            {/* Continue to subject page */}
            <Link href={subtopic.topics?.subjects?.slug
                ? `/student/subjects/${subtopic.topics.subjects.slug}`
                : '/student/lessons'}
              className={`block w-full py-4 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}>
              Continue learning →
            </Link>

            {/* ✅ Retake button — resets viewer state back to slide 0 */}
            <button
              onClick={() => {
                setCompleted(false)
                setCurrentIndex(0)
                setEarnedPoints(0)
                setSlideUnlocked(false)
              }}
              className="block w-full py-3.5 border border-gray-200 dark:border-gray-700
                         text-gray-700 dark:text-gray-300 text-sm font-bold rounded-2xl
                         hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Retake lesson
            </button>

            <Link href="/student/dashboard"
              className="block w-full py-3 text-gray-400 dark:text-gray-500 text-sm text-center
                         hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!currentSlide) return null
  const isLastSlide = currentIndex + 1 >= totalSlides

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-950 flex flex-col z-50">
      {showSignupPrompt && <SignupPrompt subtopicName={subtopic.name} onDismiss={() => setShowSignupPrompt(false)} />}
      {showExitModal && <ExitModal onKeep={() => setShowExitModal(false)} onExit={handleExit} />}

      {/* Top bar */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => setShowExitModal(true)}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0
                       hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {subjectName}{subtopic.topics?.name ? ` · ${subtopic.topics.name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${color.accent}`}
                style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 tabular-nums">
              {currentIndex + 1}/{totalSlides}
            </span>
          </div>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 pb-4">
          {currentIndex === 0 && lesson?.title && (
            <div className="mb-5">
              <h1 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{lesson.title}</h1>
              {subtopic.name && lesson.title !== subtopic.name && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtopic.name}</p>
              )}
            </div>
          )}
          <SlideRenderer slide={currentSlide} color={color} onUnlock={() => setSlideUnlocked(true)} />
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="max-w-lg mx-auto space-y-2">
          {!canGoNext && (
            <p className="text-xs text-center text-gray-400 dark:text-gray-500 font-medium">
              {isInteraction ? 'Answer the question to continue'
                : isEndQuiz  ? 'Complete all questions to continue'
                : 'Reveal the solution to continue'}
            </p>
          )}
          <div className="flex gap-2">
            {currentIndex > 0 && (
              <button
                onClick={() => { setCurrentIndex(i => i - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="px-5 py-4 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400
                           text-sm font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800
                           hover:text-gray-900 dark:hover:text-white transition-all flex-shrink-0">
                ← Back
              </button>
            )}
            <button onClick={handleNext} disabled={!canGoNext}
              className={`flex-1 py-4 text-sm font-black rounded-2xl transition-all ${
                canGoNext
                  ? `${color.accent} text-white hover:opacity-90 active:scale-[0.98]`
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}>
              {isLastSlide ? 'Complete lesson 🎉' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
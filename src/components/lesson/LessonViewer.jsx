'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import SlideRenderer from './SlideRenderer'
import SignupPrompt from '@/components/auth/SignupPrompt'
import { useLessonNav } from '@/contexts/LessonNavContext'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────────────────────
// LessonViewer.jsx
// FIX 7: end_quiz slides block Next until all questions answered
// FIX 8: hides bottom navbar via LessonNavContext; exit confirmation modal
// ─────────────────────────────────────────────────────────────────────────────

// ── Exit confirmation modal ───────────────────────────────────────────────────
function ExitModal({ onKeep, onExit }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
        <div className="text-center space-y-1">
          <p className="text-lg font-black text-gray-900">Leave this lesson?</p>
          <p className="text-sm text-gray-500">Your progress will be saved.</p>
        </div>
        <div className="space-y-2.5">
          <button
            onClick={onKeep}
            className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
          >
            Keep learning
          </button>
          <button
            onClick={onExit}
            className="w-full py-3.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-2xl hover:bg-gray-50 transition-colors"
          >
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

  const lesson = subtopic.lesson_content
  const slides = lesson?.slides ?? []
  const totalSlides = slides.length
  const subjectName = subtopic.topics?.subjects?.name ?? ''
  const color = getSubjectColor(subjectName)

  const [currentIndex, setCurrentIndex] = useState(
    existingProgress?.slides_completed
      ? Math.min(existingProgress.slides_completed, totalSlides - 1)
      : 0
  )
  const [completed, setCompleted] = useState(existingProgress?.completed ?? false)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [slideUnlocked, setSlideUnlocked] = useState(false)

  const currentSlide = slides[currentIndex]
  const progress = totalSlides > 0 ? Math.round(((currentIndex + 1) / totalSlides) * 100) : 0

  // Which slide types require an explicit action before Next unlocks
  const isInteraction   = currentSlide?.type === 'interaction'
  const isStudentAttempt = currentSlide?.type === 'worked_example' && currentSlide?.mode === 'student_attempt'
  const isEndQuiz       = currentSlide?.type === 'end_quiz'
  const requiresAction  = isInteraction || isStudentAttempt || isEndQuiz

  // FIX 8: hide navbar on mount, restore on unmount
  useEffect(() => {
    openLesson()
    return () => closeLesson()
  }, [openLesson, closeLesson])

  // Reset unlock whenever slide changes
  useEffect(() => {
    setSlideUnlocked(false)
  }, [currentIndex])

  const canGoNext = !requiresAction || slideUnlocked

  // ── Progress persistence ────────────────────────────────────────────────────
  const saveProgress = useCallback(async (idx, isComplete = false) => {
    if (!userId) return
    setSaving(true)
    try {
      await fetch(`/api/lessons/${subtopic.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides_completed: idx + 1,
          total_slides: totalSlides,
          completed: isComplete,
        }),
      })
    } catch (e) {
      console.error('Failed to save progress:', e)
    }
    setSaving(false)
  }, [userId, subtopic.id, totalSlides])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (!canGoNext) return
    if (currentIndex + 1 >= totalSlides) { handleComplete(); return }
    const next = currentIndex + 1
    setCurrentIndex(next)
    saveProgress(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [canGoNext, currentIndex, totalSlides, saveProgress])

  const handleComplete = useCallback(async () => {
    setCompleted(true)
    if (userId) {
      await saveProgress(totalSlides - 1, true)
      await fetch(`/api/lessons/${subtopic.id}/complete`, { method: 'POST' })
    } else {
      setShowSignupPrompt(true)
    }
  }, [userId, subtopic.id, totalSlides, saveProgress])

  // Exit: save progress then navigate back
  const handleExit = useCallback(async () => {
    await saveProgress(currentIndex)
    closeLesson()
    router.back()
  }, [currentIndex, saveProgress, closeLesson, router])

  // Keyboard nav
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' && canGoNext) handleNext()
      if (e.key === 'Escape') setShowExitModal(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleNext, canGoNext])

  // ── Completion screen ───────────────────────────────────────────────────────
  if (completed && userId) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center px-6 z-50">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="text-6xl animate-bounce">🎉</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Lesson complete!</h2>
            <p className="text-gray-500 text-sm mt-2">
              You finished <span className="font-semibold">{subtopic.name}</span>
            </p>
          </div>
          <div className={`${color.bg} ${color.border} border rounded-2xl p-4`}>
            <p className={`text-sm font-medium ${color.text}`}>
              Great work finishing this topic. Your progress has been saved. 💪
            </p>
          </div>
          <div className="space-y-3">
            <Link href="/student/lessons"
              className="block w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
              Continue learning →
            </Link>
            <Link href="/student/dashboard"
              className="block w-full py-3.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-2xl hover:bg-gray-50 transition-colors">
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
    <div className="fixed inset-0 bg-white flex flex-col z-50">

      {showSignupPrompt && (
        <SignupPrompt subtopicName={subtopic.name} onDismiss={() => setShowSignupPrompt(false)} />
      )}

      {showExitModal && (
        <ExitModal
          onKeep={() => setShowExitModal(false)}
          onExit={handleExit}
        />
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">

          {/* FIX 8: exit button — shows confirmation modal */}
          <button
            onClick={() => setShowExitModal(true)}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 flex-shrink-0"
            aria-label="Exit lesson"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Progress bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 truncate max-w-[180px]">
                {subtopic.name}
              </span>
              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                {currentIndex + 1}/{totalSlides}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${color.accent} rounded-full transition-all duration-500`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {saving && (
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
        </div>

        <div className="max-w-lg mx-auto mt-1 flex items-center gap-1 text-xs text-gray-400 pl-9">
          <span>{subjectName}</span>
          <span>·</span>
          <span className="truncate">{subtopic.topics?.name}</span>
        </div>
      </div>

      {/* ── Slide content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 pb-28">
          <SlideRenderer
            slide={currentSlide}
            slideIndex={currentIndex}
            color={color}
            interactive={true}
            isAdmin={false}
            subtopicId={subtopic.id}
            subjectName={subjectName}
            topicName={subtopic.topics?.name}
            subtopicName={subtopic.name}
            examTag={subtopic.exam_type}
            onAnswered={() => setSlideUnlocked(true)}
            onAttemptReady={() => setSlideUnlocked(true)}
            onQuizComplete={() => setSlideUnlocked(true)}
          />
        </div>
      </div>

      {/* ── Bottom nav ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-4 safe-area-bottom">
        <div className="max-w-lg mx-auto space-y-2">
          {requiresAction && !slideUnlocked && (
            <p className="text-center text-xs text-gray-400 font-medium">
              {isInteraction
                ? 'Answer the question to continue'
                : isEndQuiz
                ? 'Answer all questions to continue'
                : 'Reveal the solution to continue'}
            </p>
          )}
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`w-full py-4 text-sm font-black rounded-2xl transition-all ${
              canGoNext
                ? `${color.accent} text-white hover:opacity-90`
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            {isLastSlide ? 'Complete lesson 🎉' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
'use client'
// src/components/lesson/LessonViewer.jsx
// Fixes:
// - Passes onUnlock correctly to SlideRenderer (was the root cause of Next not working)
// - z-index: lesson is z-[60], above default navbar z-50
// - Copy/paste disabled on lesson content
// - Dark mode throughout
// - Top bar: exit, topic breadcrumb, progress, dark mode toggle
// - No XP display inside lesson
// - Guided worked examples never require unlock (only student_attempt does)

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import SlideRenderer from './SlideRenderer'
import SignupPrompt from '@/components/auth/SignupPrompt'
import { useLessonNav } from '@/contexts/LessonNavContext'
import { usePoints } from '@/contexts/PointsContext'
import DarkModeToggle from '@/components/ui/DarkModeToggle'
import Link from 'next/link'

function ExitModal({ onKeep, onExit }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-[210] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
      <div className="bg-card rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="text-center space-y-1">
          <p className="text-lg font-black text-primary">Leave this lesson?</p>
          <p className="text-sm text-secondary">Your progress is saved automatically.</p>
        </div>
        <div className="space-y-2.5">
          <button onClick={onKeep}
            className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
            Keep learning
          </button>
          <button onClick={onExit}
            className="w-full py-3.5 bg-subtle text-primary text-sm font-medium rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors">
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
  const topicName   = subtopic.topics?.name ?? ''
  const color       = getSubjectColor(subjectName)

  const [currentIndex, setCurrentIndex]   = useState(
    existingProgress?.slides_completed
      ? Math.min(existingProgress.slides_completed, totalSlides - 1) : 0
  )
  const [completed, setCompleted]         = useState(existingProgress?.completed ?? false)
  const [earnedPoints, setEarnedPoints]   = useState(0)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [slideUnlocked, setSlideUnlocked] = useState(false)

  const currentSlide = slides[currentIndex]
  const progressPct  = totalSlides > 0 ? Math.round(((currentIndex + 1) / totalSlides) * 100) : 0

  // Slides that require action before Next
  const isInteraction    = currentSlide?.type === 'interaction'
  const isStudentAttempt = currentSlide?.type === 'worked_example' && currentSlide?.mode === 'student_attempt'
  const isEndQuiz        = currentSlide?.type === 'end_quiz'
  const requiresAction   = isInteraction || isStudentAttempt || isEndQuiz
  const canGoNext        = !requiresAction || slideUnlocked

  // NOTE: guided worked_example does NOT require unlock — students can read and proceed

  useEffect(() => {
    openLesson()
    return () => closeLesson()
  }, [openLesson, closeLesson])

  useEffect(() => {
    setSlideUnlocked(false)
  }, [currentIndex])

  const saveProgress = useCallback(async (idx, isComplete = false) => {
    if (!userId) return
    try {
      await fetch(`/api/lessons/${subtopic.id}/progress`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides_completed: idx + 1, total_slides: totalSlides, completed: isComplete }),
      })
    } catch {}
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

  // Completion screen
  if (completed && userId) {
    return (
      <div className="fixed inset-0 bg-base flex flex-col items-center justify-center px-6 z-[60]">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="text-6xl animate-bounce">🎉</div>
          <div>
            <h2 className="text-2xl font-black text-primary">Lesson complete!</h2>
            <p className="text-secondary text-sm mt-2">
              You finished <span className="font-semibold text-primary">{subtopic.name}</span>
            </p>
          </div>
          {earnedPoints > 0 && (
            <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl px-5 py-3">
              <span className="text-2xl">⭐</span>
              <div className="text-left">
                <p className="text-sm font-black text-indigo-700 dark:text-indigo-400">+{earnedPoints} points earned</p>
                <p className="text-xs text-indigo-500">Added to your total</p>
              </div>
            </div>
          )}
          <div className={`${color.bg} rounded-2xl p-4`}>
            <p className={`text-sm font-medium ${color.text}`}>Your progress has been saved. Keep going! 💪</p>
          </div>
          <div className="space-y-3">
            <Link href="/student/lessons"
              className="block w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
              Continue learning →
            </Link>
            <Link href="/student/dashboard"
              className="block w-full py-3.5 bg-subtle text-primary text-sm font-medium rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors">
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
    // z-[60] — sits above default navbar (z-50) but below modals (z-[200]+)
    <div className="fixed inset-0 bg-base flex flex-col z-[60]"
      // Copy protection
      onCopy={e => e.preventDefault()}
      onCut={e => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>

      {showSignupPrompt && <SignupPrompt subtopicName={subtopic.name} onDismiss={() => setShowSignupPrompt(false)} />}
      {showExitModal    && <ExitModal onKeep={() => setShowExitModal(false)} onExit={handleExit} />}

      {/* ── Top bar: exit + topic + progress + dark mode toggle ── */}
      <div className="flex-shrink-0 bg-card border-b border-default px-4 py-3">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          {/* Exit */}
          <button onClick={() => setShowExitModal(true)}
            className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center flex-shrink-0 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
            <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Topic breadcrumb */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-tertiary truncate">
              {subjectName}{topicName ? ` · ${topicName}` : ''}
            </p>
          </div>

          {/* Progress bar + count */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-16 h-1.5 bg-subtle rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${color.accent}`}
                style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-xs font-bold text-tertiary tabular-nums">{currentIndex + 1}/{totalSlides}</span>
          </div>

          {/* Dark mode toggle in lesson bar */}
          <DarkModeToggle />
        </div>
      </div>

      {/* ── Slide content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-4">
          {currentIndex === 0 && lesson?.title && (
            <div className="mb-5">
              <h1 className="text-xl font-black text-primary leading-tight">{lesson.title}</h1>
              {subtopic.name && lesson.title !== subtopic.name && (
                <p className="text-sm text-secondary mt-1">{subtopic.name}</p>
              )}
            </div>
          )}
          <SlideRenderer
            slide={currentSlide}
            color={color}
            interactive={true}
            onUnlock={() => setSlideUnlocked(true)}  // FIX: this is the key wiring
          />
        </div>
      </div>

      {/* ── Bottom nav: Back + Next ── */}
      <div className="flex-shrink-0 bg-card border-t border-default px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-2">
          {!canGoNext && (
            <p className="text-xs text-center text-secondary font-medium">
              {isInteraction    ? 'Answer the question to continue'
                : isEndQuiz    ? 'Answer all questions to continue'
                : isStudentAttempt ? 'Reveal the solution to continue'
                : ''}
            </p>
          )}
          <div className="flex gap-2">
            {currentIndex > 0 && (
              <button
                onClick={() => { setCurrentIndex(i => i - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="px-5 py-4 bg-subtle text-secondary text-sm font-bold rounded-2xl hover:text-primary transition-all flex-shrink-0">
                ← Back
              </button>
            )}
            <button onClick={handleNext} disabled={!canGoNext}
              className={`flex-1 py-4 text-sm font-black rounded-2xl transition-all ${
                canGoNext ? `${color.accent} text-white hover:opacity-90 active:scale-[0.98]`
                          : 'bg-subtle text-tertiary cursor-not-allowed'
              }`}>
              {isLastSlide ? 'Complete lesson 🎉' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
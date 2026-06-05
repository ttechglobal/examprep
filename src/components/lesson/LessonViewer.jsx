'use client'
// src/components/lesson/LessonViewer.jsx
// ─────────────────────────────────────────────────────────────────────────────
// REDESIGN:
// 1. Fully theme-aware — reads system/app dark class instead of hardcoding dark
// 2. Warm parchment background in light mode (#faf7f2), deep navy in dark (#0f1729)
// 3. Learning-environment feel: calm, warm, focused — not clinical white or pure black
// 4. z-[100] preserved so it covers BottomNav (z-50)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import SlideRenderer from './SlideRenderer'
import SignupPrompt from '@/components/auth/SignupPrompt'
import { useLessonNav } from '@/contexts/LessonNavContext'
import { usePoints } from '@/contexts/PointsContext'
import Link from 'next/link'

// ── Exit confirmation modal ───────────────────────────────────────────────────
function ExitModal({ onKeep, onExit }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
      style={{ backdropFilter: 'blur(6px)' }}
    >
      <div className="bg-card dark:bg-[#1a2744] rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl border border-gray-100 dark:border-white/10">
        <div className="text-center space-y-1">
          <p className="text-lg font-black text-gray-900 dark:text-white">Leave this lesson?</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Your progress is saved automatically.</p>
        </div>
        <div className="space-y-2.5">
          <button onClick={onKeep} className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
            Keep learning
          </button>
          <button onClick={onExit} className="w-full py-3.5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-2xl hover:bg-base dark:hover:bg-card/5 transition-colors">
            Exit lesson
          </button>
        </div>
      </div>
    </div>
  )
}

async function persistProgress({ userId, subtopicId, slidesCompleted, totalSlides, completed }) {
  if (!userId) return
  try {
    await fetch('/api/student/lesson-progress', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subtopicId, slidesCompleted, totalSlides, completed }),
    })
  } catch {}
}

export default function LessonViewer({ subtopic, userId, existingProgress }) {
  const router = useRouter()
  const { open: openLesson, close: closeLesson } = useLessonNav()
  const { awardPoints } = usePoints()

  // lesson_content may arrive as a JSON string (Supabase text col) or parsed object (JSONB)
  const lesson = (() => {
    const raw = subtopic.lesson_content
    if (!raw) return null
    if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return null } }
    return raw
  })()
  const slides      = lesson?.slides ?? []
  const totalSlides = slides.length
  const subjectName = subtopic.topics?.subjects?.name ?? ''
  const color       = getSubjectColor(subjectName)

  const [currentIndex,     setCurrentIndex]     = useState(
    existingProgress?.slides_completed
      ? Math.min(existingProgress.slides_completed, totalSlides - 1) : 0
  )
  const [completed,        setCompleted]        = useState(existingProgress?.completed ?? false)
  const [earnedPoints,     setEarnedPoints]     = useState(0)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [showExitModal,    setShowExitModal]    = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [slideUnlocked,    setSlideUnlocked]    = useState(false)

  useEffect(() => {
    openLesson?.()
    return () => closeLesson?.()
  }, [])

  const currentSlide  = slides[currentIndex]
  const progressPct   = totalSlides > 0 ? Math.round(((currentIndex + 1) / totalSlides) * 100) : 0

  const slideType     = currentSlide?.type ?? ''
  const isInteraction = slideType === 'interaction'
  const isEndQuiz     = slideType === 'end_quiz'
  const isWorked      = slideType === 'worked_example'
  const canGoNext     = (!isInteraction && !isEndQuiz && !isWorked) ? true : slideUnlocked

  useEffect(() => { setSlideUnlocked(false) }, [currentIndex])

  const saveProgress = useCallback(async (idx) => {
    if (!userId || saving) return
    setSaving(true)
    await persistProgress({ userId, subtopicId: subtopic.id, slidesCompleted: idx, totalSlides, completed: false })
    setSaving(false)
  }, [userId, subtopic.id, totalSlides, saving])

  const handleNext = useCallback(async () => {
    if (!canGoNext) return
    const next = currentIndex + 1
    if (next >= totalSlides) {
      if (!userId) { setShowSignupPrompt(true); return }
      await persistProgress({ userId, subtopicId: subtopic.id, slidesCompleted: totalSlides, totalSlides, completed: true })
      const pts = Math.min(50, Math.max(10, totalSlides))
      await awardPoints?.('lesson_complete', pts)
      setEarnedPoints(pts)
      setCompleted(true)
      return
    }
    setCurrentIndex(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (next % 3 === 0) saveProgress(next)
  }, [canGoNext, currentIndex, totalSlides, userId, subtopic.id, awardPoints, saveProgress])

  const handleExit = useCallback(async () => {
    await saveProgress(currentIndex)
    closeLesson?.()
    router.back()
  }, [currentIndex, saveProgress, closeLesson, router])

  // ── Completion screen ──────────────────────────────────────────────────────
  if (completed) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
        style={{ background: 'var(--lesson-bg)' }}>
        <style>{lessonCssVars}</style>
        <div className="text-center max-w-sm w-full space-y-6">
          <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-lg"
            style={{ background: 'var(--lesson-card)' }}>
            🎉
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black" style={{ color: 'var(--lesson-text)' }}>Lesson Complete!</h2>
            <p className="text-sm" style={{ color: 'var(--lesson-text-muted)' }}>
              You finished <span className="font-bold" style={{ color: 'var(--lesson-text)' }}>{subtopic.name}</span>
            </p>
            {earnedPoints > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-black text-amber-700 dark:text-amber-300"
                style={{ background: 'var(--lesson-highlight)' }}>
                +{earnedPoints} pts earned ⭐
              </div>
            )}
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--lesson-text-muted)' }}>Keep going! 💪</p>
          <div className="space-y-2.5 w-full">
            <Link
              href={subtopic.topics?.subjects?.slug ? `/student/subjects/${subtopic.topics.subjects.slug}` : '/student/learn'}
              className="block w-full py-4 text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity text-center"
              style={{ background: 'var(--lesson-accent)' }}>
              Continue learning →
            </Link>
            <button
              onClick={() => { setCompleted(false); setCurrentIndex(0); setEarnedPoints(0); setSlideUnlocked(false) }}
              className="block w-full py-3.5 text-sm font-bold rounded-2xl transition-colors text-center"
              style={{ background: 'var(--lesson-card)', color: 'var(--lesson-text)', border: '1px solid var(--lesson-border)' }}>
              Retake lesson
            </button>
            <Link href="/student/dashboard"
              className="block w-full py-3 text-sm text-center transition-colors"
              style={{ color: 'var(--lesson-text-muted)' }}>
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Guard: if lesson has no slides, show a clear message instead of blank screen
  if (!lesson || slides.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-6" style={{ background: 'var(--lesson-bg)' }}>
        <style>{lessonCssVars}</style>
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-5xl">📖</div>
          <h2 className="text-lg font-black" style={{ color: 'var(--lesson-text)' }}>Lesson content not found</h2>
          <p className="text-sm" style={{ color: 'var(--lesson-text-muted)' }}>
            This lesson may still be loading or hasn't been published yet.
          </p>
          <button onClick={() => router.back()} className="px-6 py-3 rounded-2xl text-sm font-black text-white" style={{ background: 'var(--lesson-accent)' }}>
            ← Go back
          </button>
        </div>
      </div>
    )
  }

  if (!currentSlide) return null
  const isLastSlide = currentIndex + 1 >= totalSlides

  return (
    <div className="fixed inset-0 flex flex-col z-[100]" style={{ background: 'var(--lesson-bg)' }}>
      <style>{lessonCssVars}</style>

      {showSignupPrompt && (
        <SignupPrompt subtopicName={subtopic.name} onDismiss={() => setShowSignupPrompt(false)} />
      )}
      {showExitModal && (
        <ExitModal onKeep={() => setShowExitModal(false)} onExit={handleExit} />
      )}

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 px-4 py-3" style={{ background: 'var(--lesson-header)', borderBottom: '1px solid var(--lesson-border)' }}>
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => setShowExitModal(true)}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ background: 'var(--lesson-card)', color: 'var(--lesson-text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-xs truncate" style={{ color: 'var(--lesson-text-muted)' }}>
              {subjectName}{subtopic.topics?.name ? ` · ${subtopic.topics.name}` : ''}
            </p>
            <p className="text-sm font-black truncate" style={{ color: 'var(--lesson-text)' }}>{subtopic.name}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Progress bar */}
            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--lesson-track)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: 'var(--lesson-accent)' }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--lesson-text-muted)' }}>
              {currentIndex + 1}/{totalSlides}
            </span>
          </div>
        </div>
      </div>

      {/* ── Slide content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 pb-32">
          {currentIndex === 0 && lesson?.title && (
            <div className="mb-6">
              <h1 className="text-xl font-black leading-tight" style={{ color: 'var(--lesson-text)' }}>{lesson.title}</h1>
              {subtopic.name && lesson.title !== subtopic.name && (
                <p className="text-sm mt-1" style={{ color: 'var(--lesson-text-muted)' }}>{subtopic.name}</p>
              )}
            </div>
          )}
          <SlideRenderer
            key={currentIndex}
            slide={currentSlide}
            color={color}
            onUnlock={() => setSlideUnlocked(true)}
          />
        </div>
      </div>

      {/* ── Bottom nav ── */}
      <div
        className="flex-shrink-0 px-4 pt-3"
        style={{
          background: 'var(--lesson-header)',
          borderTop: '1px solid var(--lesson-border)',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="max-w-lg mx-auto space-y-2">
          {!canGoNext && (
            <p className="text-xs text-center font-medium" style={{ color: 'var(--lesson-text-muted)' }}>
              {isInteraction ? 'Answer the question to continue'
                : isEndQuiz  ? 'Complete all questions to continue'
                : 'Complete the worked example to continue'}
            </p>
          )}
          <div className="flex gap-2">
            {currentIndex > 0 && (
              <button
                onClick={() => { setCurrentIndex(i => i - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="px-5 py-4 text-sm font-bold rounded-2xl transition-all flex-shrink-0"
                style={{ background: 'var(--lesson-card)', color: 'var(--lesson-text-muted)', border: '1px solid var(--lesson-border)' }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className="flex-1 py-4 text-sm font-black rounded-2xl transition-all"
              style={canGoNext ? {
                background: 'var(--lesson-accent)',
                color: '#ffffff',
                opacity: 1,
              } : {
                background: 'var(--lesson-card)',
                color: 'var(--lesson-text-muted)',
                cursor: 'not-allowed',
                opacity: 0.5,
                border: '1px solid var(--lesson-border)',
              }}
            >
              {isLastSlide ? 'Complete lesson 🎉' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── CSS custom properties — light and dark lesson environment ─────────────────
// Light: warm parchment (#faf7f2) — like a quality notebook, not sterile white
// Dark:  deep navy (#0f1729) — like studying at night with a warm desk lamp
const lessonCssVars = `
  :root {
    --lesson-bg:          #faf7f2;
    --lesson-header:      #f5f1ea;
    --lesson-card:        #ffffff;
    --lesson-border:      #e8e2d9;
    --lesson-text:        #1a1612;
    --lesson-text-muted:  #7c6f5e;
    --lesson-track:       #e8e2d9;
    --lesson-highlight:   #fef3c7;
    --lesson-accent:      #4f46e5;
    --lesson-surface:     #f0ece4;
    --lesson-correct-bg:  #f0fdf4;
    --lesson-correct-bd:  #86efac;
    --lesson-correct-tx:  #15803d;
    --lesson-wrong-bg:    #fef2f2;
    --lesson-wrong-bd:    #fca5a5;
    --lesson-wrong-tx:    #b91c1c;
    --lesson-option-bg:   #ffffff;
    --lesson-option-bd:   #e8e2d9;
    --lesson-option-tx:   #1a1612;
    --lesson-option-sel:  #eef2ff;
    --lesson-option-selbd:#6366f1;
    --lesson-option-seltx:#4338ca;
  }
  .dark {
    --lesson-bg:          #0f1729;
    --lesson-header:      #0d1525;
    --lesson-card:        #1a2744;
    --lesson-border:      #263352;
    --lesson-text:        #f0f4ff;
    --lesson-text-muted:  #8899bb;
    --lesson-track:       #263352;
    --lesson-highlight:   rgba(251,191,36,0.15);
    --lesson-accent:      #6366f1;
    --lesson-surface:     #162038;
    --lesson-correct-bg:  rgba(16,185,129,0.12);
    --lesson-correct-bd:  #059669;
    --lesson-correct-tx:  #6ee7b7;
    --lesson-wrong-bg:    rgba(239,68,68,0.12);
    --lesson-wrong-bd:    #dc2626;
    --lesson-wrong-tx:    #fca5a5;
    --lesson-option-bg:   #1a2744;
    --lesson-option-bd:   #263352;
    --lesson-option-tx:   #f0f4ff;
    --lesson-option-sel:  rgba(99,102,241,0.2);
    --lesson-option-selbd:#818cf8;
    --lesson-option-seltx:#c7d2fe;
  }
`
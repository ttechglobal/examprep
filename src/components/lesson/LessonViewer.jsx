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
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import { LESSON_CSS_VARS_ROOT as lessonCssVars, getAccentOverride } from '@/lib/lessonCssVars'
import SubjectIcon from '@/components/ui/SubjectIcon'
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
      <div className="bg-card rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl border border-default">
        <div className="text-center space-y-1">
          <p className="text-lg font-black text-primary">Leave this lesson?</p>
          <p className="text-sm text-secondary">Your progress is saved automatically.</p>
        </div>
        <div className="space-y-2.5">
          <button onClick={onKeep} className="w-full py-3.5 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors">
            Keep learning
          </button>
          <button onClick={onExit} className="w-full py-3.5 border border-default text-secondary text-sm font-medium rounded-2xl hover:bg-base transition-colors">
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
  const isDark = useIsDark()

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
  const color        = resolveSubjectColors(subjectName, isDark)
  // Intro-screen stats — counted directly from real slide data, not invented.
  const checkCount = slides.filter(s => s.type === 'interaction').length
  const quizSlide   = slides.find(s => s.type === 'end_quiz')
  const quizCount   = quizSlide?.questions?.length ?? 0
  // Subject-coloured accent override — every var(--lesson-accent), var(--lesson-
  // accent-shadow), and var(--lesson-option-sel*) reference throughout this
  // file and SlideRenderer.jsx picks these up automatically, since they're
  // set as inline custom properties on the root container below.
  // Shared with the admin lesson editor's preview via @/lib/lessonCssVars,
  // so both surfaces compute subject colour identically.
  const accentOverride = getAccentOverride(color)

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
  // Intro screen always shows first, even when resuming progress — confirmed
  // deliberate choice: re-orients the student on what they're about to study
  // every time, rather than only on a first-ever visit.
  const [showIntro,        setShowIntro]        = useState(true)

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

  // ── Intro screen ──────────────────────────────────────────────────────────
  // Always shown first (even when resuming) — orients the student on what
  // they're about to study before jumping into slide 1.
  if (showIntro) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
        style={{ background: 'var(--lesson-bg)', ...accentOverride }}>
        <style>{lessonCssVars}</style>
        <div className="text-center max-w-sm w-full">

          {/* Topic icon badge */}
          <div
            className="mx-auto mb-5 flex items-center justify-center"
            style={{
              width: 96, height: 96, borderRadius: 26,
              background: 'var(--lesson-surface)',
              border: '3px solid var(--lesson-accent)',
              boxShadow: '0 5px 0 var(--lesson-accent-shadow)',
            }}
          >
            <SubjectIcon name={subjectName} color={color.text} size={48} />
          </div>

          <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--lesson-accent)', letterSpacing: '0.12em' }}>
            {subjectName}{subtopic.topics?.name ? ` · ${subtopic.topics.name}` : ''}
          </p>
          <h1 className="font-bold mb-2.5" style={{
            fontFamily: "'Baloo 2', 'Inter', sans-serif",
            fontSize: 'clamp(1.5rem, 5.5vw, 2rem)',
            color: 'var(--lesson-text)',
            lineHeight: 1.2,
          }}>
            {subtopic.name}
          </h1>
          {subtopic.intro_blurb && (
            <p className="text-sm mb-6" style={{ color: 'var(--lesson-text-muted)', lineHeight: 1.55 }}>
              {subtopic.intro_blurb}
            </p>
          )}

          {/* Lesson stats card */}
          <div className="rounded-3xl p-5 mb-5 w-full"
            style={{ background: 'var(--lesson-card)', border: '2px solid var(--lesson-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-black" style={{ color: 'var(--lesson-text)' }}>{totalSlides}</p>
                <p className="text-[11px]" style={{ color: 'var(--lesson-text-muted)' }}>Slides</p>
              </div>
              <div>
                <p className="text-lg font-black" style={{ color: 'var(--lesson-text)' }}>{checkCount}</p>
                <p className="text-[11px]" style={{ color: 'var(--lesson-text-muted)' }}>Quick checks</p>
              </div>
              <div>
                <p className="text-lg font-black" style={{ color: 'var(--lesson-text)' }}>{quizCount}</p>
                <p className="text-[11px]" style={{ color: 'var(--lesson-text-muted)' }}>Quiz questions</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowIntro(false)}
            className="w-full text-white font-bold rounded-2xl transition-opacity hover:opacity-90"
            style={{
              fontFamily: "'Baloo 2', 'Inter', sans-serif",
              fontSize: 16, padding: '16px',
              background: 'var(--lesson-accent)',
              boxShadow: '0 5px 0 var(--lesson-accent-shadow)',
            }}
          >
            {existingProgress?.slides_completed > 0 ? 'Continue lesson' : 'Start lesson'}
          </button>
        </div>
      </div>
    )
  }

  // ── Completion screen ──────────────────────────────────────────────────────
  if (completed) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
        style={{ background: 'var(--lesson-bg)', ...accentOverride }}>
        <style>{lessonCssVars}</style>
        <div className="text-center max-w-sm w-full space-y-6">
          <div
            className="mx-auto flex items-center justify-center text-4xl"
            style={{
              width: 96, height: 96, borderRadius: 28,
              background: 'var(--lesson-surface)',
              border: '3px solid var(--lesson-accent)',
              boxShadow: '0 5px 0 var(--lesson-accent-shadow)',
            }}
          >
            🎉
          </div>
          <div className="space-y-2">
            <h2 style={{ fontFamily: "'Baloo 2', 'Inter', sans-serif", fontSize: 26, fontWeight: 700, color: 'var(--lesson-text)' }}>Lesson Complete!</h2>
            <p className="text-sm" style={{ color: 'var(--lesson-text-muted)' }}>
              You finished <span className="font-bold" style={{ color: 'var(--lesson-text)' }}>{subtopic.name}</span>
            </p>
            {earnedPoints > 0 && (
              <div
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold text-amber-700 dark:text-amber-300"
                style={{
                  fontFamily: "'Baloo 2', 'Inter', sans-serif",
                  background: 'var(--lesson-highlight)',
                  boxShadow: '0 3px 0 rgba(0,0,0,0.08)',
                }}
              >
                +{earnedPoints} pts earned ⭐
              </div>
            )}
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--lesson-text-muted)' }}>Keep going! 💪</p>
          <div className="space-y-2.5 w-full">
            <Link
              href={subtopic.topics?.subjects?.slug ? `/student/subjects/${subtopic.topics.subjects.slug}` : '/student/learn'}
              className="block w-full text-white font-bold rounded-2xl hover:opacity-90 transition-opacity text-center"
              style={{
                fontFamily: "'Baloo 2', 'Inter', sans-serif",
                fontSize: 15, padding: '15px',
                background: 'var(--lesson-accent)',
                boxShadow: '0 4px 0 var(--lesson-accent-shadow)',
              }}>
              Continue learning →
            </Link>
            <button
              onClick={() => {
                setCompleted(false); setCurrentIndex(0); setEarnedPoints(0)
                setSlideUnlocked(false); setShowIntro(true)
              }}
              className="block w-full text-sm font-bold rounded-2xl transition-colors text-center"
              style={{ padding: '13px', background: 'var(--lesson-card)', color: 'var(--lesson-text)', border: '2px solid var(--lesson-border)' }}>
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-6" style={{ background: 'var(--lesson-bg)', ...accentOverride }}>
        <style>{lessonCssVars}</style>
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-5xl">📖</div>
          <h2 style={{ fontFamily: "'Baloo 2', 'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--lesson-text)' }}>Lesson content not found</h2>
          <p className="text-sm" style={{ color: 'var(--lesson-text-muted)' }}>
            This lesson may still be loading or hasn't been published yet.
          </p>
          <button onClick={() => router.back()}
            className="text-sm font-bold text-white"
            style={{
              fontFamily: "'Baloo 2', 'Inter', sans-serif",
              padding: '12px 24px', borderRadius: 16,
              background: 'var(--lesson-accent)',
              boxShadow: '0 4px 0 var(--lesson-accent-shadow)',
            }}>
            ← Go back
          </button>
        </div>
      </div>
    )
  }

  if (!currentSlide) return null
  const isLastSlide = currentIndex + 1 >= totalSlides

  return (
    <div className="fixed inset-0 flex flex-col z-[100]" style={{ background: 'var(--lesson-bg)', ...accentOverride }}>
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
            className="flex items-center justify-center flex-shrink-0 transition-colors"
            style={{
              width: 34, height: 34, borderRadius: 12,
              background: 'var(--lesson-surface)',
              border: '2px solid var(--lesson-border)',
              color: 'var(--lesson-text-muted)',
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-xs truncate" style={{ color: 'var(--lesson-text-muted)' }}>
              {subjectName}{subtopic.topics?.name ? ` · ${subtopic.topics.name}` : ''}
            </p>
            <p className="text-sm font-bold truncate" style={{ fontFamily: "'Baloo 2', 'Inter', sans-serif", color: 'var(--lesson-text)' }}>{subtopic.name}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Progress bar */}
            <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: 'var(--lesson-track)' }}>
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

// --lesson-* CSS custom properties (light: warm parchment, dark: deep navy)
// now live in @/lib/lessonCssVars.js, shared with the admin lesson editor's
// preview pane — see lessonCssVars import above.
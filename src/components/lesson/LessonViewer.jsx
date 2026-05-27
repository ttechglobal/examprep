'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import SectionRenderer from './SectionRenderer'
import SignupPrompt from '@/components/auth/SignupPrompt'
import Link from 'next/link'

export default function LessonViewer({ subtopic, userId, existingProgress }) {
  const router = useRouter()
  const lesson = subtopic.lesson_content
  const sections = lesson?.sections ?? []
  const totalSections = sections.length
  const subjectName = subtopic.topics?.subjects?.name ?? ''
  const color = getSubjectColor(subjectName)

  const [currentIndex, setCurrentIndex] = useState(
    existingProgress?.slides_completed
      ? Math.min(existingProgress.slides_completed, totalSections - 1)
      : 0
  )
  const [completed, setCompleted] = useState(existingProgress?.completed ?? false)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [saving, setSaving] = useState(false)
  const [answered, setAnswered] = useState(false)

  const currentSection = sections[currentIndex]
  const progress = totalSections > 0
    ? Math.round(((currentIndex + 1) / totalSections) * 100) : 0

  const isQuickCheck = currentSection?.type === 'quick_check'
  const isWorkedExample = currentSection?.type === 'worked_example'

  const saveProgress = useCallback(async (idx, isComplete = false) => {
    if (!userId) return
    setSaving(true)
    try {
      await fetch(`/api/lessons/${subtopic.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides_completed: idx + 1,
          total_slides: totalSections,
          completed: isComplete,
        }),
      })
    } catch (e) {
      console.error('Failed to save progress:', e)
    }
    setSaving(false)
  }, [userId, subtopic.id, totalSections])

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= totalSections) {
      handleComplete()
      return
    }
    const next = currentIndex + 1
    setCurrentIndex(next)
    setAnswered(false)
    saveProgress(next)
    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentIndex, totalSections, saveProgress])

  const handleBack = useCallback(() => {
    if (currentIndex === 0) { router.back(); return }
    setCurrentIndex(i => i - 1)
    setAnswered(false)
  }, [currentIndex, router])

  const handleComplete = useCallback(async () => {
    setCompleted(true)
    if (userId) {
      await saveProgress(totalSections - 1, true)
      await fetch(`/api/lessons/${subtopic.id}/complete`, { method: 'POST' })
    } else {
      setShowSignupPrompt(true)
    }
  }, [userId, subtopic.id, totalSections, saveProgress])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' && !isQuickCheck) handleNext()
      if (e.key === 'ArrowLeft') handleBack()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleNext, handleBack, isQuickCheck])

  // Completion screen
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
            <Link
              href="/student/lessons"
              className="block w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
            >
              Continue learning →
            </Link>
            <Link
              href="/student/dashboard"
              className="block w-full py-3.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-2xl hover:bg-gray-50 transition-colors"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!currentSection) return null

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50">

      {showSignupPrompt && (
        <SignupPrompt
          subtopicName={subtopic.name}
          onDismiss={() => setShowSignupPrompt(false)}
        />
      )}

      {/* Top bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={handleBack}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 truncate max-w-[180px]">
                {subtopic.name}
              </span>
              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                {currentIndex + 1}/{totalSections}
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

      {/* Section content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 pb-24">
          <SectionRenderer
            section={currentSection}
            index={currentIndex}
            color={color}
            interactive={true}
            isAdmin={false}
            subtopicId={subtopic.id}
          />
        </div>
      </div>

      {/* Bottom nav */}
      {!isQuickCheck && !isWorkedExample && (
        <div className="flex-shrink-0 fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleNext}
              className={`w-full py-4 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}
            >
              {currentIndex + 1 >= totalSections ? 'Complete lesson 🎉' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* Worked example — next after completing */}
      {isWorkedExample && (
        <div className="flex-shrink-0 fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleNext}
              className={`w-full py-4 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}
            >
              {currentIndex + 1 >= totalSections ? 'Complete lesson 🎉' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* Quick check — next after answering */}
      {isQuickCheck && (
        <div className="flex-shrink-0 fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleNext}
              className={`w-full py-4 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}
            >
              {currentIndex + 1 >= totalSections ? 'Complete lesson 🎉' : 'Next →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
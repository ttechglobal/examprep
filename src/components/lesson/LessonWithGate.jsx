'use client'
// src/components/lesson/LessonWithGate.jsx
// Client wrapper that sits between the server page and LessonViewer.
// Shows the PrerequisiteGate first; once the student passes (or skips),
// renders the actual lesson. Also renders the SnapAndMark button when
// the current slide is a worked_example or essay type.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import LessonViewer from '@/components/lesson/LessonViewer'

// Lazy-load the gate — most students who've already passed their prereqs
// never need this bundle
const PrerequisiteGate = dynamic(
  () => import('@/components/lesson/PrerequisiteGate'),
  { ssr: false, loading: () => null }
)

export default function LessonWithGate({
  lesson, subtopic, userId, existingProgress, accentColor,
  topicId, subjectName,
}) {
  const router  = useRouter()
  const [gateCleared, setGateCleared] = useState(!topicId || !userId)
  // If no topicId or not logged in — skip gate entirely

  function handleProceed() { setGateCleared(true) }

  function handleGoToPrereq(prereqTopicId) {
    // Navigate student to the prereq topic's lesson
    // We redirect to the subjects page filtered to that topic
    if (prereqTopicId) {
      router.push(`/student/study-plan/${prereqTopicId}`)
    } else {
      setGateCleared(true)
    }
  }

  if (!gateCleared) {
    return (
      <PrerequisiteGate
        topicId={topicId}
        subjectName={subjectName}
        onProceed={handleProceed}
        onGoToPrereq={handleGoToPrereq}
      >
        {/* children rendered by gate once cleared */}
        <LessonViewer
          lesson={lesson}
          subtopic={subtopic}
          userId={userId}
          existingProgress={existingProgress}
          accentColor={accentColor}
        />
      </PrerequisiteGate>
    )
  }

  return (
    <LessonViewer
      lesson={lesson}
      subtopic={subtopic}
      userId={userId}
      existingProgress={existingProgress}
      accentColor={accentColor}
    />
  )
}
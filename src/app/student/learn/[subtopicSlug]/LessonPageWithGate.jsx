'use client'

// src/app/student/learn/[subtopicSlug]/LessonPageWithGate.jsx
// Client wrapper that puts PrerequisiteGate in front of the lesson viewer.
// The gate checks prerequisites for the topic, runs soft quizzes, then opens the lesson.
// Drop this in as a wrapper around your existing LessonViewer.

import { useRouter } from 'next/navigation'
import PrerequisiteGate from '@/components/lesson/PrerequisiteGate'

export default function LessonPageWithGate({ subtopic, subject, topic, children }) {
  const router = useRouter()

  const handleGoToPrereq = (prereqTopicId) => {
    // Find the first subtopic of the prereq topic and navigate there
    // For now, navigate to the learn page filtered to that topic's subject
    router.push(`/student/learn?highlight=${prereqTopicId}`)
  }

  return (
    <PrerequisiteGate
      topicId={topic.id}
      subjectName={subject.name}
      onProceed={() => {}} // lesson is rendered as children, no nav needed
      onGoToPrereq={handleGoToPrereq}
    >
      {children}
    </PrerequisiteGate>
  )
}
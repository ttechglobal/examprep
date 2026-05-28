'use client'

import { useLessonNav } from '@/contexts/LessonNavContext'
import BottomNav from './BottomNav'

// ─────────────────────────────────────────────────────────────────────────────
// BottomNavWrapper.jsx  →  src/components/ui/BottomNavWrapper.jsx
// Client component that hides BottomNav while a lesson is open.
// The student layout (server component) renders this instead of BottomNav directly.
// ─────────────────────────────────────────────────────────────────────────────

export default function BottomNavWrapper() {
  const { lessonOpen } = useLessonNav()
  if (lessonOpen) return null
  return <BottomNav />
}
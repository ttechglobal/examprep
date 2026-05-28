'use client'

import { createContext, useContext, useState, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// LessonNavContext.jsx  →  src/contexts/LessonNavContext.jsx
//
// Signal from LessonViewer → StudentLayout to hide the bottom navbar
// while a lesson is open.
//
// Setup (one-time):
//   1. Wrap <StudentLayout> children with <LessonNavProvider>
//   2. In BottomNav (or layout): read `lessonOpen` and hide when true
//   3. LessonViewer calls open() on mount, close() on unmount
// ─────────────────────────────────────────────────────────────────────────────

const LessonNavContext = createContext({
  lessonOpen: false,
  open: () => {},
  close: () => {},
})

export function LessonNavProvider({ children }) {
  const [lessonOpen, setLessonOpen] = useState(false)
  const open  = useCallback(() => setLessonOpen(true),  [])
  const close = useCallback(() => setLessonOpen(false), [])
  return (
    <LessonNavContext.Provider value={{ lessonOpen, open, close }}>
      {children}
    </LessonNavContext.Provider>
  )
}

export function useLessonNav() {
  return useContext(LessonNavContext)
}
// src/app/student/learn/[subtopicSlug]/layout.js
// ─────────────────────────────────────────────────────────────────────────────
// Focused mode layout — overrides the student layout for the lesson viewer.
// The LessonViewer manages its own full-screen chrome (header + slide nav).
// No app header, no sidebar, no bottom nav.
// ─────────────────────────────────────────────────────────────────────────────

export default function LessonLayout({ children }) {
  return <>{children}</>
}
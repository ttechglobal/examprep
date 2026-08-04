// src/app/student/exam/session/layout.js
// ─────────────────────────────────────────────────────────────────────────────
// Focused mode layout — overrides the student layout entirely for this route.
// Renders ONLY the page content: no header, no sidebar, no bottom nav.
// ─────────────────────────────────────────────────────────────────────────────

export default function ExamSessionLayout({ children }) {
  return <>{children}</>
}
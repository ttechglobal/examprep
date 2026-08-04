// src/app/student/practice/session/layout.js
// ─────────────────────────────────────────────────────────────────────────────
// Focused mode layout — overrides the student layout entirely for this route.
// Renders ONLY the page content: no header, no sidebar, no bottom nav.
// The session page manages its own full-screen chrome (HUD + bottom bar).
// ─────────────────────────────────────────────────────────────────────────────

export default function SessionLayout({ children }) {
  return <>{children}</>
}
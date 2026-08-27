// src/app/student/practice/session/layout.js
// ─────────────────────────────────────────────────────────────────────────────
// The practice session is a full-screen immersive experience — no sidebar,
// no bottom nav, no shared shell. This empty layout overrides the parent
// student/layout.js for this route only.
//
// The session page manages its own PointsContext call directly:
//   const { setTotalPoints, showXPToast } = usePoints()
//   // after session save:
//   setTotalPoints(data.new_total_xp)
//   showXPToast(data.xp_awarded, 'Practice session done!')
//
// When the student navigates away from the session back to any student page,
// the student/layout.js re-mounts and picks up the new XP from localStorage
// (written by setTotalPoints). The sidebar updates immediately.
// ─────────────────────────────────────────────────────────────────────────────

export default function SessionLayout({ children }) {
  return children
}
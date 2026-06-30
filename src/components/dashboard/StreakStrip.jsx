'use client'
// src/components/dashboard/StreakStrip.jsx
//
// Replaces the small amber corner pill (StreakBadge) as the dashboard's
// emotional anchor. Sells "consistency over perfection" directly: the
// 7-day strip is filled by streak count, not by score, so a student who
// did 10 easy questions every day looks exactly as good here as one who
// scored 100% twice.
//
// NOTE ON DATA: student_streaks only stores current_streak + last_active_date
// (no per-day log table), so the 7-dot strip is an approximation — it fills
// min(streak, 7) dots counting back from "today" if last_active_date is
// today, else from "yesterday". Good enough for the motivational read this
// is meant to give; if a real daily log is added later, swap the fill logic
// here for the real per-day data without touching the rest of the dashboard.

export default function StreakStrip({ streak = 0, practicedToday = false }) {
  if (streak === 0) {
    return (
      <div className="rounded-2xl px-5 py-4 bg-card border border-default flex items-center gap-3">
        <span className="text-2xl">🎯</span>
        <div>
          <p className="font-black text-primary text-sm">Start your streak today</p>
          <p className="text-xs text-secondary mt-0.5">Just 10 questions keeps it alive</p>
        </div>
      </div>
    )
  }

  const filled = Math.min(streak, 7)

  return (
    <div className="rounded-2xl px-5 py-4 bg-card border border-default">
      <div className="flex items-center gap-3">
        <span className="text-2xl leading-none">🔥</span>
        <div className="flex-1">
          <p className="font-black text-primary text-base leading-tight">{streak}-day streak</p>
          <p className="text-xs text-secondary mt-0.5">
            {practicedToday ? 'Nice — you practised today' : 'Practice today to keep it alive'}
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 mt-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full ${
              i < filled ? 'bg-emerald-500' : 'bg-subtle'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
// Total time in minutes based on question count
export function getTotalMinutes(questionCount) {
  const map = { 10: 15, 20: 30, 30: 45 }
  return map[questionCount] ?? questionCount * 1.5
}

export function getTotalSeconds(questionCount) {
  return getTotalMinutes(questionCount) * 60
}

// Which warning thresholds apply for a given total time (in minutes)
export function getWarningThresholds(totalMinutes) {
  const all = [
    { minutes: 20, label: '20 minutes remaining' },
    { minutes: 10, label: '10 minutes remaining' },
    { minutes: 5,  label: '5 minutes remaining' },
    { minutes: 1,  label: '1 minute remaining — wrap up!' },
  ]
  const seconds = [
    { seconds: 30, label: '30 seconds remaining!' },
  ]

  return {
    minuteWarnings: all.filter(w => w.minutes < totalMinutes),
    secondWarnings: seconds,
  }
}

// Format seconds as MM:SS
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Get color for timer display based on seconds left
export function getTimerColor(secondsLeft, totalSeconds) {
  const pct = secondsLeft / totalSeconds
  if (pct > 0.25) return 'text-gray-700'
  if (pct > 0.1) return 'text-yellow-600'
  return 'text-red-600'
}
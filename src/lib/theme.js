// Subject colors — each subject gets its own identity
export const SUBJECT_COLORS = {
  'Mathematics':          { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   accent: 'bg-blue-500',   light: 'bg-blue-100' },
  'English Language':     { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', accent: 'bg-purple-500', light: 'bg-purple-100' },
  'Physics':              { bg: 'bg-cyan-50',   text: 'text-cyan-700',   border: 'border-cyan-200',   accent: 'bg-cyan-500',   light: 'bg-cyan-100' },
  'Chemistry':            { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  accent: 'bg-green-500',  light: 'bg-green-100' },
  'Biology':              { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',accent: 'bg-emerald-500',light: 'bg-emerald-100' },
  'Economics':            { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  accent: 'bg-amber-500',  light: 'bg-amber-100' },
  'Government':           { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    accent: 'bg-red-500',    light: 'bg-red-100' },
  'Literature in English':{ bg: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-200',   accent: 'bg-pink-500',   light: 'bg-pink-100' },
  'Geography':            { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   accent: 'bg-teal-500',   light: 'bg-teal-100' },
  'Agricultural Science': { bg: 'bg-lime-50',   text: 'text-lime-700',   border: 'border-lime-200',   accent: 'bg-lime-500',   light: 'bg-lime-100' },
  'default':              { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', accent: 'bg-indigo-500', light: 'bg-indigo-100' },
}

export function getSubjectColor(subject) {
  return SUBJECT_COLORS[subject] ?? SUBJECT_COLORS.default
}

// Mastery level labels and colors
export function getMasteryLevel(pct) {
  if (pct >= 80) return { label: 'Mastered',     color: 'text-green-600',  bg: 'bg-green-100',  emoji: '🏆' }
  if (pct >= 60) return { label: 'Getting there', color: 'text-blue-600',   bg: 'bg-blue-100',   emoji: '📈' }
  if (pct >= 40) return { label: 'Building',      color: 'text-yellow-600', bg: 'bg-yellow-100', emoji: '🔨' }
  if (pct >= 20) return { label: 'Just started',  color: 'text-orange-600', bg: 'bg-orange-100', emoji: '🌱' }
  return                 { label: 'Not started',   color: 'text-gray-400',   bg: 'bg-gray-100',   emoji: '💤' }
}

// Nudge messages — keyed by context
export const NUDGES = {
  streak: [
    n => `${n} day streak! You're building a real habit 🔥`,
    n => `${n} days in a row — consistency is everything 💪`,
  ],
  improvement: [
    (sub, pct) => `You improved ${pct}% in ${sub} this week 📈`,
    (sub, pct) => `${pct}% better in ${sub} — you're moving 🚀`,
  ],
  goal: [
    (sub, grade) => `You're getting closer to your ${grade} in ${sub} 🎯`,
    (sub) => `Don't forget — you're aiming high in ${sub} 💡`,
  ],
  general: [
    "Small steps every day add up to big results 🌟",
    "Every question you answer makes you sharper 🧠",
    "Your future self will thank you for studying today 📚",
    "You're doing better than you think. Keep going 💙",
    "Consistency beats talent. Show up today 🏃",
  ],
}

export function getRandomNudge(type, ...args) {
  const pool = NUDGES[type]
  if (!pool?.length) return NUDGES.general[Math.floor(Math.random() * NUDGES.general.length)]
  const fn = pool[Math.floor(Math.random() * pool.length)]
  return typeof fn === 'function' ? fn(...args) : fn
}



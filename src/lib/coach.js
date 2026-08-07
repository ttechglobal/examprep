// src/lib/coach.js — Zara & Emeka (study buddy messages)
// ─────────────────────────────────────────────────────────────────────────────
// Tone: peer, not authority. Warm, direct, slightly cheeky.
// Never "good job!", never generic. Reacts to what the student actually did.
// Zara is science-leaning; Emeka is arts/commercial. Same message library for now.

const now = () => new Date().getHours()

export function homeCoach({ firstName, streakDays, weakTopics, yesterdayQs, nextSubject, nextTopic, todayQs }) {
  const name = firstName ? `, ${firstName}` : ''
  const h    = now()

  if (todayQs >= 10) {
    return { emoji: '🏅', message: `${todayQs} questions today${name} — you're on fire, keep it going.` }
  }
  if (streakDays >= 7) {
    return { emoji: '🔥', message: `${streakDays} days straight${name} — don't let today break it.` }
  }
  if (streakDays >= 3 && !todayQs) {
    return { emoji: '⚡', message: `${streakDays}-day streak${name} — just 5 questions keeps it alive.` }
  }
  if (weakTopics?.length > 0 && nextTopic) {
    return { emoji: '🎯', message: `${nextTopic} needs attention${name} — drill it today.` }
  }
  if (yesterdayQs > 0) {
    return { emoji: '👋', message: `You did ${yesterdayQs} questions yesterday${name} — can we beat that?` }
  }
  if (h < 12) return { emoji: '☀️', message: `A few questions before the day gets busy${name}.` }
  if (h < 17) return { emoji: '📖', message: `Afternoon${name} — 10 quick questions and you're ahead.` }
  return             { emoji: '🌙', message: `Even 10 minutes tonight counts${name}.` }
}

export function practiceCoach({ firstName, weakSubject, weakTopic, recentMistakeType, sessionCount }) {
  const name = firstName ? `, ${firstName}` : ''
  if (weakTopic) {
    return { emoji: '📊', message: `Your ${weakTopic} scores are holding you back${name}. It comes up a lot in WAEC — worth drilling properly today.` }
  }
  if (sessionCount === 0) {
    return { emoji: '🚀', message: `First session${name}! Pick something you're fairly comfortable with — build your confidence, then hit the hard stuff.` }
  }
  return { emoji: '⚡', message: `You showed up${name}. That's already more than most people today. Let's make it count.` }
}

export function communityCoach({ firstName, rank, classSize, pointsToNext }) {
  const name = firstName ? `, ${firstName}` : ''
  if (rank === 1) return { emoji: '🥇', message: `You're top of the class${name}. Everyone else is gunning for you — stay sharp.` }
  if (rank && rank <= 3) return { emoji: '🏆', message: `Top ${rank}${name}. The gap to first place is smaller than you think — a few more sessions and it's yours.` }
  if (pointsToNext && pointsToNext < 30) return { emoji: '📈', message: `${pointsToNext} points from the next rank${name}. That's one good practice session away.` }
  return { emoji: '🤝', message: `Your class is competing${name}. The leaderboard moves fast — the best time to practise is now.` }
}

export function learnCoach({ firstName, subtopicName, topicName }) {
  const name = firstName ? `, ${firstName}` : ''
  return { emoji: '📚', message: `${subtopicName ?? topicName ?? 'This lesson'} is worth understanding properly${name}, not just clicking through. Take your time.` }
}

export function profileCoach({ firstName, totalQs = 0, streakDays = 0, examType = 'WAEC', daysToExam = null }) {
  const name = firstName ? `, ${firstName}` : ''
  if (daysToExam && daysToExam <= 30) {
    return { emoji: '📅', message: `${daysToExam} days to ${examType}${name}. Make every session count — there's still time to move your score.` }
  }
  if (streakDays >= 7) {
    return { emoji: '🔥', message: `${streakDays}-day streak${name}. That consistency is exactly what separates good results from great ones.` }
  }
  if (totalQs >= 100) {
    return { emoji: '💪', message: `${totalQs} questions answered${name}. You're putting in the reps — keep building on this.` }
  }
  if (totalQs === 0) {
    return { emoji: '👋', message: `Welcome${name}! Your journey starts here. Complete your first practice session to start building your mastery.` }
  }
  return { emoji: '📈', message: `You've answered ${totalQs} questions${name}. Each one is closing a gap somewhere — keep going.` }
}
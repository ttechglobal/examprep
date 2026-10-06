// src/lib/analytics.js
// ─────────────────────────────────────────────────────────────────────────────
// The features Analytics reports on, and which feature a session belongs to.
// The same rule is in SQL (analytics_session_feature,
// 20261008_analytics.sql); keep them in step.
//
// Finer than the plan rules (lib/plans.js): there Speed Round and Study share
// Custom Practice's free session; here Speed Round has its own row, so you can
// see which of them students actually use. (Study Practice is saved as
// ordinary practice, so it counts as Custom Practice.)
// ─────────────────────────────────────────────────────────────────────────────

export const ANALYTICS_FEATURES = [
  { id: 'topic',           label: 'Topic Practice' },
  { id: 'battle',          label: 'Battle (vs Computer)' },
  { id: 'quick5',          label: 'Quick 5' },
  { id: 'flashcards',      label: 'Flashcards' },
  { id: 'mock',            label: 'Mock Exam' },
  { id: 'custom',          label: 'Custom Practice' },
  { id: 'speed',           label: 'Speed Round' },
  { id: 'daily_challenge', label: 'Daily Challenge' },
  { id: 'battle_friends',  label: 'Battle (vs Friends)' },
]

export const featureLabel = id => ANALYTICS_FEATURES.find(f => f.id === id)?.label ?? id

/** The feature of a session, from its mode and topic (one topic = Topic Practice). */
export function analyticsFeature({ mode, topic }) {
  if (mode === 'quick5') return 'quick5'
  if (mode === 'mock') return 'mock'
  if (mode === 'battle') return 'battle'
  if (mode === 'timed') return 'speed'
  return topic ? 'topic' : 'custom'
}

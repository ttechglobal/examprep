// src/lib/xp.js
// ─────────────────────────────────────────────────────────────────────────────
// The one XP formula. Session pages use it to show XP instantly; the server
// uses it to award XP after re-checking each answer. Same inputs → same XP, so
// the number a student sees never jumps after sync.
//
// results: [{ selectedIdx: number|null, is_correct: boolean }]
// ─────────────────────────────────────────────────────────────────────────────

export const BATTLE_OUTCOMES = ['win', 'draw', 'loss']

function tally(results) {
  const total    = results.length
  const answered = results.filter(r => r.selectedIdx !== null && r.selectedIdx !== undefined).length
  const correct  = results.filter(r => r.is_correct).length
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  return { total, answered, correct, accuracy }
}

/**
 * @param {'practice'|'quick5'|'timed'|'study'|'mock'|'battle'|string} mode
 * @param {Array}  results
 * @param {object} [opts]  { outcome: 'win'|'draw'|'loss' } for battles
 */
export function computeSessionXP(mode, results, opts = {}) {
  const { answered, correct, accuracy } = tally(results ?? [])

  if (mode === 'battle') {
    const outcome = BATTLE_OUTCOMES.includes(opts.outcome) ? opts.outcome : 'loss'
    return correct * 10 + (outcome === 'win' ? 20 : outcome === 'draw' ? 10 : 0)
  }

  if (mode === 'mock') {
    return Math.max(10,
      answered * 5 + correct * 10 + (accuracy >= 80 ? 100 : accuracy >= 60 ? 50 : 0))
  }

  return Math.max(5,
    answered * 5 + correct * 10 + (accuracy >= 80 ? 50 : accuracy >= 60 ? 25 : 0))
}

// src/lib/xp.js
// ─────────────────────────────────────────────────────────────────────────────
// The one XP formula. Session pages use it to show XP instantly; the server
// uses it to award XP after re-checking each answer. Same inputs → same XP, so
// the number a student sees never jumps after sync.
//
// 5 XP for every correct answer, in practice, mock and battle alike. Battles
// add a small bonus for a win or a draw. Nothing else: no per-question
// participation XP and no accuracy bonuses, so XP stays easy to read.
//
// results: [{ selectedIdx: number|null, is_correct: boolean }]
// ─────────────────────────────────────────────────────────────────────────────

export const BATTLE_OUTCOMES = ['win', 'draw', 'loss']

export const XP_PER_CORRECT    = 5
export const BATTLE_WIN_BONUS  = 10
export const BATTLE_DRAW_BONUS = 5
// Kept for callers that name the battle rate; it is the same rate.
export const BATTLE_XP_PER_CORRECT = XP_PER_CORRECT

/**
 * @param {'practice'|'quick5'|'timed'|'study'|'mock'|'battle'|string} mode
 * @param {Array}  results
 * @param {object} [opts]  { outcome: 'win'|'draw'|'loss' } for battles
 */
export function computeSessionXP(mode, results, opts = {}) {
  const correct = (results ?? []).filter(r => r.is_correct).length
  const base = correct * XP_PER_CORRECT

  if (mode === 'battle') {
    const outcome = BATTLE_OUTCOMES.includes(opts.outcome) ? opts.outcome : 'loss'
    return base + (outcome === 'win' ? BATTLE_WIN_BONUS : outcome === 'draw' ? BATTLE_DRAW_BONUS : 0)
  }

  return base
}

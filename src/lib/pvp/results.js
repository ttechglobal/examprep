// src/lib/pvp/results.js
// Reading a finished 1v1 from one player's side: the outcome, their answers in
// the shape lib/xp.js expects, and the XP they earned (the same formula the
// server used in pvp_finish: correct × 10, +20 for a win, +10 for a draw).
import { computeSessionXP } from '@/lib/xp'

export function opponentRole(me) {
  return me === 'host' ? 'guest' : 'host'
}

/** 'win' | 'draw' | 'loss' for the player viewing `state`. */
export function outcomeFor(state) {
  const { result } = state.match
  if (result === 'draw') return 'draw'
  return result === state.me ? 'win' : 'loss'
}

export function myResults(state) {
  return state.rounds.map(r => ({ is_correct: !!r.mine?.correct, selectedIdx: r.mine?.choice ?? null }))
}

export function matchXp(state) {
  return computeSessionXP('battle', myResults(state), { outcome: outcomeFor(state) })
}

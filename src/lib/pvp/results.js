// src/lib/pvp/results.js
// Reading a finished 1v1 from one player's side: the outcome, their answers in
// the shape lib/xp.js expects, and the XP they earned.
// TODO(1v1): the SQL that awards 1v1 XP (pvp_finish in 20260928_pvp_engine.sql and
// battle_results_from_pvp in 20261003_battle_leaderboard.sql) still uses the old
// rates, correct × 10 with +20 for a win and +10 for a draw. Battle XP is now
// 5 per correct, +10 win, +5 draw (lib/xp.js). Move those functions to the new
// rates when 1v1 is reviewed, or the XP shown here won't match the XP awarded.
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

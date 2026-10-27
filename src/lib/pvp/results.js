// src/lib/pvp/results.js
// Reading a finished 1v1 from one player's side: the outcome, their answers in
// the shape lib/xp.js expects, and the XP they earned.
// Live 1v1 awards are owned by pvp_finish (20260928_pvp_engine.sql), mirrored
// by battle_results_from_pvp (20261003_battle_leaderboard.sql). Their rates
// differ from computer/practice sessions. Keep this display aligned with both
// SQL functions; changing award policy requires migrating those functions too.

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
  if (state.match.status !== 'finished') return 0
  const correct = myResults(state).filter(answer => answer.is_correct).length
  const outcome = outcomeFor(state)
  return correct * 10 + (outcome === 'win' ? 20 : outcome === 'draw' ? 10 : 0)
}

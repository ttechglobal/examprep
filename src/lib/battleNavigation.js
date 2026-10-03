// src/lib/battleNavigation.js
// Where device/browser Back goes from a battle screen (BattleExperience).
// Only the hub leaves the battle world, and asks first; a match asks before
// abandoning the round; any other screen steps back towards the hub.

export const BATTLE_HUB = '/student/battle'
const ONE_V_ONE = '/student/battle/1v1'
const MATCHES = ['/student/battle/session', '/student/battle/1v1/match']

/** { prompt?: 'world' | 'match', to?: path } */
export function battleBackTarget(path) {
  if (path === BATTLE_HUB) return { prompt: 'world' }
  const parent = path.startsWith(`${ONE_V_ONE}/`) ? ONE_V_ONE : BATTLE_HUB
  if (MATCHES.some(match => path.startsWith(match))) return { prompt: 'match', to: parent }
  return { to: parent }
}

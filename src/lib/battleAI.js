// src/lib/battleAI.js
const DIFF = {
  easy:   { rate: 0.45, min: 3000, max: 7000  },
  medium: { rate: 0.65, min: 4000, max: 10000 },
  hard:   { rate: 0.80, min: 5000, max: 13000 },
}

function normaliseOptions(options) {
  if (!options) return []
  if (Array.isArray(options)) return options.map(o => typeof o === 'string' ? o : o?.text ?? o?.value ?? String(o))
  if (typeof options === 'object') return Object.values(options).map(String)
  return []
}

export function createComputerOpponent(difficulty = 'easy') {
  const cfg = DIFF[difficulty] ?? DIFF.easy
  return {
    decide(question) {
      const opts    = normaliseOptions(question.options)
      const correct = question.correct_answer
      if (Math.random() < cfg.rate) return correct
      const wrongs = opts.filter(o => o !== correct)
      return wrongs.length ? wrongs[Math.floor(Math.random() * wrongs.length)] : correct
    },
    getThinkingDelay() {
      return cfg.min + Math.random() * (cfg.max - cfg.min)
    },
  }
}

export function computeDifficulty(wins = 0) {
  if (wins >= 8) return 'hard'
  if (wins >= 3) return 'medium'
  return 'easy'
}

const LS_KEY = 'ep_battle_stats'

export function readLocalBattleStats() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? { ...defaultStats(), ...JSON.parse(raw) } : defaultStats()
  } catch { return defaultStats() }
}

export function saveLocalBattleStats(patch) {
  try {
    const updated = { ...readLocalBattleStats(), ...patch, updated_at: new Date().toISOString() }
    localStorage.setItem(LS_KEY, JSON.stringify(updated))
    return updated
  } catch { return patch }
}

// ── Recent form ──────────────────────────────────────────────────────────────
// The last FORM_LENGTH results as a string, newest first: "WWLDW".
// Same shape as battle_stats.recent_form on the server.
export const FORM_LENGTH = 10
const FORM_CHAR = { win: 'W', draw: 'D', loss: 'L' }

export function pushForm(form, outcome) {
  const c = FORM_CHAR[outcome]
  return c ? (c + (form ?? '')).slice(0, FORM_LENGTH) : (form ?? '')
}

/** Record one finished match on this device (guests and offline included). */
export function recordLocalBattleResult({ outcome, xp }) {
  const cur  = readLocalBattleStats()
  const wins = (cur.battles_won || 0) + (outcome === 'win' ? 1 : 0)
  return saveLocalBattleStats({
    battles_played:  (cur.battles_played || 0) + 1,
    battles_won:     wins,
    battles_drawn:   (cur.battles_drawn || 0) + (outcome === 'draw' ? 1 : 0),
    battles_lost:    (cur.battles_lost  || 0) + (outcome === 'loss' ? 1 : 0),
    total_battle_xp: (cur.total_battle_xp || 0) + (xp || 0),
    ai_difficulty:   computeDifficulty(wins),
    recent_form:     pushForm(cur.recent_form, outcome),
    last_battle_at:  new Date().toISOString(),
  })
}

/**
 * The record to show: the server's (follows the student across devices) unless
 * this device has a newer match the server hasn't received yet (e.g. offline).
 */
export function pickBattleStats(local, server) {
  if (!server) return local
  if (!local?.last_battle_at) return server
  if (!server.last_battle_at) return local
  return new Date(local.last_battle_at) > new Date(server.last_battle_at) ? local : server
}

function defaultStats() {
  return { battles_played: 0, battles_won: 0, battles_drawn: 0, battles_lost: 0, ai_difficulty: 'easy', total_battle_xp: 0, recent_form: '', last_battle_at: null }
}

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

function defaultStats() {
  return { battles_played: 0, battles_won: 0, battles_drawn: 0, battles_lost: 0, ai_difficulty: 'easy', total_battle_xp: 0, last_battle_at: null }
}

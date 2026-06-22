// src/lib/mathKingdomTheme.js
// ─────────────────────────────────────────────────────────────────────────────
// Colour identity per game, following the EXACT discipline established in
// gameTheme.js: explicit hex pairs for light/dark, applied via inline style,
// never Tailwind dynamic dark: classes. This is the proven fix for the
// Tailwind v4 safelist bug already documented in this codebase.
//
// Math Kingdom gets its OWN theme file (not reusing gameTheme.js's
// GAME_TYPE_THEME) because these are 5 distinct game IDENTITIES, not 3
// mechanic TYPES — different design axis, deserves its own map.
// ─────────────────────────────────────────────────────────────────────────────

export const MATH_KINGDOM_GAMES = {
  equation_escape: {
    id:        'equation_escape',
    title:     'Equation Escape',
    icon:      '🗝️',
    tagline:   'Master algebra by escaping mathematical rooms.',
    concept:   'Linear equations & expressions',
    theme:     'dungeon',
    solid:     '#534ab7', bg: '#eeedfe', text: '#3c3489', border: '#cecbf6',
    darkSolid: '#7f77dd', darkBg: '#26215c', darkText: '#cecbf6', darkBorder: '#534ab7',
  },
  fraction_kitchen: {
    id:        'fraction_kitchen',
    title:     'Fraction Kitchen',
    icon:      '🍰',
    tagline:   'Cook up mastery of fractions, one recipe at a time.',
    concept:   'Fractions',
    theme:     'kitchen',
    solid:     '#993c1d', bg: '#faece7', text: '#712b13', border: '#f0997b',
    darkSolid: '#d85a30', darkBg: '#4a1b0c', darkText: '#f0997b', darkBorder: '#993c1d',
  },
  formula_lab: {
    id:        'formula_lab',
    title:     'Formula Lab',
    icon:      '🧪',
    tagline:   'Assemble formulas like puzzles — understand, don\u2019t memorise.',
    concept:   'Area, volume & substitution',
    theme:     'lab',
    solid:     '#0f6e56', bg: '#e1f5ee', text: '#085041', border: '#9fe1cb',
    darkSolid: '#1d9e75', darkBg: '#04342c', darkText: '#9fe1cb', darkBorder: '#0f6e56',
  },
  word_problem_detective: {
    id:        'word_problem_detective',
    title:     'Word Problem Detective',
    icon:      '🔍',
    tagline:   'Crack the case — turn words into working equations.',
    concept:   'Word problems & translation',
    theme:     'detective',
    solid:     '#854f0b', bg: '#faeeda', text: '#633806', border: '#fac775',
    darkSolid: '#ba7517', darkBg: '#412402', darkText: '#fac775', darkBorder: '#854f0b',
  },
  graph_detective: {
    id:        'graph_detective',
    title:     'Graph Detective',
    icon:      '📊',
    tagline:   'Read the clues hidden in graphs and data.',
    concept:   'Graphs, trends & statistics',
    theme:     'detective',
    solid:     '#185fa5', bg: '#e6f1fb', text: '#0c447c', border: '#85b7eb',
    darkSolid: '#378add', darkBg: '#042c53', darkText: '#85b7eb', darkBorder: '#185fa5',
  },
}

// ── Mastery tier colours (Beginner / Intermediate / Master) ──────────────────
// Reuses RESULT_THEME-style semantics (low/mid/high = red/amber/green) for
// instant recognisability with the rest of the app's score colour language.
export const MASTERY_TIER_THEME = {
  beginner:     { label: 'Beginner',     solid: '#a32d2d', bg: '#fcebeb', text: '#791f1f', border: '#f7c1c1', darkSolid: '#e24b4a', darkBg: '#501313', darkText: '#f7c1c1', darkBorder: '#a32d2d' },
  intermediate: { label: 'Intermediate', solid: '#854f0b', bg: '#faeeda', text: '#633806', border: '#fac775', darkSolid: '#ba7517', darkBg: '#412402', darkText: '#fac775', darkBorder: '#854f0b' },
  master:       { label: 'Master',       solid: '#3b6d11', bg: '#eaf3de', text: '#27500a', border: '#c0dd97', darkSolid: '#639922', darkBg: '#173404', darkText: '#c0dd97', darkBorder: '#3b6d11' },
}

export function getMathKingdomGame(gameId) {
  return MATH_KINGDOM_GAMES[gameId] ?? null
}

export function getMasteryTier(pct) {
  if (pct >= 80) return MASTERY_TIER_THEME.master
  if (pct >= 40) return MASTERY_TIER_THEME.intermediate
  return MASTERY_TIER_THEME.beginner
}

export function getMasteryTierLabel(pct) {
  if (pct >= 80) return 'Master'
  if (pct >= 40) return 'Intermediate'
  return 'Beginner'
}
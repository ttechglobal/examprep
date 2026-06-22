// src/lib/gameRegistry.js
// ─────────────────────────────────────────────────────────────────────────────
// THE REGISTRY. Every world and every game in the entire platform is listed
// here, once. The Games Hub, world landing pages, and game play pages all
// render generically FROM this data — adding a new game to an existing
// world, or a new world entirely, never requires touching hub/page code.
//
// MECHANIC FAMILIES (the reusable engines):
//   sort      → SortEngine.jsx       (drag/tap into buckets)
//   match     → MatchEngine.jsx      (pair matching)
//   build     → BuildEngine.jsx      (slider/sandbox + quiz)
//   dungeon   → DungeonEngine.jsx    (sequential rooms, hearts, hints, XP)
//   assemble  → AssembleRunner.jsx   (adjust units until target matches —
//                                      counter variant or multi-constraint
//                                      target-match variant — NO fail state)
//
// CONTENT SOURCES:
//   'static' → config lives inline in this file (Sort/Match/Build) or in a
//              sibling data file referenced via missionSource (Assemble)
//   'db'     → config lives in math_kingdom_room_defs — used for dungeon-
//              mechanic games with many rooms, or any game whose content
//              will grow/be admin-edited
//
// WORLD MERGE NOTE: chemistry_workshop (the original Sort/Match/Build-only
// chemistry world) has been RETIRED and merged into chem_lab. chem_lab is
// now the ONE Chemistry destination — quick-play games (acids-bases,
// organic-functional-groups, ideal-gas) sit alongside the deeper Assemble-
// mechanic mastery games (atom-builder, equation-balancer) under one
// progression header.
//
// HARDENING (this version): getGamesForWorld validates every game before
// returning it and filters out anything malformed, logging a specific
// console.error naming exactly which world + game id is broken. This is
// what prevents a single bad/incomplete registry entry from crashing the
// whole page three components downstream (e.g. GameCard reading
// game.accent.solid on an undefined accent). validateRegistry() runs a
// full one-shot check across the entire registry — see usage note above
// its definition near the bottom of this file.
// ─────────────────────────────────────────────────────────────────────────────

// ── WORLDS ─────────────────────────────────────────────────────────────────────
// One entry per subject-level destination. `subject` must match a real
// subject name in SUBJECT_THEME (subjectTheme.js) AND your curriculum's
// `subjects` table — this is what lets world theming and mastery linking
// both resolve from one string.

export const WORLDS = [
  {
    id:          'math_kingdom',
    title:       'Math Kingdom',
    subject:     'Mathematics',
    icon:        '🏰',
    description: 'Master algebra, fractions, formulas and more through mastery games.',
    games:       ['equation_escape', 'fraction_kitchen', 'formula_lab', 'word_problem_detective', 'graph_detective'],
  },
  {
    id:          'biology_lab',
    title:       'Biology Lab',
    subject:     'Biology',
    icon:        '🔬',
    description: 'Classify, connect and explore the building blocks of life.',
    games:       ['cell-organelles'],
  },
  {
    id:          'chem_lab',
    title:       'Chem Lab',
    subject:     'Chemistry',
    icon:        '🧪',
    description: 'Build atoms, balance equations, and see chemistry come alive.',
    games:       ['atom-builder', 'equation-balancer', 'acids-bases', 'organic-functional-groups', 'ideal-gas'],
  },
  {
    id:          'physics_arena',
    title:       'Physics Arena',
    subject:     'Physics',
    icon:        '⚡',
    description: 'Explore motion, forces and circuits through hands-on play.',
    games:       ['motion-types', 'newton-laws', 'ohms-law'],
  },
  {
    id:          'government_house',
    title:       'Government House',
    subject:     'Government',
    icon:        '🏛️',
    description: 'Untangle the structures and powers of government.',
    games:       ['gov-powers'],
  },
  {
    id:          'economics_exchange',
    title:       'Economics Exchange',
    subject:     'Economics',
    icon:        '📈',
    description: 'Master market structures and economic relationships.',
    games:       ['market-structures'],
  },
  {
    id:          'language_studio',
    title:       'Language Studio',
    subject:     'English Language',
    icon:        '📝',
    description: 'Sharpen literary devices and language patterns.',
    games:       ['literary-devices'],
  },
]

// ── GAMES ──────────────────────────────────────────────────────────────────────

export const GAMES = {

  // ── Math Kingdom (dungeon mechanic, db-backed content) ──────────────────────
  equation_escape: {
    id: 'equation_escape', worldId: 'math_kingdom', mechanic: 'dungeon',
    title: "Equation Escape", icon: '🗝️',
    tagline: 'Master algebra by escaping mathematical rooms.',
    concept: 'Linear equations & expressions',
    difficulty: 'progressive', examTags: ['WAEC', 'JAMB'],
    contentSource: 'db', dbGameId: 'equation_escape',
    accent: { solid: '#534ab7', bg: '#eeedfe', text: '#3c3489', border: '#cecbf6', darkSolid: '#7f77dd', darkBg: '#26215c', darkText: '#cecbf6', darkBorder: '#534ab7' },
  },
  fraction_kitchen: {
    id: 'fraction_kitchen', worldId: 'math_kingdom', mechanic: 'dungeon',
    title: 'Fraction Kitchen', icon: '🍰',
    tagline: 'Cook up mastery of fractions, one recipe at a time.',
    concept: 'Fractions', difficulty: 'progressive', examTags: ['WAEC', 'JAMB'],
    contentSource: 'db', dbGameId: 'fraction_kitchen', comingSoon: true,
    accent: { solid: '#993c1d', bg: '#faece7', text: '#712b13', border: '#f0997b', darkSolid: '#d85a30', darkBg: '#4a1b0c', darkText: '#f0997b', darkBorder: '#993c1d' },
  },
  formula_lab: {
    id: 'formula_lab', worldId: 'math_kingdom', mechanic: 'dungeon',
    title: 'Formula Lab', icon: '🧪',
    tagline: 'Assemble formulas like puzzles — understand, don\u2019t memorise.',
    concept: 'Area, volume & substitution', difficulty: 'progressive', examTags: ['WAEC', 'JAMB'],
    contentSource: 'db', dbGameId: 'formula_lab', comingSoon: true,
    accent: { solid: '#0f6e56', bg: '#e1f5ee', text: '#085041', border: '#9fe1cb', darkSolid: '#1d9e75', darkBg: '#04342c', darkText: '#9fe1cb', darkBorder: '#0f6e56' },
  },
  word_problem_detective: {
    id: 'word_problem_detective', worldId: 'math_kingdom', mechanic: 'dungeon',
    title: 'Word Problem Detective', icon: '🔍',
    tagline: 'Crack the case — turn words into working equations.',
    concept: 'Word problems & translation', difficulty: 'progressive', examTags: ['WAEC', 'JAMB'],
    contentSource: 'db', dbGameId: 'word_problem_detective', comingSoon: true,
    accent: { solid: '#854f0b', bg: '#faeeda', text: '#633806', border: '#fac775', darkSolid: '#ba7517', darkBg: '#412402', darkText: '#fac775', darkBorder: '#854f0b' },
  },
  graph_detective: {
    id: 'graph_detective', worldId: 'math_kingdom', mechanic: 'dungeon',
    title: 'Graph Detective', icon: '📊',
    tagline: 'Read the clues hidden in graphs and data.',
    concept: 'Graphs, trends & statistics', difficulty: 'progressive', examTags: ['WAEC', 'JAMB'],
    contentSource: 'db', dbGameId: 'graph_detective', comingSoon: true,
    accent: { solid: '#185fa5', bg: '#e6f1fb', text: '#0c447c', border: '#85b7eb', darkSolid: '#378add', darkBg: '#042c53', darkText: '#85b7eb', darkBorder: '#185fa5' },
  },

  // ── Biology Lab (sort mechanic, static content) ──────────────────────────────
  'cell-organelles': {
    id: 'cell-organelles', worldId: 'biology_lab', mechanic: 'sort',
    title: 'Cell Organelles', icon: '🔬',
    tagline: 'Plant cell or animal cell — which organelle belongs where?',
    concept: 'Cell Biology', difficulty: 'easy', examTags: ['WAEC', 'JAMB'],
    contentSource: 'static',
    config: {
      buckets: [
        { id: 'plant',  label: 'Plant Cell Only' },
        { id: 'animal', label: 'Animal Cell Only' },
        { id: 'both',   label: 'Both' },
      ],
      items: [
        { id: 'cw',  text: 'Cell Wall',              correct: 'plant'  },
        { id: 'cp',  text: 'Chloroplast',             correct: 'plant'  },
        { id: 'vac', text: 'Large Central Vacuole',   correct: 'plant'  },
        { id: 'nuc', text: 'Nucleus',                 correct: 'both'   },
        { id: 'mit', text: 'Mitochondria',            correct: 'both'   },
        { id: 'rer', text: 'Rough ER',                correct: 'both'   },
        { id: 'rib', text: 'Ribosome',                correct: 'both'   },
        { id: 'cen', text: 'Centriole',               correct: 'animal' },
        { id: 'lys', text: 'Lysosome',                correct: 'animal' },
        { id: 'cm',  text: 'Cell Membrane',           correct: 'both'   },
      ],
    },
  },

  // ── Chem Lab (mix of assemble + sort/match/build) ────────────────────────────
  'atom-builder': {
    id: 'atom-builder', worldId: 'chem_lab', mechanic: 'assemble',
    title: 'Atom Builder', icon: '⚛️',
    tagline: 'Build atoms from particles — see ions and isotopes come to life.',
    concept: 'Atomic Structure', difficulty: 'progressive', examTags: ['WAEC', 'JAMB'],
    contentSource: 'static', missionSource: 'chemLabMissions.ATOM_BUILDER_MISSIONS',
    assembleVariant: 'counter',
    accent: { solid: '#dc2626', bg: '#fef2f2', text: '#991b1b', border: '#fecaca', darkSolid: '#f87171', darkBg: '#450a0a', darkText: '#fca5a5', darkBorder: '#dc2626' },
  },
  'equation-balancer': {
    id: 'equation-balancer', worldId: 'chem_lab', mechanic: 'assemble',
    title: 'Equation Balancer', icon: '⚖️',
    tagline: 'Balance chemical equations by adjusting coefficients.',
    concept: 'Chemical Equations', difficulty: 'progressive', examTags: ['WAEC', 'JAMB'],
    contentSource: 'static', missionSource: 'chemLabMissions.EQUATION_BALANCER_REACTIONS',
    assembleVariant: 'target_match',
    accent: { solid: '#0891b2', bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc', darkSolid: '#22d3ee', darkBg: '#083344', darkText: '#67e8f9', darkBorder: '#0891b2' },
  },
  'acids-bases': {
    id: 'acids-bases', worldId: 'chem_lab', mechanic: 'sort',
    title: 'Acids & Bases', icon: '⚗️',
    tagline: 'Sort these substances into acids, bases, or neutral.',
    concept: 'Acids, Bases and Salts', difficulty: 'easy', examTags: ['WAEC', 'JAMB'],
    contentSource: 'static',
    config: {
      buckets: [
        { id: 'acid',    label: 'Acid' },
        { id: 'base',    label: 'Base' },
        { id: 'neutral', label: 'Neutral' },
      ],
      items: [
        { id: 'hcl',  text: 'HCl (Hydrochloric acid)', correct: 'acid'    },
        { id: 'h2so', text: 'H₂SO₄ (Sulphuric acid)',  correct: 'acid'    },
        { id: 'ch3',  text: 'CH₃COOH (Acetic acid)',   correct: 'acid'    },
        { id: 'naoh', text: 'NaOH (Sodium hydroxide)', correct: 'base'    },
        { id: 'nh3',  text: 'NH₃ (Ammonia)',           correct: 'base'    },
        { id: 'caco', text: 'Ca(OH)₂ (Lime water)',    correct: 'base'    },
        { id: 'h2o',  text: 'H₂O (Pure water)',        correct: 'neutral' },
        { id: 'nacl', text: 'NaCl (Common salt)',      correct: 'neutral' },
      ],
    },
  },
  'organic-functional-groups': {
    id: 'organic-functional-groups', worldId: 'chem_lab', mechanic: 'match',
    title: 'Organic Functional Groups', icon: '🧪',
    tagline: 'Match each functional group to its compound class.',
    concept: 'Organic Chemistry', difficulty: 'medium', examTags: ['WAEC', 'JAMB'],
    contentSource: 'static',
    config: {
      pairs: [
        { term: '–OH',   match: 'Alcohols (e.g. ethanol)' },
        { term: '–COOH', match: 'Carboxylic acids (e.g. ethanoic acid)' },
        { term: '–CHO',  match: 'Aldehydes (e.g. ethanal)' },
        { term: '–CO–',  match: 'Ketones (e.g. propanone)' },
        { term: '–NH₂',  match: 'Amines (e.g. methylamine)' },
        { term: '–COOR', match: 'Esters (e.g. ethyl ethanoate)' },
      ],
    },
  },
  'ideal-gas': {
    id: 'ideal-gas', worldId: 'chem_lab', mechanic: 'build',
    title: 'Ideal Gas Law', icon: '💨',
    tagline: "Explore Boyle's Law — what happens to pressure when volume changes?",
    concept: 'Gas Laws', difficulty: 'hard', examTags: ['WAEC', 'JAMB'],
    contentSource: 'static',
    config: {
      formula: 'P₁V₁ = P₂V₂',
      description: "At constant temperature, pressure and volume are inversely proportional. Compress the gas — watch pressure rise.",
      inputs: [
        { id: 'pressure1', label: 'Initial Pressure (P₁)', unit: 'atm', min: 1, max: 10, step: 0.5, default: 2 },
        { id: 'volume1',   label: 'Initial Volume (V₁)',   unit: 'L',   min: 1, max: 20, step: 1,   default: 10 },
        { id: 'volume2',   label: 'New Volume (V₂)',       unit: 'L',   min: 1, max: 20, step: 1,   default: 5  },
      ],
      output: { id: 'pressure2', label: 'New Pressure (P₂)', unit: 'atm' },
      quiz: [
        { question: 'A gas has pressure 4atm at 10L. What is the pressure when compressed to 5L?', answer: '8atm', options: ['2atm', '8atm', '20atm', '40atm'] },
        { question: 'Which law states that pressure and volume are inversely proportional at constant temperature?', answer: "Boyle's Law", options: ["Charles' Law", "Boyle's Law", "Gay-Lussac's Law", "Avogadro's Law"] },
      ],
    },
  },

  // ── Physics Arena ─────────────────────────────────────────────────────────────
  'motion-types': {
    id: 'motion-types', worldId: 'physics_arena', mechanic: 'sort',
    title: 'Types of Motion', icon: '🏃',
    tagline: 'Classify each example by its type of motion.',
    concept: 'Mechanics', difficulty: 'easy', examTags: ['WAEC', 'JAMB'],
    contentSource: 'static',
    config: {
      buckets: [
        { id: 'linear',      label: 'Linear' },
        { id: 'circular',    label: 'Circular' },
        { id: 'oscillatory', label: 'Oscillatory' },
        { id: 'random',      label: 'Random' },
      ],
      items: [
        { id: 'bullet', text: 'A bullet fired from a gun',          correct: 'linear'      },
        { id: 'car',    text: 'A car moving on a straight road',    correct: 'linear'      },
        { id: 'earth',  text: 'Earth revolving around the sun',     correct: 'circular'    },
        { id: 'fan',    text: 'Blades of a rotating fan',           correct: 'circular'    },
        { id: 'pendul', text: 'A swinging pendulum',                correct: 'oscillatory' },
        { id: 'spring', text: 'A vibrating guitar string',          correct: 'oscillatory' },
        { id: 'smoke',  text: 'Smoke particles in air',             correct: 'random'      },
        { id: 'pollen', text: 'Pollen grains in water (Brownian)',  correct: 'random'      },
      ],
    },
  },
  'newton-laws': {
    id: 'newton-laws', worldId: 'physics_arena', mechanic: 'match',
    title: "Newton's Laws", icon: '🍎',
    tagline: 'Match each law to what it states.',
    concept: 'Mechanics', difficulty: 'easy', examTags: ['WAEC', 'JAMB'],
    contentSource: 'static',
    config: {
      pairs: [
        { term: "Newton's First Law",  match: 'An object stays at rest or in uniform motion unless acted on by an external force' },
        { term: "Newton's Second Law", match: 'Force equals mass times acceleration (F = ma)' },
        { term: "Newton's Third Law",  match: 'For every action there is an equal and opposite reaction' },
        { term: 'Inertia',             match: 'The tendency of an object to resist changes in its motion' },
        { term: 'Momentum',            match: 'The product of mass and velocity of a moving object' },
        { term: 'Impulse',             match: 'The product of force and the time it acts (change in momentum)' },
      ],
    },
  },
  'ohms-law': {
    id: 'ohms-law', worldId: 'physics_arena', mechanic: 'build',
    title: "Ohm's Law Explorer", icon: '⚡',
    tagline: 'Change voltage or resistance and see what happens to current.',
    concept: 'Current Electricity', difficulty: 'medium', examTags: ['WAEC', 'JAMB'],
    contentSource: 'static',
    config: {
      formula: 'V = IR',
      description: "Ohm's Law states that Voltage (V) = Current (I) × Resistance (R). Use the sliders to explore the relationship.",
      inputs: [
        { id: 'voltage',    label: 'Voltage (V)',    unit: 'V', min: 1, max: 24, step: 1, default: 12 },
        { id: 'resistance', label: 'Resistance (Ω)', unit: 'Ω', min: 1, max: 20, step: 1, default: 4  },
      ],
      output: { id: 'current', label: 'Current (I)', unit: 'A' },
      quiz: [
        { question: 'If voltage is 6V and resistance is 2Ω, what is the current?', answer: '3A', options: ['1A', '3A', '12A', '4A'] },
        { question: 'A 12V battery drives current through a 6Ω resistor. What is the current?', answer: '2A', options: ['2A', '72A', '0.5A', '6A'] },
        { question: 'Current is 4A and resistance is 3Ω. What is the voltage?', answer: '12V', options: ['1.3V', '12V', '7V', '0.75V'] },
      ],
    },
  },

  // ── Government House ──────────────────────────────────────────────────────────
  'gov-powers': {
    id: 'gov-powers', worldId: 'government_house', mechanic: 'sort',
    title: 'Federal vs State Powers', icon: '🏛️',
    tagline: 'Exclusive, concurrent, or residual — which list does it belong to?',
    concept: 'Nigerian Federalism', difficulty: 'medium', examTags: ['WAEC', 'JAMB'],
    contentSource: 'static',
    config: {
      buckets: [
        { id: 'exclusive',  label: 'Exclusive (Federal)' },
        { id: 'concurrent', label: 'Concurrent (Both)' },
        { id: 'residual',   label: 'Residual (State)' },
      ],
      items: [
        { id: 'def', text: 'Defence & Military',       correct: 'exclusive'  },
        { id: 'cur', text: 'Currency & Coinage',        correct: 'exclusive'  },
        { id: 'imm', text: 'Immigration',               correct: 'exclusive'  },
        { id: 'for', text: 'Foreign Affairs',           correct: 'exclusive'  },
        { id: 'edu', text: 'Education',                 correct: 'concurrent' },
        { id: 'hea', text: 'Health Services',           correct: 'concurrent' },
        { id: 'agr', text: 'Agriculture',                correct: 'concurrent' },
        { id: 'pri', text: 'Primary Schools',           correct: 'residual'   },
        { id: 'loc', text: 'Local Government Matters',  correct: 'residual'   },
      ],
    },
  },

  // ── Economics Exchange ────────────────────────────────────────────────────────
  'market-structures': {
    id: 'market-structures', worldId: 'economics_exchange', mechanic: 'match',
    title: 'Market Structures', icon: '📈',
    tagline: 'Match each market structure to its key characteristic.',
    concept: 'Market Structures', difficulty: 'medium', examTags: ['WAEC', 'JAMB'],
    contentSource: 'static',
    config: {
      pairs: [
        { term: 'Perfect Competition',       match: 'Many sellers, identical products, no single seller controls price' },
        { term: 'Monopoly',                  match: 'Single seller, no close substitutes, full price control' },
        { term: 'Oligopoly',                 match: 'Few large firms, interdependent pricing decisions' },
        { term: 'Monopolistic Competition',  match: 'Many sellers, differentiated products, some price control' },
        { term: 'Monopsony',                 match: 'Single buyer dominates a market (e.g. one employer in a town)' },
        { term: 'Duopoly',                   match: 'Market controlled by exactly two competing firms' },
      ],
    },
  },

  // ── Language Studio ───────────────────────────────────────────────────────────
  'literary-devices': {
    id: 'literary-devices', worldId: 'language_studio', mechanic: 'match',
    title: 'Literary Devices', icon: '📝',
    tagline: 'Match the device to its definition.',
    concept: 'Literature Devices', difficulty: 'medium', examTags: ['WAEC'],
    contentSource: 'static',
    config: {
      pairs: [
        { term: 'Simile',          match: "A comparison using 'like' or 'as'" },
        { term: 'Metaphor',        match: 'A direct comparison stating one thing IS another' },
        { term: 'Personification', match: 'Giving human qualities to non-human things' },
        { term: 'Alliteration',    match: 'Repetition of the same consonant sound at the start of nearby words' },
        { term: 'Hyperbole',       match: 'Deliberate exaggeration for emphasis or effect' },
        { term: 'Irony',           match: 'Saying the opposite of what is meant, often for humour or emphasis' },
      ],
    },
  },

}

// ── Helpers ──────────────────────────────────────────────────────────────────
// HARDENED VERSION: every helper that returns game data validates it first.
// A malformed registry entry now produces a specific console.error naming
// the exact world + game id responsible, and gets filtered out rather than
// crashing GameCard/WorldHeader three components downstream.

const REQUIRED_GAME_FIELDS = ['id', 'worldId', 'mechanic', 'title', 'icon', 'accent']

function isGameWellFormed(game, worldId) {
  const missing = REQUIRED_GAME_FIELDS.filter(field => game[field] === undefined || game[field] === null)
  if (missing.length > 0) {
    console.error(
      `[gameRegistry] World "${worldId}" references a game with missing field(s): ${missing.join(', ')}. ` +
      `Game id: "${game.id ?? 'UNKNOWN'}". This game will be skipped to prevent a crash — fix the entry in GAMES.`
    )
    return false
  }
  // accent must itself have all 8 colour keys, or downstream components
  // (GameCard, WorldHeader) will still crash on a partial accent object.
  const accentKeys = ['solid', 'bg', 'text', 'border', 'darkSolid', 'darkBg', 'darkText', 'darkBorder']
  const missingAccentKeys = accentKeys.filter(k => game.accent[k] === undefined)
  if (missingAccentKeys.length > 0) {
    console.error(
      `[gameRegistry] Game "${game.id}" has an incomplete accent object — missing: ${missingAccentKeys.join(', ')}. Skipped to prevent a crash.`
    )
    return false
  }
  return true
}

export function getWorld(worldId) {
  return WORLDS.find(w => w.id === worldId) ?? null
}

export function getGame(gameId) {
  const game = GAMES[gameId]
  if (!game) return null
  return isGameWellFormed(game, game.worldId) ? game : null
}

export function getGamesForWorld(worldId) {
  const world = getWorld(worldId)
  if (!world) return []
  return world.games
    .map(id => {
      const game = GAMES[id]
      if (!game) {
        console.error(`[gameRegistry] World "${worldId}" lists game id "${id}" which does not exist in GAMES. Check for a typo.`)
        return null
      }
      return game
    })
    .filter(Boolean)
    .filter(game => isGameWellFormed(game, worldId))
}

export function getAllWorlds() {
  return WORLDS
}

export function getPlayableGamesForWorld(worldId) {
  return getGamesForWorld(worldId).filter(g => !g.comingSoon)
}

/**
 * Dev-time helper — call this once to validate the ENTIRE registry in one
 * pass and log every problem found, rather than discovering them one
 * crash at a time. Returns true if everything is clean.
 *
 * Usage (e.g. in src/app/student/games/page.js, top of component body):
 *   if (process.env.NODE_ENV !== 'production') validateRegistry()
 */
export function validateRegistry() {
  let allValid = true
  for (const world of WORLDS) {
    for (const gameId of world.games) {
      const game = GAMES[gameId]
      if (!game) {
        console.error(`[validateRegistry] World "${world.id}" references missing game id "${gameId}"`)
        allValid = false
        continue
      }
      if (!isGameWellFormed(game, world.id)) {
        allValid = false
      }
    }
  }
  if (allValid) {
    console.log('[validateRegistry] All worlds and games are well-formed. ✓')
  }
  return allValid
}

export const MECHANIC_META = {
  sort:     { label: 'Sort It',  icon: '🗂️', engineId: 'sort'     },
  match:    { label: 'Match It', icon: '🔗', engineId: 'match'    },
  build:    { label: 'Build It', icon: '🔧', engineId: 'build'    },
  dungeon:  { label: 'Dungeon',  icon: '🗝️', engineId: 'dungeon'  },
  assemble: { label: 'Assemble', icon: '⚛️', engineId: 'assemble' },
}
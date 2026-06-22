// src/lib/gamesData.js
// ─────────────────────────────────────────────────────────────────────────────
// All game configurations. Adding a new game = adding a new object here.
// No code changes needed to the engines.
//
// Game types:
//   sort_it      — drag/tap items into the right bucket
//   connector    — match left-column terms to right-column definitions
//   build_it     — manipulate a variable and observe the result
//
// COLOUR NOTE: bucket objects no longer carry a `color` field. SortItEngine
// now assigns bucket colours via getPaletteColor(index) from gameTheme.js —
// this guarantees every bucket gets a proper light/dark hex pair from the
// same 6-colour ring used everywhere else in games, rather than an arbitrary
// one-off hex with no matching dark mode treatment. Colour is determined by
// a bucket's position in the `buckets` array (0 = blue, 1 = coral, 2 = teal,
// 3 = purple, 4 = pink, 5 = amber, then repeats). Reordering buckets will
// shift their colours — expected and fine.
// ─────────────────────────────────────────────────────────────────────────────

export const GAMES = [

  // ── SORT IT ─────────────────────────────────────────────────────────────────

  {
    id:         'cell-organelles',
    type:       'sort_it',
    title:      'Cell Organelles',
    subject:    'Biology',
    topic:      'Cell Biology',
    examTags:   ['WAEC', 'JAMB'],
    difficulty: 'easy',
    emoji:      '🔬',
    tagline:    'Plant cell or animal cell — which organelle belongs where?',
    buckets: [
      { id: 'plant',  label: 'Plant Cell Only' },
      { id: 'animal', label: 'Animal Cell Only' },
      { id: 'both',   label: 'Both' },
    ],
    items: [
      { id: 'cw',    text: 'Cell Wall',          correct: 'plant'  },
      { id: 'cp',    text: 'Chloroplast',        correct: 'plant'  },
      { id: 'vac',   text: 'Large Central Vacuole', correct: 'plant' },
      { id: 'nuc',   text: 'Nucleus',            correct: 'both'   },
      { id: 'mit',   text: 'Mitochondria',       correct: 'both'   },
      { id: 'rer',   text: 'Rough ER',           correct: 'both'   },
      { id: 'rib',   text: 'Ribosome',           correct: 'both'   },
      { id: 'cen',   text: 'Centriole',          correct: 'animal' },
      { id: 'lys',   text: 'Lysosome',           correct: 'animal' },
      { id: 'cm',    text: 'Cell Membrane',      correct: 'both'   },
    ],
  },

  {
    id:         'acids-bases',
    type:       'sort_it',
    title:      'Acids & Bases',
    subject:    'Chemistry',
    topic:      'Acids, Bases and Salts',
    examTags:   ['WAEC', 'JAMB'],
    difficulty: 'easy',
    emoji:      '⚗️',
    tagline:    'Sort these substances into acids, bases, or neutral.',
    buckets: [
      { id: 'acid',    label: 'Acid' },
      { id: 'base',    label: 'Base' },
      { id: 'neutral', label: 'Neutral' },
    ],
    items: [
      { id: 'hcl',  text: 'HCl (Hydrochloric acid)',   correct: 'acid'    },
      { id: 'h2so', text: 'H₂SO₄ (Sulphuric acid)',    correct: 'acid'    },
      { id: 'ch3',  text: 'CH₃COOH (Acetic acid)',     correct: 'acid'    },
      { id: 'naoh', text: 'NaOH (Sodium hydroxide)',   correct: 'base'    },
      { id: 'nh3',  text: 'NH₃ (Ammonia)',             correct: 'base'    },
      { id: 'caco', text: 'Ca(OH)₂ (Lime water)',      correct: 'base'    },
      { id: 'h2o',  text: 'H₂O (Pure water)',          correct: 'neutral' },
      { id: 'nacl', text: 'NaCl (Common salt)',        correct: 'neutral' },
    ],
  },

  {
    id:         'gov-powers',
    type:       'sort_it',
    title:      'Federal vs State Powers',
    subject:    'Government',
    topic:      'Nigerian Federalism',
    examTags:   ['WAEC', 'JAMB'],
    difficulty: 'medium',
    emoji:      '🏛️',
    tagline:    'Exclusive, concurrent, or residual — which list does it belong to?',
    buckets: [
      { id: 'exclusive',  label: 'Exclusive (Federal)' },
      { id: 'concurrent', label: 'Concurrent (Both)' },
      { id: 'residual',   label: 'Residual (State)' },
    ],
    items: [
      { id: 'def',  text: 'Defence & Military',      correct: 'exclusive'  },
      { id: 'cur',  text: 'Currency & Coinage',      correct: 'exclusive'  },
      { id: 'imm',  text: 'Immigration',             correct: 'exclusive'  },
      { id: 'for',  text: 'Foreign Affairs',         correct: 'exclusive'  },
      { id: 'edu',  text: 'Education',               correct: 'concurrent' },
      { id: 'hea',  text: 'Health Services',         correct: 'concurrent' },
      { id: 'agr',  text: 'Agriculture',             correct: 'concurrent' },
      { id: 'pri',  text: 'Primary Schools',         correct: 'residual'   },
      { id: 'loc',  text: 'Local Government Matters',correct: 'residual'   },
    ],
  },

  {
    id:         'motion-types',
    type:       'sort_it',
    title:      'Types of Motion',
    subject:    'Physics',
    topic:      'Mechanics',
    examTags:   ['WAEC', 'JAMB'],
    difficulty: 'easy',
    emoji:      '🏃',
    tagline:    'Classify each example by its type of motion.',
    buckets: [
      { id: 'linear',      label: 'Linear' },
      { id: 'circular',    label: 'Circular' },
      { id: 'oscillatory', label: 'Oscillatory' },
      { id: 'random',      label: 'Random' },
    ],
    items: [
      { id: 'bullet', text: 'A bullet fired from a gun',         correct: 'linear'      },
      { id: 'car',    text: 'A car moving on a straight road',   correct: 'linear'      },
      { id: 'earth',  text: 'Earth revolving around the sun',    correct: 'circular'    },
      { id: 'fan',    text: 'Blades of a rotating fan',         correct: 'circular'    },
      { id: 'pendul', text: 'A swinging pendulum',               correct: 'oscillatory' },
      { id: 'spring', text: 'A vibrating guitar string',         correct: 'oscillatory' },
      { id: 'smoke',  text: 'Smoke particles in air',           correct: 'random'      },
      { id: 'pollen', text: 'Pollen grains in water (Brownian)', correct: 'random'     },
    ],
  },

  // ── CONNECTOR ───────────────────────────────────────────────────────────────

  {
    id:         'newton-laws',
    type:       'connector',
    title:      "Newton's Laws",
    subject:    'Physics',
    topic:      'Mechanics',
    examTags:   ['WAEC', 'JAMB'],
    difficulty: 'easy',
    emoji:      '🍎',
    tagline:    'Match each law to what it states.',
    pairs: [
      { term: "Newton's First Law",  match: 'An object stays at rest or in uniform motion unless acted on by an external force' },
      { term: "Newton's Second Law", match: 'Force equals mass times acceleration (F = ma)' },
      { term: "Newton's Third Law",  match: 'For every action there is an equal and opposite reaction' },
      { term: 'Inertia',             match: 'The tendency of an object to resist changes in its motion' },
      { term: 'Momentum',            match: 'The product of mass and velocity of a moving object' },
      { term: 'Impulse',             match: 'The product of force and the time it acts (change in momentum)' },
    ],
  },

  {
    id:         'market-structures',
    type:       'connector',
    title:      'Market Structures',
    subject:    'Economics',
    topic:      'Market Structures',
    examTags:   ['WAEC', 'JAMB'],
    difficulty: 'medium',
    emoji:      '📈',
    tagline:    'Match each market structure to its key characteristic.',
    pairs: [
      { term: 'Perfect Competition', match: 'Many sellers, identical products, no single seller controls price' },
      { term: 'Monopoly',            match: 'Single seller, no close substitutes, full price control' },
      { term: 'Oligopoly',           match: 'Few large firms, interdependent pricing decisions' },
      { term: 'Monopolistic Competition', match: 'Many sellers, differentiated products, some price control' },
      { term: 'Monopsony',           match: 'Single buyer dominates a market (e.g. one employer in a town)' },
      { term: 'Duopoly',             match: 'Market controlled by exactly two competing firms' },
    ],
  },

  {
    id:         'organic-functional-groups',
    type:       'connector',
    title:      'Organic Functional Groups',
    subject:    'Chemistry',
    topic:      'Organic Chemistry',
    examTags:   ['WAEC', 'JAMB'],
    difficulty: 'medium',
    emoji:      '🧪',
    tagline:    'Match each functional group to its compound class.',
    pairs: [
      { term: '–OH',   match: 'Alcohols (e.g. ethanol)' },
      { term: '–COOH', match: 'Carboxylic acids (e.g. ethanoic acid)' },
      { term: '–CHO',  match: 'Aldehydes (e.g. ethanal)' },
      { term: '–CO–',  match: 'Ketones (e.g. propanone)' },
      { term: '–NH₂',  match: 'Amines (e.g. methylamine)' },
      { term: '–COOR', match: 'Esters (e.g. ethyl ethanoate)' },
    ],
  },

  {
    id:         'literary-devices',
    type:       'connector',
    title:      'Literary Devices',
    subject:    'English Language',
    topic:      'Literature Devices',
    examTags:   ['WAEC'],
    difficulty: 'medium',
    emoji:      '📝',
    tagline:    'Match the device to its definition.',
    pairs: [
      { term: 'Simile',        match: "A comparison using 'like' or 'as'" },
      { term: 'Metaphor',      match: 'A direct comparison stating one thing IS another' },
      { term: 'Personification', match: 'Giving human qualities to non-human things' },
      { term: 'Alliteration',  match: 'Repetition of the same consonant sound at the start of nearby words' },
      { term: 'Hyperbole',     match: 'Deliberate exaggeration for emphasis or effect' },
      { term: 'Irony',         match: 'Saying the opposite of what is meant, often for humour or emphasis' },
    ],
  },

  // ── BUILD IT ─────────────────────────────────────────────────────────────────

  {
    id:         'ohms-law',
    type:       'build_it',
    title:      "Ohm's Law Explorer",
    subject:    'Physics',
    topic:      'Current Electricity',
    examTags:   ['WAEC', 'JAMB'],
    difficulty: 'medium',
    emoji:      '⚡',
    tagline:    'Change voltage or resistance and see what happens to current.',
    formula:    'V = IR',
    description: "Ohm's Law states that Voltage (V) = Current (I) × Resistance (R). Use the sliders to explore the relationship.",
    solveFor:   'current', // I = V / R
    inputs: [
      { id: 'voltage',    label: 'Voltage (V)',    unit: 'V',  min: 1,  max: 24, step: 1,  default: 12 },
      { id: 'resistance', label: 'Resistance (Ω)', unit: 'Ω',  min: 1,  max: 20, step: 1,  default: 4  },
    ],
    output: {
      id:     'current',
      label:  'Current (I)',
      unit:   'A',
      compute: (inputs) => (inputs.voltage / inputs.resistance).toFixed(2),
    },
    insight: (inputs, output) => {
      const v = inputs.voltage, r = inputs.resistance
      if (v > 18) return `High voltage! At ${v}V across ${r}Ω, current reaches ${output}A — watch for overheating.`
      if (r > 15) return `High resistance slows the current right down to ${output}A — like a narrow pipe restricting water flow.`
      if (parseFloat(output) > 4) return `${output}A is a strong current. Remember: doubling voltage doubles current if resistance stays fixed.`
      return `At ${v}V and ${r}Ω, current is ${output}A. Try halving the resistance — what happens to current?`
    },
    quiz: [
      { question: 'If voltage is 6V and resistance is 2Ω, what is the current?', answer: '3A', options: ['1A', '3A', '12A', '4A'] },
      { question: 'A 12V battery drives current through a 6Ω resistor. What is the current?', answer: '2A', options: ['2A', '72A', '0.5A', '6A'] },
      { question: 'Current is 4A and resistance is 3Ω. What is the voltage?', answer: '12V', options: ['1.3V', '12V', '7V', '0.75V'] },
    ],
  },

  {
    id:         'ideal-gas',
    type:       'build_it',
    title:      'Ideal Gas Law',
    subject:    'Chemistry',
    topic:      'Gas Laws',
    examTags:   ['WAEC', 'JAMB'],
    difficulty: 'hard',
    emoji:      '💨',
    tagline:    "Explore Boyle's Law — what happens to pressure when volume changes?",
    formula:    'P₁V₁ = P₂V₂',
    description: "At constant temperature, pressure and volume are inversely proportional. Compress the gas — watch pressure rise.",
    solveFor:   'pressure2',
    inputs: [
      { id: 'pressure1', label: 'Initial Pressure (P₁)', unit: 'atm', min: 1, max: 10, step: 0.5, default: 2 },
      { id: 'volume1',   label: 'Initial Volume (V₁)',   unit: 'L',   min: 1, max: 20, step: 1,   default: 10 },
      { id: 'volume2',   label: 'New Volume (V₂)',       unit: 'L',   min: 1, max: 20, step: 1,   default: 5  },
    ],
    output: {
      id:      'pressure2',
      label:   'New Pressure (P₂)',
      unit:    'atm',
      compute: (inputs) => ((inputs.pressure1 * inputs.volume1) / inputs.volume2).toFixed(2),
    },
    insight: (inputs, output) => {
      const { pressure1, volume1, volume2 } = inputs
      if (volume2 < volume1) return `You compressed the gas from ${volume1}L to ${volume2}L — pressure jumped from ${pressure1}atm to ${output}atm. Inverse relationship confirmed.`
      if (volume2 > volume1) return `You expanded the gas to ${volume2}L — pressure dropped to ${output}atm. More space, less pressure.`
      return `Same volume = same pressure. Change V₂ to see Boyle's Law in action.`
    },
    quiz: [
      { question: 'A gas has pressure 4atm at 10L. What is the pressure when compressed to 5L?', answer: '8atm', options: ['2atm', '8atm', '20atm', '40atm'] },
      { question: 'Which law states that pressure and volume are inversely proportional at constant temperature?', answer: "Boyle's Law", options: ["Charles' Law", "Boyle's Law", "Gay-Lussac's Law", "Avogadro's Law"] },
    ],
  },

]

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getGameById(id) {
  return GAMES.find(g => g.id === id) ?? null
}

export function getGamesBySubject(subject) {
  return GAMES.filter(g => g.subject === subject)
}

export function getGamesByTopic(topicName) {
  return GAMES.filter(g => g.topic === topicName)
}

export function getGamesByType(type) {
  return GAMES.filter(g => g.type === type)
}

export const GAME_TYPE_META = {
  sort_it:   { label: 'Sort It',    emoji: '🗂️', desc: 'Classify items into the right categories' },
  connector: { label: 'Match It',   emoji: '🔗', desc: 'Match terms to their definitions or pairs' },
  build_it:  { label: 'Build It',   emoji: '🔧', desc: 'Manipulate values and explore relationships' },
}
// src/lib/games/missions/atomBuilder.js
// ─────────────────────────────────────────────────────────────────────────────
// REDESIGNED Atom Builder — "identify-first" instead of "build-to-label".
//
// THE OLD DESIGN (now replaced): mission label told the student the element
// up front ("Build Magnesium"), then they assembled particles toward a
// target they already knew. This let students succeed by matching a known
// target without ever connecting WHY that count of protons makes it
// magnesium specifically.
//
// THE NEW DESIGN: the mission gives ONLY a particle count (a scenario, not
// a name). The student builds the atom from that count, then the game asks
// "Which element have you created?" — multiple choice, with distractors
// drawn from NEARBY atomic numbers so guessing-by-elimination doesn't trivially
// work. The element name is the OUTPUT of the exercise, never the input.
// This is the entire pedagogical point: atomic number defines identity,
// not the other way around.
//
// TIERS (controls whether neutrons appear and what follow-up question fires):
//   'identity'  → protons + electrons ONLY. No neutrons in this mission at
//                 all. Follow-up: "which element have you created?"
//   'isotope'   → adds neutrons. Follow-up is a TWO-PART question:
//                 (1) which element, (2) is this the standard isotope or
//                 a different one (and if different, what's the mass number).
//                 This is where mass-number reasoning gets introduced, once
//                 the core proton-count-defines-identity insight is secure.
//
// distractors: array of {symbol, number} — wrong answer choices for the
// "which element" question. Always include at least 3, chosen from
// ATOM_BUILDER_TABLE entries adjacent in atomic number, so the question
// can't be solved by "it's obviously not X" elimination on appearance alone.
// ─────────────────────────────────────────────────────────────────────────────

export const ATOM_BUILDER_TABLE = [
  { symbol: 'H',  number: 1,  name: 'Hydrogen' },
  { symbol: 'He', number: 2,  name: 'Helium' },
  { symbol: 'Li', number: 3,  name: 'Lithium' },
  { symbol: 'Be', number: 4,  name: 'Beryllium' },
  { symbol: 'B',  number: 5,  name: 'Boron' },
  { symbol: 'C',  number: 6,  name: 'Carbon' },
  { symbol: 'N',  number: 7,  name: 'Nitrogen' },
  { symbol: 'O',  number: 8,  name: 'Oxygen' },
  { symbol: 'F',  number: 9,  name: 'Fluorine' },
  { symbol: 'Ne', number: 10, name: 'Neon' },
  { symbol: 'Na', number: 11, name: 'Sodium' },
  { symbol: 'Mg', number: 12, name: 'Magnesium' },
  { symbol: 'Al', number: 13, name: 'Aluminium' },
  { symbol: 'Si', number: 14, name: 'Silicon' },
  { symbol: 'P',  number: 15, name: 'Phosphorus' },
  { symbol: 'S',  number: 16, name: 'Sulfur' },
  { symbol: 'Cl', number: 17, name: 'Chlorine' },
  { symbol: 'Ar', number: 18, name: 'Argon' },
]

function elementByNumber(n) {
  return ATOM_BUILDER_TABLE.find(e => e.number === n)
}

function nearbyDistractors(targetNumber, count = 3) {
  // Pulls elements with the closest atomic numbers to the target (excluding
  // the target itself) — these are the hardest, most meaningful distractors,
  // since "off by one or two protons" is the actual misconception this game
  // is designed to catch.
  return ATOM_BUILDER_TABLE
    .filter(e => e.number !== targetNumber)
    .sort((a, b) => Math.abs(a.number - targetNumber) - Math.abs(b.number - targetNumber))
    .slice(0, count)
}

export const ATOM_BUILDER_MISSIONS = [
  // ── Tier: identity (protons + electrons only, no neutrons) ─────────────────
  {
    id: 'identity_1', tier: 'identity',
    scenario: 'An atom has 1 proton and 1 electron.',
    target: { protons: 1, electrons: 1 },
    correctNumber: 1,
    explanation: 'Atomic number = number of protons. 1 proton means this is element number 1 on the periodic table — hydrogen, regardless of what you might have guessed first.',
  },
  {
    id: 'identity_2', tier: 'identity',
    scenario: 'An atom has 6 protons and 6 electrons.',
    target: { protons: 6, electrons: 6 },
    correctNumber: 6,
    explanation: 'Six protons makes this atomic number 6 — carbon. It doesn\u2019t matter that you built it from particles rather than being told the name upfront: the proton count is the ONLY thing that determines which element this is.',
  },
  {
    id: 'identity_3', tier: 'identity',
    scenario: 'An atom has 8 protons and 8 electrons.',
    target: { protons: 8, electrons: 8 },
    correctNumber: 8,
    explanation: 'Eight protons = atomic number 8 = oxygen. Notice the electrons matched the protons exactly — that\u2019s what makes this a neutral atom rather than an ion.',
  },
  {
    id: 'identity_4', tier: 'identity',
    scenario: 'An atom has 11 protons and 11 electrons.',
    target: { protons: 11, electrons: 11 },
    correctNumber: 11,
    explanation: 'Eleven protons = atomic number 11 = sodium. If this had only 10 electrons instead of 11, it would still be sodium — just as a +1 ion, since the proton count alone defines the element.',
  },
  {
    id: 'identity_5', tier: 'identity',
    scenario: 'An atom has 12 protons and 12 electrons.',
    target: { protons: 12, electrons: 12 },
    correctNumber: 12,
    explanation: 'Twelve protons = atomic number 12 = magnesium. Same logic every time: count the protons, that number IS the element\u2019s identity on the periodic table.',
  },
  {
    id: 'identity_6', tier: 'identity',
    scenario: 'An atom has 17 protons and 17 electrons.',
    target: { protons: 17, electrons: 17 },
    correctNumber: 17,
    explanation: 'Seventeen protons = atomic number 17 = chlorine. By now the pattern should feel automatic: build the protons, count them, that\u2019s your answer — no memorized name required up front.',
  },
  {
    id: 'identity_7', tier: 'identity',
    scenario: 'An atom has 10 protons and 10 electrons.',
    target: { protons: 10, electrons: 10 },
    correctNumber: 10,
    explanation: 'Ten protons = atomic number 10 = neon. Neon\u2019s electrons exactly fill its outer shell, which is why it\u2019s a noble gas — but for THIS question, all that matters is: 10 protons, atomic number 10.',
  },
  {
    id: 'identity_8', tier: 'identity',
    scenario: 'An atom has 7 protons and 7 electrons.',
    target: { protons: 7, electrons: 7 },
    correctNumber: 7,
    explanation: 'Seven protons = atomic number 7 = nitrogen, the most abundant gas in the air we breathe.',
  },

  // ── Tier: identity, with an ion twist (protons \u2260 electrons) ────────────────
  // Still no neutrons — this tier tests "does the student understand that
  // IDENTITY comes from protons specifically, even when electron count
  // differs from proton count (i.e. it's an ion, not a neutral atom)."
  {
    id: 'ion_1', tier: 'identity',
    scenario: 'An atom has 11 protons but only 10 electrons.',
    target: { protons: 11, electrons: 10 },
    correctNumber: 11,
    explanation: 'This is still sodium! It has 11 protons, so it\u2019s atomic number 11 — sodium — no matter the electron count. Having one fewer electron than proton just means it\u2019s a sodium ion (Na\u207a), not a different element entirely. Protons decide identity; electrons can change without changing what element it is.',
  },
  {
    id: 'ion_2', tier: 'identity',
    scenario: 'An atom has 17 protons but 18 electrons.',
    target: { protons: 17, electrons: 18 },
    correctNumber: 17,
    explanation: 'Still chlorine — 17 protons means atomic number 17 no matter what. The extra electron makes this a chloride ion (Cl\u207b), but the identity of the element never changed.',
  },

  // ── Tier: isotope (adds neutrons, two-part follow-up) ───────────────────────
  {
    id: 'isotope_1', tier: 'isotope',
    scenario: 'An atom has 6 protons, 6 electrons, and 6 neutrons.',
    target: { protons: 6, electrons: 6, neutrons: 6 },
    correctNumber: 6,
    massNumber: 12,
    isStandardIsotope: true,
    explanation: 'Six protons = carbon. Mass number = protons + neutrons = 6 + 6 = 12, which is carbon-12 — the most common, standard form of carbon.',
  },
  {
    id: 'isotope_2', tier: 'isotope',
    scenario: 'An atom has 6 protons, 6 electrons, and 8 neutrons.',
    target: { protons: 6, electrons: 6, neutrons: 8 },
    correctNumber: 6,
    massNumber: 14,
    isStandardIsotope: false,
    explanation: 'Still carbon — 6 protons never changes that. But mass number = 6 + 8 = 14, not the usual 12. This is carbon-14, a different ISOTOPE of carbon, famously used for radiocarbon dating because it\u2019s unstable and decays at a known rate.',
  },
  {
    id: 'isotope_3', tier: 'isotope',
    scenario: 'An atom has 11 protons, 11 electrons, and 12 neutrons.',
    target: { protons: 11, electrons: 11, neutrons: 12 },
    correctNumber: 11,
    massNumber: 23,
    isStandardIsotope: true,
    explanation: 'Eleven protons = sodium. Mass number = 11 + 12 = 23 — sodium-23, the standard, naturally most abundant form of sodium.',
  },
  {
    id: 'isotope_4', tier: 'isotope',
    scenario: 'An atom has 17 protons, 17 electrons, and 20 neutrons.',
    target: { protons: 17, electrons: 17, neutrons: 20 },
    correctNumber: 17,
    massNumber: 37,
    isStandardIsotope: false,
    explanation: 'Seventeen protons = chlorine. Mass number = 17 + 20 = 37 — this is chlorine-37, a real, naturally-occurring (though less common) isotope of chlorine. Chlorine-35 (18 neutrons) is the more abundant form.',
  },
  {
    id: 'isotope_5', tier: 'isotope',
    scenario: 'An atom has 8 protons, 8 electrons, and 10 neutrons.',
    target: { protons: 8, electrons: 8, neutrons: 10 },
    correctNumber: 8,
    massNumber: 18,
    isStandardIsotope: false,
    explanation: 'Eight protons = oxygen. Mass number = 8 + 10 = 18 — oxygen-18, a stable but less common isotope of oxygen, used in some medical and climate-science tracing applications.',
  },
]

export function buildAtomBuilderQueue(perTier = 5) {
  const identityMissions = shuffle(ATOM_BUILDER_MISSIONS.filter(m => m.tier === 'identity'))
  const isotopeMissions = shuffle(ATOM_BUILDER_MISSIONS.filter(m => m.tier === 'isotope'))
  return [
    ...identityMissions.slice(0, perTier),
    ...isotopeMissions.slice(0, perTier),
  ]
}

export function getDistractorsFor(mission) {
  const distractors = nearbyDistractors(mission.correctNumber, 3)
  const correct = elementByNumber(mission.correctNumber)
  return shuffle([correct, ...distractors])
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function validateAtomBuilderMissions() {
  let allValid = true
  for (const m of ATOM_BUILDER_MISSIONS) {
    const el = elementByNumber(m.correctNumber)
    if (!el) {
      console.error(`[atomBuilder] Mission "${m.id}" has correctNumber ${m.correctNumber}, which has no matching element in ATOM_BUILDER_TABLE.`)
      allValid = false
    }
    if (m.target.protons !== m.correctNumber) {
      console.error(`[atomBuilder] Mission "${m.id}" has a mismatch: target.protons (${m.target.protons}) !== correctNumber (${m.correctNumber}).`)
      allValid = false
    }
    if (m.tier === 'isotope') {
      if (typeof m.target.neutrons !== 'number') {
        console.error(`[atomBuilder] Mission "${m.id}" is tier 'isotope' but has no neutrons in target.`)
        allValid = false
      }
      const expectedMass = m.target.protons + m.target.neutrons
      if (m.massNumber !== expectedMass) {
        console.error(`[atomBuilder] Mission "${m.id}" has massNumber ${m.massNumber}, but protons+neutrons = ${expectedMass}.`)
        allValid = false
      }
    }
    const distractors = getDistractorsFor(m)
    if (distractors.length < 4) {
      console.error(`[atomBuilder] Mission "${m.id}" has fewer than 4 answer choices after adding distractors.`)
      allValid = false
    }
    if (!m.explanation) {
      console.error(`[atomBuilder] Mission "${m.id}" has no explanation.`)
      allValid = false
    }
  }
  if (allValid) console.log('[atomBuilder] All missions valid, internally consistent, and explained. ✓')
  return allValid
}
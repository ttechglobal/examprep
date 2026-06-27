// src/lib/games/missions/elementHunter.js
// ─────────────────────────────────────────────────────────────────────────────
// Mission bank for Element Hunter (periodic table scavenger-hunt arcade game).
//
// v2 — PROGRESSION + REVIEW UPGRADE:
//   - Missions are no longer drawn in random order. ELEMENT_HUNTER_PROGRESSION
//     defines a fixed easy -> hard sequence; the engine steps through tiers
//     in order, shuffling WITHIN each tier so repeat sessions don't feel
//     identical, but never pulling a 'reasoning' mission before the student
//     has cleared the 'recall' tier. This is what makes difficulty ramp
//     visible as real progress, not random luck of the draw.
//   - tier 'recall' missions now carry noTimer: true — see
//     ELEMENT_HUNTER_TIMERS below for how the engine should interpret this.
//   - Every mission now has an `explanation` field — shown on the
//     post-round review screen regardless of whether the student got it
//     right or wrong, so right answers reinforce WHY they were right, not
//     just that they were.
// ─────────────────────────────────────────────────────────────────────────────

export const ELEMENT_HUNTER_TIMERS = {
  // recall has no numeric timer — noTimer:true on a mission means the
  // engine should not start a countdown at all for that mission, full stop.
  // This field is kept for tiers that DO use a timer, for backward
  // compatibility with any code reading timers[tier] directly.
  recall:    null,
  pattern:   9,      // was 8 — given more breathing room per "feels too fast"
  reasoning: 13,     // was 11 — same adjustment, larger for the harder tier
}

// Defines the ORDER tiers are played in within one round. The engine should
// exhaust (or draw N from) 'recall' before moving to 'pattern', then
// 'reasoning' — this is the actual "easy to hard" progression the student
// experiences and sees reflected in the round's difficulty curve.
export const ELEMENT_HUNTER_PROGRESSION = ['recall', 'pattern', 'reasoning']

export const ELEMENT_HUNTER_MISSIONS = [
  // ── Atomic number (recall — NO TIMER) ───────────────────────────────────────
  { id: 'an_11', tier: 'recall', noTimer: true, text: 'find atomic number 11', check: el => el.number === 11,
    explanation: 'Atomic number = number of protons. Sodium (Na) has 11 protons, so its atomic number is 11. The atomic number is usually printed in the corner of each tile, which is why this is a fast lookup once you know where to look.' },
  { id: 'an_6', tier: 'recall', noTimer: true, text: 'find atomic number 6', check: el => el.number === 6,
    explanation: 'Carbon (C) has 6 protons, giving it atomic number 6. Carbon is the basis of all organic chemistry — every living thing is built around carbon\u2019s ability to form 4 bonds.' },
  { id: 'an_17', tier: 'recall', noTimer: true, text: 'find atomic number 17', check: el => el.number === 17,
    explanation: 'Chlorine (Cl) has 17 protons. It sits in group 17 (the halogens) — for main-group elements, the group number and valence electron count are closely linked, which becomes useful once you reach the reasoning missions.' },
  { id: 'an_8', tier: 'recall', noTimer: true, text: 'find atomic number 8', check: el => el.number === 8,
    explanation: 'Oxygen (O) has 8 protons. It\u2019s the most abundant element in the Earth\u2019s crust by mass and essential for respiration — but here, just remember 8 protons = atomic number 8.' },
  { id: 'an_1', tier: 'recall', noTimer: true, text: 'find atomic number 1', check: el => el.number === 1,
    explanation: 'Hydrogen (H) has just 1 proton, making it the simplest and lightest element — atomic number 1, and the first entry on the entire periodic table.' },
  { id: 'an_12', tier: 'recall', noTimer: true, text: 'find atomic number 12', check: el => el.number === 12,
    explanation: 'Magnesium (Mg) has 12 protons. It sits directly below beryllium in group 2 — both are alkaline earth metals that typically lose 2 electrons when reacting.' },
  { id: 'an_15', tier: 'recall', noTimer: true, text: 'find atomic number 15', check: el => el.number === 15,
    explanation: 'Phosphorus (P) has 15 protons. It\u2019s essential to DNA, ATP (the body\u2019s energy currency), and is one of the key nutrients in fertilizer.' },
  { id: 'an_18', tier: 'recall', noTimer: true, text: 'find atomic number 18', check: el => el.number === 18,
    explanation: 'Argon (Ar) has 18 protons. It\u2019s a noble gas — its outer shell is completely full, which is exactly why it almost never reacts with anything.' },

  // ── Symbol → element (recall — NO TIMER) ────────────────────────────────────
  { id: 'sym_na', tier: 'recall', noTimer: true, text: 'find the element with symbol Na', check: el => el.symbol === 'Na',
    explanation: 'Na is sodium — the symbol comes from its Latin name "natrium", not from its English name. This is common for several elements with long chemistry histories.' },
  { id: 'sym_cl', tier: 'recall', noTimer: true, text: 'find the element with symbol Cl', check: el => el.symbol === 'Cl',
    explanation: 'Cl is chlorine, taken directly from the first two letters of its English name — most symbols follow this simpler pattern.' },
  { id: 'sym_mg', tier: 'recall', noTimer: true, text: 'find the element with symbol Mg', check: el => el.symbol === 'Mg',
    explanation: 'Mg is magnesium. Notice the pattern: when the first letter alone would be ambiguous between two elements, chemistry uses the first two letters instead.' },
  { id: 'sym_si', tier: 'recall', noTimer: true, text: 'find the element with symbol Si', check: el => el.symbol === 'Si',
    explanation: 'Si is silicon — the second most abundant element in the Earth\u2019s crust, and the basis of computer chips and most of the sand on Earth.' },

  // ── Family / group recognition (pattern — TIMED) ────────────────────────────
  { id: 'fam_noble', tier: 'pattern', text: 'find a noble gas', check: el => el.family === 'noble',
    explanation: 'Noble gases (helium, neon, argon...) have a completely full outer electron shell. A full shell is the most stable arrangement possible, so these elements have essentially no drive to react with anything else.' },
  { id: 'fam_alkali', tier: 'pattern', text: 'find an alkali metal', check: el => el.family === 'alkali',
    explanation: 'Alkali metals (lithium, sodium...) sit in group 1. Each has exactly 1 electron in its outer shell, which it loses very easily — that\u2019s why alkali metals react violently, even with water.' },
  { id: 'fam_alkaline', tier: 'pattern', text: 'find an alkaline earth metal', check: el => el.family === 'alkaline',
    explanation: 'Alkaline earth metals (beryllium, magnesium...) sit in group 2, with 2 outer electrons. They\u2019re reactive, but less violently so than group 1, since losing 2 electrons takes slightly more energy than losing 1.' },
  { id: 'fam_halogen', tier: 'pattern', text: 'find a halogen', check: el => el.family === 'halogen',
    explanation: 'Halogens (fluorine, chlorine...) sit in group 17, one electron short of a full shell. They\u2019re highly reactive nonmetals that grab an extra electron from other atoms whenever they can.' },
  { id: 'fam_metalloid', tier: 'pattern', text: 'find a metalloid', check: el => el.family === 'metalloid',
    explanation: 'Metalloids (boron, silicon...) sit on the staircase boundary between metals and nonmetals on the table, and share properties of both — which is exactly why silicon works as a semiconductor in electronics.' },
  { id: 'fam_nonmetal', tier: 'pattern', text: 'find a nonmetal', check: el => el.family === 'nonmetal',
    explanation: 'Nonmetals (like carbon, nitrogen, oxygen) tend to gain or share electrons rather than lose them, and generally sit on the right side of the periodic table.' },
  { id: 'fam_metal', tier: 'pattern', text: 'find a metal', check: el => ['alkali', 'alkaline', 'metal'].includes(el.family),
    explanation: 'Metals occupy the left and center of the periodic table. They tend to lose electrons easily, conduct electricity, and are malleable — properties that all trace back to how loosely their outer electrons are held.' },

  // ── Period recognition (pattern — TIMED) ────────────────────────────────────
  { id: 'per_1', tier: 'pattern', text: 'find an element in period 1', check: el => el.period === 1,
    explanation: 'Period 1 contains only hydrogen and helium — they only have one electron shell, the smallest possible, so they\u2019re the only two elements in the table\u2019s shortest row.' },
  { id: 'per_2', tier: 'pattern', text: 'find an element in period 2', check: el => el.period === 2,
    explanation: 'Period 2 elements (lithium through neon) each have 2 electron shells. The period number always tells you how many shells an atom has.' },
  { id: 'per_3', tier: 'pattern', text: 'find an element in period 3', check: el => el.period === 3,
    explanation: 'Period 3 elements (sodium through argon) each have 3 electron shells — one more than period 2, which is why period 3 atoms are generally larger.' },

  // ── Valence electrons (reasoning — TIMED, tightest) ─────────────────────────
  { id: 'val_1', tier: 'reasoning', text: 'find an element with 1 valence electron', check: el => el.valence === 1,
    explanation: 'Valence electrons are the electrons in the outermost shell — the ones involved in bonding. Group 1 elements all have exactly 1, which is why they all behave similarly (losing that 1 electron easily).' },
  { id: 'val_2', tier: 'reasoning', text: 'find an element with 2 valence electrons', check: el => el.valence === 2,
    explanation: 'Group 2 elements all have 2 valence electrons. Once you know an element\u2019s group number (for groups 1-2 and 13-18), you know its valence electron count directly.' },
  { id: 'val_4', tier: 'reasoning', text: 'find an element with 4 valence electrons', check: el => el.valence === 4,
    explanation: 'Group 14 elements (like carbon and silicon) have 4 valence electrons — exactly half of a full shell. This is part of why carbon can form 4 stable bonds, the foundation of organic chemistry.' },
  { id: 'val_7', tier: 'reasoning', text: 'find an element with 7 valence electrons', check: el => el.valence === 7,
    explanation: 'Group 17 (the halogens) have 7 valence electrons — one short of the stable 8. That single missing electron is exactly why halogens react so eagerly: they\u2019re always looking to complete the set.' },
  { id: 'val_8', tier: 'reasoning', text: 'find an element with a full outer shell', check: el => el.valence === 8,
    explanation: 'A full outer shell (8 valence electrons, except for helium\u2019s 2) is the most stable electron arrangement possible. This is the entire reason noble gases are so unreactive — there\u2019s no energetic benefit to gaining, losing, or sharing electrons.' },

  // ── Reactivity / bonding reasoning ───────────────────────────────────────────
  { id: 'react_loses1', tier: 'reasoning', text: 'find an element that loses 1 electron to become stable', check: el => el.family === 'alkali',
    explanation: 'Alkali metals have 1 valence electron. Losing that single electron leaves them with a full shell underneath — much more stable — which is why they form +1 ions so readily.' },
  { id: 'react_gains1', tier: 'reasoning', text: 'find an element that gains 1 electron to become stable', check: el => el.family === 'halogen',
    explanation: 'Halogens have 7 valence electrons. Gaining just 1 more completes their outer shell, which is why they form \u20131 ions and react so readily with alkali metals (who are equally eager to give that electron away).' },
  { id: 'react_inert', tier: 'reasoning', text: 'find an element that almost never reacts', check: el => el.family === 'noble',
    explanation: 'Noble gases already have a full outer shell, so there\u2019s no stability to gain by reacting. This is why they were historically called the "inert gases" before rare exceptions were discovered under extreme lab conditions.' },
  { id: 'react_ionMinus2', tier: 'reasoning', text: 'find an element that typically forms a -2 ion', check: el => el.valence === 6 && el.family === 'nonmetal',
    explanation: 'Group 16 nonmetals (like oxygen and sulfur) have 6 valence electrons. Gaining 2 more completes their shell, which is why they commonly form \u20132 ions (like the O\u00b2\u207b in water).' },
  { id: 'react_ionPlus2', tier: 'reasoning', text: 'find an element that typically forms a +2 ion', check: el => el.family === 'alkaline',
    explanation: 'Alkaline earth metals have 2 valence electrons. Losing both gives them a full shell underneath, which is why magnesium and calcium commonly form +2 ions in compounds like MgCl\u2082 and CaCO\u2083.' },

  // ── Trend-based reasoning (uses table position, not a single property) ─────
  { id: 'trend_smallestRadiusP2', tier: 'reasoning', text: 'in period 2, find the element with the smallest atomic radius', check: el => el.symbol === 'F',
    explanation: 'Moving left to right across a period, the number of protons increases while electrons are added to the SAME shell — more nuclear charge pulls the same shell in tighter. Fluorine, second-to-last in period 2, has the strongest pull and smallest radius (neon is technically smaller still, but its full shell makes it behave differently in most comparisons).' },
  { id: 'trend_mostReactiveMetalP3', tier: 'reasoning', text: 'in period 3, find the most reactive metal', check: el => el.symbol === 'Na',
    explanation: 'Sodium is the first metal in period 3 and an alkali metal — alkali metals are the most reactive metals on the entire table because their single valence electron is held loosely and given up easily.' },
  { id: 'trend_mostReactiveNonmetalP3', tier: 'reasoning', text: 'in period 3, find the most reactive nonmetal', check: el => el.symbol === 'Cl',
    explanation: 'Chlorine is a halogen, the most reactive nonmetal family, because it\u2019s only 1 electron away from a full shell and pulls strongly to complete it.' },
]

// ── Period 1-3 element table (atomic numbers 1-18) ────────────────────────────
export const ELEMENT_HUNTER_TABLE = [
  { symbol: 'H',  number: 1,  family: 'nonmetal',  valence: 1, period: 1 },
  { symbol: 'He', number: 2,  family: 'noble',     valence: 2, period: 1 },
  { symbol: 'Li', number: 3,  family: 'alkali',    valence: 1, period: 2 },
  { symbol: 'Be', number: 4,  family: 'alkaline',  valence: 2, period: 2 },
  { symbol: 'B',  number: 5,  family: 'metalloid', valence: 3, period: 2 },
  { symbol: 'C',  number: 6,  family: 'nonmetal',  valence: 4, period: 2 },
  { symbol: 'N',  number: 7,  family: 'nonmetal',  valence: 5, period: 2 },
  { symbol: 'O',  number: 8,  family: 'nonmetal',  valence: 6, period: 2 },
  { symbol: 'F',  number: 9,  family: 'halogen',   valence: 7, period: 2 },
  { symbol: 'Ne', number: 10, family: 'noble',     valence: 8, period: 2 },
  { symbol: 'Na', number: 11, family: 'alkali',    valence: 1, period: 3 },
  { symbol: 'Mg', number: 12, family: 'alkaline',  valence: 2, period: 3 },
  { symbol: 'Al', number: 13, family: 'metal',     valence: 3, period: 3 },
  { symbol: 'Si', number: 14, family: 'metalloid', valence: 4, period: 3 },
  { symbol: 'P',  number: 15, family: 'nonmetal',  valence: 5, period: 3 },
  { symbol: 'S',  number: 16, family: 'nonmetal',  valence: 6, period: 3 },
  { symbol: 'Cl', number: 17, family: 'halogen',   valence: 7, period: 3 },
  { symbol: 'Ar', number: 18, family: 'noble',     valence: 8, period: 3 },
]

export function getValidTargets(mission) {
  return ELEMENT_HUNTER_TABLE.filter(mission.check)
}

/**
 * Builds one round's mission queue following the easy->hard progression.
 * Pulls `perTier` missions from each tier in ELEMENT_HUNTER_PROGRESSION
 * order, shuffled WITHIN each tier. If a tier has fewer missions than
 * `perTier`, all of that tier's missions are used (no padding/repeats).
 */
export function buildProgressionQueue(perTier = 4) {
  const queue = []
  for (const tier of ELEMENT_HUNTER_PROGRESSION) {
    const tierMissions = shuffle(ELEMENT_HUNTER_MISSIONS.filter(m => m.tier === tier))
    queue.push(...tierMissions.slice(0, perTier))
  }
  return queue
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function validateMissions() {
  let allValid = true
  for (const m of ELEMENT_HUNTER_MISSIONS) {
    const matches = getValidTargets(m)
    if (matches.length === 0) {
      console.error(`[elementHunter] Mission "${m.id}" ("${m.text}") has NO valid targets — unwinnable if drawn.`)
      allValid = false
    }
    if (!m.explanation) {
      console.error(`[elementHunter] Mission "${m.id}" has no explanation — review screen will show a gap.`)
      allValid = false
    }
    if (!ELEMENT_HUNTER_PROGRESSION.includes(m.tier)) {
      console.error(`[elementHunter] Mission "${m.id}" has tier "${m.tier}", which isn't in ELEMENT_HUNTER_PROGRESSION.`)
      allValid = false
    }
  }
  if (allValid) console.log('[elementHunter] All missions valid, explained, and correctly tiered. ✓')
  return allValid
}
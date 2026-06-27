// src/lib/games/missions/chemistryDetective.js
// ─────────────────────────────────────────────────────────────────────────────
// Case bank for Chemistry Detective. Each case is a sequence of clues that,
// applied in order, narrow ELEMENT_TABLE down to exactly one suspect by the
// final clue — verified programmatically by validateCases() below, not
// hand-judged. Clue count varies per case (2-4) by design: a distinctive
// element (e.g. neon, the only noble gas under atomic number 11) needs
// fewer clues to isolate than an easily-confused one (e.g. sulfur vs.
// phosphorus, both nonmetals in period 3).
//
// SCORING CONTRACT (decided with product owner):
//   - A correct accusation scores based on how many clues were revealed
//     when the accusation was made — fewer clues used = higher score.
//   - A WRONG accusation does NOT end the case. It costs points (a
//     deduction, not a hard reset) and the player can accuse again with
//     the same clues already revealed, or request another clue first.
//     This keeps the "no fail state" principle consistent with
//     AssembleRunner/ElementHunter — a wrong guess is a setback, not a
//     game-ending event.
//
// Each clue's `check(element)` function operates on ELEMENT_TABLE entries
// (same shape used by elementHunter.js, kept consistent on purpose so any
// future shared "element facts" module is a clean extraction).
// ─────────────────────────────────────────────────────────────────────────────

export const ELEMENT_TABLE = [
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

const NAMES = {
  H: 'Hydrogen', He: 'Helium', Li: 'Lithium', Be: 'Beryllium', B: 'Boron', C: 'Carbon',
  N: 'Nitrogen', O: 'Oxygen', F: 'Fluorine', Ne: 'Neon', Na: 'Sodium', Mg: 'Magnesium',
  Al: 'Aluminium', Si: 'Silicon', P: 'Phosphorus', S: 'Sulfur', Cl: 'Chlorine', Ar: 'Argon',
}

// Reusable clue-builders — each returns a {text, check} clue object.
// Keeping these as functions (not hand-written duplicates per case) means
// every case draws from the same verified clue vocabulary.
const CLUE_BUILDERS = {
  atomicNumberBelow: (n) => ({ text: `atomic number is less than ${n}.`, check: el => el.number < n }),
  atomicNumberAbove: (n) => ({ text: `atomic number is greater than ${n}.`, check: el => el.number > n }),
  family: (fam, label) => ({ text: `it is classified as ${label}.`, check: el => el.family === fam }),
  metal: () => ({ text: 'it is a metal.', check: el => ['alkali', 'alkaline', 'metal'].includes(el.family) }),
  valence: (v) => ({ text: `it has ${v} valence electron${v === 1 ? '' : 's'}.`, check: el => el.valence === v }),
  period: (p) => ({ text: `it is in period ${p}.`, check: el => el.period === p }),
  fullShell: () => ({ text: 'it has a completely full outer electron shell.', check: el => el.valence === 8 || (el.valence === 2 && el.period === 1) }),
}

export const CHEMISTRY_DETECTIVE_CASES = [
  {
    id: 'case_oxygen',
    answerSymbol: 'O',
    clues: [
      CLUE_BUILDERS.atomicNumberBelow(10),
      CLUE_BUILDERS.family('nonmetal', 'a non-metal'),
      CLUE_BUILDERS.valence(6),
    ],
    explanation: 'Oxygen (atomic number 8) is under 10, a non-metal, and has 6 valence electrons — the third clue was the one that pinned it down, since carbon and nitrogen are also non-metals under 10 but with different valence counts.',
  },
  {
    id: 'case_neon',
    answerSymbol: 'Ne',
    clues: [
      CLUE_BUILDERS.atomicNumberBelow(11),
      CLUE_BUILDERS.family('noble', 'a noble gas'),
      CLUE_BUILDERS.period(2),
    ],
    explanation: 'Under atomic number 11 and a noble gas still matches both helium and neon — period 2 is the clue that separates them, since helium is period 1.',
  },
  {
    id: 'case_sulfur',
    answerSymbol: 'S',
    clues: [
      CLUE_BUILDERS.period(3),
      CLUE_BUILDERS.family('nonmetal', 'a non-metal'),
      CLUE_BUILDERS.valence(6),
    ],
    explanation: 'Sulfur is easy to confuse with phosphorus and chlorine — all three are period-3 non-metals. The valence-electron clue (6) is what separates it: phosphorus has 5, chlorine has 7.',
  },
  {
    id: 'case_magnesium',
    answerSymbol: 'Mg',
    clues: [
      CLUE_BUILDERS.metal(),
      CLUE_BUILDERS.valence(2),
      CLUE_BUILDERS.period(3),
    ],
    explanation: 'Magnesium is a metal with 2 valence electrons (alkaline earth family) in period 3 — without the period clue, beryllium (also a metal with 2 valence electrons, but period 2) would still be a valid suspect.',
  },
  {
    id: 'case_fluorine',
    answerSymbol: 'F',
    clues: [
      CLUE_BUILDERS.family('halogen', 'a halogen'),
      CLUE_BUILDERS.period(2),
    ],
    explanation: 'Only two halogens exist on this board — fluorine and chlorine. The period clue alone separates them instantly, which is why this case only needs 2 clues.',
  },
  {
    id: 'case_aluminium',
    answerSymbol: 'Al',
    clues: [
      CLUE_BUILDERS.period(3),
      CLUE_BUILDERS.valence(3),
    ],
    explanation: 'Boron also has 3 valence electrons, but it\u2019s in period 2, not period 3 — the period clue alone is enough to rule it out and confirm aluminium.',
  },
  {
    id: 'case_argon',
    answerSymbol: 'Ar',
    clues: [
      CLUE_BUILDERS.atomicNumberAbove(15),
      CLUE_BUILDERS.fullShell(),
    ],
    explanation: 'Above atomic number 15 with a full outer shell only matches argon on this board — a clean 2-clue case once you recognize "full shell" as code for "noble gas".',
  },
  {
    id: 'case_silicon',
    answerSymbol: 'Si',
    clues: [
      CLUE_BUILDERS.family('metalloid', 'a metalloid'),
      CLUE_BUILDERS.valence(4),
    ],
    explanation: 'Only two metalloids exist on this board — boron and silicon. Boron has 3 valence electrons, so the valence clue alone confirms silicon.',
  },
  {
    id: 'case_nitrogen',
    answerSymbol: 'N',
    clues: [
      CLUE_BUILDERS.atomicNumberBelow(10),
      CLUE_BUILDERS.valence(5),
    ],
    explanation: 'Under atomic number 10 with exactly 5 valence electrons only matches nitrogen — phosphorus also has 5 valence electrons but is atomic number 15, well above the cutoff.',
  },
  {
    id: 'case_chlorine',
    answerSymbol: 'Cl',
    clues: [
      CLUE_BUILDERS.family('halogen', 'a halogen'),
      CLUE_BUILDERS.atomicNumberAbove(10),
    ],
    explanation: 'Of the two halogens on this board, only chlorine has an atomic number above 10 — fluorine (atomic number 9) is ruled out immediately.',
  },
]

export function getRemainingSuspects(cluesApplied) {
  return ELEMENT_TABLE.filter(el => cluesApplied.every(clue => clue.check(el)))
}

export function getElementName(symbol) {
  return NAMES[symbol] ?? symbol
}

/**
 * Verifies every case's full clue set narrows ELEMENT_TABLE to EXACTLY
 * the declared answerSymbol, and that no PREFIX of the clue list already
 * narrows to 1 (which would make a later clue pointless busywork) or to
 * 0 (an impossible case). Run this before shipping new cases.
 */
export function validateCases() {
  let allValid = true
  for (const c of CHEMISTRY_DETECTIVE_CASES) {
    let applied = []
    for (let i = 0; i < c.clues.length; i++) {
      applied.push(c.clues[i])
      const remaining = getRemainingSuspects(applied)
      const isLast = i === c.clues.length - 1
      if (remaining.length === 0) {
        console.error(`[chemistryDetective] Case "${c.id}" has ZERO suspects remaining after clue ${i + 1} — impossible case.`)
        allValid = false
      }
      if (isLast) {
        if (remaining.length !== 1) {
          console.error(`[chemistryDetective] Case "${c.id}" ends with ${remaining.length} suspects remaining, not exactly 1.`)
          allValid = false
        } else if (remaining[0].symbol !== c.answerSymbol) {
          console.error(`[chemistryDetective] Case "${c.id}" narrows to "${remaining[0].symbol}", but answerSymbol is "${c.answerSymbol}" — mismatch.`)
          allValid = false
        }
      } else if (remaining.length === 1) {
        console.error(`[chemistryDetective] Case "${c.id}" already narrows to 1 suspect after clue ${i + 1} of ${c.clues.length} — the remaining clue(s) are pointless. Trim the case or reorder clues so the LAST clue is the one that uniquely solves it.`)
        allValid = false
      }
    }
    if (c.clues.length < 2 || c.clues.length > 4) {
      console.error(`[chemistryDetective] Case "${c.id}" has ${c.clues.length} clues — outside the 2-4 range.`)
      allValid = false
    }
    if (!c.explanation) {
      console.error(`[chemistryDetective] Case "${c.id}" has no explanation.`)
      allValid = false
    }
  }
  if (allValid) console.log('[chemistryDetective] All cases verified: each clue set narrows to exactly 1 suspect, no wasted clues. ✓')
  return allValid
}

export function shuffleCases(cases = CHEMISTRY_DETECTIVE_CASES) {
  const a = [...cases]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function scoreForAccusation(cluesRevealedCount, wrongAttempts) {
  // Base score decreases with more clues used; each wrong attempt before
  // the correct one costs a flat penalty rather than ending the case.
  const base = Math.max(20, 100 - (cluesRevealedCount - 1) * 25)
  const penalty = wrongAttempts * 15
  return Math.max(10, base - penalty)
}
// src/lib/games/missions/chemLab.js
// (moved from src/lib/chemLabMissions.js as part of the games/ folder
//  restructure — content unchanged, only the path and this header comment
//  changed. Update any import from '@/lib/chemLabMissions' to
//  '@/lib/games/missions/chemLab'.)
// ─────────────────────────────────────────────────────────────────────────────
// Mission content for Atom Builder and Equation Balancer. Static data —
// content lives here, not hardcoded in components. Adding a new
// mission/reaction is adding an object to these arrays.
//
// topicId fields are placeholders (null) — fill in real topic UUIDs from
// your Chemistry curriculum's "Atomic Structure" and "Chemical Equations"
// topics once known, same integration pattern as Math Kingdom's room defs.
// ─────────────────────────────────────────────────────────────────────────────

export const ATOM_BUILDER_MISSIONS = [
  {
    id: 'mission_1', label: 'Build Hydrogen',
    target: { protons: 1, neutrons: 0, electrons: 1 }, targetLabel: 'H',
    hint: 'Hydrogen has just 1 proton and 1 electron — no neutrons needed.',
    topicId: null, difficulty: 'easy',
  },
  {
    id: 'mission_2', label: 'Build Carbon',
    target: { protons: 6, neutrons: 6, electrons: 6 }, targetLabel: 'C',
    hint: 'Carbon\u2019s atomic number is 6 — protons, neutrons and electrons all equal 6.',
    topicId: null, difficulty: 'easy',
  },
  {
    id: 'mission_3', label: 'Build Sodium',
    target: { protons: 11, neutrons: 12, electrons: 11 }, targetLabel: 'Na',
    hint: 'Sodium has atomic number 11. Its standard mass number is 23 (11 protons + 12 neutrons).',
    topicId: null, difficulty: 'medium',
  },
  {
    id: 'mission_4', label: 'Build a Sodium Ion (Na\u207a)',
    target: { protons: 11, neutrons: 12, electrons: 10 }, targetLabel: 'Na\u207a',
    hint: 'An ion forms when an atom loses or gains electrons. Remove ONE electron from neutral sodium.',
    topicId: null, difficulty: 'medium',
  },
  {
    id: 'mission_5', label: 'Build Magnesium',
    target: { protons: 12, neutrons: 12, electrons: 12 }, targetLabel: 'Mg',
    hint: 'Magnesium\u2019s atomic number is 12.',
    topicId: null, difficulty: 'medium',
  },
  {
    id: 'mission_6', label: 'Build a Magnesium Ion (Mg\u00b2\u207a)',
    target: { protons: 12, neutrons: 12, electrons: 10 }, targetLabel: 'Mg\u00b2\u207a',
    hint: 'Magnesium typically loses 2 electrons to form a stable ion.',
    topicId: null, difficulty: 'medium',
  },
  {
    id: 'mission_7', label: 'Build Chlorine',
    target: { protons: 17, neutrons: 18, electrons: 17 }, targetLabel: 'Cl',
    hint: 'Chlorine\u2019s atomic number is 17.',
    topicId: null, difficulty: 'medium',
  },
  {
    id: 'mission_8', label: 'Build a Chloride Ion (Cl\u207b)',
    target: { protons: 17, neutrons: 18, electrons: 18 }, targetLabel: 'Cl\u207b',
    hint: 'Chlorine GAINS an electron to become a stable chloride ion.',
    topicId: null, difficulty: 'medium',
  },
  {
    id: 'mission_9', label: 'Build Carbon-14 (an isotope)',
    target: { protons: 6, neutrons: 8, electrons: 6 }, targetLabel: 'C-14',
    hint: 'Isotopes have the SAME proton count but a DIFFERENT neutron count. Standard carbon has 6 neutrons — this one has 8.',
    topicId: null, difficulty: 'hard',
  },
  {
    id: 'mission_10', label: 'Build Aluminium',
    target: { protons: 13, neutrons: 14, electrons: 13 }, targetLabel: 'Al',
    hint: 'Aluminium\u2019s atomic number is 13.',
    topicId: null, difficulty: 'hard',
  },
]

export const EQUATION_BALANCER_REACTIONS = [
  {
    id: 'reaction_1', label: 'Formation of Water',
    reactants: [
      { formula: 'H₂', atoms: { H: 2 } },
      { formula: 'O₂', atoms: { O: 2 } },
    ],
    products: [
      { formula: 'H₂O', atoms: { H: 2, O: 1 } },
    ],
    hint: 'There are 2 oxygen atoms on the left but only 1 on the right — try doubling the water molecule.',
    topicId: null, difficulty: 'easy',
  },
  {
    id: 'reaction_2', label: 'Combustion of Magnesium',
    reactants: [
      { formula: 'Mg', atoms: { Mg: 1 } },
      { formula: 'O₂', atoms: { O: 2 } },
    ],
    products: [
      { formula: 'MgO', atoms: { Mg: 1, O: 1 } },
    ],
    hint: 'Each O₂ molecule provides 2 oxygen atoms — how many MgO molecules use them up?',
    topicId: null, difficulty: 'easy',
  },
  {
    id: 'reaction_3', label: 'Synthesis of Ammonia',
    reactants: [
      { formula: 'N₂', atoms: { N: 2 } },
      { formula: 'H₂', atoms: { H: 2 } },
    ],
    products: [
      { formula: 'NH₃', atoms: { N: 1, H: 3 } },
    ],
    hint: 'Balance nitrogen first (2 on the left), then check hydrogen needs 6 in total.',
    topicId: null, difficulty: 'medium',
  },
  {
    id: 'reaction_4', label: 'Neutralisation Reaction',
    reactants: [
      { formula: 'HCl', atoms: { H: 1, Cl: 1 } },
      { formula: 'NaOH', atoms: { Na: 1, O: 1, H: 1 } },
    ],
    products: [
      { formula: 'NaCl', atoms: { Na: 1, Cl: 1 } },
      { formula: 'H₂O', atoms: { H: 2, O: 1 } },
    ],
    hint: 'This one is already balanced at 1:1:1:1 — confirm every element matches before moving on.',
    topicId: null, difficulty: 'medium',
  },
  {
    id: 'reaction_5', label: 'Combustion of Methane',
    reactants: [
      { formula: 'CH₄', atoms: { C: 1, H: 4 } },
      { formula: 'O₂', atoms: { O: 2 } },
    ],
    products: [
      { formula: 'CO₂', atoms: { C: 1, O: 2 } },
      { formula: 'H₂O', atoms: { H: 2, O: 1 } },
    ],
    hint: 'Balance carbon and hydrogen first, then count total oxygen needed on the right before fixing O₂ on the left.',
    topicId: null, difficulty: 'hard',
  },
  {
    id: 'reaction_6', label: 'Decomposition of Calcium Carbonate',
    reactants: [
      { formula: 'CaCO₃', atoms: { Ca: 1, C: 1, O: 3 } },
    ],
    products: [
      { formula: 'CaO', atoms: { Ca: 1, O: 1 } },
      { formula: 'CO₂', atoms: { C: 1, O: 2 } },
    ],
    hint: 'This reaction is already balanced 1:1:1 — check each element carefully.',
    topicId: null, difficulty: 'hard',
  },
]
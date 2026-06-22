// src/lib/periodicTable.js
// ─────────────────────────────────────────────────────────────────────────────
// Static reference data — atomic number, symbol, name, group/period for the
// first 36 elements (covers everything in WAEC/JAMB chemistry curriculum).
// Never changes, no admin editing needed — same category as "days in a
// month" or "days of the week." Plain JS data, not a database table.
//
// Used by: Atom Builder (identify element from proton count, build ions/
// isotopes), Periodic Table Hunt (future — spatial search missions).
// ─────────────────────────────────────────────────────────────────────────────

export const ELEMENTS = [
  { z: 1,  symbol: 'H',  name: 'Hydrogen',   group: 1,  period: 1, category: 'nonmetal',      standardMass: 1   },
  { z: 2,  symbol: 'He', name: 'Helium',     group: 18, period: 1, category: 'noble_gas',     standardMass: 4   },
  { z: 3,  symbol: 'Li', name: 'Lithium',    group: 1,  period: 2, category: 'alkali_metal',  standardMass: 7   },
  { z: 4,  symbol: 'Be', name: 'Beryllium',  group: 2,  period: 2, category: 'alkaline_earth',standardMass: 9   },
  { z: 5,  symbol: 'B',  name: 'Boron',      group: 13, period: 2, category: 'metalloid',     standardMass: 11  },
  { z: 6,  symbol: 'C',  name: 'Carbon',     group: 14, period: 2, category: 'nonmetal',      standardMass: 12  },
  { z: 7,  symbol: 'N',  name: 'Nitrogen',   group: 15, period: 2, category: 'nonmetal',      standardMass: 14  },
  { z: 8,  symbol: 'O',  name: 'Oxygen',     group: 16, period: 2, category: 'nonmetal',      standardMass: 16  },
  { z: 9,  symbol: 'F',  name: 'Fluorine',   group: 17, period: 2, category: 'halogen',       standardMass: 19  },
  { z: 10, symbol: 'Ne', name: 'Neon',       group: 18, period: 2, category: 'noble_gas',     standardMass: 20  },
  { z: 11, symbol: 'Na', name: 'Sodium',     group: 1,  period: 3, category: 'alkali_metal',  standardMass: 23  },
  { z: 12, symbol: 'Mg', name: 'Magnesium',  group: 2,  period: 3, category: 'alkaline_earth',standardMass: 24  },
  { z: 13, symbol: 'Al', name: 'Aluminium',  group: 13, period: 3, category: 'metal',         standardMass: 27  },
  { z: 14, symbol: 'Si', name: 'Silicon',    group: 14, period: 3, category: 'metalloid',     standardMass: 28  },
  { z: 15, symbol: 'P',  name: 'Phosphorus', group: 15, period: 3, category: 'nonmetal',      standardMass: 31  },
  { z: 16, symbol: 'S',  name: 'Sulphur',    group: 16, period: 3, category: 'nonmetal',      standardMass: 32  },
  { z: 17, symbol: 'Cl', name: 'Chlorine',   group: 17, period: 3, category: 'halogen',       standardMass: 35  },
  { z: 18, symbol: 'Ar', name: 'Argon',      group: 18, period: 3, category: 'noble_gas',     standardMass: 40  },
  { z: 19, symbol: 'K',  name: 'Potassium',  group: 1,  period: 4, category: 'alkali_metal',  standardMass: 39  },
  { z: 20, symbol: 'Ca', name: 'Calcium',    group: 2,  period: 4, category: 'alkaline_earth',standardMass: 40  },
  { z: 26, symbol: 'Fe', name: 'Iron',       group: 8,  period: 4, category: 'transition',    standardMass: 56  },
  { z: 29, symbol: 'Cu', name: 'Copper',     group: 11, period: 4, category: 'transition',    standardMass: 64  },
  { z: 30, symbol: 'Zn', name: 'Zinc',       group: 12, period: 4, category: 'transition',    standardMass: 65  },
  { z: 35, symbol: 'Br', name: 'Bromine',    group: 17, period: 4, category: 'halogen',       standardMass: 80  },
]

export function getElementByZ(z) {
  return ELEMENTS.find(e => e.z === z) ?? null
}

export function getElementBySymbol(symbol) {
  return ELEMENTS.find(e => e.symbol.toLowerCase() === symbol.toLowerCase()) ?? null
}

/**
 * Given proton/neutron/electron counts, derive the full atom identity.
 * This is the core "live result" computation Atom Builder uses on every
 * counter change — instant feedback, no submit button needed to SEE the
 * result (only to confirm a mission is complete).
 */
export function deriveAtomIdentity(protons, neutrons, electrons) {
  const element = getElementByZ(protons)
  if (!element) {
    return { valid: false, label: `Unknown (Z=${protons})`, charge: 0, massNumber: protons + neutrons }
  }

  const charge = protons - electrons
  const massNumber = protons + neutrons
  const isIon = charge !== 0
  const isIsotope = element.standardMass !== massNumber

  let label = element.symbol
  if (isIon) {
    const sign = charge > 0 ? '+' : '−'
    const magnitude = Math.abs(charge)
    label += magnitude > 1 ? `${magnitude}${sign}` : sign
  }

  return {
    valid: true,
    element,
    label,
    name: element.name,
    charge,
    isIon,
    isIsotope,
    massNumber,
    description: isIon
      ? `${element.name} ion (${charge > 0 ? 'cation' : 'anion'}, charge ${charge > 0 ? '+' : ''}${charge})`
      : isIsotope
      ? `${element.name}-${massNumber} (isotope)`
      : element.name,
  }
}
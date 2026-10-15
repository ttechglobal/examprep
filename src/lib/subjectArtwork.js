// Reusable subject artwork registry. Each atlas contains four equal panels:
// top-left, top-right, bottom-left, bottom-right. Names are independent of
// whether a subject currently has lessons or flashcards.
const panel = (file, position) => ({ url: `/images/flashcards/${file}.png`, position })
const TL = '0% 0%', TR = '100% 0%', BL = '0% 100%', BR = '100% 100%'

export const SUBJECT_ARTWORK = {
  'Biology': panel('subjects-science-v1', TL),
  'Chemistry': panel('subjects-science-v1', TR),
  'Economics': panel('subjects-science-v1', BL),
  'Physics': panel('subjects-science-v1', BR),
  'Mathematics': panel('subjects-other-v1', TL),
  'English Language': panel('subjects-other-v1', TR),
  'Government': panel('subjects-other-v1', BL),
  'Geography': panel('subjects-other-v1', BR),
  'Further Mathematics': panel('subjects-advanced-v1', TL),
  'Computer Science': panel('subjects-advanced-v1', TR),
  'Agricultural Science': panel('subjects-advanced-v1', BL),
  'Commerce': panel('subjects-advanced-v1', BR),
  'Accounting': panel('subjects-humanities-v1', TL),
  'History': panel('subjects-humanities-v1', TR),
  'Civic Education': panel('subjects-humanities-v1', BL),
  'Christian Religious Studies': panel('subjects-humanities-v1', BR),
  'Literature in English': panel('subjects-languages-v1', TL),
  'Use of English': panel('subjects-languages-v1', TR),
  'Yoruba': panel('subjects-languages-v1', BL),
  'Igbo': panel('subjects-languages-v1', BR),
  'Hausa': panel('subjects-culture-v1', TL),
  'Islamic Religious Studies': panel('subjects-culture-v1', TR),
  'The Lekki Headmaster': panel('subjects-culture-v1', BL),
  'French': panel('subjects-culture-v1', BR),
}

export function normalizeArtworkName(name) {
  return String(name ?? '').trim()
    .replace(/\s*(?:\((?:WAEC|JAMB|IGCSE|NECO)\)|(?:[-–—]\s*)?(?:WAEC|JAMB|IGCSE|NECO))\s*$/i, '')
    .trim().replace(/\s+/g, ' ').toLowerCase()
}

const aliases = {
  'english': 'English Language',
  'english language': 'English Language',
  'use of english': 'Use of English',
  'further maths': 'Further Mathematics',
  'maths': 'Mathematics',
  'agriculture': 'Agricultural Science',
  'agricultural sciences': 'Agricultural Science',
  'financial accounting': 'Accounting',
  'principles of accounts': 'Accounting',
  'computer studies': 'Computer Science',
  'civic': 'Civic Education',
  'literature': 'Literature in English',
  'english literature': 'Literature in English',
  'crk': 'Christian Religious Studies',
  'crs': 'Christian Religious Studies',
  'christian religious knowledge': 'Christian Religious Studies',
  'irk': 'Islamic Religious Studies',
  'irs': 'Islamic Religious Studies',
  'islamic religious knowledge': 'Islamic Religious Studies',
  'lekki headmaster': 'The Lekki Headmaster',
}
const byName = Object.fromEntries(Object.entries(SUBJECT_ARTWORK).map(([name, artwork]) => [normalizeArtworkName(name), artwork]))

export function getSubjectArtwork(name) {
  const key = normalizeArtworkName(name)
  return byName[key] ?? SUBJECT_ARTWORK[aliases[key]] ?? SUBJECT_ARTWORK['English Language']
}

// The supplied design sheets are retained unchanged. CSS sprite windows render
// their original illustrations without replacing them with platform emoji.
const ROOT = '/images/battle/design/'
const ART = {
  mark: ['reference-hub.png', 36, 27, 49, 49],
  waec: ['reference-exams.png', 425, 493, 225, 207],
  jamb: ['reference-exams.png', 756, 499, 225, 220],
  mathematics: ['reference-subjects.png', 430, 466, 64, 68],
  chemistry: ['reference-subjects.png', 616, 467, 69, 68],
  physics: ['reference-subjects.png', 798, 466, 66, 70],
  biology: ['reference-subjects.png', 973, 463, 76, 70],
  english: ['reference-subjects.png', 428, 637, 75, 61],
  government: ['reference-subjects.png', 613, 637, 78, 67],
  economics: ['reference-subjects.png', 795, 635, 75, 70],
  literature: ['reference-subjects.png', 980, 634, 68, 69],
  random: ['reference-types.png', 449, 526, 180, 128],
  topics: ['reference-types.png', 838, 516, 172, 152],
  trophy: ['reference-hub.png', 368, 891, 53, 51],
  settings: ['reference-hub.png', 726, 889, 56, 54],
  xp: ['reference-hub.png', 732, 28, 32, 44],
  shield: ['reference-hub.png', 850, 24, 48, 52],
  flame: ['reference-hub.png', 1000, 27, 39, 48],
  help: ['reference-setup.png', 347, 624, 48, 48],
  clock: ['reference-setup.png', 797, 624, 48, 48],
  algebra: ['reference-topics.png', 565, 480, 60, 52],
  geometry: ['reference-topics.png', 773, 478, 64, 58],
  mensuration: ['reference-topics.png', 981, 480, 54, 55],
  trigonometry: ['reference-topics.png', 353, 594, 63, 61],
  statistics: ['reference-topics.png', 565, 591, 61, 65],
  probability: ['reference-topics.png', 777, 594, 61, 61],
  sets: ['reference-topics.png', 979, 595, 60, 62],
  matrices: ['reference-topics.png', 351, 709, 65, 62],
  vectors: ['reference-topics.png', 565, 710, 61, 61],
  complex: ['reference-topics.png', 780, 707, 51, 64],
  sequence: ['reference-topics.png', 977, 710, 60, 61],
}

export function topicArt(name = '', subject = '') {
  const n = name.toLowerCase()
  if (/algebra|equation|inequalit|indices|logarithm/.test(n)) return 'algebra'
  if (/mensuration|volume|surface area/.test(n)) return 'mensuration'
  if (/trigonometr/.test(n)) return 'trigonometry'
  if (/geometry|polygon|triangle|coordinate/.test(n)) return 'geometry'
  if (/statistic/.test(n)) return 'statistics'
  if (/probability/.test(n)) return 'probability'
  if (/\bsets\b/.test(n)) return 'sets'
  if (/matri/.test(n)) return 'matrices'
  if (/vector/.test(n)) return 'vectors'
  if (/complex/.test(n)) return 'complex'
  if (/sequence|series/.test(n)) return 'sequence'
  return subjectArt(subject)
}

export function subjectArt(name = '') {
  const n = name.toLowerCase()
  if (n.includes('math')) return 'mathematics'
  if (n.includes('chem')) return 'chemistry'
  if (n.includes('phys')) return 'physics'
  if (n.includes('bio') || n.includes('agric')) return 'biology'
  if (n.includes('lit')) return 'literature'
  if (n.includes('gov')) return 'government'
  if (n.includes('econ') || n.includes('commerce') || n.includes('account')) return 'economics'
  return 'english'
}

// size: width in px, or null to size it from CSS (the height follows the art).
export default function IllustratedIcon({ name, size = 60, className = '' }) {
  const [file, x, y, width, height] = ART[name] ?? ART.english
  return <span className={className} aria-hidden="true" style={{
    display: 'inline-block', flexShrink: 0, width: size ?? undefined, aspectRatio: `${width} / ${height}`,
    backgroundImage: `url('/_next/image?url=${encodeURIComponent(ROOT + file)}&w=1920&q=75')`, backgroundRepeat: 'no-repeat',
    backgroundSize: `${1536 / width * 100}% ${1024 / height * 100}%`,
    backgroundPosition: `${x / (1536 - width) * 100}% ${y / (1024 - height) * 100}%`,
    mixBlendMode: ['mark', 'xp', 'shield', 'flame'].includes(name) ? 'normal' : 'multiply',
    clipPath: ['help','clock'].includes(name) ? 'circle(44%)' : undefined,
  }}/>
}


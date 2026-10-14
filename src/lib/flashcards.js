export const FLASHCARD_PROGRESS_KEY = 'ep_fc_progress'
export function subjectArtwork(name) {
  if (/biology|agric/i.test(name)) return { url: '/images/flashcards/subjects-science-v1.png', position: '0% 0%' }
  if (/chemistry/i.test(name)) return { url: '/images/flashcards/subjects-science-v1.png', position: '100% 0%' }
  if (/economics|commerce|account|business/i.test(name)) return { url: '/images/flashcards/subjects-science-v1.png', position: '0% 100%' }
  if (/physics/i.test(name)) return { url: '/images/flashcards/subjects-science-v1.png', position: '100% 100%' }
  if (/math|computer/i.test(name)) return { url: '/images/flashcards/subjects-other-v1.png', position: '0% 0%' }
  if (/english|literature|french|yoruba|igbo|hausa|arabic/i.test(name)) return { url: '/images/flashcards/subjects-other-v1.png', position: '100% 0%' }
  if (/geography/i.test(name)) return { url: '/images/flashcards/subjects-other-v1.png', position: '100% 100%' }
  return { url: '/images/flashcards/subjects-other-v1.png', position: '0% 100%' }
}
export function subjectCategory(name) {
  if (/math|physics|chemistry|biology|agric|computer|geography/i.test(name)) return 'Science & maths'
  if (/economics|commerce|account|business/i.test(name)) return 'Business'
  if (/english|literature|french|yoruba|igbo|hausa|arabic/i.test(name)) return 'Languages'
  if (/government|history|relig|civic|social|islam|christian|\bcrs\b|\birs\b/i.test(name)) return 'Humanities'
  return 'Other subjects'
}
export function subjectColor(name) {
  if (/biology|agric/i.test(name)) return '#059669'
  if (/chemistry|computer/i.test(name)) return '#1264e5'
  if (/physics/i.test(name)) return '#7c3aed'
  if (/math|economics|account|commerce/i.test(name)) return '#b77908'
  if (/english|literature|language/i.test(name)) return '#db2777'
  return '#0891b2'
}
export function validRatings(cards, ratings = {}) {
  if (!ratings || typeof ratings !== 'object') return {}
  return Object.fromEntries(cards.filter(card => ['known', 'almost', 'again'].includes(ratings[card.id])).map(card => [card.id, ratings[card.id]]))
}
export function ratingCounts(ratings = {}) {
  const result = { known: 0, almost: 0, again: 0 }
  for (const value of Object.values(ratings)) if (Object.hasOwn(result, value)) result[value]++
  return result
}
export function subjectProgress(progress, name, total) {
  total = Math.max(0, Number(total) || 0)
  const known = Object.values(progress).filter(p => p?.subjectName === name).reduce((sum, p) => sum + Math.max(0, Number(p.done) || 0), 0)
  return { known: Math.min(total, known), percent: total ? Math.min(100, Math.round(known / total * 100)) : 0 }
}

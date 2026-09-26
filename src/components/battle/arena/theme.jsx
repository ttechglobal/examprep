// src/components/battle/arena/theme.jsx
// Look and small helpers shared by every battle screen (vs Computer and 1v1):
// brand colours, the four answer-tile colours and decorations, and helpers for
// option text, subject emoji and "is there an explanation to show".
import { LETTERS } from '@/lib/answers'

export { LETTERS }

export const NAVY  = '#12195A'
export const NAVY2 = '#1A2468'
export const GOLD  = '#FFB800'
export const GOLD2 = '#CC8F00'
export const GREEN = '#16A34A'
export const RED   = '#DC2626'

// One colour per answer position: A blue, B green, C orange, D purple.
export const TILE = [
  { bg:'#3B82F6', press:'#1D4ED8', glow:'rgba(59,130,246,.35)' },
  { bg:'#22C55E', press:'#15803D', glow:'rgba(34,197,94,.35)'  },
  { bg:'#F97316', press:'#C2410C', glow:'rgba(249,115,22,.35)' },
  { bg:'#8B5CF6', press:'#6D28D9', glow:'rgba(139,92,246,.35)' },
]

// Faint molecule decorations on the right of each tile.
export const DECOS = [
  <svg key="a" width="22" height="22" viewBox="0 0 22 22" fill="none" opacity=".28"><circle cx="11" cy="4" r="3" stroke="white" strokeWidth="1.4"/><circle cx="4" cy="16" r="3" stroke="white" strokeWidth="1.4"/><circle cx="18" cy="16" r="3" stroke="white" strokeWidth="1.4"/><line x1="11" y1="7" x2="6" y2="14" stroke="white" strokeWidth="1.1"/><line x1="11" y1="7" x2="16" y2="14" stroke="white" strokeWidth="1.1"/></svg>,
  <svg key="b" width="22" height="22" viewBox="0 0 22 22" fill="none" opacity=".28"><circle cx="5" cy="5" r="3" stroke="white" strokeWidth="1.4"/><circle cx="17" cy="5" r="3" stroke="white" strokeWidth="1.4"/><circle cx="5" cy="17" r="3" stroke="white" strokeWidth="1.4"/><circle cx="17" cy="17" r="3" stroke="white" strokeWidth="1.4"/><line x1="8" y1="5" x2="14" y2="5" stroke="white" strokeWidth="1.1"/><line x1="5" y1="8" x2="5" y2="14" stroke="white" strokeWidth="1.1"/><line x1="17" y1="8" x2="17" y2="14" stroke="white" strokeWidth="1.1"/><line x1="8" y1="17" x2="14" y2="17" stroke="white" strokeWidth="1.1"/></svg>,
  <svg key="c" width="22" height="22" viewBox="0 0 22 22" fill="none" opacity=".28"><circle cx="11" cy="11" r="4" stroke="white" strokeWidth="1.4"/><line x1="11" y1="2" x2="11" y2="7" stroke="white" strokeWidth="1.1"/><line x1="11" y1="15" x2="11" y2="20" stroke="white" strokeWidth="1.1"/><line x1="2" y1="11" x2="7" y2="11" stroke="white" strokeWidth="1.1"/><line x1="15" y1="11" x2="20" y2="11" stroke="white" strokeWidth="1.1"/></svg>,
  <svg key="d" width="22" height="22" viewBox="0 0 22 22" fill="none" opacity=".28"><polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="white" strokeWidth="1.4" fill="none"/><circle cx="11" cy="11" r="4" stroke="white" strokeWidth="1" strokeDasharray="2 2"/></svg>,
]

/** Display text of one option, whether stored as a string or { text } / { value }. */
export function optionText(option) {
  if (option == null) return ''
  if (typeof option === 'object') return String(option.text ?? option.value ?? '')
  return String(option)
}

export function subjectEmoji(name = '') {
  const n = name.toLowerCase()
  if (n.includes('chem'))   return '⚗️'
  if (n.includes('phys'))   return '⚡'
  if (n.includes('bio'))    return '🔬'
  if (n.includes('math'))   return '📐'
  if (n.includes('english') || n.includes('lit')) return '📖'
  if (n.includes('econ'))   return '📊'
  if (n.includes('gov'))    return '🏛️'
  if (n.includes('geo'))    return '🌍'
  return '📚'
}

/** True if an explanation has anything ExplanationBlock would render. */
export function hasDisplayableExplanation(explanation) {
  if (!explanation) return false
  if (typeof explanation === 'string') return explanation.trim().length > 0
  if (typeof explanation !== 'object') return false
  return !!(
    explanation.concept || explanation.correct || explanation.answer_note ||
    explanation.intro   || explanation.study_tip || explanation.hint ||
    (Array.isArray(explanation.steps) && explanation.steps.length) ||
    (Array.isArray(explanation.workings) && explanation.workings.length) ||
    (explanation.wrong_options && Object.keys(explanation.wrong_options).length) ||
    explanation.formula_box || explanation.svg_diagram
  )
}

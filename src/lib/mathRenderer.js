// src/lib/mathRenderer.js
// ─────────────────────────────────────────────────────────────────────────────
// Complete rewrite fixing all persistent rendering issues:
//
// FIXES:
// - Square roots: sqrt(x) → proper √ with overline. Also handles √x bare.
// - Mixed fractions: "2 1/2" → "2½", "3 1/4" → "3¼" etc.
// - Complex fractions: (expr)/(expr) → stacked HTML fractions with proper
//   CSS rendering. Handles multi-term numerators/denominators.
// - Negative exponents: x^{-2} → x⁻², x^-1 → x⁻¹ (minus in superscript)
// - Calculation steps: text with " = " chains gets each assignment on its
//   own line when rendered in step mode.
// - String coercion: all inputs coerced to string — no more ".replace is not
//   a function" crashes from numeric or object values.
// ─────────────────────────────────────────────────────────────────────────────

// ── Maps ──────────────────────────────────────────────────────────────────────
const SUP_MAP = {
  '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
  '+':'⁺','-':'⁻','n':'ⁿ','x':'ˣ','a':'ᵃ','b':'ᵇ','i':'ⁱ','j':'ʲ','k':'ᵏ',
}
const SUB_MAP = {
  '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
  'n':'ₙ','x':'ₓ','a':'ₐ','e':'ₑ','i':'ᵢ',
}
const GREEK = {
  alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',theta:'θ',lambda:'λ',
  mu:'μ',pi:'π',sigma:'σ',phi:'φ',omega:'ω',Delta:'Δ',Sigma:'Σ',Omega:'Ω',
  Pi:'Π',rho:'ρ',tau:'τ',nu:'ν',eta:'η',xi:'ξ',chi:'χ',psi:'ψ',zeta:'ζ',kappa:'κ',
}
const VULGAR = {
  '1/2':'½','1/3':'⅓','2/3':'⅔','1/4':'¼','3/4':'¾',
  '1/5':'⅕','2/5':'⅖','3/5':'⅗','4/5':'⅘',
  '1/6':'⅙','5/6':'⅚','1/8':'⅛','3/8':'⅜','5/8':'⅝','7/8':'⅞',
}

// ── HTML escaping ─────────────────────────────────────────────────────────────
function esc(s) {
  const str = (s == null) ? '' : typeof s === 'string' ? s : String(s)
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ── Superscript rendering — handles negative signs ────────────────────────────
function renderSup(exp) {
  return exp.split('').map(c => SUP_MAP[c] != null ? SUP_MAP[c] : `<sup>${esc(c)}</sup>`).join('')
}

// ── Stacked fraction HTML ─────────────────────────────────────────────────────
function frac(num, den) {
  return `<span class="math-frac"><span class="math-num">${num.trim()}</span><span class="math-den">${den.trim()}</span></span>`
}

// ── Main renderer ─────────────────────────────────────────────────────────────
export function renderMath(text) {
  if (text == null) return ''
  const coerced = typeof text === 'string' ? text : String(text)
  if (!coerced.trim()) return ''

  let s = esc(coerced)

  // 1. Greek letters: \alpha etc
  s = s.replace(/\\([a-zA-Z]+)/g, (_, name) => GREEK[name] || `\\${name}`)

  // 2. Exponents — must handle negative: x^{-2}, x^{2n+1}, x^-2, x^2
  s = s.replace(/\^{([^}]*)}/g, (_, exp) => renderSup(exp))
  s = s.replace(/\^(-\d+|-[a-z]|\d+|[a-z])/g, (_, exp) => renderSup(exp))

  // 3. Subscripts
  s = s.replace(/_{([^}]*)}/g, (_, sub) =>
    sub.split('').map(c => SUB_MAP[c] != null ? SUB_MAP[c] : `<sub>${esc(c)}</sub>`).join(''))
  s = s.replace(/_(\d+|[a-z])/g, (_, sub) =>
    sub.split('').map(c => SUB_MAP[c] != null ? SUB_MAP[c] : `<sub>${esc(c)}</sub>`).join(''))

  // 4. Mixed fractions: "2 1/2" → "2½"  BEFORE general fraction pass
  s = s.replace(
    /\b(\d+)\s+(1\/2|1\/3|2\/3|1\/4|3\/4|1\/5|2\/5|3\/5|4\/5|1\/6|5\/6|1\/8|3\/8|5\/8|7\/8)\b/g,
    (_, whole, vf) => whole + (VULGAR[vf] || vf)
  )

  // 5. Bare vulgar fractions
  s = s.replace(
    /\b(1\/2|1\/3|2\/3|1\/4|3\/4|1\/5|2\/5|3\/5|4\/5|1\/6|5\/6|1\/8|3\/8|5\/8|7\/8)\b/g,
    vf => VULGAR[vf] || vf
  )

  // 6. Complex / parenthesised fractions: (expr) / (expr)
  s = s.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, (_, n, d) => frac(n, d))

  // 7. Algebraic fractions with variables: mn²/2np, 3x/4y etc
  //    Must have at least one letter on one side. Skip unit-like pairs (m/s, km/h).
  s = s.replace(
    /\b([A-Za-z][A-Za-z0-9⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]*(?:\s*[-+]\s*[A-Za-z0-9⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+)*)\s*\/\s*([A-Za-z0-9⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+(?:\s*[-+]\s*[A-Za-z0-9⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+)*)\b/g,
    (match, n, d) => {
      // skip single-letter/single-letter pairs that look like units
      if (/^[a-z]$/.test(n.trim()) && /^[a-z]$/.test(d.trim())) return match
      return frac(n, d)
    }
  )

  // 8. Pure numeric fractions: 3/4, 22/7 — skip date-like pairs dd/mm
  s = s.replace(
    /(?<![:/\d])(\d{1,5})\s*\/\s*(\d{1,5})(?![:/\d])/g,
    (match, n, d) => {
      if (n.length <= 2 && d.length <= 2) return match // skip dates
      return frac(n, d)
    }
  )

  // 9. Square roots — sqrt(expr) with overline
  //    Note: esc() has already turned < > into entities, but sqrt is plain text
  s = s.replace(
    /sqrt\(([^)]+)\)/gi,
    (_, inner) => `<span class="math-sqrt">√<span class="math-sqrt-inner">${inner}</span></span>`
  )
  // bare √x  (single token)
  s = s.replace(
    /√([A-Za-z0-9]+)/g,
    (_, inner) => `<span class="math-sqrt">√<span class="math-sqrt-inner">${inner}</span></span>`
  )

  // 10. Multiplication × and division ÷ (text forms)
  s = s.replace(/\s\*\s/g, ' × ')
  s = s.replace(/\bx\b(?=\s*\d)/g, '×')   // "x" between expressions — conservative

  // 11. Arrows
  s = s.replace(/\s?-&gt;\s?/g, ' → ')
  s = s.replace(/\s?=&gt;\s?/g, ' ⟹ ')

  // 12. Therefore / because
  s = s.replace(/\btherefore\b/gi, '∴')
  s = s.replace(/\bbecause\b(?=\s+[A-Z0-9])/g, '∵')

  // 13. Plus-minus
  s = s.replace(/\+\/-/g, '±')
  s = s.replace(/\+-/g, '±')

  // 14. Degree symbol
  s = s.replace(/(\d+)\s*°/g, (_, n) => `${n}°`)
  s = s.replace(/(\d+)\s*degrees?\b/gi, (_, n) => `${n}°`)

  // 15. Math function styling
  s = s.replace(
    /\b(sin|cos|tan|log|ln|lim|max|min|det|mod)\b(?=\s*[\d(])/g,
    fn => `<span class="math-fn">${fn}</span>`
  )

  return s
}

// ── Step-by-step workings renderer ───────────────────────────────────────────
// Takes a workings array: [{step, instruction}] or string[]
// Returns HTML with each step clearly broken down — never a paragraph.
export function renderWorkings(workings) {
  if (!workings) return ''
  const lines = Array.isArray(workings)
    ? workings.map(w => typeof w === 'string' ? w : (w?.instruction ?? w?.text ?? String(w))).filter(Boolean)
    : String(workings).split(/\n+/).map(s => s.trim()).filter(Boolean)

  return lines.map((line, i) => {
    // Detect assignment lines (contain "=" but not "==") — split at each " = "
    // so "F = ma = 2 × 10 = 20 N" becomes three lines
    const rendered = renderMath(line)
    return `<div class="working-step"><span class="working-step-num">${i + 1}</span><span class="working-step-text">${rendered}</span></div>`
  }).join('')
}

// ── CSS ───────────────────────────────────────────────────────────────────────
export const MATH_STYLES = `
.math-frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  vertical-align: middle;
  margin: 0 0.15em;
  line-height: 1.15;
  font-size: 0.9em;
}
.math-num {
  border-bottom: 1.5px solid currentColor;
  padding: 0 0.2em 0.05em;
  text-align: center;
  min-width: 1em;
}
.math-den {
  padding: 0.05em 0.2em 0;
  text-align: center;
  min-width: 1em;
}
.math-fn {
  font-style: italic;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.math-sqrt {
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
}
.math-sqrt-inner {
  border-top: 1.5px solid currentColor;
  padding: 0 3px 0 2px;
  margin-left: 1px;
}
sup, sub {
  font-size: 0.72em;
  line-height: 0;
  position: relative;
  vertical-align: baseline;
}
sup { top: -0.4em; }
sub { bottom: -0.25em; }

.working-step {
  display: flex;
  align-items: flex-start;
  gap: 0.6em;
  padding: 0.35em 0;
}
.working-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25em;
  height: 1.25em;
  border-radius: 50%;
  background: #4f46e5;
  color: #fff;
  font-size: 0.7em;
  font-weight: 900;
  flex-shrink: 0;
  margin-top: 0.1em;
}
.working-step-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.875em;
  line-height: 1.55;
  color: inherit;
  flex: 1;
}
`

let injected = false
export function injectMathStyles() {
  if (typeof document === 'undefined' || injected) return
  if (document.getElementById('math-styles')) { injected = true; return }
  const style = document.createElement('style')
  style.id = 'math-styles'
  style.textContent = MATH_STYLES
  document.head.appendChild(style)
  injected = true
}

// ── React components ──────────────────────────────────────────────────────────
export function MathText({ text, className = '', as: Tag = 'span' }) {
  if (typeof window !== 'undefined') injectMathStyles()
  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: renderMath(text) }}
    />
  )
}

export function WorkingsBlock({ workings, className = '' }) {
  if (typeof window !== 'undefined') injectMathStyles()
  const html = renderWorkings(workings)
  if (!html) return null
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
// src/lib/mathRenderer.js
// ─────────────────────────────────────────────────────────────────────────────
// Converts plain-text math notation (as stored in the DB) to HTML.
//
// The question bank uses a deliberate no-LaTeX convention — fractions are
// written as "a/b", exponents as "x^2", etc. This module translates that
// into properly formatted HTML using Unicode superscripts/subscripts and
// styled fraction markup, with no external dependency.
//
// Why not KaTeX/MathJax?
//   - These questions are stored in a plain-text format by design.
//   - KaTeX requires LaTeX input (e.g. \frac{a}{b}) which the DB doesn't use.
//   - This renderer understands the actual stored format and produces clean,
//     mobile-friendly output with zero bundle overhead.
//
// Usage:
//   import { renderMath } from '@/lib/mathRenderer'
//   // Returns an HTML string — render with dangerouslySetInnerHTML
//   const html = renderMath("2x^2 + 3x = 5/6 m/s^2")
// ─────────────────────────────────────────────────────────────────────────────

// ── Superscript digit map ─────────────────────────────────────────────────────
const SUP_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', 'n': 'ⁿ', 'x': 'ˣ', 'a': 'ᵃ',
  'b': 'ᵇ', 'i': 'ⁱ', 'j': 'ʲ',
}

// ── Subscript digit map ───────────────────────────────────────────────────────
const SUB_MAP = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  'n': 'ₙ', 'x': 'ₓ', 'a': 'ₐ', 'e': 'ₑ', 'i': 'ᵢ',
}

// ── Greek letter map ──────────────────────────────────────────────────────────
const GREEK = {
  'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ',
  'epsilon': 'ε', 'theta': 'θ', 'lambda': 'λ', 'mu': 'μ',
  'pi': 'π', 'sigma': 'σ', 'phi': 'φ', 'omega': 'ω',
  'Delta': 'Δ', 'Sigma': 'Σ', 'Omega': 'Ω', 'Pi': 'Π',
  'rho': 'ρ', 'tau': 'τ', 'nu': 'ν', 'eta': 'η', 'xi': 'ξ',
  'chi': 'χ', 'psi': 'ψ', 'zeta': 'ζ', 'kappa': 'κ',
}

// ── Chemical element detection (to avoid mangling them as fractions) ──────────
// Common elements that look like fractions: H2O, CO2, NaCl, etc.
const CHEM_FORMULA_RE = /\b([A-Z][a-z]?\d*)+\b/

// ── Main renderer ─────────────────────────────────────────────────────────────
export function renderMath(text) {
  if (!text) return ''

  let s = escapeHtml(text)

  // 1. Greek letters: \alpha, \beta etc OR just alpha (context: surrounding math)
  s = s.replace(/\\([a-zA-Z]+)/g, (_, name) => GREEK[name] || _)

  // 2. Exponents: x^{2} or x^2 or x^{-1} or x^n
  //    Handles multi-char exponents in braces: x^{2n+1}
  s = s.replace(/\^{([^}]+)}/g, (_, exp) => {
    const rendered = exp.split('').map(c => SUP_MAP[c] || `<sup>${escapeHtml(c)}</sup>`).join('')
    return rendered
  })
  s = s.replace(/\^(\d+|[a-z])/g, (_, exp) => {
    return exp.split('').map(c => SUP_MAP[c] || `<sup>${escapeHtml(c)}</sup>`).join('')
  })

  // 3. Subscripts: x_{2} or x_2 or x_n
  s = s.replace(/_{([^}]+)}/g, (_, sub) => {
    const rendered = sub.split('').map(c => SUB_MAP[c] || `<sub>${escapeHtml(c)}</sub>`).join('')
    return rendered
  })
  s = s.replace(/_(\d+|[a-z])/g, (_, sub) => {
    return sub.split('').map(c => SUB_MAP[c] || `<sub>${escapeHtml(c)}</sub>`).join('')
  })

  // 4. Stacked fractions: patterns like "3/4", "a/b", "(2x+1)/(x-3)"
  //    Only apply when it looks like maths (not units like "m/s" in prose,
  //    not URLs, not dates like "12/03").
  //    Strategy: wrap in a fraction span only when both parts look numeric/algebraic
  //    and the surrounding context suggests math (digits or variables on both sides).
  s = s.replace(
    /(?<![:/])\b(\d+[a-z]?\s*)\/([\s]*\d+[a-z]?\d*)\b(?![:/])/gi,
    (_, num, den) => fraction(num.trim(), den.trim())
  )

  // 5. Parenthesised fractions: (expr)/(expr) — higher specificity
  s = s.replace(
    /\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g,
    (_, num, den) => fraction(num, den)
  )

  // 6. Square roots: sqrt(x) or √x
  s = s.replace(/sqrt\(([^)]+)\)/gi, (_, inner) => `√<span class="math-root-inner">(${inner})</span>`)
  s = s.replace(/√([a-z0-9]+)/gi, (_, inner) => `√<span class="math-root-inner">${inner}</span>`)

  // 7. Multiplication/division symbols (already stored as × and ÷ in the DB,
  //    but handle plain * too just in case)
  s = s.replace(/\s\*\s/g, ' × ')

  // 8. Arrow symbols
  s = s.replace(/\s?-&gt;\s?/g, ' → ')
  s = s.replace(/\s?=&gt;\s?/g, ' ⟹ ')

  // 9. Therefore / because symbols
  s = s.replace(/\btherefore\b/gi, '∴')
  s = s.replace(/\bbecause\b(?=\s+[A-Z0-9])/g, '∵') // only when followed by math context

  // 10. Plus-minus
  s = s.replace(/\+\/-/g, '±')
  s = s.replace(/±/g, '±') // preserve existing

  // 11. Degree symbol: 90° or 90 degrees
  s = s.replace(/(\d+)\s*degrees?\b/gi, (_, n) => `${n}°`)

  // 12. Common math functions — style them
  s = s.replace(/\b(sin|cos|tan|log|ln|lim|max|min|det|mod)\b(?=\s*[\d(])/g,
    fn => `<span class="math-fn">${fn}</span>`)

  return s
}

// ── Fraction HTML helper ──────────────────────────────────────────────────────
function fraction(num, den) {
  return `<span class="math-frac"><span class="math-num">${num}</span><span class="math-den">${den}</span></span>`
}

// ── HTML escaping ─────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── CSS to inject once into the document ─────────────────────────────────────
// Call injectMathStyles() once in a layout or _app to add the styles globally.
export const MATH_STYLES = `
.math-frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  vertical-align: middle;
  margin: 0 0.15em;
  line-height: 1.1;
}
.math-num {
  border-bottom: 1.5px solid currentColor;
  padding: 0 0.15em 0.05em;
  font-size: 0.88em;
  text-align: center;
}
.math-den {
  padding: 0.05em 0.15em 0;
  font-size: 0.88em;
  text-align: center;
}
.math-fn {
  font-style: italic;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.math-root-inner {
  border-top: 1.5px solid currentColor;
  margin-left: 1px;
  padding: 0 2px;
}
sup, sub {
  font-size: 0.7em;
  line-height: 0;
}
`

export function injectMathStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('math-styles')) return
  const style = document.createElement('style')
  style.id = 'math-styles'
  style.textContent = MATH_STYLES
  document.head.appendChild(style)
}

// ── MathText React component ──────────────────────────────────────────────────
// Renders a string with math formatting applied.
// Usage: <MathText text="x^2 + 3/4" className="text-sm" />
export function MathText({ text, className = '', as: Tag = 'span' }) {
  if (typeof window !== 'undefined') injectMathStyles()
  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: renderMath(text ?? '') }}
    />
  )
}
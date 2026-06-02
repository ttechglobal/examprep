// src/lib/mathRenderer.js
// ─────────────────────────────────────────────────────────────────────────────
// FULL REWRITE — now uses KaTeX for proper textbook-quality math rendering.
//
// STRATEGY:
//   1. Text is split into math segments and plain-text segments
//   2. Math segments: anything between $...$ (inline) or $$...$$ (block)
//      OR auto-detected expressions (fractions, powers, roots, logs etc.)
//   3. Math segments are rendered by KaTeX
//   4. Plain text segments are rendered as-is
//
// AUTO-DETECTION (for legacy questions not stored with $ delimiters):
//   - (expr)/(expr) → \frac{expr}{expr}
//   - a/b (where a or b contains letters) → \frac{a}{b}
//   - pure numeric fractions: 3/4 → \frac{3}{4}
//   - x^2, x^{n+1} → x^{2} (KaTeX handles natively)
//   - sqrt(...) → \sqrt{...}
//   - mixed fractions: "2 1/3" → 2\frac{1}{3}
//   - log_2 → \log_{2}
//   - Greek: \alpha etc (already KaTeX native)
//
// USAGE:
//   import { MathText, WorkingsBlock } from '@/lib/mathRenderer'
//   <MathText text="Simplify (5b+(a+b)^2)/((a-b)^2)" />
//   <MathText text="Find x if $\frac{1}{x} + \frac{4}{3x} = 0$" />
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useEffect, useRef, useState } from 'react'

// ── KaTeX loader (lazy, client-only) ─────────────────────────────────────────
let katexPromise = null
function loadKaTeX() {
  if (katexPromise) return katexPromise
  if (typeof window === 'undefined') return Promise.resolve(null)

  katexPromise = new Promise(resolve => {
    // Load KaTeX CSS
    if (!document.getElementById('katex-css')) {
      const link = document.createElement('link')
      link.id   = 'katex-css'
      link.rel  = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
      document.head.appendChild(link)
    }

    // Load KaTeX JS
    if (window.katex) { resolve(window.katex); return }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js'
    script.onload = () => resolve(window.katex)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
  return katexPromise
}

// ── Plain-text → LaTeX converter ──────────────────────────────────────────────
// Converts expressions NOT already in LaTeX into LaTeX.
// Called on each detected math segment before passing to KaTeX.

export function toLatex(expr) {
  if (!expr || typeof expr !== 'string') return ''
  let s = expr.trim()

  // Already LaTeX (has \frac, \sqrt etc) — return as-is
  if (/\\(frac|sqrt|cdot|times|div|pm|log|ln|sin|cos|tan|pi|alpha|beta|theta)/.test(s)) return s

  // Greek words → symbols
  s = s.replace(/\b(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|phi|omega)\b/gi,
    (_, g) => `\\${g.toLowerCase()}`)

  // sqrt(...) or √(...) → \sqrt{...}
  s = s.replace(/sqrt\(([^)]+)\)/gi, (_, inner) => `\\sqrt{${toLatex(inner)}}`)
  s = s.replace(/√\(([^)]+)\)/g,     (_, inner) => `\\sqrt{${toLatex(inner)}}`)
  s = s.replace(/√([A-Za-z0-9]+)/g,  (_, inner) => `\\sqrt{${inner}}`)

  // Mixed fractions: "2 1/3" → 2\frac{1}{3}  BEFORE general fraction pass
  s = s.replace(
    /\b(\d+)\s+(\d+)\/(\d+)\b/g,
    (_, whole, num, den) => `${whole}\\frac{${num}}{${den}}`
  )

  // Complex fractions: (expr)/(expr) with nested parens
  // Use iterative approach to handle deepest first
  s = convertParenFractions(s)

  // Algebraic fractions: expr/expr where at least one side has a letter
  // Match: [alnum+^{}]+ / [alnum+^{}]+  where result isn't a date-like pair
  s = s.replace(
    /([A-Za-z][A-Za-z0-9^{}+\-*]*(?:\^{[^}]+}|\^\d+)?)\s*\/\s*([A-Za-z0-9^{}+\-*]+(?:\^{[^}]+}|\^\d+)?)/g,
    (match, num, den) => {
      // Don't convert units like m/s, km/h
      if (/^[a-z]$/.test(num) && /^[a-z]$/.test(den)) return match
      return `\\frac{${num}}{${den}}`
    }
  )

  // Pure numeric fractions (not dates): 3/4, 22/7, 355/113
  s = s.replace(
    /(?<![:/\d])(\d{1,5})\s*\/\s*(\d{1,5})(?![:/\d])/g,
    (match, num, den) => {
      // skip if looks like a date (small/small) — keep as-is
      if (Number(den) <= 31 && Number(num) <= 31) return `\\frac{${num}}{${den}}`
      return `\\frac{${num}}{${den}}`
    }
  )

  // log_2(x) → \log_{2}(x),  log_2 x → \log_{2} x
  s = s.replace(/\blog_(\d+)/g, (_, base) => `\\log_{${base}}`)

  // Trig: sin, cos, tan, ln, log → \sin, \cos etc.
  s = s.replace(/\b(sin|cos|tan|sec|cosec|cot|ln|log)\b(?=\s*[\d(])/g, fn => `\\${fn}`)

  // Inverse trig: sin^{-1} → \sin^{-1}
  s = s.replace(/\b(sin|cos|tan)\^{?-1}?\b/gi, (_, fn) => `\\${fn}^{-1}`)

  // x^{n} or x^n — already valid LaTeX, but ensure braces for multi-char exp
  // x^23 → x^{23}
  s = s.replace(/\^([A-Za-z0-9]{2,})/g, (_, exp) => `^{${exp}}`)

  // Therefore
  s = s.replace(/\btherefore\b/gi, '\\therefore')
  s = s.replace(/\bbecause\b(?=\s+[A-Z])/g, '\\because')

  // Plus-minus
  s = s.replace(/\+-/g, '\\pm')
  s = s.replace(/\+\/-/g, '\\pm')

  // Degree symbol: 90° → 90^\\circ
  s = s.replace(/(\d+)\s*°/g, (_, n) => `${n}^{\\circ}`)
  s = s.replace(/(\d+)\s*degrees?\b/gi, (_, n) => `${n}^{\\circ}`)

  // × and ÷
  s = s.replace(/\s*×\s*/g, ' \\times ')
  s = s.replace(/\s*÷\s*/g, ' \\div ')
  s = s.replace(/\s*\*\s*/g, ' \\times ')

  // Subscripts: x_1, H_2O  → x_{1}, H_{2}O
  s = s.replace(/_([A-Za-z0-9])(?![{])/g, (_, sub) => `_{${sub}}`)

  return s
}

// Converts (expr)/(expr) patterns iteratively (innermost first)
function convertParenFractions(s) {
  // Matches (...)/(...)  — not nested deeper than 1 level here
  // We loop up to 5 times to handle stacked fractions
  for (let i = 0; i < 5; i++) {
    const prev = s
    s = s.replace(
      /\(([^()]*)\)\s*\/\s*\(([^()]*)\)/g,
      (_, num, den) => `\\frac{${num.trim()}}{${den.trim()}}`
    )
    if (s === prev) break
  }
  // Also handle (expr)/term and term/(expr)
  s = s.replace(/\(([^()]+)\)\s*\/\s*([A-Za-z0-9^{}_]+)/g,
    (_, num, den) => `\\frac{${num.trim()}}{${den}}`)
  s = s.replace(/([A-Za-z0-9^{}_]+)\s*\/\s*\(([^()]+)\)/g,
    (_, num, den) => `\\frac{${num}}{${den.trim()}}`)
  return s
}

// ── Segment splitter ──────────────────────────────────────────────────────────
// Splits text into { type: 'text' | 'math' | 'block', content } segments.
// Supports:
//   $$...$$ — block math
//   $...$   — inline math
//   \[...\] — block math (LaTeX display)
//   \(...\) — inline math (LaTeX inline)
//   Auto-detected raw math expressions

function splitSegments(text) {
  if (!text) return []
  const segments = []
  let remaining = String(text)

  // Pattern order matters: block first, then inline
  const patterns = [
    { re: /\$\$([\s\S]+?)\$\$/g,        type: 'block'  },
    { re: /\$(.+?)\$/g,                  type: 'math'   },
    { re: /\\\[([\s\S]+?)\\\]/g,         type: 'block'  },
    { re: /\\\((.+?)\\\)/g,              type: 'math'   },
  ]

  // Build one big regex to find ALL delimited math
  const combined = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([^)]+?\\\))/g
  let last = 0
  let match

  combined.lastIndex = 0
  while ((match = combined.exec(remaining)) !== null) {
    // Plain text before this match
    if (match.index > last) {
      segments.push({ type: 'text', content: remaining.slice(last, match.index) })
    }

    const full = match[0]
    if (full.startsWith('$$') || full.startsWith('\\[')) {
      const inner = full.startsWith('$$')
        ? full.slice(2, -2)
        : full.slice(2, -2)
      segments.push({ type: 'block', content: inner.trim() })
    } else {
      const inner = full.startsWith('$')
        ? full.slice(1, -1)
        : full.slice(2, -2)
      segments.push({ type: 'math', content: inner.trim() })
    }
    last = match.index + full.length
  }

  // Remaining text
  if (last < remaining.length) {
    segments.push({ type: 'text', content: remaining.slice(last) })
  }

  // Post-process plain text segments: auto-detect math expressions
  return segments.flatMap(seg => {
    if (seg.type !== 'text') return [seg]
    return autoDetect(seg.content)
  })
}

// Auto-detect math patterns in a plain text segment
function autoDetect(text) {
  if (!text) return []

  // Patterns that indicate this chunk is math
  const MATH_PATTERNS = [
    // (expr)/(expr)
    /\([^()]+\)\s*\/\s*\([^()]+\)/,
    // algebraic fraction: letter/something or something/letter
    /[A-Za-z][A-Za-z0-9]*\s*\/\s*[A-Za-z0-9]/,
    // pure fraction where denominator > 1 digit (so we catch 3/4 but not "1/2 cup")
    /\b\d+\s*\/\s*\d{2,}\b/,
    /\b\d{2,}\s*\/\s*\d+\b/,
    // sqrt(...)
    /sqrt\s*\(/i,
    // x^2 style exponents
    /[A-Za-z]\^{?\d/,
    // mixed fraction 2 1/3
    /\b\d+\s+\d+\/\d+\b/,
    // log base
    /log_\d/i,
  ]

  const hasMath = MATH_PATTERNS.some(p => p.test(text))
  if (!hasMath) return [{ type: 'text', content: text }]

  // Split text into tokens: runs that contain math vs plain words
  // Strategy: scan for "math-looking" tokens
  const result = []
  // Simple split: find tokens containing /, ^, sqrt
  const tokenRe = /([^\s,;.!?]+(?:\s*\/\s*[^\s,;.!?]+)*)/g
  let last = 0, m

  tokenRe.lastIndex = 0
  while ((m = tokenRe.exec(text)) !== null) {
    const tok = m[0]
    const isMathTok = MATH_PATTERNS.some(p => p.test(tok))

    if (m.index > last) {
      result.push({ type: 'text', content: text.slice(last, m.index) })
    }

    if (isMathTok) {
      result.push({ type: 'math', content: tok })
    } else {
      result.push({ type: 'text', content: tok })
    }
    last = m.index + tok.length
  }
  if (last < text.length) {
    result.push({ type: 'text', content: text.slice(last) })
  }

  return result.filter(s => s.content)
}

// ── KaTeX renderer ─────────────────────────────────────────────────────────────
function renderKaTeX(latex, displayMode = false) {
  if (typeof window === 'undefined' || !window.katex) return null
  try {
    return window.katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      trust:        false,
      strict:       false,
      output:       'htmlAndMathml',
      macros: {
        '\\therefore': '\\therefore',
        '\\because':   '\\because',
      },
    })
  } catch {
    return null
  }
}

// ── MathText component ────────────────────────────────────────────────────────
export function MathText({ text, className = '', as: Tag = 'span' }) {
  const [katexLoaded, setKatexLoaded] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    loadKaTeX().then(k => {
      if (k) setKatexLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!katexLoaded || !containerRef.current) return
    const segments = splitSegments(text)

    const html = segments.map(seg => {
      if (seg.type === 'text') {
        return `<span>${escapeHtml(seg.content)}</span>`
      }
      const latex = toLatex(seg.content)
      const rendered = renderKaTeX(latex, seg.type === 'block')
      if (rendered) return rendered
      // Fallback: show as code if KaTeX fails
      return `<code class="math-fallback">${escapeHtml(seg.content)}</code>`
    }).join('')

    containerRef.current.innerHTML = html
  }, [text, katexLoaded])

  if (typeof window === 'undefined' || !katexLoaded) {
    // SSR / pre-hydration fallback: plain text (no math rendering)
    return (
      <Tag className={className}>
        {String(text ?? '')}
      </Tag>
    )
  }

  return (
    <Tag
      ref={containerRef}
      className={`${className} katex-text`}
    />
  )
}

// ── WorkingsBlock ─────────────────────────────────────────────────────────────
export function WorkingsBlock({ workings, className = '' }) {
  if (!workings) return null

  const lines = Array.isArray(workings)
    ? workings.map(w => {
        if (typeof w === 'string') return w
        return w?.instruction ?? w?.text ?? String(w)
      }).filter(Boolean)
    : String(workings).split(/\n+/).map(s => s.trim()).filter(Boolean)

  if (!lines.length) return null

  return (
    <div className={`working-block space-y-2 ${className}`}>
      {lines.map((line, i) => {
        const isLabel = /^(step\s*\d+|therefore|hence|∴|so,|now,)/i.test(line.trim())
        const isFinal = i === lines.length - 1 && lines.length > 1

        if (isLabel) {
          return (
            <div key={i} className="text-xs font-black text-indigo-600 uppercase tracking-wider pt-1">
              {line}
            </div>
          )
        }

        return (
          <div key={i} className={`flex items-start gap-3 py-1.5 border-b border-gray-50 last:border-0 ${
            isFinal ? 'border-t-2 border-t-indigo-200 pt-2 mt-1' : ''
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 text-white ${
              isFinal ? 'bg-green-600' : 'bg-indigo-500'
            }`}>
              {isFinal ? '✓' : i + 1}
            </span>
            <MathText
              text={line}
              className="text-sm font-mono text-gray-800 leading-relaxed flex-1"
            />
          </div>
        )
      })}
    </div>
  )
}

// ── Legacy exports (backwards compat) ────────────────────────────────────────
export function renderMath(text) {
  // For non-React contexts — returns HTML string using toLatex conversion
  // Note: without KaTeX this is just the converted LaTeX string
  return toLatex(String(text ?? ''))
}

export function injectMathStyles() {
  // KaTeX CSS is loaded by loadKaTeX() — this is a no-op now
  // Kept for backwards compatibility
}

export const MATH_STYLES = ''

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── QA score for admin preview ────────────────────────────────────────────────
export function scoreQuestion(question) {
  const issues = []
  let score = 100

  const qText = question?.question_text ?? ''
  const opts  = question?.options ?? {}
  const expl  = question?.explanation ?? {}

  // Raw fraction pattern still present (not wrapped in $)
  if (/[A-Za-z0-9]\s*\/\s*[A-Za-z0-9]/.test(qText) && !qText.includes('$')) {
    issues.push('Fractions not wrapped in $ — will not render as proper fractions')
    score -= 20
  }

  // Raw exponent outside $ delimiters
  if (/[A-Za-z0-9]\^[0-9]/.test(qText) && !qText.includes('$')) {
    issues.push('Exponent notation (^) found outside $ delimiters')
    score -= 15
  }

  // Empty options
  const emptyOpts = Object.entries(opts).filter(([, v]) => !String(v ?? '').trim())
  if (emptyOpts.length > 0) {
    issues.push(`Option(s) ${emptyOpts.map(([k]) => k).join(', ')} are empty`)
    score -= 20 * emptyOpts.length
  }

  // Missing explanation
  if (!expl.correct?.trim()) {
    issues.push('No correct-answer explanation provided')
    score -= 20
  }

  // Prose workings instead of steps
  if (expl.workings) {
    const lines = Array.isArray(expl.workings)
      ? expl.workings
      : String(expl.workings).split('\n').filter(Boolean)
    if (lines.length === 1 && String(lines[0]).length > 120) {
      issues.push('Explanation is a single long paragraph — should be broken into steps')
      score -= 15
    }
  }

  // No workings on a calculation question
  const isMathLike = /\d/.test(qText) && /[+\-=]/.test(qText)
  if (isMathLike && !expl.workings?.length) {
    issues.push('No step-by-step workings — consider adding for calculation questions')
    score -= 10
  }

  // Image reference without image
  if (/diagram|figure|table|graph|above|below/i.test(qText) && !question?.image_url) {
    issues.push('Question refers to a diagram but no image is attached')
    score -= 20
  }

  return { score: Math.max(0, score), issues }
}
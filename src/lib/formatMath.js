// src/lib/formatMath.js
// ─────────────────────────────────────────────────────────────────────────────
// Lightweight client-side text formatter for ExamPrep question content.
//
// Handles:
//   • Fractions:        3/4  →  ¾ styled span  (also handles negative: -3/4)
//   • Mixed fractions:  2 3/4  →  2¾ styled
//   • Naira sign:       N100 or ₦100 → properly styled ₦100
//   • Negative numbers: -10 in options (ensures sign is unambiguous)
//
// Usage (React):
//   import { formatMath } from '@/lib/formatMath'
//   <span>{formatMath('The ratio is 3/4 and costs N250')}</span>
//   — returns an array of React nodes (strings and spans)
//
// All functions return React-renderable arrays; import React where used.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Master formatter — processes a string and returns React nodes.
 * Handles: Naira, mixed fractions, fractions, negative numbers.
 */
export function formatMath(text) {
  if (!text && text !== 0) return text
  const str = String(text)

  // Split text into tokens, preserving delimiters
  // Order matters: mixed fractions before plain fractions
  const parts = tokenise(str)
  return parts.map((part, i) => renderToken(part, i))
}

// ── Tokeniser ────────────────────────────────────────────────────────────────
// Returns array of { type, raw, ...data }

function tokenise(str) {
  // Naira: N followed by digits (with optional commas/decimals), or ₦
  // Mixed fraction: digit(s) space digit/digit  e.g. "2 3/4"
  // Fraction: -? digit(s) / digit(s)  e.g. "3/4" or "-3/4"
  // Negative number at start of string or after space/open-paren: -10
  const PATTERN = /(₦\d[\d,.]*)|(N\d[\d,.]*)|(\d+\s+\d+\/\d+)|(-?\d+\/\d+)/g

  const tokens = []
  let lastIndex = 0
  let match

  PATTERN.lastIndex = 0
  while ((match = PATTERN.exec(str)) !== null) {
    const [full, nairaSymbol, nairaLetter, mixed, fraction] = match
    if (match.index > lastIndex) {
      tokens.push({ type:'text', raw: str.slice(lastIndex, match.index) })
    }
    if (nairaSymbol || nairaLetter) {
      const amount = full.replace(/^[N₦]/, '')
      tokens.push({ type:'naira', raw:full, amount })
    } else if (mixed) {
      const [whole, frac] = mixed.split(/\s+/)
      const [num, den] = frac.split('/')
      tokens.push({ type:'mixed', raw:full, whole, num, den })
    } else if (fraction) {
      const neg = fraction.startsWith('-')
      const abs = neg ? fraction.slice(1) : fraction
      const [num, den] = abs.split('/')
      tokens.push({ type:'fraction', raw:full, neg, num, den })
    }
    lastIndex = match.index + full.length
  }
  if (lastIndex < str.length) {
    tokens.push({ type:'text', raw: str.slice(lastIndex) })
  }
  return tokens
}

// ── Token renderer ────────────────────────────────────────────────────────────
function renderToken(token, key) {
  if (token.type === 'text') return token.raw

  if (token.type === 'naira') {
    return (
      <span key={key} style={{ fontFamily:'inherit', fontWeight:'inherit', whiteSpace:'nowrap' }}>
        <span style={{ fontSize:'0.85em', verticalAlign:'baseline', marginRight:1 }}>₦</span>
        {token.amount}
      </span>
    )
  }

  if (token.type === 'fraction') {
    return (
      <span key={key} style={{ display:'inline-flex', alignItems:'center', verticalAlign:'middle', lineHeight:1, gap:0, fontFamily:'inherit', fontWeight:'inherit', whiteSpace:'nowrap' }}>
        {token.neg && <span style={{ marginRight:2 }}>−</span>}
        <span style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', fontSize:'0.72em', lineHeight:1.1, verticalAlign:'middle' }}>
          <span style={{ borderBottom:'1px solid currentColor', paddingBottom:1, lineHeight:1 }}>{token.num}</span>
          <span style={{ lineHeight:1, paddingTop:1 }}>{token.den}</span>
        </span>
      </span>
    )
  }

  if (token.type === 'mixed') {
    return (
      <span key={key} style={{ display:'inline-flex', alignItems:'center', verticalAlign:'middle', gap:2, fontFamily:'inherit', fontWeight:'inherit', whiteSpace:'nowrap' }}>
        <span>{token.whole}</span>
        <span style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', fontSize:'0.72em', lineHeight:1.1, verticalAlign:'middle' }}>
          <span style={{ borderBottom:'1px solid currentColor', paddingBottom:1, lineHeight:1 }}>{token.num}</span>
          <span style={{ lineHeight:1, paddingTop:1 }}>{token.den}</span>
        </span>
      </span>
    )
  }

  return token.raw
}

/**
 * Format a single answer option value.
 * Handles the "-10 looks like -10" problem: wraps negative sign in a
 * non-ambiguous minus (−) and ensures it's clear.
 */
export function formatOption(val) {
  if (val === undefined || val === null) return val
  const str = String(val).trim()

  // Bare negative number (e.g. "-10", "-0.5") — clarify the minus sign
  // Pattern: optional whitespace, hyphen-minus, digits (with optional decimal)
  const bareNegative = /^-(\d+\.?\d*)$/.exec(str)
  if (bareNegative) {
    return (
      <span style={{ whiteSpace:'nowrap' }}>
        <span style={{ fontSize:'1em', letterSpacing:'0.05em' }}>−</span>
        {bareNegative[1]}
      </span>
    )
  }

  return formatMath(str)
}

/**
 * Format a question text string.
 * Same as formatMath but exported with a clearer name for question text.
 */
export function formatQuestion(text) {
  return formatMath(text)
}
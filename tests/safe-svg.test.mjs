import test from 'node:test'
import assert from 'node:assert/strict'
import { safeSvg } from '../src/lib/safeSvg.js'

test('keeps a plain diagram unchanged', () => {
  const svg = '<svg viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="black"/></svg>'
  assert.equal(safeSvg(svg), svg)
})

test('rejects anything that is not inline SVG', () => {
  for (const value of [null, '', '<img src=x onerror=alert(1)>', 'just text']) assert.equal(safeSvg(value), null)
})

test('strips scripts, embedded HTML, handlers and javascript links', () => {
  const out = safeSvg(`<svg onload="alert(1)"><script>alert(2)</script><foreignObject><img src=x></foreignObject><a href="javascript:alert(3)"><circle onclick='x()' onmouseover=y r="2"/></a></svg>`)
  assert.doesNotMatch(out, /script|foreignObject|onload|onclick|onmouseover|javascript:/i)
  assert.match(out, /<circle\s+r="2"\/>/)
})

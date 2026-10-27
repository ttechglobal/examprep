import { readFile, access } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import React from 'react'
import * as content from '../../src/lib/questionContent.js'
import * as passage from '../../src/lib/questionPassage.js'
import * as studentContent from '../../src/lib/studentQuestionContent.js'
import * as svg from '../../src/lib/safeSvg.js'
import * as answers from '../../src/lib/answers.js'

const require = createRequire(import.meta.url)
const swc = require('next/dist/build/swc')
const cache = new Map()
const modules = {
  '@/lib/questionContent': content, '@/lib/questionPassage': passage,
  '@/lib/studentQuestionContent': studentContent, '@/lib/safeSvg': svg, '@/lib/answers': answers,
  '@/lib/mathRenderer': { MathText: ({ text, as = 'span', className }) => React.createElement(as, { className }, String(text ?? '')), injectMathStyles() {} },
  '@/components/ui/LazyImage': { __esModule: true, default: () => null },
}

// Exercise real question/figure/inline/explanation components while stubbing
// only browser-only timers, reporting sheets and decorative artwork. KaTeX's
// SSR fallback is text; math segmentation is tested before hydration.
export async function loadStudentComponent(file, { imports = {}, expose = [] } = {}) {
  const absolute = path.resolve(file)
  const cacheable = !Object.keys(imports).length && !expose.length
  if (cacheable && cache.has(absolute)) return cache.get(absolute)
  await swc.loadBindings()
  const source = await readFile(absolute, 'utf8')
  const deps = {}
  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const name = match[1]
    if (imports[name]) deps[name] = imports[name]
    else if (modules[name]) deps[name] = modules[name]
    else if (name.endsWith('.module.css')) deps[name] = { __esModule: true, default: new Proxy({}, { get: (_, key) => `${path.basename(absolute).replace(/\W/g, '_')}_${key}` }) }
    else if (name === './FlagSheet') deps[name] = { __esModule: true, default: () => null }
    else if (name === './SessionPrimitives') deps[name] = { QuestionCountdown: () => null }
    else if (name === './art') deps[name] = { CORRECT_ANSWER_ART: '' }
    else if (name === '../IllustratedIcon') deps[name] = { __esModule: true, default: () => null, subjectArt: () => 'book' }
    else if (name.startsWith('.') || name.startsWith('@/')) {
      const base = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(absolute), name)
      let resolved
      for (const candidate of [base, `${base}.jsx`, `${base}.js`]) { try { await access(candidate); resolved = candidate; break } catch {} }
      if (!resolved) throw new Error(`Cannot resolve ${name} from ${file}`)
      deps[name] = await loadStudentComponent(resolved, { imports })
    } else deps[name] = require(name)
  }
  const testSource = expose.length ? `${source}\nexport { ${expose.join(', ')} };` : source
  const result = await swc.transform(testSource, { filename: absolute, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } })
  const compiled = { exports: {} }
  new Function('require', 'module', 'exports', result.code)(name => deps[name] ?? require(name), compiled, compiled.exports)
  if (cacheable) cache.set(absolute, compiled.exports)
  return compiled.exports
}

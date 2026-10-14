import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SourceTextModule, SyntheticModule } from 'node:vm'
import { createRequire } from 'node:module'
import * as React from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import * as helpers from '../src/lib/flashcards.js'

const require = createRequire(import.meta.url)
const { transform, loadBindings } = require('next/dist/build/swc')
await loadBindings()
async function render(view, state = [], props = {}) {
  let position = 0
  const source = await readFile(new URL(view === 'StudySession' ? '../src/components/student/flashcards/StudySession.jsx' : '../src/app/student/learn/flashcards/page.js', import.meta.url), 'utf8')
  const output = await transform(source, { filename: 'flashcards.jsx', jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'es6' } })
  const dependencies = {
    react: { ...React, useState: initial => [position < state.length ? state[position++] : typeof initial === 'function' ? initial() : initial, () => {}], useEffect: () => {}, useRef: initial => ({ current: initial }) },
    'react/jsx-runtime': jsx,
    'next/link': { default: ({ children, href, ...rest }) => React.createElement('a', { href, ...rest }, children) },
    '@/components/ui/SubjectIcon': { default: () => React.createElement('svg', { 'aria-hidden': true }) },
    '@/components/ui/QuestionFigure': { default: () => React.createElement('figure', null, 'Diagram') },
    '@/lib/flashcards': helpers,
    'next/navigation': { useRouter: () => ({ push: () => {} }) },
    '@/lib/flashcardCache': { loadFlashcards: () => {} },
    '@/app/student/learn/flashcards/flashcards.module.css': { default: new Proxy({}, { get: (_, key) => String(key) }) },
    './flashcards.module.css': { default: new Proxy({}, { get: (_, key) => String(key) }) },
  }
  const mod = new SourceTextModule(output.code)
  await mod.link(name => {
    const values = dependencies[name]
    return new SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value)
    })
  })
  await mod.evaluate()
  return renderToStaticMarkup(mod.namespace.default(props))
}
test('no subjects renders the empty state without study or resume controls', async () => {
  const markup = await render('default', ['subjects', [], null, [], {}, false, null, '', 'All subjects'])
  assert.match(markup, /No flashcards available yet/)
  assert.doesNotMatch(markup, /Continue studying|subjectCard/)
})
test('a loading error offers retry rather than reporting no content', async () => {
  const markup = await render('default', ['subjects', [], null, [], {}, false, 'Could not load flashcards.', '', 'All subjects'])
  assert.match(markup, /Try again/)
  assert.doesNotMatch(markup, /No flashcards available yet/)
})
test('both rating choices are disabled until the answer is revealed', async () => {
  const markup = await render('StudySession', [], { cards: [{ id: 'a', front_text: 'What is a cell?', back_text: 'A unit of life.' }], topic: { name: 'Cells' }, subject: { name: 'Biology' } })
  assert.match(markup, /What is a cell/)
  assert.doesNotMatch(markup, /A unit of life/)
  assert.equal((markup.match(/disabled="" data-outcome/g) || []).length, 2)
})
test('results separate outcomes and expose missed-card review', async () => {
  const markup = await render('StudySession', [{ a: 'known', b: 'almost', c: 'again' }, ['a', 'b', 'c'], 2, true, true], { cards: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], topic: { name: 'Cells' }, subject: { name: 'Biology' } })
  assert.match(markup, /Session complete!/)
  assert.match(markup, /Review missed cards/)
  assert.match(markup, /33%/)
  assert.doesNotMatch(markup, /XP/)
})
test('answer content precedes its bottom label, with no hints or mnemonic distractions', async () => {
  const markup = await render('StudySession', [{}, ['a'], 0, true, false, true], { cards: [{ id: 'a', front_text: 'Question', back_text: 'Answer content', hint: 'Hidden hint', mnemonic: 'Hidden mnemonic' }], topic: { name: 'Cells' }, subject: { name: 'Biology' } })
  assert.ok(markup.indexOf('Answer content') < markup.indexOf('>ANSWER<'))
  assert.doesNotMatch(markup, /Hidden hint|Hidden mnemonic/)
  assert.match(markup, /flipAnswer/)
  assert.match(markup, /Previous card/)
})
test('the card-turn stylesheet parses and never rotates text into the mirrored half', async () => {
  const css = await readFile(new URL('../src/app/student/learn/flashcards/flashcards.module.css', import.meta.url), 'utf8')
  require('postcss').parse(css)
  const angles = [...css.matchAll(/rotateY\((-?\d+)deg\)/g)].map(match => Number(match[1]))
  assert.ok(angles.length > 0)
  assert.ok(angles.every(angle => Math.abs(angle) < 90))
})

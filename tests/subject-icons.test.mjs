import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SourceTextModule, SyntheticModule } from 'node:vm'
import { createRequire } from 'node:module'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import * as artwork from '../src/lib/subjectArtwork.js'

const require = createRequire(import.meta.url)
const { transform, loadBindings } = require('next/dist/build/swc')
await loadBindings()
const cache = new Map()
async function load(path) {
  if (cache.has(path)) return cache.get(path)
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
  const output = await transform(source, { filename: 'icons.jsx', jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'es6' } })
  const mod = new SourceTextModule(output.code)
  cache.set(path, mod)
  await mod.link(async name => {
    if (name === '@/components/ui/SubjectIllustration') return load('src/components/ui/SubjectIllustration.jsx')
    const values = name === 'react/jsx-runtime' ? jsx : artwork
    return new SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value)
    })
  })
  await mod.evaluate()
  return mod
}

test('Battle and profile render the same registered artwork for every subject', async () => {
  const battle = (await load('src/components/battle/IllustratedIcon.jsx')).namespace
  const profile = (await load('src/components/student/profile/icons.jsx')).namespace
  for (const name of [...Object.keys(artwork.SUBJECT_ARTWORK), 'CRK', 'Financial Accounting', 'Use of English JAMB']) {
    const expected = artwork.getSubjectArtwork(name)
    for (const node of [battle.default({ name: battle.subjectArt(name) }), profile.SubjectGlyph({ name })]) {
      const html = renderToStaticMarkup(node)
      assert.ok(html.includes(expected.url), name)
      assert.ok(html.includes(`background-position:${expected.position}`), name)
      assert.match(html, /aria-hidden="true"/)
    }
  }
})

test('subjects no longer collapse to another subject, and topic fallbacks use the shared registry', async () => {
  const battle = (await load('src/components/battle/IllustratedIcon.jsx')).namespace
  assert.notEqual(battle.subjectArt('Accounting'), battle.subjectArt('Economics'))
  assert.notEqual(battle.subjectArt('Further Mathematics'), battle.subjectArt('Mathematics'))
  assert.notEqual(battle.subjectArt('Agricultural Science'), battle.subjectArt('Biology'))
  assert.equal(battle.topicArt('Unspecified topic', 'CRK'), battle.subjectArt('CRK'))
})

test('non-subject Battle illustrations retain their existing design sprites', async () => {
  const battle = (await load('src/components/battle/IllustratedIcon.jsx')).namespace
  assert.match(renderToStaticMarkup(battle.default({ name: 'clock' })), /reference-setup/)
  assert.equal(battle.topicArt('Algebra', 'Mathematics'), 'algebra')
})

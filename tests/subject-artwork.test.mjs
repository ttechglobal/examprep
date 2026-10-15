import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { SUBJECT_THEME } from '../src/lib/subjectTheme.js'
import { SUBJECT_ARTWORK, getSubjectArtwork } from '../src/lib/subjectArtwork.js'

test('every supported subject has dedicated artwork, independent of flashcard content', () => {
  for (const name of Object.keys(SUBJECT_THEME).filter(name => name !== 'default')) {
    assert.ok(SUBJECT_ARTWORK[name], `Missing artwork for ${name}`)
  }
  assert.ok(SUBJECT_ARTWORK['The Lekki Headmaster'])
  assert.equal(new Set(Object.values(SUBJECT_ARTWORK).map(art => `${art.url}:${art.position}`)).size, Object.keys(SUBJECT_ARTWORK).length)
})

test('every registered image is present in the project', () => {
  for (const art of Object.values(SUBJECT_ARTWORK)) {
    assert.ok(existsSync(new URL(`../public${art.url}`, import.meta.url)), `Missing file ${art.url}`)
  }
})

test('case, spacing and exam suffixes automatically choose the same subject artwork', () => {
  for (const name of Object.keys(SUBJECT_ARTWORK)) {
    for (const suffix of ['', ' WAEC', ' JAMB', ' (NECO)', ' — IGCSE']) {
      assert.deepEqual(getSubjectArtwork(`  ${name.toUpperCase()}${suffix}  `), SUBJECT_ARTWORK[name])
    }
  }
})

test('database abbreviations and common subject aliases use their dedicated artwork', () => {
  for (const [alias, canonical] of [
    ['CRK', 'Christian Religious Studies'], ['CRS', 'Christian Religious Studies'],
    ['Christian Religious Knowledge', 'Christian Religious Studies'], ['IRK', 'Islamic Religious Studies'],
    ['Financial Accounting', 'Accounting'], ['Computer Studies', 'Computer Science'],
    ['English Literature', 'Literature in English'], ['Further Maths', 'Further Mathematics'],
    ['Lekki Headmaster', 'The Lekki Headmaster'],
  ]) assert.deepEqual(getSubjectArtwork(alias), SUBJECT_ARTWORK[canonical])
})

test('unknown future subjects keep a readable generic book fallback', () => {
  assert.deepEqual(getSubjectArtwork('New subject'), SUBJECT_ARTWORK['English Language'])
  assert.deepEqual(getSubjectArtwork(null), SUBJECT_ARTWORK['English Language'])
})

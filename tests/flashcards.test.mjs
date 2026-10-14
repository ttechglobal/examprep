import test from 'node:test'
import assert from 'node:assert/strict'
import { ratingCounts, validRatings, subjectProgress, subjectCategory, subjectColor } from '../src/lib/flashcards.js'

test('changing a rating moves a card between outcomes rather than counting it twice', () => {
  const ratings = { a: 'again', b: 'known', c: 'almost' }
  assert.deepEqual(ratingCounts(ratings), { known: 1, almost: 1, again: 1 })
  ratings.a = 'known'
  assert.deepEqual(ratingCounts(ratings), { known: 2, almost: 1, again: 0 })
})
test('resume discards deleted cards and invalid ratings', () => {
  assert.deepEqual(validRatings([{ id: 'a' }, { id: 'b' }], { a: 'known', b: 'other', deleted: 'known' }), { a: 'known' })
  assert.deepEqual(validRatings([{ id: 'a' }], null), {})
})
test('empty subjects and stale progress never produce invalid or overfilled percentages', () => {
  const progress = { a: { subjectName: 'Physics', done: 12 }, b: { subjectName: 'Biology', done: 7 } }
  assert.deepEqual(subjectProgress(progress, 'Physics', 10), { known: 10, percent: 100 })
  assert.deepEqual(subjectProgress(progress, 'Chemistry', 0), { known: 0, percent: 0 })
})
test('subjects beyond the reference have a category and theme', () => {
  for (const name of ['Physics', 'Biology', 'Chemistry', 'Economics', 'Government', 'Literature in English', 'Further Mathematics', 'Commerce', 'Unknown subject']) {
    assert.ok(subjectCategory(name))
    assert.match(subjectColor(name), /^#[a-f\d]{6}$/i)
  }
})

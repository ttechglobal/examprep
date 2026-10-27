import test from 'node:test'
import assert from 'node:assert/strict'
import { dailyNeedsReview, dailyReviewIndexes } from '../src/lib/dailyReview.js'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { loadStudentComponent } from './helpers/student-renderer.mjs'

const challenges = [
  { question: { id: 'first' }, state: { completed: true, correct: true, attempts_used: 1 } },
  { question: { id: 'second' }, state: { completed: true, correct: true, attempts_used: 2 } },
  { question: { id: 'third' }, state: { completed: true, correct: false, attempts_used: 2 } },
  { question: { id: 'active' }, state: { completed: false, correct: false, attempts_used: 1 } },
  { question: null, state: { completed: true, correct: false } },
]

test('daily review includes second-attempt successes and exhausted attempts', () => {
  assert.equal(dailyNeedsReview(challenges[0]), false)
  assert.equal(dailyNeedsReview(challenges[1]), true)
  assert.equal(dailyNeedsReview(challenges[2]), true)
  assert.equal(dailyNeedsReview(challenges[3]), false)
  assert.deepEqual(dailyReviewIndexes(challenges, 'missed'), [1, 2])
})

test('daily review reveals only completed questions and preserves their original numbers', () => {
  assert.deepEqual(dailyReviewIndexes(challenges), [0, 1, 2])
  assert.deepEqual(dailyReviewIndexes([]), [])
  assert.deepEqual(dailyReviewIndexes([challenges[3]]), [])
})

test('daily recap offers focused review and uses actual question counts', async () => {
  const { DoneScreen } = await loadStudentComponent('src/app/student/daily-challenge/page.js', {
    imports: {
      '@/app/student/layout': {}, '@/contexts/PointsContext': {}, '@/contexts/ThemeContext': {},
    }, expose: ['DoneScreen'],
  })
  const html = renderToStaticMarkup(React.createElement(DoneScreen, { challenges: [challenges[1]], timings: [null], countdown: '' }))
  assert.match(html, /All correct!/)
  assert.match(html, /of 1 correct today/)
  assert.match(html, /Needs review \(1\)/)
  assert.match(html, /Review all answers/)
  assert.doesNotMatch(html, /Completed daily answers/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { battleAnswers, battleReviewIndexes, battleReviewResults } from '../src/lib/battleReview.js'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { loadStudentComponent } from './helpers/student-renderer.mjs'

const items = [
  { options: ['One', 'Two'], mineIdx: 0, correctIdx: 0 },
  { options: ['One', 'Two'], mineIdx: 0, correctIdx: 1 },
  { options: ['One', 'Two'], mineIdx: null, correctIdx: 1 },
]

test('battle review separates mistakes and timeouts while preserving original question numbers', () => {
  assert.deepEqual(battleReviewIndexes(items, 'missed'), [1, 2])
  assert.deepEqual(battleReviewIndexes(items, 'wrong'), [1])
  assert.deepEqual(battleReviewIndexes(items, 'skipped'), [2])
  assert.deepEqual(battleReviewIndexes(items, 'all'), [0, 1, 2])
  assert.deepEqual(battleReviewResults(items), { total: 3, correct: 1, wrong: 1, skipped: 1, missed: 2, percent: 33 })
})

test('missing answer and missing key never become a correct answer', () => {
  assert.equal(battleAnswers([{ options: [], mineIdx: null, correctIdx: null }])[0].isCorrect, false)
  assert.equal(battleAnswers([{ options: ['One'], mineIdx: -1, correctIdx: -1 }])[0].isCorrect, false)
  assert.equal(battleAnswers([{ options: ['One'], mineIdx: 5, correctIdx: 5 }])[0].selectedIdx, null)
})

test('early battle results count only supplied rounds and empty reviews are safe', () => {
  assert.equal(battleReviewResults(items.slice(0, 1)).total, 1)
  assert.equal(battleReviewResults([]).percent, 0)
  assert.deepEqual(battleReviewIndexes(items.slice(0, 1), 'missed'), [])
})

const frame = {
  BattleWorld: ({ children, header, dock }) => React.createElement('main', null, header, children, dock),
  BattleSign: ({ children }) => React.createElement('h1', null, children),
  GameButton: ({ secondary, arrow, children, ...props }) => React.createElement('button', props, children),
  styles: {},
}

test('empty battle filters retain all filter controls and the return action', async () => {
  const { default: BattleReview } = await loadStudentComponent('src/components/battle/arena/BattleReview.jsx', { imports: { '../BattleWorld': frame } })
  const html = renderToStaticMarkup(React.createElement(BattleReview, { items: items.slice(0, 1), initialFilter: 'missed' }))
  assert.match(html, /No answers in this filter/)
  assert.match(html, /Return to results/)
  assert.match(html, /Filter battle answers/)
  assert.match(html, /All answers \(1\)/)
  assert.match(html, /Needs review \(0\)/)
})

test('focused battle review starts at the original missed question and reveals its correct answer', async () => {
  const { default: BattleReview } = await loadStudentComponent('src/components/battle/arena/BattleReview.jsx', { imports: { '../BattleWorld': frame } })
  const rows = items.map((item, index) => ({ ...item, text: `Question stem ${index + 1}`, question: { options: item.options, correct_answer: 'B' } }))
  const html = renderToStaticMarkup(React.createElement(BattleReview, { items: rows, initialFilter: 'missed' }))
  assert.match(html, /Review question 2 of 3/)
  assert.match(html, /Question stem 2/)
  assert.match(html, /Correct Answer/)
  assert.doesNotMatch(html, /Question stem 1/)
})

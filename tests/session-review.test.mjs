import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { answerState, sessionResults, reviewIndexes, topicPerformance, sessionName } from '../src/lib/sessionReview.js'
import { loadStudentComponent } from './helpers/student-renderer.mjs'

const questions = [
  { id: '1', text: 'First question', options: { A: 'One', B: 'Two' }, correct_answer: 'A', subject_id: 'english', subject_name: 'English', topic_name: 'Language' },
  { id: '2', text: 'Second question', options: { A: 'One', B: 'Two' }, correct_answer: 'B', subject_id: 'literature', subject_name: 'Literature', topic_name: 'Language' },
  { id: '3', text: 'Third question', options: { A: 'One', B: 'Two' }, correct_answer: 'A', subject_id: 'english', subject_name: 'English', topic_name: 'Grammar' },
]
const answers = [{ selectedIdx: 0, isCorrect: true }, { selectedIdx: 0, isCorrect: false }]

test('summary counts use actual session questions, treating missing answers as skipped', () => {
  assert.deepEqual(sessionResults(questions, answers), { total: 3, correct: 1, wrong: 1, skipped: 1, missed: 2, percent: 33 })
  assert.equal(answerState({ selectedIdx: null, isCorrect: true }), 'skipped')
  assert.equal(sessionResults(questions, [...answers, null, { selectedIdx: 0, isCorrect: true }]).correct, 1)
  assert.equal(sessionResults([], []).percent, 0)
})

test('review filters retain original question indexes and include every skipped question', () => {
  assert.deepEqual(reviewIndexes(questions, answers, 'all'), [0, 1, 2])
  assert.deepEqual(reviewIndexes(questions, answers, 'missed'), [1, 2])
  assert.deepEqual(reviewIndexes(questions, answers, 'wrong'), [1])
  assert.deepEqual(reviewIndexes(questions, answers, 'skipped'), [2])
  assert.deepEqual(reviewIndexes(questions, questions.map(() => ({ selectedIdx: 0, isCorrect: true })), 'missed'), [])
})

test('mock topics with the same name in different subjects remain separate', () => {
  const rows = topicPerformance(questions, answers)
  assert.equal(rows.length, 3)
  assert.equal(rows.find(row => row.name === 'Language · English').percent, 100)
  assert.equal(rows.find(row => row.name === 'Language · Literature').percent, 0)
  assert.equal(rows[0].percent, 0)
  assert.equal(new Set(rows.map(row => row.id)).size, 3)
})

test('summaries identify the mode that was actually played', () => {
  assert.equal(sessionName({ mode: 'practice', sessionType: 'study' }), 'Study')
  assert.equal(sessionName({ mode: 'quick5' }), 'Quick 5')
  assert.equal(sessionName({ mode: 'timed' }), 'Speed Round')
  assert.equal(sessionName({ mode: 'mock' }), 'Mock Exam')
})

test('summary offers direct mistake review and reports skipped questions without answer rows', async () => {
  const { default: Summary } = await loadStudentComponent('src/components/session/SessionSummary.jsx')
  const html = renderToStaticMarkup(React.createElement(Summary, { questions, answers, config: { mode: 'practice', sessionType: 'study' }, durationSecs: 61.7 }))
  assert.match(html, /Study Summary/)
  assert.match(html, /1 out of 3 correct/)
  assert.match(html, /Review incorrect and skipped/)
  assert.match(html, /1 incorrect · 1 skipped/)
  assert.match(html, /1m 2s/)
})

test('filtered review starts at the correct original question and renders the existing filter controls', async () => {
  const { ReviewSession } = await loadStudentComponent('src/components/session/ReviewSession.jsx')
  const html = renderToStaticMarkup(React.createElement(ReviewSession, { questions, answers, initialFilter: 'missed', onDone() {} }))
  assert.match(html, /Second question/)
  assert.doesNotMatch(html, /First question/)
  assert.match(html, /Review filters/)
  assert.match(html, /Needs review/)
  const skipped = renderToStaticMarkup(React.createElement(ReviewSession, { questions, answers, initialFilter: 'skipped', onDone() {} }))
  assert.match(skipped, /Third question/)
  assert.match(skipped, /Not answered/)
  assert.match(skipped, /Back to summary/)
  const empty = renderToStaticMarkup(React.createElement(ReviewSession, { questions, answers: [], initialFilter: 'wrong', onDone() {} }))
  assert.match(empty, /No questions match this filter/)
  assert.match(empty, /Show all answers/)
})

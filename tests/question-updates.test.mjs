import test from 'node:test'
import assert from 'node:assert/strict'
import { updateQuestionWithTimestamp, insertQuestionsWithSourceId } from '../src/lib/questionUpdates.js'

test('question update supports older schema without losing the requested changes', async () => {
  const calls = []
  const result = await updateQuestionWithTimestamp(async changes => {
    calls.push(changes)
    return calls.length === 1 ? { error: { code: 'PGRST204', message: "Could not find the 'updated_at' column" } } : { data: { id: 'saved' }, error: null }
  }, { is_active: false })
  assert.equal(result.data.id, 'saved')
  assert.ok(calls[0].updated_at)
  assert.deepEqual(calls[1], { is_active: false })
})

test('question update does not retry authorization or other schema failures', async () => {
  for (const error of [{ code: '42501', message: 'Forbidden' }, { code: 'PGRST204', message: 'Missing instruction_text' }]) {
    let calls = 0
    const result = await updateQuestionWithTimestamp(async () => { calls++; return { error } }, { is_active: false })
    assert.equal(result.error, error)
    assert.equal(calls, 1)
  }
})

test('single and bulk imports retain source identity when the optional sdash_id column is missing', async () => {
  const row = { question_text: 'The stage was silent.', sdash_id: 'mq_1', explanation: { correct: 'Personification.', content_review: { status: 'needs_review' } }, is_active: false }
  for (const payload of [row, [row]]) {
    const calls = []
    const result = await insertQuestionsWithSourceId(async rows => {
      calls.push(rows)
      return calls.length === 1 ? { error: { code: 'PGRST204', message: "Could not find the 'sdash_id' column of 'questions' in the schema cache" } } : { data: { id: 'saved' } }
    }, payload)
    assert.equal(result.data.id, 'saved')
    const fallback = Array.isArray(calls[1]) ? calls[1][0] : calls[1]
    assert.equal('sdash_id' in fallback, false)
    assert.equal(fallback.explanation.import_source_id, 'mq_1')
    assert.equal(fallback.explanation.correct, row.explanation.correct)
    assert.deepEqual(fallback.explanation.content_review, row.explanation.content_review)
    assert.equal(fallback.is_active, false)
    assert.equal(row.sdash_id, 'mq_1')
  }
})

test('source ID compatibility does not retry other schema errors or permissions failures', async () => {
  for (const error of [{ code: 'PGRST204', message: "Missing 'instruction_text' column" }, { code: '42501', message: 'Forbidden sdash_id' }]) {
    let count = 0
    const result = await insertQuestionsWithSourceId(async () => { count++; return { error } }, { sdash_id: 'mq_1' })
    assert.equal(result.error, error)
    assert.equal(count, 1)
  }
})

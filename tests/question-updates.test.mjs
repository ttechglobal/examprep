import test from 'node:test'
import assert from 'node:assert/strict'
import { updateQuestionWithTimestamp } from '../src/lib/questionUpdates.js'

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

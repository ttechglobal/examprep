import test from 'node:test'
import assert from 'node:assert/strict'
import { fillName, hasNameToken } from '../src/supabase/functions/send-notifications/personalization.js'

test('both brace forms, spaces and casing replace the entire name token', () => {
  assert.equal(fillName('Hi {name}, {{ NAME }} and { name }!', '  Ada   Okafor '), 'Hi Ada, Ada and Ada!')
  assert.equal(fillName('{{name}}, hello {NAME}', 'Chidi'), 'Chidi, hello Chidi')
})

test('unknown or blank names get a readable fallback', () => {
  for (const name of [null, undefined, '', '   ']) {
    assert.equal(fillName('Hello {{name}}', name), 'Hello there')
  }
})

test('recipient names are inserted literally without replacement expansion', () => {
  assert.equal(fillName('Hello {name}', '$& Okafor'), 'Hello $&')
})

test('each recipient gets their own name without changing the template', () => {
  const template = '{name}, your missions are ready.'
  assert.equal(fillName(template, 'Ada'), 'Ada, your missions are ready.')
  assert.equal(fillName(template, 'Chidi'), 'Chidi, your missions are ready.')
  assert.equal(template, '{name}, your missions are ready.')
})

test('personalization detection agrees with replacement and leaves ordinary text alone', () => {
  for (const token of ['{name}', '{{name}}', '{ NAME }', '{{ Name }}']) assert.equal(hasNameToken(token), true)
  assert.equal(hasNameToken('Your missions are ready.'), false)
  assert.equal(fillName('Your missions are ready.', 'Ada'), 'Your missions are ready.')
})

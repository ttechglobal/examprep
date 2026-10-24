import test from 'node:test'
import assert from 'node:assert/strict'
import { languageCleanupReasons } from '../src/lib/languageQuestionCleanup.js'

test('cleanup keeps standalone book recall, quoted titles and grammar sentences', () => {
  for (const question_text of [
    "In Chapter 1 'Dusk', what causes Mr. Bepo Adewale's emotional breakdown?",
    "The nickname 'The Lekki Headmaster' originated from Bepo's ability to:",
    "Choose the word that fills the gap: 'Despite the rain, the event was a success.'",
    'The Shakespearean sonnet differs from the Petrarchan sonnet by ending with a',
  ]) assert.deepEqual(languageCleanupReasons({ question_text }), [])
  assert.deepEqual(languageCleanupReasons({ question_text: 'What helps a writer?', options: { A: 'Quotation', B: 'Plot' } }), [])
})

test('cleanup identifies source context, target annotations, misclassified sections and encoding damage', () => {
  for (const q of [
    { question_text: 'Choose the underlined word.' },
    { question_text: 'What did the speaker imply?' },
    { question_text: 'Read the passage and answer the question.' },
    { question_text: 'What is the device?', passage_text: 'Section heading' },
    { question_text: 'The poet\ufffds tone is' },
  ]) assert.ok(languageCleanupReasons(q).length)
})

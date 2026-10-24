import test from 'node:test'
import assert from 'node:assert/strict'
import { questionReadingLayout, splitEmbeddedPassage } from '../src/lib/questionPassage.js'

test('embedded short literary quotation is displayed separately without losing source words', () => {
  const source = 'The river laughed. The literary device used in this excerpt is'
  const parts = splitEmbeddedPassage(source)
  assert.equal(parts.passage_text, 'The river laughed.')
  assert.equal(parts.question_text, 'The literary device used in this excerpt is')
  assert.equal(parts.passage_text + ' ' + parts.question_text, source)
})

test('verse lines and attribution are retained before a direct question', () => {
  const source = 'The sun has gone.\nThe moon is here.\n— A poet\nWhat is the mood?'
  const parts = splitEmbeddedPassage(source)
  assert.equal(parts.passage_text, 'The sun has gone.\nThe moon is here.\n— A poet')
  assert.equal(parts.question_text, 'What is the mood?')
})

test('stored passages and duplicated instruction prefixes do not repeat in the displayed question', () => {
  const q = { instruction_text: 'Read carefully:', passage_text: 'The river laughed.', question_text: 'Read carefully: The river laughed. What device is used?' }
  const layout = questionReadingLayout(q)
  assert.equal(layout.question_text, 'What device is used?')
  assert.equal(layout.passage_text, q.passage_text)
  assert.equal(layout.derived, false)
  assert.equal(q.question_text, 'Read carefully: The river laughed. What device is used?')
})

test('ordinary questions, book recall and ambiguous boundaries remain intact', () => {
  for (const source of [
    'Which literary device is used when Bepo recalls past events in his career?',
    'Choose the sentence that describes the mood: The speaker is calm.',
    "In Chapter 1 'Dusk', what causes Mr. Bepo's emotional breakdown?",
    'A poem that is shaped in the image of the object it talks about is',
    'The novel ends on a note emphasizing:',
    'The river <u>laughed. The literary device in the excerpt is</u>',
  ]) assert.equal(splitEmbeddedPassage(source), null, source)
})

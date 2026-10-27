import test from 'node:test'
import assert from 'node:assert/strict'
import { questionDiagram, questionDiagramMetadata, sourceDiagramSignature, buildSourceDiagramPrompt } from '../src/lib/questionDiagrams.js'
import { normalizeQuestionContent, contentIssues } from '../src/lib/questionContent.js'
import { reviewIssues, canAcceptReviewIssue } from '../src/lib/questionReview.js'
import { buildImportEnrichPrompt, mergeImportEnrichment, questionHasImage } from '../src/lib/questionParser.js'
import { mergeHeldQuestions } from '../src/lib/heldQuestionsStore.js'

const source = { id: 19, question: 'Find angle ABC.', image_description: 'Triangle ABC has AB = AC. Angle BAC is 40°. No other angles are supplied.', options: { A: '70°', B: '40°' }, correct_answer: 'A' }
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><path d="M100 300 L300 60 L500 300 Z"/><text x="300" y="50">A: 40°</text><text x="80" y="330">B</text><text x="500" y="330">C</text></svg>'
function checked(q) {
  const next = { ...q, explanation: { ...q.explanation, question_diagram: { ...questionDiagramMetadata(q), svg, reviewed: true } } }
  next.explanation.question_diagram.signature = sourceDiagramSignature(next)
  return next
}

test('source detection covers descriptions, images and option image references across subjects', () => {
  for (const q of [source, { question_text: 'Identify the organ.', diagram_description: 'A labelled kidney.' }, { question_text: 'Find the voltage.', image: 'A circuit with a 6 V battery and two resistors in series.' }, { question_text: 'Identify the device.', image: 'https://example.com/device.png' }, { question_text: 'Choose the structure.', options: { A: '<img src="https://example.com/a.png" alt="Molecule A">', B: 'None' } }]) {
    assert.equal(questionHasImage(q), true)
    assert.equal(questionDiagram(q).ready, false)
    assert.ok(contentIssues(q).some(reason => reason.startsWith('Source diagram needs review')))
  }
  assert.equal(questionHasImage({ question_text: 'What figure of speech is used here?' }), false)
  assert.equal(questionHasImage({ question_text: 'Calculate 2 + 3.', explanation: { illustration_prompt: 'Draw five counters.' } }), false)
  const normalized = normalizeQuestionContent({ question: 'Choose the structure.', option: { a: '<img src="https://example.com/a.png" alt="Molecule A">', b: 'None' } })
  assert.equal(questionDiagram(normalized).references[0].field, 'option a')
  assert.equal(questionDiagram(normalized).references[0].url, 'https://example.com/a.png')
})

test('an unreviewed required diagram blocks publication and cannot be acknowledged away', () => {
  const q = { question_text: source.question, options: source.options, correct_answer: 'A', image_description: source.image_description }
  const issue = reviewIssues(q).find(reason => reason.startsWith('Source diagram needs review'))
  assert.ok(issue)
  assert.equal(canAcceptReviewIssue(issue, q), false)
  assert.equal(questionDiagram({ ...q, explanation: { svg_diagram: svg } }).ready, false)
  assert.equal(questionDiagram({ ...q, explanation: { question_diagram: { reviewed: true } } }).ready, false)
})

test('checking a real source asset permits enrichment and survives normalization and merging', () => {
  const reviewed = checked(source)
  assert.equal(questionDiagram(reviewed).ready, true)
  assert.equal(questionDiagram(normalizeQuestionContent(reviewed)).ready, true)
  assert.equal(questionDiagram({ ...reviewed, question: 'Find angle BAC.' }).ready, false)
  const response = { source_id: '19', question_snippet: source.question, verified_answer: 'A', confidence: 'certain', context_status: 'complete', explanation: { answer_note: 'The base angles are equal.' } }
  const merged = mergeImportEnrichment([reviewed], [response], 'WAEC', 'Mathematics')[0]
  assert.equal(questionDiagram(merged).ready, true)
  assert.equal(merged.explanation.question_diagram.svg, svg)
  assert.deepEqual(contentIssues(merged), [])
  const unchecked = mergeImportEnrichment([source], [{ ...response, explanation: { ...response.explanation, question_diagram: { svg, reviewed: true } } }], 'WAEC', 'Mathematics')[0]
  assert.equal(questionDiagram(unchecked).ready, false, 'AI cannot supply its own source approval')
})

test('source recreation prompts preserve given information and exclude solution keys and explanations', () => {
  const prompt = buildSourceDiagramPrompt({ ...source, explanation: { answer_note: 'SECRET SOLUTION: base angle 70°.' } }, 'Mathematics')
  assert.match(prompt, /Triangle ABC has AB = AC/)
  assert.match(prompt, /SOURCE QUESTION ID: 19/)
  assert.match(prompt, /not a solution illustration/i)
  assert.match(prompt, /stop and list exactly what is missing/)
  assert.doesNotMatch(prompt, /SECRET SOLUTION/)
})

test('all subject enrichment prompts assess visual benefit with a reason and preserve source descriptions', () => {
  for (const subject of ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Geography', 'Agricultural Science', 'English']) {
    const prompt = buildImportEnrichPrompt([source], 'WAEC', subject)
    assert.match(prompt, /Source diagram description: Triangle ABC/)
    assert.match(prompt, /illustration_reason/)
    assert.match(prompt, /source question diagrams separate/i)
    assert.match(prompt, /source question OR a verified calculation/)
    assert.doesNotMatch(prompt, /statistics, logs — always ""|if in doubt, draw it|DEFAULT IS EMPTY/)
  }
  assert.match(buildImportEnrichPrompt([checked(source)], 'WAEC', 'Mathematics'), /Reviewed source diagram SVG[^\n]*<svg/)
})

test('refetching a held paper preserves completed diagram work and distinct source questions', () => {
  const done = checked(source)
  const newQuestion = { ...source, id: 20, question: 'Find angle ACB.' }
  const merged = mergeHeldQuestions([done], [source, newQuestion, newQuestion])
  assert.equal(merged.length, 2)
  assert.equal(questionDiagram(merged[0]).ready, true)
  assert.equal(merged[1].id, 20)
})

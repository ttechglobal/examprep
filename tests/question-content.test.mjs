import * as questionPassage from '../src/lib/questionPassage.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as questionContent from '../src/lib/questionContent.js'
import { contentText, normalizeQuestionContent, normalizeQuestionTargets, contentIssues } from '../src/lib/questionContent.js'
import { buildImportEnrichPrompt, mergeImportEnrichment, parseEnrichment, questionHasImage } from '../src/lib/questionParser.js'

const raw = { id: 42, question: 'According to the passage above, what did the speaker decide to do next?', section: '<p>First paragraph.</p><p>Second <u>important</u> paragraph.<br>Another line.</p>', instruction: 'Choose the best answer.', option: ['Leave', 'Stay'], answer: 'a' }
const enrichment = { source_id: '42', question_snippet: raw.question, verified_answer: 'A', context_status: 'complete', topic_title: 'Comprehension', explanation: { answer_note: 'The speaker leaves.' } }

test('normalization preserves source paragraphs, verse and safe inline marks without executable HTML', () => {
  const q = normalizeQuestionContent(raw)
  assert.equal(q.section, 'First paragraph.\n\nSecond <u>important</u> paragraph.\nAnother line.')
  assert.deepEqual(q.option, { a: 'Leave', b: 'Stay' })
  assert.equal(q.instruction_text, raw.instruction)
  assert.equal(contentText('<script>alert(1)</script><u onclick="bad()">word</u><img src=x onerror=bad()>'), '<u>word</u>')
  assert.equal(contentText('<strong>A</strong> <em>B</em> <sup>2</sup>'), '<strong>A</strong> <em>B</em> <sup>2</sup>')
  assert.equal(contentText('<span style="text-decoration: underline">ch<span>urch</span></span>'), '<u>church</u>')
  assert.equal(contentText('<U>word</U>'), '<u>word</u>')
})

test('enrichment receives the complete context and stable identity, without provider answer key', () => {
  const prompt = buildImportEnrichPrompt([raw], 'JAMB', 'English')
  assert.match(prompt, /SOURCE_ID: 42/)
  assert.match(prompt, /First paragraph\.\n\nSecond <u>important<\/u>/)
  assert.match(prompt, /Choose the best answer/)
  assert.match(prompt, /missing-context rule overrides/)
  assert.doesNotMatch(prompt, /Source answer: a/)
})

test('merge preserves source instruction, passage image, annotations and options', () => {
  const q = mergeImportEnrichment([{ ...raw, passage_image_url: 'https://example.com/passage.png' }], [enrichment], 'JAMB', 'English')[0]
  assert.equal(q._mismatch, false)
  assert.equal(q.instruction_text, raw.instruction)
  assert.match(q.passage_text, /<u>important<\/u>/)
  assert.equal(q.passage_image_url, 'https://example.com/passage.png')
  assert.equal(q.options.A, 'Leave')
  assert.deepEqual(contentIssues(q), [])
})

test('current MyQuest correct_answer is normalized and embedded extracts split without rewriting', () => {
  const source = { id: 1, question: 'The river laughed. The literary device in this excerpt is', options: { A: 'Personification', B: 'Simile' }, correct_answer: 'A' }
  assert.equal(normalizeQuestionContent(source).answer, 'A')
  const response = { source_id: '1', question_snippet: source.question, verified_answer: 'A', context_status: 'complete', source_content: { passage_text: 'The river laughed.', question_text: 'The literary device in this excerpt is' } }
  const q = mergeImportEnrichment([source], [response], 'JAMB', 'Literature')[0]
  assert.equal(q.passage_text, 'The river laughed.')
  assert.equal(q.question_text, response.source_content.question_text)
  assert.equal(q.sdash_answer, 'A')
  assert.deepEqual(contentIssues(q), [])
  const bad = mergeImportEnrichment([source], [{ ...response, source_content: { ...response.source_content, passage_text: 'The river sang.' } }], 'JAMB', 'Literature')[0]
  assert.equal(bad._contextStatus, 'missing')
  assert.ok(contentIssues(bad).length)
  const changedWords = { ...response, source_content: { passage_text: 'Theriver laughed.', question_text: response.source_content.question_text } }
  assert.equal(mergeImportEnrichment([source], [changedWords], 'JAMB', 'Literature')[0]._contextStatus, 'missing')
})

test('similar stems from different passages cannot silently reuse an enrichment', () => {
  const questions = [raw, { ...raw, id: 43, section: 'Different passage.' }]
  const merged = mergeImportEnrichment(questions, [enrichment], 'JAMB', 'English')
  assert.equal(merged[0]._mismatch, false)
  assert.equal(merged[1]._mismatch, true)
  const legacy = mergeImportEnrichment(questions, [{ ...enrichment, source_id: undefined }], 'JAMB', 'English')
  assert.ok(legacy.every(q => q._mismatch))
})

test('missing context can be returned without forcing an answer and remains blocked', () => {
  const missing = { ...enrichment, context_status: 'missing', verified_answer: '', explanation: { answer_note: 'The extract is missing.' } }
  assert.equal(parseEnrichment(JSON.stringify([missing])).valid, true)
  const q = mergeImportEnrichment([raw], [missing], 'JAMB', 'English')[0]
  assert.ok(contentIssues(q).some(issue => issue.includes('missing context')))
  assert.ok(contentIssues({ question_text: raw.question }).some(issue => issue.includes('passage')))
})

test('underline targets include letter-level marks and unresolved content is blocked', () => {
  assert.deepEqual(contentIssues({ question_text: 'Choose the sound of the underlined letters: <u>ch</u>urch' }), [])
  assert.ok(contentIssues({ question_text: 'Choose the underlined word.' }).length)
  assert.ok(contentIssues({ question_text: '<u>unfinished' }).length)
  assert.ok(contentIssues({ question_text: 'A question', passage_text: contentText({ text: 'unknown shape' }) }).length)
  assert.ok(contentIssues({ question_text: 'A question', passage_image_url: 'javascript:alert(1)' }).length)
  assert.equal(questionHasImage({ question_text: 'What figure of speech is used here?' }), false)
  assert.equal(questionHasImage({ question_text: 'This fertility figure conceals wide variations.' }), false)
  assert.equal(questionHasImage({ question_text: 'Consider the figure below.' }), true)
})

test('asterisk targets are normalized using the full source and instruction, with literary italics preserved', () => {
  const source = { id: 12, instruction: 'Choose the option nearest in meaning to the underlined phrase.', question: 'His speech was *brief and to the point*.', option: { a: 'Concise', b: 'Long' }, answer: 'a', section: 'A *quiet* river.\nA still night.' }
  const q = normalizeQuestionContent(source)
  assert.equal(q.question, 'His speech was <u>brief and to the point</u>.')
  assert.equal(q.section, source.section)
  assert.deepEqual(contentIssues(q), [])
  assert.equal(normalizeQuestionTargets('The *quiet* river.', 'Identify the imagery.'), 'The *quiet* river.')
  assert.equal(normalizeQuestionTargets('The <u>quiet</u> river in *River Song*.', 'Choose the underlined word.'), 'The <u>quiet</u> river in *River Song*.')
  assert.ok(contentIssues({ instruction_text: source.instruction, question_text: 'His speech was *brief and' }).some(issue => issue.includes('unclosed')))
  assert.ok(contentIssues({ question_text: 'Choose the underlined word.', options: { A: '**Concise**' } }).some(issue => issue.includes('target is missing')))
  const merged = mergeImportEnrichment([source], [{ source_id: '12', question_snippet: 'His speech was *brief and', verified_answer: 'A', context_status: 'complete', explanation: { answer_note: 'Concise means brief and to the point.' } }], 'JAMB', 'English')[0]
  assert.equal(merged._mismatch, false)
  assert.deepEqual(contentIssues(merged), [])
  const prompt = buildImportEnrichPrompt([source], 'JAMB', 'English')
  assert.match(prompt, /<u>brief and to the point<\/u>/)
  assert.match(prompt, /FULL source/)
  assert.match(prompt, /context_reason/)
})

test('missing-context reports name the reported material and explain when the target is already present', () => {
  const issues = contentIssues({ instruction_text: 'Choose the underlined word.', question_text: 'A *feasible* plan.', _contextStatus: 'missing', _contextReason: 'Underlined word not marked.' })
  assert.equal(issues.length, 1)
  assert.match(issues[0], /Reported reason: Underlined word not marked/)
  assert.match(issues[0], /already has a marked target; regenerate/)
})

test('review preview shows options, both keys and explanation without an answer click', async () => {
  const require = createRequire(import.meta.url)
  const swc = require('next/dist/build/swc')
  await swc.loadBindings()
  const compiled = await swc.transform(await readFile(new URL('../src/components/admin/QuestionReviewPreview.jsx', import.meta.url), 'utf8'), {
    filename: 'QuestionReviewPreview.jsx', jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' },
  })
  const module = { exports: {} }
  const localRequire = name => name === './QuestionContent' ? { __esModule: true, default: ({ question }) => React.createElement('div', null, question.question_text), ContentText: ({ text }) => React.createElement('span', null, text) } : name === '@/lib/questionContent' ? questionContent : name === '@/lib/mathRenderer' ? { MathText: ({ text, as = 'span' }) => React.createElement(as, null, text) } : require(name)
  new Function('require', 'module', 'exports', compiled.code)(localRequire, module, module.exports)
  const html = renderToStaticMarkup(React.createElement(module.exports.default, { question: { question_text: 'Which word?', options: { a: 'Concise', b: 'Long' }, correct_answer: 'A', sdash_answer: 'B', explanation: { steps: [{ title: 'Check meaning', lines: ['Compare the words in context.'] }], answer_note: 'Concise is the synonym.', wrong_options: { B: 'Long is the opposite.' } } } }))
  assert.match(html, /Answer options/)
  assert.match(html, /Current answer key/)
  assert.match(html, /Provider answer \(reference\)/)
  assert.match(html, /Concise is the synonym/)
  assert.match(html, /Compare the words in context/)
  assert.match(html, /Long is the opposite/)
  assert.match(html, /Current key/)
  const missing = renderToStaticMarkup(React.createElement(module.exports.default, { question: { question_text: 'Which word?', options: { A: 'One' }, _contextStatus: 'missing' } }))
  assert.match(missing, /No answer supplied/)
  assert.match(missing, /did not verify an answer/)
})

test('admin renderer emits semantic inline marks, full passage and a safe image link', async () => {
  const require = createRequire(import.meta.url)
  const swc = require('next/dist/build/swc')
  await swc.loadBindings()
  const compiled = await swc.transform(await readFile(new URL('../src/components/admin/QuestionContent.jsx', import.meta.url), 'utf8'), {
    filename: 'QuestionContent.jsx', jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' },
  })
  const module = { exports: {} }
  // MathText's SSR fallback is plain text; test the surrounding real component.
  const localRequire = name => name === '@/lib/questionPassage' ? questionPassage : name.endsWith('.module.css') ? { default: new Proxy({}, { get: (_, key) => key }), __esModule: true } : name === '@/lib/questionContent' ? questionContent : name === '@/lib/mathRenderer' ? { MathText: ({ text }) => React.createElement('span', null, text) } : require(name)
  new Function('require', 'module', 'exports', compiled.code)(localRequire, module, module.exports)
  const html = renderToStaticMarkup(React.createElement(module.exports.default, { question: {
    instruction_text: 'Choose the opposite.', passage_text: 'First line.\n\nLast line.', passage_image_url: 'https://example.com/read.png',
    question_text: '<u>ch</u>urch <em>title</em> <strong>emphasis</strong> <script>bad()</script>',
  } }))
  assert.match(html, /<u><span>ch<\/span><\/u>/)
  assert.match(html, /<em><span>title<\/span><\/em>/)
  assert.match(html, /<strong><span>emphasis<\/span><\/strong>/)
  assert.match(html, /First line\.\n\nLast line\./)
  assert.match(html, /https:\/\/example.com\/read.png/)
  assert.doesNotMatch(html, /bad\(\)|<script/)
  assert.match(html, /white-space:pre-wrap/)
  const marked = renderToStaticMarkup(React.createElement(module.exports.default, { question: {
    instruction_text: 'Choose the underlined phrase.', question_text: 'His speech was *brief and to the point*.', passage_text: 'The *quiet* river.\nLast line.',
  } }))
  assert.match(marked, /<u><span>brief and to the point<\/span><\/u>/)
  assert.match(marked, /<em><span>quiet<\/span><\/em>/)
})


test('matching ignores safe emphasis and typographic quotes while keeping distinct mathematical signs', () => {
  const source = { id: 8, question: 'Find <u>x</u> when x + 4 = 9 and explain your choice.', options: { A: '5', B: '13' }, correct_answer: 'A' }
  const good = { ...enrichment, source_id: '8', question_snippet: 'Find x when x + 4 = 9 and explain your choice.' }
  assert.equal(mergeImportEnrichment([source], [good], 'JAMB', 'Math')[0]._mismatch, false)
  const wrong = mergeImportEnrichment([source], [{ ...good, question_snippet: 'Find x when x - 4 = 9 and explain your choice.' }], 'JAMB', 'Math')[0]
  assert.equal(wrong._mismatch, true)
  assert.match(wrong._matching.reason, /snippet differs/)
})

test('a long standalone literature question is not flagged solely for its length', () => {
  assert.deepEqual(contentIssues({ subject: 'Literature in English', question_text: 'Which statement best describes the relationship between the central character and the community when considering their conflicting expectations, values, responsibilities and ambitions throughout the novel?' }), [])
})

test('a verified exact source split permits a question-only snippet without a false mismatch', () => {
  const source = { id: 11, question: 'The river laughed. Which literary device is used?', options: { A: 'Personification', B: 'Simile' }, correct_answer: 'A' }
  const response = { ...enrichment, source_id: '11', question_snippet: 'Which literary device is used?', source_content: { passage_text: 'The river laughed.', question_text: 'Which literary device is used?' } }
  assert.equal(mergeImportEnrichment([source], [response], 'WAEC', 'Literature')[0]._mismatch, false)
})


test('duplicate source IDs and similar opening text never silently share enrichment', () => {
  const sameId = mergeImportEnrichment([raw, { ...raw, question: 'A completely different question with the same provider ID.' }], [enrichment], 'JAMB', 'English')
  assert.ok(sameId.every(item => item._mismatch))
  assert.ok(sameId.every(item => !item._matching.responseFound))
  const prefix = 'Choose the correct interpretation of the following statement about the character and their decisions '
  const sources = [{ ...raw, id: 1, question: prefix + 'in chapter one.' }, { ...raw, id: 2, question: prefix + 'in chapter two.' }]
  const legacy = { ...enrichment, source_id: undefined, question_snippet: sources[1].question }
  const merged = mergeImportEnrichment(sources, [legacy], 'JAMB', 'Literature')
  assert.equal(merged[0]._mismatch, true)
  assert.equal(merged[1]._mismatch, false)
})

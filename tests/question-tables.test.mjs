import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { questionTableBlocks } from '../src/lib/questionTables.js'
import { contentText, normalizeQuestionContent, contentIssues } from '../src/lib/questionContent.js'
import { buildImportEnrichPrompt, mergeImportEnrichment } from '../src/lib/questionParser.js'
import { loadStudentComponent } from './helpers/student-renderer.mjs'
import { questionDiagram } from '../src/lib/questionDiagrams.js'

test('accounting schedules retain labels, currency, signs, decimals and trailing question', () => {
  const text = 'Use the following information to answer this question. Opening capital: 10,800; Drawings: 2,500; Bank: ₦1,000.50 DR. Calculate closing capital.'
  const blocks = questionTableBlocks(text)
  assert.deepEqual(blocks.find(block => block.type === 'table').rows, [['Opening capital', '10,800'], ['Drawings', '2,500'], ['Bank', '₦1,000.50 DR']])
  assert.ok(blocks.some(block => block.text?.includes('Calculate closing capital.')))
  assert.deepEqual(questionTableBlocks('Balance: (2,560)\nCash: −100.25'), [{ type: 'table', headers: ['Item', 'Value'], rows: [['Balance', '(2,560)'], ['Cash', '−100.25']] }])
})

test('ordinary prose, verse, multi-part values and single facts are not guessed into tables', () => {
  for (const text of ['Opening stock is 9,220 and purchases are 60,540.', 'The river: 10\nIts voice: quiet', 'Capital: Abu GH¢40,000, Ojo GH¢20,000; Drawings: Abu GH¢18,000, Ojo GH¢12,000', 'The sum: 10; why: because.', 'Time: 12:30; Date: 1/2/2021']) assert.deepEqual(questionTableBlocks(text), [{ type: 'text', text }])
})

test('source HTML tables become portable explicit columns without losing zero or blank cells', () => {
  const html = '<table><caption>Trial balance</caption><tr><th>Item</th><th>Debit (₦)</th><th>Credit (₦)</th></tr><tr><td>Bank</td><td>0</td><td></td></tr><tr><td>Capital</td><td></td><td>10,800</td></tr></table>'
  const normalized = contentText(html)
  const table = questionTableBlocks(normalized).find(block => block.type === 'table')
  assert.deepEqual(table.headers, ['Item', 'Debit (₦)', 'Credit (₦)'])
  assert.deepEqual(table.rows, [['Bank', '0', ''], ['Capital', '', '10,800']])
  assert.match(normalized, /Trial balance/)
  assert.equal(contentText(normalized), normalized)
  const q = normalizeQuestionContent({ id: 77, question: 'Calculate capital.', section: html, option: { a: '10,800', b: '0' } })
  const prompt = buildImportEnrichPrompt([q], 'WAEC', 'Accounting')
  assert.match(prompt, /\| Bank \| 0 \|  \|/)
  const merged = mergeImportEnrichment([q], [{ source_id: '77', question_snippet: q.question, context_status: 'complete', verified_answer: 'A', explanation: { correct: 'Explanation.' } }], 'WAEC', 'Accounting')[0]
  assert.equal(merged.passage_text, normalized)
  const unsupported = normalizeQuestionContent({ question: 'Choose.', section: '<table><tr><td colspan="2">Capital</td></tr><tr><td>Cash</td><td>100</td></tr></table>' })
  assert.ok(contentIssues(unsupported).some(issue => issue.includes('unsupported structure')))
  assert.match(unsupported.section, /Cash \| 100/)
})

test('explicit tables serve other subjects and malformed rows remain visible', () => {
  const text = '| Time (s) | Distance (m) |\n| --- | --- |\n| 0 | 0 |\n| 2 | 12.50 |'
  assert.deepEqual(questionTableBlocks(text)[0].rows, [['0', '0'], ['2', '12.50']])
  const malformed = text + '\n| 3 |'
  assert.deepEqual(questionTableBlocks(malformed), [{ type: 'text', text: malformed }])
  assert.equal(questionDiagram({ question_text: 'From the table above, calculate speed.', passage_text: text }).required, false)
  assert.equal(questionDiagram({ question_text: 'From the table above, calculate speed.' }).required, true)
  assert.equal(questionDiagram({ question_text: 'Use the graph above and table above.', passage_text: text }).required, true)
  const source = { question: 'From the table above, find cash.', section: '<table><tr><th>Item</th><th>Amount</th></tr><tr><td>Cash</td><td>100</td></tr></table>' }
  assert.equal(questionDiagram(normalizeQuestionContent(source)).required, false)
})

test('admin and student displays share accessible schedules with exact source values', async () => {
  const question = { question_text: 'Use the following information to answer this question. Opening capital: 10,800; Drawings: 2,500. Calculate closing capital.' }
  for (const file of ['src/components/student/StudentQuestionContent.jsx', 'src/components/admin/QuestionContent.jsx']) {
    const { default: Component } = await loadStudentComponent(file, { imports: { '@/lib/questionDiagrams': await import('../src/lib/questionDiagrams.js') } })
    const html = renderToStaticMarkup(React.createElement(Component, { question }))
    assert.match(html, /<table/)
    assert.match(html, /scope="col"/)
    assert.match(html, /scope="row"/)
    assert.match(html, /10,800/)
    assert.match(html, /2,500/)
    assert.match(html, /Calculate closing capital/)
    assert.match(html, /tabindex="0"/)
  }
})

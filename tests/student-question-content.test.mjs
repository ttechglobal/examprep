import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { loadStudentComponent } from './helpers/student-renderer.mjs'
import { publicQuestionContent, explanationObject } from '../src/lib/studentQuestionContent.js'
import { normaliseOptions, checkCorrect, correctIndex } from '../src/lib/answers.js'
import { splitPassageCredit } from '../src/lib/questionPassage.js'

const givenSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="10" y="30">AB = 5 cm</text></svg>'
const solutionSvg = '<svg xmlns="http://www.w3.org/2000/svg"><text>SOLUTION SECRET</text></svg>'
const literature = {
  id: 'poem', instruction_text: 'Read the extract and choose the best answer.',
  passage_text: 'The *quiet* river laughed.\nIts silver voice grew loud.\n\n— A. Poet, “River Song”',
  text: 'The figure of speech in the underlined phrase **river laughed** is',
  options: { a: 'Personification', b: 'Simile' }, correct_answer: 'a',
  explanation: { answer_note: '**Personification** gives human actions to non-human things.', wrong_options: { B: 'No comparison using *like* or *as* occurs.' } },
}

test('display projection supplies given diagrams and passages without leaking solutions or review notes', () => {
  const result = publicQuestionContent({ ...literature, explanation: { correct: 'ANSWER SECRET', svg_diagram: solutionSvg, content_review: { note: 'PRIVATE REVIEW NOTE' }, question_diagram: { svg: givenSvg, reviewed: true, signature: 'PRIVATE SIGNATURE' } } })
  assert.equal(result.svg_diagram, givenSvg)
  assert.equal(result.passage_text, literature.passage_text)
  assert.equal(result.instruction_text, literature.instruction_text)
  assert.doesNotMatch(JSON.stringify(result), /ANSWER SECRET|SOLUTION SECRET|PRIVATE/)
  assert.equal(publicQuestionContent({ explanation: { question_diagram: { svg: givenSvg, reviewed: false } } }).svg_diagram, null)
  assert.equal(publicQuestionContent({ image_url: 'javascript:alert(1)' }).image_url, null)
})

test('source annotations and explanation emphasis coexist with intact math', async () => {
  const { default: ContentText } = await loadStudentComponent('src/components/ui/ContentText.jsx')
  const html = renderToStaticMarkup(React.createElement(ContentText, { text: '**target** <em>title</em> <sup>2</sup> $x*y*z$ <script>bad()</script>' }))
  assert.match(html, /<u>/)
  assert.match(html, /<em>/)
  assert.match(html, /<sup>/)
  assert.match(html, /\$x\*y\*z\$/)
  assert.doesNotMatch(html, /bad\(\)|<script/)
  const explanation = renderToStaticMarkup(React.createElement(ContentText, { text: '**Important**', emphasis: 'bold' }))
  assert.match(explanation, /<strong>/)
  assert.doesNotMatch(explanation, /<u>/)
})

test('student question content preserves verse, attribution, target and full reading context', async () => {
  const { default: Content } = await loadStudentComponent('src/components/student/StudentQuestionContent.jsx')
  const html = renderToStaticMarkup(React.createElement(Content, { question: literature }))
  assert.match(html, /aria-label="Instructions"/)
  assert.match(html, /aria-label="Passage or extract"/)
  assert.match(html, /<em>/)
  assert.match(html, /river laughed/)
  assert.match(html, /Its silver voice grew loud/)
  assert.match(html, /aria-label="Author or source"/)
  assert.match(html, /— A\. Poet/)
  assert.match(html, /<u>/)
  const legacy = renderToStaticMarkup(React.createElement(Content, { question: { text: 'The river laughed. The literary device in this excerpt is' } }))
  assert.match(legacy, /Passage \/ extract/)
  assert.match(legacy, /The river laughed/)
})

test('only marked source credits are separated from verse, with original wording retained', () => {
  assert.deepEqual(splitPassageCredit('First line.\nSecond line.\n\n— A. Poet, “River Song”'), { text: 'First line.\nSecond line.', credit: '— A. Poet, “River Song”' })
  assert.equal(splitPassageCredit('First line.\nSource: Wole Soyinka, The Lion and the Jewel').credit, 'Source: Wole Soyinka, The Lion and the Jewel')
  assert.equal(splitPassageCredit('First line.\nBy William Shakespeare').credit, 'By William Shakespeare')
  for (const text of ['First line.\nThe river grew quiet.', 'First line.\n— the river grew quiet.', 'First line.\nBy the quiet river', 'First line.\nWole Soyinka']) {
    assert.deepEqual(splitPassageCredit(text), { text, credit: null })
  }
})

test('practice does not reveal answer feedback before completion; review shows both answers and explanations', async () => {
  const { QuestionCard } = await loadStudentComponent('src/components/session/QuestionCard.jsx')
  const active = renderToStaticMarkup(React.createElement(QuestionCard, { question: literature, qIndex: 0, alreadyAnswered: { selectedIdx: 1, isCorrect: false } }))
  assert.match(active, /Passage or extract/)
  assert.match(active, /Personification/)
  assert.doesNotMatch(active, /data-state="correct"|No comparison|gives human actions/)
  const review = renderToStaticMarkup(React.createElement(QuestionCard, { question: literature, qIndex: 0, reviewMode: true, alreadyAnswered: { selectedIdx: 1, isCorrect: false } }))
  assert.match(review, /data-state="correct"/)
  assert.match(review, /data-state="wrong"/)
  const { ExplanationBlock } = await loadStudentComponent('src/components/session/ExplanationBlock.jsx')
  const explanation = renderToStaticMarkup(React.createElement(ExplanationBlock, { question: literature, selectedKey: 'B', isCorrect: false }))
  assert.match(explanation, /Your answer/)
  assert.match(explanation, /Correct Answer/)
  assert.match(explanation, /gives human actions/)
  assert.match(explanation, /<strong>/)
  const skipped = renderToStaticMarkup(React.createElement(ExplanationBlock, { question: literature, selectedKey: null, isCorrect: false }))
  assert.match(skipped, /Not answered/)
})

test('source and solution SVGs render separately and both support enlargement', async () => {
  const { default: Figure } = await loadStudentComponent('src/components/ui/QuestionFigure.jsx')
  const q = { explanation: { question_diagram: { reviewed: true, svg: givenSvg }, svg_diagram: solutionSvg } }
  const given = renderToStaticMarkup(React.createElement(Figure, { question: q }))
  assert.match(given, /Enlarge question diagram/)
  assert.match(given, /data:image\/svg\+xml/)
  assert.doesNotMatch(given, /SOLUTION%20SECRET|<svg/)
  const solution = renderToStaticMarkup(React.createElement(Figure, { question: { svg_diagram: solutionSvg }, label: 'Solution illustration' }))
  assert.match(solution, /Enlarge solution illustration/)
})

test('battle question content receives the same instruction, extract and marked target', async () => {
  const { default: Card } = await loadStudentComponent('src/components/battle/arena/QuestionCard.jsx')
  const html = renderToStaticMarkup(React.createElement(Card, { text: literature.text, figure: literature, subject: 'Literature' }))
  assert.match(html, /Instructions/)
  assert.match(html, /River Song/)
  assert.match(html, /<u>/)
  assert.doesNotMatch(html, /gives human actions/)
})

test('imported lowercase option keys and answer letters agree with display and grading', () => {
  const options = normaliseOptions(literature.options)
  assert.deepEqual(options, ['Personification', 'Simile'])
  assert.equal(checkCorrect(options, 0, 'a'), true)
  assert.equal(correctIndex(options, 'a'), 0)
  assert.deepEqual(explanationObject('Plain explanation'), { correct: 'Plain explanation' })
})

test('RPC migration adds display content to live and closed rounds while preserving answer gating', async () => {
  const sql = await readFile('src/supabase/migrations/20261026_student_question_content.sql', 'utf8')
  const helper = sql.slice(sql.indexOf('create or replace function public.student_question_content'), sql.indexOf('revoke all'))
  assert.doesNotMatch(helper, /'correct_answer'|'correct_index'|'explanation'\s*,|'signature'|'note'/)
  assert.match(helper, /instruction_text/)
  const live = sql.slice(sql.indexOf('if v_live then'), sql.indexOf('end if;', sql.indexOf('if v_live then')))
  assert.match(live, /student_question_content\(to_jsonb\(q\)\)/)
  assert.doesNotMatch(live, /'correct_index'|'explanation'|'correct_answer'/)
  assert.match(sql, /if v_role is null then return public.pvp_err/)
  assert.match(sql, /generate_series\(0, m.rounds_closed - 1\)/)
  assert.match(sql, /p_exam in \('WAEC', 'JAMB'\)/)
})

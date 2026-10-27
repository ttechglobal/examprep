import * as questionDiagrams from '../src/lib/questionDiagrams.js'
import * as questionReview from '../src/lib/questionReview.js'
import * as questionUpdates from '../src/lib/questionUpdates.js'
import * as questionContent from '../src/lib/questionContent.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SourceTextModule, SyntheticModule } from 'node:vm'
import * as exams from '../src/lib/constants.js'
import { buildQuestionPrompt, buildImportEnrichPrompt, mergeImportEnrichment } from '../src/lib/questionParser.js'

test('NECO is an admin exam and remains unavailable to students', () => {
  assert.deepEqual(exams.ALL_EXAMS, ['WAEC', 'JAMB', 'NECO'])
  assert.deepEqual(exams.STUDENT_EXAMS, ['WAEC', 'JAMB'])
})

test('NECO curriculum imports retain their exam through topics and subtopics', async () => {
  const mod = new SourceTextModule(await readFile(new URL('../src/lib/curriculumParser.js', import.meta.url), 'utf8'))
  await mod.link(() => new SyntheticModule(['ALL_EXAMS'], function () {
    this.setExport('ALL_EXAMS', exams.ALL_EXAMS)
  }))
  await mod.evaluate()
  const result = mod.namespace.parseCurriculum(JSON.stringify({
    subject: 'Mathematics', exam_types: ['NECO'],
    topics: [{ title: 'Algebra', subtopics: [{ title: 'Equations' }] }],
  }))
  assert.equal(result.valid, true, JSON.stringify(result.errors))
  assert.deepEqual(Array.from(result.data.topics[0].exam_types), ['NECO'])
  assert.deepEqual(Array.from(result.data.topics[0].subtopics[0].exam_types), ['NECO'])
})

test('retained question enrichment supports NECO after removing Sdash', () => {
  assert.equal(typeof buildQuestionPrompt, 'function')
  assert.equal(typeof mergeImportEnrichment, 'function')
  const prompt = buildImportEnrichPrompt([], 'NECO', 'Mathematics', [])
  assert.match(prompt, /NECO/)
  assert.doesNotMatch(prompt, /Cambridge/)
})

async function saveQuestions(examType, subjectExam, questions = null, reviewOnly = false) {
  const inserted = []
  const coverageCalls = []
  const db = {
    from(table) {
      if (table === 'subjects') return { select: () => ({ eq: () => ({ single: async () => ({ data: { exam_type: subjectExam } }) }) }) }
      assert.equal(table, 'questions')
      return { insert: row => {
        inserted.push(row)
        return { select: () => ({ single: async () => ({ data: { id: 'saved-question' } }) }) }
      } }
    },
    rpc: async (...args) => { coverageCalls.push(args); return { error: null } },
  }
  const deps = {
    '@/lib/questionReview': questionReview,
    '@/lib/questionUpdates': questionUpdates,
    '@/lib/questionDiagrams': questionDiagrams,
    '@/lib/questionContent': questionContent,
    '@/lib/constants': exams,
    '@/lib/adminAuth': { requireAdmin: async () => null },
    '@supabase/supabase-js': { createClient: () => db },
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
  }
  const mod = new SourceTextModule(await readFile(new URL('../src/app/api/admin/questions/route.js', import.meta.url), 'utf8'))
  await mod.link(name => new SyntheticModule(Object.keys(deps[name]), function () {
    for (const [key, value] of Object.entries(deps[name])) this.setExport(key, value)
  }))
  await mod.evaluate()
  const response = await mod.namespace.POST({ json: async () => ({
    subjectId: 'subject', examType, reviewOnly,
    questions: questions ?? [{ question_text: 'Find x', options: { a: '1', b: '2' }, correct_answer: 'a', year: '2024' }],
  }) })
  return { response, inserted, coverageCalls }
}

test('admin saves actual NECO questions under NECO with aligned exam fields', async () => {
  const { response, inserted } = await saveQuestions('NECO', 'NECO')
  assert.equal(response.status, 200)
  assert.equal((await response.json()).saved, 1)
  assert.equal(inserted[0].exam_type, 'NECO')
  assert.deepEqual(Array.from(inserted[0].exam_types), ['NECO'])
})

test('source diagram descriptions cannot save without a checked diagram, even in draft mode', async () => {
  const question = { question_text: 'Find angle ABC.', options: { A: '70', B: '40' }, correct_answer: 'A', image_description: 'Triangle ABC with AB = AC and angle A = 40 degrees.' }
  const blocked = await saveQuestions('NECO', 'NECO', [question])
  assert.equal((await blocked.response.json()).saved, 0)
  assert.equal(blocked.inserted.length, 0)
  const draft = await saveQuestions('NECO', 'NECO', [question], true)
  const result = await draft.response.json()
  assert.equal(result.saved, 0)
  assert.match(result.errors.join(' '), /Add and check the source diagram/)
  assert.equal(draft.inserted.length, 0)
  assert.equal(draft.coverageCalls.length, 0)
  const checked = { ...question, explanation: { question_diagram: { required: true, reviewed: true, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="5" y="20">ABC</text></svg>' } } }
  checked.explanation.question_diagram.signature = questionDiagrams.sourceDiagramSignature(checked)
  const ready = await saveQuestions('NECO', 'NECO', [checked])
  assert.equal((await ready.response.json()).saved, 1)
  assert.equal(ready.inserted[0].has_image, true)
  assert.equal(ready.inserted[0].explanation.question_diagram.reviewed, true)
})

test('admin rejects legacy shared exam tags and mismatched subject exams', async () => {
  for (const [exam, subject] of [['BOTH', 'WAEC'], ['NECO', 'WAEC']]) {
    const { response, inserted } = await saveQuestions(exam, subject)
    assert.equal(response.status, 400)
    assert.equal(inserted.length, 0)
  }
})


test('admin save retains reading content and refuses unresolved context server-side', async () => {
  const valid = { question_text: 'What does the underlined word mean: <u>calm</u>?', passage_text: 'Line one.\n\nLine two.', instruction_text: 'Choose the opposite meaning.', options: { A: 'Agitated', B: 'Quiet' }, correct_answer: 'A' }
  const { response, inserted } = await saveQuestions('JAMB', 'JAMB', [valid, { ...valid, question_text: 'According to the passage above, why?', passage_text: null }, { ...valid, _contextStatus: 'missing' }, { ...valid, _mismatch: true }])
  const body = await response.json()
  assert.equal(body.saved, 1)
  assert.equal(body.errors.length, 3)
  assert.equal(inserted[0].passage_text, valid.passage_text)
  assert.equal(inserted[0].instruction_text, valid.instruction_text)
  assert.equal(inserted[0].question_text, valid.question_text)
})


test('flagged import drafts persist review reasons without publishing or increasing coverage', async () => {
  const { response, inserted, coverageCalls } = await saveQuestions('JAMB', 'JAMB', [{ question_text: 'Choose the underlined word.', options: { A: 'One', B: 'Two' }, correct_answer: 'A', year: '2025' }], true)
  const data = await response.json()
  assert.equal(data.saved, 1)
  assert.equal(data.flagged, 1)
  assert.equal(inserted[0].is_active, false)
  assert.equal(inserted[0].is_flagged, true)
  assert.equal(inserted[0].explanation.content_review.status, 'needs_review')
  assert.match(inserted[0].explanation.content_review.issues.join(' '), /underline target/)
  assert.equal(coverageCalls.length, 0)
})


test('explicit warning acceptance is validated and persisted; edits and required-content defects remain blocked', async () => {
  const base = { question_text: 'Which number is even?', options: { A: '2', B: '3' }, correct_answer: 'A', _answerDisagreement: true, year: '2025' }
  const accepted = { ...base, _reviewDecision: { note: 'Checked the source and solution; A is correct.', issues: questionReview.allReviewIssues(base), signature: questionReview.reviewSignature(base) } }
  const { response, inserted } = await saveQuestions('JAMB', 'JAMB', [accepted, { ...accepted, correct_answer: 'B' }])
  assert.equal((await response.json()).saved, 1)
  assert.equal(inserted[0].is_active, true)
  assert.equal(inserted[0].explanation.content_review.status, 'reviewed')
  assert.match(inserted[0].explanation.content_review.accepted_issues.join(' '), /disagree/)
  const broken = { ...base, question_text: 'Choose the underlined word.' }
  broken._reviewDecision = { note: 'Looks fine', issues: questionReview.allReviewIssues(broken), signature: questionReview.reviewSignature(broken) }
  const blocked = await saveQuestions('JAMB', 'JAMB', [broken])
  assert.equal((await blocked.response.json()).saved, 0)
})

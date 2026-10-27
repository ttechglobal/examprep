import * as questionDiagrams from '../src/lib/questionDiagrams.js'
import * as questionReview from '../src/lib/questionReview.js'
import * as questionUpdates from '../src/lib/questionUpdates.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SourceTextModule, SyntheticModule } from 'node:vm'
import * as content from '../src/lib/questionContent.js'

async function route(path, db, provider = {}) {
  const deps = {
    '@/lib/questionReview': questionReview,
    '@/lib/questionUpdates': questionUpdates,
    '@/lib/questionDiagrams': questionDiagrams,
    '@/lib/questionContent': content,
    '@/lib/constants': { ALL_EXAMS: ['JAMB', 'WAEC', 'NECO'] },
    '@/lib/adminAuth': { requireAdmin: async () => null },
    '@supabase/supabase-js': { createClient: () => db },
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/server/myquest': { MyQuestError: class extends Error {}, isShortText: value => typeof value === 'string' && !!value, ...provider },
  }
  const mod = new SourceTextModule(await readFile(new URL(path, import.meta.url), 'utf8'))
  await mod.link(name => new SyntheticModule(Object.keys(deps[name]), function () {
    for (const [key, value] of Object.entries(deps[name])) this.setExport(key, value)
  }))
  await mod.evaluate()
  return mod.namespace
}

test('raw MyQuest bulk import preserves passage and instruction and rejects missing context', async () => {
  const filters = []
  const db = { from(table) {
    if (table === 'subjects') return { select: () => ({ eq: () => ({ single: async () => ({ data: { exam_type: 'JAMB' } }) }) }) }
    const query = { select: () => query, eq: (key, value) => { filters.push([key, value]); return query }, in: async () => ({ data: [] }) }
    return query
  } }
  const provider = { fetchAllQuestions: async () => ({ questions: [
    { id: 1, question: 'Choose the meaning of <u>calm</u>.', instruction: 'Choose the opposite.', section: 'First line.<br>Second line.', options: ['Agitated', 'Quiet'], correct_answer: 'A' },
    { id: 2, question: 'According to the passage above, why?', option: { a: 'One', b: 'Two' }, answer: 'b' },
    { id: 3, question: 'Choose the underlined word.', option: { a: 'One', b: 'Two' }, answer: 'b' },
  ] }) }
  const api = await route('../src/app/api/admin/myquest/import/route.js', db, provider)
  const response = await api.POST({ json: async () => ({ exam: 'JAMB', examYearId: '2025', mqSubject: 'English', year: '2025', subjectId: 'english', examType: 'JAMB', dryRun: true }) })
  const data = await response.json()
  assert.equal(data.new, 1)
  assert.equal(data.errors.length, 0)
  assert.equal(data.flagged, 2)
  assert.equal(data.questions.filter(q => q.is_active === false && q.is_flagged).length, 2)
  assert.equal(data.questions[0].passage_text, 'First line.\nSecond line.')
  assert.equal(data.questions[0].instruction_text, 'Choose the opposite.')
  assert.deepEqual(data.questions[0].options, { a: 'Agitated', b: 'Quiet' })
  assert.equal(data.questions[0].correct_answer, 'a')
  assert.ok(filters.some(([key, value]) => key === 'is_active' && value === true))
  assert.ok(filters.some(([key, value]) => key === 'year' && value === '2025'))
})

test('bulk import returns description-only diagram questions for holding without saving drafts', async () => {
  const db = { from(table) {
    if (table === 'subjects') return { select: () => ({ eq: () => ({ single: async () => ({ data: { exam_type: 'WAEC' } }) }) }) }
    const query = { select: () => query, eq: () => query, in: async () => ({ data: [] }) }
    return query
  } }
  const provider = { fetchAllQuestions: async () => ({ questions: [{ id: 19, question: 'Find angle ABC.', image_description: 'Triangle ABC: angle A = 40 degrees, AB = AC.', options: { A: '70', B: '40' }, correct_answer: 'A' }] }) }
  const api = await route('../src/app/api/admin/myquest/import/route.js', db, provider)
  const response = await api.POST({ json: async () => ({ exam: 'WAEC', examYearId: '2025', mqSubject: 'Mathematics', year: '2025', subjectId: 'maths', examType: 'WAEC' }) })
  const result = await response.json()
  assert.equal(result.new, 0)
  assert.equal(result.flagged, 0)
  assert.equal(result.saved, 0)
  assert.equal(result.held, 1)
  assert.equal(result.held_questions[0].id, 19)
  assert.match(result.held_questions[0].explanation.question_diagram.description, /angle A = 40/)
  assert.equal(result.held_questions[0].explanation.question_diagram.reviewed, false)
})

test('hiding retains content and restoring cannot bypass unresolved context', async () => {
  let stored
  const db = { from(table) {
    assert.equal(table, 'hidden_questions')
    return {
      insert(row) { stored = row; return { select: () => ({ single: async () => ({ data: { id: 'hidden' } }) }) } },
      select: () => ({ eq: () => ({ single: async () => ({ data: { ...stored, id: 'hidden' } }) }) }),
    }
  } }
  const api = await route('../src/app/api/admin/questions/hidden/route.js', db)
  await api.POST({ json: async () => ({ question_text: 'According to the passage above, why?', instruction_text: 'Answer from the extract.', passage_image_url: 'https://example.com/image.png', content_review_issues: ['Enrichment reported missing context.'] }) })
  assert.equal(stored.instruction_text, 'Answer from the extract.')
  assert.equal(stored.passage_image_url, 'https://example.com/image.png')
  const response = await api.PATCH({ json: async () => ({ id: 'hidden', subject_id: 'english' }) })
  assert.equal(response.status, 400)
  assert.match((await response.json()).error, /missing context/)
})

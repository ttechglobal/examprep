import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SourceTextModule, SyntheticModule } from 'node:vm'
import { existingQuestionFormatting, repairTextEncoding, reviewIssues } from '../src/lib/questionReview.js'
import * as review from '../src/lib/questionReview.js'
import * as updates from '../src/lib/questionUpdates.js'

test('provider resolution replaces conflicting reasoning and preserves missing-context blocks', () => {
  const q = { question_text: 'Who speaks in the extract above?', options: { A: 'Hermia', B: 'Helena' }, correct_answer: 'A', sdash_answer: 'B', _answerDisagreement: true, ai_confidence: 'unsure', _contextStatus: 'missing', explanation: { intro: 'Hermia speaks', wrong_options: { B: 'Helena does not speak' }, hint: 'Think Hermia' } }
  const resolved = review.resolveReviewedAnswer(q, 'B', 'Helena speaks to Hermia in this scene.', 'Checked the original scene')
  assert.equal(resolved.correct_answer, 'B')
  assert.equal(resolved.explanation.correct, 'Helena speaks to Hermia in this scene.')
  assert.deepEqual(resolved.explanation.wrong_options, {})
  assert.equal(resolved.explanation.hint, undefined)
  assert.equal(resolved._answerDisagreement, false)
  assert.ok(reviewIssues(resolved).some(issue => issue.includes('missing context')))
  assert.throws(() => review.resolveReviewedAnswer(q, 'C', 'Reason', 'Source'))
  assert.throws(() => review.resolveReviewedAnswer(q, 'B', '', 'Source'))
})

test('matching provider and edited keys describe pending explanation review accurately', () => {
  const issues = reviewIssues({ question_text: 'Choose.', options: { A: 'One', B: 'Two' }, correct_answer: 'B', sdash_answer: 'B', _answerDisagreement: true })
  assert.ok(issues.some(issue => issue.includes('explanation has not been reviewed')))
  assert.ok(!issues.some(issue => issue.includes('disagree on the answer')))
})

test('formatting keeps student stems and spelling distractors intact while exposing instructions', () => {
  const q = { question_text: 'Choose the correct spelling: The .... is full.', options: { A: 'accommodation', B: 'accomodation' } }
  const formatted = existingQuestionFormatting(q)
  assert.equal(formatted.instruction_text, 'Choose the correct spelling:')
  assert.equal(formatted.question_text, q.question_text)
  assert.deepEqual(formatted.options, q.options)
  assert.equal(repairTextEncoding('Heâ€™s here.'), 'He’s here.')
})

test('duplicate choices and answer disagreements require visible review', () => {
  const issues = reviewIssues({ question_text: 'My boss is .... irritable.', options: { A: 'At times', B: 'At times' }, correct_answer: 'A', _answerDisagreement: true })
  assert.ok(issues.some(s => s.includes('same text')))
  assert.ok(issues.some(s => s.includes('disagree')))
  assert.ok(reviewIssues({ question_text: 'What is the theme?', options: { A: 'Love', B: 'War' }, correct_answer: 'A', _layoutUnverified: true }).some(s => s.includes('line breaks')))
})

test('saved approval accepts a false positive only while the reviewed content is unchanged', () => {
  const q = { question_text: 'Choose one.', options: { A: 'Same', B: 'Same' }, correct_answer: 'A', explanation: { content_review: { status: 'reviewed', note: 'Checked original paper' } } }
  q.explanation.content_review.accepted_issues = review.allReviewIssues(q)
  q.explanation.content_review.signature = review.reviewSignature(q)
  assert.deepEqual(reviewIssues(q), [])
  assert.ok(reviewIssues({ ...q, question_text: 'Changed question.' }).length)
})

test('approval cannot accept missing essential content', async () => {
  const api = await patchRoute({ id: 'q', question_text: 'Choose the underlined word.', options: { A: 'One', B: 'Two' }, correct_answer: 'A', explanation: {} })
  const res = await api.patch({ json: async () => ({ review_action: 'approve' }) }, { params: Promise.resolve({ id: 'q' }) })
  assert.equal(res.status, 400)
  assert.match((await res.json()).error, /underline target/)
  assert.equal(api.writes(), 0)
})

test('mark-correct cannot publish an unresolved source diagram', async () => {
  const api = await patchRoute({ id: 'q', question_text: 'Find angle ABC.', options: { A: '70', B: '40' }, correct_answer: 'A', image_description: 'Triangle ABC with angle A = 40 degrees.', explanation: {} })
  const res = await api.patch({ json: async () => ({ review_action: 'approve' }) }, { params: Promise.resolve({ id: 'q' }) })
  assert.equal(res.status, 400)
  assert.match((await res.json()).error, /Source diagram needs review/)
  assert.equal(api.writes(), 0)
})

async function patchRoute(existing, allowWrites = false) {
  let writes = 0
  const db = { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: existing }) }) }), update: changes => {
    writes++
    if (!allowWrites) throw new Error('Blocked requests must not reach writes')
    return { eq: () => ({ select: () => ({ single: async () => ({ data: { ...existing, ...changes } }) }) }) }
  } }) }
  const deps = {
    '@/lib/questionReview': review,
    '@/lib/questionUpdates': updates,
    '@/lib/constants': { ALL_EXAMS: ['WAEC', 'JAMB', 'NECO'] },
    '@/lib/adminAuth': { requireAdmin: async () => null },
    '@supabase/supabase-js': { createClient: () => db },
    'next/server': { NextResponse: { json: (body, opts) => Response.json(body, opts) } },
  }
  const mod = new SourceTextModule(await readFile(new URL('../src/app/api/admin/questions/[id]/route.js', import.meta.url), 'utf8'))
  await mod.link(name => new SyntheticModule(Object.keys(deps[name]), function () { for (const [key, value] of Object.entries(deps[name])) this.setExport(key, value) }))
  await mod.evaluate()
  return { patch: mod.namespace.PATCH, writes: () => writes }
}

test('reactivate and unflag cannot bypass an unresolved draft review', async () => {
  for (const body of [{ is_active: true }, { is_flagged: false }]) {
    const api = await patchRoute({ id: 'q', question_text: 'Which word?', options: { A: 'One', B: 'Two' }, correct_answer: 'A', explanation: { content_review: { status: 'needs_review', issues: ['Source missing'] } } })
    const res = await api.patch({ json: async () => body }, { params: Promise.resolve({ id: 'q' }) })
    assert.equal(res.status, 400)
    assert.match((await res.json()).error, /source\/reference/)
    assert.equal(api.writes(), 0)
  }
})

test('approval activates a flagged draft and records its review decision', async () => {
  const api = await patchRoute({ id: 'q', is_active: false, is_flagged: true, question_text: 'Which word?', options: { A: 'One', B: 'Two' }, correct_answer: 'A', explanation: { correct: 'One is correct.', content_review: { status: 'needs_review', issues: ['Check source'] } } }, true)
  const res = await api.patch({ json: async () => ({ review_action: 'approve' }) }, { params: Promise.resolve({ id: 'q' }) })
  assert.equal(res.status, 200)
  const saved = await res.json()
  assert.equal(saved.is_active, true)
  assert.equal(saved.is_flagged, false)
  assert.equal(saved.explanation.correct, 'One is correct.')
  assert.equal(saved.explanation.content_review.status, 'reviewed')
  assert.ok(saved.explanation.content_review.note)
  assert.equal(api.writes(), 1)
})

test('a reviewer note does not override a still-missing underline target', async () => {
  const api = await patchRoute({ id: 'q', question_text: 'Choose the underlined word.', options: { A: 'One', B: 'Two' }, correct_answer: 'A', explanation: { content_review: { status: 'needs_review' } } })
  const res = await api.patch({ json: async () => ({ is_active: true, explanation: { content_review: { status: 'reviewed', note: 'Checked source' } } }) }, { params: Promise.resolve({ id: 'q' }) })
  assert.equal(res.status, 400)
  assert.match((await res.json()).error, /underline target/)
  assert.equal(api.writes(), 0)
})

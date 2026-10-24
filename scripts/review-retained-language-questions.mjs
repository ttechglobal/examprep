import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { existingQuestionFormatting, reviewIssues } from '../src/lib/questionReview.js'

if (!process.argv[2]) throw new Error('Pass the existing backup folder; --apply is optional.')
const folder = resolve(process.argv[2])
const originals = JSON.parse(await readFile(resolve(folder, 'remaining-snapshot.json'), 'utf8'))
const concerns = JSON.parse(await readFile(resolve(folder, 'remaining-editorial-concerns.json'), 'utf8'))
const plan = originals.map(q => {
  const formatting = existingQuestionFormatting(q)
  const issues = [...new Set([...reviewIssues({ ...q, ...formatting }), ...(concerns[q.id] ?? [])])]
  const changes = {}
  for (const [key, value] of Object.entries(formatting)) if (JSON.stringify(value) !== JSON.stringify(q[key] ?? null)) changes[key] = value
  if (issues.length) {
    changes.is_flagged = true
    changes.explanation = { ...(typeof q.explanation === 'object' && q.explanation ? q.explanation : { correct: q.explanation }), content_review: { status: 'needs_review', issues, reviewed_at: new Date().toISOString(), scope: 'Structural/editorial screening; not an independently verified answer key.' } }
  }
  return { id: q.id, subject_id: q.subject_id, exam_type: q.exam_type, changes, issues }
})
await writeFile(resolve(folder, 'retained-review-plan.json'), JSON.stringify(plan, null, 2))
const summary = {
  inspected: plan.length,
  formatting_improved: plan.filter(p => ['instruction_text', 'question_text', 'options'].some(key => key in p.changes)).length,
  instructions_added: plan.filter(p => p.changes.instruction_text).length,
  encoding_repaired: plan.filter(p => 'question_text' in p.changes || 'options' in p.changes).length,
  flagged_for_review: plan.filter(p => p.issues.length).length,
  unflagged_not_source_certified: plan.filter(p => !p.issues.length).length,
}
console.log(JSON.stringify(summary))
if (process.argv[3] !== '--apply') process.exit(0)
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const originalById = new Map(originals.map(q => [q.id, q]))
// Verify the fresh snapshot before writing any corrections or flags.
const changed = plan.filter(p => Object.keys(p.changes).length)
const sort = value => Array.isArray(value) ? value.map(sort) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])])) : value
for (let start = 0; start < changed.length; start += 80) {
  const group = changed.slice(start, start + 80)
  const { data, error } = await db.from('questions').select('*').in('id', group.map(p => p.id))
  if (error || data.length !== group.length) throw new Error(error?.message ?? 'Snapshot count changed')
  for (const q of data) if (JSON.stringify(sort(q)) !== JSON.stringify(sort(originalById.get(q.id)))) throw new Error(`Question changed since review: ${q.id}`)
}
const receipt = { started_at: new Date().toISOString(), summary, updated_ids: [] }
const save = () => writeFile(resolve(folder, 'retained-review-receipt.json'), JSON.stringify(receipt, null, 2))
await save()
for (const item of changed) {
  const original = originalById.get(item.id)
  const { data, error } = await db.from('questions').update(item.changes)
    .eq('id', item.id).eq('subject_id', item.subject_id).eq('exam_type', item.exam_type).eq('is_active', true)
    .eq('question_text', original.question_text).eq('correct_answer', original.correct_answer)
    .eq('options', JSON.stringify(original.options)).select('id')
  if (error || data.length !== 1) throw new Error(error?.message ?? `Question changed during review: ${item.id}`)
  receipt.updated_ids.push(item.id)
  await save()
}
// Verify the actual fields after every update; answer keys/active status stay intact.
for (let start = 0; start < changed.length; start += 80) {
  const group = changed.slice(start, start + 80)
  const { data, error } = await db.from('questions').select('*').in('id', group.map(p => p.id))
  if (error || data.length !== group.length) throw new Error(error?.message ?? 'Verification count changed')
  for (const row of data) {
    const change = group.find(p => p.id === row.id).changes
    for (const [key, value] of Object.entries(change)) if (JSON.stringify(sort(row[key])) !== JSON.stringify(sort(value))) throw new Error(`Verification failed: ${row.id}/${key}`)
    if (row.correct_answer !== originalById.get(row.id).correct_answer || row.is_active !== true) throw new Error('Answer key or active state changed unexpectedly.')
  }
}
receipt.completed_at = new Date().toISOString()
await save()
console.log(JSON.stringify({ verified_updated: receipt.updated_ids.length, ...summary }))

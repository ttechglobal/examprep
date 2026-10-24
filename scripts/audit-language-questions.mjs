// Read-only inventory. Credentials are read from the environment, never logged.
// Run: node --env-file=.env.local scripts/audit-language-questions.mjs
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { contentIssues } from '../src/lib/questionContent.js'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) }) },
})
const { data: subjects, error } = await db.from('subjects').select('id,name,exam_type').in('exam_type', ['JAMB', 'WAEC'])
if (error) throw new Error(error.message)
const targets = subjects.filter(s => /^(?:english(?: language)?|use of english|literature(?: in english)?|(?:the )?lekki headmaster)$/i.test(s.name.trim()))
if (!targets.length) throw new Error('No matching subjects; refusing an unscoped scan.')
const records = []
for (const subject of targets) {
  for (let offset = 0; ; offset += 500) {
    const { data, error: queryError } = await db.from('questions').select('*').eq('subject_id', subject.id).in('exam_type', ['JAMB', 'WAEC']).order('id').range(offset, offset + 499)
    if (queryError) throw new Error(queryError.message)
    records.push(...data)
    if (data.length < 500) break
  }
}
const run = new Date().toISOString().replace(/[:.]/g, '-')
const folder = resolve('handoff-output', 'question-content-cleanup', run)
await mkdir(folder, { recursive: true })
await writeFile(resolve(folder, 'question-snapshot.json'), JSON.stringify({ captured_at: new Date().toISOString(), subjects: targets, records }, null, 2))
const inventory = records.map(q => {
  const text = [q.question_text, q.instruction_text, q.passage_text, ...Object.values(q.options ?? {})].filter(Boolean).join('\n')
  const reasons = []
  if (q.passage_text || q.passage_image_url) reasons.push('stored_passage_or_image')
  if (/\b(?:passage|excerpt|extract|underlin\w*|italic\w*|emboldened|bold[ -]?(?:type|print)|stanza|lines?\s+\d|quoted|quotation)\b/i.test(text)) reasons.push('context_or_annotation_reference')
  if (/<\/?(?:u|em|i|b|strong|blockquote)\b|\*\*[^*]+\*\*/i.test(text)) reasons.push('inline_annotation')
  if (/\b(?:the|this|above|following)\s+(?:poem|poet|speaker|persona)|\baccording to (?:the|this) (?:text|author|writer)|\b(?:read|study)\s+the\b/i.test(text)) reasons.push('reading_context_reference')
  if (/['“”"‘’][^\n]{35,}['“”"‘’]/.test(q.question_text ?? '') || (q.question_text ?? '').split('\n').filter(s => s.trim()).length >= 4) reasons.push('possible_embedded_extract')
  const issues = contentIssues(q)
  return { id: q.id, subject_id: q.subject_id, exam_type: q.exam_type, year: q.year, is_active: q.is_active, reasons, issues, question: (q.question_text ?? '').slice(0, 350) }
})
const summary = targets.map(s => {
  const rows = inventory.filter(q => q.subject_id === s.id)
  const active = rows.filter(q => q.is_active === true)
  return { ...s, total: rows.length, active: active.length, inactive: rows.length - active.length, active_context_candidates: active.filter(q => q.reasons.length).length, active_detected_issues: active.filter(q => q.issues.length).length, years: [...new Set(rows.map(q => q.year))].sort() }
})
await writeFile(resolve(folder, 'inventory.json'), JSON.stringify(inventory, null, 2))
await writeFile(resolve(folder, 'summary.json'), JSON.stringify(summary, null, 2))
console.log(JSON.stringify({ folder, summary, examples: inventory.filter(q => q.is_active && (q.issues.length || q.reasons.length)).slice(0, 12) }, null, 2))

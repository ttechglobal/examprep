// Keep unresolved retained questions as review drafts, not published questions.
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

if (!process.argv[2]) throw new Error('Pass the reviewed backup folder.')
const folder = resolve(process.argv[2])
const plan = JSON.parse(await readFile(resolve(folder, 'retained-review-plan.json'), 'utf8')).filter(p => p.issues.length)
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const before = []
for (let start = 0; start < plan.length; start += 80) {
  const group = plan.slice(start, start + 80)
  const { data, error } = await db.from('questions').select('*').in('id', group.map(q => q.id))
  if (error || data.length !== group.length) throw new Error(error?.message ?? 'Review question count changed.')
  for (const row of data) {
    const item = group.find(q => q.id === row.id)
    if (!row.is_flagged || row.is_active !== true || row.subject_id !== item.subject_id || row.exam_type !== item.exam_type || row.explanation?.content_review?.status !== 'needs_review') throw new Error(`Review status changed: ${row.id}`)
  }
  before.push(...data)
}
await writeFile(resolve(folder, 'review-drafts-before.json'), JSON.stringify(before, null, 2))
const receipt = { started_at: new Date().toISOString(), draft_ids: [], coverage: [] }
const persist = () => writeFile(resolve(folder, 'review-drafts-receipt.json'), JSON.stringify(receipt, null, 2))
for (let start = 0; start < plan.length; start += 80) {
  const group = plan.slice(start, start + 80)
  const { data, error } = await db.from('questions').update({ is_active: false }).in('id', group.map(q => q.id))
    .eq('is_active', true).eq('is_flagged', true).eq('explanation->content_review->>status', 'needs_review').select('id')
  if (error) throw new Error(error.message)
  receipt.draft_ids.push(...data.map(q => q.id))
  await persist()
  if (data.length !== group.length) throw new Error('Review status changed during update; inspect receipt.')
}
const buckets = new Set(before.map(q => JSON.stringify([q.subject_id, q.exam_type, q.year])))
for (const bucket of buckets) {
  const [subject_id, exam_type, year] = JSON.parse(bucket)
  const { count, error } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('subject_id', subject_id).eq('exam_type', exam_type).eq('year', year).eq('is_active', true)
  if (error) throw new Error(error.message)
  const updated = await db.from('coverage_summary').upsert({ subject_id, exam_type, year: Number(year), count }, { onConflict: 'subject_id,exam_type,year' })
  if (updated.error) throw new Error(updated.error.message)
  receipt.coverage.push({ subject_id, exam_type, year, count })
  await persist()
}
const check = await db.from('questions').select('id', { count: 'exact', head: true }).in('id', receipt.draft_ids).eq('is_active', false).eq('is_flagged', true)
if (check.error || check.count !== plan.length) throw new Error('Draft verification failed.')
receipt.verified_drafts = check.count
receipt.completed_at = new Date().toISOString()
await persist()
console.log(JSON.stringify({ drafts: check.count, coverage_buckets: receipt.coverage.length }))

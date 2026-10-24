// Apply the user's scoped cleanup using the application's normal archive delete.
// A full snapshot and an explicit ID plan must already exist. Never broad-delete.
import { createClient } from '@supabase/supabase-js'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { languageCleanupReasons } from '../src/lib/languageQuestionCleanup.js'

if (!process.argv[2]) throw new Error('Pass the audited snapshot folder.')
const folder = resolve(process.argv[2])
const snapshot = JSON.parse(await readFile(resolve(folder, 'question-snapshot.json'), 'utf8'))
const plan = JSON.parse(await readFile(resolve(folder, 'cleanup-plan.json'), 'utf8'))
if (plan.operation !== 'archive' || !plan.selected.length) throw new Error('No explicit archive plan.')
const subjects = new Map(snapshot.subjects.map(s => [s.id, s]))
const originals = new Map(snapshot.records.map(q => [q.id, q]))
const seen = new Set()
for (const item of plan.selected) {
  const subject = subjects.get(item.subject_id)
  const original = originals.get(item.id)
  if (seen.has(item.id) || !subject || !original || !['JAMB', 'WAEC'].includes(subject.exam_type)
      || !/^(english(?: language)?|use of english|literature(?: in english)?|(?:the )?lekki headmaster)$/i.test(subject.name)
      || original.subject_id !== item.subject_id || original.exam_type !== item.exam_type
      || original.is_active !== true || !languageCleanupReasons(original, subject.name).length) throw new Error('Plan contains an out-of-scope record.')
  seen.add(item.id)
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) }) },
})
const sort = value => Array.isArray(value) ? value.map(sort) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])])) : value
const canonical = value => JSON.stringify(sort(value))
// Preflight every ID before the first write; changes since the scan abort the run.
for (let start = 0; start < plan.selected.length; start += 80) {
  const ids = plan.selected.slice(start, start + 80).map(q => q.id)
  const { data, error } = await db.from('questions').select('*').in('id', ids)
  if (error || data.length !== ids.length) throw new Error(error?.message ?? 'Preflight record count changed.')
  for (const row of data) if (canonical(row) !== canonical(originals.get(row.id))) throw new Error(`Question changed since snapshot: ${row.id}; rerun audit.`)
}
const receipt = { started_at: new Date().toISOString(), mode: 'archive', archived_ids: [], coverage: [] }
const persist = () => writeFile(resolve(folder, 'cleanup-receipt.json'), JSON.stringify(receipt, null, 2))
await persist()
const buckets = new Map()
for (const row of plan.selected) {
  const key = JSON.stringify([row.subject_id, row.exam_type, row.year])
  if (!buckets.has(key)) buckets.set(key, [])
  buckets.get(key).push(row)
}
for (const [key, rows] of buckets) {
  const [subjectId, examType, year] = JSON.parse(key)
  for (let start = 0; start < rows.length; start += 80) {
    const ids = rows.slice(start, start + 80).map(row => row.id)
    const hasTimestamp = Object.hasOwn(originals.get(ids[0]), 'updated_at')
    let mutation = db.from('questions')
      .update({ is_active: false, ...(hasTimestamp ? { updated_at: receipt.started_at } : {}) })
      .eq('subject_id', subjectId).eq('exam_type', examType).eq('is_active', true)
      .in('id', ids)
    if (hasTimestamp) mutation = mutation.or(`updated_at.is.null,updated_at.lte.${snapshot.captured_at}`)
    const { data, error } = await mutation.select('id')
    if (error) throw new Error(error.message)
    receipt.archived_ids.push(...data.map(row => row.id))
    await persist()
    if (data.length !== ids.length) throw new Error('A record changed during cleanup; see receipt before resuming.')
  }
  const { count, error: countError } = await db.from('questions').select('id', { count: 'exact', head: true })
    .eq('subject_id', subjectId).eq('exam_type', examType).eq('year', year).eq('is_active', true)
  if (countError) throw new Error(countError.message)
  const { error: coverageError } = await db.from('coverage_summary').upsert({ subject_id: subjectId, exam_type: examType, year: Number(year), count }, { onConflict: 'subject_id,exam_type,year' })
  receipt.coverage.push({ subject_id: subjectId, exam_type: examType, year, active_count: count, error: coverageError?.message ?? null })
  await persist()
  if (coverageError) throw new Error(`Questions archived, but coverage refresh failed: ${coverageError.message}`)
}
receipt.subjects = []
for (const subject of snapshot.subjects) {
  const { count, error } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('subject_id', subject.id).in('exam_type', ['JAMB', 'WAEC']).eq('is_active', true)
  if (error) throw new Error(error.message)
  receipt.subjects.push({ name: subject.name, exam_type: subject.exam_type, before: snapshot.records.filter(q => q.subject_id === subject.id && q.is_active).length, archived: plan.selected.filter(q => q.subject_id === subject.id).length, active_after: count })
}
const verification = await db.from('questions').select('id', { count: 'exact', head: true }).in('id', receipt.archived_ids).eq('is_active', false)
if (verification.error || verification.count !== receipt.archived_ids.length) throw new Error('Post-cleanup archive verification failed.')
receipt.verified_archived = verification.count
receipt.completed_at = new Date().toISOString()
await persist()
console.log(JSON.stringify({ archived: receipt.archived_ids.length, subjects: receipt.subjects, coverage_refreshed: receipt.coverage.length, receipt: resolve(folder, 'cleanup-receipt.json') }, null, 2))

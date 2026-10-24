// Permanently remove only the previously archived, backed-up cleanup receipt IDs.
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

if (!process.argv[2] || process.argv[3] !== '--delete') throw new Error('Usage: script <backup-folder> --delete')
const folder = resolve(process.argv[2])
const read = async name => JSON.parse(await readFile(resolve(folder, name), 'utf8'))
const archive = await read('cleanup-receipt.json')
const snapshot = await read('question-snapshot.json')
const ids = archive.archived_ids
if (!archive.completed_at || ids.length !== 360 || new Set(ids).size !== ids.length) throw new Error('Unexpected archive receipt.')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const originals = new Map(snapshot.records.map(q => [q.id, q]))
const before = []
for (let i = 0; i < ids.length; i += 80) {
  const group = ids.slice(i, i + 80)
  const { data, error } = await db.from('questions').select('*').in('id', group)
  if (error || data.length !== group.length) throw new Error(error?.message ?? 'Question count changed.')
  for (const q of data) {
    const original = originals.get(q.id)
    if (!original || q.is_active !== false || q.subject_id !== original.subject_id || q.exam_type !== original.exam_type
        || q.question_text !== original.question_text || JSON.stringify(q.options) !== JSON.stringify(original.options)) throw new Error(`Question changed or out of scope: ${q.id}`)
  }
  before.push(...data)
  for (const table of ['daily_quiz_attempts', 'question_flags']) {
    const result = await db.from(table).select('id', { count: 'exact', head: true }).in('question_id', group)
    if (result.error || result.count) throw new Error(`${table} has dependencies; preserve them before deletion.`)
  }
}
await writeFile(resolve(folder, 'permanent-delete-snapshot.json'), JSON.stringify(before, null, 2))
const attempts = await read('question_attempts-before-delete.json')
const receipt = { started_at: new Date().toISOString(), deleted_ids: [], preserved_attempts: attempts.length }
const save = () => writeFile(resolve(folder, 'permanent-delete-receipt.json'), JSON.stringify(receipt, null, 2))
await save()
for (let i = 0; i < ids.length; i += 80) {
  const group = ids.slice(i, i + 80)
  const { data, error } = await db.from('questions').delete().in('id', group).eq('is_active', false)
    .in('subject_id', snapshot.subjects.map(s => s.id)).in('exam_type', ['JAMB', 'WAEC']).select('id')
  if (error) throw new Error(error.message)
  receipt.deleted_ids.push(...data.map(q => q.id))
  await save()
  if (data.length !== group.length) throw new Error('Unexpected deletion count; inspect receipt.')
}
const verification = await db.from('questions').select('id', { count: 'exact', head: true }).in('id', ids)
if (verification.error || verification.count !== 0) throw new Error('Deleted questions still present.')
if (attempts.length) {
  const result = await db.from('question_attempts').select('id', { count: 'exact', head: true }).in('id', attempts.map(a => a.id))
  if (result.error || result.count !== attempts.length) throw new Error('Attempt preservation check failed.')
}
receipt.completed_at = new Date().toISOString()
await save()
console.log(JSON.stringify({ permanently_deleted: receipt.deleted_ids.length, attempts_preserved: attempts.length, verified_remaining_deleted_ids: verification.count }))

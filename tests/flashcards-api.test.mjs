import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SourceTextModule, SyntheticModule } from 'node:vm'

const FIRST = '11111111-1111-4111-8111-111111111111'
const SECOND = '22222222-2222-4222-8222-222222222222'
async function request(query, results) {
  const calls = []
  const db = { from: table => {
    const chain = { then: (resolve, reject) => Promise.resolve(results[table] || { data: [] }).then(resolve, reject) }
    for (const method of ['select', 'eq', 'in', 'order']) chain[method] = (...args) => { calls.push([table, method, ...args]); return chain }
    return chain
  } }
  const dependencies = {
    'next/server': { NextResponse: { json: (value, init) => Response.json(value, init) }, after: () => {} },
    '@/lib/supabase/server': { createClient: () => { throw new Error('Auth is not needed for these reads') } },
    '@/lib/server/studentEvents': { recordEvent: () => {} },
    '@/lib/dates': { appDay: () => '2026-10-14' },
    '@/lib/uuid': { UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i },
    '@supabase/supabase-js': { createClient: () => db },
  }
  const route = new SourceTextModule(await readFile(new URL('../src/app/api/student/flashcards/route.js', import.meta.url), 'utf8'))
  await route.link(name => {
    const values = dependencies[name]
    return new SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value)
    })
  })
  await route.evaluate()
  const response = await route.namespace.GET(new Request(`http://localhost/api/student/flashcards${query}`))
  return { status: response.status, data: await response.json(), calls }
}
test('database failure is an error rather than an empty library', async () => {
  assert.equal((await request('', { flashcards: { error: { message: 'Unavailable' } } })).status, 500)
})
test('an empty library returns an honest empty list', async () => {
  assert.deepEqual((await request('', {})).data, { subjects: [] })
})
test('combined exam topic counts include the IDs used to load the complete deck', async () => {
  const result = await request('?subjectName=Biology', {
    subjects: { data: [{ id: 'waec', name: 'Biology WAEC' }, { id: 'jamb', name: 'Biology JAMB' }] },
    topics: { data: [{ id: FIRST, name: 'Cells', subject_id: 'waec' }, { id: SECOND, name: 'Cells', subject_id: 'jamb' }] },
    flashcards: { data: [{ topic_id: FIRST }, { topic_id: SECOND }, { topic_id: SECOND }] },
  })
  assert.equal(result.data.topics[0].card_count, 3)
  assert.deepEqual(result.data.topics[0].topic_ids, [FIRST, SECOND])
})
test('a deck request fetches all included exam variants and rejects malformed IDs', async () => {
  const result = await request(`?topicId=${FIRST}&topicIds=${FIRST},${SECOND}`, {})
  assert.deepEqual(result.calls.find(call => call[1] === 'in'), ['flashcards', 'in', 'topic_id', [FIRST, SECOND]])
  assert.equal((await request(`?topicId=${FIRST}&topicIds=invalid`, {})).status, 400)
})

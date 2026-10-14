import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createContext, SourceTextModule } from 'node:vm'

async function client(store, fetcher) {
  const cache = {
    match: async url => store.get(url)?.clone(),
    put: async (url, response) => store.set(url, response.clone()),
    keys: async () => [...store.keys()],
    delete: async url => store.delete(url),
  }
  const context = createContext({ URLSearchParams, caches: { open: async () => cache }, fetch: fetcher })
  const mod = new SourceTextModule(await readFile(new URL('../src/lib/flashcardCache.js', import.meta.url), 'utf8'), { context })
  await mod.link(() => {}); await mod.evaluate()
  return mod.namespace.loadFlashcards
}
test('first open loads cards; repeat opens and a fresh page use the device cache', async () => {
  const store = new Map(); let requests = 0
  const fetcher = async () => { requests++; return Response.json({ cards: [{ id: 'a' }] }) }
  const load = await client(store, fetcher)
  await load('?topicId=a'); await load('?topicId=a')
  const nextPage = await client(store, async () => { throw new Error('Offline: cache must be used') })
  await nextPage('?topicId=a')
  assert.equal(requests, 1)
})
test('explicit refresh fetches updated content', async () => {
  let requests = 0
  const load = await client(new Map(), async () => Response.json({ cards: [{ id: String(++requests) }] }))
  await load('?topicId=a')
  assert.equal((await load('?topicId=a', { refresh: true })).cards[0].id, '2')
})
test('failed responses are not cached and can be retried', async () => {
  let requests = 0
  const load = await client(new Map(), async () => ++requests === 1 ? Response.json({}, { status: 500 }) : Response.json({ cards: [{ id: 'a' }] }))
  await assert.rejects(load('?topicId=a'))
  assert.equal((await load('?topicId=a')).cards.length, 1)
})

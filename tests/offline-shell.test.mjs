// Service worker behavior with real Response bodies and an in-memory Cache API.
import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFile } from 'node:fs/promises'

const origin = 'https://exam.test'
const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
function worker(fetcher) {
  const stores = new Map(), handlers = {}
  const key = x => new URL(typeof x === 'string' ? x : x.url, origin).href
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)
      return {
        match: async req => store.get(key(req))?.clone(),
        put: async (req, res) => { store.set(key(req), res.clone()); await res.arrayBuffer() },
        keys: async () => [...store.keys()].map(x => new Request(x)),
        delete: async req => store.delete(key(req)),
      }
    },
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    async match(req) { for (const name of stores.keys()) { const r = await (await this.open(name)).match(req); if (r) return r } },
  }
  vm.runInNewContext(source, { self: { location: { origin }, addEventListener: (name, cb) => handlers[name] = cb, skipWaiting() {}, clients: { claim: async () => {} } }, caches, fetch: fetcher, URL, Response, setTimeout, Promise, Set, Error })
  return {
    caches, stores,
    async request(path, { navigate = false, rsc = false } = {}) {
      const request = new Request(origin + path, { headers: rsc ? { RSC: '1' } : {} })
      if (navigate) Object.defineProperty(request, 'mode', { value: 'navigate' })
      const pending = []; let reply
      handlers.fetch({ request, respondWith: p => reply = p, waitUntil: p => pending.push(p) })
      return { reply, finish: () => Promise.all(pending) }
    },
  }
}
const html = body => new Response(body, { headers: { 'Content-Type': 'text/html' } })

test('downloaded versioned artwork is reused without a request', async () => {
  const w = worker(() => { throw Error('Must not fetch cached art') })
  const cache = await w.caches.open('ep-images-v6')
  await cache.put('/images/home/battle-card-v1.webp', new Response('art'))
  const event = await w.request('/images/home/battle-card-v1.webp')
  assert.equal(await (await event.reply).text(), 'art')
})

test('optimized mobile brand icon is available from the device cache', async () => {
  const w = worker(() => { throw Error('Must not fetch cached brand icon') })
  const path = '/_next/image?url=%2Ficons%2Flaunch-mark.webp&w=96&q=75'
  await (await w.caches.open('ep-images-v6')).put(path,new Response('brand'))
  const event = await w.request(path)
  assert.equal(await (await event.reply).text(),'brand')
})

test('saved shell returns immediately while a slow network refresh is pending', async () => {
  let resolve
  const w = worker(() => new Promise(r => resolve = r))
  await (await w.caches.open('ep-pages-v6')).put('/student/home', html('saved'))
  const event = await w.request('/student/home', { navigate: true })
  assert.equal(await (await event.reply).text(), 'saved')
  resolve(html('fresh'))
  await event.finish()
  assert.equal(await (await w.caches.match('/student/home')).text(), 'fresh')
})

test('HTML is not replaced if its referenced code cannot be saved', async () => {
  const w = worker(async request => typeof request === 'string'
    ? new Response('', { status: 503 }) : html('<script src="/_next/static/new.js"></script>'))
  await (await w.caches.open('ep-pages-v6')).put('/student/home', html('working old build'))
  const event = await w.request('/student/home', { navigate: true })
  await event.reply; await event.finish()
  assert.equal(await (await w.caches.match('/student/home')).text(), 'working old build')
})

test('first visit preserves the foreground body and warms required code', async () => {
  const w = worker(async request => typeof request === 'string' ? new Response('javascript') : html('<script src="/_next/static/new.js"></script>'))
  const event = await w.request('/student/practice?mode=topic', { navigate: true })
  assert.match(await (await event.reply).text(), /new.js/)
  await event.finish()
  assert.equal(await (await w.caches.match('/_next/static/new.js')).text(), 'javascript')
  assert.ok(await w.caches.match('/student/practice?mode=topic'))
  assert.equal(await w.caches.match('/student/practice?mode=mock'), undefined)
})

test('offline client navigation requests a document fallback, without caching Flight data', async () => {
  const w = worker(async () => { throw Error('offline') })
  const event = await w.request('/student/practice?_rsc=abc', { rsc: true })
  assert.equal((await event.reply).headers.get('Content-Type'), 'text/html')
  assert.equal(w.stores.size, 0)
})

test('personal APIs are never intercepted and failed images are not cached', async () => {
  const w = worker(async () => new Response('', { status: 404 }))
  assert.equal((await w.request('/api/student/practice/challenges')).reply, undefined)
  const event = await w.request('/images/missing.webp')
  assert.equal((await event.reply).status, 404)
  assert.equal(await w.caches.match('/images/missing.webp'), undefined)
})

test('proactively warmed Home and Practice artwork exists on disk', async () => {
  for (const path of [...source.matchAll(/'((?:\/images\/(?:home|practice)\/)[^']+)'/g)].map(x => x[1])) {
    assert.ok((await readFile(new URL(`../public${path}`, import.meta.url))).length > 0)
  }
})

test('cache limits preserve core artwork and code referenced by saved pages', async () => {
  const w = worker(async () => new Response('new asset'))
  const art = await w.caches.open('ep-images-v6')
  await art.put('/images/home/battle-card-v1.webp',new Response('core'))
  for(let i=0;i<300;i++) await art.put(`/images/old-${i}.webp`,new Response('old'))
  await (await w.request('/images/new.webp')).reply
  assert.ok(await art.match('/images/home/battle-card-v1.webp'))
  assert.equal(await art.match('/images/old-0.webp'),undefined)
  const code = await w.caches.open('ep-code-v6')
  await code.put('/_next/static/required.js',new Response('required'))
  for(let i=0;i<400;i++) await code.put(`/_next/static/old-${i}.js`,new Response('old'))
  await (await w.caches.open('ep-pages-v6')).put('/student/home',html('<script src="/_next/static/required.js"></script>'))
  await (await w.request('/_next/static/new.js')).reply
  assert.ok(await code.match('/_next/static/required.js'))
  assert.equal(await code.match('/_next/static/old-0.js'),undefined)
})

test('disabled device storage does not break online pages or images', async () => {
  const w = worker(async () => html('live'))
  w.caches.open = async () => { throw Error('Storage disabled') }
  assert.equal(await (await (await w.request('/images/new.webp')).reply).text(),'live')
  assert.equal(await (await (await w.request('/student/home',{navigate:true})).reply).text(),'live')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm'
import * as messages from '../src/lib/notifications.js'
import * as personalization from '../src/supabase/functions/send-notifications/personalization.js'

async function send({ version, status = 200, body = '{name}, your missions are ready.' }) {
  const requests = []
  const databaseCalls = []
  const context = createContext({
    process: { env: { SUPABASE_EDGE_URL: 'https://sender.example', SUPABASE_SERVICE_ROLE_KEY: 'test-secret' } },
    console, Date,
    fetch: async (url, options) => {
      requests.push(options.method)
      return Response.json(options.method === 'GET' ? { personalization_version: version } : { delivered: 2 }, { status })
    },
  })
  const dependencies = {
    'next/server': { NextResponse: { json: (value, init) => Response.json(value, init) } },
    '@/lib/adminAuth': { adminContext: async () => ({ admin: {} }), actorOf: () => ({ type: 'admin' }) },
    '@/lib/server/supabaseAdmin': { supabaseAdmin: () => ({ rpc: async name => {
      databaseCalls.push(name)
      return { data: name === 'notification_audience_count' ? { devices: 2 } : null }
    } }) },
    '@/lib/notifications': messages,
    '@/supabase/functions/send-notifications/personalization': personalization,
  }
  const route = new SourceTextModule(await readFile(new URL('../src/app/api/admin/notifications/route.js', import.meta.url), 'utf8'), { context })
  await route.link(name => {
    const values = dependencies[name]
    return new SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value)
    }, { context })
  })
  await route.evaluate()
  const response = await route.namespace.POST(new Request('http://localhost/api/admin/notifications', {
    method: 'POST', body: JSON.stringify({ title: 'Missions', body, audience: { kind: 'all' } }),
  }))
  return { status: response.status, body: await response.json(), requests, databaseCalls }
}

test('an old sender cannot receive a personalized blast', async () => {
  const result = await send({ status: 405 })
  assert.equal(result.status, 503)
  assert.match(result.body.error, /Nothing was sent/)
  assert.deepEqual(result.requests, ['GET'])
  assert.deepEqual(result.databaseCalls, [])
})

test('a sender without the required capability cannot receive a personalized blast', async () => {
  const result = await send({ version: undefined })
  assert.equal(result.status, 503)
  assert.deepEqual(result.requests, ['GET'])
})

test('a compatible sender receives the unchanged template for per-recipient replacement', async () => {
  const result = await send({ version: personalization.PERSONALIZATION_VERSION })
  assert.equal(result.status, 200)
  assert.equal(result.body.delivered, 2)
  assert.deepEqual(result.requests, ['GET', 'POST'])
  assert.deepEqual(result.databaseCalls, ['notification_audience_count', 'log_activity'])
})

test('ordinary messages do not require a personalization capability check', async () => {
  const result = await send({ body: 'Your missions are ready.' })
  assert.equal(result.status, 200)
  assert.deepEqual(result.requests, ['POST'])
})

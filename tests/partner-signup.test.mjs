import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SourceTextModule, SyntheticModule } from 'node:vm'
import * as phone from '../src/lib/auth/phone.js'

// Exercise the actual route with isolated database/auth dependencies. No live
// accounts are created. Run with node --experimental-vm-modules --test.
async function signup({ existing = [], lookupError = null, rpcError = null, cleanupError = null } = {}) {
  const calls = []
  const db = {
    from(table) {
      assert.equal(table, 'profiles')
      return { select: () => ({ in: (column, variants) => {
        calls.push(['lookup', column, variants])
        return { limit: async () => ({ data: existing, error: lookupError }) }
      } }) }
    },
    auth: { admin: {
      createUser: async () => { calls.push(['create']); return { data: { user: { id: 'new-user' } } } },
      deleteUser: async id => { calls.push(['delete', id]); return { error: cleanupError } },
    } },
    rpc: async (name, args) => { calls.push(['rpc', name, args]); return { error: rpcError } },
  }
  const dependencies = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/server/supabaseAdmin': { supabaseAdmin: () => db },
    '@/lib/server/rateLimit': { rateLimited: () => null },
    '@/lib/auth/phone': phone,
  }
  const route = new SourceTextModule(await readFile(new URL('../src/app/api/partner/signup/route.js', import.meta.url), 'utf8'))
  await route.link(name => {
    const exports = dependencies[name]
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
    })
  })
  await route.evaluate()
  const response = await route.namespace.POST(new Request('http://localhost/api/partner/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Test Teacher', email: 'teacher@example.com', phone: '0801 234 5678', password: 'test-password' }),
  }))
  return { status: response.status, body: await response.json(), calls }
}

test('existing phone returns a field conflict before creating a login', async () => {
  const result = await signup({ existing: [{ id: 'existing-user' }] })
  assert.equal(result.status, 409)
  assert.equal(result.body.field, 'phone')
  assert.deepEqual(result.calls, [['lookup', 'phone_number', ['+2348012345678', '2348012345678', '08012345678', '8012345678']]])
})

test('a failed phone lookup does not create an account', async () => {
  const result = await signup({ lookupError: { code: '08006', message: 'Connection failure' } })
  assert.equal(result.status, 500)
  assert.equal(result.calls.length, 1)
})

test('a concurrent phone conflict deletes only the new login and returns 409', async () => {
  const result = await signup({ rpcError: { code: '23505', message: 'duplicate key value violates unique constraint "profiles_phone_number_unique"' } })
  assert.equal(result.status, 409)
  assert.equal(result.body.field, 'phone')
  assert.deepEqual(result.calls.at(-1), ['delete', 'new-user'])
})

test('other database conflicts remain server errors with cleanup', async () => {
  const result = await signup({ rpcError: { code: '23505', message: 'duplicate key value violates unique constraint "ambassadors_pkey"' } })
  assert.equal(result.status, 500)
  assert.equal(result.body.field, undefined)
  assert.deepEqual(result.calls.at(-1), ['delete', 'new-user'])
})

test('cleanup failure directs the user to support rather than retrying signup', async () => {
  const result = await signup({ rpcError: { code: '23505', message: 'profiles_phone_number_unique' }, cleanupError: { message: 'Auth unavailable' } })
  assert.equal(result.status, 500)
  assert.match(result.body.error, /contact support/)
})

test('a new phone creates an ambassador with the normalized number', async () => {
  const result = await signup()
  assert.equal(result.status, 200)
  assert.equal(result.body.ok, true)
  assert.equal(result.calls.at(-1)[1], 'create_ambassador_account')
  assert.equal(result.calls.at(-1)[2].p_phone, '+2348012345678')
  assert.equal(result.calls.some(([name]) => name === 'delete'), false)
})

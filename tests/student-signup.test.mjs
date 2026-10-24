import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SourceTextModule, SyntheticModule } from 'node:vm'
import * as phone from '../src/lib/auth/phone.js'

// Exercise the actual route with isolated database/auth dependencies. No live
// accounts are created. Run with node --experimental-vm-modules --test.
async function signup({ existing = [], lookupError = null, profileErrors = [], cleanupError = null, body = {}, limited = false } = {}) {
  const calls = []
  const db = {
    from(table) {
      assert.equal(table, 'profiles')
      return {
        select: () => ({ in: () => ({ limit: async () => { calls.push(['lookup']); return { data: existing, error: lookupError } } }) }),
        upsert: async value => { calls.push(['profile', value]); return { error: profileErrors.shift() ?? null } },
      }
    },
    auth: { admin: {
      createUser: async () => { calls.push(['create']); return { data: { user: { id: 'new-user' } } } },
      deleteUser: async id => { calls.push(['delete', id]); return { error: cleanupError } },
    } },
    rpc: async (name, args) => { calls.push(['rpc', name, args]); return { data: { ok: true }, error: null } },
  }
  const dependencies = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/server/rateLimit': { rateLimited: () => limited ? Response.json({error: 'Too many requests'}, {status:429}) : null },
    '@/lib/auth/phone': phone,
  }
  const route = new SourceTextModule(await readFile(new URL('../src/app/api/auth/signup/route.js', import.meta.url), 'utf8'))
  await route.link(name => {
    const exports = dependencies[name]
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
    })
  })
  await route.evaluate()
  const response = await route.namespace.POST(new Request('http://localhost/api/auth/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: 'Test Student', method: 'email', email: 'student@example.com', password: 'test-password', ...body }),
  }))
  return { status: response.status, body: await response.json(), calls }
}


test('email signup saves canonical email and name', async () => {
 const r = await signup(); assert.equal(r.status, 200);
 assert.equal(r.calls.find(c => c[0] === 'profile')[1].email, 'student@example.com');
 assert.equal(r.calls.find(c => c[0] === 'profile')[1].full_name, 'Test Student');
});
test('missing name is rejected before creating auth user', async () => {
 const r = await signup({body:{full_name:' '}}); assert.equal(r.status,400); assert.equal(r.body.field,'full_name'); assert.equal(r.calls.length,0);
});
test('phone lookup failure stops creation', async () => {
 const r=await signup({body:{method:'phone',phone:'08012345678'},lookupError:{message:'offline'}}); assert.equal(r.status,500); assert.deepEqual(r.calls,[['lookup']]);
});
test('duplicate phone stops creation', async () => {
 const r=await signup({body:{method:'phone',phone:'08012345678'},existing:[{id:'existing'}]}); assert.equal(r.status,409); assert.equal(r.body.field,'phone'); assert.equal(r.calls.length,1);
});
test('phone signup saves normalized contact and synthetic login', async () => {
 const r=await signup({body:{method:'phone',phone:'08012345678'}}); assert.equal(r.status,200); const profile=r.calls.find(c=>c[0]==='profile')[1]; assert.equal(profile.phone_number,'+2348012345678'); assert.equal(profile.email,'2348012345678@phone.examprep.ng');
});
test('optional missing column fallback retains required identity', async () => {
 const r=await signup({profileErrors:[{code:'PGRST204'}],body:{guest:{full_name:'Old name',exam_types:['WAEC'],subjects_waec:['Math']}}}); assert.equal(r.status,200); const saves=r.calls.filter(c=>c[0]==='profile'); assert.equal(saves.length,2); assert.equal(saves[1][1].email,'student@example.com'); assert.equal(saves[1][1].full_name,'Test Student'); assert.equal(saves[0][1].subjects_waec[0],'Math');
});
test('failed profile saves remove the newly created login', async () => {
 const r=await signup({profileErrors:[{code:'08006'}]}); assert.equal(r.status,500); assert.deepEqual(r.calls.at(-1),['delete','new-user']); assert.equal(r.body.ok,false);
});
test('fallback failure also removes the login', async () => {
 const r=await signup({profileErrors:[{code:'42703'},{code:'08006'}]}); assert.equal(r.status,500); assert.deepEqual(r.calls.at(-1),['delete','new-user']);
});
test('concurrent phone conflict cleans up and returns field conflict', async () => {
 const r=await signup({profileErrors:[{code:'23505',message:'profiles_phone_number_unique'}]}); assert.equal(r.status,409); assert.equal(r.body.field,'phone'); assert.deepEqual(r.calls.at(-1),['delete','new-user']);
});
test('cleanup failure directs user to support', async () => {
 const r=await signup({profileErrors:[{code:'08006'}],cleanupError:{message:'offline'}}); assert.equal(r.status,500); assert.match(r.body.error,/contact support/);
});
test('rate limit stops all database operations', async () => {
 const r=await signup({limited:true}); assert.equal(r.status,429); assert.equal(r.calls.length,0);
});

test('malformed phone payload is rejected before database operations', async () => {
 const r=await signup({body:{method:'phone',phone:123}}); assert.equal(r.status,400); assert.equal(r.body.field,'phone'); assert.equal(r.calls.length,0);
});

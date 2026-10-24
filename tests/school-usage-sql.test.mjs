import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const backend=process.env.DESKTOP_BACKEND_DIR || resolve('../../examprep_a1_mobile/app/backend')
const pg=resolve(backend,'.validation/node_modules/@electric-sql/pglite/dist/index.js')
test('real desktop activation and usage SQL: identity, deduplication, counters, summaries and privileges', {skip: !existsSync(pg) && 'Set DESKTOP_BACKEND_DIR to the desktop app backend with its PGlite validation dependency'}, async()=>{
 const {PGlite}=await import(pathToFileURL(pg));const db=new PGlite()
 const scalar=async(sql,args=[]) => (await db.query(sql,args)).rows[0].r
 try {
  await db.exec('create role anon;create role authenticated;create role service_role;')
  await db.exec(await readFile(resolve(backend,'20261021_school_device_activation.sql'),'utf8'))
  const migration=await readFile(new URL('../src/supabase/migrations/20261022_desktop_school_usage.sql',import.meta.url),'utf8')
  await db.exec(migration);await db.exec(migration)
  const device={device_id:'1'.repeat(64),public_key:'public-test',fingerprint:'fingerprint-test'}
  const challenge=async()=>(await scalar('select desktop_activation_challenge($1,$2) r',[device.device_id,'usage-test'])).nonce
  const setup={school:'Test school',email:'school@example.org',school_phone:'08012345678',contact_phone:'08012345678',contact:'Contact',state:'Lagos',computer_number:1,computer_id:'TEST-SCHOOL-001',installation_id:crypto.randomUUID()}
  const report=(input,nonce)=>scalar('select desktop_school_usage_report($1,$2,$3) r',[device,input,nonce])
  await assert.rejects(report({events:[]},await challenge()),/Register this computer/)
  const enrollment=await scalar('select desktop_activation_execute($1,$2,$3,$4,$5) r',['enroll',device,{setup},await challenge(),'school@example.org'])
  const practice={event_id:crypto.randomUUID(),event_type:'practice',occurred_at:new Date(Date.now()-60000).toISOString(),questions_answered:5,duration_seconds:120}
  const feedback={event_id:crypto.randomUUID(),event_type:'feedback',occurred_at:practice.occurred_at,questions_answered:0,duration_seconds:0,feedback_reason:'Wrong answer'}
  const nonce=await challenge();const result=await report({events:[practice,feedback]},nonce);assert.equal(result.accepted.length,2)
  await assert.rejects(report({events:[]},nonce),/challenge expired/)
  await report({events:[practice,feedback]},await challenge())
  await report({events:[{...practice,questions_answered:200}]},await challenge())
  const summary=await scalar('select desktop_school_usage_summary(30) r')
  assert.equal(summary.totals.sessions_completed,1);assert.equal(summary.totals.questions_answered,5);assert.equal(summary.totals.feedback_count,1)
  assert.equal(summary.schools[0].school_id,enrollment.school_id);assert.equal(summary.devices[0].active_days,1)
  assert.equal(summary.feedback[0].feedback_reason,'Wrong answer')
  assert.ok(summary.devices[0].last_reported_at);assert.equal(Date.parse(summary.devices[0].last_practice_at),Date.parse(practice.occurred_at))
  await assert.rejects(report({events:[{...practice,event_id:crypto.randomUUID(),questions_answered:-1}]},await challenge()),/counters/)
  await assert.rejects(report({events:[{...practice,event_id:crypto.randomUUID(),occurred_at:'infinity'}]},await challenge()),/date/)
  await assert.rejects(report({events:[{...practice,event_id:crypto.randomUUID(),occurred_at:new Date(Date.now()+3*86400000).toISOString()}]},await challenge()),/date/)
  await assert.rejects(report({events:[{...feedback,event_id:crypto.randomUUID(),feedback_reason:'private student name'}]},await challenge()),/feedback/)
  const forged={...device,public_key:'different'}
  await assert.rejects(scalar('select desktop_school_usage_report($1,$2,$3) r',[forged,{events:[]},await challenge()]),/identity mismatch/)
  for(const role of ['anon','authenticated']) {
   await db.exec('set role '+role)
   await assert.rejects(db.query('select * from desktop_school_usage_events'),/permission denied/)
   await assert.rejects(db.query('select desktop_school_usage_summary(30)'),/permission denied/)
   await assert.rejects(db.query('select desktop_school_usage_report($1,$2,$3)',[device,{events:[]},crypto.randomUUID()]),/permission denied/)
   await db.exec('reset role')
  }
 } finally {await db.close()}
})

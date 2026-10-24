import test from 'node:test'
import assert from 'node:assert/strict'
import { analyticsSnapshotLoader, analyticsHandler } from '../src/lib/server/analyticsSnapshot.mjs'

test('snapshot cache coalesces simultaneous tabs and refreshes, with a cooldown',async()=>{
 let calls=0,now=1000,resolve
 const loader=analyticsSnapshotLoader({clock:()=>now,load:()=>{calls++;return new Promise(r=>{resolve=r})}})
 const a=loader('same',{}),b=loader('same',{},true)
 await Promise.resolve();assert.equal(calls,1);resolve({version:2})
 assert.deepEqual(await a,await b)
 await loader('same',{},true);assert.equal(calls,1)
 now+=31000;const c=loader('same',{},true);await Promise.resolve();assert.equal(calls,2);resolve({version:2});await c
 now+=1000;await loader('same',{});assert.equal(calls,2)
})
test('failed snapshots are not cached and different filters do not share data',async()=>{
 let calls=0
 const loader=analyticsSnapshotLoader({load:async args=>{if(++calls===1)throw Error('temporary');return args}})
 await assert.rejects(loader('a',{days:7}),/temporary/)
 assert.equal((await loader('a',{days:7})).days,7)
 assert.equal((await loader('b',{days:30})).days,30)
})
test('API checks admin before rate limiting or analytics and ignores tab changes in its cache key',async()=>{
 let denied=true;const calls=[]
 const handler=analyticsHandler({requireAdmin:async()=>denied?Response.json({}, {status:401}):null,rateLimited:()=>null,appDay:()=> '2026-10-22',snapshot:async(...args)=>{calls.push(args);return {version:2}}})
 assert.equal((await handler(new Request('https://local/api/admin/analytics'))).status,401);assert.equal(calls.length,0)
 denied=false
 for(const tab of ['summary','activity','learning'])await handler(new Request('https://local/api/admin/analytics?days=30&tab='+tab))
 assert.equal(new Set(calls.map(c=>c[0])).size,1)
 await handler(new Request('https://local/api/admin/analytics?days=999&exam=BAD'))
 assert.deepEqual(calls.at(-1)[1],{p_days:30,p_exam:null})
 await handler(new Request('https://local/api/admin/analytics?days=1'))
 assert.deepEqual(calls.at(-1)[1],{p_days:1,p_exam:null})
})
test('API failures are not presented as empty successful analytics',async()=>{
 const handler=analyticsHandler({requireAdmin:async()=>null,rateLimited:()=>null,appDay:()=> '2026-10-22',snapshot:async()=>{throw Error('SQL unavailable')}})
 assert.equal((await handler(new Request('https://local/api/admin/analytics'))).status,503)
})

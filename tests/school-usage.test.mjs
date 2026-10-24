import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { verifySchoolUsageProof } from '../src/lib/server/schoolUsageProof.mjs'
import { schoolUsageHandlers } from '../src/lib/server/schoolUsageHandlers.mjs'
import { schoolDeviceAdminHandlers } from '../src/lib/server/schoolDeviceAdmin.mjs'

async function signed(input = {}) {
 const keys=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify'])
 const raw=Buffer.from(await webcrypto.subtle.exportKey('raw',keys.publicKey)), fp=webcrypto.getRandomValues(new Uint8Array(32))
 const device={device_id:Buffer.from(await webcrypto.subtle.digest('SHA-256',Buffer.concat([raw,fp]))).toString('hex'),public_key:raw.toString('base64url'),fingerprint:Buffer.from(fp).toString('base64url')}
 const proof={version:1,action:'usage',nonce:crypto.randomUUID(),device,input}
 const bytes=Buffer.from(JSON.stringify(proof))
 return {proof,payload:bytes.toString('base64url'),signature:Buffer.from(await webcrypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,bytes)).toString('base64url')}
}
const req = body => new Request('https://example.com/api/desktop-school/usage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
test('valid device usage proof verifies, while modified counters and device identities fail',async()=>{
 const s=await signed({events:[]}); assert.deepEqual(await verifySchoolUsageProof(s.payload,s.signature),s.proof)
 s.proof.input.events=[{questions_answered:999}]
 await assert.rejects(verifySchoolUsageProof(Buffer.from(JSON.stringify(s.proof)).toString('base64url'),s.signature),/signature/)
 s.proof.device.device_id='0'.repeat(64)
 await assert.rejects(verifySchoolUsageProof(Buffer.from(JSON.stringify(s.proof)).toString('base64url'),s.signature),/identity/)
})
test('activation actions cannot use the usage endpoint',async()=>{
 const s=await signed();s.proof.action='enroll'
 await assert.rejects(verifySchoolUsageProof(Buffer.from(JSON.stringify(s.proof)).toString('base64url'),s.signature),/proof/)
})
test('invalid proof and rate-limited requests never reach service-role SQL',async()=>{
 let calls=0
 const deps={supabaseAdmin:()=>{calls++;throw Error('must not query')},rateLimited:()=>null,verifyProof:verifySchoolUsageProof}
 assert.equal((await schoolUsageHandlers(deps)(req({action:'execute',payload:'invalid',signature:'invalid'}))).status,403)
 assert.equal((await schoolUsageHandlers({...deps,rateLimited:()=>Response.json({}, {status:429})})(req({action:'challenge'}))).status,429)
 assert.equal(calls,0)
})
test('verified report passes device identity to restricted usage RPC only',async()=>{
 const s=await signed({events:[],app_version:'1.0'}); const calls=[]
 const post=schoolUsageHandlers({supabaseAdmin:()=>({rpc:async(name,input)=>{calls.push({name,input});return {data:{ok:true,accepted:[]}}}}),rateLimited:()=>null,verifyProof:verifySchoolUsageProof})
 const r=await post(req({action:'execute',payload:s.payload,signature:s.signature,school_id:'forged'}));assert.equal(r.status,200)
 assert.equal(calls[0].name,'desktop_school_usage_report');assert.deepEqual(calls[0].input.p_device,s.proof.device)
 assert.equal(calls[0].input.p_nonce,s.proof.nonce);assert.equal(calls[0].input.school_id,undefined)
})

test('admin usage respects authentication and tolerates an undeployed usage migration',async()=>{
 let denied=true;const calls=[]
 const handlers=schoolDeviceAdminHandlers({adminContext:async()=>denied?{error:Response.json({}, {status:401})}:{admin:{owner:false}},actorOf:()=>({id:'team'}),supabaseAdmin:()=>({rpc:async(name,input)=>{calls.push({name,input});return name==='desktop_school_usage_summary'?{error:{code:'PGRST202'}}:{data:{schools:[],devices:[]}}}})})
 assert.equal((await handlers.GET()).status,401);assert.equal(calls.length,0)
 denied=false
 const r=await handlers.GET(new Request('https://example.com/api/admin/school-devices?days=999'))
 assert.equal(r.status,200);const body=await r.json();assert.equal(body.usageAvailable,false);assert.equal(body.canManage,false);assert.deepEqual(body.devices,[])
 assert.equal(calls.find(c=>c.name==='desktop_school_usage_summary').input.p_days,30)
})


test('school read cache shares registry across periods and caches usage without bypassing auth',async()=>{
 let deny=false;const calls=[];const entries=new Map()
 const memo=async(key,_ttl,load)=>{if(!entries.has(key))entries.set(key,Promise.resolve().then(load));return entries.get(key)}
 const handlers=schoolDeviceAdminHandlers({memo,adminContext:async()=>deny?{error:Response.json({}, {status:401})}:{admin:{owner:true}},actorOf:()=>({id:'owner'}),supabaseAdmin:()=>({rpc:async(name,input)=>{calls.push({name,input});return {data:name==='desktop_school_service_admin'?{schools:[],devices:[]}:{totals:{}}}}})})
 for(const period of [1,1,7,7,1]) assert.equal((await handlers.GET(new Request('https://local/api/admin/school-devices?days='+period))).status,200)
 assert.equal(calls.filter(c=>c.name==='desktop_school_service_admin').length,1)
 assert.deepEqual(calls.filter(c=>c.name==='desktop_school_usage_summary').map(c=>c.input.p_days),[1,7])
 deny=true;assert.equal((await handlers.GET(new Request('https://local/api/admin/school-devices?days=1'))).status,401)
 assert.equal(calls.length,3)
})

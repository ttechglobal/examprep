import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const backend=process.env.DESKTOP_BACKEND_DIR || resolve('../../examprep_a1_mobile/app/backend')
const pg=resolve(backend,'.validation/node_modules/@electric-sql/pglite/dist/index.js')
test('shared analytics SQL reconciles web/app, excludes anonymous/tests, preserves dates and denies clients', {skip:!existsSync(pg)&&'PGlite dependency required'},async()=>{
 const {PGlite}=await import(pathToFileURL(pg));const db=new PGlite()
 const query=(sql,args=[])=>db.query(sql,args)
 const scalar=async(sql,args=[]) => (await query(sql,args)).rows[0].r
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email text,is_anonymous boolean default false);
 create table profiles(id uuid primary key,full_name text,username text,role text default 'student',created_at timestamptz default now());
 create table subjects(id uuid primary key,name text);create table topics(id uuid primary key,name text);
 create table practice_sessions(student_id uuid,session_id text,mode text,topic_name text,exam_type text,created_at timestamptz default now(),completed boolean default true);
 create table question_attempts(student_id uuid,session_id text,subject_id uuid,topic_id uuid,subject_name text,exam_type text,created_at timestamptz default now(),is_correct boolean);
 create table account_topic_results(account uuid,session_id text,subject_id uuid,topic_id uuid,subject_name text,exam text,attempted_at timestamptz,answered bigint,correct bigint);
 create table account_progress_events(account uuid,id text,kind text);create index on account_progress_events(account,id);
 create table account_progress_state(account uuid,updated_at timestamptz);
 create table student_events(student_id uuid,event text,feature text,ref text,detail jsonb);
 create unique index student_events_once on student_events(student_id,event,ref) where ref is not null;
 create function analytics_session_feature(text,text) returns text language sql immutable as $$select case when $1='battle' then 'battle' when $1='quick5' then 'quick5' else 'custom' end$$;
 `)
 const ids=['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006']
 for(let i=0;i<ids.length;i++){
  await query('insert into auth.users values($1,$2,$3)',[ids[i],i===3?'native-signup-check-ccd468c4ef73@examprepa1.online':'student'+i+'@example.com',i===2])
  await query("insert into profiles(id,full_name,created_at)values($1,$2,now()-interval '2 days')",[ids[i],'Student '+i])
 }
 const subject='11111111-1111-1111-1111-111111111111',topic='22222222-2222-2222-2222-222222222222'
 await query('insert into subjects values($1,$2)',[subject,'Math']);await query('insert into topics values($1,$2)',[topic,'Algebra'])
 // Pre-migration native session, original activity date five days earlier.
 await query("insert into account_progress_events values($1,'practice:app-old','practice')",[ids[1]])
 await query("insert into practice_sessions values($1,'app-old','practice','Algebra','WAEC',now()-interval '5 days',true)",[ids[1]])
 await query("insert into account_topic_results values($1,'app-old',$2,$3,'Math','WAEC',now()-interval '5 days',76,47)",[ids[1],subject,topic])
 // Web evidence, plus deliberately overlapping native summary: server answer wins.
 for(const i of [0,2,3]){
  const sid='web-'+i
  await query("insert into practice_sessions values($1,$2,'quick5',null,'WAEC',now()-interval '1 hour',true)",[ids[i],sid])
  await query("insert into question_attempts values($1,$2,$3,$4,'Math','WAEC',now()-interval '1 hour',true)",[ids[i],sid,subject,topic])
 }
 await query("insert into account_topic_results values($1,'web-0',$2,$3,'Math','WAEC',now(),1,1)",[ids[0],subject,topic])
 const migration=await readFile(new URL('../src/supabase/migrations/20261022_shared_analytics.sql',import.meta.url),'utf8')
 await db.exec(migration);await db.exec(migration)
 const snapshot=()=>scalar('select admin_analytics_snapshot(7,null) r')
 let d=await snapshot()
 assert.equal(d.kpis.questions,77);assert.equal(d.kpis.active,2);assert.equal(d.kpis.sessions,2)
 assert.equal(d.platforms.find(p=>p.source==='app').questions,76);assert.equal(d.platforms.find(p=>p.source==='web').questions,1)
 assert.equal(d.daily.reduce((n,r)=>n+r.questions,0),77);assert.equal(d.subjects[0].questions,77)
 assert.equal(d.difficult.length,0,'three distinct students required')
 assert.equal(d.needs_start.length,2,'anonymous and test excluded; two unused genuine accounts')
 assert.equal(d.daily.find(row=>row.questions===76).day, (await query("select ((now()-interval '5 days') at time zone 'Africa/Lagos')::date::text d")).rows[0].d)
 // New native session after migration is attributed by its existing sync identity.
 await query("insert into account_progress_events values($1,'battle:app-new','battle')",[ids[0]])
 await query("insert into practice_sessions values($1,'app-new','battle',null,'JAMB',now(),true)",[ids[0]])
 await query("insert into account_topic_results values($1,'app-new',$2,$3,'Math','JAMB',now(),3,2)",[ids[0],subject,topic])
 d=await snapshot();assert.equal(d.kpis.questions,80);assert.equal(d.kpis.active,2,'same account on web and app counted once')
 assert.equal(d.platforms.find(p=>p.source==='app').students,2);assert.equal(d.platforms.find(p=>p.source==='web').students,1)
 const jamb=await scalar("select admin_analytics_snapshot(7,'JAMB') r");assert.equal(jamb.kpis.questions,3)
 // A session-only import with no evidence stays Unknown.
 await query("insert into practice_sessions values($1,'mystery','practice',null,'WAEC',now(),true)",[ids[4]])
 assert.equal((await snapshot()).coverage.unknown_sessions,1)
 // Existing web completion event stamps origin without an extra network request.
 await query("select record_student_event($1,'session_complete','custom','ref',$2)",[ids[4],{source:'web',session_id:'mystery'}])
 assert.equal((await snapshot()).coverage.unknown_sessions,0)
 // A larger cohort still returns bounded lists and aggregates, not raw rows.
 await db.exec(`insert into auth.users select md5('bulk-'||g)::uuid,'bulk-'||g||'@example.com',false from generate_series(1,1000)g;
 insert into profiles(id,full_name,created_at) select id,'Bulk student',now()-interval '2 days' from auth.users where email like 'bulk-%';
 insert into practice_sessions select id,'bulk-session-'||id,'quick5',null,'WAEC',now()-interval '1 hour',true from auth.users where email like 'bulk-%';
 insert into question_attempts select id,'bulk-session-'||id,null,null,'Math','WAEC',now()-interval '1 hour',true from auth.users where email like 'bulk-%';`)
 const larger=await snapshot();assert.equal(larger.kpis.active,1002);assert.equal(larger.kpis.questions,1080)
 assert.equal(larger.students.length,30);assert.ok(larger.needs_start.length<=20);assert.ok(larger.needs_return.length<=20)
 assert.ok(JSON.stringify(larger).length<40000,'API response stays compact as student population grows')
 // Follow-up migration: rolling windows, owner-confirmed history, PvP and school averages.
 await db.exec(`create table desktop_devices(id text primary key,school_id uuid);
 create table desktop_school_usage_events(device_id text,event_id uuid,event_type text check(event_type in ('practice','computer_battle','feedback')),occurred_at timestamptz,questions_answered integer,duration_seconds integer,feedback_reason text,primary key(device_id,event_type,event_id));
 create table desktop_school_usage_status(device_id text primary key,last_reported_at timestamptz default now(),app_version text);
 create function desktop_activation_execute(text,jsonb,jsonb,uuid,text) returns jsonb language sql as $$select '{"registered":true}'::jsonb$$;`)
 const refinement=await readFile(new URL('../src/supabase/migrations/20261022_analytics_usage_refinements.sql',import.meta.url),'utf8')
 await db.exec(refinement);await db.exec(refinement)
 // Historical orphan answer becomes web; native five-day-old history remains app.
 await query("insert into question_attempts values($1,'old-orphan',$2,$3,'Math','WAEC',now()-interval '6 days',true)",[ids[4],subject,topic])
 let revised=await snapshot()
 assert.equal(revised.platforms.find(p=>p.source==='app').questions,79)
 assert.equal(revised.platforms.find(p=>p.source==='web').questions,2)
 assert.equal(revised.platforms.find(p=>p.source==='unknown').questions,1000,'new unattributed activity remains unknown')
 // 25-hour-old answer belongs to the preceding 24 hours, not the rolling current window.
 await query("insert into question_attempts values($1,'outside24',$2,$3,'Math','WAEC',now()-interval '25 hours',true)",[ids[4],subject,topic])
 await query("insert into question_attempts values($1,'inside24',$2,$3,'Math','WAEC',now()-interval '23 hours',true)",[ids[4],subject,topic])
 const day=await scalar('select admin_analytics_snapshot(1,null) r')
 assert.equal(day.kpis.questions,1005);assert.equal(day.kpis.questions_prev,1)
 assert.equal(Date.parse(day.range.end_at)-Date.parse(day.range.start_at),86400000)
 assert.equal(day.daily.reduce((n,r)=>n+r.questions,0),day.kpis.questions)
 // PvP answers already contribute to learning; one participant session is derived, without double counting questions.
 for(let i=0;i<2;i++) await query("insert into question_attempts values($1,'pvp-fixture',$2,$3,'Math','JAMB',now()-interval '2 hours',true)",[ids[i],subject,topic])
 revised=await snapshot()
 assert.equal(revised.features.find(f=>f.feature==='battle_friends').sessions,2)
 assert.equal(revised.kpis.sessions,1006)
 const filtered=await scalar("select admin_analytics_snapshot(1,'WAEC') r")
 assert.ok(!filtered.features.some(f=>f.feature==='battle_friends'))
 // Full 90-day denominators include quiet days, independent of selected filter.
 await db.exec(`insert into desktop_devices values('device-1','33333333-3333-3333-3333-333333333333');
 insert into desktop_school_usage_events values
 ('device-1',gen_random_uuid(),'practice',now()-interval '23 hours',10,600,null),
 ('device-1',gen_random_uuid(),'computer_battle',now()-interval '25 hours',20,1200,null),
 ('device-1',gen_random_uuid(),'practice',now()-interval '91 days',500,3600,null);`)
 const school24=await scalar('select desktop_school_usage_summary(1) r')
 assert.equal(school24.totals.sessions_completed,1);assert.equal(school24.totals.questions_answered,10)
 assert.equal(school24.averages.sessions_per_day,2/90);assert.equal(school24.averages.questions_per_day,30/90)
 assert.equal(school24.averages.minutes_per_day,30/90)
 const school7=await scalar('select desktop_school_usage_summary(7) r')
 assert.equal(school7.totals.sessions_completed,2);assert.deepEqual(school7.averages,school24.averages)
 await query("select desktop_school_usage_report($1,$2,gen_random_uuid())",[{device_id:'device-1'},{events:[{event_id:crypto.randomUUID(),event_type:'friend_battle',occurred_at:new Date(Date.now()-10000).toISOString(),questions_answered:5,duration_seconds:60}]}])
 assert.equal((await scalar('select desktop_school_usage_summary(1) r')).modes.find(m=>m.event_type==='friend_battle').sessions,1)
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role)
  await assert.rejects(query('select admin_analytics_snapshot(7,null)'),/permission denied/)
  await assert.rejects(query('select * from analytics_learning_facts'),/permission denied/)
  await assert.rejects(query('select * from analytics_session_origins'),/permission denied/)
  await assert.rejects(query("select record_student_event($1,'session_complete','custom','x','{}')",[ids[0]]),/permission denied/)
  await db.exec('reset role')
 }
 }finally{await db.close()}
})

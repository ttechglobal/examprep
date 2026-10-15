// Real PostgreSQL (PGlite) integration tests. Set EXAMPREP_PGLITE_PATH to an
// externally installed @electric-sql/pglite/dist/index.js; no app dependency.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const runtime = process.env.EXAMPREP_PGLITE_PATH
const migration = await readFile(new URL('../src/supabase/migrations/20261014_practice_challenges.sql', import.meta.url), 'utf8')
const sqlTest = runtime ? test : test.skip
const student = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const topic = '33333333-3333-4333-8333-333333333333'
const subject = '44444444-4444-4444-8444-444444444444'
const session = '55555555-5555-4555-8555-555555555555'
const items = JSON.stringify([{ exam: 'WAEC', subject_id: subject, subject_name: 'Chemistry', topic_id: topic, topic_name: 'States of Matter' }])

async function setup() {
  const { PGlite } = await import(pathToFileURL(runtime))
  const db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table profiles(id uuid primary key,total_points integer default 0,battle_xp integer default 0);
    create table practice_sessions(student_id uuid,session_id text,mode text,exam_type text);
    create table question_attempts(student_id uuid,session_id uuid,question_id uuid,topic_id uuid,created_at timestamptz);
    create function app_today() returns date language sql stable as $$select '2026-10-15'::date$$;
    create function award_xp(p_student uuid,p_xp integer) returns void language sql as $$update profiles set total_points=total_points+p_xp where id=p_student$$;
    insert into profiles(id) values ('${student}'),('${other}');
    insert into practice_sessions values ('${student}','${session}','practice','WAEC');
  `)
  await db.exec(migration)
  await db.exec(migration) // Deployment must be safe to re-run.
  await db.query('select create_practice_challenges($1,$2::jsonb,false)', [student, items])
  return db
}
const snapshot = async (db, id = student) => (await db.query('select read_practice_challenges($1) as data', [id])).rows[0].data
async function answers(db, count = 10, at = '2026-10-15T10:00:00Z') {
  await db.query(`insert into question_attempts select $1::uuid,$2::uuid,gen_random_uuid(),$3::uuid,$4::timestamptz from generate_series(1,$5::int)`, [student,session,topic,at,count])
}

sqlTest('Practice progress excludes Battle, other accounts, wrong exams and repeated questions', async () => {
  const db = await setup()
  try {
    await answers(db, 10)
    await db.exec("update practice_sessions set mode='battle'")
    assert.equal((await snapshot(db)).set.challenges[0].progress, 0)
    await db.exec("update practice_sessions set mode='practice',exam_type='JAMB'")
    assert.equal((await snapshot(db)).set.challenges[0].progress, 0)
    await db.exec("update practice_sessions set exam_type='WAEC'; delete from question_attempts")
    await answers(db, 1)
    await db.exec('insert into question_attempts select * from question_attempts')
    assert.equal((await snapshot(db)).set.challenges[0].progress, 1)
    assert.equal((await snapshot(db, other)).set, null)
  } finally { await db.close() }
})

sqlTest('mission XP and early completion bonus are each awarded exactly once', async () => {
  const db = await setup()
  try {
    await answers(db)
    const first = await snapshot(db)
    assert.equal(first.student_id,student)
    assert.equal(first.xp_awarded, 75)
    assert.equal(first.set.bonus_xp, 25)
    assert.equal(first.set.can_unlock, true)
    const again = await snapshot(db)
    assert.equal(again.xp_awarded, 0)
    assert.equal(again.total_points, 75)
    assert.equal((await db.query('select battle_xp from profiles where id=$1', [student])).rows[0].battle_xp, 0)
  } finally { await db.close() }
})

sqlTest('late claim uses verified completion date and pays last week once', async () => {
  const db = await setup()
  try {
    await answers(db)
    await db.exec("create or replace function app_today() returns date language sql stable as $$select '2026-10-19'::date$$")
    const paid = await snapshot(db)
    assert.equal(paid.xp_awarded, 75)
    assert.equal(paid.set, null)
    assert.equal((await snapshot(db)).xp_awarded, 0)
  } finally { await db.close() }
})

sqlTest('extra set cannot unlock early and ignores answers before its start', async () => {
  const db = await setup()
  try {
    await assert.rejects(db.query('select create_practice_challenges($1,$2::jsonb,true)', [student, items]))
    await answers(db); await snapshot(db)
    await db.query('select create_practice_challenges($1,$2::jsonb,true)', [student, items])
    await db.exec("update practice_challenge_sets set starts_at='2026-10-16T00:00:00Z' where set_number=2")
    assert.equal((await snapshot(db)).set.challenges[0].progress, 0)
    await answers(db, 10, '2026-10-16T01:00:00Z')
    const extra = await snapshot(db)
    assert.equal(extra.xp_awarded, 50)
    assert.equal(extra.set.number, 2)
    assert.equal(extra.set.can_unlock, false)
    assert.equal(extra.completed_sets[0].bonus_xp,25)
    await assert.rejects(db.query('select create_practice_challenges($1,$2::jsonb,true)', [student, items]))
    assert.equal((await snapshot(db)).total_points, 125)
  } finally { await db.close() }
})

sqlTest('an incompatible existing challenge schema is rejected on redeployment', async () => {
  const db = await setup()
  try {
    await db.exec('alter table practice_challenges alter column xp type bigint')
    await assert.rejects(db.exec(migration),/schema does not match/)
    await db.exec('rollback')
  } finally { await db.close() }
})

sqlTest('Sunday completion has no early bonus and public roles cannot read or award', async () => {
  const db = await setup()
  try {
    await answers(db,10,'2026-10-18T10:00:00Z')
    await db.exec("create or replace function app_today() returns date language sql stable as $$select '2026-10-18'::date$$")
    const data = await snapshot(db)
    assert.equal(data.xp_awarded, 50)
    assert.equal(data.set.can_unlock, false)
    const { rows } = await db.query(`select has_function_privilege('authenticated','read_practice_challenges(uuid)','execute') as can_award,
      has_table_privilege('anon','practice_challenges','select') as can_read`)
    assert.equal(rows[0].can_award, false)
    assert.equal(rows[0].can_read, false)
  } finally { await db.close() }
})

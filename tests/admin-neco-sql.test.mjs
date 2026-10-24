import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const backend = process.env.DESKTOP_BACKEND_DIR || resolve('../../examprep_a1_mobile/app/backend')
const runtime = resolve(backend, '.validation/node_modules/@electric-sql/pglite/dist/index.js')

test('NECO migration preserves IDs, normalises legacy content, updates SQL and reruns safely', { skip: !existsSync(runtime) }, async () => {
  const { PGlite } = await import(pathToFileURL(runtime))
  const db = new PGlite()
  try {
    await db.exec(`
      create table subjects(id int primary key, exam_type text check(exam_type in ('WAEC','JAMB','BOTH','IGCSE')));
      create table topics(id int primary key, subject_id int, exam_type text default 'BOTH', exam_types text[] check(exam_types <@ array['WAEC','JAMB','BOTH','IGCSE']));
      create table subtopics(id int primary key, topic_id int, exam_type text, exam_types text[] check(exam_types <@ array['WAEC','JAMB','BOTH','IGCSE']));
      create table questions(id int primary key, subject_id int, exam_type text check(exam_type in ('WAEC','JAMB','BOTH','IGCSE')), exam_types text[], year text, is_active boolean);
      create table coverage_summary(subject_id int, exam_type text, year int, count bigint);
      insert into subjects values(1,'WAEC'),(2,'JAMB'),(3,'IGCSE');
      insert into topics values(10,1,'BOTH',array['BOTH']);
      insert into subtopics values(20,10,'BOTH',null);
      insert into questions values(30,1,'BOTH',null,'2024',true),(31,2,'JAMB',null,'2024',true);
      create function topic_question_counts(p_exam text) returns bigint language sql as $$
        select count(*) from questions q where q.exam_type in (p_exam, 'BOTH')
      $$;
    `)
    const migration = await readFile(new URL('../src/supabase/migrations/20261022_admin_neco.sql', import.meta.url), 'utf8')
    assert.doesNotMatch(migration, /create\s+temporary\s+table/i)
    assert.equal((migration.match(/do \$\$/gi) || []).length, 1)
    await db.exec(migration)
    await db.exec(migration)
    assert.deepEqual((await db.query('select id,exam_type,exam_types from questions order by id')).rows,
      [{ id: 30, exam_type: 'WAEC', exam_types: ['WAEC'] }, { id: 31, exam_type: 'JAMB', exam_types: ['JAMB'] }])
    assert.equal((await db.query('select exam_type from subtopics')).rows[0].exam_type, 'WAEC')
    assert.equal((await db.query("select topic_question_counts('NECO') n")).rows[0].n, 0)
    await db.exec("insert into subjects values(4,'NECO'); insert into questions values(32,4,'NECO',array['NECO'],'2024',true)")
    await assert.rejects(db.exec("insert into questions values(33,1,'BOTH',null,'2024',true)"), /check constraint/)
    assert.equal(Number((await db.query('select sum(count) n from coverage_summary')).rows[0].n), 2)
    await db.exec(`insert into questions values
      (34,1,'WAEC',null,' 2024 ',true),
      (35,1,'WAEC',null,'unknown',true),
      (36,1,'WAEC',null,'',true),
      (37,1,'WAEC',null,null,true),
      (38,1,'WAEC',null,'999999999999999',true),
      (39,1,'WAEC',null,'2025',false)`)
    await db.exec(migration)
    assert.equal(Number((await db.query('select sum(count) n from coverage_summary')).rows[0].n), 4)
    assert.equal(Number((await db.query("select count from coverage_summary where subject_id=1 and year=2024")).rows[0].count), 2)
    assert.equal((await db.query('select count(*) n from questions')).rows[0].n, 9)
    await db.exec('alter table subjects drop constraint content_exam_no_shared_tag; alter table subjects drop constraint subjects_exam_type_check; insert into subjects values(5,\'BOTH\')')
    await assert.rejects(db.exec(migration), /Split subjects tagged BOTH/)
    await db.exec('rollback')
  } finally {
    await db.close()
  }
})

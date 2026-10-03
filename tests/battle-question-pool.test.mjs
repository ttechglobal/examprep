import test from 'node:test'
import assert from 'node:assert/strict'
import { selectedTopicIds, loadQuestionPool } from '../src/lib/battleQuestionPool.js'
import { battleQuestionParams } from '../src/lib/battleQuestionRequest.js'

const id = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`

test('new and legacy topic selections validate, deduplicate, and reject invalid or oversized input', () => {
  assert.deepEqual(selectedTopicIds(new URLSearchParams({topic_ids:` ${id(1)},${id(2)},${id(1)} `})),[id(1),id(2)])
  assert.deepEqual(selectedTopicIds(new URLSearchParams({topic_id:id(1)})),[id(1)])
  assert.throws(() => selectedTopicIds(new URLSearchParams({topic_ids:'broken'})))
  assert.throws(() => selectedTopicIds(new URLSearchParams({topic_ids:Array.from({length:13},(_,i)=>id(i)).join(',')})))
})

test('a 50-round rematch retains all topic filters and excludes prior questions', () => {
  const params = battleQuestionParams({exam:'JAMB',subject_id:id(20),topic_ids:[id(1),id(2)],count:50,_exclude:`${id(8)},${id(9)}`},123)
  assert.equal(params.get('count'),'50')
  assert.equal(params.get('exclude'),`${id(8)},${id(9)}`)
  assert.deepEqual(selectedTopicIds(params),[id(1),id(2)])
  assert.equal(params.get('subject_id'),id(20))
})

test('topic pools preserve subject/exam/exclusions and cannot duplicate rounds', async () => {
  const calls = []
  const db = {rpc:async(name,args) => {calls.push({name,args});return {data:[{id:id(90)},{id:args.p_topic_id}],error:null}}}
  const rows = await loadQuestionPool(db,{subjectIds:[id(20)],exam:'WAEC',topicIds:[id(1),id(2)],excludeIds:[id(9)],count:50})
  assert.equal(rows.length,3)
  for (const {name,args} of calls) {
    assert.equal(name,'get_practice_questions')
    assert.deepEqual(args.p_subject_ids,[id(20)])
    assert.equal(args.p_exam,'WAEC')
    assert.deepEqual(args.p_exclude,[id(9)])
    assert.equal(args.p_pool,150)
  }
})

test('a failed selected topic fails the match rather than hiding missing questions', async () => {
  const failure = new Error('pool unavailable')
  const db = {rpc:async(_,args)=>args.p_topic_id===id(2) ? {error:failure} : {data:[{id:id(90)}]}}
  await assert.rejects(loadQuestionPool(db,{subjectIds:[id(20)],exam:'WAEC',topicIds:[id(1),id(2)],excludeIds:[],count:5}),failure)
})

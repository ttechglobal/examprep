import test from 'node:test'
import assert from 'node:assert/strict'
import { topicSessionConfig, questionTimeLimit } from '../src/lib/topicSession.js'
const selection = {subject:{id:'chemistry',name:'Chemistry'},topic:{id:'atoms',name:'Atoms'},exam:'WAEC'}
test('topic and challenge sessions preserve their topic with either short or long question counts', () => {
  for (const count of [5,10,20,30,50]) {
    const config = topicSessionConfig({...selection,count,perQuestionSecs:0})
    assert.equal(config.count,count)
    assert.equal(config.topic_id,'atoms')
    assert.equal(config.subject_id,'chemistry')
    assert.equal(config.examType,'WAEC')
    assert.equal(questionTimeLimit(config),null)
  }
})
test('per-question countdown does not turn ordinary topic practice into Speed Round', () => {
  const config = topicSessionConfig({...selection,count:10,perQuestionSecs:30})
  assert.equal(config.mode,'practice')
  assert.equal(config.sessionType,'practice')
  assert.equal(questionTimeLimit(config),30)
  assert.equal(questionTimeLimit({mode:'timed'}),30)
  assert.equal(questionTimeLimit({mode:'timed',speedSecs:60}),60)
  assert.equal(questionTimeLimit({mode:'practice'}),null)
})
test('incomplete topics and unsupported options cannot produce a session', () => {
  for (const change of [{topic:null},{subject:null},{count:0},{count:6},{perQuestionSecs:-1},{perQuestionSecs:5}]) {
    assert.throws(() => topicSessionConfig({...selection,count:10,perQuestionSecs:0,...change}))
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { BattleAudio } from '../src/lib/battleAudio.js'

test('muting cancels announcements and volume controls the shared output', () => {
  let cancelled = 0
  globalThis.window = {speechSynthesis:{cancel(){cancelled++}}}
  const audio = new BattleAudio()
  audio.master = {gain:{value:1}}
  audio.configure({sound:true,volume:.3})
  assert.equal(audio.master.gain.value,.3)
  audio.configure({sound:false,volume:.8})
  assert.equal(audio.master.gain.value,0)
  assert.equal(cancelled,1)
})

test('hidden tabs stop music and disposal closes audio and cancels speech', () => {
  let suspended = 0, closed = 0, cancelled = 0
  globalThis.window = {speechSynthesis:{cancel(){cancelled++}}}
  const audio = new BattleAudio()
  audio.context = {suspend(){suspended++},close(){closed++;return Promise.resolve()}}
  audio.timer = setInterval(()=>{},1000)
  audio.suspend(true)
  assert.equal(audio.timer,null)
  assert.equal(suspended,1)
  audio.dispose()
  assert.equal(audio.context,null)
  assert.equal(closed,1)
  assert.equal(cancelled,2)
  assert.equal(audio.disposed,true)
})

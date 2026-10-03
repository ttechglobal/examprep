import test from 'node:test'
import assert from 'node:assert/strict'
import { SONGS, STEPS_PER_BAR, eventsAt, midiToFreq, stepSeconds } from '../src/lib/battleMusic.js'
import { BattleAudio, bestVoice } from '../src/lib/battleAudio.js'

test('every note of both songs falls inside its loop', () => {
  for (const [name, song] of Object.entries(SONGS)) {
    const loop = song.chords.length * STEPS_PER_BAR
    for (const [step, midi, length] of [...song.melody, ...song.bass]) {
      assert.ok(step >= 0 && step < loop, `${name} step ${step}`)
      assert.ok(length > 0 && midi > 20 && midi < 110, `${name} note ${midi}`)
    }
  }
})

test('the downbeat brings in the band and the loop repeats exactly', () => {
  for (const song of Object.values(SONGS)) {
    const parts = eventsAt(song, 0).map(event => event.part)
    for (const part of ['pad', 'bass', 'lead', 'kick']) assert.ok(parts.includes(part), part)
    const loop = song.chords.length * STEPS_PER_BAR
    assert.deepEqual(eventsAt(song, loop + 5), eventsAt(song, 5))
  }
  assert.ok(stepSeconds(SONGS.match) < stepSeconds(SONGS.lobby), 'the match is faster than the lobby')
  assert.equal(Math.round(midiToFreq(69)), 440)
})

test('the match ends its loop with a snare fill', () => {
  const lastBeat = 7 * STEPS_PER_BAR + 13
  assert.ok(eventsAt(SONGS.match, lastBeat).some(event => event.part === 'snare' && event.soft))
})

test('the announcer prefers natural English voices and avoids robotic ones', () => {
  const voices = [
    { name: 'Microsoft David - English (United States)', lang: 'en-US' },
    { name: 'Microsoft Ezinne Online (Natural) - English (Nigeria)', lang: 'en-NG' },
    { name: 'Google français', lang: 'fr-FR' },
    { name: 'Google UK English Female', lang: 'en-GB' },
  ]
  assert.equal(bestVoice(voices).name, 'Microsoft Ezinne Online (Natural) - English (Nigeria)')
  assert.equal(bestVoice(voices.slice(2)).name, 'Google UK English Female')
  assert.equal(bestVoice([{ name: 'Google français', lang: 'fr-FR' }]), null)
})

test('a finished note detaches its own nodes but never the shared bus', () => {
  const node = name => ({ name, links: [], connect(to) { this.links.push(to.name) }, disconnect() { this.links = []; this.cut = true } })
  const source = { ...node('source'), start() {}, stop() {} }
  const filter = node('filter'), env = node('env'), bus = node('bus')
  new BattleAudio().play1(source, [filter, env, bus], 0, 1)
  assert.deepEqual([source.links, filter.links, env.links], [['filter'], ['env'], ['bus']])
  source.onended()
  assert.ok(source.cut && filter.cut && env.cut)
  assert.equal(bus.cut, undefined)
})

test('repeated announcements vary their wording', () => {
  const audio = new BattleAudio()
  const said = Array.from({ length: 6 }, () => audio.phrase('correct'))
  for (let i = 1; i < said.length; i++) assert.notEqual(said[i], said[i - 1])
})

// src/lib/battleAudio.js
// One audio engine per visit to Battle (BattleExperience): music, sound
// effects and the announcer. Everything stops on exit.
//
// Mix:   instruments → music bus (scene fades) → music level (on/off) → duck ─┐
//        sound effects → effects bus ─────────────────────────────────────────┼→ master (volume) → compressor → speakers
//        music and effects also feed a shared reverb ─────────────────────────┘
//
// Music: recorded tracks from lib/battleAudioFiles.js when provided, otherwise
// the songs in lib/battleMusic.js, played by a look-ahead scheduler on the
// audio clock (a timer only queues notes slightly ahead, so busy pages don't
// make the rhythm drift). Scenes cross-fade; music dips under the announcer.
//
// Announcer: recorded voice lines when provided, otherwise the device's speech
// voice, choosing the most natural English voice installed.
import { SONGS, eventsAt, midiToFreq, stepSeconds } from './battleMusic.js'
import { BATTLE_AUDIO_FILES } from './battleAudioFiles.js'

const LOOKAHEAD = 0.12, TICK_MS = 25, MUSIC_LEVEL = 0.75, FADE = 0.35
const SILENT = 0.0001

const PHRASES = {
  correct: ['Correct!', 'Nice one!', 'Great answer!', 'Spot on!'],
  wrong: ['Not quite.', 'Incorrect.', 'So close!'],
  timeout: ['Time’s up!'],
  warning: ['Five seconds left!'],
  win: ['Victory! You won the battle!', 'You won! Brilliant battle!'],
  loss: ['The computer wins this time.', 'Good fight! Try again.'],
  draw: ['It’s a draw!'],
}

// Sound effects as note sequences: [delay s, midi, length s, instrument, level]
const SFX = {
  select: [[0, 88, 0.09, 'blip', 0.1]],
  correct: [[0, 72, 0.5, 'bell', 0.13], [0.07, 76, 0.5, 'bell', 0.13], [0.14, 79, 0.5, 'bell', 0.13], [0.21, 84, 0.9, 'bell', 0.15], [0.3, 96, 0.6, 'bell', 0.04]],
  wrong: [[0, 52, 0.2, 'buzz', 0.12], [0.15, 47, 0.32, 'buzz', 0.12]],
  timeout: [[0, 67, 0.2, 'blip', 0.11], [0.13, 64, 0.2, 'blip', 0.11], [0.26, 60, 0.45, 'blip', 0.12]],
  warning: [[0, 0, 0, 'tick', 0.22], [0.2, 0, 0, 'tick', 0.16]],
  win: [[0, 72, 0.16, 'brass', 0.1], [0.12, 76, 0.16, 'brass', 0.1], [0.24, 79, 0.16, 'brass', 0.1], [0.38, 84, 1.4, 'brass', 0.1], [0.38, 76, 1.4, 'brass', 0.07], [0.38, 79, 1.4, 'brass', 0.07], [0.38, 0, 0, 'crash', 0.14], [0.38, 0, 0, 'boom', 0.35]],
  loss: [[0, 67, 0.7, 'bell', 0.1], [0.32, 63, 0.7, 'bell', 0.1], [0.64, 60, 1.2, 'bell', 0.1], [0.64, 48, 1.2, 'pad', 0.05]],
  draw: [[0, 67, 0.4, 'bell', 0.11], [0.18, 69, 0.4, 'bell', 0.11], [0.36, 67, 0.8, 'bell', 0.11]],
}

export class BattleAudio {
  constructor(files = BATTLE_AUDIO_FILES) {
    this.files = files
    this.context = null
    this.settings = { sound: true, music: true, voice: true, volume: 0.55 }
    this.scene = 'lobby'
    this.song = null
    this.track = null
    this.timer = null
    this.sceneTimer = null
    this.hidden = false
    this.disposed = false
    this.step = 0
    this.nextTime = 0
    this.buffers = new Map()
    this.lastPhrase = {}
    this.voiceChoice = null
  }

  configure(settings) {
    this.settings = { ...this.settings, ...settings }
    const { sound, music, voice, volume } = this.settings
    if (this.master) this.master.gain.value = sound ? volume : 0
    if (this.musicLevel) this.musicLevel.gain.value = music === false ? 0 : MUSIC_LEVEL
    if (!sound || voice === false) globalThis.window?.speechSynthesis?.cancel()
  }

  // Browsers only start audio after a tap or key press; BattleExperience calls
  // this on the first one, and play() calls it too.
  unlock() {
    if (this.disposed) return
    try {
      const Context = window.AudioContext || window.webkitAudioContext
      if (!Context) return
      if (!this.context) this.build(new Context())
      this.context.resume().catch(() => {})
      if (!this.hidden && !this.timer) {
        this.timer = setInterval(() => this.tick(), TICK_MS)
        if (!this.song && !this.track) this.beginScene()
      }
    } catch {}
  }

  build(context) {
    const c = this.context = context
    this.master = c.createGain()
    const compressor = c.createDynamicsCompressor()
    compressor.threshold.value = -14; compressor.knee.value = 8; compressor.ratio.value = 4
    compressor.attack.value = 0.005; compressor.release.value = 0.2
    this.master.connect(compressor); compressor.connect(c.destination)

    this.reverb = c.createConvolver(); this.reverb.buffer = this.impulse(2.2, 3); this.reverb.connect(this.master)
    this.duck = c.createGain(); this.duck.connect(this.master)
    this.musicLevel = c.createGain(); this.musicLevel.connect(this.duck)
    this.musicBus = c.createGain(); this.musicBus.connect(this.musicLevel)
    this.musicSend = c.createGain(); this.musicSend.gain.value = 0.25; this.musicSend.connect(this.reverb)
    this.musicLevel.connect(this.musicSend)
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.master)
    this.sfxSend = c.createGain(); this.sfxSend.gain.value = 0.18; this.sfxSend.connect(this.reverb)
    this.sfxBus.connect(this.sfxSend)

    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.configure(this.settings)
  }

  impulse(seconds, decay) {
    const c = this.context, length = Math.floor(c.sampleRate * seconds), buffer = c.createBuffer(2, length, c.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
    }
    return buffer
  }

  // ── Scenes ────────────────────────────────────────────────────────────────
  setScene(scene) {
    if (scene === this.scene) return
    this.scene = scene
    if (!this.context || this.disposed) return
    const gain = this.musicBus.gain, now = this.context.currentTime
    gain.cancelScheduledValues(now); gain.setValueAtTime(gain.value, now); gain.linearRampToValueAtTime(0, now + FADE)
    this.song = null
    this.stopTrack(FADE)
    clearTimeout(this.sceneTimer)
    this.sceneTimer = setTimeout(() => {
      if (this.disposed || !this.context) return
      this.beginScene()
      const at = this.context.currentTime
      gain.cancelScheduledValues(at); gain.setValueAtTime(0, at); gain.linearRampToValueAtTime(1, at + 0.6)
    }, FADE * 1000 + 30)
  }

  beginScene() {
    const url = this.files.music?.[this.scene]
    this.step = 0
    this.nextTime = this.context.currentTime + 0.08
    if (url) this.playTrack(url, this.scene)
    else this.song = SONGS[this.scene] ?? null
  }

  async playTrack(url, scene) {
    const buffer = await this.load(url)
    if (this.disposed || !this.context || this.scene !== scene || this.track || this.song) return
    if (!buffer) { this.song = SONGS[scene] ?? null; this.nextTime = this.context.currentTime + 0.05; return }
    const source = this.context.createBufferSource()
    source.buffer = buffer; source.loop = true
    source.connect(this.musicBus); source.start()
    this.track = source
  }

  stopTrack(after = 0) {
    if (!this.track) return
    try { this.track.stop(this.context.currentTime + after) } catch {}
    this.track = null
  }

  load(url) {
    if (!this.buffers.has(url)) {
      this.buffers.set(url, fetch(url)
        .then(response => response.ok ? response.arrayBuffer() : Promise.reject(new Error(response.status)))
        .then(data => this.context.decodeAudioData(data))
        .catch(() => null))
    }
    return this.buffers.get(url)
  }

  // The look-ahead scheduler: queue every step that starts within LOOKAHEAD.
  tick() {
    const c = this.context
    if (!c || !this.song || c.state !== 'running') return
    // After a stall (a background tab, a slow device) skip ahead instead of
    // playing the backlog all at once.
    if (this.nextTime < c.currentTime - 0.25) this.nextTime = c.currentTime + 0.05
    const length = stepSeconds(this.song)
    while (this.nextTime < c.currentTime + LOOKAHEAD) {
      for (const event of eventsAt(this.song, this.step)) this.perform(event, this.nextTime, length)
      this.nextTime += length
      this.step++
    }
  }

  perform(event, time, step) {
    const mix = this.song.mix, out = this.musicBus
    const level = mix[event.part === 'openHat' ? 'hat' : event.part] * (event.soft ? 0.55 : 1)
    if (!level) return
    const [first] = event.notes ?? []
    switch (event.part) {
      case 'pad': return event.notes.forEach(note => this.pad(midiToFreq(note), time, event.steps * step, level, out))
      case 'stab': return event.notes.forEach(note => this.pluck(midiToFreq(note), time, 0.2, level, out, 'sawtooth', 2400))
      case 'arp': return this.pluck(midiToFreq(first), time, step * 2.4, level, out, 'triangle', 3200)
      case 'bass': return this.bass(midiToFreq(first), time, event.steps * step, level, out)
      case 'lead': return this.song.leadVoice === 'bell'
        ? this.bell(midiToFreq(first), time, Math.max(0.6, event.steps * step * 1.6), level, out)
        : this.pulse(midiToFreq(first), time, event.steps * step * 0.9, level, out)
      case 'kick': return this.kick(time, level, out)
      case 'snare': return this.snare(time, level, out)
      case 'hat': return this.hat(time, level, out, 0.045)
      case 'openHat': return this.hat(time, level, out, 0.22)
      case 'shaker': return this.shaker(time, level, out)
      case 'rim': return this.tick2(time, level, out, 1700)
    }
  }

  // ── Instruments ───────────────────────────────────────────────────────────
  // Each builds a short-lived chain: source → …nodes → out (a shared bus).
  // When the source ends its own nodes are detached; the bus is left alone.
  play1(source, chain, time, stopAt) {
    const own = chain.slice(0, -1)
    ;[source, ...chain].reduce((from, to) => { from.connect(to); return to })
    source.start(time); source.stop(stopAt)
    source.onended = () => { source.disconnect(); own.forEach(node => node.disconnect()) }
  }
  oscillator(type, frequency, time, detune = 0) {
    const osc = this.context.createOscillator()
    osc.type = type; osc.frequency.setValueAtTime(frequency, time); osc.detune.value = detune
    return osc
  }
  noiseSource() {
    const source = this.context.createBufferSource()
    source.buffer = this.noise
    return source
  }
  filter(type, frequency, q = 0.7) {
    const node = this.context.createBiquadFilter()
    node.type = type; node.frequency.value = frequency; node.Q.value = q
    return node
  }
  envelope(time, peak, attack, decayTo, hold, release) {
    const gain = this.context.createGain(), g = gain.gain
    g.setValueAtTime(SILENT, time)
    g.linearRampToValueAtTime(peak, time + attack)
    if (decayTo != null) g.setTargetAtTime(decayTo, time + attack, hold / 3)
    // An explicit hold point: some Web Audio implementations mishandle a ramp
    // followed directly by a later setTarget.
    else g.setValueAtTime(peak, time + attack + hold)
    g.setTargetAtTime(SILENT, time + attack + hold, release)
    return gain
  }
  pad(frequency, time, length, level, out) {
    for (const detune of [-7, 7]) {
      const osc = this.oscillator('sawtooth', frequency, time, detune)
      const env = this.envelope(time, level / 2, 0.35, null, length, 0.3)
      this.play1(osc, [this.filter('lowpass', 1100, 0.5), env, out], time, time + length + 1.5)
    }
  }
  pluck(frequency, time, length, level, out, type = 'triangle', cutoff = 3000) {
    const osc = this.oscillator(type, frequency, time), lowpass = this.filter('lowpass', cutoff)
    lowpass.frequency.setValueAtTime(cutoff, time)
    lowpass.frequency.exponentialRampToValueAtTime(500, time + length)
    const env = this.envelope(time, level, 0.004, SILENT, length, 0.05)
    this.play1(osc, [lowpass, env, out], time, time + length + 0.3)
  }
  bass(frequency, time, length, level, out) {
    for (const [type, share] of [['triangle', 1], ['sine', 0.8]]) {
      const osc = this.oscillator(type, frequency, time)
      const env = this.envelope(time, level * share, 0.01, level * share * 0.75, length * 0.9, 0.04)
      this.play1(osc, [this.filter('lowpass', 700), env, out], time, time + length + 0.4)
    }
  }
  bell(frequency, time, length, level, out) {
    for (const [ratio, share] of [[1, 1], [2.01, 0.35], [3, 0.12]]) {
      const osc = this.oscillator('sine', frequency * ratio, time)
      const env = this.envelope(time, level * share, 0.003, SILENT, length / ratio, 0.08)
      this.play1(osc, [env, out], time, time + length + 0.5)
    }
  }
  pulse(frequency, time, length, level, out) {
    for (const [type, detune] of [['square', 0], ['triangle', 5]]) {
      const osc = this.oscillator(type, frequency, time, detune), lowpass = this.filter('lowpass', 2600)
      const env = this.envelope(time, level / 2, 0.005, level * 0.3, length, 0.05)
      this.play1(osc, [lowpass, env, out], time, time + length + 0.3)
    }
  }
  kick(time, level, out) {
    const osc = this.oscillator('sine', 140, time)
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12)
    this.play1(osc, [this.envelope(time, level, 0.002, SILENT, 0.08, 0.06), out], time, time + 0.45)
  }
  snare(time, level, out) {
    this.play1(this.noiseSource(), [this.filter('highpass', 1000), this.envelope(time, level, 0.002, SILENT, 0.06, 0.05), out], time, time + 0.3)
    this.play1(this.oscillator('triangle', 185, time), [this.envelope(time, level * 0.6, 0.002, SILENT, 0.03, 0.03), out], time, time + 0.15)
  }
  hat(time, level, out, length) {
    this.play1(this.noiseSource(), [this.filter('highpass', 7500), this.envelope(time, level, 0.002, SILENT, length, length / 2), out], time, time + length * 3)
  }
  shaker(time, level, out) {
    this.play1(this.noiseSource(), [this.filter('bandpass', 5500, 1.2), this.envelope(time, level, 0.012, SILENT, 0.03, 0.03), out], time, time + 0.2)
  }
  tick2(time, level, out, frequency) {
    this.play1(this.oscillator('sine', frequency, time), [this.envelope(time, level, 0.001, SILENT, 0.015, 0.02), out], time, time + 0.12)
  }

  // ── Effects and the announcer ─────────────────────────────────────────────
  play(kind) {
    if (this.disposed || this.hidden || !this.settings.sound) return
    this.unlock()
    const c = this.context
    if (!c) return
    const start = c.currentTime + 0.01, out = this.sfxBus
    for (const [delay, midi, length, instrument, level] of SFX[kind] ?? SFX.select) {
      const time = start + delay, frequency = midiToFreq(midi)
      if (instrument === 'bell') this.bell(frequency, time, length, level, out)
      else if (instrument === 'blip') this.pluck(frequency, time, length, level, out, 'triangle', 6000)
      else if (instrument === 'buzz') this.pluck(frequency, time, length, level, out, 'square', 900)
      else if (instrument === 'brass') this.pulse(frequency, time, length, level, out)
      else if (instrument === 'pad') this.pad(frequency, time, length, level, out)
      else if (instrument === 'tick') this.tick2(time, level, out, 1500)
      else if (instrument === 'boom') this.kick(time, level, out)
      else if (instrument === 'crash') this.hat(time, level, out, 0.9)
    }
    if (PHRASES[kind]) this.announce(kind)
  }

  duckMusic(seconds) {
    if (!this.duck) return
    const g = this.duck.gain, now = this.context.currentTime
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now)
    g.linearRampToValueAtTime(0.35, now + 0.08)
    g.setValueAtTime(0.35, now + seconds)
    g.linearRampToValueAtTime(1, now + seconds + 0.5)
  }

  announce(kind) {
    if (this.settings.voice === false) return
    this.duckMusic(1.6)
    const url = this.files.voice?.[kind]
    if (url) {
      this.load(url).then(buffer => {
        if (!buffer || this.disposed || !this.context || !this.settings.sound) return
        const source = this.context.createBufferSource(), now = this.context.currentTime
        source.buffer = buffer
        this.play1(source, [this.sfxBus], now, now + buffer.duration + 0.1)
      })
      return
    }
    const speech = window.speechSynthesis
    if (!speech || typeof SpeechSynthesisUtterance === 'undefined') return
    speech.cancel()
    const utterance = new SpeechSynthesisUtterance(this.phrase(kind))
    const voice = this.pickVoice()
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang }
    utterance.volume = Math.min(1, this.settings.volume * 1.3)
    utterance.rate = 1.03
    utterance.pitch = 1.08
    speech.speak(utterance)
  }

  phrase(kind) {
    const options = PHRASES[kind], last = this.lastPhrase[kind]
    const fresh = options.length > 1 ? options.filter(text => text !== last) : options
    return this.lastPhrase[kind] = fresh[Math.floor(Math.random() * fresh.length)]
  }

  // The most natural English voice the device has: neural/"natural" voices
  // first, then well-known good ones; Nigerian English is a bonus.
  pickVoice() {
    const voices = window.speechSynthesis?.getVoices?.() ?? []
    if (this.voiceChoice && voices.includes(this.voiceChoice)) return this.voiceChoice
    this.voiceChoice = bestVoice(voices)
    return this.voiceChoice
  }

  suspend(hidden) {
    this.hidden = hidden
    if (hidden) {
      clearInterval(this.timer); this.timer = null
      this.context?.suspend()?.catch?.(() => {})
      globalThis.window?.speechSynthesis?.cancel()
    } else if (this.context) this.unlock()
  }

  dispose() {
    this.disposed = true
    clearInterval(this.timer); this.timer = null
    clearTimeout(this.sceneTimer)
    globalThis.window?.speechSynthesis?.cancel()
    this.context?.close().catch(() => {})
    this.context = null
  }
}

export function bestVoice(voices) {
  let best = null, bestScore = -Infinity
  for (const voice of voices) {
    if (!/^en/i.test(voice.lang ?? '')) continue
    const name = voice.name ?? ''
    let score = 0
    if (/natural|neural|online|premium|enhanced/i.test(name)) score += 6
    if (/google/i.test(name)) score += 4
    if (/samantha|daniel|serena|karen|moira|aria|jenny|guy|libby|sonia|ryan|ava|allison|abeo|ezinne/i.test(name)) score += 3
    if (/en[-_]NG/i.test(voice.lang)) score += 2
    if (/en[-_](GB|US)/i.test(voice.lang)) score += 1
    if (/espeak|compact|novelty|zira|david|mark/i.test(name)) score -= 3
    if (score > bestScore) { bestScore = score; best = voice }
  }
  return best
}

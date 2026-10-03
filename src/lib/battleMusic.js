// src/lib/battleMusic.js
// The battle soundtrack as data, played by lib/battleAudio.js. Pure, so it can
// be tested without audio.
//
// Each song is an 8-bar loop on a sixteenth-note grid (16 steps a bar):
//   chords   one chord per bar, as MIDI notes
//   bass     [step, midi, length] notes
//   melody   [step, midi, length] notes
//   drums    per-bar patterns: step lists for kick, snare, hat, shaker
//   arp      play the chord as rising eighth notes (lobby)
//   stabs    short chord hits on these steps of every bar (match)
//
// lobby  "Courtyard": warm, unhurried C major, bell melody over pads.
// match  "Arena": driving A minor, four-on-the-floor drums and a staccato lead.

export const STEPS_PER_BAR = 16

export const midiToFreq = midi => 440 * 2 ** ((midi - 69) / 12)

const C = [48, 52, 55, 60], Am = [45, 48, 52, 57], F = [41, 45, 48, 53], G = [43, 47, 50, 55], Em = [40, 43, 47, 52], E = [40, 44, 47, 52]

const every = (count, from = 0, by = 1) => Array.from({ length: count }, (_, i) => from + i * by)

export const SONGS = {
  lobby: {
    bpm: 100,
    chords: [C, Am, F, G, C, Em, F, G],
    // Root on beat 1, fifth on beat 3, a pickup into the next bar.
    bass: [C, Am, F, G, C, Em, F, G].flatMap((chord, bar) => {
      const root = chord[0] - 12, at = bar * STEPS_PER_BAR
      return [[at, root, 6], [at + 8, root + 7, 4], [at + 14, root + 12, 2]]
    }),
    melody: [
      [0, 76, 4], [4, 79, 2], [6, 81, 2], [8, 79, 4], [12, 76, 4],
      [16, 72, 4], [20, 76, 4], [24, 74, 6], [30, 72, 2],
      [32, 69, 4], [36, 72, 2], [38, 74, 2], [40, 77, 4], [44, 76, 4],
      [48, 74, 6], [54, 71, 2], [56, 74, 4], [60, 79, 4],
      [64, 84, 4], [68, 81, 2], [70, 79, 2], [72, 76, 4], [76, 79, 4],
      [80, 79, 4], [84, 76, 4], [88, 71, 6], [94, 74, 2],
      [96, 72, 4], [100, 74, 2], [102, 76, 2], [104, 77, 4], [108, 81, 4],
      [112, 79, 8], [120, 74, 4], [124, 71, 4],
    ],
    drums: { kick: [0, 8], snare: [], hat: [], shaker: every(8, 0, 2), rim: [4, 12] },
    arp: true,
    stabs: [],
    leadVoice: 'bell',
    mix: { pad: .06, bass: .09, arp: .12, lead: .22, kick: .26, snare: 0, hat: 0, shaker: .14, rim: .1, stab: 0 },
  },
  match: {
    bpm: 132,
    chords: [Am, F, C, G, Am, F, G, E],
    // Pumping octave eighths.
    bass: [Am, F, C, G, Am, F, G, E].flatMap((chord, bar) =>
      every(8, 0, 2).map(step => [bar * STEPS_PER_BAR + step, chord[0] - 12 + (step % 4 === 2 ? 12 : 0), 1.6])),
    melody: [
      [0, 81, 2], [3, 79, 1], [4, 76, 2], [6, 74, 2], [8, 76, 3], [12, 72, 2], [14, 74, 2],
      [16, 72, 2], [19, 74, 1], [20, 77, 2], [22, 76, 2], [24, 74, 4], [28, 72, 2], [30, 69, 2],
      [32, 79, 2], [35, 76, 1], [36, 79, 2], [38, 81, 2], [40, 84, 4], [44, 79, 4],
      [48, 79, 2], [50, 77, 2], [52, 74, 2], [54, 71, 2], [56, 74, 8],
      [64, 81, 2], [67, 79, 1], [68, 76, 2], [70, 74, 2], [72, 76, 3], [76, 72, 2], [78, 74, 2],
      [80, 72, 2], [83, 74, 1], [84, 77, 2], [86, 76, 2], [88, 74, 4], [92, 72, 2], [94, 69, 2],
      [96, 74, 2], [98, 76, 2], [100, 79, 2], [102, 81, 2], [104, 83, 4], [108, 81, 4],
      [112, 80, 4], [116, 76, 2], [118, 80, 2], [120, 83, 8],
    ],
    drums: { kick: [0, 4, 8, 12], snare: [4, 12], hat: every(8, 2, 2).filter(step => step !== 14), openHat: [14], shaker: [], rim: [] },
    // The last bar ends in a snare roll into the loop.
    fill: { bar: 7, snare: [12, 13, 14, 15] },
    arp: false,
    stabs: [0, 6, 10],
    leadVoice: 'pulse',
    mix: { pad: .035, bass: .1, arp: 0, lead: .16, kick: .36, snare: .2, hat: .06, shaker: 0, rim: 0, stab: .035 },
  },
}

/** Length of one sixteenth note in seconds. */
export const stepSeconds = song => 60 / song.bpm / 4

/** Everything that starts on a step of the loop, as plain events. */
export function eventsAt(song, step) {
  const loop = song.chords.length * STEPS_PER_BAR
  const at = ((step % loop) + loop) % loop
  const bar = Math.floor(at / STEPS_PER_BAR), beat = at % STEPS_PER_BAR
  const chord = song.chords[bar]
  const events = []
  if (beat === 0 && song.mix.pad) events.push({ part: 'pad', notes: chord, steps: STEPS_PER_BAR })
  if (song.stabs.includes(beat)) events.push({ part: 'stab', notes: chord.slice(1).map(n => n + 12), steps: 1 })
  if (song.arp && beat % 2 === 0) {
    const tones = [...chord.slice(1), chord[1] + 12].map(n => n + 12)
    events.push({ part: 'arp', notes: [tones[(beat / 2) % tones.length]], steps: 2 })
  }
  for (const [start, midi, length] of song.bass) if (start === at) events.push({ part: 'bass', notes: [midi], steps: length })
  for (const [start, midi, length] of song.melody) if (start === at) events.push({ part: 'lead', notes: [midi], steps: length })
  for (const drum of ['kick', 'snare', 'hat', 'openHat', 'shaker', 'rim']) {
    if (song.drums[drum]?.includes(beat)) events.push({ part: drum })
  }
  if (song.fill?.bar === bar && song.fill.snare.includes(beat) && !song.drums.snare.includes(beat)) events.push({ part: 'snare', soft: true })
  return events
}

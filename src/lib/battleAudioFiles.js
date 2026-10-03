// src/lib/battleAudioFiles.js
// Recorded audio for Battle. Every entry is optional: null uses the built-in
// synthesized music (lib/battleMusic.js) or the device's speech voice.
//
// To use professional audio, put the files in public/audio/battle/ and set the
// paths here, e.g. lobby: '/audio/battle/lobby.mp3'. Music loops, so export
// tracks that loop seamlessly (MP3 or OGG, 44.1 kHz, about 1-2 minutes,
// normalised to around -16 LUFS). Voice lines are short one-shots.
//
// Only use audio you hold a licence for (your own, commissioned, or a
// royalty-free licence that allows use in a commercial app).
export const BATTLE_AUDIO_FILES = {
  music: {
    lobby: null,   // hub, setup, leaderboard, results
    match: null,   // during a battle
  },
  voice: {
    correct: null,
    wrong: null,
    timeout: null,
    warning: null,
    win: null,
    loss: null,
    draw: null,
  },
}

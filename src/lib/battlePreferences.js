// sound: everything on/off; music and voice (the announcer) under it.
export const DEFAULT_BATTLE_PREFERENCES = { sound: true, music: true, voice: true, volume: .55, reducedMotion: false, count: 10, timerSecs: 30 }
export const BATTLE_COUNTS = [5, 10, 20, 30, 50]
export const BATTLE_TIMERS = [15, 30, 45, 60]
const KEY = 'ep_battle_preferences'
export function readBattlePreferences() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}')
    return {
      sound: p.sound !== false, music: p.music !== false, voice: p.voice !== false, volume: Number.isFinite(p.volume) ? Math.max(0, Math.min(1,p.volume)) : .55, reducedMotion: p.reducedMotion === true,
      count: BATTLE_COUNTS.includes(p.count) ? p.count : 10,
      timerSecs: BATTLE_TIMERS.includes(p.timerSecs) ? p.timerSecs : 30,
    }
  } catch { return { ...DEFAULT_BATTLE_PREFERENCES } }
}
export function saveBattlePreferences(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
    window.dispatchEvent(new Event('battle-preferences-change'))
    return true
  } catch { return false }
}

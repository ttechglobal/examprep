'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import BattleDialog from './BattleDialog'
import { gameFonts } from '../student/gameFonts'
import { readBattlePreferences } from '@/lib/battlePreferences'
import { BattleAudio } from '@/lib/battleAudio'
import { BATTLE_HUB, battleBackTarget } from '@/lib/battleNavigation'
import { preloadBattleAssets } from '@/lib/battleAssets'
import { readLocalBattleStats } from '@/lib/battleAI'
import { GameGlyph } from '../student/GameShell'
import s from './BattleExperience.module.css'

const Context = createContext(null)
export const useBattleExperience = () => useContext(Context)

// Entering the battle world always shows its loading screen for a few
// seconds, like a game starting, even when everything is already saved on the
// phone. Slow artwork can hold it longer, up to LOADING_MAX_MS; after that the
// world opens and the rest arrives as it's shown.
const LOADING_MIN_MS = 3500
const LOADING_MAX_MS = 10000
const TIPS = [
  'Every correct answer earns you 5 XP.',
  'Win a battle for 10 bonus XP. A draw earns 5.',
  'Finish your weekly missions for 50 bonus XP each.',
  'Battle XP is your own score in Battle World.',
  'Every battle counts as practice for your exam.',
  'Pick a topic to train your weak spots.',
]

export { BATTLE_HUB }

const PROMPTS = {
  world: { title: 'Leave Battle World?', body: 'You’ll return to the study app.', confirm: 'Yes, leave Battle', cancel: 'Stay in Battle' },
  match: { title: 'Leave this battle?', body: 'This match will end and its answers won’t be scored.', confirm: 'Leave match', cancel: 'Keep playing' },
}

export default function BattleExperience({ children }) {
  const router = useRouter(), path = usePathname()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [tip, setTip] = useState(0)
  const [prompt, setPrompt] = useState(null)   // { kind: 'world' | 'match', to? }
  // Battle XP (profiles.battle_xp; this device's record for guests) and the
  // all-time battle leaderboard position. Fetched on every entry: only the
  // player's data is live, the world's artwork comes from the phone's cache.
  const [player, setPlayer] = useState(null)   // { xp, rank }
  const audio = useRef(null)
  const lastPath = useRef(path)
  useEffect(() => {
    lastPath.current = path
    // A same-route history entry lets browser/device Back be handled here
    // before Next.js can unmount the game and its confirmation dialog.
    if (window.history.state?.battleGuard !== path) window.history.pushState({...window.history.state,battleGuard:path}, '', window.location.href)
  }, [path])
  useEffect(() => {
    let active = true, completed = 0
    audio.current = new BattleAudio()
    const settings = () => audio.current?.configure(readBattlePreferences())
    const unlock = () => audio.current?.unlock()
    settings()
    window.addEventListener('battle-preferences-change', settings)
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    const onVisibility = () => audio.current?.suspend(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    // Progress follows the slower of the artwork and the minimum time, so the
    // bar always fills smoothly and the screen ends when both are done.
    const assets = preloadBattleAssets()
    const started = Date.now()
    assets.forEach(asset => asset.then(() => { completed++ }))
    const tick = setInterval(() => {
      if (!active) return
      const elapsed = Date.now() - started
      const art = assets.length ? completed / assets.length : 1
      const done = (art >= 1 && elapsed >= LOADING_MIN_MS) || elapsed >= LOADING_MAX_MS
      setProgress(done ? 100 : Math.round(Math.min(art, elapsed / LOADING_MIN_MS) * 100))
      setTip(Math.floor(elapsed / 1800) % TIPS.length)
      if (done) { clearInterval(tick); setTimeout(() => { if (active) setLoading(false) }, 250) }
    }, 100)
    // Music starts with the loading screen. Browsers allow that once the
    // student has tapped anything on the page (the tap that opened Battle);
    // after a cold page load it waits for the first tap instead.
    if (navigator.userActivation?.hasBeenActive) unlock()
    const back = event => {
      if (event.state?.battleGuard === lastPath.current) return
      const target = battleBackTarget(lastPath.current)
      if (target.prompt) {
        window.history.pushState({...window.history.state,battleGuard:lastPath.current}, '', lastPath.current)
        setPrompt({ kind: target.prompt, to: target.to })
      } else router.replace(target.to)
    }
    window.addEventListener('popstate', back)
    return () => {
      active = false; clearInterval(tick); audio.current?.dispose()
      window.removeEventListener('battle-preferences-change', settings)
      window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock)
      window.removeEventListener('popstate', back); document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [router])
  const refreshPlayer = useCallback(() => {
    return fetch('/api/student/battle/stats', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => setPlayer(data.guest || data.battle_xp == null
        ? { xp: readLocalBattleStats().total_battle_xp || 0, rank: null }
        : { xp: data.battle_xp, rank: data.rank }))
      .catch(() => setPlayer(current => current ?? { xp: readLocalBattleStats().total_battle_xp || 0, rank: null }))
  }, [])
  useEffect(() => { refreshPlayer() }, [refreshPlayer])
  useEffect(() => { audio.current?.setScene(path.includes('/session') ? 'match' : 'lobby') }, [path])
  useEffect(() => {
    // The match pauses its clock while a prompt is open.
    window.dispatchEvent(new CustomEvent('battle-exit-prompt', {detail:!!prompt}))
  }, [prompt])
  const experience = useMemo(() => ({
    play: kind => audio.current?.play(kind),
    setScene: scene => audio.current?.setScene(scene),
    exit: () => setPrompt({ kind: 'world' }),
    player,
    // Shows a finished battle's XP at once; refreshPlayer() later replaces it
    // with the server's checked total once the session has synced.
    addBattleXp: xp => setPlayer(current => ({ ...current, xp: (current?.xp || 0) + (xp || 0) })),
    refreshPlayer,
  }), [player, refreshPlayer])
  function confirm() {
    const to = prompt?.to
    setPrompt(null)
    if (to) { router.push(to); return }
    audio.current?.dispose()
    router.push('/student/home')
  }
  const copy = prompt && PROMPTS[prompt.kind]
  return <Context.Provider value={experience}>
    <div className={`${s.experience} ${gameFonts}`}>
      {loading ? <main className={s.loading}>
        <button type="button" className={s.back} onClick={() => setPrompt({ kind: 'world' })}><GameGlyph name="arrow" size={18}/>Back</button>
        <div className={s.crestWrap}><Image src="/images/battle/design/crest.png" alt="" width={160} height={160} priority/></div>
        <h1>Entering Battle World</h1><p>Preparing your adventure…</p>
        <div className={s.track} role="progressbar" aria-label="Loading Battle World" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{width:`${progress}%`}}/></div>
        <strong className={s.percent} aria-hidden="true">{progress}%</strong>
        <p className={s.tip} key={tip}><span>Tip</span>{TIPS[tip]}</p>
      </main> : children}
      {copy && <BattleDialog id="exit-battle" title={copy.title} onClose={() => setPrompt(null)}><p>{copy.body}</p><button className={s.confirm} onClick={confirm}>{copy.confirm}</button><button className={s.cancel} onClick={() => setPrompt(null)}>{copy.cancel}</button></BattleDialog>}
    </div>
  </Context.Provider>
}

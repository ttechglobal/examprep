'use client'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import BattleDialog from './BattleDialog'
import { gameFonts } from '../student/gameFonts'
import { readBattlePreferences } from '@/lib/battlePreferences'
import { BattleAudio } from '@/lib/battleAudio'
import { BATTLE_HUB, battleBackTarget } from '@/lib/battleNavigation'
import s from './BattleExperience.module.css'

const Context = createContext(null)
export const useBattleExperience = () => useContext(Context)
const ASSETS = ['courtyard','guide','robot','robot-book','title-board','crest'].map(name => `/images/battle/design/${name}.png`)

export { BATTLE_HUB }

const PROMPTS = {
  world: { title: 'Leave Battle World?', body: 'You’ll return to the study app.', confirm: 'Yes, leave Battle', cancel: 'Stay in Battle' },
  match: { title: 'Leave this battle?', body: 'This match will end and its answers won’t be scored.', confirm: 'Leave match', cancel: 'Keep playing' },
}

export default function BattleExperience({ children }) {
  const router = useRouter(), path = usePathname()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [prompt, setPrompt] = useState(null)   // { kind: 'world' | 'match', to? }
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
    Promise.allSettled(ASSETS.map(src => new Promise(resolve => {
      const image = new window.Image()
      image.onload = image.onerror = () => { completed++; if (active) setProgress(Math.round(completed / ASSETS.length * 100)); resolve() }
      image.src = src
    }))).then(() => { if (active) setLoading(false) })
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
      active = false; audio.current?.dispose()
      window.removeEventListener('battle-preferences-change', settings)
      window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock)
      window.removeEventListener('popstate', back); document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [router])
  useEffect(() => { audio.current?.setScene(path.includes('/session') ? 'match' : 'lobby') }, [path])
  useEffect(() => {
    // The match pauses its clock while a prompt is open.
    window.dispatchEvent(new CustomEvent('battle-exit-prompt', {detail:!!prompt}))
  }, [prompt])
  const experience = useMemo(() => ({
    play: kind => audio.current?.play(kind),
    setScene: scene => audio.current?.setScene(scene),
    exit: () => setPrompt({ kind: 'world' }),
  }), [])
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
        <Image src="/images/battle/design/crest.png" alt="" width={160} height={160} priority/>
        <h1>Entering Battle World</h1><p>Preparing your adventure…</p>
        <div className={s.track} role="progressbar" aria-label="Loading battle artwork" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{width:`${progress}%`}}/></div>
      </main> : children}
      {copy && <BattleDialog id="exit-battle" title={copy.title} onClose={() => setPrompt(null)}><p>{copy.body}</p><button className={s.confirm} onClick={confirm}>{copy.confirm}</button><button className={s.cancel} onClick={() => setPrompt(null)}>{copy.cancel}</button></BattleDialog>}
    </div>
  </Context.Provider>
}

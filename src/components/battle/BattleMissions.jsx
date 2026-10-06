'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { styles } from './BattleWorld'
import { useBattleExperience } from './BattleExperience'
import IllustratedIcon, { topicArt } from './IllustratedIcon'
import m from './BattleMissions.module.css'

// This week's battle missions (Monday to Sunday): "answer N questions on a
// topic" for the topics examined most often, only in the student's own subjects.
// Progress is counted by the server from battles; finishing one pays its XP
// once (GET /api/student/battle/missions). Tapping a mission opens the battle
// setup already filled in for it.
// From Friday (3 days left) an unfinished week gets a nudge.
const NUDGE_FROM_DAYS_LEFT = 3

export default function BattleMissions() {
  const router = useRouter()
  const experience = useBattleExperience()
  const refreshPlayer = experience?.refreshPlayer
  const [state, setState] = useState({ loading: true, data: null })
  const refreshed = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/student/battle/missions', { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => setState({ loading: false, data }))
      .catch(error => { if (error.name !== 'AbortError') setState({ loading: false, data: null }) })
    return () => controller.abort()
  }, [])

  const data = state.data
  const paid = data?.completed?.length ?? 0
  // Newly paid XP is already on the profile: bring the XP badge up to date.
  useEffect(() => {
    if (paid && !refreshed.current) { refreshed.current = true; refreshPlayer?.() }
  }, [paid, refreshPlayer])

  // Guests, a failed load, and students with no registered subject or no
  // playable topics simply see no card.
  if (state.loading || !data || data.guest || !data.missions?.length) return null

  const missions = data.missions
  const finished = missions.filter(x => x.done).length
  const celebrate = missions.filter(x => data.completed.includes(x.id))
  const bonus = celebrate.reduce((sum, x) => sum + x.xp, 0)
  const open = missions.length - finished
  const nudge = open > 0 && data.days_left <= NUDGE_FROM_DAYS_LEFT

  function start(mission) {
    const left = Math.max(mission.target - mission.progress, 1)
    const query = new URLSearchParams({ exam: mission.exam, subject: mission.subject_id, topic: mission.topic_id, n: String(left) })
    router.push(`/student/battle/setup?${query}`)
  }

  return <section className={styles.panel} aria-label="Weekly missions">
    <div className={m.head}>
      <h2>Weekly missions</h2>
      <small>{finished}/{missions.length} done · {data.days_left === 1 ? 'ends today' : `${data.days_left} days left`}</small>
    </div>
    {celebrate.length > 0 && <p className={`${m.banner} ${m.celebrate}`} role="status">
      Mission complete! You earned +{bonus} XP.
    </p>}
    {nudge && celebrate.length === 0 && <p className={`${m.banner} ${m.nudge}`}>
      {open === 1 ? '1 mission is' : `${open} missions are`} still open. Finish {open === 1 ? 'it' : 'them'} before Sunday to win your XP.
    </p>}
    <ul className={m.list}>
      {missions.map(x => <li key={x.id}>
        <button type="button" className={`${m.mission} ${x.done ? m.done : ''}`} disabled={x.done}
          onClick={() => start(x)}
          aria-label={`${x.topic_name}, ${x.subject_name}: ${x.progress} of ${x.target} questions${x.done ? ', complete' : ''}`}>
          <IllustratedIcon name={topicArt(x.topic_name, x.subject_name)} size={null} className={m.icon}/>
          <span className={m.text}>
            <strong>{x.topic_name}</strong>
            <small>{x.subject_name}{x.exam ? ` · ${x.exam}` : ''} · {x.done ? 'Complete' : `${x.progress}/${x.target} questions`}</small>
            <span className={m.bar} aria-hidden="true"><span style={{ width: `${Math.min(100, Math.round(x.progress / x.target * 100))}%` }}/></span>
          </span>
          <span className={m.reward}>{x.done ? '✓' : `+${x.xp}`}<small>XP</small></span>
        </button>
      </li>)}
    </ul>
  </section>
}

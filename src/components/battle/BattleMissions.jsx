'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BattleWorld, BattleSign, GameButton, styles } from './BattleWorld'
import { BATTLE_HUB, useBattleExperience } from './BattleExperience'
import { GameGlyph } from '@/components/student/GameShell'
import IllustratedIcon, { topicArt } from './IllustratedIcon'
import { useBattleMissions } from './useBattleMissions'
import m from './BattleMissions.module.css'

// Weekly battle missions (Monday to Sunday): "answer N questions on a topic" for
// the topics examined most often, only in the student's own subjects. Progress
// is counted by the server from battles; finishing one pays its XP once.
//
//   MissionsLink    the hub's Missions button, always there, with a one-line status
//   MissionsPage    /student/battle/missions: the missions with progress; tapping
//                   one opens the battle setup already filled in for it
//
// From Friday (3 days left) an unfinished week gets a nudge.
const NUDGE_FROM_DAYS_LEFT = 3

const daysLeftText = days => (days === 1 ? 'ends today' : `${days} days left`)

// What the Missions button says under its name.
function summary({ status, data }) {
  if (status === 'loading') return 'Weekly challenges for bonus XP'
  if (status === 'error' || !data) return 'Tap to try again'
  if (data.guest) return 'Sign in to get weekly missions'
  const missions = data.missions ?? []
  if (!missions.length) return data.reason === 'no_subjects' ? 'Choose your subjects to get missions' : 'Your missions are on their way'
  const bonus = missions.filter(x => data.completed?.includes(x.id)).reduce((sum, x) => sum + x.xp, 0)
  if (bonus) return `Mission complete! +${bonus} XP`
  const done = missions.filter(x => x.done).length
  if (done === missions.length) return 'All missions done this week'
  return `${done} of ${missions.length} done · ${daysLeftText(data.days_left)}`
}

// Newly paid XP is already on the profile: bring the XP badge up to date, once.
function useRefreshOnPayout(data) {
  const refreshPlayer = useBattleExperience()?.refreshPlayer
  const paid = data?.completed?.length ?? 0
  const refreshed = useRef(false)
  useEffect(() => {
    if (paid && !refreshed.current) { refreshed.current = true; refreshPlayer?.() }
  }, [paid, refreshPlayer])
}

/** The hub's Missions button (a child of the hub's links grid). */
export function MissionsLink() {
  const missions = useBattleMissions()
  useRefreshOnPayout(missions.data)

  const open = (missions.data?.missions ?? []).filter(x => !x.done).length
  const alert = missions.status === 'ready' && open > 0 && (missions.data?.days_left ?? 7) <= NUDGE_FROM_DAYS_LEFT
  return <Link className={`${styles.secondary} ${m.entry}`} href="/student/battle/missions">
    <IllustratedIcon name="flame" size={null} className={styles.linkIcon}/>
    <span><strong>Missions</strong><small>{summary(missions)}</small></span>
    {alert ? <span className={m.dot} role="img" aria-label="Missions still open"/> : <GameGlyph name="arrow"/>}
  </Link>
}

/** The Missions page. */
export default function MissionsPage() {
  const router = useRouter()
  const missions = useBattleMissions()
  const { status, data } = missions
  useRefreshOnPayout(data)

  const list = data?.missions ?? []
  const finished = list.filter(x => x.done).length
  const open = list.length - finished
  const celebrate = list.filter(x => data?.completed?.includes(x.id))
  const bonus = celebrate.reduce((sum, x) => sum + x.xp, 0)
  const toEarn = list.filter(x => !x.done).reduce((sum, x) => sum + x.xp, 0)

  function start(mission) {
    const left = Math.max(mission.target - mission.progress, 1)
    const query = new URLSearchParams({ exam: mission.exam, subject: mission.subject_id, topic: mission.topic_id, n: String(left) })
    router.push(`/student/battle/setup?${query}`)
  }

  const subtitle = list.length ? `${finished} of ${list.length} done · ${daysLeftText(data.days_left)}` : 'Clear them each week for bonus XP.'
  const dock = <GameButton arrow onClick={() => router.push('/student/battle/setup')}><GameGlyph name="battle" size={28}/>Battle now</GameButton>

  return <BattleWorld onBack={() => router.push(BATTLE_HUB)} dock={dock} label="Weekly missions"
    guide={{ title: 'Your missions', text: list.length ? `Clear all ${list.length} by Sunday. Each one earns you ${list[0].xp} XP.` : 'Three fresh missions every Monday, built on the topics that matter most in the exam.' }}
    header={<BattleSign title="Weekly|missions">{subtitle}</BattleSign>}>

    {status === 'loading' && <ul className={m.list} aria-label="Loading missions" aria-busy="true">
      {Array.from({ length: 3 }, (_, i) => <li key={i} className={m.skeleton}/>)}
    </ul>}

    {status === 'error' && <div className={`${styles.panel} ${m.message}`} role="alert">
      <strong>Couldn’t load your missions</strong>
      <p>Check your connection, then try again.</p>
      <GameButton secondary onClick={missions.retry}>Try again</GameButton>
    </div>}

    {status === 'ready' && data?.guest && <div className={`${styles.panel} ${m.message}`}>
      <strong>Missions are for signed-in players</strong>
      <p>Create a free account to get three missions every week and earn bonus XP for finishing them.</p>
      <Link className={styles.primary} href="/onboarding?mode=signup">Create a free account</Link>
    </div>}

    {status === 'ready' && !data?.guest && !list.length && <div className={`${styles.panel} ${m.message}`}>
      {data?.reason === 'no_subjects'
        ? <><strong>Choose your subjects first</strong>
          <p>Missions are built from the subjects you study. Add them to your profile and your missions appear here.</p>
          <Link className={styles.primary} href="/student/profile">Choose my subjects</Link></>
        : <><strong>Your missions are on their way</strong>
          <p>We’re still getting questions ready for your subjects. Battle in the meantime, and check back soon.</p></>}
    </div>}

    {status === 'ready' && list.length > 0 && <section aria-label="This week’s missions">
      {celebrate.length > 0 && <p className={`${m.banner} ${m.celebrate}`} role="status">Mission complete! You earned +{bonus} XP.</p>}
      {open > 0 && celebrate.length === 0 && data.days_left <= NUDGE_FROM_DAYS_LEFT && <p className={`${m.banner} ${m.nudge}`}>
        {open === 1 ? '1 mission is' : `${open} missions are`} still open. Finish {open === 1 ? 'it' : 'them'} before Sunday to win your XP.
      </p>}
      {open === 0 && celebrate.length === 0 && <p className={`${m.banner} ${m.celebrate}`}>All done this week. New missions arrive on Monday.</p>}
      <ul className={m.list}>
        {list.map(x => <li key={x.id}>
          <button type="button" className={`${m.mission} ${x.done ? m.done : ''}`} disabled={x.done} onClick={() => start(x)}
            aria-label={`${x.topic_name}, ${x.subject_name}: ${x.progress} of ${x.target} questions${x.done ? ', complete' : ''}`}>
            <IllustratedIcon name={topicArt(x.topic_name, x.subject_name)} size={null} className={m.icon}/>
            <span className={m.text}>
              <strong>{x.topic_name}</strong>
              <small>{x.subject_name} · {x.exam} · {x.done ? 'Complete' : `${x.progress}/${x.target} questions`}</small>
              <span className={m.bar} aria-hidden="true"><span style={{ width: `${Math.min(100, Math.round(x.progress / x.target * 100))}%` }}/></span>
            </span>
            <span className={m.reward}>{x.done ? '✓' : `+${x.xp}`}<small>XP</small></span>
          </button>
        </li>)}
      </ul>
      {toEarn > 0 && <p className={m.note}>Answer questions on a mission’s topic in any battle against the computer this week and it counts. {toEarn} XP still to earn.</p>}
    </section>}
  </BattleWorld>
}

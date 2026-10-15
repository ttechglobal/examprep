'use client'
// Shared Home/Practice challenges. Battle missions use separate data.
import Link from 'next/link'
import { useState, useEffect } from 'react'
import PracticeSetupSheet from '@/components/student/practice/PracticeSetupSheet'
import { useRouter } from 'next/navigation'
import AppIcon from '@/components/ui/AppIcon'
import SubjectIcon from '@/components/ui/SubjectIcon'
import { usePracticeChallenges } from '@/hooks/usePracticeChallenges'
import s from './WeeklyChallenges.module.css'

export default function WeeklyChallenges({ profile }) {
  const state = usePracticeChallenges(profile)
  const router = useRouter()
  const [selected, setSelected] = useState(null)
  const [launchError, setLaunchError] = useState(null)
  useEffect(() => {
    const close = () => setSelected(null)
    window.addEventListener('popstate', close)
    return () => window.removeEventListener('popstate', close)
  }, [])
  function start(item) {
    if (!navigator.onLine) {
      state.reportError('Connect to the internet to load questions. Your saved challenge progress is still here.')
      return
    }
    window.history.pushState(null, '', window.location.href)
    setLaunchError(null)
    setSelected(item)
  }
  function launch(config) {
    if (!navigator.onLine) { setLaunchError('Connect to the internet to load questions.'); return }
    sessionStorage.setItem('practice_config', JSON.stringify({ ...config, ref: crypto.randomUUID() }))
    setSelected(null)
    router.replace('/student/practice/session')
  }
  return <><WeeklyChallengesView {...state} onStart={start} />
    {selected && <PracticeSetupSheet profile={profile} initialScreen="topic-prefs"
      initialTopic={{ exam: selected.exam, subject: { id: selected.subject_id, name: selected.subject_name }, topic: { id: selected.topic_id, name: selected.topic_name } }}
      startError={launchError} onStart={launch} onClose={() => window.history.back()} />}
  </>
}

export function WeeklyChallengesView({ data, loading, stale, error, refresh, unlock, unlocking, onStart }) {
  const set = data?.set
  const items = set?.challenges ?? []
  const done = items.filter(x => x.done).length
  return <section className={s.card} aria-label="Weekly challenges">
    <header className={s.header}>
      <span className={s.medal}><AppIcon name="trophy" size={25} /></span>
      <div><h2>Weekly Challenges</h2></div>
      {data?.days_left && <span className={s.deadline}>{data.days_left === 1 ? 'Ends today' : `${data.days_left} days left`}</span>}
    </header>
    {loading && !data && <div className={s.message} aria-busy="true">Getting your challenges ready…</div>}
    {data?.guest && <div className={s.message}><strong>Your next goal starts here.</strong><p>Sign in for weekly topic challenges and bonus XP.</p><Link href="/onboarding?mode=signup" className={s.action}>Get my challenges <AppIcon name="arrow" size={17} /></Link></div>}
    {!loading && !data?.guest && !set && <div className={s.message}>
      <strong>{error ? 'Challenges are unavailable right now' : data?.reason === 'no_subjects' ? 'Choose your subjects' : 'Your next challenges are on their way'}</strong>
      <p>{error || (data?.reason === 'no_subjects' ? 'Add your exam subjects to get personalised challenges.' : 'Practise while we prepare more topics for you.')}</p>
      {error ? <button className={s.action} onClick={refresh}>Try again</button> : <Link className={s.action} href={data?.reason === 'no_subjects' ? '/student/profile' : '/student/practice'}>Let’s go <AppIcon name="arrow" size={17}/></Link>}
    </div>}
    {set && <>
      <div className={s.overview}><span>{done} of {items.length} complete{set.number > 1 ? ' · Extra set' : ''}</span><strong>+{items.reduce((n,x) => n+x.xp,0)} XP</strong></div>
      <ul className={s.list}>{items.map(item => <li key={item.id}>
        <button className={`${s.challenge} ${item.done ? s.done : ''}`} disabled={item.done} onClick={() => onStart(item)} aria-label={`${item.topic_name}: complete ${item.target} questions, ${item.progress} completed${item.done ? ', complete' : ', set up practice'}`}>
          <span className={s.subject}><SubjectIcon name={item.subject_name} size={24} color="currentColor" /></span>
          <span className={s.details}><strong>{item.topic_name}</strong><small>{item.subject_name} · {item.exam}</small>
            <span className={s.track} role="progressbar" aria-label={item.topic_name} aria-valuemin={0} aria-valuemax={item.target} aria-valuenow={Math.min(item.progress,item.target)}><span style={{width:`${Math.min(100,item.progress/item.target*100)}%`}} /></span>
            <small>Complete {item.target} questions</small>
            <small>{item.done ? 'Completed' : `${item.progress} of ${item.target} completed`}</small>
          </span>
          <span className={s.reward}>{item.done ? <AppIcon name="check" size={20}/> : <>+{item.xp}<small>XP</small></>}</span>
        </button>
      </li>)}</ul>
      {set.bonus_xp > 0 ? <p className={s.bonus}><AppIcon name="bolt" size={17}/>Early finish! +{set.bonus_xp} bonus XP earned.</p>
        : !set.complete && set.number === 1 && data.days_left > 1 && <p className={s.bonus}><AppIcon name="bolt" size={17}/>Finish before Sunday for +{data.early_bonus_xp} bonus XP.</p>}
      {set.can_unlock && data.reason !== 'no_topics' && <button className={s.action} onClick={unlock} disabled={unlocking || stale}>{unlocking ? 'Preparing…' : 'Unlock extra challenges'}<AppIcon name="arrow" size={17}/></button>}
      {set.complete && !set.can_unlock && <p className={s.note}>Set complete. Fresh challenges arrive on Monday.</p>}
      {data.reason === 'no_topics' && <p className={s.note}>You’ve covered the available topics. More challenges next week.</p>}
      {(data.completed_sets ?? []).map(previous => <details key={previous.id} className={s.history}>
        <summary>Set {previous.number} complete · +{previous.challenges.reduce((n,x) => n+x.xp,previous.bonus_xp || 0)} XP</summary>
        <ul>{previous.challenges.map(item => <li key={item.id}>{item.topic_name} · {item.subject_name}</li>)}</ul>
      </details>)}
      {stale && <p className={s.note} role="status">Saved progress · updates when connected</p>}
      {error && <p className={s.note} role="status">{error} <button onClick={refresh}>Retry</button></p>}
    </>}
  </section>
}

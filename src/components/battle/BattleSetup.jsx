'use client'
import { useEffect, useReducer, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getLocalExamType } from '@/lib/localProfile'
import { pvpCall, PVP_TIMER_OPTIONS } from '@/lib/pvp/client'
import { BATTLE_COUNTS, BATTLE_TIMERS, readBattlePreferences, saveBattlePreferences } from '@/lib/battlePreferences'
import PvpNotice from './PvpNotice'
import { useBattleSubjects, useBattleTopics } from './useBattleCatalog'
import { BattleWorld, BattleSign, BattleChoice, GameButton, styles } from './BattleWorld'
import IllustratedIcon, { subjectArt, topicArt } from './IllustratedIcon'
import { GameGlyph } from '@/components/student/GameShell'
import { usePlan } from '@/contexts/PlanContext'

const INITIAL = { step:'exam', exam:'WAEC', subjectId:null, questionSet:'random', topicIds:[], count:10, timerSecs:30 }
function setupReducer(state, action) {
  if (action.type === 'exam') return { ...state, exam:action.exam, subjectId:null, topicIds:[], step:action.advance ? 'subject' : 'exam' }
  if (action.type === 'subject') return { ...state, subjectId:action.id, topicIds:[] }
  if (action.type === 'topic') return { ...state, topicIds:action.single ? [action.id] : state.topicIds.includes(action.id) ? state.topicIds.filter(id => id !== action.id) : state.topicIds.length < 12 ? [...state.topicIds,action.id] : state.topicIds }
  return { ...state, ...action.patch }
}
const GUIDE = {
  exam:{title:'Great!',text:'Which exam do you want to battle today?'},
  subject:{title:'Nice!',text:'Now choose a subject to battle.'},
  type:{title:'Awesome!',text:'How would you like to choose your questions?'},
  topics:{title:'Nice choice!',text:'Pick the topics you want to focus on.'},
  setup:{title:'Almost there!',text:'Set the number of questions and time per question.'},
}
const TITLE = {exam:'Choose|your exam',subject:'Choose your|subject',type:'Choose|question type',topics:'Choose|your topics',setup:'Battle setup'}
const EXAM_NAME = {WAEC:'West African Senior School Certificate',JAMB:'Joint Admissions and Matriculation Board'}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// ?exam=&subject=&topic=&n= from BattleMissions; null unless every part is valid.
function missionFromQuery(search) {
  const q = new URLSearchParams(search)
  const exam = q.get('exam'), subject = q.get('subject'), topic = q.get('topic')
  if (!EXAM_NAME[exam] || !UUID_RE.test(subject || '') || !UUID_RE.test(topic || '')) return null
  return {exam,subject,topic,left:Math.max(parseInt(q.get('n'),10) || 1,1)}
}

export default function BattleSetup({ opponent = 'computer' }) {
  const router = useRouter()
  const plan = usePlan()
  const friend = opponent === 'friend'
  const [state, dispatch] = useReducer(setupReducer, INITIAL)
  const [retry, setRetry] = useState(0)
  const [search, setSearch] = useState('')
  const [selectedOnly, setSelectedOnly] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const subjects = useBattleSubjects(state.exam, retry)
  const subject = subjects.rows.find(s => s.id === state.subjectId) ?? subjects.rows[0] ?? null
  const topics = useBattleTopics(state.exam, subject?.id, retry)
  const selectedTopics = topics.rows.filter(t => state.topicIds.includes(t.id))
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const preferences = readBattlePreferences()
      const patch = {exam:getLocalExamType() || 'WAEC',count:friend && ![5,10,15,20].includes(preferences.count) ? 10 : preferences.count,timerSecs:preferences.timerSecs}
      // A weekly mission opens the setup filled in: its exam, subject and topic,
      // and a question count that covers what's left of the mission.
      const mission = friend ? null : missionFromQuery(window.location.search)
      if (mission) Object.assign(patch,{exam:mission.exam,subjectId:mission.subject,questionSet:'topic',topicIds:[mission.topic],step:'setup',count:BATTLE_COUNTS.find(c => c >= mission.left) ?? BATTLE_COUNTS.at(-1)})
      dispatch({type:'patch',patch})
    })
    return () => cancelAnimationFrame(frame)
  }, [friend])
  const subtitle = {exam:'Which exam would you like to battle?',subject:`${state.exam} - ${EXAM_NAME[state.exam]}`,type:'Pick how you want your battle questions.',topics:friend ? 'Choose a topic to battle.' : 'Select one or more topics to battle.',setup:'Choose how you want to battle.'}[state.step]
  const ready = !!subject?.id && (state.questionSet === 'random' || selectedTopics.length > 0)
  const canContinue = state.step === 'subject' ? !!subject?.id : state.step === 'topics' ? selectedTopics.length > 0 : true
  function back() {
    setError(null)
    if (state.step === 'exam') router.push(friend ? '/student/battle/1v1' : '/student/battle')
    else dispatch({patch:{step:{subject:'exam',type:'subject',topics:'type',setup:state.questionSet === 'topic' ? 'topics' : 'type'}[state.step]}})
  }
  async function start() {
    if (!ready || creating) return
    setError(null)
    // Free plan (lib/plans.js): friend battles are Premium; computer battles
    // have a daily allowance. The questions API checks it again.
    if (!plan.gate(friend ? 'battle_friends' : 'battle')) return
    if (friend) {
      setCreating(true)
      const result = await pvpCall('pvp_create',{p_exam:state.exam,p_subject_id:subject.id,p_topic_id:state.questionSet === 'topic' ? selectedTopics[0]?.id : null,p_question_count:state.count,p_timer_secs:state.timerSecs})
      setCreating(false)
      if (!result.ok) { setNotice(result.error); return }
      router.push(`/student/battle/1v1/lobby?m=${result.match_id}`)
      return
    }
    const config = {
      opponent:'computer',exam:state.exam,subject_id:subject.id,subject_name:subject.name,
      questionSet:state.questionSet,topic_ids:state.questionSet === 'topic' ? selectedTopics.map(t => t.id) : [],
      topic_names:state.questionSet === 'topic' ? selectedTopics.map(t => t.name) : [],
      count:state.count,timerEnabled:true,timerSecs:state.timerSecs,
      ref:crypto.randomUUID(),   // this match, for the Free plan's daily count
    }
    try { sessionStorage.setItem('battle_config',JSON.stringify(config)) }
    catch { setError('Your browser could not prepare this battle. Enable storage and try again.'); return }
    saveBattlePreferences({...readBattlePreferences(),count:state.count,timerSecs:state.timerSecs})
    router.push('/student/battle/session')
  }
  function next() {
    if (state.step === 'setup') { start(); return }
    dispatch({patch:{step:{subject:'type',type:state.questionSet === 'topic' ? 'topics' : 'setup',topics:'setup'}[state.step]}})
  }
  const filteredTopics = topics.rows.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) && (!selectedOnly || state.topicIds.includes(t.id)))
  // Picking an exam advances on its own, so that step has no dock.
  const dock = state.step !== 'exam' && <GameButton arrow disabled={!canContinue || creating || (state.step === 'setup' && !ready)} onClick={next}>{state.step === 'setup' && !creating && <GameGlyph name="battle" size={30}/>}{state.step === 'setup' ? creating ? 'Creating…' : 'START BATTLE' : 'Continue'}</GameButton>
  return <BattleWorld guide={GUIDE[state.step]} header={<BattleSign title={TITLE[state.step]}>{subtitle}</BattleSign>} onBack={creating ? undefined : back} dock={dock} scrollKey={state.step}>
    {state.step === 'exam' && <div className={`${styles.grid} ${styles.two} ${styles.examGrid}`}>
      {['WAEC','JAMB'].map(exam => <BattleChoice key={exam} large direct icon={exam.toLowerCase()} title={exam} description={EXAM_NAME[exam]} selected={state.exam === exam} onClick={() => dispatch({type:'exam',exam,advance:true})}/>)}
    </div>}
    {state.step === 'subject' && <>
      {subjects.loading && <div className={styles.empty} role="status">Loading subjects…</div>}
      {subjects.error && <div className={styles.empty} role="alert">{subjects.error}<GameButton secondary onClick={() => setRetry(r => r + 1)}>Try again</GameButton></div>}
      {!subjects.loading && !subjects.error && !subjects.rows.length && <div className={styles.empty}>No subjects are available for this exam yet. Try another exam.</div>}
      <div className={styles.grid}>{subjects.rows.map(s => <BattleChoice key={s.id} icon={subjectArt(s.name)} title={s.name} selected={subject?.id === s.id} onClick={() => {dispatch({type:'subject',id:s.id});setSearch('');setSelectedOnly(false)}}/>)}</div>
    </>}
    {state.step === 'type' && <div className={`${styles.grid} ${styles.two}`}>
      <BattleChoice large icon="random" title="Random Questions" description="Get a mix of questions across the subject." selected={state.questionSet === 'random'} onClick={() => dispatch({patch:{questionSet:'random'}})}/>
      <BattleChoice large icon="topics" title={friend ? 'Choose Topic' : 'Choose Topics'} description="Select specific topics to focus on." selected={state.questionSet === 'topic'} onClick={() => dispatch({patch:{questionSet:'topic'}})}/>
    </div>}
    {state.step === 'topics' && <>
      <div className={styles.searchRow}><input className={styles.search} type="search" aria-label="Search topics" placeholder="⌕  Search topics…" value={search} onChange={e => setSearch(e.target.value)}/><button type="button" className={styles.selectedCount} aria-pressed={selectedOnly} onClick={() => setSelectedOnly(v => !v)}>{selectedTopics.length} {selectedOnly ? 'shown' : 'selected'}</button></div>
      {topics.loading && <div className={styles.empty} role="status">Loading topics…</div>}
      {topics.error && <div className={styles.empty} role="alert">{topics.error}<GameButton secondary onClick={() => setRetry(r => r + 1)}>Try again</GameButton></div>}
      <div className={`${styles.grid} ${styles.topicGrid}`}>{filteredTopics.map(t => <BattleChoice key={t.id} icon={topicArt(t.name,subject?.name)} title={t.name} selected={state.topicIds.includes(t.id)} disabled={!friend && state.topicIds.length >= 12 && !state.topicIds.includes(t.id)} onClick={() => dispatch({type:'topic',id:t.id,single:friend})}/>)}</div>
      {!topics.loading && !topics.error && !filteredTopics.length && <div className={styles.empty}>{topics.rows.length ? 'No matching topics. Clear your search or show all topics.' : 'No topics available. Go back and choose random questions.'}</div>}
    </>}
    {state.step === 'setup' && <>
      <div className={`${styles.panel} ${styles.summary}`}>
        <div><IllustratedIcon name={state.exam.toLowerCase()} size={null} className={styles.summaryIcon}/><span className={styles.summaryText}>{state.exam}<small>{EXAM_NAME[state.exam]}</small></span></div><b aria-hidden="true">›</b>
        <div><IllustratedIcon name={subjectArt(subject?.name)} size={null} className={styles.summaryIcon}/><span className={styles.summaryText}>{subject?.name}</span></div><b aria-hidden="true">›</b>
        <div><IllustratedIcon name={state.questionSet === 'topic' ? 'topics' : 'random'} size={null} className={styles.summaryIcon}/><span className={styles.summaryText}>{state.questionSet === 'topic' ? 'Chosen Topics' : 'Random Questions'}<small>{state.questionSet === 'topic' ? selectedTopics.map(t => t.name).join(', ') : 'Across the subject'}</small></span></div>
      </div>
      <div className={`${styles.grid} ${styles.two}`}>
        <section className={styles.panel} aria-label="Number of questions"><h2><IllustratedIcon name="help" size={null} className={styles.panelIcon}/> Number of Questions</h2><div className={styles.choices}>{(friend ? [5,10,15,20] : BATTLE_COUNTS).map(v => <button type="button" key={v} aria-pressed={state.count === v} onClick={() => dispatch({patch:{count:v}})}>{v}</button>)}</div></section>
        <section className={styles.panel} aria-label="Time per question"><h2><IllustratedIcon name="clock" size={null} className={styles.panelIcon}/> Time per Question</h2><div className={styles.choices}>{(friend ? PVP_TIMER_OPTIONS.map(t => t.v) : BATTLE_TIMERS).map(v => <button type="button" key={v} aria-pressed={state.timerSecs === v} onClick={() => dispatch({patch:{timerSecs:v}})}>{v}s</button>)}</div></section>
      </div>
    </>}
    {error && <div className={styles.empty} role="alert">{error}</div>}
    <PvpNotice error={notice} onClose={() => setNotice(null)}/>
  </BattleWorld>
}

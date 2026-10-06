'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePoints } from '@/contexts/PointsContext'
import { usePlan } from '@/contexts/PlanContext'
import { createComputerOpponent, readLocalBattleStats, recordLocalBattleResult } from '@/lib/battleAI'
import { computeSessionXP } from '@/lib/xp'
import { saveSessionLocally, flushSyncQueue } from '@/lib/localSessionSync'
import { normaliseOptions, checkCorrect } from '@/lib/answers'
import { battleQuestionParams } from '@/lib/battleQuestionRequest'
import { isConnectionProblem } from '@/lib/network'
import { optionText } from '@/components/battle/arena/theme'
import { correctIndexFor } from '@/lib/battleRound'
import { useBattleExperience, BATTLE_HUB } from '@/components/battle/BattleExperience'
import { BattleWorld, BattleSign, GameButton, styles } from '@/components/battle/BattleWorld'
import BattleArena from '@/components/battle/arena/BattleArena'
import BattleOutcome from '@/components/battle/arena/BattleOutcome'
import Countdown from '@/components/battle/arena/Countdown'
import BattleReview from '@/components/battle/arena/BattleReview'

const optionList = q => q ? normaliseOptions(q.options).map(optionText) : []
const CPU = {emoji:'🤖',label:'Computer',color:'#c3212b'}
function reviewItems(questions,log,choices) {
  return questions.map((q,index) => {
    const options = optionList(q)
    return {text:q.text ?? q.question_text,passage:q.passage_text,options,correctIdx:correctIndexFor(options,q),mineIdx:log[index]?.selectedIdx ?? null,theirsIdx:options.indexOf(choices[index]),points:log[index]?.isCorrect ? 10 : 0,explanation:q.explanation,question:q}
  })
}
export default function BattleSessionPage() {
  const router = useRouter()
  const experience = useBattleExperience()
  const {totalPoints:currentXP,setTotalPoints} = usePoints()
  const plan = usePlan()
  const planRef = useRef(plan)
  useEffect(() => { planRef.current = plan }, [plan])
  const [phase,setPhase] = useState('loading')
  const [config,setConfig] = useState(null)
  const [questions,setQuestions] = useState([])
  const [choices,setChoices] = useState([])
  const [log,setLog] = useState([])
  const [error,setError] = useState('')
  const [index,setIndex] = useState(0)
  const [selected,setSelected] = useState(null)
  const [revealed,setRevealed] = useState(false)
  const [endsAt,setEndsAt] = useState(null)
  const [countdownEndsAt,setCountdownEndsAt] = useState(0)
  const [meScore,setMeScore] = useState(0)
  const [cpuScore,setCpuScore] = useState(0)
  const [paused,setPaused] = useState(false)
  const [reviewIndex,setReviewIndex] = useState(null)
  const [saved,setSaved] = useState(null)
  const [retry,setRetry] = useState(0)
  const roundResolved = useRef(false)
  const finished = useRef(false)
  const pauseStarted = useRef(null)
  const sessionId = useRef(null)
  const exitPausedRound = useRef(false)

  useEffect(() => {
    const prompt = event => {
      if (event.detail) {
        exitPausedRound.current = pauseStarted.current == null
        if (pauseStarted.current == null) pauseStarted.current = Date.now()
        setPaused(true)
      } else if (exitPausedRound.current && pauseStarted.current != null) {
        const elapsed = Date.now() - pauseStarted.current
        if (!roundResolved.current) setEndsAt(value => value == null ? null : value + elapsed)
        pauseStarted.current = null
        setPaused(false)
        exitPausedRound.current = false
      }
    }
    window.addEventListener('battle-exit-prompt', prompt)
    return () => window.removeEventListener('battle-exit-prompt', prompt)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    Promise.resolve().then(async () => {
      try {
        const cfg = JSON.parse(sessionStorage.getItem('battle_config') || '{}')
        if (!cfg.subject_id && !cfg.subject_name) throw new Error('Choose an exam and subject to start your battle.')
        setPhase('loading');setError('');setConfig(cfg)
        sessionId.current = crypto.randomUUID()
        const response = await fetch(`/api/student/questions?${battleQuestionParams(cfg)}`,{signal:controller.signal})
        const data = await response.json()
        if (response.status === 403) planRef.current.denied(data)   // Free plan limit
        if (!response.ok) throw new Error(data.error || 'Your battle could not load. Try again.')
        if (!active) return
        if (!data.questions?.length) throw new Error('No questions are available for this selection. Try another subject or topic.')
        const opponent = createComputerOpponent(readLocalBattleStats().ai_difficulty || 'easy')
        planRef.current.recordUse('battle',cfg.ref)
        setQuestions(data.questions)
        setChoices(data.questions.map(q => opponent.decide(q)))
        setLog(data.questions.map(q => ({question_id:q.id,topic_id:q.topic_id,subject_id:q.subject_id,topic_name:q.topic_name || '',subject_name:q.subject_name || '',isCorrect:false,is_correct:false,selectedIdx:null})))
        setCountdownEndsAt(Date.now() + 2700)
        setPhase('countdown')
      } catch(err) {
        if (!active || err.name === 'AbortError') return
        setError(err.message || 'Your battle could not load. Try again.');setPhase('error')
      }
    })
    return () => {active = false;controller.abort()}
  }, [retry])

  const resolveRound = useCallback(timedOut => {
    if (roundResolved.current || paused || !questions[index]) return
    roundResolved.current = true
    const q = questions[index], options = optionList(q)
    const selectedIdx = timedOut ? null : selected
    const correct = selectedIdx !== null && checkCorrect(options,selectedIdx,q.correct_answer)
    const cpuPick = options.indexOf(choices[index])
    const cpuCorrect = cpuPick >= 0 ? checkCorrect(options,cpuPick,q.correct_answer) : choices[index] === q.correct_answer
    if (correct) setMeScore(score => score + 10)
    if (cpuCorrect) setCpuScore(score => score + 10)
    setLog(previous => previous.map((entry,i) => i === index ? {...entry,isCorrect:correct,is_correct:correct,selectedIdx} : entry))
    if (timedOut) setSelected(null)
    experience?.play(timedOut ? 'timeout' : correct ? 'correct' : 'wrong')
    setRevealed(true)
  }, [paused,questions,index,selected,choices,experience])
  const onTimeUp = useCallback(() => resolveRound(true),[resolveRound])
  function begin() {experience?.setScene('match');setPhase('battle');setEndsAt(Date.now() + (config?.timerSecs || 30)*1000)}
  function pause() {
    if (pauseStarted.current == null) pauseStarted.current = Date.now()
    setPaused(true)
  }
  function resume() {
    const elapsed = pauseStarted.current == null ? 0 : Date.now() - pauseStarted.current
    if (pauseStarted.current != null && !revealed) setEndsAt(value => value == null ? null : value + elapsed)
    pauseStarted.current = null
    setPaused(false)
  }
  function finish() {
    if (finished.current) return
    finished.current = true
    const correct = log.filter(a => a.is_correct).length
    const finalS = correct * 10
    const outcome = finalS > cpuScore ? 'win' : finalS < cpuScore ? 'loss' : 'draw'
    experience?.setScene('lobby');experience?.play(outcome)
    const xp = computeSessionXP('battle',log,{outcome})
    // A battle is practice in another mode: it is saved as a practice session
    // (mode 'battle'), so its questions count towards the student's activity,
    // streak and mastery and it shows as "Battle" in Recent Sessions. It's
    // sent at once; the server checks the answers and awards XP and battle XP.
    const topicName = config.topic_names?.length ? config.topic_names.join(', ') : undefined
    saveSessionLocally({session_id:sessionId.current,ref:config.ref,exam:config.exam,mode:'battle',session_type:'battle',opponent:'computer',opponent_score:cpuScore,battle_outcome:outcome,subject_name:config.subject_name,topic_name:topicName,results:log,questions_count:questions.length,correct_count:correct},xp)
    setTotalPoints((currentXP || 0) + xp)
    recordLocalBattleResult({outcome,xp})
    experience?.addBattleXp(xp)
    const stats = fetch('/api/student/battle/stats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({outcome,xp_awarded:xp,session_id:sessionId.current})}).catch(() => {})
    Promise.allSettled([stats,flushSyncQueue()]).then(() => experience?.refreshPlayer())
    setSaved({finalS,finalC:cpuScore,xp});setPhase('results')
  }
  function next() {
    if (reviewIndex != null) {setReviewIndex(null);resume();return}
    if (!revealed) {if (selected != null) resolveRound(false);return}
    if (index === questions.length - 1) {finish();return}
    roundResolved.current = false
    setIndex(i => i + 1);setSelected(null);setRevealed(false);setEndsAt(Date.now() + (config?.timerSecs || 30)*1000)
  }
  function rematch() {
    if (!plan.gate('battle')) return
    try {sessionStorage.setItem('battle_config',JSON.stringify({...config,ref:crypto.randomUUID(),_exclude:questions.map(q=>q.id).join(',')}))}
    catch {setError('Your browser could not prepare the rematch.');setPhase('error');return}
    finished.current = false;roundResolved.current = false;pauseStarted.current = null
    setPhase('loading')
    setIndex(0);setSelected(null);setRevealed(false);setMeScore(0);setCpuScore(0);setPaused(false);setReviewIndex(null);setSaved(null);setRetry(v=>v+1)
  }
  if (phase === 'loading' || phase === 'error') return <BattleWorld centered>
    <BattleSign title={phase === 'loading' ? 'Get ready|for battle' : isConnectionProblem(error) ? 'You’re|offline' : 'Battle|unavailable'}>{phase === 'loading' ? 'Preparing your questions and your opponent…' : error}</BattleSign>
    {phase === 'loading' ? <p className={styles.intro} role="status">Entering the arena…</p> : <div className={styles.stack}><GameButton onClick={()=>setRetry(v=>v+1)}>Try again</GameButton><GameButton secondary onClick={()=>router.push('/student/battle/setup')}>Change setup</GameButton></div>}
  </BattleWorld>
  if (phase === 'countdown') return <Countdown endsAt={countdownEndsAt} onDone={begin}/>
  if (phase === 'results') return <BattleOutcome questions={questions} answersLog={log} studentScore={saved.finalS} cpuScore={saved.finalC} xpAwarded={saved.xp} onRematch={rematch} onNewBattle={()=>router.push('/student/battle/setup')} onHome={()=>router.push(BATTLE_HUB)} onReview={()=>setPhase('review')}/>
  if (phase === 'review') return <BattleReview items={reviewItems(questions,log,choices)} subject={config.subject_name} opponent={CPU} onDone={()=>setPhase('results')}/>
  const displayIndex = reviewIndex ?? index
  const q = questions[displayIndex], options = optionList(q)
  const mine = reviewIndex != null ? log[displayIndex]?.selectedIdx : selected
  return <BattleArena question={q} options={options} selectedIdx={mine} reveal={revealed || reviewIndex != null ? {correctIdx:correctIndexFor(options,q),theirsIdx:options.indexOf(choices[displayIndex])} : null} meScore={meScore} cpuScore={cpuScore} index={displayIndex} total={questions.length} exam={config.exam} subject={config.subject_name} endsAt={config.timerEnabled === false || reviewIndex != null ? null : endsAt} onTimeUp={onTimeUp} onSelect={i=>{if (!roundResolved.current) setSelected(i)}} onNext={next} onPause={pause} paused={paused && reviewIndex == null} onResume={reviewIndex != null ? () => {} : resume} onQuit={()=>router.push(BATTLE_HUB)} reviewing={reviewIndex != null} reviewPrevious={displayIndex > 0 ? ()=>{pause();setReviewIndex(displayIndex-1)} : undefined}/>
}

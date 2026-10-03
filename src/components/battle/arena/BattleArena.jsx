'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import GameShell, { GameGlyph } from '@/components/student/GameShell'
import { GameButton } from '../BattleWorld'
import BattleDialog from '../BattleDialog'
import BattleSettings from '../BattleSettings'
import QuestionCard from './QuestionCard'
import AnswerTiles from './AnswerTiles'
import { correctIndexFor } from '@/lib/battleRound'
import { readBattlePreferences, saveBattlePreferences } from '@/lib/battlePreferences'
import useBattleSound from './useBattleSound'
import s from './BattleArena.module.css'
import IllustratedIcon from '../IllustratedIcon'

function RoundClock({ endsAt, onTimeUp, onWarning }) {
  const [remaining, setRemaining] = useState(() => Math.max(0,Math.ceil((endsAt - Date.now()) / 1000)))
  const callbacks = useRef({onTimeUp,onWarning})
  useEffect(() => { callbacks.current = {onTimeUp,onWarning} }, [onTimeUp,onWarning])
  useEffect(() => {
    let fired = false, warned = false
    const tick = () => {
      const seconds = Math.max(0,Math.ceil((endsAt - Date.now()) / 1000))
      setRemaining(seconds)
      if (seconds > 0 && seconds <= 5 && !warned) { warned = true; callbacks.current.onWarning() }
      if (!seconds && !fired) { fired = true; callbacks.current.onTimeUp() }
    }
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [endsAt])
  return <span className={`${s.clock} ${remaining <= 5 ? s.urgent : ''}`} role="timer" aria-label={`${remaining} seconds remaining`}><IllustratedIcon name="clock" size={null} className={s.clockIcon}/>{String(Math.floor(remaining / 60)).padStart(2,'0')}:{String(remaining % 60).padStart(2,'0')}</span>
}
export function DuelScore({ me, computer }) {
  const playerRounds = Math.round(me / 10), computerRounds = Math.round(computer / 10)
  return <div className={s.duel} aria-label={`You ${playerRounds} correct, Computer ${computerRounds} correct`}>
    <div className={s.blueScore}><div className={s.portrait}><Image src="/images/battle/design/guide-fighter.png" alt="" width={120} height={120}/></div><span>You</span><strong>{playerRounds}</strong></div>
    <span className={s.vs}>VS</span>
    <div className={s.redScore}><span>Computer</span><strong>{computerRounds}</strong><div className={s.portrait}><Image src="/images/battle/design/robot.png" alt="" width={120} height={120}/></div></div>
  </div>
}
function Fighter({ robot, score }) {
  return <aside className={`${s.fighter} ${robot ? s.robot : s.player}`} aria-hidden="true">
    <Image src={`/images/battle/design/${robot ? 'robot' : 'guide-fighter'}.png`} alt="" width={400} height={470} className={s.fighterArt} priority/>
    <div className={s.podium}><div className={robot ? s.redName : s.blueName}>{robot ? 'Computer' : 'You'}</div><strong className={robot ? s.redPoints : s.bluePoints}>{Math.round(score / 10)}</strong></div>
  </aside>
}

export default function BattleArena({ question, options, selectedIdx, reveal, meScore, cpuScore, index, total, exam, subject, endsAt, onTimeUp, onSelect, onNext, onPause, paused, onResume, onQuit, reviewPrevious, reviewing = false }) {
  const [settings, setSettings] = useState(readBattlePreferences)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState('Wrong answer')
  const [reportStatus, setReportStatus] = useState('')
  const play = useBattleSound(settings.sound)
  const warn = useCallback(() => play('warning'), [play])
  const correct = reveal && selectedIdx === reveal.correctIdx
  const actionLabel = reviewing ? 'Return to battle' : !reveal ? 'Submit Answer' : index === total - 1 ? 'Finish Battle' : 'Next Question'
  function closeSettings() { setSettingsOpen(false); setSettings(readBattlePreferences()); onResume() }
  async function report() {
    if (reportStatus === 'Sending…') return
    setReportStatus('Sending…')
    try {
      const response = await fetch('/api/student/questions/flag',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question_id:question.id,reason})})
      if (!response.ok) throw new Error('Report could not be sent. Try again.')
      setReportStatus('Thank you. Your report has been sent.')
    } catch(error) { setReportStatus(error.message || 'Report could not be sent. Try again.') }
  }
  return <GameShell immersive>
    <section className={`${s.arena} ${settings.reducedMotion ? s.reduceMotion : ''}`} aria-label="Battle arena">
      <header className={s.topbar}>
        <div><button className={s.utility} aria-label="Pause battle" onClick={onPause}><GameGlyph name="menu"/></button></div>
        <DuelScore me={meScore} computer={cpuScore}/>
        <div className={s.tools}>
          <button className={s.utility} aria-label={settings.sound ? 'Mute sound' : 'Enable sound'} aria-pressed={settings.sound} onClick={() => {const value={...settings,sound:!settings.sound};setSettings(value);saveBattlePreferences(value)}}><GameGlyph name="sound"/>{!settings.sound && <span className={s.muteSlash}>╱</span>}</button>
          <button className={s.utility} aria-label="Battle settings" onClick={() => {onPause();setSettingsOpen(true)}}><GameGlyph name="settings"/></button>
          <button className={`${s.utility} ${s.flag}`} aria-label="Report this question" onClick={() => {onPause();setReportOpen(true);setReportStatus('')}}><GameGlyph name="flag"/></button>
        </div>
      </header>
      <Fighter score={meScore}/><Fighter robot score={cpuScore}/>
      <div className={s.canvas}>
        <div className={s.progress}><strong>{reviewing ? 'Review' : 'Question'} {index + 1} of {total}</strong><div className={s.progressTrack} role="progressbar" aria-label="Battle progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + 1}><span style={{width:`${(index + 1)/total*100}%`}}/></div>{!reveal && !paused && endsAt ? <RoundClock key={endsAt} endsAt={endsAt} onTimeUp={onTimeUp} onWarning={warn}/> : <span className={s.clock}>{reviewing ? 'Review' : reveal ? 'Locked' : 'Paused'}</span>}</div>
        <div className={s.questionBoard}>
          <QuestionCard embedded subject={`${subject} (${exam})`} text={question.text ?? question.question_text} passage={question.passage_text} passageImage={question.passage_image_url} figure={question}/>
          <AnswerTiles options={options} selectedIdx={selectedIdx} reveal={reveal} opponent={{emoji:'🤖',label:'Computer',color:'#c21f2c'}} onSelect={i => {play('select');onSelect(i)}}/>
        </div>
        {reveal && !reviewing && <p className={`${s.feedback} ${correct ? s.correct : s.incorrect}`} role="status">{correct ? '✓ Correct! +1 score' : selectedIdx == null ? 'Time is up. Keep going!' : `✗ The correct answer is ${String.fromCharCode(65 + correctIndexFor(options,question))}.`}<span>Review the explanation after your battle.</span></p>}
      </div>
      <footer className={s.actions}>
        <GameButton secondary disabled={!reviewPrevious} onClick={reviewPrevious}>← Previous</GameButton>
        <GameButton className={s.submit} disabled={!reviewing && !reveal && selectedIdx == null} onClick={onNext}><GameGlyph name="send" size={30}/>{actionLabel}</GameButton>
      </footer>
      {paused && !settingsOpen && !reportOpen && <BattleDialog id="pause-title" title="Battle paused" onClose={onResume}><p>Your question timer is paused.</p><GameButton onClick={onResume}>Resume Battle</GameButton><GameButton secondary onClick={onQuit}>Leave match</GameButton></BattleDialog>}
      {settingsOpen && <BattleSettings onClose={closeSettings}/>}
      {reportOpen && <BattleDialog id="report-title" title="Report question" onClose={()=>{setReportOpen(false);onResume()}}><label>What went wrong?<select value={reason} onChange={e=>setReason(e.target.value)}><option>Wrong answer</option><option>Unclear question</option><option>Missing diagram</option><option>Other</option></select></label>{reportStatus && <p role="status">{reportStatus}</p>}<GameButton disabled={reportStatus === 'Sending…' || reportStatus.includes('Thank you')} onClick={report}>Send report</GameButton><GameButton secondary onClick={() => {setReportOpen(false);onResume()}}>Close</GameButton></BattleDialog>}
    </section>
  </GameShell>
}



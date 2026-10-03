'use client'
import { BattleWorld, BattleSign, GameButton, styles as world } from '../BattleWorld'
import { DuelScore } from './BattleArena'
import s from './BattleOutcome.module.css'

export default function BattleOutcome({ questions, answersLog, studentScore, cpuScore, xpAwarded, onRematch, onNewBattle, onHome, onReview }) {
  const outcome = studentScore > cpuScore ? 'win' : studentScore < cpuScore ? 'loss' : 'draw'
  const correct = answersLog.filter(a => a.isCorrect).length
  const missedTopics = [...new Set(questions.filter((q,index) => !answersLog[index]?.isCorrect).map(q => q.topic_name).filter(Boolean))]
  return <BattleWorld centered wide label="Battle results">
    <div className={s.result}>
      <div className={s.hero}>
        <BattleSign crest title={outcome === 'win' ? 'Victory!|You won!' : outcome === 'draw' ? 'Well played!|It’s a draw!' : 'Keep going!|Computer won'}>{outcome === 'win' ? 'Brilliant battle! Your knowledge won the day.' : outcome === 'draw' ? 'A close battle. Come back even stronger.' : 'Every battle makes you stronger. Try again!'}</BattleSign>
        <div className={s.duel}><DuelScore me={studentScore} computer={cpuScore}/></div>
      </div>
      <div className={s.details}>
        <section className={`${world.panel} ${s.rewards}`} aria-label="Your rewards">
          <div className={s.xpLine}><strong className={s.xp}>+{xpAwarded} XP</strong><span>earned this battle</span></div>
          <div className={s.stats}><div><strong>{correct}</strong><span>Correct</span></div><div><strong>{questions.length - correct}</strong><span>Missed</span></div><div><strong>{questions.length ? Math.round(correct/questions.length*100) : 0}%</strong><span>Accuracy</span></div></div>
        </section>
        {missedTopics.length > 0 && <p className={world.intro}>Next challenge: {missedTopics.slice(0,3).join(' · ')}</p>}
        <div className={s.actions}><GameButton arrow onClick={onRematch}>Battle again</GameButton><GameButton secondary onClick={onReview}>Review answers</GameButton><GameButton secondary onClick={onNewBattle}>New battle</GameButton><GameButton secondary onClick={onHome}>Battle home</GameButton></div>
      </div>
    </div>
  </BattleWorld>
}

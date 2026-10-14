'use client'
import { useEffect, useRef, useState } from 'react'
import QuestionFigure from '@/components/ui/QuestionFigure'
import { subjectColor, validRatings, ratingCounts } from '@/lib/flashcards'
import s from '@/app/student/learn/flashcards/flashcards.module.css'
function Meter({ value, label }) {
  return <div className={s.meter} role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${value}%` }} /></div>
}
export default function StudySession({ cards, topic, subject, saved, onSave, onBack, onRefresh }) {
  const [ratings, setRatings] = useState(() => validRatings(cards, saved?.completed ? {} : saved?.ratings))
  const [queue, setQueue] = useState(cards.map(card => card.id))
  const [index, setIndex] = useState(Math.min(Math.max(0, saved?.completed ? 0 : Number(saved?.cardIndex) || 0), cards.length - 1))
  const [revealed, setRevealed] = useState(false)
  const [complete, setComplete] = useState(false)
  const [turning, setTurning] = useState(false)
  const turnTimer = useRef(null)
  const answer = useRef(null)
  const card = cards.find(item => item.id === queue[index])
  const counts = ratingCounts(ratings)
  const percent = Math.round(counts.known / cards.length * 100)
  function rate(value) {
    const next = { ...ratings, [card.id]: value }
    setRatings(next)
    const last = index === queue.length - 1
    onSave({ ratings: next, done: ratingCounts(next).known, total: cards.length, completed: last, cardIndex: last ? 0 : cards.findIndex(item => item.id === queue[index + 1]) })
    if (last) setComplete(true)
    else { setIndex(index + 1); setRevealed(false) }
  }
  function restart(missedOnly) {
    const next = cards.filter(item => !missedOnly || ratings[item.id] !== 'known').map(item => item.id)
    if (!next.length) return
    if (!missedOnly) setRatings({})
    setQueue(next); setIndex(0); setRevealed(false); setComplete(false)
  }
  useEffect(() => { const timer = turnTimer; return () => clearTimeout(timer.current) }, [])
  function reveal() {
    if (turning || revealed) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setRevealed(true); requestAnimationFrame(() => answer.current?.focus()); return }
    setTurning(true)
    turnTimer.current = setTimeout(() => {
      setRevealed(true)
      requestAnimationFrame(() => answer.current?.focus())
      turnTimer.current = setTimeout(() => setTurning(false), 250)
    }, 250)
  }
  return <div className={s.session} style={{ '--accent': subjectColor(subject.name) }}>
    <header className={s.sessionHeader}><button className={s.textLink} onClick={onBack}>← Exit session</button><span>{subject.name} <span className={s.muted}>/ {topic.name}</span></span></header>
    {complete ? <section className={s.results}>
      <div className={s.resultTrophy} aria-hidden="true">🏆</div><span className={s.eyebrow}>A LITTLE PRACTICE. A STRONGER MEMORY.</span><h1>Session complete!</h1><p>Nice work. Review the cards you’re still learning to make them stick.</p>
      <div className={s.resultStats}>{[['known', 'Got it', '✓'], ['again', 'Review again', '↻']].map(([key, label, icon]) => <div key={key}><span className={s.resultIcon} data-outcome={key}>{icon}</span><strong>{key === 'again' ? counts.again + counts.almost : counts.known}</strong><small>{label}</small></div>)}</div>
      <div className={s.resultProgress}><div><span>Cards marked “Got it”</span><strong>{percent}%</strong></div><Meter value={percent} label="Cards marked Got it" /><small>{Object.keys(ratings).length} of {cards.length} cards rated · Progress saved on this device</small></div>
      <div className={s.resultActions}>{counts.almost + counts.again > 0 && <button className={s.secondary} onClick={() => restart(true)}>↻ Review missed cards</button>}<button className={s.primary} onClick={onBack}>Finish session →</button><button className={s.textLink} onClick={() => restart(false)}>Study the whole deck again</button>{onRefresh && <button className={s.textLink} onClick={onRefresh}>Refresh saved cards from the server</button>}</div>
    </section> : <>
      <div className={s.sessionProgress}><Meter value={Math.round(index / queue.length * 100)} label="Session progress" /><strong>{index + 1} / {queue.length}</strong><span>{counts.known} got it</span></div>
      <div className={s.studyStage}><div key={card.id} className={`${s.cardStack} ${turning ? s.flipAnswer : ''}`} onAnimationEnd={() => setTurning(false)}>
        <section className={s.studyCard} aria-label={revealed ? 'Flashcard answer' : 'Flashcard question'}>
          <span className={s.difficulty}>{card.difficulty || 'medium'}</span>
          {!revealed ? <>{card.svg_code && <div className={s.figure}><QuestionFigure question={{ svg_diagram: card.svg_code }} /></div>}<h2>{card.front_text}</h2><button className={s.reveal} disabled={turning} onClick={reveal}>↻ Tap to reveal answer</button></> : <><div ref={answer} tabIndex={-1} className={s.answer}>{card.back_text}</div><span className={s.answerLabel}>ANSWER</span></>}
        </section>
      </div></div>
      <p className={s.ratePrompt}>{revealed ? 'How well did you remember it?' : 'Think of your answer before revealing the card.'}</p>
      <div className={s.ratingActions}><button className={s.previousCard} disabled={index === 0 || turning} onClick={() => { setIndex(index - 1); setRevealed(false) }}><span>←</span>Previous card</button>{[['again', 'Review again', '↻'], ['known', 'Got it', '✓']].map(([value, label, icon]) => <button key={value} disabled={!revealed || turning} data-outcome={value} onClick={() => rate(value)}><span>{icon}</span>{label}</button>)}</div>
    </>}
  </div>
}

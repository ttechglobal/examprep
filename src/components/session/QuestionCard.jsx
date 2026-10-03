'use client'
// src/components/session/QuestionCard.jsx — v2
// ─────────────────────────────────────────────────────────────────────────────
// One question: topic, year, report flag, hint, the question and its options.
// Used by the practice session, the mock exam, the review and the demo.
// Navigation and the explanation are the page's job (SessionFrame and
// ExplanationBlock), so this card is only the question.
//
// Props
//   question        { id, text, options, correct_answer, explanation, hint, year, topic_name, subject_name }
//   qIndex          current index (resets state when it changes)
//   sessionType     'practice' (answer, reveal at the end) | 'study' (instant
//                   feedback: a wrong first try gets a second chance)
//   speedSecs       per-question countdown (Speed Round); onSpeedTimeUp at 0
//   alreadyAnswered { selectedIdx, isCorrect } when revisiting a question
//   reviewMode      show the student's answer against the correct one
//   hideHint        mock exams have no hints
//   onAnswerChange({ selectedIdx, isCorrect })  on every counted pick
//   ref.getSelection() → { selectedIdx, isCorrect }  the live pick, read by
//                   the page's Next button (never stale, unlike state)
//
// v2: new design; Prev/Next and the inline explanation moved out to the page;
//     report sheet moved to FlagSheet.jsx; hint lives here.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { MathText, injectMathStyles } from '@/lib/mathRenderer'
import { LETTERS, normaliseOptions, checkCorrect, correctIndex } from './SessionUtils'
import { QuestionCountdown } from './SessionPrimitives'
import FlagSheet from './FlagSheet'
import QuestionFigure from '@/components/ui/QuestionFigure'
import { Book, Flag, Check, Cross, Bulb } from './icons'
import s from './session.module.css'

function Hint({ text }) {
  const [open, setOpen] = useState(false)
  if (!text?.trim()) return null
  return open ? (
    <div className={s.hintBox}>
      <b>Hint</b>
      <MathText text={text} as="span" />
    </div>
  ) : (
    <button type="button" className={s.hint} onClick={() => setOpen(true)}><Bulb />Hint</button>
  )
}

export const QuestionCard = forwardRef(function QuestionCard({
  question,
  qIndex,
  sessionType = 'practice',
  speedSecs,
  onSpeedTimeUp,
  alreadyAnswered = null,
  reviewMode = false,
  hideHint = false,
  onAnswerChange,
}, ref) {
  const isStudy = sessionType === 'study'
  const options = normaliseOptions(question.options)
  const correct = correctIndex(options, question.correct_answer)

  useEffect(() => { injectMathStyles() }, [])

  // selectedRef mirrors `selected` synchronously for ref.getSelection().
  const [selected, setSelected] = useState(alreadyAnswered?.selectedIdx ?? null)
  const selectedRef = useRef(alreadyAnswered?.selectedIdx ?? null)

  // Practice mode never reveals before the session ends, even when revisiting.
  const [revealed,   setRevealed]   = useState(reviewMode || (isStudy && alreadyAnswered != null))
  const [studyTries, setStudyTries] = useState(0)
  const [showFlag,   setShowFlag]   = useState(false)

  useEffect(() => {
    const initial = alreadyAnswered?.selectedIdx ?? null
    selectedRef.current = initial
    setSelected(initial)
    setRevealed(reviewMode || (isStudy && alreadyAnswered != null))
    setStudyTries(0)
  }, [qIndex, question.id, reviewMode]) // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    getSelection: () => {
      const idx = selectedRef.current
      return { selectedIdx: idx, isCorrect: idx !== null && checkCorrect(options, idx, question.correct_answer) }
    },
  }), [options, question.correct_answer])

  function pick(idx) {
    if (reviewMode || revealed) return
    const isCorrect = checkCorrect(options, idx, question.correct_answer)
    selectedRef.current = idx
    setSelected(idx)

    if (!isStudy) {                       // practice / mock: change freely until submit
      onAnswerChange?.({ selectedIdx: idx, isCorrect })
      return
    }
    // Study: right first time, or the second try, reveals and counts.
    const tries = studyTries + 1
    setStudyTries(tries)
    if (isCorrect || tries >= 2) {
      setRevealed(true)
      onAnswerChange?.({ selectedIdx: idx, isCorrect })
    }
  }

  function stateOf(idx) {
    if (revealed) {
      if (idx === correct) return 'correct'
      if (idx === selected) return 'wrong'
      return undefined
    }
    if (idx !== selected) return undefined
    return isStudy && studyTries > 0 ? 'wrong' : 'chosen'   // study: first wrong try
  }

  // Bring the feedback into view on phones, where it can sit below the fold.
  const feedbackRef = useRef(null)
  useEffect(() => {
    if (!reviewMode && (studyTries > 0 || revealed)) feedbackRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [studyTries, revealed, reviewMode])

  const hint       = question.hint || question.explanation?.hint
  const firstMiss  = isStudy && !revealed && studyTries > 0
  const isRight    = selected !== null && selected === correct
  const subject    = question.subject_name

  return (
    <div>
      {showFlag && <FlagSheet questionId={question.id} onClose={() => setShowFlag(false)} />}

      <div className={s.qMeta}>
        <span className={s.topicTile} aria-hidden="true"><Book /></span>
        <span className={s.topic}>
          <strong>{question.topic_name || subject || 'Question'}</strong>
          {question.topic_name && subject && <span>{subject}</span>}
        </span>
        {speedSecs && !revealed && !reviewMode && (
          <span className={s.countdownSlot}><QuestionCountdown key={qIndex} secs={speedSecs} onTimeUp={onSpeedTimeUp} /></span>
        )}
        {question.year && <span className={s.year}>{question.year}</span>}
        <button type="button" className={s.flag} onClick={() => setShowFlag(true)} aria-label="Report a problem with this question">
          <Flag />
        </button>
      </div>

      {!hideHint && !reviewMode && !revealed && <Hint text={hint} />}

      <h2 className={s.qText}><MathText text={question.text ?? question.question_text ?? ''} as="span" /></h2>

      <QuestionFigure question={question} className={s.qFigure} />

      <div className={s.options} role={reviewMode ? undefined : 'radiogroup'} aria-label="Options">
        {options.map((opt, idx) => {
          const state = stateOf(idx)
          return (
            <button
              key={idx} type="button" className={s.option} data-state={state}
              role={reviewMode ? undefined : 'radio'} aria-checked={reviewMode ? undefined : selected === idx}
              disabled={reviewMode || revealed}
              onClick={() => pick(idx)}
            >
              <span className={s.letter}>{LETTERS[idx]}</span>
              <span className={s.optText}><MathText text={String(opt ?? '')} as="span" /></span>
              {(state === 'correct' || (state === 'wrong' && revealed)) && (
                <span className={s.mark} aria-label={state === 'correct' ? 'Correct answer' : 'Your answer, wrong'}>
                  {state === 'correct' ? <Check /> : <Cross />}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {firstMiss && (
        <div className={s.nudge} role="status" ref={feedbackRef}>
          <Cross size={20} />
          <div><strong>Not quite, try again!</strong><span>One more try before the answer is shown.</span></div>
        </div>
      )}

      {revealed && isStudy && !reviewMode && (
        <div className={s.result} data-ok={isRight || undefined} role="status" ref={feedbackRef}>
          {isRight ? <Check size={22} /> : <Cross size={22} />}
          <div>
            <strong>{isRight ? 'Correct! Well done.' : 'Not quite'}</strong>
            {!isRight && correct >= 0 && <span>The answer is {LETTERS[correct]}.</span>}
          </div>
        </div>
      )}
    </div>
  )
})

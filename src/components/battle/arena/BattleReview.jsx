'use client'
import { useState } from 'react'
import { BattleWorld, BattleSign, GameButton, styles } from '../BattleWorld'
import { ExplanationBlock } from '@/components/session/ExplanationBlock'
import QuestionCard from './QuestionCard'
import AnswerTiles from './AnswerTiles'
import { hasDisplayableExplanation, LETTERS } from './theme'

export default function BattleReview({ items, subject, opponent, onDone }) {
  const [index,setIndex] = useState(0)
  const item = items[index]
  if (!item) return <BattleWorld centered label="Answer review"><div className={styles.empty}><p>No answers to review.</p><GameButton onClick={onDone}>Return to results</GameButton></div></BattleWorld>
  const correct = item.mineIdx === item.correctIdx
  const selectedKey = item.mineIdx != null ? LETTERS[item.mineIdx] : null
  const last = index === items.length - 1
  const dock = <><GameButton secondary disabled={index === 0} onClick={()=>setIndex(i=>i-1)}>← Previous</GameButton><GameButton arrow onClick={()=>last ? onDone() : setIndex(i=>i+1)}>{last ? 'Finish review' : 'Next'}</GameButton></>
  return <BattleWorld wide label="Answer review" header={<BattleSign compact title="Review|your answers">Every answer is a chance to learn.</BattleSign>} onBack={onDone} dock={dock} scrollKey={index}>
    <section className={styles.panel} aria-label={`Review question ${index+1} of ${items.length}`}>
      <div className={styles.reviewHead}>
        <p>Question {index+1} of {items.length} · <span className={correct ? styles.good : styles.bad}>{correct ? 'Correct' : item.mineIdx == null ? 'Unanswered' : 'Incorrect'}</span></p>
      </div>
      <QuestionCard subject={subject} text={item.text} passage={item.passage} passageImage={item.question?.passage_image_url} figure={item.question} embedded/>
      <div className={styles.reviewAnswers}><AnswerTiles options={item.options} selectedIdx={item.mineIdx} reveal={{correctIdx:item.correctIdx,theirsIdx:item.theirsIdx}} opponent={opponent}/></div>
      {hasDisplayableExplanation(item.explanation) && <div className={styles.explain}><h2>Why this answer?</h2><ExplanationBlock explanation={item.explanation} question={item.question} selectedKey={selectedKey} isCorrect={correct} alwaysLight/></div>}
    </section>
  </BattleWorld>
}

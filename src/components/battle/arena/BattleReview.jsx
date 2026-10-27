'use client'
import { useState } from 'react'
import { BattleWorld, BattleSign, GameButton, styles } from '../BattleWorld'
import { ExplanationBlock } from '@/components/session/ExplanationBlock'
import QuestionCard from './QuestionCard'
import AnswerTiles from './AnswerTiles'
import { LETTERS } from './theme'
import { battleAnswers, battleReviewIndexes } from '@/lib/battleReview'

export default function BattleReview({ items, subject, opponent, onDone, initialFilter = 'all' }) {
  const [index,setIndex] = useState(0)
  const [filter,setFilter] = useState(initialFilter)
  const visible = battleReviewIndexes(items, filter)
  const originalIndex = visible[index]
  const item = items[originalIndex]
  const filters = <div className={styles.reviewFilters} role="group" aria-label="Filter battle answers">{[['all','All answers'],['missed','Needs review'],['wrong','Incorrect'],['skipped','Unanswered']].map(([key,label]) => <GameButton key={key} secondary aria-pressed={filter === key} onClick={() => {setFilter(key);setIndex(0)}}>{label} ({battleReviewIndexes(items,key).length})</GameButton>)}</div>
  if (!item) return <BattleWorld centered label="Answer review" onBack={onDone}>{filters}<div className={styles.empty}><p>{items.length ? 'No answers in this filter.' : 'No answers to review.'}</p><GameButton onClick={onDone}>Return to results</GameButton></div></BattleWorld>
  const correct = battleAnswers([item])[0].isCorrect
  const selectedKey = item.mineIdx != null ? LETTERS[item.mineIdx] : null
  const last = index === visible.length - 1
  const dock = <><GameButton secondary disabled={index === 0} onClick={()=>setIndex(i=>i-1)}>← Previous</GameButton><GameButton arrow onClick={()=>last ? onDone() : setIndex(i=>i+1)}>{last ? 'Finish review' : 'Next'}</GameButton></>
  return <BattleWorld wide label="Answer review" header={<BattleSign compact title="Review|your answers">Every answer is a chance to learn.</BattleSign>} onBack={onDone} dock={dock} scrollKey={`${filter}:${index}`}>
    {filters}
    <section className={styles.panel} aria-label={`Review question ${originalIndex+1} of ${items.length}`}>
      <div className={styles.reviewHead}>
        <p>Question {originalIndex+1} of {items.length} · <span className={correct ? styles.good : styles.bad}>{correct ? 'Correct' : battleAnswers([item])[0].selectedIdx == null ? 'Unanswered' : 'Incorrect'}</span>{filter !== 'all' && <small> · {index+1} of {visible.length} in this review</small>}</p>
      </div>
      <QuestionCard subject={subject} text={item.text} passage={item.passage} passageImage={item.question?.passage_image_url} figure={item.question} embedded/>
      <div className={styles.reviewAnswers}><AnswerTiles options={item.options} selectedIdx={item.mineIdx} reveal={{correctIdx:item.correctIdx,theirsIdx:item.theirsIdx}} opponent={opponent}/></div>
      <div className={styles.explain}><ExplanationBlock explanation={item.explanation} question={item.question} selectedKey={selectedKey} isCorrect={correct} alwaysLight/></div>
    </section>
  </BattleWorld>
}

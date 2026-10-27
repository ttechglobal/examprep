'use client'
// src/components/session/ReviewSession.jsx — v2
// ─────────────────────────────────────────────────────────────────────────────
// Question-by-question review after a practice session or mock exam.
//   Desktop: question panel (correct / wrong / skipped) | the question with
//            the student's answer | the explanation.
//   Phones:  the question, then "See the explanation", which opens it full
//            screen with ‹ › to move through the questions.
//
// Props
//   questions, answers   answers[i] = { selectedIdx, isCorrect } | null
//   onDone               back to the summary
//   title                e.g. "Economics" (top bar)
//   subjects             JAMB mock: [{ name, count }] in question order, one
//                        tab each (a subject can have fewer questions than
//                        the paper's 40 when the bank runs short)
//
// v2: built on SessionFrame (new design); one explanation sheet on phones.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { LETTERS } from './SessionUtils'
import { REVIEW_FILTERS, answerState, sessionResults, reviewIndexes } from '@/lib/sessionReview'
import { SessionFrame, SessionTopBar, QuestionPanel, QuestionGridSheet, SessionBottomBar, SubjectTabs, sessionStyles } from './SessionFrame'
import { QuestionCard } from './QuestionCard'
import { ExplanationBlock, ExplanationSheet, ExplanationTrigger } from './ExplanationBlock'

export function ReviewSession({ questions, answers, onDone, title = 'Review', subjects, initialFilter = 'all' }) {
  const [filter, setFilter] = useState(REVIEW_FILTERS.some(item => item.key === initialFilter) ? initialFilter : 'all')
  const [index,     setIndex]     = useState(0)
  const [gridOpen,  setGridOpen]  = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const mainRef = useRef(null)

  const visible = reviewIndexes(questions, answers, filter)
  const current = visible.includes(index) ? index : visible[0]
  const position = visible.indexOf(current)
  useEffect(() => { mainRef.current?.scrollTo?.(0, 0) }, [current, filter])

  const q = current == null ? null : questions[current]
  const a = current == null ? null : answers[current] ?? null
  const isLast = position >= visible.length - 1
  const selectedKey = a?.selectedIdx != null ? LETTERS[a.selectedIdx] : null
  const stateOf = i => answerState(answers[i])
  const counts = sessionResults(questions, answers)
  const correctCount = counts.correct
  const chooseFilter = value => { setFilter(value); setIndex(reviewIndexes(questions, answers, value)[0] ?? 0) }
  const go = i => {
    if (!visible.includes(i)) setFilter('all')
    setIndex(Math.min(Math.max(i, 0), Math.max(questions.length - 1, 0)))
  }

  // Subject tabs: each subject's first question index.
  const starts = []
  subjects?.reduce((at, sub) => { starts.push(at); return at + sub.count }, 0)
  const activeSubject = starts.findLastIndex(st => (current ?? 0) >= st)
  const subjectTabs = subjects?.length > 1 ? (
    <SubjectTabs
      active={Math.max(activeSubject, 0)}
      onSelect={i => go(starts[i])}
      subjects={subjects.map((sub, i) => ({
        name: sub.name,
        note: `${answers.slice(starts[i], starts[i] + sub.count).filter(x => answerState(x) === 'correct').length}/${sub.count}`,
      }))}
    />
  ) : null

  const tabs = <>{subjectTabs}<SubjectTabs label="Review filters" active={REVIEW_FILTERS.findIndex(item => item.key === filter)} onSelect={i => chooseFilter(REVIEW_FILTERS[i].key)} subjects={REVIEW_FILTERS.map(item => ({ name: item.name, note: String(item.key === 'all' ? counts.total : item.key === 'missed' ? counts.missed : counts[item.key]) }))} /></>

  return (
    <SessionFrame
      mainRef={mainRef}
      top={
        <SessionTopBar
          backLabel="Back" onBack={onDone}
          title={title} subtitle={`${filter === 'all' ? 'Review' : REVIEW_FILTERS.find(item => item.key === filter).name + ' · ' + visible.length + ' to review'} · ${correctCount} of ${questions.length} correct`}
          current={current ?? -1} total={questions.length} answered={null}
          onOpenGrid={() => setGridOpen(true)}
        />
      }
      tabs={tabs}
      panel={<QuestionPanel total={questions.length} current={current ?? -1} stateOf={stateOf} graded onJump={go} onViewAll={() => setGridOpen(true)} />}
      aside={q ? <ExplanationBlock question={q} isCorrect={answerState(a) === 'correct'} selectedKey={selectedKey} /> : null}
      bottom={
        <SessionBottomBar
          onPrev={() => go(visible[position - 1])} prevDisabled={position <= 0}
          onNext={() => (!q || isLast ? onDone() : go(visible[position + 1]))}
          nextLabel={isLast ? 'Back to summary' : 'Next'}
        />
      }
      overlay={<>
        {gridOpen && <QuestionGridSheet total={questions.length} current={current ?? -1} stateOf={stateOf} graded onJump={go} onClose={() => setGridOpen(false)} />}
        {sheetOpen && q && (
          <ExplanationSheet
            question={q} isCorrect={answerState(a) === 'correct'} selectedKey={selectedKey}
            position={{ current: current ?? 0, total: questions.length }}
            onPrev={position > 0 ? () => go(visible[position - 1]) : null}
            onNext={!isLast ? () => go(visible[position + 1]) : null}
            onClose={() => setSheetOpen(false)}
          />
        )}
      </>}
    >
      {!q && <div className={sessionStyles.pending} role="status"><strong>No questions match this filter.</strong><p>Choose another filter to continue reviewing.</p><button type="button" className={sessionStyles.prev} onClick={() => chooseFilter('all')}>Show all answers</button></div>}
      {q && (
        <>
          <QuestionCard key={`${q.id}-${current}`} question={q} qIndex={current} sessionType="study" alreadyAnswered={a} reviewMode hideHint />
          <ExplanationTrigger question={q} isCorrect={answerState(a) === 'correct'} onOpen={() => setSheetOpen(true)} />
        </>
      )}
    </SessionFrame>
  )
}

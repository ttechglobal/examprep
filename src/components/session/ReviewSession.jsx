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
import { SessionFrame, SessionTopBar, QuestionPanel, QuestionGridSheet, SessionBottomBar, SubjectTabs } from './SessionFrame'
import { QuestionCard } from './QuestionCard'
import { ExplanationBlock, ExplanationSheet, ExplanationTrigger } from './ExplanationBlock'

export function ReviewSession({ questions, answers, onDone, title = 'Review', subjects }) {
  const [index,     setIndex]     = useState(0)
  const [gridOpen,  setGridOpen]  = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const mainRef = useRef(null)

  useEffect(() => { mainRef.current?.scrollTo?.(0, 0) }, [index])

  const q      = questions[index]
  const a      = answers[index] ?? null
  const isLast = index >= questions.length - 1
  const selectedKey = a?.selectedIdx != null ? LETTERS[a.selectedIdx] : null

  const stateOf = i => (!answers[i] || answers[i].selectedIdx == null ? 'skipped' : answers[i].isCorrect ? 'correct' : 'wrong')
  const correctCount = answers.filter(x => x?.isCorrect).length

  // Subject tabs: each subject's first question index.
  const starts = []
  subjects?.reduce((at, sub) => { starts.push(at); return at + sub.count }, 0)
  const activeSubject = starts.findLastIndex(st => index >= st)
  const tabs = subjects?.length > 1 ? (
    <SubjectTabs
      active={Math.max(activeSubject, 0)}
      onSelect={i => setIndex(starts[i])}
      subjects={subjects.map((sub, i) => ({
        name: sub.name,
        note: `${answers.slice(starts[i], starts[i] + sub.count).filter(x => x?.isCorrect).length}/${sub.count}`,
      }))}
    />
  ) : null

  const go = i => setIndex(Math.min(Math.max(i, 0), questions.length - 1))

  return (
    <SessionFrame
      mainRef={mainRef}
      top={
        <SessionTopBar
          backLabel="Back" onBack={onDone}
          title={title} subtitle={`Review · ${correctCount} of ${questions.length} correct`}
          current={index} total={questions.length} answered={null}
          onOpenGrid={() => setGridOpen(true)}
        />
      }
      tabs={tabs}
      panel={<QuestionPanel total={questions.length} current={index} stateOf={stateOf} graded onJump={go} onViewAll={() => setGridOpen(true)} />}
      aside={q?.explanation ? <ExplanationBlock question={q} isCorrect={!!a?.isCorrect} selectedKey={selectedKey} /> : null}
      bottom={
        <SessionBottomBar
          onPrev={() => go(index - 1)} prevDisabled={index === 0}
          onNext={() => (isLast ? onDone() : go(index + 1))}
          nextLabel={isLast ? 'Back to summary' : 'Next'}
        />
      }
      overlay={<>
        {gridOpen && <QuestionGridSheet total={questions.length} current={index} stateOf={stateOf} graded onJump={go} onClose={() => setGridOpen(false)} />}
        {sheetOpen && q && (
          <ExplanationSheet
            question={q} isCorrect={!!a?.isCorrect} selectedKey={selectedKey}
            position={{ current: index, total: questions.length }}
            onPrev={index > 0 ? () => go(index - 1) : null}
            onNext={!isLast ? () => go(index + 1) : null}
            onClose={() => setSheetOpen(false)}
          />
        )}
      </>}
    >
      {q && (
        <>
          <QuestionCard key={`${q.id}-${index}`} question={q} qIndex={index} sessionType="study" alreadyAnswered={a} reviewMode hideHint />
          <ExplanationTrigger question={q} isCorrect={!!a?.isCorrect} onOpen={() => setSheetOpen(true)} />
        </>
      )}
    </SessionFrame>
  )
}

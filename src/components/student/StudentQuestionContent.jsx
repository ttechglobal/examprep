'use client'

import ContentText from '@/components/ui/ContentText'
import QuestionFigure from '@/components/ui/QuestionFigure'
import { questionReadingLayout, splitPassageCredit } from '@/lib/questionPassage'
import { normalizeQuestionTargets, safeContentImage } from '@/lib/questionContent'
import s from './StudentQuestionContent.module.css'

export default function StudentQuestionContent({ question }) {
  const q = question ?? {}
  const layout = questionReadingLayout({ ...q, question_text: normalizeQuestionTargets(q.question_text ?? q.text ?? q.question, q.instruction_text) })
  const passageImage = safeContentImage(q.passage_image_url)
  const reading = !!(layout.passage_text || passageImage)
  const passage = splitPassageCredit(layout.passage_text)
  return <div className={s.content}>
    {layout.instruction_text && <section aria-label="Instructions" className={s.instruction}><ContentText text={layout.instruction_text} /></section>}
    {reading && <section aria-label="Passage or extract" className={s.reading}>
      <h3 className={s.label}>Passage / extract</h3>
      <div className={s.readingBody} tabIndex={0} aria-label="Reading material">
        {passageImage && <QuestionFigure question={{ image_url: passageImage }} label="Passage image" />}
        {layout.passage_text && <div className={s.passage}><ContentText text={passage.text} />{passage.credit && <p className={s.credit} aria-label="Author or source"><ContentText text={passage.credit} /></p>}</div>}
      </div>
    </section>}
    <section aria-label="Question" className={s.stem}>
      {reading && <h3 className={s.label}>Question</h3>}
      <ContentText text={layout.question_text} />
    </section>
    <QuestionFigure key={q.id ?? q.q_index ?? layout.question_text} question={q} />
  </div>
}

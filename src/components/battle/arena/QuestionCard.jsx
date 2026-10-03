import { MathText } from '@/lib/mathRenderer'
import QuestionFigure from '@/components/ui/QuestionFigure'
import IllustratedIcon, { subjectArt } from '../IllustratedIcon'
import s from './QuestionCard.module.css'
// figure: the question object, for its image / SVG diagram (QuestionFigure)
export default function QuestionCard({ subject, text, passage, passageImage, figure, timer, embedded = false }) {
  return <section aria-label="Current question" className={`${s.question} ${embedded ? s.embedded : ''}`}>
    <div className={s.subjectRow}><span className={s.subject}><IllustratedIcon name={subjectArt(subject)} size={null} className={s.subjectIcon}/>{subject || 'Question'}</span>{timer}</div>
    {(passage || passageImage) && <div className={s.passage}>
      {/* eslint-disable-next-line @next/next/no-img-element -- bank images live on external storage */}
      {passageImage && <img className={s.passageImage} src={passageImage} alt="Passage illustration"/>}
      {passage && <MathText text={passage} as="div" className=""/>}
    </div>}
    <div className={s.prompt}><MathText text={text ?? ''} as="span" className=""/></div>
    {figure && <QuestionFigure question={figure} className={s.figure}/>}
  </section>
}

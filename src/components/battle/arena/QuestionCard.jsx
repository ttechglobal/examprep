import StudentQuestionContent from '@/components/student/StudentQuestionContent'
import IllustratedIcon, { subjectArt } from '../IllustratedIcon'
import s from './QuestionCard.module.css'
// figure: the question object, for its image / SVG diagram (QuestionFigure)
export default function QuestionCard({ subject, text, passage, passageImage, figure, timer, embedded = false }) {
  return <section aria-label="Current question" className={`${s.question} ${embedded ? s.embedded : ''}`} style={{ '--student-question-font': 'var(--question-font, 1.2rem)', '--student-question-weight': 700, '--student-question-leading': 1.4, '--student-reading-max-height': 'min(30dvh, 260px)', '--student-content-surface': '#ffffffd9', '--student-instruction-ink': '#26394f' }}>
    <div className={s.subjectRow}><span className={s.subject}><IllustratedIcon name={subjectArt(subject)} size={null} className={s.subjectIcon}/>{subject || 'Question'}</span>{timer}</div>
    <StudentQuestionContent question={{ ...figure, question_text: text ?? figure?.text ?? figure?.question_text, passage_text: passage ?? figure?.passage_text, passage_image_url: passageImage ?? figure?.passage_image_url }} />
  </section>
}

// Shared question-count and optional per-question timer controls for topic setup.
import { TOPIC_QUESTION_COUNTS, QUESTION_TIME_OPTIONS } from '@/lib/topicSession'
import s from './setupSheet.module.css'

export default function TopicSessionOptions({ count, onCount, perQuestionSecs, onTime }) {
  return <>
    <fieldset className={s.optionsGroup}>
      <legend className={s.label}>Number of questions</legend>
      <div className={s.chips}>{TOPIC_QUESTION_COUNTS.map(n => <button key={n} type="button" className={`${s.chip} ${count === n ? s.chipOn : ''}`} onClick={() => onCount(n)} aria-pressed={count === n}>{n}</button>)}</div>
    </fieldset>
    <fieldset className={s.optionsGroup}>
      <legend className={s.label}>Time per question</legend>
      <div className={`${s.chips} ${s.chipsWide}`}>{QUESTION_TIME_OPTIONS.map(n => <button key={n} type="button" className={`${s.chip} ${perQuestionSecs === n ? s.chipOn : ''}`} onClick={() => onTime(n)} aria-pressed={perQuestionSecs === n}>{n ? `${n}s` : 'No timer'}</button>)}</div>
    </fieldset>
    <p className={s.note}>{perQuestionSecs ? 'When time runs out, your answer is kept and you move to the next question.' : 'Take your time. There is no countdown.'}</p>
  </>
}

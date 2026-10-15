// Topic session options shared by ordinary topic practice and challenge setup.
export const TOPIC_QUESTION_COUNTS = [5, 10, 20, 30, 50]
export const QUESTION_TIME_OPTIONS = [0, 15, 30, 45, 60, 90, 120]

export function topicSessionConfig({ subject, topic, exam, count, perQuestionSecs }) {
  if (!subject?.id || !topic?.id) throw new Error('Choose a subject and topic first')
  if (!TOPIC_QUESTION_COUNTS.includes(count) || !QUESTION_TIME_OPTIONS.includes(perQuestionSecs)) {
    throw new Error('Choose a supported question count and time')
  }
  return { subjects: [subject.name], subject_id: subject.id, examType: exam,
    topic_id: topic.id, topicName: topic.name, count, perQuestionSecs,
    mode: 'practice', sessionType: 'practice' }
}

export function questionTimeLimit(config) {
  if (config?.mode === 'timed') return config.speedSecs ?? 30
  return QUESTION_TIME_OPTIONS.includes(config?.perQuestionSecs) ? config.perQuestionSecs || null : null
}

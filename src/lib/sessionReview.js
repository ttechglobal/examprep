export const REVIEW_FILTERS = [
  { key: 'all', name: 'All answers' },
  { key: 'missed', name: 'Needs review' },
  { key: 'wrong', name: 'Incorrect' },
  { key: 'skipped', name: 'Skipped' },
]

export function answerState(answer) {
  return answer?.selectedIdx == null ? 'skipped' : answer.isCorrect ? 'correct' : 'wrong'
}

export function sessionResults(questions, answers = []) {
  const result = { total: questions.length, correct: 0, wrong: 0, skipped: 0 }
  questions.forEach((_, index) => { result[answerState(answers[index])]++ })
  return { ...result, missed: result.wrong + result.skipped, percent: result.total ? Math.round(result.correct * 100 / result.total) : 0 }
}

export function reviewIndexes(questions, answers, filter = 'all') {
  return questions.flatMap((_, index) => {
    const state = answerState(answers[index])
    return filter === 'all' || filter === state || filter === 'missed' && state !== 'correct' ? [index] : []
  })
}

export function topicPerformance(questions, answers = []) {
  const groups = new Map()
  questions.forEach((question, index) => {
    const name = question.topic_name || 'General'
    const subject = question.subject_name || ''
    const id = JSON.stringify([question.subject_id || subject, question.topic_id || name])
    const row = groups.get(id) ?? { id, name, subject, correct: 0, total: 0 }
    row.total++
    if (answerState(answers[index]) === 'correct') row.correct++
    groups.set(id, row)
  })
  const rows = [...groups.values()]
  return rows.map(row => ({ ...row,
    name: rows.some(other => other.id !== row.id && other.name === row.name) && row.subject ? `${row.name} · ${row.subject}` : row.name,
    percent: Math.round(row.correct * 100 / row.total),
  })).sort((a, b) => a.percent - b.percent || a.name.localeCompare(b.name))
}

export function sessionName(config = {}) {
  if (config.mode === 'mock') return 'Mock Exam'
  if (config.mode === 'timed') return 'Speed Round'
  if (config.mode === 'quick5') return 'Quick 5'
  return config.sessionType === 'study' || config.mode === 'study' ? 'Study' : 'Practice'
}

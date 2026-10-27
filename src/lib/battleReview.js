import { reviewIndexes, sessionResults } from './sessionReview.js'

export function battleAnswers(items) {
  return items.map(item => {
    const selectedIdx = Number.isInteger(item.mineIdx) && item.mineIdx >= 0 && item.mineIdx < item.options.length ? item.mineIdx : null
    return { selectedIdx, isCorrect: selectedIdx != null && selectedIdx === item.correctIdx }
  })
}

export function battleReviewIndexes(items, filter = 'all') {
  return reviewIndexes(items, battleAnswers(items), filter)
}

export function battleReviewResults(items) {
  return sessionResults(items, battleAnswers(items))
}

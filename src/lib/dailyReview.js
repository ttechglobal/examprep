export function dailyNeedsReview(challenge) {
  return !!challenge.state?.completed && (!challenge.state.correct || challenge.state.attempts_used > 1)
}

export function dailyReviewIndexes(challenges, filter = 'all') {
  return challenges.flatMap((challenge, index) => challenge.question && challenge.state?.completed && (filter === 'all' || dailyNeedsReview(challenge)) ? [index] : [])
}

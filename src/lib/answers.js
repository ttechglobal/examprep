// src/lib/answers.js
// How an answer is checked — shared by the session screens and the server, so
// both always agree on what counts as correct.
//
// Options are shown in their stored A/B/C/D order (never shuffled), so an
// option's index maps straight to its letter. correct_answer may be stored as
// the letter ("B"), the option text, or the index.

export const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function normaliseOptions(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  return LETTERS.map(l => raw[l]).filter(v => v != null)
}

export function checkCorrect(options, idx, correctAnswer) {
  return options[idx] === correctAnswer || LETTERS[idx] === correctAnswer || idx === correctAnswer
}

/** Index of the correct option (-1 if none matches), with the same rule as checkCorrect. */
export function correctIndex(options, correctAnswer) {
  return options.findIndex((_, i) => checkCorrect(options, i, correctAnswer))
}

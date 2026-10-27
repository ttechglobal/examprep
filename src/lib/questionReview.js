import { contentIssues } from './questionContent.js'

export function allReviewIssues(question) {
  const issues = [...contentIssues(question)]
  const storedReview = question.explanation?.content_review
  if (storedReview?.status === 'needs_review') issues.push(...(Array.isArray(storedReview.issues) ? storedReview.issues : ['The saved source review is unresolved.']))
  const stem = String(question.question_text ?? question.question ?? '').trim()
  const options = question.options ?? question.option ?? {}
  const entries = Object.entries(options).filter(([, text]) => String(text ?? '').trim())
  if (!stem) issues.push('Question text is missing.')
  if (entries.length < 2) issues.push('At least two non-empty answer options are required.')
  const answer = String(question.correct_answer ?? question.answer ?? '').toUpperCase().trim()
  if (!entries.some(([letter]) => letter.toUpperCase() === answer)) issues.push(`The answer key does not identify an available option. Current key: ${answer || '(not supplied)'}. Available non-empty options: ${entries.map(([key]) => key.toUpperCase()).join(', ') || 'none'}. Select a valid key after checking the answer.`)
  const texts = entries.map(([, value]) => String(value).trim().toLowerCase().replace(/\s+/g, ' '))
  if (new Set(texts).size < texts.length) {
    const groups = [...new Set(texts)].map(text => entries.filter((_, index) => texts[index] === text)).filter(group => group.length > 1)
    issues.push(`Two or more options have the same text: ${groups.map(group => `${group.map(([key]) => key.toUpperCase()).join(' / ')} (“${String(group[0][1]).slice(0, 100)}”)`).join('; ')}. Check the original options for a copy error or multiple correct answers.`)
  }
  if (/\ufffd/.test(JSON.stringify([stem, options]))) issues.push('Some source characters are damaged and need checking.')
  if (question._layoutUnverified) issues.push('The proposed line breaks were not present in the source. Verify the original passage or poem layout.')
  if (question._answerDisagreement) issues.push(`The provider and enrichment disagree on the answer. Provider key: ${question.sdash_answer || '(not supplied)'}; current enrichment key: ${answer || '(not supplied)'}. Compare both option texts with the explanation and original source before choosing a key.`)
  if (question._optionCountMismatch) issues.push('The number of answer options changed during enrichment.')
  if (question.ai_confidence === 'unsure') issues.push(`Enrichment is unsure of the answer.${question._contextStatus === 'missing' ? ' It did not verify an answer because of the missing-context report above; repair or clarify that source content and regenerate enrichment.' : ' Read the explanation, check the source and independently verify the key before publishing.'}`)
  return [...new Set(issues)]
}

// Missing required content must be repaired rather than acknowledged away.
export function canAcceptReviewIssue(issue, question) {
  return !/Source diagram needs review|Question text is missing|At least two non-empty|answer key does not identify|referenced passage or extract is missing|underline target is missing|unsupported structure|Unbalanced inline|valid http|missing context|Multiple enrichment|Multiple source|No unique enrichment/.test(issue)
    && !(question._mismatch && !question._matching?.responseFound)
}

export function reviewSignature(question) {
  const { content_review, svg_diagram, ...explanation } = question.explanation ?? {}
  return JSON.stringify([question.question_text ?? question.question, question.options ?? question.option,
    question.correct_answer ?? question.answer, question.instruction_text, question.passage_text,
    question.passage_image_url, explanation, allReviewIssues(question)])
}

export function acceptedReviewIssues(question) {
  const saved = question.explanation?.content_review
  const decision = question._reviewDecision ?? (saved?.status === 'reviewed' ? { note: saved.note, signature: saved.signature, issues: saved.accepted_issues } : null)
  if (!decision?.note?.trim() || decision.signature !== reviewSignature(question)) return []
  return allReviewIssues(question).filter(issue => decision.issues?.includes(issue) && canAcceptReviewIssue(issue, question))
}

export function reviewIssues(question) {
  const accepted = acceptedReviewIssues(question)
  return allReviewIssues(question).filter(issue => !accepted.includes(issue))
}

// Decode only identifiable encoding artifacts, never spelling distractors.
export function repairTextEncoding(value) {
  if (typeof value !== 'string') return value
  const fixes = { 'â€™': '’', 'â€˜': '‘', 'â€œ': '“', 'â€\u009d': '”', 'â€“': '–', 'â€”': '—', 'â€¦': '…', 'Â ': ' ' }
  let text = value
  for (const [bad, good] of Object.entries(fixes)) text = text.split(bad).join(good)
  return text
}

export function existingQuestionFormatting(question) {
  const result = {
    question_text: repairTextEncoding(question.question_text),
    options: Object.fromEntries(Object.entries(question.options ?? {}).map(([key, value]) => [key, repairTextEncoding(value)])),
    instruction_text: repairTextEncoding(question.instruction_text) || null,
  }
  const instruction = result.question_text.match(/^(?:Choose|Select|Fill(?: in)?|Identify|Find|Determine|Mark)\b[^:\n]{0,220}:/i)?.[0]
  // Keep the full stem for current student clients that do not display instructions.
  if (!result.instruction_text && instruction) result.instruction_text = instruction
  return result
}

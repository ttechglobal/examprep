// Classify existing records for the explicitly scoped English/Literature reset.
// This is a review/removal policy, not a claim every candidate is unsolvable.
export function languageCleanupReasons(question, subjectName = '') {
  const stem = String(question.question_text ?? '')
  const instruction = String(question.instruction_text ?? '')
  const text = `${stem}\n${instruction}`
  const marks = [text, question.passage_text, ...Object.values(question.options ?? {})].join('\n')
  const reasons = []
  if (question.passage_text || question.passage_image_url) reasons.push('legacy_passage_or_section_needs_review')
  if (/\bunderlin\w*|\bitalic\w*|\bemboldened\b|\bbold[ -]?(?:type|print)\b/i.test(text)
      || /<\/?(?:u|em|strong|blockquote)\b|\*\*[^*]+\*\*/i.test(marks)) reasons.push('source_annotation_needs_reimport')
  if (/\b(?:passage|excerpt|extract)\b|\b(?:read|study)\s+the\s+(?:poem|text)\b/i.test(text)) reasons.push('reading_context_needs_reimport')
  if (/\b(?:the|this|above|following)\s+(?:speaker|persona|addressee)\b|\b(?:the|this|above|following)\s+poem\b|\blines?\s+\d/i.test(text)) reasons.push('literary_context_needs_reimport')
  if (/^From\s+(?:William Shakespeare|the following line)|\b(?:device|effect|meaning)\s+(?:used\s+)?in\s+['"“‘]|^Theseus\s*:/i.test(stem)) reasons.push('embedded_literary_quotation')
  if (/\b(?:these|following)\s+lines\b|\bdominant device used in\b/i.test(text)
      || /literature/i.test(subjectName) && stem.length > 160) reasons.push('embedded_literary_reading_material')
  if (/\ufffd/.test(marks)) reasons.push('damaged_text_encoding')
  return reasons
}

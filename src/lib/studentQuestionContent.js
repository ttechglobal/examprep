import { safeContentImage } from './questionContent.js'
import { sourceDiagramSvg } from './questionDiagrams.js'

export function explanationObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return {}
  try { const parsed = JSON.parse(value); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed } catch {}
  return { correct: value }
}

// Safe display-only fields, usable before an answer is revealed. Never include
// explanation text, review notes, diagram verification signatures or the key.
export function publicQuestionContent(q) {
  const explanation = explanationObject(q.explanation)
  const source = explanation.question_diagram
  return {
    instruction_text: q.instruction_text ?? null,
    passage_text: q.passage_text ?? null,
    passage_image_url: safeContentImage(q.passage_image_url),
    has_image: !!q.has_image,
    image_url: safeContentImage(q.image_url) || (source?.reviewed ? safeContentImage(source.image_url) : null),
    image_description: q.image_description ?? null,
    svg_diagram: (source?.reviewed ? sourceDiagramSvg({ explanation }) : null) || q.svg_diagram || null,
  }
}

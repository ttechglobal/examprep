import { safeSvg } from './safeSvg.js'

const text = value => typeof value === 'string' ? value.trim() : ''
const imageUrl = value => { try { const url = new URL(text(value)); return /^https?:$/.test(url.protocol) ? url.href : null } catch { return null } }

export function sourceDiagramDescription(q) {
  const inlineDescription = text(q.image)
  return [q.image_description, q.diagram_description, q.figure_description, q.imageDescription, q.diagram?.description, q.image?.description,
    inlineDescription.length > 12 && !imageUrl(inlineDescription) && !/<[a-z]/i.test(inlineDescription) ? inlineDescription : '',
    q.explanation?.question_diagram?.description].map(text).filter((value, index, values) => value && values.indexOf(value) === index).join('\n')
}

export function sourceDiagramReferences(q) {
  const refs = [...(Array.isArray(q.explanation?.question_diagram?.references) ? q.explanation.question_diagram.references : [])]
  for (const [field, value] of [['question', q.question_text ?? q.question], ['passage', q.passage_text ?? q.section], ...Object.entries(q.options ?? q.option ?? {}).map(([key, value]) => [`option ${key}`, value])]) {
    for (const match of text(value).matchAll(/<img\b[^>]*>/gi)) {
      const url = imageUrl(match[0].match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1])
      if (url && !refs.some(item => item.field === field && item.url === url)) refs.push({ field, url, alt: match[0].match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] ?? '' })
    }
  }
  return refs.filter(ref => ref && imageUrl(ref.url)).map(ref => ({ field: text(ref.field), url: imageUrl(ref.url), alt: text(ref.alt) }))
}

export function sourceDiagramSvg(q) {
  const svg = safeSvg(q.explanation?.question_diagram?.svg)
  return svg && /<\/svg>\s*$/i.test(svg) ? svg : null
}

export function sourceDiagramSignature(q) {
  const canonical = value => text(value).replace(/<\/?(?:u|strong|b|em|i|sup|sub)\b[^>]*>|<img\b[^>]*>|\*\*/gi, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim()
  const options = q.options ?? q.option ?? {}
  return JSON.stringify([canonical(q.question_text ?? q.question), canonical(q.instruction_text ?? q.instruction), canonical(q.passage_text ?? q.section),
    Object.entries(options).map(([key, value], index) => { const label = Array.isArray(options) ? 'ABCDE'[index] : key.toUpperCase(); return [label, canonical(value) || (/<img\b/i.test(text(value)) ? `See option ${label} in the source diagram.` : '')] }).filter(([, value]) => value).sort(),
    sourceDiagramDescription(q), sourceDiagramSvg(q), imageUrl(q.explanation?.question_diagram?.image_url) || imageUrl(q.image_url) || imageUrl(q.image), sourceDiagramReferences(q)])
}

export function questionDiagram(q) {
  const saved = q.explanation?.question_diagram ?? {}
  const description = sourceDiagramDescription(q)
  const sourceImage = imageUrl(saved.image_url) || imageUrl(q.image_url) || imageUrl(q.image) || imageUrl(q.image?.url)
  const references = sourceDiagramReferences(q)
  const fields = [q.question_text ?? q.question, q.instruction_text ?? q.instruction, q.passage_text ?? q.section, ...Object.values(q.options ?? q.option ?? {})].map(text).join('\n')
  const reference = /\b(?:diagram|illustration)\b|\bfigure\s+(?:above|below|shown|given|[1-9]\b)|\b(?:refer(?:ring)?\s+to|shown\s+in)\s+(?:the\s+)?figure\b|\b(?:image|picture|graph|chart|table|map)\s+(?:above|below|shown|given)\b|\bfrom the (?:graph|chart|table|map)\b|\busing the (?:information|data) (?:in|from) the (?:table|graph|chart)\b|\bas shown (?:in|above|below)\b/i.test(fields)
  const htmlImage = /<img\b/i.test(fields)
  const required = !!(saved.required || q.has_image === true || sourceImage || description || reference || htmlImage || references.length)
  const svg = sourceDiagramSvg(q)
  const ready = required && saved.reviewed === true && saved.signature === sourceDiagramSignature(q) && !!(svg || sourceImage)
  const reason = !required ? null : ready ? 'Source diagram checked and attached.'
    : description ? 'A source diagram description is supplied. Recreate the diagram, check its labels and values, and attach it before publishing.'
    : sourceImage ? 'A source diagram image is supplied. Open it and check that it belongs to this question and is readable before publishing.'
    : 'The question or an option refers to a diagram, graph, table or image, but no usable diagram is attached. Obtain the original or an adequate source description; do not guess missing labels or values.'
  return { required, ready, description, image_url: sourceImage, references, svg, reason, status: !required ? 'not_required' : ready ? 'reviewed' : 'needs_diagram' }
}

export function questionDiagramMetadata(q) {
  const state = questionDiagram(q)
  return { ...(q.explanation?.question_diagram ?? {}), required: state.required, description: state.description,
    image_url: state.image_url, references: state.references, status: state.status, reviewed: state.ready, svg: state.svg }
}

export function buildSourceDiagramPrompt(q, subject = '') {
  const state = questionDiagram(q)
  return `Recreate the SOURCE QUESTION DIAGRAM for ${subject || 'an exam question'}. Return only inline <svg>...</svg> code, not Markdown.
This is the exam's given diagram, NOT a solution illustration. Do not include the correct answer, derived values, worked steps or clues.
Use only the supplied description and an original image you can actually inspect. An image URL alone does not mean you can see it.
If essential labels, dimensions, connectivity, graph values or option images are unknown, stop and list exactly what is missing instead of inventing a diagram.
Preserve every supplied label, unit, angle, scale, axis, chemical bond, anatomical part and direction. Never infer a measurement from an answer option. Do not assume a geometry sketch is to scale.
Use a white background, viewBox="0 0 600 400", readable labels at least 16px, dark lines and clear arrowheads. Keep labels separate from lines. No scripts, event handlers, foreignObject, external assets or animations.
SOURCE QUESTION ID: ${q.id ?? q.sdash_id ?? '(not supplied)'}
QUESTION: ${text(q.question_text ?? q.question)}
INSTRUCTION: ${text(q.instruction_text ?? q.instruction)}
PASSAGE / SHARED CONTEXT: ${text(q.passage_text ?? q.section)}
OPTIONS (keep any option diagrams distinct): ${JSON.stringify(q.options ?? q.option ?? {})}
SOURCE DIAGRAM DESCRIPTION: ${state.description || '(not supplied — inspect the original image before drawing)'}
ORIGINAL IMAGE REFERENCE: ${state.image_url || '(not supplied)'}
ADDITIONAL SOURCE IMAGE REFERENCES (retain their option/field identity): ${JSON.stringify(state.references)}
After generation an administrator will compare the SVG with the source before approving it.`
}

export const explanationIllustrationRules = `ILLUSTRATION DECISION — applies across all subjects:
Keep source question diagrams separate from optional explanation illustrations. A solution illustration cannot replace a missing exam diagram and must never be used to infer missing source data.
Assess every explanation for a useful visual relationship: geometry and constructions, function or statistics graphs, Venn regions, forces and rays, circuits, apparatus and molecular structure, biological structures and processes, economic curves, maps and geographical processes.
Generate an illustration only when it clarifies a specific relationship, mechanism, spatial arrangement, trend or comparison in this explanation and every depicted fact is supported. A list of examples is not a closed whitelist. A question need not involve calculation to benefit.
Do not illustrate one-step arithmetic, routine symbolic manipulation, vocabulary, dates or simple recall when text fully explains them. No decorative pictures and no automatic requirement to draw because of the subject name.
Each value must be traceable to the source question OR a verified calculation. Qualitative diagrams can use no numbers. Label hypothetical schematic examples explicitly and never present them as source measurements. Never fabricate missing exam data.
Return illustration_title, illustration_prompt and illustration_reason. Explain the decision in illustration_reason even when the prompt is empty: name the visual relationship to clarify, or the concrete reason text suffices or the source is insufficient. Uncertainty about a detail means omit that detail or decline the illustration, not guess.
For a useful accurate visual, write the AHA/CONTAINMENT/FLOW/BOUNDARIES/QUANTITIES brief below, ending with "Generate SVG code." For an unnecessary or unsupported visual return an empty prompt and title.`

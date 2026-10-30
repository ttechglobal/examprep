import { splitEmbeddedPassage, embeddedQuestionInstruction } from './questionPassage.js'
import { questionDiagram, questionDiagramMetadata } from './questionDiagrams.js'

// Portable admin content contract: safe text plus explicit inline marks.
// Never execute provider HTML. Unknown structures require human review.
export function contentText(value) {
  if (value == null) return ''
  if (typeof value !== 'string' && typeof value !== 'number') return '[Unsupported source content: review original payload]'
  const spans = []
  return String(value)
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&lsquo;/gi, '‘').replace(/&rsquo;/gi, '’').replace(/&ldquo;/gi, '“').replace(/&rdquo;/gi, '”')
    .replace(/&ndash;/gi, '–').replace(/&mdash;/gi, '—').replace(/&hellip;/gi, '…')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_, body) => {
      const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row => [...row[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(cell => ({ header: cell[1].toLowerCase() === 'th', text: contentText(cell[2]) })))
      const width = rows[0]?.length ?? 0
      if (width < 2 || rows.some(row => row.length !== width || row.some(cell => /[|\n]/.test(cell.text))) || /\b(?:colspan|rowspan)\s*=\s*["']?(?:[2-9]|\d{2,})/i.test(body)) {
        return `\n[Unsupported source content: table layout needs review]\n${body.replace(/<\/t[dh]\s*>/gi, ' | ').replace(/<\/tr\s*>/gi, '\n')}\n`
      }
      const headers = rows[0].every(cell => cell.header) ? rows.shift().map(cell => cell.text) : Array.from({ length: width }, (_, index) => `Column ${index + 1}`)
      const caption = body.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i)?.[1]
      return `\n\n${caption ? contentText(caption) + '\n' : ''}| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map(row => `| ${row.map(cell => cell.text).join(' | ')} |`).join('\n')}\n\n`
    })
    .replace(/<\/?span\b[^>]*>/gi, tag => {
      if (/^<\//.test(tag)) return (spans.pop() ?? []).reverse().map(mark => `</${mark}>`).join('')
      const marks = []
      if (/text-decoration(?:-line)?\s*:[^;"']*\bunderline\b/i.test(tag)) marks.push('u')
      if (/font-weight\s*:\s*(?:bold|[7-9]00)/i.test(tag)) marks.push('strong')
      if (/font-style\s*:\s*italic/i.test(tag)) marks.push('em')
      spans.push(marks)
      return marks.map(mark => `<${mark}>`).join('')
    })
    .replace(/<(?:br|hr)\b[^>]*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|blockquote|tr|h[1-6])\s*>/gi, '\n\n')
    .replace(/<(u|b|strong|i|em|sup|sub)\b[^>]*>/gi, (_, tag) => `<${({ b: 'strong', i: 'em' })[tag.toLowerCase()] ?? tag.toLowerCase()}>`)
    .replace(/<\/(u|b|strong|i|em|sup|sub)\s*>/gi, (_, tag) => `</${({ b: 'strong', i: 'em' })[tag.toLowerCase()] ?? tag.toLowerCase()}>`)
    .replace(/<(?!\/?(?:u|strong|em|sup|sub)>)[a-z!/][^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'")
    .replace(/&#(\d+);|&#x([\da-f]+);/gi, (_, n, h) => {
      const code = n ? Number(n) : parseInt(h, 16)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '\ufffd'
    })
    .replace(/\r\n?/g, '\n').trim()
}

// Interpret source emphasis using the question's instruction, never the answer.
// Literature passages keep their own italics and are not converted to targets.
export function normalizeQuestionTargets(text, instruction = '') {
  const value = contentText(text)
  if (!/\bunderlined?\b/i.test(`${value} ${instruction}`)) return value
  if (/<u>[\s\S]*?<\/u>|\*\*[^*]+\*\*/i.test(value)) return value
  const marked = value.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, (mark, target) =>
    target.trim() === target && target ? `<u>${target}</u>` : mark)
  if (marked !== value) return marked
  // Quotation marks are a provider convention for vocabulary targets only.
  // Word boundaries exclude possessives and contractions from quote pairing.
  const directive = `${embeddedQuestionInstruction(value) || ''} ${instruction}`
  if (!/\b(?:word|phrase)(?:\s+or\s+(?:word|phrase))?\s+(?:underlined|that is underlined)\b|\bunderlined\s+(?:word|phrase)\b/i.test(directive)) return value
  // Some provider payloads retain a second layer of quote escaping after JSON
  // parsing. Decode quote escapes only here, never general escapes (e.g. LaTeX).
  const quotedValue = value.replace(/\\+(?=["'‘’“”])/g, '')
  const quotes = [...quotedValue.matchAll(/(?<![\p{L}\p{N}])(?:'([^'\n]+)'|‘([^‘’\n]+)’|"([^"\n]+)"|“([^“”\n]+)”)(?![\p{L}\p{N}])/gu)]
  if (quotes.length !== 1) return value
  const quote = quotes[0]
  const target = quote.slice(1).find(part => part !== undefined)
  if (!target?.trim() || target.trim() !== target || /[<>*]/.test(target)) return value
  return quotedValue.slice(0, quote.index) + `<u>${target}</u>` + quotedValue.slice(quote.index + quote[0].length)
}

export function normalizeQuestionContent(q) {
  const instruction = contentText(q.instruction_text ?? q.instruction) || embeddedQuestionInstruction(contentText(q.question ?? q.question_text))
  const rawOptions = q.option ?? q.options ?? {}
  const option = Object.fromEntries(Object.entries(rawOptions).map(([k, v], i) => [
    Array.isArray(rawOptions) ? 'abcde'[i] ?? String(i) : k.toLowerCase(), contentText(v) || (/<img\b/i.test(String(v)) ? `See option ${(Array.isArray(rawOptions) ? 'abcde'[i] ?? String(i) : k).toUpperCase()} in the source diagram.` : ''),
  ]).filter(([, v]) => v))
  return {
    ...q,
    ...(questionDiagram(q).required ? { explanation: { ...(typeof q.explanation === 'object' && q.explanation ? q.explanation : q.explanation ? { correct: q.explanation } : {}), question_diagram: questionDiagramMetadata(q) } } : {}),
    question: normalizeQuestionTargets(q.question ?? q.question_text, instruction), option,
    answer: q.answer ?? q.correct_answer ?? '',
    section: contentText(q.section ?? q.passage_text) || null,
    instruction_text: instruction,
    passage_image_url: safeContentImage(q.passage_image_url),
  }
}

export function safeContentImage(value) {
  if (typeof value !== 'string') return null
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null } catch { return null }
}

export function contentIssues(q) {
  const stem = normalizeQuestionTargets(q.question_text ?? q.question ?? '', q.instruction_text ?? q.instruction)
  const passage = q.passage_text ?? q.section ?? ''
  const instruction = q.instruction_text ?? q.instruction ?? ''
  const all = [stem, passage, instruction, ...Object.values(q.options ?? q.option ?? {})].join('\n')
  const issues = []
  // An extract may be only a line long and may live inside the stem. Its length
  // and storage field do not establish whether context is missing.
  const readingStem = stem.replace(/^\s*Read (?:the following|these) lines[^:\n]*[:\n]\s*/i, '')
  const embeddedReading = splitEmbeddedPassage(readingStem)
    || /[“"][\s\S]{3,}?[”"]|‘[^‘’]{3,}’/.test(readingStem)
  const hasReading = !!(passage || safeContentImage(q.passage_image_url) || embeddedReading)
  if (q.passage_image_url && !safeContentImage(q.passage_image_url)) issues.push('Passage image must be a valid http or https URL.')
  for (const [label, field] of [['Question', stem], ['Passage / extract', passage], ['Instruction', instruction], ...Object.entries(q.options ?? q.option ?? {}).map(([key, value]) => [`Option ${key.toUpperCase()}`, value])]) {
    const stack = []
    let invalid = false
    for (const token of String(field).matchAll(/<(\/?)(u|strong|em|sup|sub)>/g)) {
      if (!token[1]) stack.push(token[2])
      else if (stack.pop() !== token[2]) invalid = true
    }
    if (invalid || stack.length) { issues.push(`Unbalanced inline formatting in ${label}: a formatting tag is unclosed or closes in the wrong order. Match each opening <u>, <strong> or <em> tag with its closing tag.`); break }
  }
  if (all.includes('[Unsupported source content:')) issues.push('Source content has an unsupported structure; inspect the original payload.')
  if (/\b(?:passage|extract|excerpt|poem|text)\s+(?:above|below)|\b(?:above|following)\s+(?:passage|extract|excerpt|poem)|\baccording to the passage\b|\bread the (?:passage|poem|extract)\b/i.test(`${stem} ${instruction}`) && !hasReading) issues.push('The referenced passage or extract is missing. No separate or recognisable embedded extract was supplied. Add the referenced lines or passage; the full literary work is not required.')
  const needsTarget = /\bunderlined?\b/i.test(`${stem} ${instruction}`)
  const hasTarget = /<u>\s*[^<\s][^]*?<\/u>|\*\*[^*]+\*\*/i.test([stem, normalizeQuestionTargets(passage, `${stem} ${instruction}`)].join('\n'))
  if (needsTarget && !hasTarget) issues.push(String(stem).includes('*')
    ? 'The underline target is missing or its asterisk marker is unclosed in the full question. Check both ends of the marked word or phrase; use <u>…</u> or paired *…*. Do not infer it from a shortened snippet.'
    : 'The underline target is missing from the question. Mark the exact source word or letters with <u>…</u> or paired *…*; a marked answer option alone does not identify the target.')
  if (/\bread (?:the following|these) lines\b/i.test(stem) && !hasReading) issues.push('The referenced passage or extract is missing. Supply the lines named in the instruction, either inside the question or as passage text; a full poem is not required.')
  if (q._sourceSplitIssue) issues.push(q._sourceSplitIssue)
  const diagram = questionDiagram(q)
  if (diagram.required && !diagram.ready) issues.push(`Source diagram needs review: ${diagram.reason}`)
  if (q._mismatch) issues.push(q._matching?.reason || 'Enrichment could not be matched uniquely to this question.')
  if (q.context_status === 'missing' || q._contextStatus === 'missing') {
    const reason = q._contextReason || q.context_reason || q.explanation?.answer_note || q.explanation?.intro
    const detail = typeof reason === 'string' && reason.trim() ? ` Reported reason: ${reason.trim()}` : ' The response did not identify the missing material.'
    issues.push(`Enrichment reported missing context.${detail}${needsTarget && hasTarget ? ' The full source question already has a marked target; regenerate enrichment using that target before verifying the answer.' : ' Compare the full source question, instruction and passage; restore the named material and regenerate enrichment.'}`)
  }
  return issues
}

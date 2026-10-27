// Conservative display separation for legacy stems containing reading material.
// Slices the original string at a recognizable trailing question; never rewrites it.
export function splitEmbeddedPassage(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || /^(?:Choose|Select|Identify|What|Which|Who|How|Why|Where|When|Define|Explain|Name|In Chapter)\b/i.test(text)) return null
  const candidates = [
    ...text.matchAll(/\b(?:(?:Earlier|Later),?\s+)?(?:The|This)\s+(?:(?:dominant|main|major|central|literary|rhetorical|poetic)\s+)*(?:literary\s+devices?|devices?|figure of speech|theme|tone|mood|subject matter|image|rhyme scheme|speaker|persona|addressee|narrator|poet|poem|subject[’']s experience|lines?|excerpt)\b/g),
    ...text.matchAll(/(?:(?<=[.!?”’"'])\s+|(?<=\n))(?:What|Which|Who|Why|How|Where|When)\b/g),
  ].sort((a, b) => b.index - a.index)
  for (const match of candidates) {
    const index = match.index + (match[0].match(/^\s*/)?.[0].length ?? 0)
    const passage = text.slice(0, index).trimEnd()
    const question = text.slice(index).trimStart()
    if (passage.length < 12 || passage.split(/\s+/).length < 3 || question.length > 280) continue
    if (/^(?:What|Which|Who|Why|How|Where|When)\b/.test(question)) {
      if (!/\?\s*$/.test(question) || /\?\s+\S/.test(question)) continue
    } else {
      if (!/\b(?:is|are|portrays?|suggests?|implies|reveals?|conveys?|achieves?|has accused|provide|refers?)\b/.test(question)) continue
      if (!/(?:\b(?:is|are|of|as|a|an|the|through|that|by|to|in|about)|[?_:])\s*_*\s*$/.test(question)) continue
    }
    // Avoid cutting through a source annotation or an unfinished quotation.
    for (const tag of ['u', 'strong', 'em', 'sup', 'sub']) {
      if ((passage.match(new RegExp(`<${tag}>`, 'g')) ?? []).length !== (passage.match(new RegExp(`</${tag}>`, 'g')) ?? []).length) return null
    }
    if ((passage.match(/"/g) ?? []).length % 2 || (passage.match(/“/g) ?? []).length !== (passage.match(/”/g) ?? []).length) continue
    return { passage_text: passage, question_text: question }
  }
  return null
}

export function questionReadingLayout(question) {
  const instruction = question.instruction_text || null
  let stem = question.question_text ?? question.question ?? ''
  if (instruction && stem.startsWith(instruction)) stem = stem.slice(instruction.length).trimStart()
  const passage = question.passage_text || question.section || null
  if (passage) {
    if (stem.startsWith(passage)) stem = stem.slice(passage.length).trimStart()
    return { instruction_text: instruction, passage_text: passage, question_text: stem, derived: false }
  }
  const split = splitEmbeddedPassage(stem)
  return { instruction_text: instruction, passage_text: split?.passage_text ?? null, question_text: split?.question_text ?? stem, derived: !!split }
}

// Style only an explicitly marked final source credit, never infer an author
// from an ordinary last line of verse. Keep the source wording intact.
export function splitPassageCredit(value) {
  if (typeof value !== 'string') return { text: value, credit: null }
  const last = value.match(/\r?\n([^\r\n]+)\s*$/)
  if (!last) return { text: value, credit: null }
  const line = last[1].trim()
  const plain = line.replace(/<\/?(?:u|strong|em|sup|sub)>|\*/gi, '').trim()
  const named = /^(?:[\p{Lu}][\p{L}’'.-]*)(?:\s+(?:(?:van|von|de|da|del|du)\s+)?[\p{Lu}][\p{L}’'.-]*)+(?:\s*[,:(“"].*)?$/u
  const explicit = /^(?:Author|Poet|Source|Adapted from|Extract from)\s*:\s*\S/i.test(plain)
  const byline = plain.match(/^(?:[—–]\s*|By\s+)(.+)$/u)?.[1]
  if (line.length > 300 || !(explicit || byline && named.test(byline))) return { text: value, credit: null }
  return { text: value.slice(0, last.index).trimEnd(), credit: line }
}

'use client'

import { questionReadingLayout } from '@/lib/questionPassage'
import s from './QuestionContent.module.css'
import { MathText } from '@/lib/mathRenderer'
import { contentText, safeContentImage, normalizeQuestionTargets } from '@/lib/questionContent'
import { sourceDiagramSvg } from '@/lib/questionDiagrams'

// React elements, never source HTML. Legacy **targets** display as underline;
// new imports use <u>, leaving <strong> available for genuine bold emphasis.
export function ContentText({ text, className = '' }) {
  const parts = contentText(text).replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, (mark, value) => value.trim() === value ? `<em>${value}</em>` : mark).split(/(<\/?(?:u|strong|em|sup|sub)>|\*\*)/g)
  const root = []; const stack = [{ tag: null, children: root }]
  for (const part of parts) {
    if (!part) continue
    const tag = part === '**' ? 'u' : part.match(/^<(u|strong|em|sup|sub)>$/)?.[1]
    const close = part.match(/^<\/(u|strong|em|sup|sub)>$/)?.[1]
    if ((part === '**' && stack.at(-1).tag === 'u') || close === stack.at(-1).tag && close) {
      const node = stack.pop(); const Tag = node.tag
      stack.at(-1).children.push(<Tag key={stack.at(-1).children.length}>{node.children}</Tag>)
    } else if (tag) stack.push({ tag, children: [] })
    else stack.at(-1).children.push(<MathText key={stack.at(-1).children.length} text={part} as="span" />)
  }
  while (stack.length > 1) { const node = stack.pop(); root.push(...node.children) }
  return <span className={className} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontWeight: 400 }}>{root}</span>
}

export default function QuestionContent({ question }) {
  const layout = questionReadingLayout({ ...question, question_text: normalizeQuestionTargets(question.question_text ?? question.question, question.instruction_text) })
  const image = safeContentImage(question.passage_image_url)
  const hasReading = !!(layout.passage_text || image)
  const sourceSvg = sourceDiagramSvg(question)
  return <div className={s.content}>
    {layout.instruction_text && <div className={s.instruction}><ContentText text={layout.instruction_text} /></div>}
    {hasReading && <section aria-label="Passage or extract" className={s.reading}>
      <p className={s.label}>Passage / extract</p>
      {image && <a href={image} target="_blank" rel="noreferrer"><img src={image} alt="Source passage — open full image" className={s.image} /></a>}
      {layout.passage_text && <div className={s.passage}><ContentText text={layout.passage_text} /></div>}
    </section>}
    <div className={`${s.stem} ${hasReading ? s.afterReading : ''}`}>
      {hasReading && <p className={s.questionLabel}>Question</p>}
      <ContentText text={layout.question_text} />
      {sourceSvg && <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sourceSvg)}`} alt="Source question diagram" className={s.image} />}
    </div>
  </div>
}

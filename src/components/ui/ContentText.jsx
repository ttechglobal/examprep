'use client'

import { contentText } from '@/lib/questionContent'
import { MathText } from '@/lib/mathRenderer'

// Render source annotations as React elements. Math stays intact for KaTeX;
// provider HTML is never inserted. Question **targets** use underlining while
// explanation **terms** use bold.
export default function ContentText({ text, className = '', emphasis = 'underline' }) {
  const parts = contentText(text).split(/(\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\n])+\$|<\/?(?:u|strong|em|sup|sub)>|\*\*[^*\n]+\*\*|(?<![\w*])\*[^*\s\n](?:[^*\n]*[^*\s\n])?\*(?![\w*]))/g)
  const root = []
  const stack = [{ tag: null, children: root }]
  for (const part of parts) {
    if (!part) continue
    const open = part.match(/^<(u|strong|em|sup|sub)>$/)?.[1]
    const close = part.match(/^<\/(u|strong|em|sup|sub)>$/)?.[1]
    const current = () => stack.at(-1).children
    if (open) stack.push({ tag: open, children: [] })
    else if (close && stack.length > 1 && stack.at(-1).tag === close) {
      const node = stack.pop(); const Tag = node.tag
      current().push(<Tag key={current().length}>{node.children}</Tag>)
    } else if (close) continue
    else if (part.startsWith('**') && part.endsWith('**')) {
      const Tag = emphasis === 'bold' ? 'strong' : 'u'
      current().push(<Tag key={current().length}><ContentText text={part.slice(2, -2)} emphasis={emphasis} /></Tag>)
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      current().push(<em key={current().length}><ContentText text={part.slice(1, -1)} emphasis={emphasis} /></em>)
    } else current().push(<MathText key={current().length} text={part} as="span" />)
  }
  while (stack.length > 1) { const node = stack.pop(); stack.at(-1).children.push(...node.children) }
  return <span className={className} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{root}</span>
}

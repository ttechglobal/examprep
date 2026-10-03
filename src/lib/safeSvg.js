// src/lib/safeSvg.js
// Question-bank SVG diagrams are inserted as HTML. Keep only inline SVG and
// strip what can run code: <script>, <foreignObject> (embeds HTML), on*
// handlers and javascript: links. Returns null for anything that isn't SVG.
export function safeSvg(svg) {
  const text = String(svg ?? '').trim()
  if (!text.toLowerCase().startsWith('<svg')) return null
  return text
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href\s*=\s*)("|')\s*javascript:[^"']*\2/gi, '$1$2#$2')
}

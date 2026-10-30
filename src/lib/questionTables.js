// Presentation only: retain source strings, order, signs, currencies and units.
// Never calculate, round, sort, infer a currency or recover missing cells.
export function questionTableBlocks(value) {
  const text = String(value ?? '')
  const lines = text.split('\n')
  const blocks = []
  let plain = []
  const flush = () => { if (plain.length) blocks.push({ type: 'text', text: plain.join('\n') }); plain = [] }
  const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
      const headers = cells(lines[i])
      const separator = lines[i + 1] && cells(lines[i + 1])
      if (headers.length >= 2 && separator?.length === headers.length && separator.every(cell => /^:?-{3,}:?$/.test(cell))) {
        const rows = []
        let end = i + 2
        while (end < lines.length && lines[end].trim().startsWith('|') && lines[end].trim().endsWith('|')) { rows.push(cells(lines[end++])); }
        if (rows.length && rows.every(row => row.length === headers.length)) {
          flush(); blocks.push({ type: 'table', headers, rows }); i = end - 1; continue
        }
      }
    }
    plain.push(lines[i])
  }
  flush()
  return blocks.flatMap(block => block.type === 'text' ? scheduleBlocks(block.text) : [block])
}

function scheduleBlocks(text) {
  // Only a run of at least two explicit "label: numeric value" records.
  // More complex ledgers and multiple period/partner columns need explicit tables.
  const amount = /^(?:[₦$£€¥¢]|GH¢|Le|NGN|GHS|USD)?\s*[−+-]?\(?\d[\d,]*(?:\.\d+)?\)?(?:\s*(?:%|DR|CR|Dr|Cr|dr|cr|units|kg|tonnes|times))?$/
  const records = text.match(/[^;\n]+[;\n]?|[;\n]/g) ?? []
  const blocks = []
  let rows = [], plain = []
  const flushPlain = () => { if (plain.length) blocks.push({ type: 'text', text: plain.join('') }); plain = [] }
  const flushRows = () => {
    if (rows.length >= 2) { flushPlain(); blocks.push({ type: 'table', headers: ['Item', 'Value'], rows: rows.map(row => row.cells) }) }
    else plain.push(...rows.map(row => row.raw))
    rows = []
  }
  for (const record of records) {
    let source = record.trim().replace(/[;]$/, '').trim()
    const intro = source.match(/^Use the following (?:information|data|figures) to answer (?:this question|the (?:following )?questions?)[.:]\s*/i)
    if (intro) { flushRows(); plain.push(intro[0].trim()); source = source.slice(intro[0].length) }
    const tail = source.match(/\.\s+(?=(?:What|Which|Calculate|Determine|Find|How)\b)[\s\S]*$/)
    const candidate = tail ? source.slice(0, tail.index) : source.replace(/\.$/, '')
    const pair = candidate.match(/^([^:\n]+):\s*(.+)$/)
    if (pair && amount.test(pair[2]) && !/[<>|$]/.test(pair[1])) {
      rows.push({ cells: [pair[1].trim(), pair[2].trim()], raw: record })
      if (tail) { flushRows(); plain.push(tail[0].replace(/^\.\s*/, '')) }
    } else { flushRows(); plain.push(record) }
  }
  flushRows(); flushPlain()
  // Leave non-schedules byte-for-byte intact, including semicolons and verse.
  return blocks.some(block => block.type === 'table') ? blocks : [{ type: 'text', text }]
}

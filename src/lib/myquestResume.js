import { normalizeQuestionContent } from './questionContent.js'

export const MYQUEST_RESUME_KEY = 'examprep.myquest.resume.v1'

export function readResumeJson(text) {
  return JSON.parse(String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
}

export function createResumeBatch(questions, scope, prompt = '', response = '') {
  return { kind: 'myquest-resume', version: 1, scope, questions, prompt, response, savedAt: new Date().toISOString() }
}

// Only recognize the exact labelled source section produced by our importer.
// Never reconstruct full questions from an enrichment snippet.
export function questionsFromImportPrompt(text) {
  const normalized = String(text).replace(/\r\n?/g, '\n')
  const section = normalized.match(/(?:^|\n)QUESTIONS\n═+\n+([\s\S]*?)\n+═+\nEXPLANATION STRUCTURE(?:\n|$)/)?.[1]
  if (!section) throw new Error('This prompt does not contain a recognized complete QUESTIONS section. Paste the original import prompt or a saved batch JSON.')
  const blocks = section.split(/\n\n(?=SOURCE_ID: )/)
  const questions = blocks.map((block, index) => {
    const match = block.match(/^SOURCE_ID: ([^\n]+)\nInstruction: ([\s\S]*?)\nPassage \/ extract \(preserve every line\):\n([\s\S]*?)\nPassage image: ([^\n]+)\nContent review issues: [^\n]*\nQ(\d+)\. ([\s\S]+)$/)
    if (!match || Number(match[5]) !== index + 1) throw new Error(`Cannot safely recover source question ${index + 1}. Use the unchanged original prompt or saved batch JSON.`)
    const body = match[6]
    const markers = [...body.matchAll(/^   ([A-E])\. /gm)]
    if (markers.length < 2 || markers[0][1] !== 'A' || new Set(markers.map(m => m[1])).size !== markers.length) throw new Error(`Question ${index + 1}: complete labelled source options were not found.`)
    const options = Object.fromEntries(markers.map((marker, i) => [marker[1], body.slice(marker.index + marker[0].length, markers[i + 1]?.index ?? body.length).trim()]))
    const supplied = value => value === '(none supplied)' ? null : value
    return { id: match[1], question: body.slice(0, markers[0].index).trim(), instruction_text: supplied(match[2]), section: supplied(match[3]), passage_image_url: supplied(match[4]), options }
  })
  const expected = normalized.match(/(?:^|\n)(\d+) questions follow\. Process ALL of them\./)?.[1]
  if (expected && Number(expected) !== questions.length) throw new Error('The prompt is incomplete: its question count does not match the recovered source questions.')
  return questions
}

export function restoreImportBatch(sourceText, responseText, scope) {
  if (!scope?.subjectId || !scope.examType || !/^\d{4}$/.test(String(scope.year ?? ''))) throw new Error('Choose the destination subject and enter the original four-digit exam year.')
  let questions, savedScope, prompt = '', response = responseText
  if (sourceText.trim()) {
    if (/^[{[]|^```/.test(sourceText.trim())) {
      const data = readResumeJson(sourceText)
      if (Array.isArray(data)) questions = data
      else {
        if (data.kind !== 'myquest-resume' || data.version !== 1) throw new Error('Unsupported saved batch format. Use an exported MyQuest batch or a source question array.')
        questions = data.questions
        savedScope = data.scope
        prompt = data.prompt ?? ''
        response = responseText.trim() ? responseText : data.response ?? ''
      }
    } else {
      questions = questionsFromImportPrompt(sourceText)
      prompt = sourceText
    }
  } else {
    let entries
    try { entries = readResumeJson(responseText) } catch { throw new Error('Paste the original prompt or saved batch alongside this response. An explanation or snippet cannot replace the full question and options.') }
    if (!Array.isArray(entries) || !entries.length || entries.some(q => !(q.question_text ?? q.question) || Object.keys(q.options ?? q.option ?? {}).length < 2)) throw new Error('This response contains enrichment only. Paste the original prompt or saved batch too; the full questions and options are required. No MyQuest fetch is needed.')
    questions = entries.map((q, i) => ({ ...q, id: q.source_id ?? q.id ?? `index_${i + 1}`, answer: '', correct_answer: '' }))
    response = JSON.stringify(entries.map((q, i) => ({ ...q, source_id: String(q.source_id ?? q.id ?? `index_${i + 1}`), question_snippet: q.question_snippet ?? normalizeQuestionContent(q).question.split(/\s+/).slice(0, 15).join(' '), verified_answer: q.verified_answer ?? q.correct_answer ?? q.answer, context_status: q.context_status ?? 'complete' })))
  }
  if (savedScope && ['subjectId', 'examType', 'year'].some(key => String(savedScope[key]) !== String(scope[key]))) throw new Error('The saved batch belongs to a different subject, exam or year. Select its original destination before restoring.')
  if (!Array.isArray(questions) || !questions.length || questions.length > 500) throw new Error('A saved batch must contain between 1 and 500 complete source questions.')
  const ids = new Set()
  questions = questions.map((raw, i) => {
    const q = normalizeQuestionContent(raw)
    const id = String(q.id ?? q.source_id ?? `index_${i + 1}`)
    if (!q.question || Object.keys(q.option).length < 2 || ids.has(id)) throw new Error(`Source question ${i + 1} has missing text/options or a duplicate source ID.`)
    ids.add(id)
    if ((q.exam_type ?? q.exam) && (q.exam_type ?? q.exam) !== scope.examType) throw new Error(`Source question ${i + 1} belongs to a different exam.`)
    const sourceYear = q.examyear ?? q.year
    if (sourceYear && String(sourceYear) !== String(scope.year)) throw new Error(`Source question ${i + 1} belongs to a different year.`)
    return { ...q, id, examyear: String(scope.year) }
  })
  return { questions, prompt, response, providerAnswerUnavailable: !savedScope && questions.every(q => !q.answer) }
}

'use client'

import { useRef } from 'react'
import { normalizeQuestionContent } from '@/lib/questionContent'
import QuestionReviewPreview from './QuestionReviewPreview'

export function SourceField({ label, value = '', onChange, rows = 3 }) {
  const input = useRef(null)
  function mark(tag) {
    const { selectionStart: start, selectionEnd: end } = input.current
    if (start === end) { input.current.focus(); return }
    onChange(value.slice(0, start) + `<${tag}>` + value.slice(start, end) + `</${tag}>` + value.slice(end))
    input.current.focus()
  }
  return <div className="mt-4">
    <label className="block text-sm font-semibold text-gray-700">{label}
      <textarea ref={input} value={value} onChange={e => onChange(e.target.value)} rows={rows} className="mt-2 block w-full rounded-xl border border-gray-300 p-3 text-sm leading-7 focus:ring-2 focus:ring-indigo-400" />
    </label>
    <div className="mt-2 flex flex-wrap gap-2" aria-label={`${label} formatting`}>
      {[['u', 'Underline'], ['strong', 'Bold'], ['em', 'Italic']].map(([tag, title]) => <button key={tag} type="button" onMouseDown={e => e.preventDefault()} onClick={() => mark(tag)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-600">{title} selection</button>)}
      <span className="self-center text-xs text-gray-500">Select the exact source word or letters first.</span>
    </div>
  </div>
}

export default function ImportContentReview({ source, question }) {
  const original = normalizeQuestionContent(source)
  return <div className="grid gap-4 xl:grid-cols-2">
    <section aria-label="Source question" className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">MyQuest source</h3>
      <QuestionReviewPreview question={original} answerLabel="Provider answer (reference)" />
      <details className="mt-4 text-xs text-gray-500"><summary className="cursor-pointer">Inspect source fields</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(source, null, 2)}</pre></details>
    </section>
    <section aria-label="Import content preview" className="min-w-0 rounded-xl border border-indigo-200 bg-white p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-600">Proposed question</h3>
      <QuestionReviewPreview question={question} />
    </section>
  </div>
}

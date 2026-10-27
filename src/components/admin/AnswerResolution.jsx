'use client'
import { useState } from 'react'
import { resolveReviewedAnswer } from '@/lib/questionReview'

export default function AnswerResolution({ question, onChange, providerExplanation = '' }) {
  const [key, setKey] = useState(question.sdash_answer || question.correct_answer || '')
  const [explanation, setExplanation] = useState(providerExplanation)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const options = question.options ?? {}
  return <div className="space-y-3 border rounded-xl p-3 bg-amber-50">
    <p className="text-sm font-bold">Choose the reviewed answer and replace its explanation</p>
    <p className="text-xs">Literature questions may rely on prescribed texts. You can use the provider key after checking the text. Supply a matching explanation; applying this decision replaces the previous reasoning and distractor notes.</p>
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).filter(([, text]) => text).map(([letter, text]) => <button type="button" key={letter} onClick={() => setKey(letter.toUpperCase())} className={`border rounded px-3 py-2 text-xs ${key === letter.toUpperCase() ? 'bg-indigo-600 text-white' : 'bg-white'}`}>{letter.toUpperCase()}. {text}{letter.toUpperCase() === question.sdash_answer ? ' (provider)' : ''}</button>)}
    </div>
    <button type="button" className="text-xs font-semibold text-indigo-700" onClick={async () => {
      await navigator.clipboard.writeText(`Review this ${question.exam ?? ''} ${question.subject ?? ''} question against its original literary source. The reviewer selected ${key}: ${options[key] ?? ''} (provider key: ${question.sdash_answer ?? 'none'}). Independently check this choice. If supported, return only a replacement student-friendly explanation for that option, including relevant textual evidence. If unsupported or essential quoted lines are missing, explain the problem instead; do not invent quotations or rationalise the key. A short extract is sufficient; the whole work is not required.\nInstruction: ${question.instruction_text ?? ''}\nExtract: ${question.passage_text ?? ''}\nQuestion: ${question.question_text}\nOptions: ${JSON.stringify(options)}`)
      setCopied(true)
    }}>{copied ? 'Copied — paste the returned explanation below after checking it' : 'Copy prompt to regenerate the explanation for this answer'}</button>
    <label className="block text-xs font-semibold">Explanation for {key}
      <textarea className="block w-full border rounded p-2 mt-1 font-normal" rows={5} value={explanation} onChange={event => setExplanation(event.target.value)} placeholder="Explain why the selected option is correct, with the relevant literary evidence." />
    </label>
    <label className="block text-xs font-semibold">Source / review note
      <input className="block w-full border rounded p-2 mt-1 font-normal" value={note} onChange={event => setNote(event.target.value)} placeholder="Text, scene, page or source used to check this answer" />
    </label>
    <button type="button" disabled={!options[key] || !explanation.trim() || !note.trim()} onClick={() => onChange(resolveReviewedAnswer(question, key, explanation, note))} className="rounded bg-indigo-600 text-white px-3 py-2 text-xs font-bold disabled:opacity-40">Apply answer and matching explanation</button>
    <p className="text-xs">Missing extracts, unknown underline targets and source-matching failures still require repair.</p>
  </div>
}

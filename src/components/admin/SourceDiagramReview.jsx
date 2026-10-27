'use client'

import { useState } from 'react'
import { buildSourceDiagramPrompt, questionDiagram, questionDiagramMetadata, sourceDiagramSvg, sourceDiagramSignature } from '@/lib/questionDiagrams'
import { safeContentImage } from '@/lib/questionContent'

export default function SourceDiagramReview({ question, subject, onSave }) {
  const initial = questionDiagram(question)
  const [description, setDescription] = useState(initial.description)
  const [image, setImage] = useState(initial.image_url ?? '')
  const [svg, setSvg] = useState(initial.svg ?? '')
  const [reviewed, setReviewed] = useState(initial.ready)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const draft = { ...question, has_image: true, image_description: description, image_url: image, image,
    explanation: { ...(question.explanation ?? {}), question_diagram: { ...(question.explanation?.question_diagram ?? {}), required: true, description, image_url: image, svg, reviewed } } }
  draft.explanation.question_diagram.signature = reviewed ? sourceDiagramSignature(draft) : null
  const state = questionDiagram(draft)
  const safe = sourceDiagramSvg(draft)
  return <section className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-gray-900" aria-label="Source question diagram review">
    <h3 className="font-bold">Source question diagram · {state.ready ? 'Checked' : 'Held for diagram review'}</h3>
    <p className="text-xs leading-6">{state.reason} This diagram belongs with the question. A solution illustration is separate.</p>
    <p className="text-xs">Question ID: {question.id ?? question.sdash_id ?? 'Not supplied'} · {subject || question.subject || question.subjects?.name || 'Subject in current group'} · {question.year ?? question.examyear ?? ''}</p>
    <label className="block font-semibold">Source diagram description<textarea value={description} onChange={event => { setDescription(event.target.value); setReviewed(false) }} rows={4} className="mt-1 w-full rounded-lg border bg-white p-3 font-normal" placeholder="Preserve all given labels, values, directions and relationships. Add the original image if details are missing." /></label>
    <details><summary className="cursor-pointer font-semibold">Recreation prompt</summary><textarea readOnly value={buildSourceDiagramPrompt(draft, subject)} rows={8} className="mt-2 w-full rounded-lg border bg-white p-3 text-xs" /></details>
    <button type="button" className="rounded-lg border border-amber-400 bg-white px-3 py-2 font-semibold" onClick={async () => {
      try { await navigator.clipboard.writeText(buildSourceDiagramPrompt(draft, subject)); setMessage('Source diagram prompt copied.') } catch { setMessage('Clipboard unavailable. Select and copy the prompt above.') }
    }}>Copy source diagram prompt</button>
    <label className="block font-semibold">Original or reviewed diagram image URL<input type="url" value={image} onChange={event => { setImage(event.target.value); setReviewed(false) }} className="mt-1 w-full rounded-lg border bg-white p-2 font-normal" /></label>
    {state.image_url && <a href={state.image_url} target="_blank" rel="noreferrer" className="block underline">Open source image for checking</a>}
    {state.references.map((ref, index) => <a key={index} href={ref.url} target="_blank" rel="noreferrer" className="block underline">Inspect {ref.field} image {ref.alt && `— ${ref.alt}`}</a>)}
    <label className="block font-semibold">Paste source diagram SVG<textarea value={svg} onChange={event => { setSvg(event.target.value); setReviewed(false) }} rows={5} className="mt-1 w-full rounded-lg border bg-white p-3 font-mono text-xs font-normal" placeholder="<svg …>…</svg>" /></label>
    {safe && <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(safe)}`} alt="Source question diagram preview — verify labels and values" className="max-h-96 max-w-full rounded-lg bg-white" />}
    <label className="flex items-start gap-2"><input type="checkbox" checked={reviewed} disabled={!safe && !state.image_url} onChange={event => setReviewed(event.target.checked)} className="mt-1" /><span>I checked the source, labels, measurements and readability. This diagram contains no solution clues.</span></label>
    <button type="button" disabled={busy} className="rounded-lg bg-amber-800 px-4 py-2 font-semibold text-white disabled:opacity-40" onClick={async () => {
      setBusy(true); setMessage('')
      try {
        if (svg.trim() && !safe) throw new Error('Paste complete SVG code ending with </svg>, or use a valid image URL.')
        if (image.trim() && !safeContentImage(image)) throw new Error('Use an http or https image URL.')
        await onSave({ ...draft, explanation: { ...draft.explanation, question_diagram: questionDiagramMetadata(draft) } })
        setMessage(state.ready ? 'Diagram saved and checked. Review the answer and explanation before publishing.' : 'Diagram work saved. The question remains held for review.')
      } catch (error) { setMessage(error.message) } finally { setBusy(false) }
    }}>{busy ? 'Saving…' : 'Save diagram work'}</button>
    {message && <p role="status" className="text-xs leading-6">{message}</p>}
  </section>
}

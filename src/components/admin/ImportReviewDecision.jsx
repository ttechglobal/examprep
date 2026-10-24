"use client"

import { useState } from 'react'
import { allReviewIssues, reviewIssues, acceptedReviewIssues, canAcceptReviewIssue, reviewSignature } from '@/lib/questionReview'

export default function ImportReviewDecision({ question, onChange }) {
  const [note, setNote] = useState('')
  const pending = reviewIssues(question)
  const accepted = acceptedReviewIssues(question)
  const acceptable = pending.filter(issue => canAcceptReviewIssue(issue, question))
  if (!pending.length && !accepted.length) return null
  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 space-y-3">
    <strong>{pending.length ? `${pending.length} checks need your review` : 'Accepted after administrator review'}</strong>
    {pending.length > 0 && <ul className="list-disc pl-5 space-y-2">{pending.map(issue => <li key={issue}>{issue}<span className="block text-xs text-amber-800">{canAcceptReviewIssue(issue, question) ? 'Check the source; you may accept this warning with a reason.' : 'Correct the source or regenerate enrichment, or save as a draft.'}</span></li>)}</ul>}
    {question._matching?.reason && <div className="rounded-lg bg-white p-3 text-xs space-y-2 break-words">
      <p><strong>Source ID:</strong> {question._matching.sourceId} · <strong>Response ID:</strong> {question._matching.responseId ?? 'Not supplied'}</p>
      <p><strong>Original opening:</strong> {question._matching.sourceSnippet}</p>
      <p><strong>Returned snippet:</strong> {question._matching.responseSnippet || 'No uniquely matched response'}</p>
    </div>}
    {accepted.length > 0 && <div className="text-green-800"><p>Accepted: {accepted.join(' ')}</p><p>Reason: {question._reviewDecision?.note ?? question.explanation?.content_review?.note}</p><button type="button" className="underline mt-1" onClick={() => onChange({ ...question, _reviewDecision: { note: '', issues: [] } })}>Reopen review</button></div>}
    {acceptable.length > 0 && <>
      <label className="block font-semibold">Review decision / source checked<textarea value={note} onChange={event => setNote(event.target.value)} rows={2} className="block mt-1 w-full rounded-lg border border-amber-300 bg-white p-2 font-normal" placeholder="Explain why the flagged content and chosen answer are correct." /></label>
      <button type="button" disabled={!note.trim()} className="rounded-lg bg-[#062A78] px-4 py-2 font-semibold text-white disabled:opacity-40" onClick={() => onChange({ ...question, _reviewDecision: { note: note.trim(), issues: allReviewIssues(question).filter(issue => canAcceptReviewIssue(issue, question)), signature: reviewSignature(question) } })}>Accept {acceptable.length} warning{acceptable.length === 1 ? '' : 's'} after review</button>
    </>}
    <p className="text-xs">Accepting adds this question to the ready list. Publish when finished. Changes to the question, answer or explanation reopen the review.</p>
  </div>
}

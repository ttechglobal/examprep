'use client'

import QuestionContent, { ContentText } from './QuestionContent'
import { MathText } from '@/lib/mathRenderer'
import { safeContentImage } from '@/lib/questionContent'

function Answer({ label, answer, options }) {
  const key = String(answer ?? '').trim().toUpperCase()
  const match = Object.entries(options).find(([letter]) => letter.toUpperCase() === key)
  return <div className={`rounded-xl border p-3 ${match ? 'border-green-200 bg-green-50 text-green-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
    <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
    <p className="mt-1 text-sm">{match ? <><strong>{key} — </strong><ContentText text={match[1]} /></> : key ? `Key ${key} does not identify an available option.` : 'No answer supplied.'}</p>
  </div>
}

// Review mode always reveals the key and explanation; it is not a quiz attempt.
export default function QuestionReviewPreview({ question, showQuestion = true, answerLabel = 'Current answer key' }) {
  const options = question.options ?? question.option ?? {}
  const answer = String(question.correct_answer ?? question.answer ?? '').trim().toUpperCase()
  const explanation = question.explanation
  const detail = typeof explanation === 'object' && explanation ? explanation : {}
  const note = typeof explanation === 'string' ? explanation : detail.answer_note || detail.correct || question.correct_explanation
  const steps = detail.steps?.length ? detail.steps : detail.workings
  const wrong = detail.wrong_options ?? question.wrong_explanations ?? {}
  const image = safeContentImage(question.image_url ?? question.image)
  const missing = question._contextStatus === 'missing' || question.context_status === 'missing'
  return <div className="space-y-5 text-gray-900">
    {showQuestion && <section aria-label="Question content" className="rounded-xl border border-gray-200 bg-white p-4"><QuestionContent question={question} />
      {image && <a href={image} target="_blank" rel="noreferrer"><img src={image} alt="Question diagram — open full image" className="mt-4 max-h-96 max-w-full object-contain" /></a>}
    </section>}
    <section aria-label="Answer options" className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Answer options</h3>
      {!Object.keys(options).length && <p className="text-sm text-amber-800">No answer options supplied.</p>}
      {Object.entries(options).map(([key, value]) => <div key={key} className={`flex items-start gap-3 rounded-xl border p-3 text-sm leading-6 ${key.toUpperCase() === answer ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
        <span className="font-bold">{key.toUpperCase()}.</span><ContentText className="min-w-0 flex-1" text={value || '(Empty option)'} />
        {key.toUpperCase() === answer && <span className="text-xs font-semibold text-green-800">Current key</span>}
      </div>)}
    </section>
    <section aria-label="Answer key" className="space-y-2">
      <Answer label={answerLabel} answer={answer} options={options} />
      {question.sdash_answer != null && <Answer label="Provider answer (reference)" answer={question.sdash_answer} options={options} />}
      {missing && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Enrichment did not verify an answer because it reported missing context. A displayed provider key is a reference for review; regenerate enrichment after checking the source.</p>}
      {question._answerDisagreement && <p className="text-sm text-amber-900">The enrichment and provider keys disagree. Check the option text and explanation before choosing the answer.</p>}
    </section>
    <section aria-label="Explanation" className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-700">Explanation</h3>
      {detail.concept && <MathText text={detail.concept} as="p" className="font-semibold text-sm" />}
      {detail.intro && <MathText text={detail.intro} as="p" className="text-sm leading-7" />}
      {Array.isArray(steps) && steps.length > 0 && <ol className="list-decimal space-y-2 pl-5 text-sm">{steps.map((step, index) => <li key={index}><MathText text={typeof step === 'string' ? step : [step.title, ...(step.lines ?? []), step.explanation, step.content, step.math].filter(Boolean).join('\n') || JSON.stringify(step)} as="div" /></li>)}</ol>}
      {note ? <MathText text={note} as="div" className="text-sm leading-7" /> : <p className="text-sm text-gray-500">No answer explanation supplied.</p>}
      {Object.keys(wrong).length > 0 && <div className="space-y-2 border-t border-indigo-100 pt-3"><h4 className="text-xs font-bold text-gray-600">Option explanations</h4>{Object.entries(wrong).map(([key, reason]) => <div key={key} className="rounded-lg bg-white p-3 text-sm"><strong>{key.toUpperCase()}</strong><MathText text={reason} as="div" className="mt-1 leading-6" /></div>)}</div>}
      {detail.study_tip && <div className="border-t border-indigo-100 pt-3 text-sm"><strong>Study tip</strong><MathText text={detail.study_tip} as="p" className="mt-1 leading-6" /></div>}
    </section>
  </div>
}

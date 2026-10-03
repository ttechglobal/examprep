'use client'
// src/components/session/ExplanationBlock.jsx — v2
// ─────────────────────────────────────────────────────────────────────────────
// A question's explanation, in three forms:
//   ExplanationBlock    the explanation itself: result header, correct answer,
//                       working (intro, formula, diagram, steps), why the
//                       other options are wrong, study tip. Desktop panel,
//                       battle review, demo.
//   ExplanationSheet    full screen on phones, with ‹ › between questions
//                       (review) and "Got it".
//   ExplanationTrigger  the card under a question on phones that opens it.
// Styles: ./session.module.css; the block carries its own colour tokens, so
// it also renders outside SessionFrame (alwaysLight: stays light in dark mode,
// for the battle review). Artwork: ./art.js.
//
// Explanation data (from the question bank): { concept, intro, answer_note |
// correct, formula_box, variables_key[], svg_diagram, steps[{title, lines[]}],
// wrong_options { A: reason, … }, study_tip }
//
// v2: new design. The wrong options show each option's text with its reason;
//     the correct answer leads; one sheet for phones replaces the modal and
//     its preview card.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { MathText } from '@/lib/mathRenderer'
import { safeSvg } from '@/lib/safeSvg'
import LazyImage from '@/components/ui/LazyImage'
import { LETTERS, normaliseOptions, correctIndex } from './SessionUtils'
import { CORRECT_ANSWER_ART } from './art'
import { Check, Cross, Close, ChevronUp, ChevronLeft, ChevronRight, ArrowRight } from './icons'
import s from './session.module.css'

// **bold** and *italic* inside explanation text, one paragraph per line.
function RichText({ text }) {
  if (!text) return null
  return String(text).split(/\n+/).filter(Boolean).map((para, pi) => (
    <span key={pi}>
      {pi > 0 && <br />}
      {para.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) =>
        part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong>
          : part.startsWith('*') && part.length > 2 ? <em key={i}>{part.slice(1, -1)}</em>
          : part)}
    </span>
  ))
}

// Some bank entries start each reason with its letter ("A — …") or the
// option's text; the row already shows both.
const LETTER_PREFIX = /^\s*[A-E]\s*[—–-]\s*/


// ── The explanation ──────────────────────────────────────────────────────────
export function ExplanationBlock({ question, explanation = question?.explanation, isCorrect, selectedKey, onClose, headerless = false, alwaysLight = false }) {
  const [wrongOpen, setWrongOpen] = useState(true)
  if (!explanation) return null

  const options  = normaliseOptions(question?.options)
  const right    = correctIndex(options, question?.correct_answer)
  const note     = explanation.answer_note ?? explanation.correct ?? ''
  const wrong    = Object.entries(explanation.wrong_options ?? {})
    .sort(([a], [b]) => (a === selectedKey ? -1 : b === selectedKey ? 1 : a.localeCompare(b)))
  const steps    = (Array.isArray(explanation.steps) ? explanation.steps : [])
    .filter(st => st && (st.title || st.lines?.length))
  const vars     = (explanation.variables_key ?? []).filter(Boolean)
  const svg      = safeSvg(explanation.svg_diagram)

  return (
    <div className={`${s.tokens} ${s.exp} ${alwaysLight ? s.light : ''}`}>
      {!headerless && (
        <div className={s.expHead}>
          <span className={s.expIcon} data-ok={isCorrect || undefined} aria-hidden="true">
            {isCorrect ? <Check size={28} width={3} /> : <Cross size={28} width={3} />}
          </span>
          <div className={s.expTitle}>
            <strong>Explanation</strong>
            <span>{explanation.concept || (isCorrect ? 'You got this one right' : 'Here’s how to get it right')}</span>
          </div>
          {onClose && <button type="button" className={s.expClose} onClick={onClose} aria-label="Close explanation"><Close /></button>}
        </div>
      )}

      {(right >= 0 || note) && (
        <section className={s.answer} aria-label="Correct answer">
          <LazyImage src={CORRECT_ANSWER_ART} className={s.answerArt} />
          <span className={s.answerPill}>Correct Answer</span>
          {right >= 0 && (
            <div className={s.answerRow}>
              <span className={s.answerLetter}>{LETTERS[right]}</span>
              <span className={s.answerText}><MathText text={String(options[right] ?? '')} as="span" /></span>
            </div>
          )}
          {note && <p className={s.answerNote}><RichText text={note} /></p>}
        </section>
      )}

      {explanation.intro && <p className={s.intro}><RichText text={explanation.intro} /></p>}

      {explanation.formula_box?.trim() && (
        <section className={s.formula} aria-label="Formula">
          <div className={s.formulaHead}>Formula</div>
          <div className={s.formulaBody}><MathText text={explanation.formula_box} as="div" /></div>
          {vars.length > 0 && (
            <ul className={s.formulaVars}>{vars.map((v, i) => <li key={i}><MathText text={v} as="span" /></li>)}</ul>
          )}
        </section>
      )}

      {svg && <div className={s.diagram} dangerouslySetInnerHTML={{ __html: svg }} />}

      {steps.length > 0 && (
        <ol className={s.steps} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {steps.map((step, i) => (
            <li key={i} className={s.step}>
              <span className={s.stepNum}>Step {i + 1}</span>
              <div style={{ minWidth: 0 }}>
                {step.title && <p className={s.stepTitle}>{step.title}</p>}
                {(step.lines ?? []).map((line, li) => {
                  // Lines written as bare LaTeX get math delimiters.
                  const text = typeof line === 'string' && line.includes('\\') && !line.includes('$') ? `$${line.trim()}$` : line
                  return <div key={li} className={s.stepLine}><MathText text={String(text ?? '')} as="span" /></div>
                })}
              </div>
            </li>
          ))}
        </ol>
      )}

      {wrong.length > 0 && (
        <section className={s.wrong}>
          <button type="button" className={s.wrongHead} aria-expanded={wrongOpen} onClick={() => setWrongOpen(o => !o)}>
            <span className={s.qBadge} aria-hidden="true">?</span>
            Why the other options are wrong
            <ChevronUp />
          </button>
          {wrongOpen && (
            <div className={s.wrongList}>
              {wrong.map(([key, raw]) => {
                const text   = options[LETTERS.indexOf(key)]
                const mine   = key === selectedKey
                const reason = String(raw ?? '').replace(LETTER_PREFIX, '')
                // Reasons that already open with the option don't repeat it.
                const lead   = text != null && !reason.replace(/\*/g, '').startsWith(String(text))
                return (
                  <div key={key} className={s.wrongRow} data-mine={mine || undefined}>
                    <span className={s.wrongLetter}>{key}</span>
                    <div style={{ minWidth: 0 }}>
                      {mine && <span className={s.mine}>Your answer</span>}
                      {lead && <><b><MathText text={String(text)} as="span" /></b> — </>}
                      <RichText text={reason} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {explanation.study_tip && (
        <section className={s.tip}>
          <span className={s.tipBulb} aria-hidden="true">💡</span>
          <div><strong>Study tip</strong><RichText text={explanation.study_tip} /></div>
        </section>
      )}
    </div>
  )
}

// ── Phones: full screen ──────────────────────────────────────────────────────
// position: { current, total } for the title; onPrev / onNext (review) move
// between questions, null hides that arrow.
export function ExplanationSheet({ question, isCorrect, selectedKey, position, onPrev, onNext, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={s.expSheet} role="dialog" aria-modal="true" aria-label="Explanation">
      <div className={s.expSheetBar}>
        <button type="button" className={s.navArrow} onClick={onClose} aria-label="Back to the question"><ChevronLeft /></button>
        <strong>Explanation{position && <small>{position.current + 1} of {position.total}</small>}</strong>
        {onPrev !== undefined || onNext !== undefined ? (
          <span style={{ display: 'flex' }}>
            <button type="button" className={s.navArrow} onClick={onPrev} disabled={!onPrev} aria-label="Previous question"><ChevronLeft /></button>
            <button type="button" className={s.navArrow} onClick={onNext} disabled={!onNext} aria-label="Next question"><ChevronRight /></button>
          </span>
        ) : <span />}
      </div>
      <div className={s.expSheetBody}>
        <ExplanationBlock question={question} isCorrect={isCorrect} selectedKey={selectedKey} headerless />
      </div>
      <div className={s.expSheetFoot}>
        <button type="button" className={`${s.next} ${s.gotIt}`} onClick={onClose}>Got it</button>
      </div>
    </div>
  )
}

export function ExplanationTrigger({ question, isCorrect, onOpen }) {
  if (!question?.explanation) return null
  return (
    <button type="button" className={s.expTrigger} onClick={onOpen}>
      <span className={s.expIcon} data-ok={isCorrect || undefined} style={{ width: 40, height: 40, borderRadius: 12 }} aria-hidden="true">
        {isCorrect ? <Check size={20} width={3} /> : <Cross size={20} width={3} />}
      </span>
      <span>
        <strong>See the explanation</strong>
        <span>{question.explanation.concept || 'Why this is the answer'}</span>
      </span>
      <ArrowRight />
    </button>
  )
}

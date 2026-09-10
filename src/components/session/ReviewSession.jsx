'use client'
// src/components/session/ReviewSession.jsx
// Question-by-question review after a session completes.
//
// MOBILE (< 1024px):
//   - Full-screen fixed container, matches practice session page exactly
//   - Scrollable centre: question number grid → white card wrapping QuestionCard
//     → explanation trigger card (opens bottom-sheet modal)
//   - Fixed bottom bar: Prev / Next
//
// DESKTOP (≥ 1024px):
//   - Left column: question card (scrollable)
//   - Right column: full inline explanation (scrollable)
//   - Bottom bar: question nav grid + Prev/Next
//
// Props:
//   questions — array of question objects
//   answers   — array of { selectedIdx, isCorrect } indexed by question position
//   onDone    — called when the student finishes reviewing (→ back to results)
//   dark      — boolean

import { useState, useEffect, useRef } from 'react'
import { BLUE, CYAN, GREEN, RED, LETTERS, pct } from './SessionUtils'
import { QuestionNav } from './SessionPrimitives'
import { ExplanationBlock } from './ExplanationBlock'
import { QuestionCard } from './QuestionCard'

export function ReviewSession({ questions, answers, onDone, dark }) {
  const [rIndex, setRIndex] = useState(0)

  function handleNext() {
    if (rIndex < questions.length - 1) setRIndex(i => i + 1)
    else onDone()
  }
  function handlePrev() { setRIndex(i => Math.max(0, i - 1)) }

  const q      = questions[rIndex]
  const a      = answers[rIndex]
  const isLast = rIndex >= questions.length - 1

  const navMap = {}
  for (let i = 0; i < questions.length; i++) {
    navMap[i] = { answered: true, correct: answers[i]?.isCorrect ?? false, skipped: !answers[i] }
  }

  const qColRef   = useRef(null)
  const expColRef = useRef(null)
  useEffect(() => {
    if (qColRef.current)   qColRef.current.scrollTop   = 0
    if (expColRef.current) expColRef.current.scrollTop = 0
  }, [rIndex])

  // Derive selected answer letter for wrong_options highlighting
  const selectedKey = (() => {
    if (!q || a?.selectedIdx == null) return null
    return LETTERS[a.selectedIdx] ?? null
  })()

  // Result colour tinting for the mobile card border
  const isCorrect  = a?.isCorrect ?? false
  const cardBorder = isCorrect ? `${GREEN}40` : `${RED}35`
  const cardGlow   = isCorrect ? `0 0 0 3px ${GREEN}15` : `0 0 0 3px ${RED}10`

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--bg-base)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`
        * { box-sizing: border-box }

        @media (min-width: 1024px) {
          .rev-body { flex-direction: row !important; }
          .rev-q-col {
            width: 560px !important; flex-shrink: 0 !important;
            overflow-y: auto !important; min-height: 0 !important;
            padding: 24px 32px 100px !important;
            border-right: 1px solid var(--border) !important;
          }
          .rev-exp-col {
            display: flex !important; flex: 1 !important;
            min-width: 0 !important; min-height: 0 !important;
            overflow-y: auto !important; flex-direction: column !important;
            padding: 24px 28px 100px !important;
          }
          /* Desktop: explanation lives in right col — hide the mobile trigger */
          .rev-q-col .inline-explanation { display: none !important; }
          /* Hide mobile-only elements */
          .rev-mobile-qnums  { display: none !important; }
          .rev-card-mobile   { display: none !important; }
          /* Show desktop card */
          .rev-card-desktop  { display: block !important; }
          /* Desktop bottom bar */
          .rev-bottom-desktop { display: block !important; }
          .rev-bottom-mobile  { display: none !important; }
        }

        @media (max-width: 1023px) {
          .rev-exp-col { display: none !important; }
          .rev-q-col {
            flex: 1 !important; min-height: 0 !important;
            overflow-y: auto !important;
            padding: 14px 14px 100px !important;
          }
          /* Mobile: hide QuestionCard's own inline nav buttons — bottom bar handles */
          .rev-q-col .qcard-nav { display: none !important; }
          /* Show mobile elements */
          .rev-mobile-qnums  { display: block !important; }
          .rev-card-mobile   { display: block !important; }
          /* Hide desktop card */
          .rev-card-desktop  { display: none !important; }
          /* Bottom bars */
          .rev-bottom-desktop { display: none !important; }
          .rev-bottom-mobile  { display: flex !important; }
        }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border)', padding:'0 16px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:52 }}>
          <button onClick={onDone}
            style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', color:'var(--text-tert)', fontSize:13, fontWeight:700, padding:0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Results
          </button>
          <div style={{ textAlign:'center', flex:1, padding:'0 10px' }}>
            <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)' }}>Review Answers</div>
            <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:1 }}>{questions.length} questions</div>
          </div>
          <span style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', fontVariantNumeric:'tabular-nums' }}>
            {rIndex+1}<span style={{ color:'var(--border-strong)' }}>/</span>{questions.length}
          </span>
        </div>
        <div style={{ height:4, background:'var(--bg-subtle)', overflow:'hidden', borderRadius:999 }}>
          <div style={{ height:'100%', width:`${pct(rIndex+1, questions.length)}%`, background:`linear-gradient(90deg,${BLUE},${CYAN})`, borderRadius:999, transition:'width .35s' }}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0 9px' }}>
          <span style={{ fontSize:11, fontWeight:800, padding:'2px 9px', borderRadius:999, background:`${BLUE}12`, color:BLUE }}>Review</span>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)' }}>{pct(rIndex+1, questions.length)}% reviewed</span>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="rev-body" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>

        {/* Question column */}
        <div className="rev-q-col" ref={qColRef} style={{ overflowY:'auto' }}>

          {/* MOBILE: question number grid above the card (same as session page) */}
          <div className="rev-mobile-qnums" style={{ marginBottom:14 }}>
            <QuestionNav
              total={questions.length}
              current={rIndex}
              answerMap={navMap}
              onJump={setRIndex}
              sessionType="study"
              inline={true}
            />
          </div>

          {/* MOBILE: white card wrapping the question (mirrors session page light card) */}
          {q && (
            <div className="rev-card-mobile" style={{
              borderRadius:18,
              background:'#fff',
              boxShadow:`0 2px 16px rgba(6,42,120,.08), ${cardGlow}`,
              border:`1.5px solid ${cardBorder}`,
              padding:'20px 16px',
            }}>
              <QuestionCard
                key={q.id + '-review-m-' + rIndex}
                question={q}
                qIndex={rIndex}
                total={questions.length}
                onNext={handleNext}
                onPrev={handlePrev}
                sessionType="study"
                dark={false}
                alreadyAnswered={a ?? { selectedIdx: null, isCorrect: false }}
                reviewMode={true}
                hideExplanation={true}
                hideHint={true}
                hideNav={false}
              />
            </div>
          )}

          {/* DESKTOP: plain card (no extra wrapper — column padding handles it) */}
          {q && (
            <div className="rev-card-desktop">
              <QuestionCard
                key={q.id + '-review-d-' + rIndex}
                question={q}
                qIndex={rIndex}
                total={questions.length}
                onNext={handleNext}
                onPrev={handlePrev}
                sessionType="study"
                dark={dark}
                alreadyAnswered={a ?? { selectedIdx: null, isCorrect: false }}
                reviewMode={true}
                hideExplanation={true}
                hideHint={true}
                hideNav={false}
              />
            </div>
          )}

          {/* Mobile explanation trigger (opens bottom-sheet modal) */}
          {q?.explanation && (
            <div className="inline-explanation">
              <ExplanationBlock
                explanation={q.explanation}
                isCorrect={a?.isCorrect}
                dark={false}
                mobileModal={true}
                selectedKey={selectedKey}
                question={q}
              />
            </div>
          )}
        </div>

        {/* DESKTOP explanation column */}
        <div className="rev-exp-col" ref={expColRef} style={{ display:'none' }}>
          {q?.explanation ? (
            <ExplanationBlock
              explanation={q.explanation}
              isCorrect={a?.isCorrect}
              dark={dark}
              selectedKey={selectedKey}
              question={q}
            />
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', padding:24, textAlign:'center' }}>
              <div style={{ fontSize:13, color:'var(--text-tert)' }}>No explanation available for this question.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE BOTTOM BAR (fixed to viewport bottom) ── */}
      {/* Exact same style as the session page bottom bar */}
      <div className="rev-bottom-mobile" style={{
        display:'none',
        borderTop:'1px solid var(--border)',
        background:'var(--bg-card)',
        padding:'10px 14px 12px',
        gap:10,
        flexShrink:0,
      }}>
        <button
          onClick={handlePrev}
          disabled={rIndex === 0}
          style={{ flex:1, padding:'13px', borderRadius:13, border:'1px solid var(--border)', cursor:rIndex===0?'default':'pointer', fontFamily:'inherit', fontWeight:700, fontSize:14, background:'transparent', color:rIndex===0?'var(--text-tert)':'var(--text-sec)', opacity:rIndex===0?.4:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Prev
        </button>
        <button
          onClick={handleNext}
          style={{ flex:2, padding:'13px', borderRadius:13, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', boxShadow:`0 4px 0 #0a3fa0`, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
          {isLast ? 'Back to Results' : 'Next →'}
          {!isLast && <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
      </div>

      {/* ── DESKTOP BOTTOM BAR — question nav + Prev/Next ── */}
      <div className="rev-bottom-desktop" style={{ display:'none', borderTop:'1px solid var(--border)', background:'var(--bg-card)', flexShrink:0 }}>
        <div style={{ padding:'8px 16px 0' }}>
          <QuestionNav total={questions.length} current={rIndex} answerMap={navMap} onJump={setRIndex} sessionType="study"/>
        </div>
        <div style={{ padding:'10px 20px 12px', display:'flex', gap:12 }}>
          <button onClick={handlePrev} disabled={rIndex === 0}
            style={{ flex:1, padding:'12px', borderRadius:13, border:'1px solid var(--border)', cursor:rIndex===0?'default':'pointer', fontFamily:'inherit', fontWeight:700, fontSize:13, background:'transparent', color:rIndex===0?'var(--text-tert)':'var(--text-sec)', opacity:rIndex===0?.4:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Prev
          </button>
          <button onClick={handleNext}
            style={{ flex:2, padding:'12px', borderRadius:13, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', boxShadow:`0 4px 0 #0a3fa0`, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            {isLast ? 'Back to Results' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
'use client'
// src/components/session/ReviewSession.jsx
// Question-by-question review after a session completes.
// Desktop: question on left, explanation on right, both scroll independently.
// Mobile: single column, question + inline explanation, QuestionNav at bottom.
//
// Props:
//   questions — array of question objects
//   answers   — array of { selectedIdx, isCorrect } indexed by question position
//   onDone    — called when the student finishes reviewing (→ back to results)
//   dark      — boolean

import { useState, useEffect, useRef } from 'react'
import { BLUE, CYAN, pct } from './SessionUtils'
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

  // Scroll both columns back to top whenever the question changes
  const qColRef   = useRef(null)
  const expColRef = useRef(null)
  useEffect(() => {
    if (qColRef.current)   qColRef.current.scrollTop   = 0
    if (expColRef.current) expColRef.current.scrollTop = 0
  }, [rIndex])

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--bg-base)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`
        * { box-sizing: border-box }
        @media (min-width: 1024px) {
          .rev-body { flex-direction: row !important; }
          .rev-q-col {
            width: 460px !important; flex-shrink: 0 !important;
            overflow-y: auto !important; min-height: 0 !important;
            padding: 24px 28px 100px 28px !important;
            border-right: 1px solid var(--border) !important;
          }
          .rev-exp-col {
            display: flex !important; flex: 1 !important;
            min-width: 0 !important; min-height: 0 !important;
            overflow-y: auto !important; flex-direction: column !important;
            padding: 24px 28px 100px 28px !important;
          }
          .rev-q-col .inline-explanation { display: none !important; }
          .rev-mobile-nav { display: none !important; }
        }
        @media (max-width: 1023px) {
          .rev-exp-col { display: none !important; }
          .rev-q-col { flex: 1 !important; min-height: 0 !important; overflow-y: auto !important; padding: 20px 16px 80px !important; }
          .rev-mobile-nav { display: none !important; }
        }
      `}</style>

      {/* ── TOP BAR (fixed) ── */}
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

      {/* ── SCROLLABLE BODY ── */}
      <div className="rev-body" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>

        {/* Question column */}
        <div className="rev-q-col" ref={qColRef} style={{ overflowY:'auto', padding:'20px 16px' }}>
          {q && (
            <QuestionCard
              key={q.id + '-review-' + rIndex}
              question={q}
              qIndex={rIndex}
              total={questions.length}
              onNext={handleNext}
              onPrev={handlePrev}
              sessionType="study"
              dark={dark}
              alreadyAnswered={a ?? { selectedIdx: null, isCorrect: false }}
              reviewMode={true}
              hideExplanation={false}
              hideHint={true}
              hideNav={true}
            />
          )}
        </div>

        {/* Explanation column — desktop only */}
        <div className="rev-exp-col" ref={expColRef} style={{ display:'none' }}>
          {q?.explanation ? (
            <ExplanationBlock explanation={q.explanation} isCorrect={a?.isCorrect} dark={dark}/>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', padding:24, textAlign:'center' }}>
              <div style={{ fontSize:13, color:'var(--text-tert)' }}>No explanation available for this question.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM BAR — desktop: Prev/Next; mobile: QuestionNav ── */}
      <div className="rev-bottom-bar" style={{ borderTop:'1px solid var(--border)', background:'var(--bg-card)', padding:'12px 20px', gap:12, flexShrink:0, display:'flex' }}>
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

      <div className="rev-mobile-nav" style={{ flexShrink:0 }}>
        <QuestionNav total={questions.length} current={rIndex} answerMap={navMap} onJump={setRIndex} sessionType="study"/>
      </div>
    </div>
  )
}
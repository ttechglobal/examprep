'use client'
// src/components/battle/arena/BattleReview.jsx
// After a battle: step through every question with the correct answer, both
// players' picks and the explanation. Used by vs Computer and 1v1.
import { useState, useEffect, useRef } from 'react'
import { MathText } from '@/lib/mathRenderer'
import { ExplanationBlock } from '@/components/session/ExplanationBlock'
import BattleBg from './BattleBg'
import { PickBadge, pickedBy } from './AnswerTiles'
import { NAVY, NAVY2, GOLD, GOLD2, TILE, LETTERS, DECOS, optionText, subjectEmoji, hasDisplayableExplanation } from './theme'

//
// items: one per question, in order:
//   { text, passage?, options, correctIdx, mineIdx, theirsIdx, points, explanation, question }
//   mineIdx / theirsIdx are null when that player didn't answer; points is what
//   this player scored for it; question is passed to ExplanationBlock.
// opponent: { emoji, label, color } for the opponent's pick badge.
export default function BattleReview({ items, subject, opponent, onDone }) {
  const [idx, setIdx] = useState(0)
  const canvasRef = useRef(null)

  // Previous / Next always land at the top of the new question, even if the
  // student had scrolled down to read an explanation.
  useEffect(() => {
    canvasRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [idx])

  const q          = items[idx]
  const opts       = q?.options ?? []
  const selIdx     = q?.mineIdx ?? null
  const correctIdx = q?.correctIdx ?? -1
  const isCorrect  = selIdx !== null && selIdx === correctIdx
  const skipped    = selIdx === null
  const total      = items.length
  const hasExpl    = hasDisplayableExplanation(q?.explanation)
  const selectedKey = selIdx != null ? LETTERS[selIdx] ?? null : null
  const correctCount = items.filter(it => it.mineIdx !== null && it.mineIdx === it.correctIdx).length

  const sh    = `0 5px 0 #031548,0 7px 16px rgba(26,36,104,.3)`
  const shPrs = `0 1px 0 #031548`

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1500, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <BattleBg/>

      {/* ── Top bar — matches game header style ── */}
      <div style={{ background:`linear-gradient(180deg,#0B1138 0%,${NAVY2} 100%)`, flexShrink:0, zIndex:100, boxShadow:'0 4px 0 rgba(3,10,50,.6),0 6px 20px rgba(0,0,0,.4)', paddingTop:'env(safe-area-inset-top,0px)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px 10px' }}>
          {/* Back to results */}
          <button onClick={onDone} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(8,14,60,.6)', border:'1.5px solid rgba(255,255,255,.18)', borderRadius:12, padding:'8px 14px', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 8px rgba(0,0,0,.25)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Results
          </button>
          {/* Centre label */}
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:9, fontWeight:900, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.1em', lineHeight:1, marginBottom:3 }}>Reviewing</div>
            <div style={{ fontSize:14, fontWeight:900, color:'#fff' }}>Q {idx+1} of {total}</div>
          </div>
          {/* Score chip */}
          <div style={{ background:'rgba(255,184,0,.15)', border:'1.5px solid rgba(255,184,0,.35)', borderRadius:12, padding:'7px 12px', fontSize:12, fontWeight:900, color:GOLD }}>
            {correctCount}/{total} ✓
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height:3, margin:'0 14px 0', background:'rgba(255,255,255,.1)', borderRadius:999, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${((idx+1)/total)*100}%`, background:`linear-gradient(90deg,${GOLD},#FF6A00)`, borderRadius:999, transition:'width .4s ease' }}/>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div ref={canvasRef} style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', position:'relative', zIndex:5 }}>
        <style>{`
          .rtiles{display:grid;grid-template-columns:1fr;gap:22px;padding-top:6px}
          .rtile{min-height:68px;padding:14px 14px 16px 0}
          @media(min-width:640px){
            .rtiles{grid-template-columns:1fr 1fr;gap:22px 16px}
            .rtile{min-height:84px}
          }
        `}</style>
        <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 18px 0', display:'flex', flexDirection:'column', gap:22 }}>

          {/* ── Question card — game style, no icon ── */}
          <div style={{ position:'relative', marginTop:14 }}>
            {/* Subject pill */}
            <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:`linear-gradient(135deg,${GOLD},#FBBF24)`, border:'3px solid rgba(255,255,255,.5)', borderRadius:999, padding:'5px 20px', display:'flex', alignItems:'center', gap:7, fontSize:12, fontWeight:900, color:NAVY, whiteSpace:'nowrap', zIndex:5, boxShadow:`0 4px 0 ${GOLD2},0 6px 14px rgba(245,158,11,.35)` }}>
              <span>{subjectEmoji(subject)}</span>
              <span>{subject || 'Question'}</span>
            </div>
            <div style={{ background:'#FAFBFF', border:'3px solid #1A2468', borderRadius:22, boxShadow:'0 8px 0 rgba(26,36,104,.22),0 12px 28px rgba(26,36,104,.14),inset 0 1px 0 rgba(255,255,255,.9)', position:'relative', overflow:'visible' }}>
              {[{left:'-9px'},{right:'-9px'}].map((s,i)=>(
                <div key={i} style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', width:16, height:16, borderRadius:'50%', background:'#3B5BDB', border:'2.5px solid #D5E5F5', boxShadow:'0 2px 5px rgba(0,0,0,.22)', zIndex:2, ...s }}/>
              ))}
              <div style={{ padding:'34px 24px 26px' }}>
                {q?.passage && (
                  <div style={{ fontSize:13, fontWeight:600, color:'#374151', lineHeight:1.6, background:'#EEF2FF', borderRadius:12, padding:'10px 12px', marginBottom:14, maxHeight:200, overflowY:'auto', wordBreak:'break-word' }}>
                    <MathText text={q.passage} as="div" className=""/>
                  </div>
                )}
                <div style={{ fontSize:17, fontWeight:900, color:'#1A1F5E', lineHeight:1.65, wordBreak:'break-word' }}>
                  <MathText text={q?.text ?? ''} as="span" className=""/>
                </div>
              </div>
            </div>
          </div>

          {/* ── Answer tiles — 1 col mobile, 2-col desktop, matching active battle style ── */}
          <div className="rtiles">
            {opts.map((opt, i) => {
              const isC    = i === correctIdx
              const isW    = i === selIdx && !isCorrect
              const dim    = !isC && !isW
              const tileBg = isC ? '#16A34A' : isW ? '#DC2626' : TILE[i]?.bg ?? '#3B82F6'
              const tileSh = isC ? '0 5px 0 #15803D,0 7px 18px rgba(22,163,74,.4)' : isW ? '0 5px 0 #991B1B,0 7px 18px rgba(220,38,38,.4)' : `0 5px 0 ${TILE[i]?.press ?? '#1D4ED8'}`
              const letter = isC ? '✓' : isW ? '✗' : LETTERS[i]
              const ltrBg  = isC || isW ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.22)'
              const who    = pickedBy(i, selIdx, q?.theirsIdx ?? null)
              return (
                <div key={i} style={{ position:'relative', borderRadius:18, opacity: dim ? .4 : 1 }}>
                  <div className="rtile" style={{ display:'flex', alignItems:'center', borderRadius:18, background:tileBg, boxShadow:tileSh, position:'relative', overflow:'hidden', border:`2px solid ${isC ? 'rgba(255,255,255,.4)' : 'transparent'}` }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:'42%', background:'linear-gradient(to bottom,rgba(255,255,255,.25),transparent)', borderRadius:'16px 16px 0 0', pointerEvents:'none' }}/>
                    <div style={{ position:'absolute', bottom:0, left:0, right:0, height:5, background:'rgba(0,0,0,.16)', borderRadius:'0 0 16px 16px', pointerEvents:'none' }}/>
                    <div style={{ width:44, height:44, borderRadius:'50%', background:ltrBg, border:'2px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'#fff', flexShrink:0, margin:'0 14px', boxShadow:'inset 0 2px 4px rgba(0,0,0,.15)', position:'relative', zIndex:1 }}>{letter}</div>
                    <div style={{ flex:1, fontSize:15, fontWeight:800, color:'#fff', lineHeight:1.5, minWidth:0, wordBreak:'break-word', position:'relative', zIndex:1, paddingRight: who ? 30 : 0 }}>
                      <MathText text={optionText(opt)} as="span" className=""/>
                    </div>
                    {DECOS[i] && <div style={{ flexShrink:0, position:'relative', zIndex:1, marginRight:4 }}>{DECOS[i]}</div>}
                  </div>
                  {who && (
                    <div style={{ position:'absolute', top:-13, right:8, zIndex:10 }}>
                      <PickBadge who={who} opponent={opponent} size={34}/>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Result banner — game-styled ── */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 18px', borderRadius:18, background: isCorrect ? 'linear-gradient(135deg,#DCFCE7,#F0FDF4)' : skipped ? 'linear-gradient(135deg,#F3F4F6,#F9FAFB)' : 'linear-gradient(135deg,#FEE2E2,#FFF5F5)', border:`2.5px solid ${isCorrect ? 'rgba(34,197,94,.35)' : skipped ? 'rgba(107,114,128,.25)' : 'rgba(239,68,68,.3)'}`, boxShadow:'0 4px 0 rgba(26,36,104,.08),0 5px 14px rgba(26,36,104,.06)' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background: isCorrect ? '#16A34A' : skipped ? '#6B7280' : '#DC2626', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#fff', flexShrink:0, boxShadow:`0 4px 10px ${isCorrect ? 'rgba(22,163,74,.4)' : skipped ? 'rgba(107,114,128,.3)' : 'rgba(220,38,38,.35)'}` }}>
              {isCorrect ? '✓' : skipped ? '⏱' : '✗'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:900, color: isCorrect ? '#15803D' : skipped ? '#4B5563' : '#B91C1C' }}>
                {isCorrect ? `Correct — +${q.points ?? 10} pts` : skipped ? "No answer — 0 pts" : 'Wrong — 0 pts'}
              </div>
              {!isCorrect && correctIdx >= 0 && (
                <div style={{ fontSize:12, color:'#6B7280', marginTop:3 }}>
                  Correct: <strong style={{ color:'#15803D' }}><MathText text={optionText(opts[correctIdx])} as="span" className=""/></strong>
                </div>
              )}
            </div>
            {isCorrect && <div style={{ fontSize:12, fontWeight:900, color:'#92400E', background:`linear-gradient(135deg,${GOLD},#FBBF24)`, borderRadius:999, padding:'5px 12px', flexShrink:0, boxShadow:`0 3px 0 ${GOLD2}` }}>+10 XP ⚡</div>}
          </div>

          {/* Explanation */}
          {hasExpl && q && (
            <ExplanationBlock
              explanation={q.explanation}
              isCorrect={isCorrect}
              dark={false}
              mobileModal={false}
              selectedKey={selectedKey}
              question={q.question}
            />
          )}

          {/* Dot progress */}
          <div style={{ display:'flex', gap:5, justifyContent:'center', padding:'4px 0' }}>
            {items.map((_, i) => (
              <div key={i} style={{ height:7, borderRadius:4, transition:'all .25s', background: i < idx ? GOLD : i === idx ? NAVY2 : 'rgba(26,36,104,.15)', width: i === idx ? 20 : i < idx ? 14 : 8 }}/>
            ))}
          </div>

          <div style={{ height:24, flexShrink:0 }}/>
        </div>
      </div>

      {/* ── Bottom nav ── */}
      <div style={{ flexShrink:0, zIndex:100, background:`linear-gradient(to top,#C8DDEF 65%,transparent)`, padding:'10px 14px', paddingBottom:'max(14px,env(safe-area-inset-bottom))' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, maxWidth:680, margin:'0 auto' }}>
          <button onClick={() => setIdx(i => Math.max(0, i-1))} disabled={idx===0}
            style={{ padding:'13px', borderRadius:999, border:'2.5px solid rgba(26,36,104,.2)', background:'#fff', color:NAVY2, fontSize:14, fontWeight:900, fontFamily:'inherit', cursor: idx===0 ? 'not-allowed' : 'pointer', opacity: idx===0 ? .4 : 1, boxShadow: idx===0 ? 'none' : '0 4px 0 rgba(26,36,104,.15)', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Previous
          </button>
          {idx < total-1 ? (
            <button onClick={() => setIdx(i => i+1)}
              style={{ padding:'13px', borderRadius:999, border:'none', background:NAVY2, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:sh, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}
              onPointerDown={e=>{e.currentTarget.style.transform='translateY(3px)';e.currentTarget.style.boxShadow=shPrs}}
              onPointerUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=sh}}
              onPointerLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=sh}}>
              Next <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          ) : (
            <button onClick={onDone}
              style={{ padding:'13px', borderRadius:999, border:'none', background:`linear-gradient(135deg,${GOLD},#FBBF24)`, color:NAVY, fontSize:14, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:`0 5px 0 ${GOLD2},0 7px 16px rgba(245,158,11,.35)`, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}
              onPointerDown={e=>{e.currentTarget.style.transform='translateY(3px)';e.currentTarget.style.boxShadow=`0 1px 0 ${GOLD2}`}}
              onPointerUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 5px 0 ${GOLD2},0 7px 16px rgba(245,158,11,.35)`}}
              onPointerLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 5px 0 ${GOLD2},0 7px 16px rgba(245,158,11,.35)`}}>
              🏁 Back to Results
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes slidein{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  )
}

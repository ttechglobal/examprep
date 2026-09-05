'use client'
// src/components/session/ExplanationBlock.jsx
// FormulaBox, HintBlock, ExplanationBlock — used in QuestionCard and ReviewSession.

import React from 'react'
import { MathText } from '@/lib/mathRenderer'
import { BLUE, GREEN, GOLD, ORANGE } from './SessionUtils'

// ─── FORMULA BOX ─────────────────────────────────────────────────────────────
export function FormulaBox({ formulaBox, variablesKey }) {
  if (!formulaBox || !formulaBox.trim()) return null
  const vars = Array.isArray(variablesKey) ? variablesKey.filter(Boolean) : []
  return (
    <div style={{ marginBottom:14, borderRadius:14, overflow:'hidden', border:`1.5px solid ${BLUE}35`, background:`${BLUE}07` }}>
      <div style={{ padding:'7px 14px', background:`${BLUE}12`, borderBottom:`1px solid ${BLUE}25`, display:'flex', alignItems:'center', gap:7 }}>
        <span style={{ fontSize:13 }}>📐</span>
        <span style={{ fontSize:10, fontWeight:900, color:BLUE, textTransform:'uppercase', letterSpacing:'.1em' }}>Formula</span>
      </div>
      <div style={{ padding:'12px 16px 10px', textAlign:'center' }}>
        <MathText text={formulaBox} as="div" className="" style={{ fontSize:18, fontWeight:700, color:'var(--text-prim)', lineHeight:1.6 }}/>
      </div>
      {vars.length > 0 && (
        <div style={{ padding:'8px 14px 12px', display:'flex', flexDirection:'column', gap:4, borderTop:`1px solid ${BLUE}20` }}>
          {vars.map((v, i) => (
            <div key={i} style={{ display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{ fontSize:11, color:`${BLUE}80`, flexShrink:0 }}>·</span>
              <MathText text={v} as="span" className="" style={{ fontSize:12, color:'var(--text-sec)', lineHeight:1.5 }}/>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── HINT BLOCK ───────────────────────────────────────────────────────────────
// Small pill — non-intrusive. Tap to reveal, tap to close.
export function HintBlock({ hint }) {
  const [open, setOpen] = React.useState(false)
  if (!hint || !hint.trim()) return null
  return (
    <div style={{ marginBottom:12 }}>
      {!open && (
        <button onClick={() => setOpen(true)}
          style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, border:`1px solid ${GOLD}55`, background:`${GOLD}10`, cursor:'pointer', fontFamily:'inherit' }}>
          <span style={{ fontSize:12 }}>💡</span>
          <span style={{ fontSize:11, fontWeight:700, color:GOLD }}>Hint</span>
        </button>
      )}
      {open && (
        <div style={{ borderRadius:12, border:`1px solid ${GOLD}40`, background:`${GOLD}08`, padding:'10px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontSize:10, fontWeight:900, color:GOLD, textTransform:'uppercase', letterSpacing:'.07em' }}>💡 Hint</span>
            <button onClick={() => setOpen(false)}
              style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
              close ×
            </button>
          </div>
          <MathText text={hint} as="p" className="" style={{ fontSize:13, color:'var(--text-prim)', lineHeight:1.65, margin:0, fontWeight:500 }}/>
        </div>
      )}
    </div>
  )
}

// ─── EXPLANATION CONTENT (shared between inline and modal) ─────────────────────
function ExplanationContent({ explanation, isCorrect }) {
  const concept      = explanation.concept       ?? ''
  const formulaBox   = explanation.formula_box   ?? ''
  const variablesKey = explanation.variables_key ?? []
  const intro        = explanation.intro         ?? ''
  const answerNote   = explanation.answer_note   ?? explanation.correct ?? ''
  const studyTip     = explanation.study_tip     ?? ''
  const svgDiagram   = explanation.svg_diagram   ?? ''

  const steps = Array.isArray(explanation.steps)
    ? explanation.steps.filter(s => s && (s.title || (Array.isArray(s.lines) && s.lines.length)))
    : []

  const hasSteps = steps.length > 0

  return (
    <>
      {concept && <div style={{ fontSize:14, fontWeight:800, color:BLUE, marginBottom:intro?6:0 }}>{concept}</div>}
      {intro && <p style={{ fontSize:14, color:'var(--text-sec)', lineHeight:1.65, margin:`${concept?4:0}px 0 ${(formulaBox||hasSteps||svgDiagram)?12:0}px` }}>{intro}</p>}

      <FormulaBox formulaBox={formulaBox} variablesKey={variablesKey}/>

      {/* SVG diagram */}
      {svgDiagram && svgDiagram.trim().toLowerCase().startsWith('<svg') && (
        <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid var(--border)', background:'#fff', marginBottom:14 }}>
          <div style={{ padding:'6px 12px', background:'var(--bg-subtle)', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:10, fontWeight:900, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em' }}>Diagram</span>
          </div>
          <div style={{ display:'flex', justifyContent:'center', padding:12, overflowX:'auto' }}
            dangerouslySetInnerHTML={{ __html: svgDiagram.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/\son\w+="[^"]*"/gi,'') }}/>
        </div>
      )}

      {/* Steps */}
      {hasSteps && (
        <div style={{ borderRadius:12, border:'1px solid var(--border)', overflow:'hidden', marginBottom:14 }}>
          {steps.map((step, si) => {
            const lines = Array.isArray(step.lines) ? step.lines : []
            return (
              <div key={si} style={{ borderBottom:si<steps.length-1?'1px solid var(--border)':'none', padding:'13px 16px', background:'rgba(6,42,120,.015)' }}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ height:22, borderRadius:999, background:`${BLUE}18`, border:`1px solid ${BLUE}35`, padding:'0 10px', display:'flex', alignItems:'center', flexShrink:0, marginTop:2 }}>
                    <span style={{ fontSize:11, fontWeight:900, color:BLUE, whiteSpace:'nowrap' }}>Step {si + 1}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    {step.title && <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:lines.length?6:0, lineHeight:1.4 }}>{step.title}</div>}
                    {lines.map((line, li) => {
                      const mathLine = (typeof line==='string' && line.includes('\\') && !line.includes('$')) ? `$${line.trim()}$` : line
                      return (
                        <div key={li} style={{ fontSize:15, lineHeight:2.2, overflowX:'auto' }}>
                          <MathText text={mathLine} as="span" className=""/>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Answer note */}
      {answerNote && (
        <div style={{ padding:'13px 16px', borderRadius:12, background:`${GREEN}10`, border:`1.5px solid ${GREEN}35`, display:'flex', alignItems:'flex-start', gap:10, marginBottom:studyTip?14:0 }}>
          <div style={{ width:22, height:22, borderRadius:6, background:GREEN, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
            <span style={{ fontSize:13, color:'#fff', fontWeight:900 }}>✓</span>
          </div>
          <span style={{ fontSize:14, fontWeight:600, color:'var(--text-prim)', lineHeight:1.65 }}>{answerNote}</span>
        </div>
      )}

      {/* Study tip */}
      {studyTip && (
        <div style={{ padding:'11px 14px', borderRadius:11, background:'rgba(255,184,0,.07)', border:'1px solid rgba(255,184,0,.25)', display:'flex', alignItems:'flex-start', gap:9 }}>
          <span style={{ fontSize:14, flexShrink:0 }}>📌</span>
          <div>
            <div style={{ fontSize:10, fontWeight:900, color:GOLD, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Study Tip</div>
            <span style={{ fontSize:13, color:'var(--text-sec)', lineHeight:1.6 }}>{studyTip}</span>
          </div>
        </div>
      )}
    </>
  )
}

// ─── EXPLANATION MODAL (mobile full-screen) ────────────────────────────────────
function ExplanationModal({ explanation, isCorrect, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)', display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
      {/* Tap backdrop to close */}
      <div style={{ flex:1 }} onClick={onClose}/>
      <div style={{ background:'var(--bg-base)', borderRadius:'20px 20px 0 0', maxHeight:'82dvh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Handle bar */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--border-strong)' }}/>
        </div>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 18px 12px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <span style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)' }}>Explanation</span>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-subtle)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-tert)', fontSize:16, fontWeight:700, fontFamily:'inherit' }}>×</button>
        </div>
        {/* Scrollable content */}
        <div style={{ overflowY:'auto', padding:'16px 18px 32px', flex:1 }}>
          <ExplanationContent explanation={explanation} isCorrect={isCorrect}/>
        </div>
      </div>
    </div>
  )
}

// ─── EXPLANATION BLOCK ────────────────────────────────────────────────────────
// On mobile: shows a compact "View Explanation" button that opens a bottom-sheet modal.
// On desktop: renders the full explanation inline (the side-column handles this on study mode,
//             but inline is used for ReviewSession and other contexts).
// Schema: { concept, formula_box, variables_key, intro, steps, answer_note, svg_diagram, illustration_prompt, study_tip }
export function ExplanationBlock({ explanation, isCorrect, dark, mobileModal = false }) {
  const [modalOpen, setModalOpen] = React.useState(false)
  if (!explanation) return null

  // Quick answer note for the compact mobile preview (before opening modal)
  const answerNote = explanation.answer_note ?? explanation.correct ?? ''
  const concept    = explanation.concept ?? ''

  if (mobileModal) {
    return (
      <>
        {/* Compact preview strip */}
        <div style={{ marginTop:14, borderRadius:14, border:'1px solid var(--border)', background:dark?'rgba(255,255,255,.04)':'#fff', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:10, fontWeight:900, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:concept?4:0 }}>Explanation</div>
              {concept && <div style={{ fontSize:13, fontWeight:800, color:BLUE, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{concept}</div>}
            </div>
            <button onClick={() => setModalOpen(true)}
              style={{ flexShrink:0, padding:'8px 14px', borderRadius:10, border:`1.5px solid ${BLUE}`, background:`${BLUE}12`, color:BLUE, fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
              View →
            </button>
          </div>
          {answerNote && (
            <div style={{ padding:'10px 16px', display:'flex', alignItems:'flex-start', gap:8 }}>
              <div style={{ width:18, height:18, borderRadius:5, background:GREEN, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                <span style={{ fontSize:10, color:'#fff', fontWeight:900 }}>✓</span>
              </div>
              <span style={{ fontSize:13, color:'var(--text-prim)', lineHeight:1.6 }}>{answerNote}</span>
            </div>
          )}
        </div>
        {modalOpen && (
          <ExplanationModal explanation={explanation} isCorrect={isCorrect} onClose={() => setModalOpen(false)}/>
        )}
      </>
    )
  }

  // Full inline rendering (desktop, review side column, etc.)
  return (
    <div style={{ marginTop:14, borderRadius:16, border:'1px solid var(--border)', background:dark?'rgba(255,255,255,.04)':'#fff', boxShadow:dark?'none':'0 2px 12px rgba(6,42,120,.06)' }}>
      <div style={{ padding:'16px 18px 14px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:11, fontWeight:900, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:concept?6:0 }}>
          Explanation
        </div>
      </div>
      <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:14 }}>
        <ExplanationContent explanation={explanation} isCorrect={isCorrect}/>
      </div>
    </div>
  )
}
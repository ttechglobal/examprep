'use client'
// src/components/session/ExplanationBlock.jsx
// FormulaBox, HintBlock, ExplanationBlock — used in QuestionCard and ReviewSession.

import React from 'react'
import { MathText } from '@/lib/mathRenderer'
import { BLUE, GREEN, GOLD, ORANGE, RED } from './SessionUtils'

const LETTERS = ['A','B','C','D','E']

// ─── RICH TEXT RENDERER ──────────────────────────────────────────────────────
function RichText({ text, style }) {
  if (!text) return null
  const paragraphs = String(text).split(/\n+/).filter(Boolean)
  return (
    <span style={style}>
      {paragraphs.map((para, pi) => {
        const parts = []
        let remaining = para
        let key = 0
        const tokenRe = /\*\*(.+?)\*\*|\*(.+?)\*/g
        let lastIdx = 0
        let match
        while ((match = tokenRe.exec(remaining)) !== null) {
          if (match.index > lastIdx) parts.push(<span key={key++}>{remaining.slice(lastIdx, match.index)}</span>)
          if (match[1] !== undefined) parts.push(<strong key={key++} style={{ fontWeight:800, color:'inherit' }}>{match[1]}</strong>)
          else if (match[2] !== undefined) parts.push(<em key={key++} style={{ fontStyle:'italic', color:'inherit' }}>{match[2]}</em>)
          lastIdx = match.index + match[0].length
        }
        if (lastIdx < remaining.length) parts.push(<span key={key++}>{remaining.slice(lastIdx)}</span>)
        return (
          <span key={pi}>
            {pi > 0 && <br/>}
            {parts.length > 0 ? parts : para}
          </span>
        )
      })}
    </span>
  )
}

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

// ─── FORMATTED ANSWER NOTE ────────────────────────────────────────────────────
// Shows the correct answer with option letter pill + answer text, both styled.
function FormattedAnswerNote({ answerNote, correctLetter, correctText }) {
  if (!answerNote && !correctLetter) return null

  // If we have both letter and text, show the styled pill + text combo
  if (correctLetter && correctText) {
    return (
      <div style={{ padding:'13px 16px', borderRadius:12, background:`${GREEN}10`, border:`1.5px solid ${GREEN}35`, marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
          <div style={{ width:22, height:22, borderRadius:6, background:GREEN, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
            <span style={{ fontSize:13, color:'#fff', fontWeight:900 }}>✓</span>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:900, color:GREEN, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>
              Correct Answer
            </div>
            {/* Letter pill + answer text */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:9, marginBottom: answerNote ? 8 : 0 }}>
              <div style={{
                flexShrink:0,
                width:30, height:30, borderRadius:9,
                background:GREEN,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:`0 2px 6px ${GREEN}40`,
              }}>
                <span style={{ fontSize:14, fontWeight:900, color:'#fff' }}>{correctLetter}</span>
              </div>
              <div style={{ flex:1, minWidth:0, paddingTop:5 }}>
                <MathText
                  text={correctText}
                  as="span"
                  className=""
                  style={{ fontSize:15, fontWeight:800, color:'var(--text-prim)', lineHeight:1.5 }}
                />
              </div>
            </div>
            {/* explanation / answer_note text below */}
            {answerNote && (
              <div style={{ paddingTop:4, borderTop:`1px solid ${GREEN}20`, marginTop:4 }}>
                <RichText text={answerNote} style={{ fontSize:13, fontWeight:500, color:'var(--text-sec)', lineHeight:1.7 }}/>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Fallback: no letter/text pair — render plain answer_note
  if (answerNote) {
    return (
      <div style={{ padding:'13px 16px', borderRadius:12, background:`${GREEN}10`, border:`1.5px solid ${GREEN}35`, display:'flex', alignItems:'flex-start', gap:10, marginBottom:14 }}>
        <div style={{ width:22, height:22, borderRadius:6, background:GREEN, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
          <span style={{ fontSize:13, color:'#fff', fontWeight:900 }}>✓</span>
        </div>
        <RichText text={answerNote} style={{ fontSize:14, fontWeight:500, color:'var(--text-prim)', lineHeight:1.7 }}/>
      </div>
    )
  }

  return null
}

// ─── WRONG OPTIONS BLOCK ──────────────────────────────────────────────────────
function WrongOptionsBlock({ wrongOptions, selectedKey }) {
  const [open, setOpen] = React.useState(false)
  if (!wrongOptions || Object.keys(wrongOptions).length === 0) return null

  const entries = Object.entries(wrongOptions)
  if (entries.length === 0) return null

  // Sort: student's selected wrong answer first
  const sorted = [...entries].sort(([ka], [kb]) => {
    if (ka === selectedKey) return -1
    if (kb === selectedKey) return 1
    return 0
  })

  return (
    <div style={{ marginTop:14 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:12, border:`1px solid ${ORANGE}35`, background:`${ORANGE}07`, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:14 }}>❓</span>
          <span style={{ fontSize:12, fontWeight:800, color:ORANGE }}>Why the other options are wrong</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform .2s', flexShrink:0 }}>
          <path d="M3 5l4 4 4-4" stroke={ORANGE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ marginTop:6, borderRadius:12, border:`1px solid ${ORANGE}25`, background:`${ORANGE}04`, overflow:'hidden' }}>
          {sorted.map(([key, reason], i) => {
            const isStudentWrong = key === selectedKey
            return (
              <div key={key} style={{ padding:'11px 14px', borderBottom: i < sorted.length - 1 ? `1px solid ${ORANGE}15` : 'none', background: isStudentWrong ? `${RED}05` : 'transparent' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:9 }}>
                  <div style={{ width:26, height:26, borderRadius:8, background: isStudentWrong ? `${RED}20` : `${ORANGE}15`, border:`1.5px solid ${isStudentWrong ? RED : ORANGE}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                    <span style={{ fontSize:12, fontWeight:900, color: isStudentWrong ? RED : ORANGE }}>{key}</span>
                  </div>
                  <div style={{ flex:1 }}>
                    {isStudentWrong && (
                      <div style={{ fontSize:9, fontWeight:900, color:RED, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Your answer</div>
                    )}
                    <RichText text={reason} style={{ fontSize:13, color:'var(--text-sec)', lineHeight:1.6 }}/>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── EXPLANATION CONTENT (shared between inline and modal) ─────────────────────
function ExplanationContent({ explanation, isCorrect, selectedKey, correctLetter, correctText }) {
  const concept      = explanation.concept       ?? ''
  const formulaBox   = explanation.formula_box   ?? ''
  const variablesKey = explanation.variables_key ?? []
  const intro        = explanation.intro         ?? ''
  const answerNote   = explanation.answer_note   ?? explanation.correct ?? ''
  const studyTip     = explanation.study_tip     ?? ''
  const svgDiagram   = explanation.svg_diagram   ?? ''
  const wrongOptions = explanation.wrong_options ?? {}

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

      {/* Formatted answer note with letter + text */}
      <FormattedAnswerNote
        answerNote={answerNote}
        correctLetter={correctLetter}
        correctText={correctText}
      />

      {/* Why other options are wrong */}
      <WrongOptionsBlock wrongOptions={wrongOptions} selectedKey={selectedKey}/>

      {/* Study tip */}
      {studyTip && (
        <div style={{ padding:'11px 14px', borderRadius:11, background:'rgba(255,184,0,.07)', border:'1px solid rgba(255,184,0,.25)', display:'flex', alignItems:'flex-start', gap:9, marginTop:14 }}>
          <span style={{ fontSize:14, flexShrink:0 }}>📌</span>
          <div>
            <div style={{ fontSize:10, fontWeight:900, color:GOLD, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Study Tip</div>
            <RichText text={studyTip} style={{ fontSize:13, color:'var(--text-sec)', lineHeight:1.65 }}/>
          </div>
        </div>
      )}
    </>
  )
}

// ─── EXPLANATION MODAL (mobile full-screen) ────────────────────────────────────
function ExplanationModal({ explanation, isCorrect, selectedKey, correctLetter, correctText, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)', display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
      <div style={{ flex:1 }} onClick={onClose}/>
      <div style={{ background:'var(--bg-base)', borderRadius:'20px 20px 0 0', maxHeight:'82dvh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--border-strong)' }}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 18px 12px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <span style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)' }}>Explanation</span>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-subtle)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-tert)', fontSize:16, fontWeight:700, fontFamily:'inherit' }}>×</button>
        </div>
        <div style={{ overflowY:'auto', padding:'16px 18px 32px', flex:1 }}>
          <ExplanationContent
            explanation={explanation}
            isCorrect={isCorrect}
            selectedKey={selectedKey}
            correctLetter={correctLetter}
            correctText={correctText}
          />
        </div>
      </div>
    </div>
  )
}

// ─── EXPLANATION BLOCK ────────────────────────────────────────────────────────
// Props:
//   explanation   — explanation object from DB
//   isCorrect     — boolean
//   dark          — boolean
//   mobileModal   — boolean: if true, renders as a button that opens a bottom sheet
//   selectedKey   — the letter the student selected (e.g. 'B'), for wrong_options highlighting
//   question      — full question object (to extract correct letter + text for formatting)
export function ExplanationBlock({ explanation, isCorrect, dark, mobileModal = false, selectedKey, question }) {
  const [modalOpen, setModalOpen] = React.useState(false)
  if (!explanation) return null

  // Derive correct letter + text for the formatted answer note
  let correctLetter = null
  let correctText   = null
  if (question) {
    const correctAnswer = question.correct_answer ?? ''
    const opts          = question.options ?? {}
    // correct_answer might be a letter ('A','B','C','D') or the option text itself
    if (LETTERS.includes(correctAnswer)) {
      correctLetter = correctAnswer
      correctText   = Array.isArray(opts)
        ? opts[LETTERS.indexOf(correctAnswer)]
        : (opts[correctAnswer] ?? '')
    } else {
      // correct_answer is the text — find which letter maps to it
      if (Array.isArray(opts)) {
        const idx = opts.indexOf(correctAnswer)
        if (idx !== -1) { correctLetter = LETTERS[idx]; correctText = correctAnswer }
      } else {
        const entry = Object.entries(opts).find(([, v]) => v === correctAnswer)
        if (entry) { correctLetter = entry[0]; correctText = correctAnswer }
      }
      // If we still don't have a letter, just show the text
      if (!correctLetter) correctText = correctAnswer || null
    }
  }

  const hasWrong = Object.keys(explanation.wrong_options ?? {}).length > 0

  if (mobileModal) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            marginTop:14, width:'100%',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            padding:'13px 18px', borderRadius:13,
            border:`1.5px solid ${BLUE}`,
            background:`${BLUE}0D`,
            color:BLUE, fontSize:13, fontWeight:800,
            cursor:'pointer', fontFamily:'inherit',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="6" stroke={BLUE} strokeWidth="1.5"/>
            <path d="M7.5 5v3.5M7.5 10v.5" stroke={BLUE} strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          View Explanation
          {hasWrong && <span style={{ fontSize:10, fontWeight:800, padding:'2px 7px', borderRadius:999, background:`${ORANGE}18`, color:ORANGE, border:`1px solid ${ORANGE}30` }}>+ why others wrong</span>}
        </button>
        {modalOpen && (
          <ExplanationModal
            explanation={explanation}
            isCorrect={isCorrect}
            selectedKey={selectedKey}
            correctLetter={correctLetter}
            correctText={correctText}
            onClose={() => setModalOpen(false)}
          />
        )}
      </>
    )
  }

  // Full inline rendering (desktop, review side column, etc.)
  const concept = explanation.concept ?? ''
  return (
    <div style={{ marginTop:14, borderRadius:16, border:'1px solid var(--border)', background:dark?'rgba(255,255,255,.04)':'#fff', boxShadow:dark?'none':'0 2px 12px rgba(6,42,120,.06)' }}>
      <div style={{ padding:'16px 18px 14px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:11, fontWeight:900, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:concept?6:0 }}>
          Explanation
        </div>
        {concept && <div style={{ fontSize:13, fontWeight:800, color:BLUE }}>{concept}</div>}
      </div>
      <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:0 }}>
        <ExplanationContent
          explanation={explanation}
          isCorrect={isCorrect}
          selectedKey={selectedKey}
          correctLetter={correctLetter}
          correctText={correctText}
        />
      </div>
    </div>
  )
}
'use client'
import React from 'react'
// src/app/student/practice/session/page.js — v4
// Changes from v3:
//   • Explanation: no tabs — one unified flowing layout (concept → text → steps inline)
//   • Steps style matches mockup exactly: Step N badge, step title bold, math lines below
//   • Nav: "Skip" renamed "Next", last question = "Submit"
//   • Practice mode: zero colour feedback on selection — pure grey until results
//   • Review mode: same session-card UI, one question at a time, fully revealed
//   • Results: cleaner layout

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { usePoints } from '@/contexts/PointsContext'
import { MathText, injectMathStyles } from '@/lib/mathRenderer'
import SessionResults from '@/components/student/SessionResults'
import { saveSessionLocally, flushSyncQueue } from '@/lib/localSessionSync'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GREEN  = '#22c55e'
const RED    = '#f43f5e'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'

function pct(a, b)     { return b > 0 ? Math.round((a / b) * 100) : 0 }
function msToSecs(ms)  { return Math.round(ms / 1000) }

const LETTERS = ['A','B','C','D','E']

function normaliseOptions(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  return LETTERS.map(l => raw[l]).filter(v => v != null)
}
function checkCorrect(options, idx, correctAnswer) {
  return options[idx] === correctAnswer || LETTERS[idx] === correctAnswer || idx === correctAnswer
}


// ─── LOADING ──────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg-base)', gap:16 }}>
      <div style={{ width:44, height:44, borderRadius:'50%', border:'3px solid var(--border)', borderTopColor:BLUE, animation:'spin .7s linear infinite' }}/>
      <div style={{ fontSize:14, fontWeight:700, color:'var(--text-tert)' }}>Loading questions…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>
    </div>
  )
}

// ─── ERROR ────────────────────────────────────────────────────────────────────
function ErrorScreen({ message, onBack }) {
  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:24, background:'var(--bg-base)' }}>
      <style>{`*{box-sizing:border-box}`}</style>
      <div style={{ fontSize:44 }}>😕</div>
      <div style={{ fontSize:18, fontWeight:900, color:'var(--text-prim)', textAlign:'center' }}>Something went wrong</div>
      <div style={{ fontSize:14, color:'var(--text-tert)', textAlign:'center', maxWidth:320, lineHeight:1.6 }}>{message}</div>
      <button onClick={onBack} style={{ padding:'12px 28px', borderRadius:13, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:15, fontWeight:800, fontFamily:'inherit' }}>← Back to Practice</button>
    </div>
  )
}

// ─── CONFIRMATION DIALOG ─────────────────────────────────────────────────────
// mode='submit' — triggered by Submit on last question
// mode='end'    — triggered by the End button mid-session
function EndDialog({ answered, total, onConfirm, onCancel, mode = 'end' }) {
  const unanswered = total - answered
  const isSubmit = mode === 'submit'

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.65)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'var(--bg-card)', borderRadius:22, border:'1px solid var(--border)', padding:'28px 24px', maxWidth:360, width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,.4)' }}>
        <div style={{ fontSize:36, textAlign:'center', marginBottom:12 }}>{isSubmit ? '📋' : '⚠️'}</div>
        <div style={{ fontSize:18, fontWeight:900, color:'var(--text-prim)', textAlign:'center', marginBottom:8 }}>
          {isSubmit ? 'Ready to submit?' : 'End this session?'}
        </div>
        <div style={{ fontSize:13, color:'var(--text-tert)', textAlign:'center', lineHeight:1.7, marginBottom:22 }}>
          {isSubmit ? (
            <>
              You've answered <strong style={{ color:'var(--text-prim)' }}>{answered}</strong> of <strong style={{ color:'var(--text-prim)' }}>{total}</strong> questions.
              {unanswered > 0 && <><br/><span style={{ color:ORANGE }}>{unanswered} unanswered</span> will be marked as incorrect.</>}
              {unanswered === 0 && <><br/><span style={{ color:GREEN }}>All questions answered ✓</span></>}
            </>
          ) : (
            <>
              You've answered <strong style={{ color:'var(--text-prim)' }}>{answered}</strong> of <strong style={{ color:'var(--text-prim)' }}>{total}</strong> questions.
              {unanswered > 0 && <><br/><span style={{ color:ORANGE }}>{unanswered} unanswered</span> will be marked as incorrect.</>}
            </>
          )}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={onConfirm}
            style={{ width:'100%', padding:'14px', borderRadius:13, border:'none', cursor:'pointer', background: isSubmit ? BLUE : RED, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', boxShadow: isSubmit ? `0 4px 0 #0a3fa0` : `0 4px 0 #b91c1c` }}>
            {isSubmit ? 'Yes, submit' : 'End & See Results'}
          </button>
          <button onClick={onCancel}
            style={{ width:'100%', padding:'13px', borderRadius:13, border:'1px solid var(--border)', cursor:'pointer', background:'transparent', color:'var(--text-sec)', fontSize:14, fontWeight:700, fontFamily:'inherit' }}>
            {isSubmit ? 'Go back' : 'Keep going'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── QUESTION NAVIGATOR ───────────────────────────────────────────────────────
function QuestionNav({ total, current, answerMap, onJump, sessionType, inline=false }) {
  return (
    <div style={{ borderTop: inline ? 'none' : '1px solid var(--border)', background: inline ? 'transparent' : 'var(--bg-card)', padding: inline ? '0' : '10px 14px 12px' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxHeight:96, overflow:'hidden' }}>
        {Array.from({length: total}, (_, i) => {
          const info      = answerMap[i]
          const isCurrent = i === current
          const answered  = info?.answered
          const correct   = info?.correct
          const skipped   = info?.skipped

          let bg, border, color
          if (isCurrent) {
            bg = BLUE; border = BLUE; color = '#fff'
          } else if (answered && sessionType === 'study') {
            bg = correct ? `${GREEN}18` : `${RED}14`; border = correct ? GREEN : RED; color = correct ? GREEN : RED
          } else if (answered) {
            bg = `${BLUE}15`; border = `${BLUE}55`; color = BLUE
          } else if (skipped) {
            bg = `${ORANGE}10`; border = `${ORANGE}50`; color = ORANGE
          } else {
            bg = 'var(--bg-subtle)'; border = 'var(--border)'; color = 'var(--text-tert)'
          }

          return (
            <button key={i} onClick={() => onJump(i)}
              style={{ width:30, height:30, borderRadius:8, border:`2px solid ${border}`, background:bg, color, fontSize:11, fontWeight:900, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .12s', flexShrink:0 }}>
              {i + 1}
            </button>
          )
        })}
      </div>
      {/* Legend */}
      <div style={{ display:'flex', gap:10, marginTop:7, flexWrap:'wrap' }}>
        {[
          { bg:BLUE,   border:BLUE,   label:'Current' },
          { bg:`${BLUE}15`, border:`${BLUE}55`, label:'Answered' },
          { bg:`${ORANGE}10`, border:`${ORANGE}50`, label:'Skipped' },
          { bg:'var(--bg-subtle)', border:'var(--border)', label:'Not done' },
          ...(sessionType==='study' ? [
            { bg:`${GREEN}18`, border:GREEN, label:'Correct' },
            { bg:`${RED}14`,   border:RED,   label:'Wrong'   },
          ] : []),
        ].map((l, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:l.bg, border:`1.5px solid ${l.border}` }}/>
            <span style={{ fontSize:9, fontWeight:700, color:'var(--text-tert)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PER-QUESTION COUNTDOWN (speed round) ─────────────────────────────────────
function QuestionCountdown({ secs, onTimeUp }) {
  const [remaining, setRemaining] = useState(secs)
  useEffect(() => {
    setRemaining(secs)
    const iv = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(iv); onTimeUp(); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [secs])

  const pctLeft = pct(remaining, secs)
  const color   = pctLeft > 50 ? GREEN : pctLeft > 25 ? ORANGE : RED

  return (
    <div style={{ position:'relative', width:36, height:36, flexShrink:0 }}>
      <svg viewBox="0 0 36 36" style={{ position:'absolute', inset:0, transform:'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="3"/>
        <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${2 * Math.PI * 15}`}
          strokeDashoffset={`${2 * Math.PI * 15 * (1 - pctLeft/100)}`}
          style={{ transition:'stroke-dashoffset 1s linear, stroke .3s' }}/>
      </svg>
      <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color }}>{remaining}</span>
    </div>
  )
}

// ─── OVERALL SESSION TIMER ────────────────────────────────────────────────────
function SessionTimer({ durationSecs, onTimeUp }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => {
      setElapsed(e => { const n = e+1; if (n >= durationSecs) { clearInterval(iv); onTimeUp(); return durationSecs } return n })
    }, 1000)
    return () => clearInterval(iv)
  }, [durationSecs, onTimeUp])

  const remaining = durationSecs - elapsed
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const color = pct(remaining, durationSecs) > 50 ? BLUE : pct(remaining, durationSecs) > 25 ? ORANGE : RED

  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="13" r="8" stroke={color} strokeWidth="2.2"/>
        <path d="M12 9v4l3 2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M9 2h6M12 2v3" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span style={{ fontSize:14, fontWeight:900, color, fontVariantNumeric:'tabular-nums' }}>{mins}:{String(secs).padStart(2,'0')}</span>
    </div>
  )
}

// ─── FORMULA BOX ─────────────────────────────────────────────────────────────
// Renders the key formula + variables key above the steps.
// formulaBox: "$V = IR$"
// variablesKey: ["$V$ = voltage (V)", "$I$ = current (A)", "$R$ = resistance (Ω)"]
function FormulaBox({ formulaBox, variablesKey }) {
  if (!formulaBox || !formulaBox.trim()) return null
  const vars = Array.isArray(variablesKey) ? variablesKey.filter(Boolean) : []
  return (
    <div style={{ marginBottom:14, borderRadius:14, overflow:'hidden', border:`1.5px solid ${BLUE}35`, background:`${BLUE}07` }}>
      {/* Header */}
      <div style={{ padding:'7px 14px', background:`${BLUE}12`, borderBottom:`1px solid ${BLUE}25`, display:'flex', alignItems:'center', gap:7 }}>
        <span style={{ fontSize:13 }}>📐</span>
        <span style={{ fontSize:10, fontWeight:900, color:BLUE, textTransform:'uppercase', letterSpacing:'.1em' }}>Formula</span>
      </div>
      {/* The formula itself — large, centred */}
      <div style={{ padding:'12px 16px 10px', textAlign:'center' }}>
        <MathText text={formulaBox} as="div" className="" style={{ fontSize:18, fontWeight:700, color:'var(--text-prim)', lineHeight:1.6 }}/>
      </div>
      {/* Variables key — only if present */}
      {vars.length > 0 && (
        <div style={{ padding:'0 14px 12px', display:'flex', flexDirection:'column', gap:4, borderTop:`1px solid ${BLUE}20`, paddingTop:8, marginTop:2 }}>
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
// Shown before the student answers — collapsible, single level.
// Designed for students who are stuck: one tap to reveal a genuine nudge.
function HintBlock({ hint }) {
  const [open, setOpen] = React.useState(false)
  if (!hint || !hint.trim()) return null
  return (
    <div style={{
      marginBottom:12, borderRadius:14, overflow:'hidden',
      border:`1.5px solid ${GOLD}50`,
      background: open ? `${GOLD}10` : `${GOLD}06`,
      transition:'background .2s',
    }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'11px 14px', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
        >
          <span style={{ fontSize:16, lineHeight:1 }}>💡</span>
          <span style={{ fontSize:13, fontWeight:700, color:GOLD }}>Need a hint?</span>
          <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-tert)', fontWeight:600 }}>Tap to reveal</span>
        </button>
      ) : (
        <div style={{ padding:'12px 14px' }}>
          <div style={{ fontSize:10, fontWeight:900, color:GOLD, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:7, display:'flex', alignItems:'center', gap:5 }}>
            <span>💡</span>
            <span>Hint</span>
          </div>
          <MathText
            text={hint}
            as="p"
            className=""
            style={{ fontSize:13, color:'var(--text-prim)', lineHeight:1.65, margin:0, fontWeight:500 }}
          />
        </div>
      )}
    </div>
  )
}

// ─── EXPLANATION BLOCK ────────────────────────────────────────────────────────
// Schema: { concept, formula_box, variables_key, intro, steps, answer_note, study_tip }
// All math rendered via MathText (KaTeX). No legacy schema.
function ExplanationBlock({ explanation, isCorrect, dark }) {
  if (!explanation) return null
  const exp = explanation

  const concept      = exp.concept       ?? ''
  const formulaBox   = exp.formula_box   ?? ''
  const variablesKey = exp.variables_key ?? []
  const intro        = exp.intro         ?? ''
  const answerNote   = exp.answer_note   ?? exp.correct ?? ''
  const studyTip     = exp.study_tip     ?? ''
  const svgDiagram   = exp.svg_diagram   ?? ''

  const steps = Array.isArray(exp.steps)
    ? exp.steps.filter(s => s && (s.title || (Array.isArray(s.lines) && s.lines.length)))
    : []

  const hasSteps = steps.length > 0
  const bgColor  = dark ? 'rgba(255,255,255,.04)' : '#fff'

  return (
    <div style={{ marginTop:14, borderRadius:16, border:`1px solid var(--border)`, background:bgColor, overflow:'hidden', boxShadow: dark ? 'none' : '0 2px 12px rgba(6,42,120,.06)' }}>

      {/* ── HEADER: "Explanation" label + concept pill ── */}
      <div style={{ padding:'16px 18px 14px', borderBottom: (formulaBox || hasSteps || svgDiagram) ? `1px solid var(--border)` : 'none' }}>
        <div style={{ fontSize:11, fontWeight:900, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom: concept ? 6 : 0 }}>
          Explanation
        </div>
        {concept && (
          <div style={{ fontSize:14, fontWeight:800, color:BLUE }}>{concept}</div>
        )}
        {intro && (
          <p style={{ fontSize:14, color:'var(--text-sec)', lineHeight:1.65, margin:`${concept ? 8 : 4}px 0 0` }}>{intro}</p>
        )}
      </div>

      <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* ── FORMULA BOX — above the steps ── */}
        <FormulaBox formulaBox={formulaBox} variablesKey={variablesKey}/>

        {/* ── SVG DIAGRAM ── */}
        {svgDiagram && svgDiagram.trim().toLowerCase().startsWith('<svg') && (
          <div style={{ borderRadius:12, overflow:'hidden', border:`1px solid var(--border)`, background:'#fff' }}>
            <div style={{ padding:'6px 12px', background:'var(--bg-subtle)', borderBottom:`1px solid var(--border)` }}>
              <span style={{ fontSize:10, fontWeight:900, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em' }}>Diagram</span>
            </div>
            <div
              style={{ display:'flex', justifyContent:'center', padding:12, overflowX:'auto' }}
              dangerouslySetInnerHTML={{
                __html: svgDiagram
                  .replace(/<script[\s\S]*?<\/script>/gi, '')
                  .replace(/\son\w+="[^"]*"/gi, '')
              }}
            />
          </div>
        )}

        {/* ── STEPS ── */}
        {hasSteps && (
          <div style={{ borderRadius:12, border:`1px solid var(--border)`, overflow:'hidden' }}>
            {steps.map((step, si) => {
              const lines = Array.isArray(step.lines) ? step.lines : []
              return (
                <div
                  key={si}
                  style={{
                    borderBottom: si < steps.length - 1 ? `1px solid var(--border)` : 'none',
                    padding:'13px 16px',
                    background: dark ? 'rgba(255,255,255,.02)' : 'rgba(6,42,120,.015)',
                  }}
                >
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <div style={{ height:22, borderRadius:999, background:`${BLUE}18`, border:`1px solid ${BLUE}35`, padding:'0 10px', display:'flex', alignItems:'center', flexShrink:0, marginTop:2 }}>
                      <span style={{ fontSize:11, fontWeight:900, color:BLUE, whiteSpace:'nowrap' }}>Step {si + 1}</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      {step.title && (
                        <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom: lines.length ? 6 : 0, lineHeight:1.4 }}>
                          {step.title}
                        </div>
                      )}
                      {lines.map((line, li) => (
                        <div key={li} style={{ fontSize:15, lineHeight:2.2, overflowX:'auto' }}>
                          <MathText text={line} as="span" className=""/>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ANSWER NOTE ── */}
        {answerNote && (
          <div style={{ padding:'13px 16px', borderRadius:12, background:`${GREEN}10`, border:`1.5px solid ${GREEN}35`, display:'flex', alignItems:'flex-start', gap:10 }}>
            <div style={{ width:22, height:22, borderRadius:6, background:GREEN, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
              <span style={{ fontSize:13, color:'#fff', fontWeight:900 }}>✓</span>
            </div>
            <span style={{ fontSize:14, fontWeight:600, color:'var(--text-prim)', lineHeight:1.65 }}>{answerNote}</span>
          </div>
        )}

        {/* ── STUDY TIP ── */}
        {studyTip && (
          <div style={{ padding:'11px 14px', borderRadius:11, background: dark?'rgba(255,184,0,.08)':'rgba(255,184,0,.07)', border:`1px solid rgba(255,184,0,.25)`, display:'flex', alignItems:'flex-start', gap:9 }}>
            <span style={{ fontSize:14, flexShrink:0 }}>📌</span>
            <div>
              <div style={{ fontSize:10, fontWeight:900, color:GOLD, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Study Tip</div>
              <span style={{ fontSize:13, color:'var(--text-sec)', lineHeight:1.6 }}>{studyTip}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── CALCULATOR ───────────────────────────────────────────────────────────────
function Calculator({ onClose, dark }) {
  const [display, setDisplay] = useState('0')
  const [memory,  setMemory]  = useState(null)
  const [op,      setOp]      = useState(null)
  const [waitNext,setWaitNext]= useState(false)

  function press(v) {
    if (v==='C')   { setDisplay('0'); setMemory(null); setOp(null); setWaitNext(false); return }
    if (v==='⌫')   { setDisplay(d => d.length>1 ? d.slice(0,-1) : '0'); return }
    if (v==='±')   { setDisplay(d => d.startsWith('-') ? d.slice(1) : '-'+d); return }
    if (v==='%')   { setDisplay(d => String(parseFloat(d)/100)); return }
    if (v==='x²')  { setDisplay(d => String(parseFloat(d)**2)); return }
    if (v==='√')   { setDisplay(d => { const r=Math.sqrt(parseFloat(d)); return isNaN(r)?'Error':String(parseFloat(r.toFixed(10))) }); return }
    if (v==='log') { setDisplay(d => { const r=Math.log10(parseFloat(d)); return isNaN(r)?'Error':String(parseFloat(r.toFixed(10))) }); return }
    if (v==='ln')  { setDisplay(d => { const r=Math.log(parseFloat(d)); return isNaN(r)?'Error':String(parseFloat(r.toFixed(10))) }); return }
    if (v==='π')   { setDisplay(String(Math.PI.toFixed(8))); setWaitNext(false); return }
    if (['+','-','×','÷','xʸ'].includes(v)) { setMemory(parseFloat(display)); setOp(v==='xʸ'?'^':v); setWaitNext(true); return }
    if (v==='=') {
      if (!op||memory===null) return
      const b=parseFloat(display), a=memory
      const r = op==='+'?a+b:op==='-'?a-b:op==='×'?a*b:op==='÷'?(b===0?NaN:a/b):op==='^'?a**b:NaN
      setDisplay(isNaN(r)?'Error':String(parseFloat(r.toFixed(10))))
      setMemory(null); setOp(null); setWaitNext(false); return
    }
    if (v==='.') { if (waitNext){setDisplay('0.');setWaitNext(false)}else setDisplay(d=>d.includes('.')?d:d+'.'); return }
    if (waitNext) { setDisplay(v); setWaitNext(false) }
    else setDisplay(d => d==='0'?v:d.length>12?d:d+v)
  }

  const rows = [
    ['log','ln','xʸ','√','x²'],
    ['π','%','±','⌫','C'],
    ['7','8','9','÷',''],
    ['4','5','6','×',''],
    ['1','2','3','-',''],
    ['0','.','=','+',''],
  ]

  return (
    <div style={{ position:'fixed', bottom:84, right:14, zIndex:400, width:'clamp(252px, 320px, 340px)', background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border)', boxShadow:'0 16px 48px rgba(0,0,0,.35)', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 13px', borderBottom:'1px solid var(--border)' }}>
        <span style={{ fontSize:11, fontWeight:800, color:'var(--text-tert)' }}>Calculator</span>
        <button onClick={onClose} style={{ width:22, height:22, borderRadius:5, background:'var(--bg-subtle)', border:'none', cursor:'pointer', fontSize:14, color:'var(--text-tert)' }}>×</button>
      </div>
      <div style={{ padding:'10px 12px 6px', textAlign:'right' }}>
        {op && memory!==null && <div style={{ fontSize:10, color:'var(--text-tert)', marginBottom:1 }}>{memory} {op==='+'?'+':op==='-'?'−':op==='×'?'×':op==='÷'?'÷':op}</div>}
        <div style={{ fontSize:30, fontWeight:900, color:'var(--text-prim)', fontFamily:"'Courier New',monospace", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{display}</div>
      </div>
      <div style={{ padding:'6px 10px 12px', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
        {rows.flat().map((v,i) => {
          const isOp  = ['+','-','×','÷'].includes(v)
          const isSci = ['log','ln','xʸ','√','x²','π'].includes(v)
          const isEq  = v==='='
          const isDel = v==='⌫'||v==='C'
          return (
            <button key={i} onClick={() => v && press(v)}
              style={{ padding:'13px 4px', borderRadius:10, border:`1px solid ${isEq?BLUE:isOp?`${BLUE}40`:'var(--border)'}`,
                background: isEq?BLUE:isOp?`${BLUE}12`:isSci?`${ORANGE}10`:isDel?`${RED}10`:'var(--bg-subtle)',
                color: isEq?'#fff':isOp?BLUE:isSci?ORANGE:isDel?RED:'var(--text-prim)',
                fontSize: v&&v.length>2?12:15, fontWeight:800, cursor:v?'pointer':'default', fontFamily:'inherit',
                opacity:v?1:0, pointerEvents:v?'all':'none' }}>
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── QUESTION CARD ────────────────────────────────────────────────────────────
// reviewMode=true: show correct answer, no interaction, full explanation visible
function QuestionCard({ question, qIndex, total, onAnswer, onNext, onPrev, sessionType, speedSecs, onSpeedTimeUp, dark, alreadyAnswered, reviewMode, hideExplanation=false }) {
  const isStudy  = sessionType === 'study'

  // Shuffle options once per question mount
  const [shuffledOptions, setShuffledOptions] = useState([])
  useEffect(() => {
    const raw = normaliseOptions(question.options)
    // Build array of {text, originalIdx} then shuffle
    const withIdx = raw.map((text, i) => ({ text, originalIdx: i }))
    for (let i = withIdx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [withIdx[i], withIdx[j]] = [withIdx[j], withIdx[i]]
    }
    setShuffledOptions(withIdx)
  }, [question.id])

  const [selected, setSelected] = useState(alreadyAnswered?.selectedIdx ?? null)
  const [revealed, setRevealed] = useState(reviewMode || alreadyAnswered !== null)
  // Study mode: track attempts for "try again" before full reveal
  const [studyAttempts, setStudyAttempts] = useState(0)
  const [studyWrong,    setStudyWrong]    = useState(false)  // first wrong attempt shown

  useEffect(() => { injectMathStyles() }, [])

  useEffect(() => {
    setSelected(alreadyAnswered?.selectedIdx ?? null)
    setRevealed(reviewMode || alreadyAnswered !== null)
    setStudyAttempts(0)
    setStudyWrong(false)
  }, [qIndex, question.id, reviewMode])

  function handleSelect(opt, idx) {
    if (reviewMode) return
    if (isStudy) {
      if (revealed) return  // already finalised
      setSelected(idx)
      const correct = checkCorrect(shuffledOptions.map(o => o.text), idx, question.correct_answer)
      if (correct) {
        // Correct on any attempt — reveal fully
        setRevealed(true)
        setStudyWrong(false)
      } else {
        const attempts = studyAttempts + 1
        setStudyAttempts(attempts)
        if (attempts >= 2) {
          // Second wrong attempt — reveal answer
          setRevealed(true)
          setStudyWrong(false)
        } else {
          // First wrong attempt — show nudge, don't reveal
          setStudyWrong(true)
        }
      }
    } else {
      // Practice mode — just highlight selection
      if (revealed) return
      setSelected(idx)
    }
  }

  function handleNextClick() {
    if (reviewMode) { onNext?.(); return }
    const opts = shuffledOptions.map(o => o.text)
    const isCorrect = selected !== null ? checkCorrect(opts, selected, question.correct_answer) : false
    onNext?.({ selectedIdx: selected, isCorrect })
  }

  function getState(idx) {
    const opts = shuffledOptions.map(o => o.text)
    if (reviewMode) {
      const isCorrectOpt = opts[idx] === question.correct_answer || LETTERS[idx] === question.correct_answer
      const wasSelected  = alreadyAnswered?.selectedIdx === idx
      if (isCorrectOpt) return 'correct'
      if (wasSelected && !isCorrectOpt) return 'wrong'
      return 'idle'
    }
    if (isStudy) {
      if (!revealed && !studyWrong) return selected === idx ? 'chosen' : 'idle'
      if (studyWrong && !revealed) {
        // Show selected as wrong, others idle
        return selected === idx ? 'wrong' : 'idle'
      }
      // Fully revealed in study mode
      const isCorrectOpt = opts[idx] === question.correct_answer || LETTERS[idx] === question.correct_answer
      if (isCorrectOpt) return 'correct'
      if (idx === selected && !isCorrectOpt) return 'wrong'
      return 'idle'
    }
    // Practice mode: neutral chosen state only
    return selected === idx ? 'chosen' : 'idle'
  }

  const SS = {
    idle:    { bg: dark?'rgba(255,255,255,.04)':'rgba(6,42,120,.025)', border:'var(--border)',   text:'var(--text-prim)', pill: dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)' },
    chosen:  { bg:`${BLUE}12`, border:BLUE, text:BLUE, pill:BLUE },
    correct: { bg:`${GREEN}10`, border:GREEN, text:GREEN, pill:`${GREEN}35` },
    wrong:   { bg:`${RED}08`,  border:RED,   text:RED,   pill:`${RED}28`  },
  }

  const opts = shuffledOptions.map(o => o.text)
  const isCorrectSelected = selected !== null && checkCorrect(opts, selected, question.correct_answer)
  const isLast = qIndex >= total - 1
  const hasPrev = qIndex > 0

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      {/* Meta + copy button */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {question.topic_name ?? ''}
        </span>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {speedSecs && !revealed && !reviewMode && (
            <QuestionCountdown key={qIndex} secs={speedSecs} onTimeUp={onSpeedTimeUp}/>
          )}
          {question.year && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'var(--bg-subtle)', border:'1px solid var(--border)', color:'var(--text-tert)' }}>{question.year}</span>}
        </div>
      </div>

      {/* Question text */}
      <div style={{ fontSize:18, fontWeight:700, color:'var(--text-prim)', lineHeight:1.75, marginBottom:22, userSelect:'none', WebkitUserSelect:'none' }}>
        <MathText text={question.text ?? question.question_text ?? ''} as="span" className=""/>
      </div>

      {/* Hint — always available before answer is finalised (both study and practice) */}
      {!revealed && !studyWrong && !reviewMode && question.hint && (
        <HintBlock hint={question.hint}/>
      )}
      {/* Study wrong attempt — show nudge, keep hint available */}
      {studyWrong && !revealed && (
        <div style={{ marginBottom:12, padding:'12px 14px', borderRadius:14, background:`${RED}08`, border:`1.5px solid ${RED}30`, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18, flexShrink:0 }}>❌</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:800, color:RED, marginBottom:2 }}>Not quite — try again!</div>
            <div style={{ fontSize:11, color:'var(--text-tert)' }}>One more attempt before the answer is revealed.</div>
          </div>
        </div>
      )}
      {studyWrong && !revealed && question.hint && (
        <HintBlock hint={question.hint}/>
      )}
      {/* Practice mode: no hint data — still show nudge linking to lesson */}
      {!revealed && !reviewMode && !question.hint && !isStudy && (
        <div style={{ marginBottom:12, display:'flex', alignItems:'center', gap:6, padding:'8px 12px', borderRadius:12, border:`1px dashed ${GOLD}40`, background:`${GOLD}05` }}>
          <span style={{ fontSize:14 }}>💡</span>
          <span style={{ fontSize:12, color:'var(--text-tert)', fontWeight:600 }}>Need a hint? Study this topic in </span>
          <span style={{ fontSize:12, fontWeight:800, color:GOLD }}>Lesson Mode</span>
          <span style={{ fontSize:12, color:'var(--text-tert)', fontWeight:600 }}> for guided explanations.</span>
        </div>
      )}

      {/* Options */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {opts.map((opt, idx) => {
          const state = getState(idx)
          const s = SS[state]
          const isDisabled = reviewMode || (revealed && isStudy && state === 'idle')
          return (
            <button key={idx} onClick={() => handleSelect(opt, idx)}
              disabled={isDisabled}
              style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 18px', borderRadius:14, border:`2px solid ${s.border}`, background:s.bg, cursor:isDisabled?'default':'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .14s', width:'100%' }}>
              <div style={{ width:32, height:32, borderRadius:10, background: state==='idle'?s.pill:s.border, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color: state==='idle'?'var(--text-tert)':'#fff', fontSize:13, fontWeight:900, transition:'all .14s' }}>
                {(state==='correct'&&(reviewMode||isStudy)) ? '✓' : (state==='wrong'&&(reviewMode||isStudy)&&revealed) ? '✗' : LETTERS[idx]}
              </div>
              <span style={{ fontSize:15, fontWeight: state==='correct'?700:600, color:s.text, lineHeight:1.5, flex:1 }}><MathText text={String(opt ?? '')} as="span" className=""/></span>
            </button>
          )
        })}
      </div>

      {/* Study mode: result banner after full reveal */}
      {revealed && isStudy && !reviewMode && (
        <div style={{ marginTop:14, padding:'13px 16px', borderRadius:14, background: isCorrectSelected?`${GREEN}12`:`${RED}08`, border:`1px solid ${isCorrectSelected?GREEN+'40':RED+'30'}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background: isCorrectSelected?GREEN:RED, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:20, color:'#fff', fontWeight:900 }}>{isCorrectSelected?'✓':'✗'}</span>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:900, color: isCorrectSelected?GREEN:RED }}>
                {isCorrectSelected ? 'Correct! Well done! 🎉' : 'Not quite'}
              </div>
              {!isCorrectSelected && question.correct_answer && (
                <div style={{ fontSize:12, color:'var(--text-tert)', marginTop:2 }}>
                  Correct answer: <strong style={{ color:GREEN }}>{question.correct_answer}</strong>
                </div>
              )}
            </div>
          </div>
          {isCorrectSelected && <span style={{ fontSize:13, fontWeight:900, color:GOLD }}>+10 XP</span>}
        </div>
      )}

      {/* Explanation — inline (mobile + non-desktop review) */}
      {!hideExplanation && (revealed || reviewMode) && question.explanation && (
        <div className="inline-explanation">
          <ExplanationBlock explanation={question.explanation} isCorrect={reviewMode ? alreadyAnswered?.isCorrect : isCorrectSelected} dark={dark}/>
        </div>
      )}

      {/* Navigation buttons */}
      <div style={{ marginTop:18, display:'flex', gap:10 }}>
        {hasPrev && (
          <button onClick={onPrev}
            style={{ flex:1, padding:'13px', borderRadius:13, border:'1px solid var(--border)', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:13, background:'transparent', color:'var(--text-sec)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Prev
          </button>
        )}

        <button onClick={handleNextClick}
          style={{ flex:2, padding:'13px', borderRadius:13, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', boxShadow:`0 4px 0 #0a3fa0,0 6px 16px ${BLUE}40`, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
          {reviewMode
            ? (isLast ? 'Back to Results' : 'Next →')
            : (isStudy && !revealed && studyAttempts === 0 && selected !== null ? 'Check Answer'
              : isLast ? 'Submit' : 'Next')
          }
          {!reviewMode && <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
      </div>
    </div>
  )
}

// ─── REVIEW MODE (same session UI, question by question with solution shown) ──
function ReviewSession({ questions, answers, onDone, dark }) {
  const [rIndex, setRIndex] = useState(0)

  function handleNext() {
    if (rIndex < questions.length - 1) setRIndex(i => i + 1)
    else onDone()
  }
  function handlePrev() { setRIndex(i => Math.max(0, i - 1)) }

  const q = questions[rIndex]
  const a = answers[rIndex]

  // Build nav state
  const navMap = {}
  for (let i = 0; i < questions.length; i++) {
    navMap[i] = { answered: true, correct: answers[i]?.isCorrect ?? false, skipped: !answers[i] }
  }

  return (
    <div style={{ height:'100dvh', background:'var(--bg-base)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`*{box-sizing:border-box}`}</style>

      {/* Top bar */}
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

      {/* Body — side by side on desktop, stacked on mobile */}
      <style>{`
        @media (min-width: 1024px) {
          .rev-body { flex-direction: row !important; }
          .rev-q-col { max-width: 640px !important; padding: 32px 40px !important; }
          .rev-exp-col { display: flex !important; flex: 1 !important; min-width: 360px !important; max-width: 560px !important; flex-shrink: 0 !important; border-left: 1px solid var(--border); overflow-y: auto; flex-direction: column; padding: 32px 28px !important; }
          .rev-q-col .inline-explanation { display: none !important; }
        }
        @media (max-width: 1023px) {
          .rev-exp-col { display: none !important; }
        }
      `}</style>
      <div className="rev-body" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>

        {/* Question column — mobile: full width + inline explanation. Desktop: left column, hideExplanation */}
        <div className="rev-q-col" style={{ flex:1, overflowY:'auto', padding:'20px 16px' }}>
          {q && (
            <QuestionCard
              key={q.id + '-review-' + rIndex}
              question={q}
              qIndex={rIndex}
              total={questions.length}
              onAnswer={() => {}}
              onNext={handleNext}
              onPrev={handlePrev}
              sessionType="study"
              dark={dark}
              alreadyAnswered={a ?? { selectedIdx: null, isCorrect: false }}
              reviewMode={true}
              hideExplanation={false}
            />
          )}
        </div>

        {/* Explanation column — desktop only (hidden on mobile, shown inline above) */}
        <div className="rev-exp-col" style={{ display:'none' }}>
          {q?.explanation ? (
            <ExplanationBlock explanation={q.explanation} isCorrect={a?.isCorrect} dark={dark}/>
          ) : (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center' }}>
              <div style={{ fontSize:13, color:'var(--text-tert)' }}>No explanation available</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigator */}
      <QuestionNav
        total={questions.length}
        current={rIndex}
        answerMap={navMap}
        onJump={setRIndex}
        sessionType="study"
      />
    </div>
  )
}

// ─── RESULTS SCREEN ───────────────────────────────────────────────────────────
// ─── RESULTS SCREEN — matches mockup ────────────────────────────────────────
function ScoreRing({ pct: score, color, dark }) {
  const r = 54; const circ = 2 * Math.PI * r
  const dash = circ * (score / 100)
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke={dark ? 'rgba(255,255,255,.08)' : '#e8edf4'} strokeWidth="10"/>
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 70 70)"
        style={{ transition:'stroke-dasharray 1s cubic-bezier(.34,1.56,.64,1)' }}/>
      <text x="70" y="65" textAnchor="middle" fill={color} fontSize="28" fontWeight="900" fontFamily="inherit">{score}%</text>
      <text x="70" y="85" textAnchor="middle" fill={dark?'rgba(255,255,255,.45)':'#6b7280'} fontSize="11" fontWeight="700" fontFamily="inherit">Your Score</text>
    </svg>
  )
}

function ResultsScreen({ questions, answers, config, xpAwarded, streakDays, durationSecs, onRetry, onHome, onReview, dark }) {
  const correct    = answers.filter(a => a?.isCorrect).length
  const incorrect  = answers.filter(a => a && a.selectedIdx !== null && !a.isCorrect).length
  const skipped    = answers.filter(a => !a || a.selectedIdx === null).length
  const total      = answers.length
  const accuracy   = pct(correct, total)
  const scoreColor = accuracy >= 70 ? GREEN : accuracy >= 40 ? ORANGE : RED

  // Time display
  const totalSecs  = durationSecs ?? 0
  const timeMins   = Math.floor(totalSecs / 60)
  const timeSecs   = totalSecs % 60
  const timeStr    = timeMins > 0 ? `${timeMins}m ${timeSecs}s` : `${timeSecs}s`
  const avgSecs    = total > 0 ? Math.round(totalSecs / total) : 0

  // Personalised message
  const name = config?.studentName ?? ''
  const { headline, sub, tip } = (() => {
    if (accuracy >= 90) return { headline: 'Outstanding!',   sub: 'You absolutely nailed it.',                     tip: 'Practice today, Excel tomorrow! 🚀' }
    if (accuracy >= 80) return { headline: 'Great work!',    sub: 'You gave it your best shot today.',              tip: 'Consistency + Effort = Excellence 💙' }
    if (accuracy >= 70) return { headline: 'Great effort!',  sub: 'You gave it your best shot today.',              tip: 'Keep going, champion! 💪' }
    if (accuracy >= 50) return { headline: 'Keep going!',    sub: 'Every question brings you closer to success.',   tip: 'Focus on weak topics and you\'ll improve fast.' }
    return               { headline: 'Keep going!',    sub: 'Every question you attempt builds your knowledge.', tip: 'Attempt more and the scores will follow.' }
  })()

  const subjectLabel = config?.subjects?.[0] ?? ''
  const modeLabel    = { study:'Study Session', practice:'Practice', timed:'Speed Round', quick5:'Quick 5', mock:'Mock Exam' }[config?.mode] ?? 'Practice'

  // Score summary bars
  const summaryRows = [
    { label:'Accuracy',          value:`${accuracy}%`,      bar: accuracy,           color: scoreColor },
    { label:'Questions correct', value:`${correct} / ${total}`, bar: pct(correct,total), color: GREEN },
    { label:'XP earned',         value:`${xpAwarded} XP`,   bar: Math.min(100, pct(xpAwarded, 500)), color: GOLD },
    { label:'Day streak',        value:`${streakDays} days`, bar: Math.min(100, streakDays * 8),       color: ORANGE },
  ]

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg-base)' }}>
      <style>{`
        * { box-sizing: border-box }
        @media (min-width: 1024px) {
          .res-layout { display: grid !important; grid-template-columns: 1fr 380px !important; gap: 24px !important; max-width: 1100px !important; margin: 0 auto !important; padding: 32px 32px 60px !important; }
          .res-mobile-only { display: none !important; }
          .res-desktop-only { display: flex !important; }
        }
        @media (max-width: 1023px) {
          .res-layout { display: flex !important; flex-direction: column !important; padding: 0 0 80px !important; }
          .res-desktop-only { display: none !important; }
        }
      `}</style>

      <div className="res-layout">
        {/* ── LEFT / MAIN COLUMN ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Hero banner */}
          <div style={{ borderRadius:24, background:`linear-gradient(135deg,${NAVY} 0%,#0d2466 55%,#1347b0 100%)`, padding:'28px 24px', position:'relative', overflow:'hidden', minHeight:160 }}>
            {/* Decorative dots */}
            {[['-20px','60%','#FFB800'],['-10px','70%','#18B7F2'],['20px','75%','#fff']].map(([t,r,c],i)=>(
              <div key={i} style={{ position:'absolute', top:t, right:r, width:8, height:8, borderRadius:'50%', background:c, opacity:.5 }}/>
            ))}
            <div style={{ position:'absolute', top:-30, right:-20, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>

            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
              <div style={{ flex:1 }}>
                {subjectLabel && (
                  <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.45)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.1em' }}>
                    {subjectLabel} · {modeLabel}
                  </div>
                )}
                <div style={{ fontSize:26, fontWeight:900, color:'#fff', lineHeight:1.2, marginBottom:6 }}>
                  {headline}{name ? `, ${name}` : ''}! 🎉
                </div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.6)', marginBottom:16, lineHeight:1.5 }}>{sub}</div>
                <div style={{ fontSize:12, fontWeight:800, color:GOLD }}>
                  {tip}
                </div>
                {/* Action buttons inside hero on mobile */}
                <div style={{ display:'flex', gap:10, marginTop:20 }}>
                  <button onClick={onReview}
                    style={{ padding:'11px 20px', borderRadius:11, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:13, fontWeight:900, fontFamily:'inherit', boxShadow:`0 4px 0 #0a3fa0` }}>
                    Review Answers
                  </button>
                  <button onClick={onHome}
                    style={{ padding:'11px 20px', borderRadius:11, cursor:'pointer', background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>
                    Back to Practice
                  </button>
                </div>
              </div>
              {/* Mascot */}
              <div style={{ width:110, flexShrink:0, alignSelf:'flex-end' }}>
                <img src="/images/zara_studybuddy.png" alt="" style={{ width:'100%', objectFit:'contain', filter:'drop-shadow(0 4px 16px rgba(0,0,0,.4))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
              </div>
            </div>
          </div>

          {/* Stats row — Score ring + 4 stat cells */}
          <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', padding:'18px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:16 }}>
            {/* Score ring */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ScoreRing pct={accuracy} color={scoreColor} dark={dark}/>
            </div>
            {/* Stats grid — 2-col on all screen sizes; score ring stacks above on mobile */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { icon:'✅', label:'Correct',    value:correct,       sub:`/ ${total}`,          color:GREEN  },
                { icon:'❌', label:'Incorrect',  value:incorrect,     sub:`/ ${total}`,          color:RED    },
                { icon:'⚡', label:'XP Earned',  value:`+${xpAwarded}`, sub:`XP`,               color:GOLD   },
                { icon:'⏱️', label:'Time Taken', value:timeStr,       sub:avgSecs>0?`~${avgSecs}s/Q`:'', color:BLUE },
              ].map((s,i) => (
                <div key={i} style={{ background:'var(--bg-subtle)', borderRadius:14, padding:'12px 14px' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>
                    {s.icon} {s.label}
                  </div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                    <span style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</span>
                    {s.sub && <span style={{ fontSize:11, color:'var(--text-tert)', fontWeight:600 }}>{s.sub}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div></div>

          {/* Score summary bars */}
          <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', padding:'20px' }}>
            <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', marginBottom:16 }}>Score Summary</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {summaryRows.map((row, i) => (
                <div key={i}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--text-sec)' }}>{row.label}</span>
                    <span style={{ fontSize:12, fontWeight:900, color:row.color }}>{row.value}</span>
                  </div>
                  <div style={{ height:7, borderRadius:999, background:'var(--bg-subtle)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${row.bar}%`, borderRadius:999, background:row.color, transition:'width .9s cubic-bezier(.34,1.56,.64,1)' }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Motivational tip card */}
          <div style={{ borderRadius:18, background: dark?'rgba(255,184,0,.08)':'rgba(255,241,194,.6)', border:`1px solid ${GOLD}35`, padding:'16px 18px', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:32, flexShrink:0 }}>📈</div>
            <div>
              <div style={{ fontSize:11, fontWeight:900, color:GOLD, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Remember</div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>Practice today, Excel tomorrow! 🚀</div>
            </div>
          </div>

          {/* Bottom actions (mobile) */}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onRetry}
              style={{ flex:1, padding:'14px', borderRadius:14, border:'1px solid var(--border)', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:14, background:'var(--bg-card)', color:'var(--text-sec)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Try Again
            </button>
            <button onClick={onReview}
              style={{ flex:2, padding:'14px', borderRadius:14, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:900, fontSize:14, background:BLUE, color:'#fff', boxShadow:`0 5px 0 #0a3fa0,0 8px 20px ${BLUE}40`, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" stroke="#fff" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="2"/></svg>
              Review Answers
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN (desktop only) ── */}
        <div className="res-desktop-only" style={{ flexDirection:'column', gap:16 }}>

          {/* XP / level card */}
          <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', padding:'20px' }}>
            <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)', marginBottom:16 }}>Your Performance</div>
            <div style={{ textAlign:'center', padding:'8px 0 16px' }}>
              <div style={{ fontSize:48, marginBottom:4 }}>🏅</div>
              <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', marginBottom:4 }}>
                {accuracy >= 80 ? "You're building great momentum!" : accuracy >= 60 ? "Good progress!" : "Keep at it!"}
              </div>
              <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5 }}>
                {accuracy >= 80 ? "The more you practice, the stronger you become." : "Every session makes you better."}
              </div>
            </div>
            {/* XP bar */}
            <div style={{ marginTop:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)' }}>XP this session</span>
                <span style={{ fontSize:11, fontWeight:900, color:GOLD }}>+{xpAwarded} XP</span>
              </div>
              <div style={{ height:8, borderRadius:999, background:'var(--bg-subtle)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.min(100, pct(xpAwarded, 300))}%`, background:`linear-gradient(90deg,${GOLD},${ORANGE})`, borderRadius:999, transition:'width .8s ease' }}/>
              </div>
            </div>
          </div>

          {/* Quick stats vertical */}
          <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', padding:'20px' }}>
            <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)', marginBottom:14 }}>Session Stats</div>
            {[
              { label:'Total Questions', value:`${total}`,            color:'var(--text-prim)' },
              { label:'Correct',         value:`${correct}`,          color:GREEN },
              { label:'Incorrect',       value:`${incorrect}`,        color:RED   },
              { label:'Skipped',         value:`${skipped}`,          color:ORANGE },
              { label:'Time taken',      value:timeStr,               color:BLUE  },
              { label:'Avg. per question', value:`${avgSecs}s`,       color:'var(--text-sec)' },
              { label:'Day streak',      value:`${streakDays} day${streakDays !== 1 ? 's' : ''}`, color:ORANGE },
            ].map((r,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i < 6 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize:12, color:'var(--text-tert)', fontWeight:600 }}>{r.label}</span>
                <span style={{ fontSize:13, fontWeight:900, color:r.color }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* What's next */}
          <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', padding:'20px' }}>
            <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)', marginBottom:8 }}>What&apos;s Next?</div>
            <p style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.6, marginBottom:14 }}>
              {accuracy >= 70 ? 'Keep the momentum going with another session.' : 'Practice your weak topics to improve faster.'}
            </p>
            <button onClick={onRetry}
              style={{ width:'100%', padding:'12px', borderRadius:12, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:13, fontWeight:900, fontFamily:'inherit', boxShadow:`0 4px 0 #0a3fa0` }}>
              Practice Again →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function PracticeSessionPage() {
  const router   = useRouter()
  const { dark } = useTheme()
  const { totalPoints: currentXP, setTotalPoints, showXPToast } = usePoints()

  const [phase,     setPhase]    = useState('loading')
  const [questions, setQuestions]= useState([])
  const [qIndex,    setQIndex]   = useState(0)
  const [answerMap, setAnswerMap]= useState({})  // { [idx]: answer entry }
  const [skipped,   setSkipped]  = useState(new Set())
  const [config,    setConfig]   = useState(null)
  const [saveData,  setSaveData] = useState(null)
  const [errMsg,    setErrMsg]   = useState('')
  const [showEnd,   setShowEnd]  = useState(false)
  const [dialogMode, setDialogMode] = useState('end')  // 'end' | 'submit'
  const [showCalc,  setShowCalc] = useState(false)

  const startTimeRef = useRef(Date.now())
  const sessionIdRef = useRef(crypto.randomUUID())

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cfg
    try { cfg = JSON.parse(sessionStorage.getItem('practice_config') || '{}') }
    catch { cfg = {} }
    if (!cfg.subjects?.length && !cfg.subject_id) { setErrMsg('No practice configuration found. Go back and set up a session.'); setPhase('error'); return }
    setConfig(cfg)
    const p = new URLSearchParams({ exam: cfg.examType||'WAEC', subjects:(cfg.subjects||[]).join(','), count:String(cfg.count||20), mode:cfg.mode||'practice' })
    if (cfg.subject_id) p.set('subject_id', cfg.subject_id)
    if (cfg.topic_id)   p.set('topic_id',   cfg.topic_id)
    fetch(`/api/student/questions?${p}`)
      .then(r => r.json())
      .then(data => {
        if (!data.questions?.length) { setErrMsg(`No questions found for ${cfg.subjects?.join(', ')}.`); setPhase('error'); return }
        setQuestions(data.questions)
        startTimeRef.current = Date.now()
        try { localStorage.setItem('ep_pending_session', JSON.stringify({ session_id: sessionIdRef.current, config: cfg, savedAt: Date.now() })) } catch {}
        setPhase('session')
      })
      .catch(() => { setErrMsg('Failed to load questions. Check your connection and try again.'); setPhase('error') })
  }, [])

  // ── Record answer into the map (no auto-advance — Next button controls nav) ──
  const recordAnswer = useCallback((idx, answer) => {
    const q = questions[idx]
    const entry = {
      question_id: q.id, topic_id: q.topic_id, subject_id: q.subject_id,
      isCorrect: answer.isCorrect, is_correct: answer.isCorrect,
      selectedIdx: answer.selectedIdx, time_taken_ms: answer.timeTakenMs || 0,
    }
    setAnswerMap(prev => ({ ...prev, [idx]: entry }))
    setSkipped(prev => { const s = new Set(prev); s.delete(idx); return s })
  }, [questions])

  // ── handleNext — called by QuestionCard's Next/Submit button ──────────────
  // Receives { selectedIdx, isCorrect } from the card (may be null if unanswered)
  function handleNext({ selectedIdx, isCorrect } = {}) {
    const isLast = qIndex >= questions.length - 1

    // Record the answer if one was selected
    if (selectedIdx !== null && selectedIdx !== undefined) {
      recordAnswer(qIndex, { isCorrect, selectedIdx, timeTakenMs: 0 })
    } else {
      // No answer selected — mark as skipped
      setSkipped(prev => new Set([...prev, qIndex]))
    }

    if (isLast) {
      // Last question — show submit confirmation
      setDialogMode('submit')
      setShowEnd(true)
    } else {
      setQIndex(i => i + 1)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function saveSession(mapOverride) {
    setPhase('saving')
    const map          = mapOverride ?? answerMap
    const durationSecs = msToSecs(Date.now() - startTimeRef.current)
    const results      = questions.map((q, i) => map[i] ?? {
      question_id:  q.id,
      topic_id:     q.topic_id,
      subject_id:   q.subject_id,
      isCorrect:    false,
      is_correct:   false,
      selectedIdx:  null,
      time_taken_ms: 0,
    })

    const subjectName = config?.subjects?.[0] ?? 'Mixed'
    const payload = {
      session_id:   sessionIdRef.current,
      exam:         config?.examType || 'WAEC',
      mode:         config?.mode    || 'practice',
      subject_name: subjectName,
      results,
      duration_secs: durationSecs,
    }

    // ── Step 1: Save locally first — instant, never fails ───────────────────
    // This writes to ep_session_history, ep_activity, and ep_sync_queue.
    // The user sees their results immediately regardless of network state.
    const correct    = results.filter(r => r.is_correct).length
    const localXP    = Math.max(5,
      results.filter(r => r.selectedIdx !== null).length * 5 +
      correct * 10 +
      (results.length > 0 && Math.round((correct/results.length)*100) >= 80 ? 50
        : Math.round((correct/results.length)*100) >= 60 ? 25 : 0)
    )
    saveSessionLocally(payload, localXP)
    try { localStorage.removeItem('ep_pending_session') } catch {}

    // Show results immediately with local XP
    setTotalPoints((currentXP || 0) + localXP)
    showXPToast(localXP, 'Practice session done!')
    setSaveData({ xp_awarded: localXP, streak_days: 0, duration_secs: durationSecs })
    setPhase('results')

    // ── Step 2: Flush queue to server in background ──────────────────────────
    // For auth users: syncs immediately, updates server XP + mastery.
    // For guests: server returns ok+guest, session stays queued.
    //   When the guest creates an account and logs in, syncOnLogin() is called
    //   and all queued sessions land in Supabase automatically.
    flushSyncQueue().then(synced => {
      if (synced > 0) {
        // Re-fetch authoritative XP from server and update context
        // (non-blocking — user already sees local XP from above)
        fetch('/api/student/profile')
          .then(r => r.ok ? r.json() : null)
          .then(prof => { if (prof?.total_points) setTotalPoints(prof.total_points) })
          .catch(() => {})
      }
    }).catch(() => {})
  }

  const handleTimeUp = useCallback(() => saveSession(), [answerMap, questions])

  const handleSpeedTimeUp = useCallback(() => {
    const q = questions[qIndex]
    const entry = { question_id:q.id, topic_id:q.topic_id, subject_id:q.subject_id, isCorrect:false, is_correct:false, selectedIdx:null, time_taken_ms:(config?.speedSecs??30)*1000 }
    const newMap = { ...answerMap, [qIndex]: entry }
    setAnswerMap(newMap)
    if (qIndex < questions.length - 1) setQIndex(i => i + 1)
    else saveSession(newMap)
  }, [qIndex, questions, answerMap, config])

  // ── Derived ───────────────────────────────────────────────────────────────
  const sessionType     = config?.sessionType ?? 'practice'
  const isSpeedRound    = config?.mode === 'timed'
  const hasOverallTimer = !isSpeedRound && !!(config?.durationSecs)
  const speedSecs       = isSpeedRound ? (config?.speedSecs ?? 30) : null
  const answeredCount   = Object.keys(answerMap).length
  const answersArray    = questions.map((_, i) => answerMap[i] ?? null)
  const subjectLabel    = config?.subjects?.[0] ?? ''
  const modeLabel       = { study:'Study', practice:'Practice', timed:'Speed Round', quick5:'Quick 5', mock:'Mock Exam' }[config?.mode] ?? 'Practice'
  const q               = questions[qIndex]

  const navAnswerMap = {}
  for (let i = 0; i < questions.length; i++) {
    navAnswerMap[i] = { answered:!!answerMap[i], correct:answerMap[i]?.isCorrect??null, skipped:skipped.has(i) }
  }

  if (phase==='loading'||phase==='saving') return <LoadingScreen/>
  if (phase==='error')   return <ErrorScreen message={errMsg} onBack={() => router.push('/student/practice')}/>
  if (phase==='review')  return <ReviewSession questions={questions} answers={answersArray} onDone={() => setPhase('results')} dark={dark}/>
  if (phase==='results') return (
    <SessionResults
      questions={questions} answers={answersArray} config={config}
      xpAwarded={saveData?.xp_awarded??0} streakDays={saveData?.streak_days??0}
      durationSecs={saveData?.duration_secs ?? msToSecs(Date.now() - startTimeRef.current)}
      onRetry={() => router.push('/student/practice?modal=1')}
      onHome={() => router.push('/student/practice')}
      onReview={() => setPhase('review')}
      dark={dark}
    />
  )

  return (
    <>
      <style>{`
        * { box-sizing: border-box }
        @keyframes spin { to { transform: rotate(360deg) } }
        .session-q-col, .rev-q-col { user-select: none; -webkit-user-select: none; }
        /* Desktop session layout */
        @media (min-width: 1024px) {
          .session-body { flex-direction: row !important; align-items: flex-start !important; }
          .session-nav-col {
            width: 200px !important; flex-shrink: 0 !important;
            position: sticky !important; top: 0 !important;
            height: calc(100dvh - 78px) !important;
            overflow-y: auto !important;
            border-right: 1px solid var(--border) !important;
            padding: 16px 12px !important;
          }
          .session-q-col { flex: 1 !important; min-width: 0 !important; max-width: 680px !important; padding: 32px 40px !important; }
          .session-exp-col { flex: 1 !important; min-width: 360px !important; max-width: 560px !important; flex-shrink: 0 !important; padding: 32px 28px 32px 0 !important; border-left: 1px solid var(--border); }
          .session-nav-bottom { display: none !important; }
        }
        @media (max-width: 1023px) {
          .session-nav-col { display: none !important; }
          .session-exp-col { display: none !important; }
        }
      `}</style>

      {showEnd && <EndDialog answered={answeredCount} total={questions.length} mode={dialogMode} onConfirm={() => { setShowEnd(false); saveSession() }} onCancel={() => setShowEnd(false)}/>}
      {showCalc && <Calculator onClose={() => setShowCalc(false)} dark={dark}/>}

      <div style={{ height:'100dvh', background:'var(--bg-base)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* ── TOP BAR ── */}
        <div style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border)', padding:'0 16px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:52 }}>
            <button onClick={() => { setDialogMode('end'); setShowEnd(true) }}
              style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', color:'var(--text-tert)', fontSize:13, fontWeight:700, padding:0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              End
            </button>
            <div style={{ textAlign:'center', flex:1, padding:'0 10px' }}>
              <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)' }}>{subjectLabel || 'Practice Session'}</div>
              {config?.topicName && <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:1 }}>{config.topicName}</div>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {hasOverallTimer && <SessionTimer durationSecs={config.durationSecs} onTimeUp={handleTimeUp}/>}
              <button onClick={() => setShowCalc(c => !c)}
                style={{ width:32, height:32, borderRadius:9, background: showCalc?`${BLUE}15`:'var(--bg-subtle)', border:`1px solid ${showCalc?BLUE:'var(--border)'}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: showCalc?BLUE:'var(--text-tert)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 9h2M14 9h2M8 13h2M14 13h2M8 17h2M14 17h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
              <span style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', fontVariantNumeric:'tabular-nums' }}>
                {qIndex+1}<span style={{ color:'var(--border-strong)' }}>/</span>{questions.length}
              </span>
            </div>
          </div>
          <div style={{ height:4, background:'var(--bg-subtle)', overflow:'hidden', borderRadius:999 }}>
            <div style={{ height:'100%', width:`${pct(answeredCount, questions.length)}%`, background:`linear-gradient(90deg,${BLUE},${CYAN})`, borderRadius:999, transition:'width .35s ease' }}/>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0 9px' }}>
            <span style={{ fontSize:11, fontWeight:800, padding:'2px 9px', borderRadius:999, background:`${BLUE}12`, color:BLUE }}>{modeLabel}</span>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)' }}>{answeredCount}/{questions.length} answered</span>
          </div>
        </div>

        {/* ── BODY — flex row on desktop, column on mobile ── */}
        <div className="session-body" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>

          {/* LEFT: Question navigator (desktop only) */}
          <div className="session-nav-col" style={{ background:'var(--bg-card)' }}>
            <div style={{ fontSize:11, fontWeight:900, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>Questions</div>
            <QuestionNav
              total={questions.length}
              current={qIndex}
              answerMap={navAnswerMap}
              onJump={setQIndex}
              sessionType={sessionType}
              inline={true}
            />
          </div>

          {/* CENTRE: Question card */}
          <div className="session-q-col" style={{ flex:1, overflowY:'auto', padding:'20px 16px' }}>
            {q && (
              <QuestionCard
                key={q.id + '-' + qIndex}
                question={q}
                qIndex={qIndex}
                total={questions.length}
                onAnswer={() => {}}
                onNext={handleNext}
                onPrev={() => setQIndex(i => Math.max(0, i-1))}
                sessionType={sessionType}
                speedSecs={speedSecs}
                onSpeedTimeUp={handleSpeedTimeUp}
                dark={dark}
                alreadyAnswered={answerMap[qIndex] ?? null}
                reviewMode={false}
                hideExplanation={true}
              />
            )}
          </div>

          {/* RIGHT: Explanation panel (desktop — shown after answer in study mode) */}
          {q?.explanation && (
            <div className="session-exp-col" style={{ overflowY:'auto', background:'var(--bg-base)' }}>
              {answerMap[qIndex] ? (
                <ExplanationBlock
                  explanation={q.explanation}
                  isCorrect={answerMap[qIndex]?.isCorrect}
                  dark={dark}
                />
              ) : sessionType === 'study' ? (
                <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>💡</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text-tert)', lineHeight:1.5 }}>Answer the question to see the explanation</div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* BOTTOM: Question navigator (mobile only) */}
        <div className="session-nav-bottom">
          <QuestionNav
            total={questions.length}
            current={qIndex}
            answerMap={navAnswerMap}
            onJump={setQIndex}
            sessionType={sessionType}
          />
        </div>
      </div>
    </>
  )
}
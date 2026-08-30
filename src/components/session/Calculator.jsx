'use client'
// src/components/session/Calculator.jsx

import { useState } from 'react'
import { BLUE, RED, ORANGE } from './SessionUtils'

export function Calculator({ onClose, dark }) {
  const [display,  setDisplay]  = useState('0')
  const [memory,   setMemory]   = useState(null)
  const [op,       setOp]       = useState(null)
  const [waitNext, setWaitNext] = useState(false)

  function press(v) {
    if (v === 'C')   { setDisplay('0'); setMemory(null); setOp(null); setWaitNext(false); return }
    if (v === '⌫')   { setDisplay(d => d.length > 1 ? d.slice(0, -1) : '0'); return }
    if (v === '±')   { setDisplay(d => d.startsWith('-') ? d.slice(1) : '-' + d); return }
    if (v === '%')   { setDisplay(d => String(parseFloat(d) / 100)); return }
    if (v === 'x²')  { setDisplay(d => String(parseFloat(d) ** 2)); return }
    if (v === '√')   { setDisplay(d => { const r = Math.sqrt(parseFloat(d)); return isNaN(r) ? 'Error' : String(parseFloat(r.toFixed(10))) }); return }
    if (v === 'log') { setDisplay(d => { const r = Math.log10(parseFloat(d)); return isNaN(r) ? 'Error' : String(parseFloat(r.toFixed(10))) }); return }
    if (v === 'ln')  { setDisplay(d => { const r = Math.log(parseFloat(d)); return isNaN(r) ? 'Error' : String(parseFloat(r.toFixed(10))) }); return }
    if (v === 'π')   { setDisplay(String(Math.PI.toFixed(8))); setWaitNext(false); return }
    if (['+', '-', '×', '÷', 'xʸ'].includes(v)) { setMemory(parseFloat(display)); setOp(v === 'xʸ' ? '^' : v); setWaitNext(true); return }
    if (v === '=') {
      if (!op || memory === null) return
      const b = parseFloat(display), a = memory
      const r = op==='+'?a+b : op==='-'?a-b : op==='×'?a*b : op==='÷'?(b===0?NaN:a/b) : op==='^'?a**b : NaN
      setDisplay(isNaN(r) ? 'Error' : String(parseFloat(r.toFixed(10))))
      setMemory(null); setOp(null); setWaitNext(false); return
    }
    if (v === '.') { if (waitNext) { setDisplay('0.'); setWaitNext(false) } else setDisplay(d => d.includes('.') ? d : d + '.'); return }
    if (waitNext) { setDisplay(v); setWaitNext(false) }
    else setDisplay(d => d === '0' ? v : d.length > 12 ? d : d + v)
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
    <div style={{ position:'fixed', bottom:84, right:14, zIndex:400, width:'clamp(252px,320px,340px)', background:dark?'#1a1d2e':'#fff', borderRadius:18, border:'1px solid var(--border)', boxShadow:'0 16px 48px rgba(0,0,0,.55)', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 13px', borderBottom:'1px solid var(--border)' }}>
        <span style={{ fontSize:11, fontWeight:800, color:'var(--text-tert)' }}>Calculator</span>
        <button onClick={onClose} style={{ width:22, height:22, borderRadius:5, background:'var(--bg-subtle)', border:'none', cursor:'pointer', fontSize:14, color:'var(--text-tert)' }}>×</button>
      </div>
      <div style={{ padding:'10px 12px 6px', textAlign:'right' }}>
        {op && memory !== null && <div style={{ fontSize:10, color:'var(--text-tert)', marginBottom:1 }}>{memory} {op==='+'?'+':op==='-'?'−':op==='×'?'×':op==='÷'?'÷':op}</div>}
        <div style={{ fontSize:30, fontWeight:900, color:'var(--text-prim)', fontFamily:"'Courier New',monospace", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{display}</div>
      </div>
      <div style={{ padding:'6px 10px 12px', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
        {rows.flat().map((v, i) => {
          const isOp  = ['+','-','×','÷'].includes(v)
          const isSci = ['log','ln','xʸ','√','x²','π'].includes(v)
          const isEq  = v === '='
          const isDel = v === '⌫' || v === 'C'
          return (
            <button key={i} onClick={() => v && press(v)}
              style={{ padding:'13px 4px', borderRadius:10, border:`1px solid ${isEq?BLUE:isOp?`${BLUE}40`:'var(--border)'}`,
                background:isEq?BLUE:isOp?`${BLUE}12`:isSci?`${ORANGE}10`:isDel?`${RED}10`:'var(--bg-subtle)',
                color:isEq?'#fff':isOp?BLUE:isSci?ORANGE:isDel?RED:'var(--text-prim)',
                fontSize:v&&v.length>2?12:15, fontWeight:800, cursor:v?'pointer':'default', fontFamily:'inherit',
                opacity:v?1:0, pointerEvents:v?'all':'none' }}>
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}
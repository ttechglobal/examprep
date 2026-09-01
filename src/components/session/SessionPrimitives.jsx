'use client'
// src/components/session/SessionPrimitives.jsx
// Small stateless/stateful building blocks used across all session types.

import { useState, useEffect } from 'react'
import { BLUE, CYAN, GREEN, RED, ORANGE } from './SessionUtils'

// ─── LOADING ──────────────────────────────────────────────────────────────────
export function LoadingScreen({ message = 'Loading questions…' }) {
  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg-base)', gap:16 }}>
      <div style={{ width:44, height:44, borderRadius:'50%', border:'3px solid var(--border)', borderTopColor:BLUE, animation:'spin .7s linear infinite' }}/>
      <div style={{ fontSize:14, fontWeight:700, color:'var(--text-tert)' }}>{message}</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>
    </div>
  )
}

// ─── ERROR ────────────────────────────────────────────────────────────────────
export function ErrorScreen({ message, onBack }) {
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

// ─── END / SUBMIT DIALOG ─────────────────────────────────────────────────────
// mode='submit' — triggered by Submit on last question
// mode='end'    — triggered by the End button mid-session
export function EndDialog({ answered, total, onConfirm, onCancel, mode = 'end' }) {
  const unanswered = total - answered
  const isSubmit   = mode === 'submit'
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1200, background:'rgba(0,0,0,.65)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'var(--bg-base)', borderRadius:22, border:'1px solid var(--border)', padding:'28px 24px', maxWidth:360, width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,.6)' }}>
        <div style={{ fontSize:36, textAlign:'center', marginBottom:12 }}>{isSubmit ? '📋' : '⚠️'}</div>
        <div style={{ fontSize:18, fontWeight:900, color:'var(--text-prim)', textAlign:'center', marginBottom:8 }}>
          {isSubmit ? 'Ready to submit?' : 'End this session?'}
        </div>
        <div style={{ fontSize:13, color:'var(--text-tert)', textAlign:'center', lineHeight:1.7, marginBottom:22 }}>
          You've answered <strong style={{ color:'var(--text-prim)' }}>{answered}</strong> of <strong style={{ color:'var(--text-prim)' }}>{total}</strong> questions.
          {unanswered > 0 && <><br/><span style={{ color:ORANGE }}>{unanswered} unanswered</span> will be marked as incorrect.</>}
          {isSubmit && unanswered === 0 && <><br/><span style={{ color:GREEN }}>All questions answered ✓</span></>}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={onConfirm}
            style={{ width:'100%', padding:'14px', borderRadius:13, border:'none', cursor:'pointer', background:isSubmit?BLUE:RED, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', boxShadow:isSubmit?`0 4px 0 #0a3fa0`:`0 4px 0 #b91c1c` }}>
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
export function QuestionNav({ total, current, answerMap, onJump, sessionType, inline = false }) {
  return (
    <div style={{ borderTop:inline?'none':'1px solid var(--border)', background:inline?'transparent':'var(--bg-card)', padding:inline?'0':'10px 14px 12px' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxHeight:96, overflow:'hidden' }}>
        {Array.from({ length: total }, (_, i) => {
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
      <div style={{ display:'flex', gap:10, marginTop:7, flexWrap:'wrap' }}>
        {[
          { bg:BLUE,            border:BLUE,            label:'Current'  },
          { bg:`${BLUE}15`,     border:`${BLUE}55`,     label:'Answered' },
          { bg:`${ORANGE}10`,   border:`${ORANGE}50`,   label:'Skipped'  },
          { bg:'var(--bg-subtle)', border:'var(--border)', label:'Not done' },
          ...(sessionType === 'study' ? [
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

// ─── PER-QUESTION COUNTDOWN ───────────────────────────────────────────────────
export function QuestionCountdown({ secs, onTimeUp }) {
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

  const pctLeft = remaining > 0 ? Math.round((remaining / secs) * 100) : 0
  const color   = pctLeft > 50 ? GREEN : pctLeft > 25 ? ORANGE : RED

  return (
    <div style={{ position:'relative', width:36, height:36, flexShrink:0 }}>
      <svg viewBox="0 0 36 36" style={{ position:'absolute', inset:0, transform:'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="3"/>
        <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${2 * Math.PI * 15}`}
          strokeDashoffset={`${2 * Math.PI * 15 * (1 - pctLeft / 100)}`}
          style={{ transition:'stroke-dashoffset 1s linear, stroke .3s' }}/>
      </svg>
      <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color }}>{remaining}</span>
    </div>
  )
}

// ─── OVERALL SESSION TIMER ────────────────────────────────────────────────────
export function SessionTimer({ durationSecs, onTimeUp }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => {
      setElapsed(e => {
        const n = e + 1
        if (n >= durationSecs) { clearInterval(iv); onTimeUp(); return durationSecs }
        return n
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [durationSecs, onTimeUp])

  const remaining = durationSecs - elapsed
  const mins  = Math.floor(remaining / 60)
  const secs  = remaining % 60
  const pctLeft = durationSecs > 0 ? Math.round((remaining / durationSecs) * 100) : 0
  const color = pctLeft > 50 ? BLUE : pctLeft > 25 ? ORANGE : RED

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
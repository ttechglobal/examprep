'use client'
// src/components/session/SessionPrimitives.jsx
// Small stateless/stateful building blocks used across all session types.
//
// v2: ErrorScreen tells a lost connection apart from a real error ("You're
//     offline" + Try again) instead of showing "Failed to fetch".
// v3: EndDialog restyled (session.module.css). QuestionNav and SessionTimer
//     are replaced by QuestionPanel / QuestionGridSheet and SessionClock in
//     SessionFrame.jsx. QuestionCountdown reads onTimeUp through a ref and no
//     longer calls it inside a state updater (it ran twice under StrictMode
//     and used the answers from when the question opened).

import { useState, useEffect, useRef } from 'react'
import { BLUE, GREEN, RED, ORANGE } from './SessionUtils'
import s from './session.module.css'
import { isConnectionProblem } from '@/lib/network'

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
  const offline = isConnectionProblem(message)
  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:24, background:'var(--bg-base)' }}>
      <style>{`*{box-sizing:border-box}`}</style>
      <div style={{ fontSize:44 }}>{offline ? '📶' : '😕'}</div>
      <div style={{ fontSize:18, fontWeight:900, color:'var(--text-prim)', textAlign:'center' }}>{offline ? 'You\'re offline' : 'Something went wrong'}</div>
      <div style={{ fontSize:14, color:'var(--text-tert)', textAlign:'center', maxWidth:320, lineHeight:1.6 }}>
        {offline ? 'Questions load from the internet. Connect to Wi-Fi or data, then try again.' : message}
      </div>
      {offline && (
        <button onClick={() => window.location.reload()} style={{ padding:'12px 28px', borderRadius:13, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:15, fontWeight:800, fontFamily:'inherit' }}>Try again</button>
      )}
      <button onClick={onBack} style={offline
        ? { padding:'10px 20px', border:'none', background:'none', cursor:'pointer', color:'var(--text-sec)', fontSize:14, fontWeight:700, fontFamily:'inherit' }
        : { padding:'12px 28px', borderRadius:13, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:15, fontWeight:800, fontFamily:'inherit' }}>← Back to Practice</button>
    </div>
  )
}

// ─── END / SUBMIT DIALOG ─────────────────────────────────────────────────────
// mode 'submit' (after the last question) or 'end' (Exit / End mid-session).
// Rendered inside SessionFrame (its `overlay`), which provides the styles' tokens.
export function EndDialog({ answered, total, onConfirm, onCancel, mode = 'end' }) {
  const unanswered = total - answered
  const isSubmit   = mode === 'submit'
  return (
    <div className={s.dialogBackdrop} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className={s.dialog} role="alertdialog" aria-modal="true" aria-labelledby="end-title">
        <div className={s.dialogIcon} aria-hidden="true">{isSubmit ? '📋' : '⚠️'}</div>
        <h2 className={s.dialogTitle} id="end-title">{isSubmit ? 'Ready to submit?' : 'End this session?'}</h2>
        <p className={s.dialogText}>
          You’ve answered <b>{answered}</b> of <b>{total}</b> questions.
          {unanswered > 0 && <span className={s.dialogWarn}>{unanswered} unanswered will count as wrong.</span>}
          {isSubmit && unanswered === 0 && <span className={s.dialogOk}>All questions answered ✓</span>}
        </p>
        <div className={s.dialogActions}>
          <button type="button" className={`${s.next} ${isSubmit ? '' : s.danger}`} onClick={onConfirm}>
            {isSubmit ? 'Yes, submit' : 'End & see results'}
          </button>
          <button type="button" className={s.plain} onClick={onCancel}>{isSubmit ? 'Go back' : 'Keep going'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── PER-QUESTION COUNTDOWN ───────────────────────────────────────────────────
// Counts down from the moment it mounts (key it by question). onTimeUp is read
// through a ref, so the latest handler (with the latest answers) runs at zero.
export function QuestionCountdown({ secs, onTimeUp }) {
  const [remaining, setRemaining] = useState(secs)
  const onTimeUpRef = useRef(onTimeUp)
  useEffect(() => { onTimeUpRef.current = onTimeUp })

  useEffect(() => {
    const endsAt = Date.now() + secs * 1000
    setRemaining(secs)
    const iv = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) { clearInterval(iv); onTimeUpRef.current?.() }
    }, 250)
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

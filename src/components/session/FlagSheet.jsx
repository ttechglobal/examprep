'use client'
// src/components/session/FlagSheet.jsx
// "Report an issue" sheet for one question: pick a reason, add detail, send to
// POST /api/student/questions/flag. Opened from the flag button on QuestionCard.
// (Moved out of QuestionCard.jsx unchanged.)

import { useState } from 'react'
import { BLUE, RED } from './SessionUtils'

const FLAG_REASONS = [
  { key: 'wrong_answer',      label: 'Wrong correct answer',     icon: '❌', desc: 'The marked answer seems incorrect' },
  { key: 'wrong_explanation', label: 'Wrong or misleading explanation', icon: '📖', desc: 'The explanation has an error' },
  { key: 'bad_question',      label: 'Question is unclear',       icon: '❓', desc: 'The question text is confusing or incomplete' },
  { key: 'duplicate',         label: 'Duplicate question',        icon: '♻️', desc: 'I\'ve seen this exact question before' },
  { key: 'other',             label: 'Other issue',               icon: '🚩', desc: 'Something else is wrong' },
]

export default function FlagSheet({ questionId, onClose }) {
  const [reason,     setReason]     = useState(null)
  const [detail,     setDetail]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)

  async function submit() {
    if (!reason) return
    setSubmitting(true)
    try {
      await fetch('/api/student/questions/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId, reason, detail }),
      })
      setDone(true)
    } catch { setDone(true) }
    finally { setSubmitting(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:3000, background:'rgba(0,0,0,.65)', backdropFilter:'blur(5px)', display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center' }}>
      <div style={{ width:'100%', maxWidth:520, background:'var(--bg-base)', borderRadius:'20px 20px 0 0', maxHeight:'85dvh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--border-strong)' }}/>
        </div>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 20px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)' }}>🚩 Report an issue</div>
            <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>Help us improve this question</div>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-subtle)', cursor:'pointer', fontSize:16, color:'var(--text-tert)', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        {done ? (
          <div style={{ padding:'40px 24px', textAlign:'center', flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
            <div style={{ fontSize:44 }}>✅</div>
            <div style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)' }}>Thanks for the report!</div>
            <div style={{ fontSize:13, color:'var(--text-tert)', lineHeight:1.6, maxWidth:280 }}>Our team will review this question and fix any issues. You help make ExamPrep better for everyone.</div>
            <button onClick={onClose} style={{ marginTop:8, padding:'12px 28px', borderRadius:12, background:BLUE, border:'none', color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>Done</button>
          </div>
        ) : (
          <div style={{ overflowY:'auto', padding:'16px 20px 32px', flex:1, display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em' }}>What's wrong?</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {FLAG_REASONS.map(r => {
                const on = reason === r.key
                return (
                  <button key={r.key} onClick={() => setReason(r.key)}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 15px', borderRadius:14, border:`2px solid ${on ? RED : 'var(--border)'}`, background:on ? `${RED}08` : 'var(--bg-subtle)', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .13s' }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>{r.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:on ? RED : 'var(--text-prim)' }}>{r.label}</div>
                      <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:1 }}>{r.desc}</div>
                    </div>
                    {on && <div style={{ width:18, height:18, borderRadius:'50%', background:RED, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2L7.5 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                  </button>
                )
              })}
            </div>
            {reason && (
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>Additional detail (optional)</div>
                <textarea
                  value={detail}
                  onChange={e => setDetail(e.target.value)}
                  placeholder="Describe the issue in more detail..."
                  maxLength={500}
                  rows={3}
                  style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--bg-subtle)', color:'var(--text-prim)', fontSize:13, fontFamily:'inherit', resize:'none', outline:'none', lineHeight:1.5, boxSizing:'border-box' }}
                />
              </div>
            )}
            <button onClick={submit} disabled={!reason || submitting}
              style={{ padding:'14px', borderRadius:13, border:'none', cursor:reason?'pointer':'not-allowed', background:reason ? RED : 'var(--border)', color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', boxShadow:reason?`0 4px 0 #b91c1c`:'none', opacity:submitting?.7:1, transition:'all .13s' }}>
              {submitting ? 'Sending…' : '🚩 Submit Report'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


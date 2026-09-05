'use client'
// src/components/session/QuestionCard.jsx
// The core question card used in all session types (practice, study, mock, review).
//
// Props:
//   question        — question object { id, text, options, correct_answer, explanation, hint, year, topic_name }
//   qIndex          — current index (0-based)
//   total           — total question count
//   onNext          — called with { selectedIdx, isCorrect } on Next/Submit
//   onPrev          — called when Prev is tapped
//   sessionType     — 'study' | 'practice' | 'mock'
//   speedSecs       — if set, shows per-question countdown
//   onSpeedTimeUp   — called when countdown hits 0
//   dark            — boolean
//   alreadyAnswered — { selectedIdx, isCorrect } if question was already answered, else null
//   reviewMode      — true in review screen: shows answer, no interaction
//   hideExplanation — suppress inline explanation (desktop shows it in a side column)
//   hideHint        — suppress hint (mock mode)
//   hideNav         — suppress nav buttons (parent owns them)

import { useState, useEffect } from 'react'
import { MathText, injectMathStyles } from '@/lib/mathRenderer'
import { BLUE, GREEN, RED, GOLD, ORANGE, LETTERS, normaliseOptions, checkCorrect } from './SessionUtils'
import { HintBlock, ExplanationBlock } from './ExplanationBlock'
import { QuestionCountdown } from './SessionPrimitives'

// ─── FLAG MODAL ───────────────────────────────────────────────────────────────
const FLAG_REASONS = [
  { key: 'wrong_answer',      label: 'Wrong correct answer',     icon: '❌', desc: 'The marked answer seems incorrect' },
  { key: 'wrong_explanation', label: 'Wrong or misleading explanation', icon: '📖', desc: 'The explanation has an error' },
  { key: 'bad_question',      label: 'Question is unclear',       icon: '❓', desc: 'The question text is confusing or incomplete' },
  { key: 'duplicate',         label: 'Duplicate question',        icon: '♻️', desc: 'I\'ve seen this exact question before' },
  { key: 'other',             label: 'Other issue',               icon: '🚩', desc: 'Something else is wrong' },
]

function FlagModal({ questionId, onClose }) {
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

export function QuestionCard({
  question,
  qIndex,
  total,
  onNext,
  onPrev,
  onAnswerChange,
  sessionType,
  speedSecs,
  onSpeedTimeUp,
  dark,
  alreadyAnswered,
  reviewMode      = false,
  hideExplanation = false,
  hideHint        = false,
  hideNav         = false,
}) {
  const isStudy = sessionType === 'study'

  // Keep options in their original A/B/C/D order.
  // Shuffling was removed because correct_answer is stored as a letter ("A","B","C","D")
  // tied to the original position. Randomising display positions breaks the
  // correct_answer mapping and causes right answers to be marked wrong.
  const [shuffledOptions, setShuffledOptions] = useState([])
  useEffect(() => {
    const raw     = normaliseOptions(question.options)
    const withIdx = raw.map((text, i) => ({ text, originalIdx: i }))
    setShuffledOptions(withIdx)
  }, [question.id])

  useEffect(() => { injectMathStyles() }, [])

  const [selected,      setSelected]      = useState(alreadyAnswered?.selectedIdx ?? null)
  // In practice mode, navigating back to an answered question must NOT reveal
  // the answer — the student should see their prior selection highlighted but
  // no ✓/✗ coloring and no explanation until the full session ends.
  // Only auto-reveal in study mode (instant feedback) or review mode.
  const [revealed,      setRevealed]      = useState(reviewMode || (isStudy && alreadyAnswered !== null))
  const [studyAttempts, setStudyAttempts] = useState(0)
  const [studyWrong,    setStudyWrong]    = useState(false)

  useEffect(() => {
    setSelected(alreadyAnswered?.selectedIdx ?? null)
    setRevealed(reviewMode || (isStudy && alreadyAnswered !== null))
    setStudyAttempts(0)
    setStudyWrong(false)
  }, [qIndex, question.id, reviewMode])

  function handleSelect(opt, idx) {
    if (reviewMode) return
    if (isStudy) {
      if (revealed) return
      setSelected(idx)
      const correct = checkCorrect(shuffledOptions.map(o => o.text), idx, question.correct_answer)
      if (correct) {
        setRevealed(true)
        setStudyWrong(false)
        // Notify parent immediately so the desktop explanation panel updates
        // without waiting for the Next button click.
        onAnswerChange?.({ selectedIdx: idx, isCorrect: true })
      } else {
        const attempts = studyAttempts + 1
        setStudyAttempts(attempts)
        if (attempts >= 2) {
          setRevealed(true)
          setStudyWrong(false)
          // Also notify on forced reveal (exhausted attempts)
          onAnswerChange?.({ selectedIdx: idx, isCorrect: false })
        } else {
          setStudyWrong(true)
        }
      }
    } else {
      // In practice mode revealed stays false, so guard against re-selection
      // by checking alreadyAnswered directly instead of relying on revealed.
      if (revealed || alreadyAnswered !== null) return
      setSelected(idx)
      // Notify parent immediately so mock mode can track without waiting for Next
      const isCorrect = checkCorrect(shuffledOptions.map(o => o.text), idx, question.correct_answer)
      onAnswerChange?.({ selectedIdx: idx, isCorrect })
    }
  }

  function handleNextClick() {
    if (reviewMode) { onNext?.(); return }
    const opts      = shuffledOptions.map(o => o.text)
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
      if (studyWrong && !revealed)  return selected === idx ? 'wrong'  : 'idle'
      const isCorrectOpt = opts[idx] === question.correct_answer || LETTERS[idx] === question.correct_answer
      if (isCorrectOpt) return 'correct'
      if (idx === selected && !isCorrectOpt) return 'wrong'
      return 'idle'
    }
    return selected === idx ? 'chosen' : 'idle'
  }

  const SS = {
    idle:    { bg: dark?'rgba(255,255,255,.04)':'rgba(6,42,120,.025)', border:'var(--border)',  text:'var(--text-prim)', pill: dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)' },
    chosen:  { bg:`${BLUE}12`,  border:BLUE,  text:BLUE,  pill:BLUE          },
    correct: { bg:`${GREEN}10`, border:GREEN, text:GREEN, pill:`${GREEN}35`  },
    wrong:   { bg:`${RED}08`,   border:RED,   text:RED,   pill:`${RED}28`    },
  }

  const opts              = shuffledOptions.map(o => o.text)
  const isCorrectSelected = selected !== null && checkCorrect(opts, selected, question.correct_answer)
  const isLast            = qIndex >= total - 1
  const hasPrev           = qIndex > 0

  const [showFlag, setShowFlag] = useState(false)

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      {showFlag && <FlagModal questionId={question.id} onClose={() => setShowFlag(false)}/>}

      {/* Topic + year meta row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {question.topic_name ?? ''}
        </span>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {speedSecs && !revealed && !reviewMode && (
            <QuestionCountdown key={qIndex} secs={speedSecs} onTimeUp={onSpeedTimeUp}/>
          )}
          {question.year && (
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'var(--bg-subtle)', border:'1px solid var(--border)', color:'var(--text-tert)' }}>
              {question.year}
            </span>
          )}
          <button onClick={() => setShowFlag(true)}
            title="Report an issue with this question"
            style={{ width:26, height:26, borderRadius:8, background:'none', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'var(--text-tert)', transition:'all .12s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-tert)' }}>
            🚩
          </button>
        </div>
      </div>

      {/* Question text */}
      <div style={{ fontSize:18, fontWeight:700, color:'var(--text-prim)', lineHeight:1.75, marginBottom:22, userSelect:'none', WebkitUserSelect:'none' }}>
        <MathText text={question.text ?? question.question_text ?? ''} as="span" className=""/>
      </div>

      {/* Hint pill — hidden in mock/review/after answer */}
      {!hideHint && !revealed && !studyWrong && !reviewMode && (question.hint || question.explanation?.hint) && (
        <HintBlock hint={question.hint || question.explanation?.hint}/>
      )}

      {/* Study mode: wrong attempt nudge */}
      {studyWrong && !revealed && (
        <div style={{ marginBottom:12, padding:'12px 14px', borderRadius:14, background:`${RED}08`, border:`1.5px solid ${RED}30`, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18, flexShrink:0 }}>❌</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:800, color:RED, marginBottom:2 }}>Not quite — try again!</div>
            <div style={{ fontSize:11, color:'var(--text-tert)' }}>One more attempt before the answer is revealed.</div>
          </div>
        </div>
      )}
      {studyWrong && !revealed && !hideHint && (question.hint || question.explanation?.hint) && (
        <HintBlock hint={question.hint || question.explanation?.hint}/>
      )}

      {/* Options */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {opts.map((opt, idx) => {
          const state      = getState(idx)
          const s          = SS[state]
          const isDisabled = reviewMode || (revealed && isStudy && state === 'idle')
          return (
            <button key={idx} onClick={() => handleSelect(opt, idx)} disabled={isDisabled}
              style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 18px', borderRadius:14, border:`2px solid ${s.border}`, background:s.bg, cursor:isDisabled?'default':'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .14s', width:'100%' }}>
              <div style={{ width:32, height:32, borderRadius:10, background:state==='idle'?s.pill:s.border, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:state==='idle'?'var(--text-tert)':'#fff', fontSize:13, fontWeight:900, transition:'all .14s' }}>
                {(state==='correct'&&(reviewMode||isStudy)) ? '✓' : (state==='wrong'&&(reviewMode||isStudy)&&revealed) ? '✗' : LETTERS[idx]}
              </div>
              <span style={{ fontSize:15, fontWeight:state==='correct'?700:600, color:s.text, lineHeight:1.5, flex:1 }}>
                <MathText text={String(opt ?? '')} as="span" className=""/>
              </span>
            </button>
          )
        })}
      </div>

      {/* Study mode result banner */}
      {revealed && isStudy && !reviewMode && (
        <div style={{ marginTop:14, padding:'13px 16px', borderRadius:14, background:isCorrectSelected?`${GREEN}12`:`${RED}08`, border:`1px solid ${isCorrectSelected?GREEN+'40':RED+'30'}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:isCorrectSelected?GREEN:RED, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:20, color:'#fff', fontWeight:900 }}>{isCorrectSelected?'✓':'✗'}</span>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:900, color:isCorrectSelected?GREEN:RED }}>
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

      {/* Inline explanation (mobile / non-desktop review) */}
      {!hideExplanation && (revealed || reviewMode) && question.explanation && (
        <div className="inline-explanation">
          {/* On mobile: show compact strip + modal sheet. On desktop: full inline. */}
          <span className="expl-mobile-modal">
            <ExplanationBlock
              explanation={question.explanation}
              isCorrect={reviewMode ? alreadyAnswered?.isCorrect : isCorrectSelected}
              dark={dark}
              mobileModal={true}
            />
          </span>
          <span className="expl-desktop-inline">
            <ExplanationBlock
              explanation={question.explanation}
              isCorrect={reviewMode ? alreadyAnswered?.isCorrect : isCorrectSelected}
              dark={dark}
              mobileModal={false}
            />
          </span>
          <style>{`
            @media (min-width: 1024px) { .expl-mobile-modal { display: none; } .expl-desktop-inline { display: block; } }
            @media (max-width: 1023px) { .expl-mobile-modal { display: block; } .expl-desktop-inline { display: none; } }
          `}</style>
        </div>
      )}

      {/* Nav buttons — hidden when parent owns them */}
      {!hideNav && (
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
              : (isStudy && !revealed && studyAttempts === 0 && selected !== null ? 'Check Answer' : isLast ? 'Submit' : 'Next')
            }
            {!reviewMode && <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
        </div>
      )}
    </div>
  )
}
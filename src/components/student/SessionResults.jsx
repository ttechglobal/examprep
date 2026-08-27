'use client'
// src/components/student/SessionResults.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Extracted ResultsScreen component — shown after a practice session completes.
// Props:
//   questions    — array of question objects
//   answers      — array of { selectedIdx, isCorrect } (indexed by question)
//   config       — session config { mode, subjects, studentName, ... }
//   xpAwarded    — XP earned this session
//   streakDays   — current streak
//   durationSecs — total time taken
//   onRetry      — callback: start another session
//   onHome       — callback: go back to practice page
//   onReview     — callback: enter review mode
//   dark         — boolean dark mode
// ─────────────────────────────────────────────────────────────────────────────

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GREEN  = '#22c55e'
const RED    = '#f43f5e'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'

function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0 }

function ScoreRing({ pct: score, color, dark }) {
  const r = 54; const circ = 2 * Math.PI * r
  const dash = circ * (score / 100)
  return (
    <svg width="132" height="132" viewBox="0 0 132 132" style={{ transform:'rotate(-90deg)' }}>
      <circle cx="66" cy="66" r={r} fill="none" stroke={dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.08)'} strokeWidth="10"/>
      <circle cx="66" cy="66" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition:'stroke-dasharray 1s cubic-bezier(.34,1.56,.64,1)' }}
      />
      <text x="66" y="66" textAnchor="middle" dominantBaseline="central"
        style={{ transform:'rotate(90deg)', transformOrigin:'66px 66px' }}
        fill={color} fontSize="22" fontWeight="900" fontFamily="inherit">{score}%</text>
    </svg>
  )
}

export default function SessionResults({ questions, answers, config, xpAwarded, streakDays, durationSecs, onRetry, onHome, onReview, dark }) {
  const correct    = answers.filter(a => a?.isCorrect).length
  const incorrect  = answers.filter(a => a && a.selectedIdx !== null && !a.isCorrect).length
  const skipped    = answers.filter(a => !a || a.selectedIdx === null).length
  const total      = answers.length
  const accuracy   = pct(correct, total)
  const scoreColor = accuracy >= 70 ? GREEN : accuracy >= 40 ? ORANGE : RED

  const totalSecs = durationSecs ?? 0
  const timeMins  = Math.floor(totalSecs / 60)
  const timeSecs  = totalSecs % 60
  const timeStr   = timeMins > 0 ? `${timeMins}m ${timeSecs}s` : `${timeSecs}s`
  const avgSecs   = total > 0 ? Math.round(totalSecs / total) : 0

  const name = config?.studentName ?? ''
  const { headline, sub, tip } = (() => {
    if (accuracy >= 90) return { headline: 'Outstanding!',  sub: 'You absolutely nailed it.',                     tip: 'Practice today, Excel tomorrow! 🚀' }
    if (accuracy >= 80) return { headline: 'Great work!',   sub: 'You gave it your best shot today.',              tip: 'Consistency + Effort = Excellence 💙' }
    if (accuracy >= 70) return { headline: 'Great effort!', sub: 'You gave it your best shot today.',              tip: 'Keep going, champion! 💪' }
    if (accuracy >= 50) return { headline: 'Keep going!',   sub: 'Every question brings you closer to success.',   tip: 'Focus on weak topics and you\'ll improve fast.' }
    return               { headline: 'Keep going!',   sub: 'Every question you attempt builds your knowledge.', tip: 'Attempt more and the scores will follow.' }
  })()

  const subjectLabel = config?.subjects?.[0] ?? ''
  const modeLabel    = { study:'Study Session', practice:'Practice', timed:'Speed Round', quick5:'Quick 5', mock:'Mock Exam' }[config?.mode] ?? 'Practice'

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg-base)' }}>
      <style>{`
        * { box-sizing: border-box }
        @media (min-width: 1024px) {
          .res-layout { display: grid !important; grid-template-columns: 1fr 380px !important; gap: 24px !important; max-width: 1100px !important; margin: 0 auto !important; padding: 32px 32px 60px !important; }
          .res-desktop-only { display: flex !important; }
        }
        @media (max-width: 1023px) {
          .res-layout { display: flex !important; flex-direction: column !important; padding: 0 0 80px !important; }
          .res-desktop-only { display: none !important; }
        }
      `}</style>

      <div className="res-layout">
        {/* ── LEFT / MAIN ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Hero banner */}
          <div style={{ borderRadius:24, background:`linear-gradient(135deg,${NAVY} 0%,#0d2466 55%,#1347b0 100%)`, padding:'28px 24px', position:'relative', overflow:'hidden', minHeight:160 }}>
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
                <div style={{ fontSize:12, fontWeight:800, color:GOLD }}>{tip}</div>
                <div style={{ display:'flex', gap:10, marginTop:20, flexWrap:'wrap' }}>
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
              <div style={{ width:110, flexShrink:0, alignSelf:'flex-end' }}>
                <img src="/images/zara_studybuddy.png" alt="" style={{ width:'100%', objectFit:'contain', filter:'drop-shadow(0 4px 16px rgba(0,0,0,.4))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', padding:'18px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:16 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ScoreRing pct={accuracy} color={scoreColor} dark={dark}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { icon:'✅', label:'Correct',    value:correct,          sub:`/ ${total}`,               color:GREEN  },
                  { icon:'❌', label:'Incorrect',  value:incorrect,        sub:`/ ${total}`,               color:RED    },
                  { icon:'⚡', label:'XP Earned',  value:`+${xpAwarded}`,  sub:'XP',                       color:GOLD   },
                  { icon:'⏱️', label:'Time',       value:timeStr,          sub:avgSecs>0?`~${avgSecs}s/Q`:'', color:BLUE },
                ].map((s,i) => (
                  <div key={i} style={{ background:'var(--bg-subtle)', borderRadius:14, padding:'12px 14px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>{s.icon} {s.label}</div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                      <span style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</span>
                      {s.sub && <span style={{ fontSize:11, color:'var(--text-tert)', fontWeight:600 }}>{s.sub}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom actions */}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onRetry}
              style={{ flex:1, padding:'14px', borderRadius:14, border:'1px solid var(--border)', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:14, background:'var(--bg-card)', color:'var(--text-sec)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              Try Again
            </button>
            <button onClick={onReview}
              style={{ flex:2, padding:'14px', borderRadius:14, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:900, fontSize:14, background:BLUE, color:'#fff', boxShadow:`0 5px 0 #0a3fa0,0 8px 20px ${BLUE}40`, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              Review Answers
            </button>
          </div>
        </div>

        {/* ── RIGHT (desktop only) ── */}
        <div className="res-desktop-only" style={{ flexDirection:'column', gap:16 }}>
          <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', padding:'20px' }}>
            <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)', marginBottom:14 }}>Session Stats</div>
            {[
              { label:'Total Questions',  value:`${total}`,                                  color:'var(--text-prim)' },
              { label:'Correct',          value:`${correct}`,                                color:GREEN  },
              { label:'Incorrect',        value:`${incorrect}`,                              color:RED    },
              { label:'Skipped',          value:`${skipped}`,                                color:ORANGE },
              { label:'Time taken',       value:timeStr,                                     color:BLUE   },
              { label:'Avg per question', value:`${avgSecs}s`,                               color:'var(--text-sec)' },
              { label:'Day streak',       value:`${streakDays} day${streakDays!==1?'s':''}`, color:ORANGE },
            ].map((r,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:i<6?'1px solid var(--border)':'none' }}>
                <span style={{ fontSize:12, color:'var(--text-tert)', fontWeight:600 }}>{r.label}</span>
                <span style={{ fontSize:13, fontWeight:900, color:r.color }}>{r.value}</span>
              </div>
            ))}
          </div>
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
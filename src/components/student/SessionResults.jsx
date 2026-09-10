'use client'
// src/components/student/SessionResults.jsx — v4
// Changes: removed "Your Rewards" card (duplicate of XP strip), removed "Performance breakdown" donut (duplicate of stats strip),
// "What to improve" now collapsible, buttons redesigned, streak more prominent in hero.

import { useState, useEffect, useRef } from 'react'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GREEN  = '#22c55e'
const RED    = '#f43f5e'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const CYAN   = '#18B7F2'

function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0 }

function fmtTime(secs) {
  const m = Math.floor(secs / 60), s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

// ─── TOPIC BARS ───────────────────────────────────────────────────────────────
function TopicBars({ questions, answers }) {
  const topics = {}
  questions.forEach((q, i) => {
    const name = q.topic_name ?? 'General'
    if (!topics[name]) topics[name] = { correct:0, total:0 }
    topics[name].total++
    if (answers[i]?.isCorrect) topics[name].correct++
  })

  const topicList = Object.entries(topics)
    .map(([name, d]) => ({ name, pct: pct(d.correct, d.total), correct:d.correct, total:d.total }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5)

  if (!topicList.length) return (
    <p style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.6 }}>No topic data yet.</p>
  )

  const ICONS = { 'General':'📝', 'Comprehension':'📖', 'Grammar':'Aa', 'Vocabulary':'💬',
    'Mathematics':'📐','Biology':'🧬','Chemistry':'⚗️','Physics':'⚡','default':'📚' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {topicList.map((t) => {
        const barColor = t.pct >= 70 ? GREEN : t.pct >= 40 ? ORANGE : RED
        const icon = ICONS[t.name] ?? ICONS.default
        return (
          <div key={t.name}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:`${BLUE}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>{icon}</div>
              <span style={{ flex:1, fontSize:13, fontWeight:700, color:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</span>
              <span style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', flexShrink:0 }}>{t.pct}%</span>
            </div>
            <div style={{ height:6, borderRadius:999, background:'var(--bg-subtle)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${t.pct}%`, borderRadius:999, background:barColor, transition:'width 1.1s cubic-bezier(.34,1.2,.64,1)' }}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function SessionResults({ questions, answers, config, xpAwarded, streakDays, durationSecs, onRetry, onHome, onReview, dark }) {
  const correct   = answers.filter(a => a?.isCorrect).length
  const incorrect = answers.filter(a => a && a.selectedIdx !== null && !a.isCorrect).length
  const skipped   = answers.filter(a => !a || a.selectedIdx === null).length
  const total     = answers.length
  const accuracy  = pct(correct, total)

  const totalSecs = durationSecs ?? 0
  const timeStr   = fmtTime(totalSecs)
  const avgSecs   = total > 0 ? Math.round(totalSecs / total) : 0

  const [improveOpen, setImproveOpen] = useState(false)

  const { headline, sub } = (() => {
    if (accuracy >= 90) return { headline:'Outstanding work! 🏆', sub:'You absolutely nailed this session.' }
    if (accuracy >= 80) return { headline:'Great work! 🎉',       sub:"You're building real momentum." }
    if (accuracy >= 70) return { headline:'Nice work! 💪',        sub:"You gave it your best shot today." }
    if (accuracy >= 50) return { headline:'Keep going! 🔥',       sub:'Every question brings you closer.' }
    return                     { headline:'Keep going! 🔥',       sub:"Review, practise, repeat — you've got this." }
  })()

  const subjectLabel = config?.subjects?.[0] ?? ''
  const modeLabel    = { study:'Study', practice:'Practice', timed:'Speed Round', quick5:'Quick 5', mock:'Mock Exam' }[config?.mode] ?? 'Practice'

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg-base)' }}>
      <style>{`
        * { box-sizing: border-box }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:none } }

        .sr-wrap    { max-width:700px; margin:0 auto; padding:0 0 80px; display:flex; flex-direction:column; gap:0; }
        .sr-mid     { display:flex; flex-direction:column; gap:14px; padding:16px; }
        .sr-actions { padding:0 16px 24px; display:flex; flex-direction:column; gap:10px; }
        .sr-stat-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:0; }
        .sr-hero-score { font-size:56px; }
        .sr-xp-row  { display:flex; flex-direction:column; gap:14px; }

        @media (min-width:1024px) {
          .sr-wrap    { max-width:960px; padding:32px 32px 60px; }
          .sr-hero    { border-radius:24px; margin:0; }
          .sr-mid     { padding:24px 0 0; }
          .sr-actions { padding:24px 0 0; flex-direction:row; align-items:stretch; gap:12px; }
          .sr-actions-col { display:flex; flex-direction:column; gap:10px; flex:1; }
          .sr-hero-score  { font-size:68px; }
          .sr-xp-row  { flex-direction:row; gap:18px; }
          .sr-xp-row > * { flex:1; }
        }
      `}</style>

      <div className="sr-wrap">

        {/* ── HERO ── */}
        <div className="sr-hero" style={{ background:`linear-gradient(135deg,${NAVY} 0%,#0c2366 50%,#1347b0 100%)`, padding:'28px 24px 24px', position:'relative', overflow:'hidden', animation:'fadeUp .45s ease' }}>
          {[['-15px','55%',GOLD,.5],['-5px','65%',CYAN,.4],['22px','72%','#fff',.3]].map(([t,r,c,o],i)=>(
            <div key={i} style={{ position:'absolute', top:t, right:r, width:8, height:8, borderRadius:'50%', background:c, opacity:o }}/>
          ))}
          <div style={{ position:'absolute', top:-40, right:-30, width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,.03)', pointerEvents:'none' }}/>

          <div style={{ position:'relative', zIndex:1 }}>
            {subjectLabel && (
              <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.4)', marginBottom:12, letterSpacing:'.04em' }}>
                {subjectLabel} · {modeLabel}
              </div>
            )}

            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:18, fontWeight:900, color:'#fff', lineHeight:1.2, marginBottom:4 }}>{headline}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.55)', marginBottom:18, lineHeight:1.5 }}>{sub}</div>

                <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:6 }}>
                  <span className="sr-hero-score" style={{ fontWeight:900, color:GOLD, lineHeight:1, letterSpacing:'-.04em' }}>
                    {accuracy}%
                  </span>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.5)' }}>
                  {correct} out of {total} correct
                </div>

                {/* Streak pill — now always shows if streak > 0 */}
                {streakDays > 0 && (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:14, padding:'6px 14px', borderRadius:999, background:'rgba(255,184,0,.18)', border:'1px solid rgba(255,184,0,.4)' }}>
                    <span style={{ fontSize:16 }}>🔥</span>
                    <div>
                      <span style={{ fontSize:13, fontWeight:900, color:GOLD }}>{streakDays} day streak</span>
                      <span style={{ fontSize:11, color:'rgba(255,184,0,.7)', marginLeft:6 }}>Keep it going!</span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ width:100, flexShrink:0, alignSelf:'flex-end' }}>
                <img src="/images/zara_studybuddy.png" alt="" style={{ width:'100%', objectFit:'contain', filter:'drop-shadow(0 4px 16px rgba(0,0,0,.45))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
              </div>
            </div>
          </div>
        </div>

        {/* ── STATS STRIP ── */}
        <div className="sr-stat-grid" style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderTop:'none' }}>
          {[
            { icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill={GREEN}/><path d="M5 9l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, label:'Correct',   value:correct,   color:GREEN  },
            { icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill={RED}/><path d="M6 6l6 6M12 6l-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>,              label:'Incorrect', value:incorrect, color:RED    },
            { icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill={ORANGE}/><path d="M9 5v4M9 12v1" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>,              label:'Skipped',   value:skipped,   color:ORANGE },
            { icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill={BLUE}/><path d="M9 5v4l2.5 2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, label:'Time', value:timeStr, color:BLUE },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 8px', borderRight:i<arr.length-1?'1px solid var(--border)':'none' }}>
              <div style={{ marginBottom:5 }}>{s.icon}</div>
              <div style={{ fontSize:18, fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:10, fontWeight:600, color:'var(--text-tert)', marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── MIDDLE ── */}
        <div className="sr-mid">

          {/* XP + Streak row */}
          <div className="sr-xp-row" style={{ animation:'fadeUp .5s .12s both' }}>
            {/* XP card */}
            <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', padding:'18px 20px', display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ fontSize:42, lineHeight:1, flexShrink:0 }}>🏆</div>
              <div>
                <div style={{ fontSize:13, color:'var(--text-tert)', fontWeight:600, marginBottom:2 }}>XP Earned</div>
                <div style={{ fontSize:28, fontWeight:900, color:GOLD, letterSpacing:'-.03em', lineHeight:1 }}>+{xpAwarded} XP</div>
                <div style={{ fontSize:12, color:'var(--text-tert)', marginTop:3 }}>
                  {xpAwarded >= 100 ? 'Excellent! Keep it up.' : xpAwarded >= 50 ? 'Nice work! Keep it up.' : 'Every point counts — keep going.'}
                </div>
              </div>
            </div>

            {/* Avg time card */}
            <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', padding:'18px 20px', display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:`${BLUE}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="9" stroke={BLUE} strokeWidth="2"/><path d="M11 7v4l2.5 2.5" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <div style={{ fontSize:13, color:'var(--text-tert)', fontWeight:600, marginBottom:2 }}>Avg per question</div>
                <div style={{ fontSize:28, fontWeight:900, color:BLUE, letterSpacing:'-.03em', lineHeight:1 }}>{avgSecs}s</div>
                <div style={{ fontSize:12, color:'var(--text-tert)', marginTop:3 }}>{timeStr} total time</div>
              </div>
            </div>
          </div>

          {/* What to improve — collapsible */}
          <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', overflow:'hidden', animation:'fadeUp .5s .22s both' }}>
            <button
              onClick={() => setImproveOpen(o => !o)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
            >
              <div>
                <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>What to improve</div>
                <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:3 }}>Focus on these topics next</div>
              </div>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
                style={{ flexShrink:0, transition:'transform .22s', transform: improveOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <path d="M4 6l5 6 5-6" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {improveOpen && (
              <div style={{ padding:'0 20px 20px', borderTop:'1px solid var(--border)' }}>
                <div style={{ height:14 }}/>
                <TopicBars questions={questions} answers={answers}/>
              </div>
            )}
          </div>

        </div>

        {/* ── ACTIONS ── */}
        <div className="sr-actions" style={{ animation:'fadeUp .5s .32s both' }}>
          {/* Primary: Review Answers */}
          <button onClick={onReview}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderRadius:16, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontFamily:'inherit', boxShadow:`0 5px 0 #0a3fa0,0 8px 24px ${BLUE}40`, transition:'transform .1s, box-shadow .1s' }}
            onMouseDown={e=>{e.currentTarget.style.transform='translateY(3px)';e.currentTarget.style.boxShadow=`0 2px 0 #0a3fa0,0 4px 12px ${BLUE}40`}}
            onMouseUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 5px 0 #0a3fa0,0 8px 24px ${BLUE}40`}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 5px 0 #0a3fa0,0 8px 24px ${BLUE}40`}}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" stroke="#fff" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="2"/></svg>
              </div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:15, fontWeight:900 }}>Review Answers</div>
                <div style={{ fontSize:11, opacity:.75, marginTop:1 }}>See questions and explanations</div>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 5l5 5-5 5" stroke="rgba(255,255,255,.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          {/* Secondary row */}
          <div className="sr-actions-col">
            <button onClick={onRetry}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderRadius:16, border:`2px solid ${GREEN}40`, background:`${GREEN}08`, cursor:'pointer', fontFamily:'inherit', transition:'all .12s', width:'100%' }}
              onMouseEnter={e=>{e.currentTarget.style.background=`${GREEN}14`}}
              onMouseLeave={e=>{e.currentTarget.style.background=`${GREEN}08`}}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:11, background:`${GREEN}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M20 10A8 8 0 1 0 19 14M20 4v6h-6" stroke={GREEN} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)' }}>Try Again</div>
                  <div style={{ fontSize:11, color:'var(--text-tert)' }}>Retry this session</div>
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            <button onClick={onHome}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderRadius:16, border:'2px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontFamily:'inherit', transition:'all .12s', width:'100%' }}
              onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-subtle)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='var(--bg-card)'}}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:11, background:'var(--bg-subtle)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="var(--text-sec)" strokeWidth="2"/><path d="M8 8h8M8 12h8M8 16h5" stroke="var(--text-sec)" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)' }}>Back to Practice</div>
                  <div style={{ fontSize:11, color:'var(--text-tert)' }}>Choose a new session</div>
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

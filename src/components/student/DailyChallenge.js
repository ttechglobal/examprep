'use client'
// src/components/student/DailyChallenge.js
// Tall, prominent teaser card. Links to /student/daily-challenge.
// Shows today's subjects, attempt status, countdown timer — all inside the card.

import { useState, useEffect } from 'react'
import Link from 'next/link'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const RED    = '#f43f5e'

function useCountdown() {
  const [t, setT] = useState('')
  useEffect(() => {
    function tick() {
      const now = new Date(), mid = new Date(); mid.setHours(24,0,0,0)
      const d = mid - now
      const h = Math.floor(d/3600000), m = Math.floor((d%3600000)/60000), s = Math.floor((d%60000)/1000)
      setT(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return t
}

// Puzzle SVG illustration
function PuzzleIllustration({ done }) {
  const c1 = done ? GREEN : CYAN
  const c2 = done ? `${GREEN}80` : `${GOLD}90`
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Piece 1 — top left */}
      <path d="M10 10h25v12a6 6 0 010 12H10V10z" fill={c1} opacity="0.9"/>
      {/* Piece 2 — top right */}
      <path d="M47 10h33v34H68a6 6 0 01-12 0H47V10z" fill={c2} opacity="0.85"/>
      {/* Piece 3 — bottom left */}
      <path d="M10 46h25a6 6 0 010 12v22H10V46z" fill={c2} opacity="0.85"/>
      {/* Piece 4 — bottom right */}
      <path d="M47 58a6 6 0 0112 0v22H47V58z" fill={c1} opacity="0.9"/>
      <path d="M59 46h21v34H59V46z" fill={c1} opacity="0.9"/>
      {/* Check or question mark */}
      {done ? (
        <path d="M30 46l8 8 16-16" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      ) : (
        <text x="26" y="38" fontSize="18" fontWeight="900" fill="#fff" opacity="0.9">?</text>
      )}
    </svg>
  )
}

export default function DailyChallenge({ profile }) {
  const countdown = useCountdown()
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const subs = [...new Set([
      ...(profile?.subjects_waec??[]),
      ...(profile?.subjects_jamb??[]),
      ...(profile?.subjects??[]),
    ])]
    const param = subs.length ? `?subjects=${encodeURIComponent(subs.join(','))}` : ''
    fetch(`/api/student/daily-quiz${param}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.challenges) setChallenges(data.challenges) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [profile])

  const total    = challenges.length || 2
  const done     = challenges.filter(c => c.state?.completed).length
  const allDone  = done === total && total > 0
  const anyDone  = done > 0
  const subjects = challenges.map(c => c.question?.subject_name).filter(Boolean)

  // Status colour
  const accentColor = allDone ? GREEN : anyDone ? ORANGE : BLUE

  return (
    <div>
      {/* Section label */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:18, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em' }}>Daily Challenge</span>
        {allDone && (
          <span style={{ fontSize:11, fontWeight:800, color:GREEN, background:`${GREEN}15`, padding:'4px 10px', borderRadius:999 }}>✓ All done!</span>
        )}
      </div>

      <Link href="/student/daily-challenge" style={{ textDecoration:'none' }}>
        <div style={{
          borderRadius:24,
          background: allDone
            ? 'var(--bg-card)'
            : `linear-gradient(145deg, ${NAVY} 0%, #0a2060 45%, #0d2e80 100%)`,
          border: `1.5px solid ${allDone ? GREEN+'40' : 'rgba(24,183,242,.2)'}`,
          padding:'0',
          overflow:'hidden',
          cursor:'pointer',
          boxShadow: allDone ? 'none' : '0 12px 40px rgba(6,42,120,.3)',
          transition:'transform .15s, box-shadow .15s',
          position:'relative',
        }}>
          {/* Background orbs — only when not done */}
          {!allDone && <>
            <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.14) 0%,transparent 70%)', pointerEvents:'none' }}/>
            <div style={{ position:'absolute', bottom:-40, left:-40, width:150, height:150, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,184,0,.08) 0%,transparent 70%)', pointerEvents:'none' }}/>
            {/* Star sparkles */}
            {[[14,'12%','18%',GOLD,.5],[10,'75%','8%',CYAN,.4],[8,'40%','88%',GOLD,.35],[12,'85%','52%',CYAN,.3]].map(([sz,top,left,c,op],i)=>(
              <div key={i} style={{ position:'absolute', top, left, fontSize:sz, color:c, opacity:op, pointerEvents:'none' }}>✦</div>
            ))}
          </>}

          {/* Top section: puzzle + text */}
          <div style={{ padding:'24px 24px 0', display:'flex', alignItems:'flex-start', gap:20, position:'relative', zIndex:1 }}>
            {/* Puzzle illustration */}
            <div style={{ flexShrink:0, opacity: loading ? 0.4 : 1, transition:'opacity .3s' }}>
              <PuzzleIllustration done={allDone} />
            </div>

            {/* Right text block */}
            <div style={{ flex:1, paddingTop:8 }}>
              <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', color: allDone ? 'var(--text-tert)' : 'rgba(255,255,255,.45)', marginBottom:6 }}>
                Today's Challenge
              </div>
              <div style={{ fontSize:22, fontWeight:900, color: allDone ? 'var(--text-prim)' : '#fff', letterSpacing:'-.03em', lineHeight:1.2, marginBottom:10 }}>
                {allDone
                  ? 'You crushed it! 🎉'
                  : loading
                  ? 'Loading…'
                  : `${total} question${total!==1?'s':''} waiting`}
              </div>

              {/* Subject pills */}
              {!loading && subjects.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
                  {subjects.map((sub, i) => {
                    const ch       = challenges[i]
                    const isChDone = ch?.state?.completed
                    const isCorrect = ch?.state?.correct
                    return (
                      <div key={i} style={{
                        padding:'5px 12px', borderRadius:999, fontSize:12, fontWeight:800,
                        background: isChDone
                          ? isCorrect ? `${GREEN}20` : `${RED}18`
                          : allDone ? 'var(--bg-subtle)' : 'rgba(255,255,255,.12)',
                        color: isChDone
                          ? isCorrect ? GREEN : RED
                          : allDone ? 'var(--text-sec)' : '#fff',
                        border: `1px solid ${isChDone ? (isCorrect?GREEN:RED)+'40' : allDone ? 'var(--border)' : 'rgba(255,255,255,.15)'}`,
                        display:'flex', alignItems:'center', gap:5,
                      }}>
                        {isChDone && <span>{isCorrect ? '✓' : '✗'}</span>}
                        {sub}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Progress bar (partial) */}
              {!loading && anyDone && !allDone && (
                <div style={{ height:4, borderRadius:999, background:'rgba(255,255,255,.12)', overflow:'hidden', marginBottom:12 }}>
                  <div style={{ height:'100%', width:`${(done/total)*100}%`, borderRadius:999, background:GREEN, transition:'width .4s' }}/>
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar: timer + CTA */}
          <div style={{
            padding:'14px 24px 18px',
            display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
            position:'relative', zIndex:1,
          }}>
            {/* Timer */}
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:14 }}>⏰</span>
              <div>
                <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color: allDone ? 'var(--text-tert)' : 'rgba(255,255,255,.4)', lineHeight:1 }}>Next challenge</div>
                <div style={{ fontSize:15, fontWeight:900, color: allDone ? 'var(--text-sec)' : '#fff', fontVariantNumeric:'tabular-nums', letterSpacing:'.02em' }}>{countdown}</div>
              </div>
            </div>

            {/* CTA button */}
            <div style={{
              padding:'11px 20px', borderRadius:14, fontSize:13, fontWeight:900,
              background: allDone ? `${GREEN}18` : 'rgba(255,255,255,.14)',
              color: allDone ? GREEN : '#fff',
              border: `1px solid ${allDone ? GREEN+'30' : 'rgba(255,255,255,.2)'}`,
              boxShadow: allDone ? 'none' : '0 2px 0 rgba(0,0,0,.3)',
              whiteSpace:'nowrap', flexShrink:0,
            }}>
              {allDone ? 'View results →' : anyDone ? 'Continue →' : 'Start Challenge →'}
            </div>
          </div>

          {/* Subtle bottom stripe when done */}
          {allDone && <div style={{ height:3, background:`linear-gradient(90deg,${GREEN}50,${GREEN}20,transparent)` }}/>}
        </div>
      </Link>
    </div>
  )
}
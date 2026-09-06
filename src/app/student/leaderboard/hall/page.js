'use client'
// src/app/student/leaderboard/hall/page.js
//
// Dedicated Hall of Champions page.
// Fetches real data from /api/leaderboard/champions.
// Shows nothing if no champions exist yet — no mock data.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'

const NAVY = '#062A78'
const BLUE = '#1264E5'
const GOLD = '#FFB800'
const CYAN = '#18B7F2'

const MEDAL = ['🥇', '🥈', '🥉']
const MEDAL_COL  = ['#FFB800', '#94a3b8', '#CD7F32']
const MEDAL_BG   = ['rgba(255,184,0,.12)', 'rgba(148,163,184,.1)', 'rgba(205,127,50,.1)']
const MEDAL_BORDER = ['rgba(255,184,0,.3)', 'rgba(148,163,184,.2)', 'rgba(205,127,50,.2)']

function BackBtn() {
  return (
    <Link href="/student/leaderboard" style={{ textDecoration:'none' }}>
      <div style={{ width:38, height:38, borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </Link>
  )
}

function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
      <div style={{ width:30, height:30, borderRadius:'50%', border:`3px solid var(--border)`, borderTopColor:GOLD, animation:'hall-spin .7s linear infinite' }}/>
      <style>{`@keyframes hall-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// The big featured card for the #1 champion of a month
function FeaturedChampion({ entry }) {
  const [copied, setCopied] = useState(false)

  const shareText = `🏆 ${entry.name} was ExamPrep's Monthly Champion for ${entry.month} with ${entry.xp.toLocaleString()} XP!\n\nThink you can top that? Join me on ExamPrep 👊\n👉 examprep.ng`

  function share() {
    if (navigator?.share) {
      navigator.share({ text: shareText }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div style={{ marginBottom: 10 }}>
      {/* The shareable card — designed to look excellent as a screenshot */}
      <div style={{
        borderRadius: 24, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(145deg, #050e2a 0%, ${NAVY} 40%, #0a1540 100%)`,
        padding: '28px 24px 24px',
        border: `1.5px solid rgba(255,184,0,.25)`,
        boxShadow: `0 12px 48px rgba(6,42,120,.35), 0 0 0 1px rgba(255,184,0,.08) inset`,
      }}>

        {/* Background star field */}
        {[[92,'8%',14,'0.5'],[30,'22%',10,'0.35'],[78,'55%',12,'0.4'],[18,'72%',8,'0.3'],[88,'38%',9,'0.45'],[52,'15%',11,'0.38']].map(([r,t,fs,op],i) => (
          <div key={i} aria-hidden="true" style={{ position:'absolute', right:`${r}%`, top:t, fontSize:fs, color:GOLD, opacity:op, pointerEvents:'none', userSelect:'none' }}>✦</div>
        ))}

        {/* Top glow */}
        <div aria-hidden="true" style={{ position:'absolute', top:-60, right:-40, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,184,0,.18) 0%,transparent 70%)', pointerEvents:'none' }}/>
        <div aria-hidden="true" style={{ position:'absolute', bottom:-40, left:-30, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,rgba(18,100,229,.15) 0%,transparent 70%)', pointerEvents:'none' }}/>

        {/* ExamPrep branding — top */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            {/* Logo mark */}
            <div style={{ width:28, height:28, borderRadius:9, background:`linear-gradient(135deg,${BLUE},${NAVY})`, border:`1.5px solid rgba(255,184,0,.3)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 10L7 2l4 8" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.5 7h5" stroke={GOLD} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize:12, fontWeight:900, color:'rgba(255,255,255,.75)', letterSpacing:'.04em' }}>ExamPrep</span>
          </div>
          <div style={{ padding:'3px 10px', borderRadius:999, background:'rgba(255,184,0,.12)', border:'1px solid rgba(255,184,0,.25)' }}>
            <span style={{ fontSize:9, fontWeight:900, color:GOLD, textTransform:'uppercase', letterSpacing:'.1em' }}>
              {entry.month}
            </span>
          </div>
        </div>

        {/* Crown + label */}
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:44, marginBottom:6, filter:'drop-shadow(0 4px 12px rgba(255,184,0,.5))' }}>👑</div>
          <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.16em', color:'rgba(255,184,0,.7)', marginBottom:4 }}>
            Monthly Champion
          </div>
        </div>

        {/* Avatar */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
          <div style={{ position:'relative' }}>
            <div style={{ width:76, height:76, borderRadius:'50%', background:`linear-gradient(135deg,${GOLD}50,${GOLD}20)`, border:`3px solid ${GOLD}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, fontWeight:900, color:GOLD, boxShadow:`0 0 0 6px rgba(255,184,0,.12), 0 8px 24px rgba(255,184,0,.25)` }}>
              {(entry.name||'?').charAt(0).toUpperCase()}
            </div>
            {/* Rank badge */}
            <div style={{ position:'absolute', bottom:-4, right:-4, width:26, height:26, borderRadius:'50%', background:GOLD, border:'2px solid #050e2a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:'#050e2a' }}>
              1
            </div>
          </div>
        </div>

        {/* Name */}
        <div style={{ textAlign:'center', marginBottom:6 }}>
          <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-.03em', lineHeight:1.2 }}>
            {entry.name}
          </div>
          {entry.school_name && (
            <div style={{ fontSize:12, color:'rgba(255,255,255,.45)', fontWeight:600, marginTop:4 }}>
              🏫 {entry.school_name}
            </div>
          )}
        </div>

        {/* XP score block */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:22, marginTop:16 }}>
          <div style={{ padding:'12px 28px', borderRadius:16, background:'rgba(255,184,0,.08)', border:'1.5px solid rgba(255,184,0,.2)', textAlign:'center' }}>
            <div style={{ fontSize:32, fontWeight:900, color:GOLD, letterSpacing:'-.04em', lineHeight:1 }}>
              {entry.xp.toLocaleString()}
            </div>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', color:'rgba(255,184,0,.6)', marginTop:4 }}>
              XP earned
            </div>
          </div>
        </div>

        {/* Bottom divider + tagline */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:14, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:10, color:'rgba(255,255,255,.3)', lineHeight:1.4 }}>
            Practice smarter.<br/>Rise higher.
          </span>
          <span style={{ fontSize:10, fontWeight:800, color:'rgba(255,184,0,.5)', letterSpacing:'.04em' }}>
            examprep.ng
          </span>
        </div>
      </div>

      {/* Share button — outside card so it doesn't show in screenshots */}
      <button
        onClick={share}
        style={{ width:'100%', marginTop:10, padding:'13px', borderRadius:16, border:`1.5px solid rgba(255,184,0,.35)`, background:'rgba(255,184,0,.07)', color:GOLD, fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .13s' }}
      >
        {copied ? (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Copied to clipboard!
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 1H13v4M13 1L7.5 6.5M6 3H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V8" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Share this champion
          </>
        )}
      </button>
    </div>
  )
}

// A compact row for older champions
function ChampionRow({ entry, index }) {
  const col    = MEDAL_COL[index]    ?? 'var(--text-tert)'
  const bg     = MEDAL_BG[index]     ?? 'var(--bg-subtle)'
  const border = MEDAL_BORDER[index] ?? 'var(--border)'

  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom:'1px solid var(--border)', background:'transparent' }}>
      {/* Medal */}
      <div style={{ width:36, height:36, borderRadius:11, background:bg, border:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
        {MEDAL[index] ?? `#${index + 1}`}
      </div>

      {/* Avatar initial */}
      <div style={{ width:34, height:34, borderRadius:'50%', background:`${col}18`, border:`1.5px solid ${col}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:col, flexShrink:0 }}>
        {(entry.name||'?').charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {entry.name}
        </div>
        <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {entry.school_name ? `🏫 ${entry.school_name}` : '—'} · {entry.month}
        </div>
      </div>

      {/* XP */}
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:14, fontWeight:900, color:col }}>{entry.xp.toLocaleString()}</div>
        <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:'var(--text-tert)' }}>XP</div>
      </div>
    </div>
  )
}

export default function HallOfChampionsPage() {
  const { dark }       = useTheme()
  const [champions, setChampions] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    fetch('/api/leaderboard/champions?limit=12')
      .then(r => r.json())
      .then(d => { setChampions(d.champions ?? []); setLoading(false) })
      .catch(e => { setError('Could not load champions.'); setLoading(false) })
  }, [])

  const featured = champions[0] ?? null
  const rest     = champions.slice(1)

  return (
    <>
      <style>{`@keyframes hall-spin{to{transform:rotate(360deg)}} @keyframes hall-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Background */}
      <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        backgroundImage: dark
          ? 'radial-gradient(circle,rgba(255,255,255,.02) 1px,transparent 1px)'
          : 'radial-gradient(circle,rgba(6,42,120,.04) 1px,transparent 1px)',
        backgroundSize:'28px 28px' }}/>
      <div aria-hidden="true" style={{ position:'fixed', top:-80, right:-60, width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,184,0,.07) 0%,transparent 70%)', pointerEvents:'none', zIndex:0 }}/>

      <div style={{ maxWidth:620, margin:'0 auto', padding:'4px 0 100px', position:'relative', zIndex:1 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <BackBtn/>
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em', lineHeight:1.2 }}>
              Hall of Champions
            </div>
            <div style={{ fontSize:12, color:'var(--text-tert)', marginTop:2 }}>
              Monthly winners — celebrated on our social media 🎉
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && <Spinner/>}

        {/* Error */}
        {error && !loading && (
          <div style={{ padding:'24px', borderRadius:16, background:'var(--bg-card)', border:'1px solid var(--border)', textAlign:'center' }}>
            <div style={{ fontSize:13, color:'var(--text-tert)' }}>{error}</div>
          </div>
        )}

        {/* No champions yet — honest empty state, no mock data */}
        {!loading && !error && champions.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 24px', background:'var(--bg-card)', borderRadius:24, border:'1px solid var(--border)', animation:'hall-fadein .3s ease' }}>
            <div style={{ fontSize:52, marginBottom:16 }}>🏆</div>
            <div style={{ fontSize:18, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', marginBottom:8 }}>
              The first champion is coming
            </div>
            <div style={{ fontSize:13, color:'var(--text-tert)', lineHeight:1.6, maxWidth:300, margin:'0 auto', marginBottom:24 }}>
              Every month, the student with the most XP earns a spot here. Keep practising — it could be you.
            </div>
            <Link href="/student/practice" style={{ textDecoration:'none' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 24px', borderRadius:14, background:BLUE, color:'#fff', fontSize:13, fontWeight:800 }}>
                Start earning XP →
              </div>
            </Link>
          </div>
        )}

        {/* Champions exist */}
        {!loading && champions.length > 0 && (
          <div style={{ animation:'hall-fadein .3s ease' }}>

            {/* Featured — most recent champion */}
            {featured && <FeaturedChampion entry={featured}/>}

            {/* Older champions */}
            {rest.length > 0 && (
              <div style={{ marginTop:16, background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', overflow:'hidden' }}>
                <div style={{ padding:'14px 16px 12px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)' }}>Previous Champions</div>
                </div>
                {rest.map((entry, i) => (
                  <ChampionRow key={entry.id} entry={entry} index={i}/>
                ))}
              </div>
            )}

            {/* Social recognition note */}
            <div style={{ marginTop:16, padding:'16px', borderRadius:16, background:`rgba(255,184,0,.05)`, border:`1px solid rgba(255,184,0,.18)`, display:'flex', alignItems:'flex-start', gap:10 }}>
              <span style={{ fontSize:20, flexShrink:0, marginTop:1 }}>📣</span>
              <div>
                <div style={{ fontSize:12, fontWeight:800, color:GOLD, marginBottom:3 }}>Monthly champions get featured</div>
                <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.5 }}>
                  Every monthly champion is celebrated on our social media pages. Share your card and let your school know who's on top.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
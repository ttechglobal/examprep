'use client'
// src/app/student/leaderboard/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Two tabs: School (within your school) and National (all students).
// School tab: shows rankings within your school. If not connected, shows
//   the JoinSchool widget inline so the student can connect right here.
// National tab: always visible, works for guests too.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePoints }       from '@/contexts/PointsContext'
import { useTheme }        from '@/contexts/ThemeContext'
import { useStudentUser }  from '@/app/student/layout'
import JoinSchool          from '@/components/student/JoinSchool'
import Link from 'next/link'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'

const CACHE_SECS     = 120  // school: 2 min
const NAT_CACHE_SECS = 120  // national: 2 min (was 10 — reduced to prevent stale empty caches)

function cacheKey(scope, period) { return `ep_lb_${scope}_${period}` }
function readCache(scope, period) {
  try {
    const ttl = scope === 'school' ? CACHE_SECS : NAT_CACHE_SECS
    const c   = JSON.parse(localStorage.getItem(cacheKey(scope, period)) || 'null')
    if (c && (Date.now() - (c.ts||0)) < ttl*1000) return c.data
    return null
  } catch { return null }
}
function writeCache(scope, period, data) {
  try { localStorage.setItem(cacheKey(scope, period), JSON.stringify({ data, ts: Date.now() })) } catch {}
}

// ── UI primitives ─────────────────────────────────────────────────────────────
function Card({ children, style={} }) {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 2px 16px rgba(6,42,120,.06)', overflow:'hidden', ...style }}>
      {children}
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroBanner({ dark, scope, schoolName, cohortName }) {
  const isSchool = scope === 'school'
  return (
    <div style={{ borderRadius:22, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY} 0%,#0a1f5e 60%,#0e2875 100%)`:`linear-gradient(135deg,${NAVY} 0%,#0c2360 50%,#1040a0 100%)`, padding:'24px 28px', display:'flex', alignItems:'center', minHeight:120 }}>
      <div style={{ position:'absolute', top:0, right:0, width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.1) 0%,transparent 70%)', pointerEvents:'none' }}/>
      {[[GOLD,14,'18%'],[CYAN,10,'32%'],[GOLD,8,'52%'],['#fff',11,'12%']].map(([c,fs,top],i)=>(
        <div key={i} style={{ position:'absolute', top, right:`${12+i*8}%`, fontSize:fs, color:c, opacity:.5 }}>✦</div>
      ))}
      <div style={{ flex:1, zIndex:1 }}>
        <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', color:isSchool?GOLD:CYAN, marginBottom:6, opacity:.9 }}>
          {isSchool ? '🏫 School Board' : '🌍 National Board'}
        </div>
        <div style={{ fontSize:24, fontWeight:900, color:'#fff', letterSpacing:'-.04em', lineHeight:1.1, marginBottom:4 }}>
          {isSchool && schoolName ? schoolName : 'Leaderboard'}
        </div>
        {isSchool && cohortName && (
          <div style={{ fontSize:12, color:GOLD, fontWeight:700, opacity:.85, marginBottom:2 }}>
            {cohortName}
          </div>
        )}
        <div style={{ fontSize:13, color:'rgba(255,255,255,.5)' }}>
          {isSchool
            ? cohortName ? `Rankings for ${cohortName}` : 'Rankings within your school'
            : 'Compete with students across Nigeria'}
        </div>
      </div>
      <div style={{ position:'relative', width:140, height:110, flexShrink:0, zIndex:1 }}>
        <img src="/images/zara_studybuddy.png" alt="" style={{ position:'absolute', bottom:0, left:0, width:110, height:110, objectFit:'contain', filter:'drop-shadow(0 4px 16px rgba(0,0,0,.4))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
        <div style={{ position:'absolute', bottom:8, right:0 }}>
          <svg width="62" height="72" viewBox="0 0 70 80" fill="none">
            <ellipse cx="35" cy="72" rx="18" ry="6" fill="rgba(255,255,255,.12)"/>
            <rect x="28" y="58" width="14" height="14" rx="2" fill={GOLD} opacity=".9"/>
            <rect x="20" y="66" width="30" height="6" rx="3" fill={GOLD}/>
            <path d="M15 8h40v28c0 11-9 20-20 20S15 47 15 36V8z" fill={GOLD}/>
            <path d="M15 14H6C6 14 4 30 15 35" stroke={GOLD} strokeWidth="4" strokeLinecap="round" fill="none"/>
            <path d="M55 14h9c0 0 2 16-9 21" stroke={GOLD} strokeWidth="4" strokeLinecap="round" fill="none"/>
            <circle cx="35" cy="26" r="8" fill="rgba(255,255,255,.25)"/>
            <text x="35" y="31" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="900">★</text>
          </svg>
        </div>
      </div>
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const AV_COLORS = [
  {bg:'rgba(255,184,0,.2)',color:GOLD},{bg:'rgba(18,100,229,.2)',color:BLUE},
  {bg:'rgba(255,106,0,.18)',color:ORANGE},{bg:'rgba(24,183,242,.18)',color:CYAN},
  {bg:'rgba(124,58,237,.18)',color:'#7C3AED'},{bg:'rgba(34,197,94,.18)',color:GREEN},
]
function Avatar({ name, size=36, idx=0, isMe=false }) {
  const { bg, color } = AV_COLORS[idx % AV_COLORS.length]
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:isMe?`linear-gradient(135deg,${NAVY},${BLUE})`:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.36, fontWeight:900, color:isMe?GOLD:color, flexShrink:0, border:isMe?`2px solid ${GOLD}40`:'none' }}>
      {(name||'?').charAt(0).toUpperCase()}
    </div>
  )
}

// ── Podium ────────────────────────────────────────────────────────────────────
function Podium({ entries, myId, dark }) {
  if (entries.length < 3) return null
  const order          = [entries[1], entries[0], entries[2]]
  const heights        = [52, 68, 40]
  const sizes          = [38, 48, 34]
  const platformColors = [
    dark?'rgba(24,183,242,.25)':'rgba(24,183,242,.18)',
    dark?'rgba(255,184,0,.35)':'rgba(255,184,0,.28)',
    dark?'rgba(255,106,0,.25)':'rgba(224,106,0,.18)',
  ]
  const medalColors = [CYAN, GOLD, ORANGE]
  const ranks = [2, 1, 3]

  return (
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:4, padding:'6px 12px', marginBottom:12 }}>
      {order.map((entry, col) => {
        const isMe    = entry?.student_id === myId
        const isFirst = col === 1
        return (
          <div key={col} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, maxWidth:col===1?120:100, minWidth:0 }}>
            {isFirst ? <div style={{ fontSize:16, marginBottom:3 }}>👑</div> : <div style={{ height:19 }}/>}
            <div style={{ width:20, height:20, borderRadius:'50%', background:medalColors[col], display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'#fff', marginBottom:5 }}>{ranks[col]}</div>
            <div style={{ marginBottom:5 }}>
              <Avatar name={entry?.name||'?'} size={sizes[col]} idx={col} isMe={isMe}/>
            </div>
            <div style={{ textAlign:'center', marginBottom:6 }}>
              <div style={{ fontSize:isFirst?11:10, fontWeight:800, color:isMe?BLUE:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'90%' }}>{entry?.name||'—'}</div>
              <div style={{ fontSize:isFirst?12:11, fontWeight:900, color:isFirst?GOLD:BLUE, marginTop:2 }}>{(entry?.xp||0).toLocaleString()} XP</div>
            </div>
            <div style={{ width:'100%', height:heights[col], borderRadius:'12px 12px 0 0', background:platformColors[col], border:`1px solid ${medalColors[col]}50`, borderBottom:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {isFirst && <div style={{ fontSize:18, opacity:.4 }}>⭐</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Board row ─────────────────────────────────────────────────────────────────
function BoardRow({ entry, rank, myId, showSchool }) {
  const isMe = entry.student_id === myId
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderTop:'1px solid var(--border)', background:isMe?`${BLUE}08`:'transparent' }}>
      <span style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', width:24, textAlign:'center', flexShrink:0 }}>{rank}</span>
      <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:isMe?`linear-gradient(135deg,${NAVY},${BLUE})`:`${BLUE}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:isMe?GOLD:BLUE }}>
        {(entry.name||'S').charAt(0)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:isMe?800:600, color:isMe?BLUE:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {isMe ? 'You' : (entry.name||'Student')}
        </div>
        {showSchool && entry.school && (
          <div style={{ fontSize:10, color:'var(--text-tert)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>
            🏫 {entry.school}
          </div>
        )}
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:13, fontWeight:800, color:isMe?GOLD:'var(--text-prim)' }}>{(entry.xp||0).toLocaleString()}</div>
        <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:'var(--text-tert)' }}>XP</div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function BoardSkeleton() {
  return (
    <Card>
      <style>{`@keyframes sk2{0%,100%{opacity:.5}50%{opacity:.25}}`}</style>
      {[...Array(7)].map((_,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid var(--border)', animation:'sk2 1.6s infinite' }}>
          <div style={{ width:22, height:14, borderRadius:4, background:'var(--bg-subtle)' }}/>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--bg-subtle)', flexShrink:0 }}/>
          <div style={{ flex:1, height:13, borderRadius:6, background:'var(--bg-subtle)' }}/>
          <div style={{ width:56, height:13, borderRadius:6, background:'var(--bg-subtle)' }}/>
        </div>
      ))}
    </Card>
  )
}

// ── School: not connected state ───────────────────────────────────────────────
function SchoolNotConnected({ profile, onLinked, isGuest }) {
  if (isGuest) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card style={{ padding:'28px 24px', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏫</div>
          <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', marginBottom:6 }}>Connect your school</div>
          <div style={{ fontSize:13, color:'var(--text-tert)', lineHeight:1.6, marginBottom:20, maxWidth:320, margin:'0 auto 20px' }}>
            Create a free account first, then enter your school's code to join the school leaderboard and share your progress with teachers.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/signup" style={{ textDecoration:'none' }}>
              <div style={{ padding:'11px 24px', borderRadius:12, background:BLUE, color:'#fff', fontSize:13, fontWeight:800 }}>Create Free Account →</div>
            </Link>
            <Link href="/login" style={{ textDecoration:'none' }}>
              <div style={{ padding:'11px 24px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-prim)', fontSize:13, fontWeight:700 }}>Sign in</div>
            </Link>
          </div>
        </Card>
        <Card style={{ padding:'16px 18px' }}>
          <div style={{ fontSize:12, fontWeight:900, color:'var(--text-prim)', marginBottom:12 }}>Why connect your school?</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { icon:'📊', text:'Your performance trends are shared with your teachers so they can help you improve.' },
              { icon:'🏆', text:'See how you rank against classmates on the school leaderboard.' },
              { icon:'📬', text:'Your parents can receive weekly progress reports if your school enables it.' },
            ].map((item,i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ width:32, height:32, borderRadius:10, background:'var(--bg-subtle)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{item.icon}</div>
                <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5, paddingTop:5 }}>{item.text}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Card style={{ padding:'28px 24px', textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🏫</div>
        <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', marginBottom:6 }}>Connect your school</div>
        <div style={{ fontSize:13, color:'var(--text-tert)', lineHeight:1.6, marginBottom:20, maxWidth:320, margin:'0 auto 20px' }}>
          Enter the school code your teacher gave you to join your school's leaderboard and let your teachers track your progress.
        </div>
        <div style={{ maxWidth:340, margin:'0 auto' }}>
          <JoinSchool profile={profile} onLinked={onLinked} compact={false}/>
        </div>
      </Card>
      <Card style={{ padding:'16px 18px' }}>
        <div style={{ fontSize:12, fontWeight:900, color:'var(--text-prim)', marginBottom:12 }}>Why connect your school?</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { icon:'📊', text:'Your performance trends are shared with your teachers so they can help you improve.' },
            { icon:'🏆', text:'See how you rank against classmates on the school leaderboard.' },
            { icon:'📬', text:'Your parents can receive weekly progress reports if your school enables it.' },
          ].map((item,i) => (
            <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'var(--bg-subtle)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{item.icon}</div>
              <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5, paddingTop:5 }}>{item.text}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}


// ── Champion card ─────────────────────────────────────────────────────────────
// Bold, horizontally-laid-out card. Left: crown + label + name + school + XP.
// Right: large trophy SVG graphic. Dark navy ExamPrep branding.
// Designed to look great as a screenshot share.

function ChampionCard({ champion, period }) {
  const [copied, setCopied] = useState(false)
  if (!champion) return null

  const isWeekly  = period === 'week' || period === 'lastWeek'
  const label     = isWeekly ? "Last Week's Champion" : "Last Month's Champion"
  const periodTag = isWeekly ? 'Last Week' : 'Last Month'
  const initial   = (champion.name || '?').charAt(0).toUpperCase()

  const shareText = `\u{1F451} ${champion.name} is ExamPrep's ${label}!\n\n\u2B50 ${(champion.xp||0).toLocaleString()} XP${champion.school ? '\n\u{1F3EB} ' + champion.school : ''}\n\nThink you can beat that? Come practise on ExamPrep \u{1F44A}\n\u{1F449} examprep.ng`

  function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ text: shareText }).catch(() => {})
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div>
      {/* Card */}
      <div style={{
        borderRadius: 20,
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(148deg, #040e24 0%, #062A78 55%, #041566 100%)',
        padding: '18px 18px 16px',
        border: '1.5px solid rgba(18,100,229,.45)',
        boxShadow: '0 12px 48px rgba(6,42,120,.55), 0 0 0 1px rgba(255,184,0,.05) inset',
      }}>

        {/* Faded watermark */}
        <div aria-hidden="true" style={{
          position: 'absolute', bottom: 8, right: -2,
          fontSize: 44, fontWeight: 900, letterSpacing: '-.06em',
          color: 'rgba(255,255,255,.07)', pointerEvents: 'none',
          whiteSpace: 'nowrap', lineHeight: 1, userSelect: 'none',
        }}>ExamPrep</div>

        {/* Diagonal stripe texture */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.015) 0px, rgba(255,255,255,.015) 1px, transparent 1px, transparent 28px)',
          pointerEvents: 'none',
        }}/>

        {/* Gold accent bar top */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #FFB800, #FF6A00 60%, transparent)',
          pointerEvents: 'none',
        }}/>

        {/* Top row: logo + period pill */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <img
              src="/images/examprep_logo.png"
              alt="ExamPrep"
              style={{ height:26, width:'auto', objectFit:'contain', filter:'brightness(0) invert(1)', opacity:.9 }}
              onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='flex' }}
            />
            <div style={{ display:'none', alignItems:'center', gap:7 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'#1264E5', border:'1.5px solid rgba(255,184,0,.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 10L6 1.5l3.5 8.5" stroke="#FFB800" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 6.5h4" stroke="#FFB800" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ fontSize:13, fontWeight:900, color:'rgba(255,255,255,.8)', letterSpacing:'.02em' }}>ExamPrep</span>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background:'rgba(255,184,0,.1)', border:'1px solid rgba(255,184,0,.28)' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="1" y="2" width="8" height="7" rx="1.5" stroke="#FFB800" strokeWidth="1.2"/>
              <path d="M3 1v2M7 1v2M1 5h8" stroke="#FFB800" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize:9, fontWeight:900, color:'#FFB800', textTransform:'uppercase', letterSpacing:'.1em' }}>{periodTag}</span>
          </div>
        </div>

        {/* Crown + big readable label */}
        <div style={{ textAlign:'center', marginBottom:14, position:'relative', zIndex:1 }}>
          <div style={{ fontSize:28, lineHeight:1, filter:'drop-shadow(0 3px 8px rgba(255,184,0,.5))', marginBottom:7 }}>👑</div>
          <div style={{ fontSize:18, fontWeight:900, color:'#fff', letterSpacing:'-.02em', lineHeight:1.15 }}>
            {label}
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', fontWeight:600, marginTop:4 }}>
            Outstanding performance, keep inspiring!
          </div>
        </div>

        {/* Avatar row inside a frosted panel */}
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          padding:'12px 14px', borderRadius:14,
          background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)',
          marginBottom:14, position:'relative', zIndex:1,
        }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{
              width:52, height:52, borderRadius:'50%',
              background:'linear-gradient(135deg, #1264E5 0%, #062A78 100%)',
              padding:2.5,
              boxShadow:'0 0 0 3px rgba(255,184,0,.3)',
            }}>
              <div style={{
                width:'100%', height:'100%', borderRadius:'50%',
                background:'linear-gradient(135deg, rgba(255,184,0,.22) 0%, rgba(255,184,0,.06) 100%)',
                border:'1.5px solid rgba(255,184,0,.35)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:20, fontWeight:900, color:'#FFB800',
              }}>{initial}</div>
            </div>
            <div style={{
              position:'absolute', bottom:-2, right:-2,
              width:20, height:20, borderRadius:'50%',
              background:'#FFB800', border:'2px solid #040e24',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:10, fontWeight:900, color:'#040e24',
            }}>1</div>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:900, color:'#fff', letterSpacing:'-.02em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {champion.name}
            </div>
            {(champion.school || champion.school_name) && (
              <div style={{ fontSize:10, color:'rgba(255,255,255,.38)', fontWeight:600, marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                🏫 {champion.school || champion.school_name}
              </div>
            )}
          </div>
        </div>

        {/* XP — star + big number */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:14, position:'relative', zIndex:1 }}>
          <div style={{
            display:'flex', alignItems:'center', gap:9,
            padding:'10px 24px', borderRadius:14,
            background:'rgba(255,184,0,.07)', border:'1.5px solid rgba(255,184,0,.22)',
          }}>
            <span style={{ fontSize:18, lineHeight:1 }}>⭐</span>
            <div>
              <div style={{ fontSize:26, fontWeight:900, color:'#FFB800', letterSpacing:'-.04em', lineHeight:1 }}>
                {(champion.xp || 0).toLocaleString()}
              </div>
              <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', color:'rgba(255,184,0,.5)', marginTop:2 }}>
                XP Earned
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:11,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          position:'relative', zIndex:1,
        }}>
          <span style={{ fontSize:10, color:'rgba(255,255,255,.22)', fontStyle:'italic' }}>Practice smarter. Rise higher.</span>
          <span style={{ fontSize:10, fontWeight:800, color:'rgba(255,184,0,.45)', letterSpacing:'.04em' }}>examprep.ng</span>
        </div>
      </div>

      {/* Share button */}
      <button
        onClick={share}
        style={{
          width:'100%', marginTop:8, padding:'12px', borderRadius:14,
          border:'1.5px solid rgba(18,100,229,.4)',
          background:'rgba(18,100,229,.08)',
          color:'#1264E5',
          fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
          display:'flex', alignItems:'center', justifyContent:'center', gap:7,
          transition:'all .13s',
        }}
      >
        {copied ? (
          <>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8.5 1H12v3.5M12 1L7 6M5.5 3H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Share {isWeekly ? "last week's" : "this month's"} champion
          </>
        )}
      </button>
    </div>
  )
}

// ── Invite Friends card ───────────────────────────────────────────────────────
// Clean compact card. Share a catchy message about ExamPrep.
// Used on both leaderboard (sidebar) and profile page.

export function InviteFriendsCard({ compact = false }) {
  const [copied, setCopied] = useState(false)

  const inviteText = `🎯 I'm building my WAEC & JAMB knowledge on ExamPrep — one practice session at a time.\n\nEvery question earns XP. Every XP climbs the leaderboard. Come practice with me and let's see who comes out on top 👊\n\n👉 examprep.ng`

  function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'Practice with me on ExamPrep',
        text: inviteText,
        url: 'https://examprep.ng',
      }).catch(() => {})
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(inviteText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2800)
    }
  }

  if (compact) {
    // Slim version for sidebar — just an invite button row
    return (
      <button
        onClick={share}
        style={{
          width:'100%', padding:'12px 16px', borderRadius:14,
          border:'1.5px solid rgba(18,100,229,.3)',
          background:'rgba(18,100,229,.06)',
          display:'flex', alignItems:'center', gap:10,
          cursor:'pointer', fontFamily:'inherit', textAlign:'left',
          transition:'opacity .13s',
        }}
      >
        <div style={{ width:36, height:36, borderRadius:11, background:`${BLUE}15`, border:`1px solid ${BLUE}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16 }}>
          📣
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:800, color:BLUE }}>
            {copied ? 'Link copied! ✓' : 'Invite friends to practise'}
          </div>
          <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {copied ? 'Share this with your classmates' : 'Build XP together · Beat each other\'s score'}
          </div>
        </div>
        {!copied && (
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink:0, opacity:.5 }}>
            <path d="M8.5 1H12v3.5M12 1L7 6M5.5 3H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V8.5" stroke={BLUE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    )
  }

  // Full version — for leaderboard sidebar and profile
  return (
    <div style={{
      borderRadius:18, overflow:'hidden',
      border:'1px solid var(--border)',
      background:'var(--bg-card)',
    }}>
      {/* Thin blue accent top */}
      <div style={{ height:3, background:`linear-gradient(90deg, ${BLUE}, ${CYAN})` }}/>

      <div style={{ padding:'16px 16px 14px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:`${BLUE}12`, border:`1px solid ${BLUE}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
            📣
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)', marginBottom:3 }}>Invite your classmates</div>
            <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.55 }}>
              Practise together, build XP, and see who tops the leaderboard first.
            </div>
          </div>
        </div>

        <button
          onClick={share}
          style={{
            width:'100%', padding:'11px 14px', borderRadius:11,
            background: copied ? `${GREEN}15` : `linear-gradient(135deg, ${BLUE} 0%, #0d4fd4 100%)`,
            border: copied ? `1.5px solid ${GREEN}40` : 'none',
            color: copied ? GREEN : '#fff',
            fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
            display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            transition:'all .15s',
          }}
        >
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Copied! Send it to them 🔥
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8.5 1H12v3.5M12 1L7 6M5.5 3H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V8.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Invite friends to ExamPrep
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function ChampionCards({ board, period }) {
  // Only show for a COMPLETED period — last week or this month.
  // "This Week" is still in progress so there's no champion yet.
  const show = period === 'week' || period === 'lastWeek' || period === 'month'
  if (!show || !board[0]) return null
  return <ChampionCard champion={board[0]} period={period}/>
}

// ── Hall of Champions link card ────────────────────────────────────────────────
// Points to /student/leaderboard/hall — the full page with real data.
// Shows the most recent champion fetched from the API.

function HallOfChampionsPreview() {
  const [latest,   setLatest]   = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard/champions?limit=1')
      .then(r => r.json())
      .then(d => {
        setLatest(d.champions?.[0] ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <Link href="/student/leaderboard/hall" style={{ textDecoration:'none', display:'block' }}>
      <div style={{ borderRadius:18, border:'1px solid var(--border)', background:'var(--bg-card)', padding:'14px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer', transition:'all .13s' }}>
        {/* Icon */}
        <div style={{ width:38, height:38, borderRadius:12, background:`rgba(255,184,0,.1)`, border:`1px solid rgba(255,184,0,.22)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
          🏛️
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.01em' }}>Hall of Champions</div>
          {loading ? (
            <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:2 }}>Loading…</div>
          ) : latest ? (
            <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              Latest: {latest.name} · {latest.month}
            </div>
          ) : (
            <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:2 }}>Monthly champions · View all</div>
          )}
        </div>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink:0, opacity:.4 }}>
          <path d="M4 2l5 4.5L4 11" stroke="var(--text-prim)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </Link>
  )
}

// ── Board display ─────────────────────────────────────────────────────────────
function BoardDisplay({ board, myId, loading, scope }) {
  if (loading) return <BoardSkeleton/>
  if (!board.length) return (
    <Card style={{ padding:'28px 18px', textAlign:'center' }}>
      <div style={{ fontSize:32, marginBottom:8 }}>🏆</div>
      <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No rankings yet</div>
      <div style={{ fontSize:12, color:'var(--text-tert)' }}>
        {scope === 'school' ? 'Be the first in your school to earn XP!' : 'Start practising to appear on the leaderboard!'}
      </div>
      <Link href="/student/practice" style={{ textDecoration:'none' }}>
        <div style={{ marginTop:14, display:'inline-block', padding:'10px 22px', borderRadius:999, background:BLUE, color:'#fff', fontSize:13, fontWeight:800 }}>Start Practising →</div>
      </Link>
    </Card>
  )

  return (
    <Card>
      <style>{`.lb-rows{padding:0 4px}@media(min-width:480px){.lb-rows{padding:0}}`}</style>
      {board.length >= 3 && <Podium entries={board.slice(0,3)} myId={myId} dark={false}/>}
      <div className="lb-rows">
        {board.slice(board.length >= 3 ? 3 : 0).map((entry, i) => (
          <BoardRow key={entry.student_id} entry={entry} rank={(board.length >= 3 ? 3 : 0) + i + 1} myId={myId} showSchool={scope === 'national'}/>
        ))}
      </div>
    </Card>
  )
}

// ── My rank banner ────────────────────────────────────────────────────────────
function MyRankBanner({ board, myId, xp }) {
  const myEntry = board.find(e => e.student_id === myId)
  if (!myEntry) return null
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:16, background:`${BLUE}10`, border:`1px solid ${BLUE}25` }}>
      <div style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:900, color:GOLD, flexShrink:0 }}>
        #{myEntry.rank}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:800, color:'var(--text-prim)' }}>Your position</div>
        <div style={{ fontSize:11, color:'var(--text-tert)' }}>
          {myEntry.rank === 1 ? '👑 You\'re in the lead!' : `${myEntry.rank - 1} student${myEntry.rank > 2 ? 's' : ''} ahead of you`}
        </div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:14, fontWeight:900, color:GOLD }}>{(myEntry.xp||0).toLocaleString()}</div>
        <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:'var(--text-tert)' }}>XP</div>
      </div>
    </div>
  )
}

// ── Period tabs ───────────────────────────────────────────────────────────────
const PERIOD_TABS = [
  { key:'week',     label:'This Week'  },
  { key:'lastWeek', label:'Last Week'  },
  { key:'month',    label:'This Month' },
  { key:'all',      label:'All Time'   },
]

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { dark }            = useTheme()
  const { totalPoints: xp } = usePoints()
  const profile             = useStudentUser()
  const isGuest             = !!profile?.isGuest
  const isReady             = profile !== null

  const myId = profile?.id ?? null

  const [scope,      setScope]      = useState('school')
  const [period,     setPeriod]     = useState('week')
  const [board,      setBoard]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [isFallback, setIsFallback] = useState(false)
  const [schoolName, setSchoolName] = useState(profile?.school_name ?? null)
  const [cohortName, setCohortName] = useState(null)

  // Live school_id — updated when JoinSchool completes
  const [schoolId, setSchoolId] = useState(profile?.school_id ?? null)
  useEffect(() => {
    if (profile?.school_id) setSchoolId(profile.school_id)
    if (profile?.school_name) setSchoolName(profile.school_name)
    // Guests start on national
    if (isGuest) setScope('national')
  }, [profile?.school_id, profile?.school_name, isGuest])

  const hasSchool = !isGuest && !!schoolId

  const fetchBoard = useCallback(async (sc, per) => {
    // School tab, no school → skip fetch
    if (sc === 'school' && !hasSchool) { setBoard([]); setLoading(false); return }

    const cached = readCache(sc, per)
    // Skip cache if it's empty — always re-fetch to check if data appeared
    if (cached && cached.length > 0) { setBoard(cached); setLoading(false); return }

    setLoading(true)
    setIsFallback(false)
    try {
      const endpoint = sc === 'school'
        ? `/api/leaderboard/school?limit=20&period=${per}`
        : `/api/leaderboard/national?limit=20&period=${per}`
      const res  = await fetch(endpoint)
      if (!res.ok) { setBoard([]); return }
      const data = await res.json()
      const list = data.leaderboard ?? []
      if (data.school_name) setSchoolName(data.school_name)
      if (data.cohort_name) setCohortName(data.cohort_name)
      // Only cache non-empty results — empty may be a transient failure
      if (list.length > 0) writeCache(sc, per, list)
      setBoard(list)
      setIsFallback(!!data.fallback)
    } catch {
      setBoard([])
    } finally {
      setLoading(false)
    }
  }, [hasSchool])

  useEffect(() => {
    if (!isReady) return
    fetchBoard(scope, period)
  }, [isReady, scope, period, hasSchool, fetchBoard])

  function handleLinked({ school_id, school_name }) {
    setSchoolId(school_id)
    if (school_name) setSchoolName(school_name)
    // Refresh school board now that they're connected
    setBoard([])
    setLoading(true)
    setTimeout(() => fetchBoard('school', period), 500)
  }

  if (!isReady) return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ height:120, borderRadius:22, background:`linear-gradient(135deg,${NAVY},#0d2872)`, opacity:.7 }}/>
      <BoardSkeleton/>
    </div>
  )

  const showSchoolBoard = scope === 'school' && hasSchool
  const showJoinCTA     = scope === 'school' && !hasSchool

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <style>{`@media(min-width:1024px){.lb-grid{display:grid!important;grid-template-columns:1fr 300px!important;gap:20px!important;align-items:flex-start!important}.lb-left-extras{display:flex!important}}`}</style>

      {/* ── Scope tabs ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'inline-flex', background:'var(--bg-subtle)', borderRadius:14, padding:3, border:'1px solid var(--border)', gap:2 }}>
          <button onClick={() => setScope('school')} style={{ padding:'9px 20px', borderRadius:11, fontSize:13, fontWeight:scope==='school'?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:scope==='school'?BLUE:'transparent', color:scope==='school'?'#fff':'var(--text-tert)', transition:'all .15s', display:'flex', alignItems:'center', gap:6 }}>
            🏫 School
            {hasSchool && <span style={{ fontSize:10, background:scope==='school'?'rgba(255,255,255,.2)':'var(--border)', color:scope==='school'?'#fff':'var(--text-tert)', padding:'1px 6px', borderRadius:999 }}>●</span>}
          </button>
          <button onClick={() => setScope('national')} style={{ padding:'9px 20px', borderRadius:11, fontSize:13, fontWeight:scope==='national'?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:scope==='national'?BLUE:'transparent', color:scope==='national'?'#fff':'var(--text-tert)', transition:'all .15s' }}>
            🌍 National
          </button>
        </div>

        {/* Period tabs — only show when board is relevant */}
        {(!showJoinCTA) && (
          <div style={{ display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none', paddingBottom:2 }}>
            {PERIOD_TABS.map(t => {
              const on = t.key === period
              return (
                <button key={t.key} onClick={() => setPeriod(t.key)} style={{ padding:'7px 12px', borderRadius:999, fontSize:12, fontWeight:on?800:600, border:`1px solid ${on?BLUE:'var(--border)'}`, background:on?`${BLUE}14`:'transparent', color:on?BLUE:'var(--text-tert)', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', transition:'all .15s' }}>
                  {t.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <HeroBanner dark={dark} scope={scope} schoolName={schoolName} cohortName={cohortName}/>

      <div className="lb-grid" style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* ── Left / main ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* School: not connected */}
          {showJoinCTA && (
            <SchoolNotConnected profile={profile} onLinked={handleLinked} isGuest={isGuest}/>
          )}

          {/* School or national board */}
          {!showJoinCTA && (
            <>
              {/* My rank banner */}
              {!loading && board.length > 0 && myId && (
                <MyRankBanner board={board} myId={myId} xp={xp}/>
              )}
              {/* Fallback notice — shown when question_attempts is empty for the window */}
              {!loading && isFallback && period !== 'all' && board.length > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:12, background:'rgba(255,184,0,.08)', border:'1px solid rgba(255,184,0,.25)' }}>
                  <span style={{ fontSize:14 }}>ℹ️</span>
                  <span style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.5 }}>
                    Showing all-time XP — weekly data will populate as students practise this week.
                  </span>
                </div>
              )}

              <BoardDisplay board={board} myId={myId} loading={loading} scope={scope}/>

              {/* School: connected badge */}
              {scope === 'school' && hasSchool && schoolName && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:12, background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.2)' }}>
                  <span>🏫</span>
                  <div style={{ flex:1, fontSize:12, fontWeight:700, color:'var(--text-sec)' }}>{schoolName}</div>
                  <span style={{ fontSize:11, color:GREEN, fontWeight:800 }}>Connected ✓</span>
                </div>
              )}

              {/* Motivational footer */}
              <div style={{ borderRadius:18, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY},#0a1f5e)`:`linear-gradient(135deg,#f0f6ff,#e8f0ff)`, border:`1px solid ${BLUE}20`, padding:'18px 18px 18px 140px', minHeight:100 }}>
                <div style={{ position:'absolute', bottom:0, left:0, width:130, height:100 }}>
                  <img src="/images/zara_studybuddy.png" alt="" style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'bottom left', filter:'drop-shadow(0 2px 8px rgba(0,0,0,.2))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
                </div>
                <div style={{ position:'relative', zIndex:1 }}>
                  <div style={{ fontSize:14, fontWeight:900, color:dark?'#fff':'var(--text-prim)', letterSpacing:'-.02em', marginBottom:4 }}>Keep climbing! 🚀</div>
                  <div style={{ fontSize:12, color:dark?'rgba(255,255,255,.55)':'var(--text-tert)', lineHeight:1.5 }}>Every practice session earns XP. The more you practise, the higher you climb!</div>
                </div>
              </div>

              {/* Invite + CTAs — shown in left col on desktop, hidden on mobile (shown in right col instead) */}
              <div className="lb-left-extras" style={{ display:'none', flexDirection:'column', gap:14 }}>
                <InviteFriendsCard/>
                {isGuest && (
                  <div style={{ borderRadius:18, padding:'20px 18px', background:`linear-gradient(135deg,${BLUE} 0%,${NAVY} 100%)`, position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', top:-20, right:-20, width:110, height:110, borderRadius:'50%', background:'rgba(255,255,255,.07)', pointerEvents:'none' }}/>
                    <div style={{ fontSize:13, fontWeight:900, color:'#fff', marginBottom:6 }}>🏆 Join the leaderboard!</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', lineHeight:1.5, marginBottom:14 }}>Create a free account to earn XP, connect your school, and compete with students across Nigeria.</div>
                    <Link href="/register" style={{ textDecoration:'none' }}>
                      <button style={{ width:'100%', padding:'11px', borderRadius:11, border:'none', cursor:'pointer', background:'#fff', color:BLUE, fontSize:13, fontWeight:900, fontFamily:'inherit' }}>Create Free Account →</button>
                    </Link>
                  </div>
                )}
                {!isGuest && !hasSchool && scope === 'national' && (
                  <Card style={{ padding:'16px' }}>
                    <div style={{ fontSize:12, fontWeight:900, color:'var(--text-prim)', marginBottom:10 }}>🏫 Connect your school</div>
                    <div style={{ fontSize:11, color:'var(--text-tert)', marginBottom:12, lineHeight:1.5 }}>
                      Enter the school code your teacher gave you to join the leaderboard and share progress with your teachers.
                    </div>
                    <JoinSchool profile={profile} onLinked={handleLinked} compact={true}/>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Right col ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Champion card — larger on desktop due to wider column */}
          {board.length > 0 && !loading && (
            <ChampionCards board={board} period={period}/>
          )}

          {/* Hall of Champions */}
          <HallOfChampionsPreview/>

          {/* Invite + CTAs — shown in right col on mobile, hidden on desktop (moved to left) */}
          <div className="lb-mobile-extras" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <style>{`@media(min-width:1024px){.lb-mobile-extras{display:none!important}}`}</style>
            <InviteFriendsCard/>
            {isGuest && (
              <div style={{ borderRadius:18, padding:'20px 18px', background:`linear-gradient(135deg,${BLUE} 0%,${NAVY} 100%)`, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-20, right:-20, width:110, height:110, borderRadius:'50%', background:'rgba(255,255,255,.07)', pointerEvents:'none' }}/>
                <div style={{ fontSize:13, fontWeight:900, color:'#fff', marginBottom:6 }}>🏆 Join the leaderboard!</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', lineHeight:1.5, marginBottom:14 }}>Create a free account to earn XP, connect your school, and compete with students across Nigeria.</div>
                <Link href="/register" style={{ textDecoration:'none' }}>
                  <button style={{ width:'100%', padding:'11px', borderRadius:11, border:'none', cursor:'pointer', background:'#fff', color:BLUE, fontSize:13, fontWeight:900, fontFamily:'inherit' }}>Create Free Account →</button>
                </Link>
              </div>
            )}
            {!isGuest && !hasSchool && scope === 'national' && (
              <Card style={{ padding:'16px' }}>
                <div style={{ fontSize:12, fontWeight:900, color:'var(--text-prim)', marginBottom:10 }}>🏫 Connect your school</div>
                <div style={{ fontSize:11, color:'var(--text-tert)', marginBottom:12, lineHeight:1.5 }}>
                  Enter the school code your teacher gave you to join the leaderboard and share progress with your teachers.
                </div>
                <JoinSchool profile={profile} onLinked={handleLinked} compact={true}/>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
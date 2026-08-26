'use client'
// src/app/student/profile/page.js — v1
// Profile page: avatar + name + rank card + info sections + goals + exam scores
// + activity summary + settings + premium upsell + logout
// Desktop: sidebar + 3-col layout. Mobile: topbar + single col + bottom nav.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/contexts/ThemeContext'
import { StudentSidebar, StudentBottomNav } from '@/components/student/StudentNav'
import Link from 'next/link'

// ─── BRAND ────────────────────────────────────────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const PURPLE = '#7C3AED'
const RED    = '#f43f5e'

// ─── RANK SYSTEM ──────────────────────────────────────────────────────────────
const RANKS = [
  { name:'Bronze',   minXp:0,     maxXp:1000,  color:'#cd7f32', icon:'🥉', bg:'rgba(205,127,50,.15)' },
  { name:'Silver I', minXp:1000,  maxXp:3000,  color:'#9ca3af', icon:'🥈', bg:'rgba(156,163,175,.15)' },
  { name:'Silver II',minXp:3000,  maxXp:5000,  color:'#6b7280', icon:'🥈', bg:'rgba(107,114,128,.15)' },
  { name:'Gold I',   minXp:5000,  maxXp:8000,  color:GOLD,      icon:'🥇', bg:`${GOLD}18` },
  { name:'Gold II',  minXp:8000,  maxXp:12000, color:GOLD,      icon:'🥇', bg:`${GOLD}18` },
  { name:'Platinum', minXp:12000, maxXp:20000, color:CYAN,      icon:'💎', bg:`${CYAN}18` },
  { name:'Diamond',  minXp:20000, maxXp:35000, color:BLUE,      icon:'💠', bg:`${BLUE}18` },
  { name:'Legend',   minXp:35000, maxXp:Infinity, color:ORANGE, icon:'👑', bg:`${ORANGE}18` },
]
function getRank(xp) {
  return RANKS.find(r => xp >= r.minXp && xp < r.maxXp) ?? RANKS[RANKS.length-1]
}
function getNextRank(xp) {
  const idx = RANKS.findIndex(r => xp >= r.minXp && xp < r.maxXp)
  return RANKS[idx+1] ?? null
}

// ─── BG ───────────────────────────────────────────────────────────────────────
function AppBackground({ dark }) {
  return (
    <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage: dark?'radial-gradient(circle,rgba(255,255,255,.03) 1px,transparent 1px)':'radial-gradient(circle,rgba(6,42,120,.06) 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>
      {dark?(<>
        <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', background:'rgba(18,100,229,.08)', filter:'blur(70px)', top:-100, right:-80 }}/>
        <div style={{ position:'absolute', width:280, height:280, borderRadius:'50%', background:'rgba(6,42,120,.15)', filter:'blur(60px)', bottom:-80, left:-80 }}/>
      </>):(<>
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(18,100,229,.05)', filter:'blur(60px)', top:-60, right:-40 }}/>
        <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'rgba(255,184,0,.04)', filter:'blur(50px)', bottom:-40, left:-50 }}/>
      </>)}
    </div>
  )
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
function Card({ children, style={} }) {
  return <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 2px 16px rgba(6,42,120,.06)', overflow:'hidden', ...style }}>{children}</div>
}
function Row({ children, style={} }) {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 18px', borderBottom:'1px solid var(--border)', ...style }}>{children}</div>
}
function ChevronRight({ color='var(--text-tert)' }) {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

// ─── DESKTOP TOPBAR ───────────────────────────────────────────────────────────
function DesktopTopbar({ name, xp, dark, toggle }) {
  const level = Math.floor((xp||0)/2000)+1
  const initials = (name||'EX').slice(0,2).toUpperCase()
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:18, borderBottom:'1px solid var(--border)', marginBottom:24 }}>
      <div style={{ flex:1, maxWidth:420, position:'relative' }}>
        <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="var(--text-tert)" strokeWidth="1.8"/><path d="M15 15l3 3" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </div>
        <input placeholder="Search topics, lessons, questions…" style={{ width:'100%', padding:'10px 14px 10px 40px', borderRadius:13, border:'1px solid var(--border)', background:'var(--bg-subtle)', color:'var(--text-prim)', fontSize:13, fontFamily:'inherit', outline:'none' }}/>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginLeft:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:999, background:dark?'rgba(255,184,0,.12)':'rgba(255,184,0,.1)', border:`1px solid ${GOLD}30` }}>
          <span style={{ fontSize:16 }}>⚡</span>
          <span style={{ fontSize:13, fontWeight:900, color:GOLD }}>{(xp||0).toLocaleString()} XP</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', borderRadius:999, background:dark?'rgba(244,63,94,.12)':'rgba(244,63,94,.08)', border:'1px solid rgba(244,63,94,.25)' }}>
          <span style={{ fontSize:16 }}>💗</span>
          <span style={{ fontSize:13, fontWeight:900, color:RED }}>32</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px 6px 6px', borderRadius:999, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:GOLD }}>{initials}</div>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text-prim)', lineHeight:1 }}>{name}</div>
            <div style={{ fontSize:9, color:'var(--text-tert)', marginTop:1 }}>Level {level} 👑</div>
          </div>
        </div>
        <button onClick={toggle} style={{ width:36, height:36, borderRadius:11, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          {dark
            ? <svg width="15" height="15" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="4" stroke="var(--text-tert)" strokeWidth="2"/><path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.9 4.9l1.4 1.4M15.7 15.7l1.4 1.4M4.9 17.1l1.4-1.4M15.7 6.3l1.4-1.4" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round"/></svg>
            : <svg width="15" height="15" viewBox="0 0 22 22" fill="none"><path d="M20 14.5A9 9 0 017.5 2a9 9 0 1012.5 12.5z" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          }
        </button>
      </div>
    </div>
  )
}

// ─── MOBILE TOPBAR ────────────────────────────────────────────────────────────
function MobileTopbar({ dark, toggle }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px', position:'sticky', top:0, zIndex:50, background:dark?'rgba(10,13,28,.93)':'rgba(249,250,255,.93)', backdropFilter:'blur(16px)', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em' }}>Profile</span>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <Link href="/student/profile/settings">
          <div style={{ width:32, height:32, borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="3" stroke="var(--text-tert)" strokeWidth="1.7"/><path d="M11 2v2m0 16v-2m-7-7H2m18 0h-2M4.9 4.9l1.4 1.4m9.9 9.9 1.4 1.4M4.9 17.1l1.4-1.4m9.9-9.9 1.4-1.4" stroke="var(--text-tert)" strokeWidth="1.7" strokeLinecap="round"/></svg>
          </div>
        </Link>
        <button onClick={toggle} style={{ width:32, height:32, borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          {dark
            ? <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="4" stroke="var(--text-tert)" strokeWidth="2"/><path d="M11 2v2M11 18v2M2 11h2M18 11h2" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round"/></svg>
            : <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path d="M20 14.5A9 9 0 017.5 2a9 9 0 1012.5 12.5z" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          }
        </button>
      </div>
    </div>
  )
}

// ─── AVATAR CARD ─────────────────────────────────────────────────────────────
function AvatarCard({ profile, xp, isGuest, dark }) {
  const rank     = getRank(xp)
  const nextRank = getNextRank(xp)
  const xpToNext = nextRank ? nextRank.minXp - xp : 0
  const pct      = nextRank ? Math.round(((xp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100) : 100
  const initials = ((profile?.first_name||'E').charAt(0) + (profile?.last_name||'X').charAt(0)).toUpperCase()
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.username || 'Student'
  const username = profile?.username ? `@${profile.username}` : null
  const bio = profile?.bio || 'Discipline today, freedom tomorrow. 🚀'
  const joined = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB',{month:'long',year:'numeric'}) : 'May 2024'

  return (
    <Card>
      {/* Blue header strip */}
      <div style={{ height:56, background:`linear-gradient(135deg,${NAVY},${BLUE})`, position:'relative' }}>
        <div style={{ position:'absolute', top:0, right:0, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.15) 0%,transparent 70%)', pointerEvents:'none' }}/>
      </div>
      <div style={{ padding:'0 24px 24px', position:'relative' }}>
        {/* Avatar — overlapping the strip */}
        <div style={{ position:'relative', display:'inline-block', marginTop:-36, marginBottom:10 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, border:`3px solid var(--bg-card)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:900, color:GOLD, overflow:'hidden', position:'relative' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.currentTarget.style.display='none'}}/>
              : initials
            }
          </div>
          {/* Camera button */}
          <label style={{ position:'absolute', bottom:2, right:2, width:22, height:22, borderRadius:'50%', background:BLUE, border:`2px solid var(--bg-card)`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M14 12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1h2l1.5-2h3L11 5h2a1 1 0 011 1v6z" stroke="#fff" strokeWidth="1.4" fill="none"/><circle cx="8" cy="8.5" r="2" stroke="#fff" strokeWidth="1.4"/></svg>
          </label>
        </div>

        {/* Name + username */}
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
          <span style={{ fontSize:20, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em' }}>{displayName}</span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill={BLUE}/><path d="M5 9l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <button style={{ width:22, height:22, borderRadius:7, background:'var(--bg-subtle)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M9.5 1.5l3 3L4 13H1v-3L9.5 1.5z" stroke="var(--text-tert)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        {username && <div style={{ fontSize:13, color:'var(--text-tert)', marginBottom:6 }}>{username}</div>}
        <div style={{ fontSize:13, color:'var(--text-tert)', marginBottom:12, fontStyle:'italic', lineHeight:1.4 }}>{bio}</div>

        {/* Meta chips */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="2" stroke="var(--text-tert)" strokeWidth="1.4"/><path d="M4 1v2M10 1v2M1 5h12" stroke="var(--text-tert)" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--text-tert)' }}>Joined {joined}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1C4.8 1 3 2.8 3 5c0 3.3 4 8 4 8s4-4.7 4-8c0-2.2-1.8-4-4-4z" stroke="var(--text-tert)" strokeWidth="1.4" fill="none"/><circle cx="7" cy="5" r="1.5" fill="var(--text-tert)"/></svg>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--text-tert)' }}>{profile?.country||'Nigeria'}</span>
          </div>
        </div>

        {/* Rank strip */}
        <div style={{ padding:'14px 16px', borderRadius:16, background:dark?'rgba(255,255,255,.04)':'rgba(6,42,120,.04)', border:'1px solid var(--border)', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:40, height:40, borderRadius:14, background:rank.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{rank.icon}</div>
              <div>
                <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>{rank.name}</div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)' }}>Current Rank</div>
              </div>
            </div>
            {nextRank && (
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:14, fontWeight:900, color:BLUE }}>{xpToNext.toLocaleString()} XP</div>
                <div style={{ fontSize:10, color:'var(--text-tert)' }}>to reach {nextRank.name}</div>
              </div>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)' }}>{(xp||0).toLocaleString()} / {(nextRank?.minXp||xp).toLocaleString()} XP</span>
            <span style={{ fontSize:10, fontWeight:800, color:rank.color }}>{pct}%</span>
          </div>
          <div style={{ height:8, borderRadius:999, background:dark?'rgba(255,255,255,.1)':'rgba(6,42,120,.08)', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, borderRadius:999, background:`linear-gradient(90deg,${rank.color},${nextRank?.color||rank.color})`, transition:'width .8s ease' }}/>
          </div>
          <div style={{ marginTop:10, textAlign:'right' }}>
            <Link href="/student/leaderboard" style={{ fontSize:11, fontWeight:700, color:BLUE, textDecoration:'none' }}>View All Ranks →</Link>
          </div>
        </div>

        {/* Edit Profile button */}
        <Link href="/student/profile/edit" style={{ textDecoration:'none', display:'block' }}>
          <button style={{ width:'100%', padding:'12px', borderRadius:13, border:`1.5px solid ${BLUE}`, cursor:'pointer', fontFamily:'inherit', fontWeight:800, fontSize:14, background:'transparent', color:BLUE, transition:'all .15s' }}>
            Edit Profile
          </button>
        </Link>

        {/* Guest → Create Account prompt */}
        {isGuest && (
          <div style={{ marginTop:14, padding:'14px 16px', borderRadius:14, background:`${ORANGE}10`, border:`1.5px solid ${ORANGE}35` }}>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', marginBottom:4 }}>Back up your progress! 📲</div>
            <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.5, marginBottom:10 }}>Create a free account to save your progress, sync across devices, and unlock more features.</div>
            <Link href="/auth/signup" style={{ textDecoration:'none' }}>
              <button style={{ width:'100%', padding:'10px', borderRadius:11, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:900, fontSize:13, background:ORANGE, color:'#fff', boxShadow:`0 4px 14px ${ORANGE}40` }}>Create Free Account</button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── INFO SECTION (desktop right sidebar version) ─────────────────────────────
function InfoRows({ profile, dark }) {
  const fields = [
    { icon:'🏫', label:'School', value:profile?.school||'Add school', href:'/student/profile/edit?field=school' },
    { icon:'🎓', label:'Class',  value:profile?.class_level||'Add class', href:'/student/profile/edit?field=class' },
    { icon:'📋', label:'Exams',  value:(profile?.exam_types||['WAEC','JAMB']).join(', '), href:'/student/profile/edit?field=exams' },
    { icon:'📚', label:'Subjects', value:profile?.subjects?.length ? `${profile.subjects.length} Subjects` : 'Add subjects', href:'/student/profile/edit?field=subjects' },
    { icon:'🎯', label:'Goals',  value:'View & edit', href:'/student/profile/goals' },
  ]
  return (
    <Card>
      <div style={{ padding:'16px 18px 8px', fontSize:13, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.015em' }}>My Information</div>
      {fields.map((f,i)=>(
        <Link key={i} href={f.href} style={{ textDecoration:'none' }}>
          <Row style={{ borderBottom:i<fields.length-1?'1px solid var(--border)':'none', cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', gap:11 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:dark?'rgba(255,255,255,.05)':'rgba(6,42,120,.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{f.icon}</div>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>{f.label}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--text-tert)' }}>{f.value}</span>
              <ChevronRight/>
            </div>
          </Row>
        </Link>
      ))}
    </Card>
  )
}

// ─── STREAK CARD ─────────────────────────────────────────────────────────────
function StreakCard({ streak, dark }) {
  const days = ['M','T','W','T','F','S','S']
  return (
    <Card style={{ padding:'16px 18px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <span style={{ fontSize:20 }}>🔥</span>
        <div>
          <div style={{ fontSize:15, fontWeight:900, color:ORANGE }}>{streak} Day Streak</div>
          <div style={{ fontSize:11, color:'var(--text-tert)' }}>Keep it up, King!</div>
        </div>
      </div>
      <div style={{ display:'flex', gap:4 }}>
        {days.map((d,i)=>(
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ width:'100%', aspectRatio:'1', borderRadius:8, background:i<streak%7?ORANGE:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {i<streak%7&&<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2L7.5 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span style={{ fontSize:8, fontWeight:700, color:'var(--text-tert)' }}>{d}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── GOALS CARD ──────────────────────────────────────────────────────────────
function GoalsCard({ goals, dark }) {
  const defaultGoals = [
    { icon:'🎯', label:'Score 8 A\'s in WAEC',  pct:62, color:BLUE   },
    { icon:'🎯', label:'JAMB Score: 280+',       pct:48, color:ORANGE },
    { icon:'🎯', label:'Improve in Physics',     pct:35, color:PURPLE },
  ]
  const list = (goals?.length ? goals.map((g,i)=>({...defaultGoals[i],...g})) : defaultGoals).slice(0,3)

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>My Goals</span>
        <Link href="/student/profile/goals" style={{ textDecoration:'none', fontSize:12, fontWeight:700, color:BLUE }}>Edit Goals</Link>
      </div>
      <Card>
        {list.map((g,i)=>(
          <div key={i} style={{ padding:'14px 18px', borderBottom:i<list.length-1?'1px solid var(--border)':'none' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:10, background:`${g.color}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{g.icon}</div>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>{g.label}</span>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'var(--text-tert)', textTransform:'uppercase' }}>Progress</div>
                <div style={{ fontSize:14, fontWeight:900, color:g.color }}>{g.pct}%</div>
              </div>
            </div>
            <div style={{ height:6, borderRadius:999, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${g.pct}%`, borderRadius:999, background:g.color, transition:'width .6s ease' }}/>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── INFO CARDS ROW (desktop — School, Class, Exams, Subjects) ───────────────
function InfoCardsRow({ profile, dark }) {
  const cards = [
    { icon:'🏫', label:'School',   value:profile?.school||'Not set',     color:BLUE },
    { icon:'🎓', label:'Class',    value:profile?.class_level||'Not set', color:GREEN },
    { icon:'📋', label:'Exams',    value:(profile?.exam_types||['WAEC','JAMB']).join(', '), color:PURPLE },
    { icon:'📚', label:'Subjects', value:profile?.subjects?.length?`${profile.subjects.length} Subjects`:'Not set', color:ORANGE },
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
      {cards.map((c,i)=>(
        <Link key={i} href={`/student/profile/edit?field=${c.label.toLowerCase()}`} style={{ textDecoration:'none' }}>
          <Card style={{ padding:'16px', cursor:'pointer', transition:'box-shadow .15s' }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 18px ${c.color}25`}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='0 2px 16px rgba(6,42,120,.06)'}
          >
            <div style={{ width:36, height:36, borderRadius:11, background:`${c.color}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, marginBottom:10 }}>{c.icon}</div>
            <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)', marginBottom:4 }}>{c.label}</div>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.value}</div>
            <div style={{ marginTop:8, fontSize:11, fontWeight:700, color:c.color }}>Edit →</div>
          </Card>
        </Link>
      ))}
    </div>
  )
}

// ─── RECENT EXAM SCORES ───────────────────────────────────────────────────────
function ExamScores({ scores, dark }) {
  const mock = [
    { name:'WAEC Mock 3',    date:'May 18, 2025', score:68,  rank:'124 / 2,340', color:GREEN, up:true },
    { name:'JAMB CBT Practice', date:'May 12, 2025', score:241, rank:'—', color:ORANGE, up:true, isJamb:true },
    { name:'NECO Mock 2',    date:'May 5, 2025',  score:72,  rank:'210 / 2,100', color:GREEN, up:true },
  ]
  const list = scores?.length ? scores : mock
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Recent Exam Scores</span>
        <Link href="/student/progress" style={{ textDecoration:'none', fontSize:12, fontWeight:700, color:BLUE }}>View All Scores</Link>
      </div>
      <Card>
        {list.map((s,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:i<list.length-1?'1px solid var(--border)':'none', cursor:'pointer' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', marginBottom:2 }}>{s.name}</div>
              <div style={{ fontSize:10, color:'var(--text-tert)' }}>{s.date}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--text-tert)', textTransform:'uppercase', marginBottom:2 }}>Score</div>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ fontSize:16, fontWeight:900, color:s.color }}>{s.isJamb?s.score:`${s.score}%`}</span>
                <span style={{ fontSize:14 }}>{s.up?'↗️':'↘️'}</span>
              </div>
              {!s.isJamb && <div style={{ fontSize:10, color:'var(--text-tert)' }}>Rank {s.rank}</div>}
            </div>
            <ChevronRight/>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── ACTIVITY SUMMARY ─────────────────────────────────────────────────────────
function ActivitySummary({ stats, dark }) {
  const items = [
    { icon:'📋', label:'Questions Answered', value:(stats?.questions||1248).toLocaleString(), delta:18, color:BLUE },
    { icon:'🎯', label:'Accuracy',           value:`${stats?.accuracy||78}%`,               delta:6,  color:ORANGE },
    { icon:'⚡', label:'XP Earned',          value:(stats?.xp||12840).toLocaleString(),      delta:22, color:GOLD },
    { icon:'🌟', label:'Topics Mastered',    value:stats?.topics||24,                        delta:4,  color:GREEN },
  ]
  return (
    <div>
      <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', marginBottom:12 }}>Activity Summary</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {items.map((s,i)=>(
          <Card key={i} style={{ padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
              <div style={{ width:28, height:28, borderRadius:9, background:`${s.color}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{s.icon}</div>
              <span style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', lineHeight:1.2 }}>{s.label}</span>
            </div>
            <div style={{ fontSize:20, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em', marginBottom:4 }}>{s.value}</div>
            <div style={{ fontSize:10, fontWeight:800, color:GREEN }}>↑ {s.delta}{typeof s.value==='string'&&s.value.endsWith('%')?'':''} vs last 7 days</div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── SETTINGS LIST ───────────────────────────────────────────────────────────
function SettingsCard({ dark, toggle, onLogout }) {
  const settings = [
    { icon:'☀️', label:'Appearance', value:dark?'Dark Mode':'Light Mode', action:toggle },
    { icon:'🔔', label:'Notifications', value:'On', href:'/student/profile/notifications' },
    { icon:'🔒', label:'Privacy', value:'Manage your data', href:'/student/profile/privacy' },
    { icon:'👤', label:'Account', value:'Change password', href:'/student/profile/account' },
    { icon:'🌍', label:'Language', value:'English', href:'/student/profile/language' },
    { icon:'💾', label:'Data & Storage', value:'Manage offline data', href:'/student/profile/storage' },
  ]
  return (
    <div>
      <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', marginBottom:12 }}>Settings</div>
      <Card>
        {settings.map((s,i)=>(
          s.href ? (
            <Link key={i} href={s.href} style={{ textDecoration:'none' }}>
              <Row style={{ borderBottom:i<settings.length-1?'1px solid var(--border)':'none', cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:dark?'rgba(255,255,255,.05)':'rgba(6,42,120,.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{s.icon}</div>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>{s.label}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:'var(--text-tert)' }}>{s.value}</span>
                  <ChevronRight/>
                </div>
              </Row>
            </Link>
          ) : (
            <div key={i} onClick={s.action} style={{ cursor:'pointer' }}>
              <Row style={{ borderBottom:i<settings.length-1?'1px solid var(--border)':'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:dark?'rgba(255,255,255,.05)':'rgba(6,42,120,.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{s.icon}</div>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>{s.label}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:'var(--text-tert)' }}>{s.value}</span>
                  <ChevronRight/>
                </div>
              </Row>
            </div>
          )
        ))}
      </Card>
    </div>
  )
}

// ─── HELP + SUPPORT ──────────────────────────────────────────────────────────
function HelpCard({ dark }) {
  const links = [
    { icon:'❓', label:'Help Center', href:'/help' },
    { icon:'💬', label:'Contact Support', href:'/support' },
    { icon:'📩', label:'Send Feedback', href:'/feedback' },
  ]
  return (
    <Card>
      <div style={{ padding:'14px 18px 8px', fontSize:12, fontWeight:800, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.1em' }}>Need help?</div>
      {links.map((l,i)=>(
        <Link key={i} href={l.href} style={{ textDecoration:'none' }}>
          <Row style={{ borderBottom:i<links.length-1?'1px solid var(--border)':'none', cursor:'pointer', padding:'11px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:15 }}>{l.icon}</span>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text-prim)' }}>{l.label}</span>
            </div>
            <ChevronRight/>
          </Row>
        </Link>
      ))}
    </Card>
  )
}

// ─── PREMIUM CARD ─────────────────────────────────────────────────────────────
function PremiumCard({ dark }) {
  return (
    <div style={{ borderRadius:20, overflow:'hidden', position:'relative', background:`linear-gradient(135deg,${NAVY} 0%,#1040a0 60%,${BLUE} 100%)`, padding:'20px 22px' }}>
      <div style={{ position:'absolute', top:-20, right:-20, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:14, right:'18%', fontSize:13, color:GOLD, opacity:.5 }}>✦</div>
      <div style={{ position:'absolute', top:28, right:'12%', fontSize:8, color:CYAN, opacity:.6 }}>✦</div>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:14 }}>
        <div style={{ width:38, height:38, borderRadius:12, background:`${GOLD}25`, border:`1px solid ${GOLD}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>👑</div>
        <div>
          <div style={{ fontSize:15, fontWeight:900, color:'#fff', marginBottom:3 }}>Upgrade to Premium</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', lineHeight:1.5 }}>Unlock unlimited practice, AI explanations, offline mode and more.</div>
        </div>
      </div>
      <Link href="/student/premium" style={{ textDecoration:'none' }}>
        <button style={{ width:'100%', padding:'12px', borderRadius:13, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:900, fontSize:14, background:GOLD, color:NAVY, boxShadow:`0 4px 16px ${GOLD}50`, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          ⚡ Activate Premium
        </button>
      </Link>
    </div>
  )
}

// ─── LOGOUT BUTTON ────────────────────────────────────────────────────────────
function LogoutButton({ onLogout }) {
  return (
    <button onClick={onLogout} style={{ width:'100%', padding:'14px', borderRadius:14, border:`1.5px solid ${RED}30`, cursor:'pointer', fontFamily:'inherit', fontWeight:800, fontSize:14, background:'transparent', color:RED, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .15s' }}>
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M7 16H3a1 1 0 01-1-1V3a1 1 0 011-1h4M12 13l4-4-4-4M16 9H7" stroke={RED} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
      Log Out
    </button>
  )
}

// ─── QUICK SETTINGS (mobile compact) ─────────────────────────────────────────
function QuickSettings({ dark, toggle }) {
  return (
    <Card>
      <div style={{ padding:'14px 18px 4px', fontSize:14, fontWeight:900, color:'var(--text-prim)' }}>Quick Settings</div>
      {[
        { icon:'☀️', label:'Appearance', value:dark?'Dark Mode':'Light Mode', action:toggle },
        { icon:'🔔', label:'Notifications', value:'On', href:'/student/profile/notifications' },
      ].map((s,i)=>(
        s.href ? (
          <Link key={i} href={s.href} style={{ textDecoration:'none' }}>
            <Row style={{ borderBottom:i===0?'1px solid var(--border)':'none', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                <span style={{ fontSize:16 }}>{s.icon}</span>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>{s.label}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, color:'var(--text-tert)' }}>{s.value}</span>
                <ChevronRight/>
              </div>
            </Row>
          </Link>
        ) : (
          <div key={i} onClick={s.action} style={{ cursor:'pointer' }}>
            <Row style={{ borderBottom:i===0?'1px solid var(--border)':'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                <span style={{ fontSize:16 }}>{s.icon}</span>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>{s.label}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, color:'var(--text-tert)' }}>{s.value}</span>
                <ChevronRight/>
              </div>
            </Row>
          </div>
        )
      ))}
    </Card>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()
  const { dark, toggle } = useTheme()

  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [xp,       setXp]       = useState(3720)
  const [streak,   setStreak]   = useState(12)
  const [isGuest,  setIsGuest]  = useState(false)
  const [stats,    setStats]    = useState(null)

  useEffect(()=>{
    async function load() {
      try {
        const supabase = createClient()
        const { data:{session} } = await supabase.auth.getSession()
        if (session?.user) {
          const { data:prof } = await supabase.from('profiles').select('*').eq('id',session.user.id).single()
          if (prof) { setProfile(prof); setXp(prof.total_points||prof.xp||3720) }
        } else {
          // Guest mode
          setIsGuest(true)
          try {
            const g = JSON.parse(localStorage.getItem('ep_guest')||'{}')
            setProfile({ username:g.username, first_name:g.first_name, exam_types:g.exams, subjects:g.subjects })
          } catch {}
        }
      } catch(e){ console.error(e) }
      finally { setLoading(false) }
    }
    load()
  },[])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/onboarding')
  }

  const name = profile?.username || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Student'
  const cap  = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : ''

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)' }}>
      <div style={{ width:32,height:32,borderRadius:'50%',border:`3px solid var(--border)`,borderTopColor:BLUE,animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>
      <AppBackground dark={dark}/>

      {/* ══ DESKTOP ══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex" style={{ minHeight:'100dvh', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:1380, width:'100%', margin:'0 auto', padding:'20px 24px 60px', display:'flex', gap:20, alignItems:'flex-start' }}>
          <StudentSidebar active="profile" xp={xp} dark={dark}/>

          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
            <DesktopTopbar name={cap(name)} xp={xp} dark={dark} toggle={toggle}/>

            {/* Top row: avatar card + rank strip */}
            <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:20, marginBottom:20 }}>
              <AvatarCard profile={profile} xp={xp} isGuest={isGuest} dark={dark}/>
              {/* Right of avatar: info tiles + streak + keep going mascot */}
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <InfoCardsRow profile={profile} dark={dark}/>
                <StreakCard streak={streak} dark={dark}/>
                {/* Motivational panel */}
                <div style={{ borderRadius:20, overflow:'hidden', position:'relative', background:`linear-gradient(135deg,${dark?NAVY:'#f0f6ff'},${dark?'#0a1f5e':'#e8f0ff'})`, border:`1px solid ${BLUE}18`, padding:'18px 18px 0 150px', minHeight:100, display:'flex', alignItems:'center' }}>
                  <div style={{ position:'absolute', bottom:0, left:0, width:140, height:100 }}>
                    <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'bottom left', filter:'drop-shadow(0 2px 8px rgba(0,0,0,.2))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:900, color:dark?'#fff':'var(--text-prim)', marginBottom:4 }}>Keep going!</div>
                    <div style={{ fontSize:12, color:dark?'rgba(255,255,255,.55)':'var(--text-tert)', lineHeight:1.5 }}>Every step you take today brings you closer to your goals.</div>
                  </div>
                </div>
                <PremiumCard dark={dark}/>
              </div>
            </div>

            {/* 3-col middle row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 280px', gap:20, marginBottom:20 }}>
              <GoalsCard goals={null} dark={dark}/>
              <ExamScores scores={null} dark={dark}/>
              <SettingsCard dark={dark} toggle={toggle} onLogout={handleLogout}/>
            </div>

            {/* Activity summary — full width */}
            <div style={{ marginBottom:20 }}>
              <ActivitySummary stats={stats} dark={dark}/>
            </div>

            {/* Logout */}
            <LogoutButton onLogout={handleLogout}/>
          </div>
        </div>
      </div>

      {/* ══ MOBILE ══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden" style={{ minHeight:'100dvh', paddingBottom:80, position:'relative', zIndex:1 }}>
        <MobileTopbar dark={dark} toggle={toggle}/>
        <div style={{ padding:'16px 16px 0', display:'flex', flexDirection:'column', gap:18 }}>
          <AvatarCard profile={profile} xp={xp} isGuest={isGuest} dark={dark}/>
          <StreakCard streak={streak} dark={dark}/>
          <InfoRows profile={profile} dark={dark}/>
          <GoalsCard goals={null} dark={dark}/>
          <ExamScores scores={null} dark={dark}/>
          <QuickSettings dark={dark} toggle={toggle}/>
          <PremiumCard dark={dark}/>
          <HelpCard dark={dark}/>
          <LogoutButton onLogout={handleLogout}/>
        </div>
        <StudentBottomNav active="profile" dark={dark}/>
      </div>
    </>
  )
}
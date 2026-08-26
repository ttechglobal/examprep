'use client'
// src/app/student/progress/page.js — v1
// Progress page matching design spec.
// Stats: Questions Answered, Accuracy, XP Earned, Streak (4 cards only)
// Sections: Practice Activity bar chart, Subject Mastery (with WAEC/JAMB switcher),
//           Accuracy & Completion by Subject, Study Buddy Recommends, Topic to Improve
// Desktop: sidebar + 2-col layout. Mobile: topbar + single col + bottom nav.

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

// ─── SUBJECT META ─────────────────────────────────────────────────────────────
const SUBJ_COLOR = {
  'Mathematics':'#FF6A00','English Language':'#22c55e','Use of English':'#22c55e',
  'Physics':'#7C3AED','Chemistry':'#FFB800','Biology':'#18B7F2',
  'Further Mathematics':'#1264E5','Economics':'#f43f5e','Government':'#9b7ae0',
  'Geography':'#34d399','Literature in English':'#f9a8d4','default':'#1264E5',
}
const SUBJ_ICON = {
  'Mathematics':'🧮','English Language':'📖','Use of English':'📖','Physics':'⚡',
  'Chemistry':'⚗️','Biology':'🧬','Further Mathematics':'📐','Economics':'📊',
  'Government':'🏛️','Geography':'🌍','Literature in English':'📚','default':'📝',
}
const getColor = n => SUBJ_COLOR[n] ?? SUBJ_COLOR.default
const getIcon  = n => SUBJ_ICON[n]  ?? SUBJ_ICON.default

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
        <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'rgba(255,106,0,.04)', filter:'blur(50px)', bottom:-40, left:-50 }}/>
      </>)}
      {['📊','📈','🎯','✏️'].map((ic,i)=>{
        const pos=[{top:'8%',right:'6%'},{top:'40%',left:'3%'},{bottom:'20%',right:'4%'},{top:'70%',left:'2%'}][i]
        return <div key={i} style={{ position:'absolute', fontSize:18, opacity:dark?0.07:0.05, userSelect:'none', ...pos }}>{ic}</div>
      })}
    </div>
  )
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
function Card({ children, style={} }) {
  return <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 2px 16px rgba(6,42,120,.06)', overflow:'hidden', ...style }}>{children}</div>
}

function SectionLabel({ children, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
      <span style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.025em' }}>{children}</span>
      {right}
    </div>
  )
}

// ─── DESKTOP TOPBAR ───────────────────────────────────────────────────────────
function DesktopTopbar({ name, xp, dark, toggle }) {
  const level    = Math.floor((xp||0)/2000)+1
  const initials = (name||'EX').slice(0,2).toUpperCase()
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:18, borderBottom:'1px solid var(--border)', marginBottom:24 }}>
      <div style={{ flex:1, maxWidth:420, position:'relative' }}>
        <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="var(--text-tert)" strokeWidth="1.8"/><path d="M15 15l3 3" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </div>
        <input placeholder="Search topics, subjects…" style={{ width:'100%', padding:'10px 14px 10px 40px', borderRadius:13, border:'1px solid var(--border)', background:'var(--bg-subtle)', color:'var(--text-prim)', fontSize:13, fontFamily:'inherit', outline:'none' }}/>
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
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px 6px 6px', borderRadius:999, background:'var(--bg-card)', border:'1px solid var(--border)', cursor:'pointer' }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:GOLD }}>{initials}</div>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text-prim)', lineHeight:1 }}>{name}</div>
            <div style={{ fontSize:9, color:'var(--text-tert)', marginTop:1 }}>Level {level} 👑</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft:2 }}><path d="M3 4.5l3 3 3-3" stroke="var(--text-tert)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
function MobileTopbar({ name, xp, dark, toggle }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px', position:'sticky', top:0, zIndex:50, background:dark?'rgba(10,13,28,.93)':'rgba(249,250,255,.93)', backdropFilter:'blur(16px)', borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:9, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:11, fontWeight:900, color:GOLD }}>EX</span>
        </div>
        <span style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em' }}>Progress</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:999, background:dark?'rgba(255,184,0,.12)':'rgba(255,184,0,.1)' }}>
          <span style={{ fontSize:13 }}>⚡</span>
          <span style={{ fontSize:12, fontWeight:900, color:GOLD }}>{(xp||0).toLocaleString()}</span>
        </div>
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

// ─── HERO BANNER ─────────────────────────────────────────────────────────────
function HeroBanner({ name, dark }) {
  return (
    <div style={{ borderRadius:22, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY} 0%,#0a1f5e 60%,#0e2875 100%)`:`linear-gradient(135deg,${NAVY} 0%,#0c2360 50%,#1040a0 100%)`, padding:'24px 28px', display:'flex', alignItems:'flex-end', minHeight:120 }}>
      <div style={{ position:'absolute', top:0, right:0, width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.1) 0%,transparent 70%)', pointerEvents:'none' }}/>
      {[[GOLD,14,'16%','top'],[CYAN,9,'30%','top'],['#fff',11,'22%','top'],[GOLD,8,'10%','bottom']].map(([c,fs,pos,side],i)=>(
        <div key={i} style={{ position:'absolute', [side]:side==='top'?'18px':'18px', right:pos, fontSize:fs, color:c, opacity:.5 }}>✦</div>
      ))}
      <div style={{ flex:1, zIndex:1 }}>
        <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', color:'rgba(255,255,255,.45)', marginBottom:6 }}>Your Progress</div>
        <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-.035em', lineHeight:1.15, marginBottom:6 }}>
          Great job, {name}! 👋
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.55)' }}>You're getting better every day. Keep up the consistency!</div>
      </div>
      {/* Mascot */}
      <div style={{ width:150, height:130, flexShrink:0, alignSelf:'flex-end', zIndex:1 }}>
        <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'bottom center', filter:'drop-shadow(0 4px 16px rgba(0,0,0,.4))', display:'block' }} onError={e=>{e.currentTarget.style.display='none'}}/>
      </div>
    </div>
  )
}

// ─── 4 STAT CARDS ────────────────────────────────────────────────────────────
const STATS_META = [
  { key:'questions', icon:'📋', label:'Questions Answered', color:BLUE,   darkBg:`${BLUE}18` },
  { key:'accuracy',  icon:'🎯', label:'Accuracy',           color:ORANGE, darkBg:`${ORANGE}18` },
  { key:'xp',        icon:'⚡', label:'XP Earned',          color:GOLD,   darkBg:`${GOLD}18` },
  { key:'streak',    icon:'🔥', label:'Streak',             color:RED,    darkBg:`${RED}18` },
]

function StatCards({ stats, dark }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
      {STATS_META.map(m => {
        const s = stats[m.key] ?? {}
        const up = s.delta >= 0
        return (
          <Card key={m.key} style={{ padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:dark?m.darkBg:`${m.color}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{m.icon}</div>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', lineHeight:1.3 }}>{m.label}</span>
            </div>
            <div style={{ fontSize:24, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em', lineHeight:1, marginBottom:6 }}>
              {m.key==='accuracy'?`${s.value??78}%`:m.key==='streak'?`${s.value??12}`:(s.value??0).toLocaleString()}
              {m.key==='streak'&&<span style={{ fontSize:13, fontWeight:700, color:'var(--text-tert)', marginLeft:4 }}>days</span>}
            </div>
            {s.delta!=null ? (
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ fontSize:10, fontWeight:800, color:up?GREEN:RED }}>
                  {up?'↑':'↓'}{Math.abs(s.delta)}{m.key==='accuracy'?'%':''} vs last week
                </span>
              </div>
            ) : m.key==='streak' ? (
              <div style={{ fontSize:10, color:'var(--text-tert)' }}>Best: {s.best??21} days</div>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}

// ─── EXAM SWITCHER ────────────────────────────────────────────────────────────
function ExamSwitcher({ exams, active, onChange, dark }) {
  return (
    <div style={{ display:'inline-flex', background:dark?'rgba(255,255,255,.04)':'rgba(6,42,120,.04)', borderRadius:13, padding:3, border:'1px solid var(--border)', gap:2 }}>
      {exams.map(e => {
        const on = e === active
        return (
          <button key={e} onClick={()=>onChange(e)} style={{ padding:'7px 18px', borderRadius:10, fontSize:13, fontWeight:on?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:on?BLUE:'transparent', color:on?'#fff':'var(--text-tert)', boxShadow:on?`0 2px 10px ${BLUE}40`:'none', transition:'all .15s' }}>{e}</button>
        )
      })}
    </div>
  )
}

// ─── PERIOD SWITCHER ─────────────────────────────────────────────────────────
function PeriodDropdown({ period, onChange, dark }) {
  const opts = ['This Week','This Month','This Year','All Time']
  return (
    <div style={{ position:'relative' }}>
      <select value={period} onChange={e=>onChange(e.target.value)} style={{ appearance:'none', padding:'7px 28px 7px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-prim)', fontSize:12, fontWeight:700, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
        {opts.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><path d="M2 4l3 3 3-3" stroke="var(--text-tert)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  )
}

// ─── PRACTICE ACTIVITY BAR CHART ─────────────────────────────────────────────
function PracticeActivity({ activity, period, onPeriodChange, dark }) {
  const days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const max   = Math.max(...activity, 1)
  const todayIdx = (new Date().getDay()+6)%7

  return (
    <Card style={{ padding:'20px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Practice Activity</span>
        <PeriodDropdown period={period} onChange={onPeriodChange} dark={dark}/>
      </div>

      {/* Y-axis + bars */}
      <div style={{ display:'flex', gap:0, alignItems:'flex-end', height:160 }}>
        {/* Y labels */}
        <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', height:'100%', paddingBottom:20, marginRight:8, alignItems:'flex-end' }}>
          {[200,150,100,50,0].map(v=>(
            <span key={v} style={{ fontSize:9, color:'var(--text-tert)', fontWeight:600 }}>{v}</span>
          ))}
        </div>
        {/* Bars */}
        <div style={{ flex:1, display:'flex', alignItems:'flex-end', gap:8, borderLeft:'1px solid var(--border)', paddingLeft:8 }}>
          {days.map((d,i)=>{
            const val   = activity[i]||0
            const barH  = max>0 ? Math.round((val/max)*120) : 2
            const isToday = i===todayIdx
            return (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                {val>0 && <span style={{ fontSize:9, fontWeight:800, color:'var(--text-tert)' }}>{val}</span>}
                {val===0 && <span style={{ fontSize:9, color:'transparent' }}>0</span>}
                <div style={{ width:'100%', height:barH||3, borderRadius:'5px 5px 0 0', background:isToday?`linear-gradient(180deg,${CYAN},${BLUE})`:BLUE, opacity:isToday?1:0.6, transition:'height .5s ease', minHeight:3 }}/>
                <span style={{ fontSize:9, fontWeight:isToday?800:600, color:isToday?BLUE:'var(--text-tert)' }}>{d}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

// ─── SUBJECT MASTERY ─────────────────────────────────────────────────────────
function SubjectMastery({ subjects, exam, onExamChange, exams, dark }) {
  const sorted = [...subjects].sort((a,b)=>b.accuracy-a.accuracy)

  return (
    <div>
      <SectionLabel right={
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <ExamSwitcher exams={exams} active={exam} onChange={onExamChange} dark={dark}/>
          <Link href="/student/progress/mastery" style={{ fontSize:11, fontWeight:700, color:BLUE, textDecoration:'none' }}>View full report →</Link>
        </div>
      }>
        Subject Mastery <span style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)', marginLeft:4 }}>({exam})</span>
      </SectionLabel>

      <Card>
        {/* Header row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 160px 80px', gap:0, padding:'9px 18px', borderBottom:'1px solid var(--border)', background:dark?'rgba(255,255,255,.02)':'rgba(6,42,120,.02)' }}>
          {['Subject','Accuracy','Questions'].map((h,i)=>(
            <div key={i} style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)', textAlign:i>0?'right':'left' }}>{h}</div>
          ))}
        </div>
        {sorted.map((s, i) => {
          const col   = getColor(s.name)
          const acc   = s.accuracy??0
          const barW  = `${acc}%`
          return (
            <Link key={i} href={`/student/progress/subject/${encodeURIComponent(s.name)}?exam=${exam}`} style={{ textDecoration:'none' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 160px 80px', gap:0, padding:'13px 18px', alignItems:'center', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background .1s' }}
                onMouseEnter={e=>e.currentTarget.style.background=dark?'rgba(255,255,255,.03)':'rgba(6,42,120,.02)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                {/* Subject name + icon */}
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:`${col}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{getIcon(s.name)}</div>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>{s.name}</span>
                </div>
                {/* Accuracy bar */}
                <div style={{ paddingRight:16 }}>
                  <div style={{ height:6, borderRadius:999, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:barW, borderRadius:999, background:col, transition:'width .6s ease' }}/>
                  </div>
                </div>
                {/* Numbers */}
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, fontWeight:900, color:col }}>{acc}%</div>
                  <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:1 }}>{(s.questions||0).toLocaleString()}</div>
                </div>
              </div>
            </Link>
          )
        })}
      </Card>
    </div>
  )
}

// ─── ACCURACY & COMPLETION BY SUBJECT ─────────────────────────────────────────
function AccuracyCompletion({ subjects, exam, dark }) {
  return (
    <div>
      <SectionLabel>Accuracy & Completion by Subject <span style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)', marginLeft:4 }}>({exam})</span></SectionLabel>
      <Card style={{ padding:'18px 20px' }}>
        {/* Legend */}
        <div style={{ display:'flex', gap:14, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:BLUE }}/>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)' }}>Accuracy (%)</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:ORANGE }}/>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)' }}>Completion (%)</span>
          </div>
        </div>
        {subjects.map((s, i) => (
          <div key={i} style={{ marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text-prim)' }}>{s.name}</span>
              <div style={{ display:'flex', gap:12 }}>
                <span style={{ fontSize:11, fontWeight:800, color:BLUE }}>{s.accuracy}%</span>
                <span style={{ fontSize:11, fontWeight:800, color:ORANGE }}>{s.completion}%</span>
              </div>
            </div>
            {/* Accuracy bar */}
            <div style={{ height:7, borderRadius:999, background:dark?'rgba(255,255,255,.07)':'rgba(6,42,120,.06)', overflow:'hidden', marginBottom:4 }}>
              <div style={{ height:'100%', width:`${s.accuracy}%`, borderRadius:999, background:BLUE, transition:'width .6s ease' }}/>
            </div>
            {/* Completion bar */}
            <div style={{ height:7, borderRadius:999, background:dark?'rgba(255,255,255,.07)':'rgba(6,42,120,.06)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${s.completion}%`, borderRadius:999, background:ORANGE, transition:'width .6s ease' }}/>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── STUDY BUDDY RECOMMENDS ───────────────────────────────────────────────────
function StudyBuddyRecommends({ subjects, dark }) {
  const recs = [
    { icon:'⭐', color:GOLD,   bg:`${GOLD}18`,   title:'Focus on Physics', body:'Your accuracy in Physics is lower than your average.', cta:'Practice Now', ctaColor:BLUE, href:'/student/practice?mode=quick5' },
    { icon:'📈', color:GREEN,  bg:`${GREEN}18`,  title:'Keep the streak alive!', body:"You're on a 12-day streak. Amazing! Try to beat your best of 21 days.", cta:null },
    { icon:'🎯', color:RED,    bg:`${RED}18`,    title:'Try a Mock Exam', body:"You've completed 3 mock exams. Attempt more to improve your exam readiness.", cta:'Take Mock Exam', ctaColor:NAVY, href:'/student/exam' },
  ]

  return (
    <Card style={{ padding:'18px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:30, height:30, objectFit:'contain' }} onError={e=>{e.currentTarget.style.display='none'}}/>
        </div>
        <span style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Study Buddy Recommends</span>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {recs.map((r, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px', borderRadius:14, background:dark?'rgba(255,255,255,.03)':'rgba(6,42,120,.02)', border:'1px solid var(--border)' }}>
            <div style={{ width:36, height:36, borderRadius:11, background:r.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{r.icon}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', marginBottom:3 }}>{r.title}</div>
              <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.5 }}>{r.body}</div>
            </div>
            {r.cta && (
              <Link href={r.href||'#'} style={{ textDecoration:'none', flexShrink:0 }}>
                <button style={{ padding:'8px 12px', borderRadius:10, border:'none', cursor:'pointer', background:r.ctaColor, color:'#fff', fontSize:11, fontWeight:800, fontFamily:'inherit', whiteSpace:'nowrap', boxShadow:`0 3px 10px ${r.ctaColor}40` }}>{r.cta}</button>
              </Link>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── TOPIC TO IMPROVE ────────────────────────────────────────────────────────
function TopicToImprove({ topics, exam, dark }) {
  return (
    <Card style={{ padding:'18px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Topics to Improve</span>
        <button style={{ fontSize:11, fontWeight:700, color:BLUE, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0 }}>View all</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {topics.map((t, i) => {
          const col = getColor(t.subject)
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px', borderRadius:14, background:dark?'rgba(255,255,255,.03)':'rgba(6,42,120,.02)', border:'1px solid var(--border)' }}>
              <div style={{ width:36, height:36, borderRadius:11, background:`${col}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{getIcon(t.subject)}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:800, color:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</div>
                <div style={{ fontSize:10, color:'var(--text-tert)' }}>{t.subject}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:14, fontWeight:900, color:RED }}>
                  {t.accuracy}%
                </div>
                <div style={{ fontSize:9, color:'var(--text-tert)' }}>Accuracy</div>
              </div>
              <Link href={`/student/practice?mode=weak&subject=${encodeURIComponent(t.subject)}`} style={{ textDecoration:'none', flexShrink:0 }}>
                <button style={{ padding:'7px 12px', borderRadius:9, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:11, fontWeight:800, fontFamily:'inherit' }}>Practice</button>
              </Link>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── MOTIVATIONAL BANNER ─────────────────────────────────────────────────────
function MotivationalBanner({ dark }) {
  return (
    <div style={{ borderRadius:20, overflow:'hidden', position:'relative', background:dark?`${NAVY}cc`:`linear-gradient(135deg,#f0f6ff,#e8f0ff)`, border:`1px solid ${BLUE}18`, padding:'20px 20px 20px 24px', display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ position:'absolute', right:-10, bottom:-10, width:120, height:120, borderRadius:'50%', background:'rgba(18,100,229,.05)', pointerEvents:'none' }}/>
      <div style={{ fontSize:38, flexShrink:0 }}>📈</div>
      <div style={{ flex:1, zIndex:1 }}>
        <div style={{ fontSize:14, fontWeight:900, color:dark?'#fff':'var(--text-prim)', marginBottom:4 }}>Stay consistent, achieve greatness!</div>
        <div style={{ fontSize:12, color:dark?'rgba(255,255,255,.55)':'var(--text-tert)', lineHeight:1.5 }}>Small steps every day lead to big results.</div>
      </div>
    </div>
  )
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
function getMockData(exam) {
  const waec = [
    {name:'Mathematics',    accuracy:82, completion:76, questions:320},
    {name:'English Language',accuracy:76,completion:71, questions:280},
    {name:'Physics',        accuracy:61, completion:58, questions:210},
    {name:'Chemistry',      accuracy:58, completion:54, questions:190},
    {name:'Biology',        accuracy:54, completion:49, questions:160},
    {name:'Further Mathematics',accuracy:48,completion:42,questions:120},
  ]
  const jamb = [
    {name:'Use of English', accuracy:79, completion:74, questions:340},
    {name:'Mathematics',    accuracy:71, completion:68, questions:290},
    {name:'Physics',        accuracy:64, completion:60, questions:220},
    {name:'Chemistry',      accuracy:55, completion:51, questions:180},
  ]
  return exam==='JAMB'?jamb:waec
}

function getMockTopics() {
  return [
    {name:'Quadratic Equations', subject:'Mathematics',      accuracy:42},
    {name:'Organic Chemistry',   subject:'Chemistry',        accuracy:38},
    {name:'Waves & Optics',      subject:'Physics',          accuracy:35},
    {name:'Cell Division',       subject:'Biology',          accuracy:44},
  ]
}

function getMockActivity() {
  return [120,98,160,140,180,110,70]
}

function getMockStats(exam) {
  return {
    questions:{ value:1248, delta:18 },
    accuracy: { value:78,   delta:6  },
    xp:       { value:12840,delta:22 },
    streak:   { value:12,   best:21, delta:null },
  }
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const router = useRouter()
  const { dark, toggle } = useTheme()

  const [profile,   setProfile]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [exam,      setExam]      = useState('WAEC')
  const [exams,     setExams]     = useState(['WAEC','JAMB'])
  const [period,    setPeriod]    = useState('This Week')
  const [xp,        setXp]        = useState(0)
  const [stats,     setStats]     = useState({})
  const [activity,  setActivity]  = useState([0,0,0,0,0,0,0])
  const [subjects,  setSubjects]  = useState([])
  const [topics,    setTopics]    = useState([])

  async function load() {
    try {
      const supabase = createClient()
      const { data:{session} } = await supabase.auth.getSession()
      if (session?.user) {
        const { data:prof } = await supabase.from('profiles').select('username,full_name,total_points,exam_types').eq('id',session.user.id).single()
        if (prof) {
          setProfile(prof)
          setXp(prof.total_points||0)
          if (prof.exam_types?.length) setExams(prof.exam_types)
          setExam(prof.exam_types?.[0]||'WAEC')
        }
        // Try real activity
        const mon = new Date(); mon.setDate(mon.getDate()-((mon.getDay()+6)%7)); mon.setHours(0,0,0,0)
        const { data:att } = await supabase.from('question_attempts').select('created_at').eq('student_id',session.user.id).gte('created_at',mon.toISOString())
        if (att?.length) {
          const c=[0,0,0,0,0,0,0]; att.forEach(a=>{const d=new Date(a.created_at);c[(d.getDay()+6)%7]++}); setActivity(c)
        } else setActivity(getMockActivity())
      }
    } catch(e){ console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[]) // eslint-disable-line
  useEffect(()=>{ setSubjects(getMockData(exam)); setStats(getMockStats(exam)); setTopics(getMockTopics()); if(!activity.some(v=>v>0)) setActivity(getMockActivity()) },[exam]) // eslint-disable-line

  const name = profile?.username||profile?.full_name?.split(' ')[0]||'Evelyn'
  const cap  = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : ''

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)' }}>
      <div style={{ width:32,height:32,borderRadius:'50%',border:`3px solid var(--border)`,borderTopColor:BLUE,animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // Shared content blocks
  const heroEl      = <HeroBanner name={cap(name)} dark={dark}/>
  const statsEl     = <StatCards stats={stats} dark={dark}/>
  const activityEl  = <PracticeActivity activity={activity} period={period} onPeriodChange={setPeriod} dark={dark}/>
  const masteryEl   = <SubjectMastery subjects={subjects} exam={exam} onExamChange={setExam} exams={exams} dark={dark}/>
  const accuracyEl  = <AccuracyCompletion subjects={subjects} exam={exam} dark={dark}/>
  const motEl       = <MotivationalBanner dark={dark}/>
  const buddyEl     = <StudyBuddyRecommends subjects={subjects} dark={dark}/>
  const topicsEl    = <TopicToImprove topics={topics} exam={exam} dark={dark}/>

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box} ::-webkit-scrollbar{display:none}`}</style>
      <AppBackground dark={dark}/>

      {/* ══ DESKTOP ══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex" style={{ minHeight:'100dvh', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:1380, width:'100%', margin:'0 auto', padding:'20px 24px 60px', display:'flex', gap:20, alignItems:'flex-start' }}>
          <StudentSidebar active="progress" xp={xp} dark={dark}/>

          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
            <DesktopTopbar name={cap(name)} xp={xp} dark={dark} toggle={toggle}/>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 310px', gap:20, alignItems:'flex-start' }}>
              {/* Centre feed */}
              <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
                {heroEl}
                {/* Exam switcher row — only visible on desktop above stats */}
                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <ExamSwitcher exams={exams} active={exam} onChange={setExam} dark={dark}/>
                  <span style={{ fontSize:12, color:'var(--text-tert)' }}>Showing data for <strong style={{ color:'var(--text-prim)' }}>{exam}</strong></span>
                </div>
                {/* 4 stat cards — 2 col on desktop becomes 4-col */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                  {STATS_META.map(m=>{
                    const s=stats[m.key]??{}
                    const up=s.delta>=0
                    return(
                      <Card key={m.key} style={{ padding:'16px 18px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                          <div style={{ width:30, height:30, borderRadius:9, background:dark?m.darkBg:`${m.color}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{m.icon}</div>
                          <span style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', lineHeight:1.2 }}>{m.label}</span>
                        </div>
                        <div style={{ fontSize:22, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em', lineHeight:1, marginBottom:5 }}>
                          {m.key==='accuracy'?`${s.value??78}%`:m.key==='streak'?`${s.value??12}`:(s.value??0).toLocaleString()}
                          {m.key==='streak'&&<span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', marginLeft:3 }}>days</span>}
                        </div>
                        {s.delta!=null?(
                          <div style={{ fontSize:10, fontWeight:800, color:up?GREEN:RED }}>
                            {up?'↑':'↓'}{Math.abs(s.delta)}{m.key==='accuracy'?'%':''} vs last week
                          </div>
                        ):m.key==='streak'?(
                          <div style={{ fontSize:10, color:'var(--text-tert)' }}>Best: {s.best??21} days</div>
                        ):null}
                      </Card>
                    )
                  })}
                </div>
                {activityEl}
                {masteryEl}
                {accuracyEl}
                {motEl}
              </div>

              {/* Right col — sticky */}
              <div style={{ position:'sticky', top:20, display:'flex', flexDirection:'column', gap:16 }}>
                {buddyEl}
                {topicsEl}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MOBILE ══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden" style={{ minHeight:'100dvh', paddingBottom:80, position:'relative', zIndex:1 }}>
        <MobileTopbar name={cap(name)} xp={xp} dark={dark} toggle={toggle}/>

        <div style={{ padding:'16px 16px 0', display:'flex', flexDirection:'column', gap:18 }}>
          {heroEl}

          {/* Exam switcher (mobile — inline, pill style) */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <ExamSwitcher exams={exams} active={exam} onChange={setExam} dark={dark}/>
            <span style={{ fontSize:11, color:'var(--text-tert)' }}>{exam} data</span>
          </div>

          {/* 4 stat cards — 2×2 on mobile */}
          {statsEl}

          {activityEl}
          {masteryEl}
          {motEl}
        </div>

        <StudentBottomNav active="progress" dark={dark}/>
      </div>
    </>
  )
}
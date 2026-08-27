'use client'
// src/app/student/practice/page.js — v13 + subject picker + goals sheet

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/contexts/ThemeContext'
import { StudentSidebar, StudentBottomNav } from '@/components/student/StudentNav'
import Link from 'next/link'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const PURPLE = '#7C3AED'
const RED    = '#f43f5e'

const ACCENT = {
  'Chemistry':'#9b7ae0','Physics':'#18B7F2','Biology':'#4ade80',
  'Mathematics':'#FFB800','Further Mathematics':'#FFB800',
  'English Language':'#a78bfa','Use of English':'#a78bfa',
  'Economics':'#fcd34d','Government':'#f87171','Geography':'#34d399',
  'Literature in English':'#f9a8d4','Agricultural Science':'#86efac',
  'Commerce':'#818cf8','Accounting':'#fde68a','default':'#9b7ae0',
}
const SUBJ_ICON = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📝',
}
const getAccent = n => ACCENT[n] ?? ACCENT.default
const getIcon   = n => SUBJ_ICON[n] ?? SUBJ_ICON.default
const isRealId  = id => id && id !== '00000000-0000-0000-0000-000000000001' && /^[0-9a-f-]{36}$/.test(id)

const LAST_SUBJECT_KEY = 'exl_last_practice_subject'
function saveLastSubject(s) { try { if (s?.id) sessionStorage.setItem(LAST_SUBJECT_KEY, JSON.stringify({id:s.id,name:s.name})) } catch {} }
function loadLastSubject() { try { const r = sessionStorage.getItem(LAST_SUBJECT_KEY); return r ? JSON.parse(r) : null } catch { return null } }
function pickDefault(subjects, exam) {
  if (!subjects.length) return null
  const saved = loadLastSubject()
  if (saved) { const m = subjects.find(s => s.id === saved.id); if (m) return m }
  if (exam === 'JAMB') { const u = subjects.find(s => /english/i.test(s.name)); if (u) return u }
  if (exam === 'WAEC') { const e = subjects.find(s => s.name === 'English Language'); if (e) return e }
  return subjects[0]
}

function AppBackground({ dark }) {
  return (
    <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage: dark ? 'radial-gradient(circle,rgba(255,255,255,.03) 1px,transparent 1px)' : 'radial-gradient(circle,rgba(6,42,120,.06) 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>
      {dark ? (<>
        <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', background:'rgba(18,100,229,.08)', filter:'blur(70px)', top:-100, right:-80 }}/>
        <div style={{ position:'absolute', width:280, height:280, borderRadius:'50%', background:'rgba(6,42,120,.15)', filter:'blur(60px)', bottom:-80, left:-80 }}/>
      </>) : (<>
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(18,100,229,.05)', filter:'blur(60px)', top:-60, right:-40 }}/>
        <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'rgba(255,106,0,.04)', filter:'blur(50px)', bottom:-40, left:-50 }}/>
      </>)}
      {['📐','⚗️','📚','🧬','⏱️','✏️'].map((ic,i)=>{
        const pos=[{top:'8%',right:'6%'},{top:'22%',left:'3%'},{top:'48%',right:'4%'},{bottom:'28%',left:'5%'},{bottom:'12%',right:'9%'},{top:'68%',left:'2%'}][i]
        return <div key={i} style={{ position:'absolute', fontSize:20, opacity:dark?0.08:0.06, userSelect:'none', ...pos }}>{ic}</div>
      })}
    </div>
  )
}

function Card({ children, style={} }) {
  return <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 2px 16px rgba(6,42,120,.06)', overflow:'hidden', ...style }}>{children}</div>
}

function SecLabel({ children, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
      <span style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.025em' }}>{children}</span>
      {right}
    </div>
  )
}

function DesktopTopbar({ name, xp, dark, toggle }) {
  const level = Math.floor((xp||0) / 2000) + 1
  const initials = (name||'EX').slice(0,2).toUpperCase()
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:18, borderBottom:'1px solid var(--border)', marginBottom:22 }}>
      <div style={{ flex:1, maxWidth:420, position:'relative' }}>
        <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="var(--text-tert)" strokeWidth="1.8"/><path d="M15 15l3 3" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </div>
        <input placeholder="Search topics, questions, exams…" style={{ width:'100%', padding:'10px 14px 10px 40px', borderRadius:13, border:'1px solid var(--border)', background:'var(--bg-subtle)', color:'var(--text-prim)', fontSize:13, fontFamily:'inherit', outline:'none' }}/>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginLeft:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:999, background:dark?'rgba(255,184,0,.12)':'rgba(255,184,0,.1)', border:`1px solid ${GOLD}30` }}>
          <span style={{ fontSize:16 }}>⚡</span>
          <span style={{ fontSize:13, fontWeight:900, color:GOLD }}>{(xp||0).toLocaleString()} XP</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', borderRadius:999, background:dark?'rgba(244,63,94,.12)':'rgba(244,63,94,.08)', border:'1px solid rgba(244,63,94,.25)' }}>
          <span style={{ fontSize:16 }}>💗</span>
          <span style={{ fontSize:13, fontWeight:900, color:'#f43f5e' }}>32</span>
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

function MobileTopbar({ dark, toggle, onSubjects, onGoals }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px', position:'sticky', top:0, zIndex:50, background:dark?'rgba(10,13,28,.92)':'rgba(249,250,255,.92)', backdropFilter:'blur(16px)', borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:30, height:30, borderRadius:9, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:11, fontWeight:900, color:GOLD }}>EX</span>
        </div>
        <span style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em' }}>Practice</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
        <button onClick={onSubjects} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 11px', borderRadius:999, border:'1px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:700, color:'var(--text-tert)' }}>
          📚 Subjects
        </button>
        <button onClick={onGoals} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 11px', borderRadius:999, border:`1px solid ${GOLD}35`, background:`${GOLD}10`, cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:700, color:GOLD }}>
          🎯 Goals
        </button>
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

function HeroBanner({ name, dark }) {
  return (
    <div style={{ borderRadius:22, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY} 0%,#0a1f5e 60%,#0e2875 100%)`:`linear-gradient(135deg,${NAVY} 0%,#0c2360 50%,#1040a0 100%)`, padding:'22px 24px', display:'flex', alignItems:'center', minHeight:110 }}>
      <div style={{ position:'absolute', top:0, right:0, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.12) 0%,transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:14, right:'38%', fontSize:14, color:GOLD, opacity:.5 }}>✦</div>
      <div style={{ position:'absolute', top:28, right:'34%', fontSize:8, color:CYAN, opacity:.6 }}>✦</div>
      <div style={{ position:'absolute', bottom:18, right:'40%', fontSize:10, color:GOLD, opacity:.4 }}>✦</div>
      <div style={{ flex:1, zIndex:1 }}>
        <div style={{ fontSize:21, fontWeight:900, color:'#fff', letterSpacing:'-.03em', lineHeight:1.2, marginBottom:6 }}>Practice makes progress!</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.55)' }}>Stay consistent and you'll crush your goals.</div>
      </div>
      <div style={{ width:100, height:100, flexShrink:0, zIndex:1 }}>
        <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:'100%', height:'100%', objectFit:'contain', filter:'drop-shadow(0 4px 12px rgba(0,0,0,.35))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
      </div>
    </div>
  )
}

const QUEST_DATA = [
  { id:'algebra',   label:'Solve 8 Algebra questions',  xp:20, mode:'quick5' },
  { id:'bio-speed', label:'Biology speed round',          xp:15, mode:'timed',  sub:'10 questions · 60 sec' },
  { id:'chem60',    label:'Score 60%+ in Chemistry',      xp:25, mode:'weak',   sub:'Organic chemistry set' },
  { id:'lesson',    label:"Revise today's lesson",        xp:10, mode:'mixed',  sub:'Quick recap' },
]

function DailyQuests({ onStart, dark }) {
  const [done, setDone] = useState({ algebra:true, 'bio-speed':false, chem60:true, lesson:false })
  const count = Object.values(done).filter(Boolean).length
  return (
    <Card>
      <div style={{ padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Daily Quest</span>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:16 }}>🔥</span>
            <span style={{ fontSize:12, fontWeight:800, color:ORANGE }}>{count} / {QUEST_DATA.length} completed</span>
          </div>
        </div>
        {QUEST_DATA.map((q, i) => {
          const isDone = done[q.id]
          return (
            <div key={q.id} onClick={() => !isDone && onStart(q.mode)} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'11px 0', borderBottom:i<QUEST_DATA.length-1?'1px solid var(--border)':'none', cursor:isDone?'default':'pointer' }}>
              <div style={{ width:22, height:22, borderRadius:7, border:`2px solid ${isDone?GREEN:dark?'rgba(255,255,255,.2)':'rgba(6,42,120,.18)'}`, background:isDone?GREEN:'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1, transition:'all .15s' }}>
                {isDone && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:isDone?600:700, color:isDone?'var(--text-tert)':'var(--text-prim)', textDecoration:isDone?'line-through':'none', lineHeight:1.3 }}>{q.label}</div>
                {q.sub && <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>{q.sub}</div>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                <span style={{ fontSize:11, fontWeight:800, color:isDone?'var(--text-tert)':ORANGE }}>+{q.xp} XP</span>
                <div style={{ width:20, height:20, borderRadius:6, background:isDone?'rgba(34,197,94,.1)':'rgba(255,106,0,.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:8, fontWeight:900, color:isDone?GREEN:ORANGE }}>XP</span>
                </div>
              </div>
            </div>
          )
        })}
        <div style={{ marginTop:14, padding:'12px 14px', borderRadius:13, background:dark?'rgba(255,255,255,.04)':'rgba(6,42,120,.04)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', marginBottom:2 }}>Daily XP Goal</div>
            <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)' }}>480 / 600 XP</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end', marginBottom:2 }}>
              <span style={{ fontSize:14 }}>🔥</span>
              <span style={{ fontSize:13, fontWeight:900, color:ORANGE }}>12 days</span>
            </div>
            <div style={{ fontSize:10, color:'var(--text-tert)' }}>current streak</div>
          </div>
        </div>
        <div style={{ marginTop:10, height:7, borderRadius:999, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.08)', overflow:'hidden' }}>
          <div style={{ height:'100%', width:'80%', borderRadius:999, background:`linear-gradient(90deg,${BLUE},${CYAN})` }}/>
        </div>
        <div style={{ display:'flex', gap:4, marginTop:10, justifyContent:'space-between' }}>
          {['M','T','W','T','F','S','S'].map((d,i)=>(
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
              <span style={{ fontSize:9, fontWeight:600, color:'var(--text-tert)' }}>{d}</span>
              <div style={{ width:18, height:18, borderRadius:'50%', background:i<6?BLUE:dark?'rgba(255,255,255,.1)':'rgba(6,42,120,.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {i<6 && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l1.8 2L6.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:'0 20px 16px' }}>
        <button onClick={()=>{}} style={{ fontSize:12, fontWeight:700, color:BLUE, background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>View all quests <span>›</span></button>
      </div>
    </Card>
  )
}

const MODES = [
  { key:'quick5', iconBg:`linear-gradient(135deg,${BLUE},#0a4fc8)`,   icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, label:'Topic Practice',  desc:'Practice by topic',       body:'Focus on specific topics and sharpen your skills.', xp:'+50 XP', color:BLUE,   shadow:'#0a3fa0' },
  { key:'timed',  iconBg:`linear-gradient(135deg,${ORANGE},#d94e00)`, icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" stroke="#fff" strokeWidth="2"/><path d="M12 9v4l3 2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M9 2h6M12 2v3" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>, label:'Speed Rounds',    desc:'Timed per question',      body:'Answer questions with a set time per question.',   xp:'+60 XP', color:ORANGE, shadow:'#b84200' },
  { key:'mixed',  iconBg:`linear-gradient(135deg,${PURPLE},#5b21b6)`, icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M16 3l5 5-5 5M3 8h18M8 21l-5-5 5-5M21 16H3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, label:'Mixed Practice',  desc:'Mix topics & subjects',   body:'Get questions from multiple topics and subjects.',  xp:'+35 XP', color:PURPLE, shadow:'#4c1d95' },
  { key:'mock',   iconBg:`linear-gradient(135deg,${BLUE},${NAVY})`,   icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="#fff" strokeWidth="2"/><path d="M8 8h8M8 12h8M8 16h5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>, label:'Mock Exam',      desc:'Full exam simulation',    body:'Simulate real exams under actual exam conditions.', xp:'+200 XP',color:NAVY,   shadow:'#031440' },
]

function PracticeModeCards({ onStart, onMock, dark }) {
  const [hov, setHov] = useState(null)
  return (
    <div>
      <SecLabel>Practice Modes</SecLabel>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {MODES.map(m => (
          <div key={m.key} onClick={()=> m.key==='mock' ? onMock() : onStart(m.key)} onMouseEnter={()=>setHov(m.key)} onMouseLeave={()=>setHov(null)}
            style={{ borderRadius:20, border:`1px solid ${hov===m.key?m.color+'55':'var(--border)'}`, background:'var(--bg-card)', cursor:'pointer', padding:'20px 18px', display:'flex', flexDirection:'column', gap:14, transition:'all .18s', boxShadow:hov===m.key?`0 8px 28px ${m.color}22`:'0 2px 12px rgba(6,42,120,.05)', transform:hov===m.key?'translateY(-2px)':'none' }}>
            <div style={{ width:48, height:48, borderRadius:16, background:m.iconBg, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${m.color}45`, flexShrink:0 }}>{m.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', marginBottom:3 }}>{m.label}</div>
              <div style={{ fontSize:11, fontWeight:700, color:m.color, marginBottom:6 }}>{m.desc}</div>
              <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5 }}>{m.body}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <button style={{ fontSize:13, fontWeight:800, color:m.color, background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' }}>Start ›</button>
              <span style={{ fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:999, background:`${m.color}14`, color:m.color, border:`1px solid ${m.color}25` }}>{m.xp}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecentSessions({ history, dark }) {
  if (!history.length) return (
    <Card style={{ padding:'28px 20px', textAlign:'center' }}>
      <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
      <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No sessions yet</div>
      <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.6 }}>Start a practice session and your history will appear here.</div>
    </Card>
  )
  return (
    <div>
      <SecLabel right={<button style={{ fontSize:12, fontWeight:700, color:BLUE, background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' }}>View all</button>}>Recent Sessions</SecLabel>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
        {history.slice(0,4).map((h,i) => {
          const col = h.pct>=70?GREEN:h.pct>=40?GOLD:'#f87171'
          return (
            <Card key={i} style={{ padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', lineHeight:1.3, marginBottom:3 }}>{h.subject}</div>
                  <div style={{ fontSize:10, color:'var(--text-tert)' }}>WAEC · {h.mode}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0, marginLeft:8 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:col }}>{h.pct}%</div>
                  <div style={{ fontSize:9, color:'var(--text-tert)' }}>{h.correct}/{h.count}</div>
                </div>
              </div>
              <div style={{ fontSize:10, color:'var(--text-tert)', marginBottom:8 }}>{h.date}</div>
              <div style={{ height:5, borderRadius:999, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${h.pct}%`, borderRadius:999, background:col }}/>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function ConsistencyBanner() {
  return (
    <div style={{ borderRadius:20, background:'rgba(255,184,0,.06)', border:`1px solid ${GOLD}30`, padding:'20px 24px', display:'flex', alignItems:'center', gap:16, overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', right:-20, top:-20, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,184,0,.1) 0%,transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ fontSize:40, flexShrink:0 }}>🏆</div>
      <div style={{ flex:1, zIndex:1 }}>
        <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', marginBottom:3 }}>Consistency is your superpower! 💪</div>
        <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.4 }}>Keep practising daily and watch yourself level up.</div>
      </div>
      <div style={{ flexShrink:0, fontSize:36, zIndex:1 }}>⭐</div>
    </div>
  )
}

function buildHistory(attempts) {
  if (!attempts?.length) return []
  const sessions=[]; let sess=null
  for (const a of attempts) {
    const ts=new Date(a.created_at).getTime()
    const subName=a.subjects?.name??'Unknown'
    const newSess=!sess||subName!==sess.subject||(sess.lastTs-ts)>30*60*1000
    if(newSess){if(sess)sessions.push(sess);sess={subject:subName,lastTs:ts,date:new Date(a.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}),count:0,correct:0,mode:'Mixed'}}
    sess.lastTs=ts;sess.count++;if(a.is_correct)sess.correct++
  }
  if(sess)sessions.push(sess)
  return sessions.slice(0,8).map(s=>({...s,pct:s.count?Math.round((s.correct/s.count)*100):0}))
}

// ─── SUBJECT PICKER SHEET ─────────────────────────────────────────────────────
// Opens as a separate bottom sheet so the student can add/change subjects
// without leaving the practice page or going to profile.
function SubjectPickerSheet({ exam, onExamChange, currentSubjectNames, onClose, onSaved, dark }) {
  const [allAvail,  setAllAvail]  = useState([])
  const [selected,  setSelected]  = useState(new Set(currentSubjectNames))
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  // Reload available subjects when exam tab changes
  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/subjects?exam=${exam}&active=true&limit=60`)
      .then(r => r.json())
      .then(d => setAllAvail(d.subjects ?? d ?? []))
      .catch(() => setAllAvail([]))
      .finally(() => setLoading(false))
  }, [exam])

  function toggle(name) {
    setSelected(prev => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s })
  }

  async function save() {
    if (!selected.size) { setError('Select at least one subject.'); return }
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/student/subjects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam, subjects: [...selected] }),
      })
      if (!r.ok) throw new Error()
      onSaved(exam, [...selected])
    } catch { setError('Could not save. Please try again.') }
    finally { setSaving(false) }
  }

  const selCount = selected.size

  return (
    <>
      <style>{`
        .spb{position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:flex-end;flex-direction:column}
        .sps{width:100%;max-width:540px;background:var(--bg-card);border-radius:26px 26px 0 0;border-top:1px solid var(--border);max-height:92vh;display:flex;flex-direction:column;animation:su .28s cubic-bezier(.22,.61,.36,1)}
        @keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @media(min-width:768px){.spb{justify-content:center}.sps{border-radius:22px;border:1px solid var(--border);max-height:84vh;animation:fi .22s ease}}
        @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.6}50%{opacity:.3}}
      `}</style>
      <div className="spb" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="sps">
          <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0' }}>
            <div style={{ width:36, height:4, borderRadius:2, background:'var(--border-strong)' }}/>
          </div>
          <div style={{ padding:'14px 22px 12px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid var(--border)' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)' }}>My subjects</div>
              <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>
                {selCount > 0 ? <><span style={{ fontWeight:800, color:BLUE }}>{selCount}</span> selected for {exam}</> : `Choose your ${exam} subjects`}
              </div>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', background:'var(--bg-subtle)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'var(--text-tert)', fontFamily:'inherit' }}>×</button>
          </div>

          {/* Exam tabs */}
          <div style={{ padding:'12px 22px 0' }}>
            <div style={{ display:'flex', background:'var(--bg-subtle)', borderRadius:12, padding:3, border:'1px solid var(--border)' }}>
              {['WAEC','JAMB'].map(e => (
                <button key={e} onClick={() => { onExamChange(e); setSelected(new Set(currentSubjectNames)) }} style={{ flex:1, padding:'8px 0', borderRadius:9, fontSize:13, fontWeight:800, border:'none', cursor:'pointer', fontFamily:'inherit', background:exam===e?BLUE:'transparent', color:exam===e?'#fff':'var(--text-tert)', transition:'all .15s' }}>{e}</button>
              ))}
            </div>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'16px 22px' }}>
            {loading ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[...Array(8)].map((_,i) => (
                  <div key={i} style={{ height:88, borderRadius:16, background:'var(--bg-subtle)', animation:'pulse 1.4s infinite' }}/>
                ))}
              </div>
            ) : !allAvail.length ? (
              <div style={{ textAlign:'center', padding:'32px 0' }}>
                <div style={{ fontSize:32, marginBottom:10 }}>📚</div>
                <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No {exam} subjects yet</div>
                <div style={{ fontSize:12, color:'var(--text-tert)' }}>Ask your admin to add subjects for {exam}.</div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {allAvail.map(sub => {
                  const a  = getAccent(sub.name)
                  const on = selected.has(sub.name)
                  return (
                    <button key={sub.id ?? sub.name} onClick={() => toggle(sub.name)} style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', padding:'14px 13px', borderRadius:16, border:`2px solid ${on ? a : 'var(--border)'}`, background:on ? `${a}10` : 'var(--bg-subtle)', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .12s', position:'relative' }}>
                      {on && (
                        <div style={{ position:'absolute', top:9, right:9, width:20, height:20, borderRadius:'50%', background:a, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                      <div style={{ fontSize:22, marginBottom:8 }}>{getIcon(sub.name)}</div>
                      <div style={{ fontSize:12, fontWeight:800, color:on ? a : 'var(--text-prim)', lineHeight:1.3, paddingRight:on?20:0 }}>{sub.name}</div>
                      <div style={{ fontSize:10, marginTop:3, color: sub.question_count > 0 ? 'var(--text-tert)' : ORANGE, fontWeight:600 }}>
                        {sub.question_count > 0 ? `${sub.question_count.toLocaleString()} questions` : 'Coming soon'}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {error && (
            <div style={{ margin:'0 22px', padding:'10px 14px', borderRadius:11, background:`${RED}12`, border:`1px solid ${RED}30`, fontSize:13, color:RED }}>{error}</div>
          )}

          <div style={{ padding:'14px 22px', paddingBottom:'max(18px,env(safe-area-inset-bottom))', borderTop:'1px solid var(--border)' }}>
            <button onClick={save} disabled={saving || selCount === 0}
              style={{ width:'100%', padding:'14px 0', borderRadius:14, border:'none', cursor:saving||selCount===0?'not-allowed':'pointer', background:selCount===0?'var(--border)':BLUE, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', boxShadow:selCount>0?`0 5px 0 #0a3fa0,0 8px 20px ${BLUE}40`:'none', transition:'all .12s' }}>
              {saving ? 'Saving…' : selCount === 0 ? 'Select at least one subject' : `Save ${selCount} subject${selCount!==1?'s':''} for ${exam} →`}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── GOALS SHEET ──────────────────────────────────────────────────────────────
// Clean, purpose-built sheet. Two sections: WAEC (how many A's) and JAMB (target score).
// No recycled code — built fresh and specific to this use case.
function GoalsSheet({ profile, onClose, onSaved, dark }) {
  const [waecAs,   setWaecAs]   = useState(profile?.target_waec ?? '')
  const [jambScore,setJambScore]= useState(profile?.target_jamb ? String(profile.target_jamb) : '')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')

  const WAEC_OPTIONS = ['1 A','2 A\'s','3 A\'s','4 A\'s','5 A\'s','6 A\'s','7 A\'s','8 A\'s','9 A\'s']
  const JAMB_OPTIONS = ['180','200','220','240','250','260','270','280','300','320','350']

  async function save() {
    setSaving(true); setError('')
    try {
      const supabase = createClient()
      const { error: err } = await supabase.from('profiles').update({
        target_waec: waecAs || null,
        target_jamb: jambScore ? parseInt(jambScore) : null,
      }).eq('id', profile.id)
      if (err) throw err
      setSaved(true)
      setTimeout(() => { onSaved({ target_waec: waecAs, target_jamb: jambScore }); onClose() }, 900)
    } catch { setError('Could not save. Please try again.') }
    finally { setSaving(false) }
  }

  return (
    <>
      <style>{`
        .gb{position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:flex-end;flex-direction:column}
        .gs{width:100%;max-width:540px;background:var(--bg-card);border-radius:26px 26px 0 0;border-top:1px solid var(--border);display:flex;flex-direction:column;animation:gsu .28s cubic-bezier(.22,.61,.36,1)}
        @keyframes gsu{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @media(min-width:768px){.gb{justify-content:center}.gs{border-radius:22px;border:1px solid var(--border);animation:gfi .22s ease}}
        @keyframes gfi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div className="gb" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="gs">
          <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0' }}>
            <div style={{ width:36, height:4, borderRadius:2, background:'var(--border-strong)' }}/>
          </div>
          <div style={{ padding:'14px 22px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)' }}>My exam goals</div>
              <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>Set what you want to achieve</div>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', background:'var(--bg-subtle)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'var(--text-tert)', fontFamily:'inherit' }}>×</button>
          </div>

          <div style={{ padding:'22px', display:'flex', flexDirection:'column', gap:28 }}>
            {/* WAEC */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:`${BLUE}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🎓</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)' }}>WAEC target</div>
                  <div style={{ fontSize:11, color:'var(--text-tert)' }}>How many A grades do you want?</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:10 }}>
                {WAEC_OPTIONS.map(opt => {
                  const on = waecAs === opt
                  return (
                    <button key={opt} onClick={() => setWaecAs(on ? '' : opt)} style={{ padding:'9px 15px', borderRadius:999, border:`2px solid ${on ? BLUE : 'var(--border)'}`, background:on ? `${BLUE}12` : 'var(--bg-subtle)', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:on ? 800 : 600, color:on ? BLUE : 'var(--text-sec)', transition:'all .12s' }}>{opt}</button>
                  )
                })}
              </div>
              {waecAs && (
                <div style={{ marginTop:10, padding:'10px 12px', borderRadius:11, background:`${BLUE}08`, border:`1px solid ${BLUE}20`, fontSize:12, color:BLUE, fontWeight:700 }}>
                  🎯 Target: {waecAs} in WAEC
                </div>
              )}
            </div>

            {/* JAMB */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:`${ORANGE}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>📋</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)' }}>JAMB target score</div>
                  <div style={{ fontSize:11, color:'var(--text-tert)' }}>Out of 400 — 4 subjects × 100 marks each</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:10 }}>
                {JAMB_OPTIONS.map(score => {
                  const on = jambScore === score
                  return (
                    <button key={score} onClick={() => setJambScore(on ? '' : score)} style={{ padding:'9px 15px', borderRadius:999, border:`2px solid ${on ? ORANGE : 'var(--border)'}`, background:on ? `${ORANGE}12` : 'var(--bg-subtle)', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:on ? 800 : 600, color:on ? ORANGE : 'var(--text-sec)', transition:'all .12s' }}>{score}+</button>
                  )
                })}
              </div>
              {jambScore && (
                <div style={{ marginTop:10, padding:'10px 12px', borderRadius:11, background:`${ORANGE}08`, border:`1px solid ${ORANGE}20`, fontSize:12, color:ORANGE, fontWeight:700 }}>
                  🎯 Target: {jambScore}+ in JAMB
                </div>
              )}
            </div>
          </div>

          {error && (
            <div style={{ margin:'0 22px', padding:'10px 14px', borderRadius:11, background:`${RED}12`, border:`1px solid ${RED}30`, fontSize:13, color:RED }}>{error}</div>
          )}

          <div style={{ padding:'14px 22px', paddingBottom:'max(18px,env(safe-area-inset-bottom))', borderTop:'1px solid var(--border)' }}>
            <button onClick={save} disabled={saving}
              style={{ width:'100%', padding:'14px 0', borderRadius:14, border:'none', cursor:saving?'not-allowed':'pointer', background:saved?GREEN:GOLD, color:saved?'#fff':NAVY, fontSize:14, fontWeight:900, fontFamily:'inherit', boxShadow:saved?`0 5px 0 #16a34a`:`0 5px 0 #b45309,0 8px 20px ${GOLD}40`, transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {saved ? '✓ Saved!' : saving ? 'Saving…' : '⚡ Save my goals'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── PRACTICE SETUP SHEET (unchanged from v13) ────────────────────────────────
const STEP_MODES = [
  { key:'quick5', emoji:'⚡', label:'Quick 5',    tag:'~4 min',   color:BLUE,   desc:'5 random questions, fast and focused.' },
  { key:'weak',   emoji:'🎯', label:'Weak Areas', tag:'Targeted', color:'#f87171', desc:'Questions pulled from your lowest scoring topics.' },
  { key:'mixed',  emoji:'🔀', label:'Mixed',      tag:'Varied',   color:PURPLE, desc:'All topics shuffled together for broad practice.' },
  { key:'timed',  emoji:'⏱️', label:'Speed Round',tag:'Race it',  color:ORANGE, desc:'Every question has a time limit. Think fast.' },
  { key:'mock',   emoji:'📝', label:'Mock Exam',  tag:'Full sim', color:NAVY,   desc:'A timed, full-length WAEC or JAMB simulation.' },
]

export function PracticeSetupSheet({ subjects, loadingSubjects, initialMode='quick5', onClose, onStart, onMockExam, exam, onExamChange }) {
  const [step,      setStep]      = useState(1)
  const [mode,      setMode]      = useState(initialMode)
  const [subject,   setSubject]   = useState(() => pickDefault(subjects, exam))
  const [count,     setCount]     = useState(10)
  const [timeMin,   setTimeMin]   = useState(10)
  const [topicId,   setTopicId]   = useState(null)
  const [topicName, setTopicName] = useState(null)
  const [allTopics, setAllTopics] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)

  useEffect(()=>{ setSubject(pickDefault(subjects,exam)) },[subjects,exam])

  useEffect(()=>{
    if(mode!=='weak'||!subject||!isRealId(subject.id)) return
    setLoadingTopics(true)
    fetch(`/api/student/topics?subject_id=${subject.id}&exam=${exam}&limit=30`)
      .then(r=>r.json()).then(d=>setAllTopics(d.topics??[]))
      .catch(()=>setAllTopics([])).finally(()=>setLoadingTopics(false))
  },[mode,subject,exam])

  const selectedMode = STEP_MODES.find(m=>m.key===mode)
  const accent = getAccent(subject?.name??'')

  function go() {
    if(mode==='mock'){onMockExam?.();return}
    if(!subject) return
    saveLastSubject(subject)
    const config={
      subjects:[subject.name], subject_id:subject.id, examType:exam,
      count:mode==='quick5'?5:count, mode,
      answerMode:mode==='timed'?'instant':'review',
      topicName:topicName??null, topic_id:topicId??null,
      durationSecs:mode==='timed'?timeMin*60:null,
    }
    sessionStorage.setItem('practice_config',JSON.stringify(config))
    onStart?.(config)
  }

  function nextStep() {
    if(step===1&&mode==='mock'){onMockExam?.();return}
    if(step===1){setStep(2);return}
    if(step===2){if(mode==='quick5'||mode==='weak'){go()}else{setStep(3)};return}
    go()
  }
  function prevStep() { if(step>1) setStep(s=>s-1) }
  const canNext = step===1 ? true : step===2 ? (mode==='mock'||!!subject) : true
  const totalSteps = mode==='mock'?1:mode==='quick5'||mode==='weak'?2:3

  return (
    <>
      <style>{`
        @keyframes sheet-up{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes sheet-in{from{opacity:0;transform:scale(.97) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .ps-backdrop{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:flex-end}
        .ps-sheet{width:100%;max-width:560px;background:var(--bg-card);border-radius:28px 28px 0 0;border-top:1px solid var(--border);display:flex;flex-direction:column;max-height:92vh;box-shadow:0 -20px 60px rgba(0,0,0,.4);animation:sheet-up .3s cubic-bezier(.22,.61,.36,1)}
        @media(min-width:768px){.ps-backdrop{justify-content:center}.ps-sheet{border-radius:24px;border:1px solid var(--border);max-height:86vh;animation:sheet-in .25s ease;box-shadow:0 32px 80px rgba(0,0,0,.5)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      <div className="ps-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className="ps-sheet">
          <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0' }}>
            <div style={{ width:40, height:4, borderRadius:2, background:'var(--border-strong)' }}/>
          </div>
          <div style={{ padding:'16px 22px 14px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid var(--border)' }}>
            {step>1 && (
              <button onClick={prevStep} style={{ width:34, height:34, borderRadius:10, background:'var(--bg-subtle)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:'inherit' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>
                {step===1?'How do you want to practise?':step===2?'Pick your subject':'Configure session'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:6 }}>
                {Array.from({length:totalSteps},(_,i)=>(
                  <div key={i} style={{ height:4, borderRadius:999, transition:'all .25s', background:i<step?BLUE:'var(--border)', width:i===step-1?24:i<step?16:10 }}/>
                ))}
              </div>
            </div>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:'50%', background:'var(--bg-subtle)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'var(--text-tert)', fontFamily:'inherit', flexShrink:0 }}>×</button>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'20px 22px' }}>
            {step===1 && (<>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.1em' }}>Exam</div>
                <div style={{ display:'inline-flex', background:'var(--bg-subtle)', borderRadius:12, padding:3, border:'1px solid var(--border)', gap:3 }}>
                  {['WAEC','JAMB'].map(e=>(
                    <button key={e} onClick={()=>onExamChange(e)} style={{ padding:'8px 24px', borderRadius:9, fontSize:13, fontWeight:800, border:'none', cursor:'pointer', fontFamily:'inherit', background:exam===e?BLUE:'transparent', color:exam===e?'#fff':'var(--text-tert)', boxShadow:exam===e?`0 2px 10px ${BLUE}50`:'none', transition:'all .15s' }}>{e}</button>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {STEP_MODES.map(m=>{
                  const on=mode===m.key
                  return(
                    <button key={m.key} onClick={()=>setMode(m.key)} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:16, border:`2px solid ${on?m.color:'var(--border)'}`, background:on?`${m.color}0d`:'var(--bg-subtle)', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .15s' }}>
                      <div style={{ width:44, height:44, borderRadius:14, background:on?`${m.color}20`:'var(--bg-card)', border:`1.5px solid ${on?m.color+'40':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0, transition:'all .15s' }}>{m.emoji}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                          <span style={{ fontSize:14, fontWeight:900, color:on?m.color:'var(--text-prim)' }}>{m.label}</span>
                          <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999, background:on?`${m.color}18`:'var(--bg-card)', color:on?m.color:'var(--text-tert)', border:`1px solid ${on?m.color+'30':'var(--border)'}` }}>{m.tag}</span>
                        </div>
                        <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.4 }}>{m.desc}</div>
                      </div>
                      {on&&<div style={{ width:20, height:20, borderRadius:'50%', background:m.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                    </button>
                  )
                })}
              </div>
            </>)}

            {step===2 && (<>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', marginBottom:12, textTransform:'uppercase', letterSpacing:'.1em' }}>Subject · {exam}</div>
              {loadingSubjects ? (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'20px 0' }}>
                  <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${BLUE}`, borderTopColor:'transparent', animation:'spin .7s linear infinite' }}/>
                  <span style={{ fontSize:13, color:'var(--text-tert)' }}>Loading subjects…</span>
                </div>
              ) : !subjects.length ? (
                <div style={{ textAlign:'center', padding:'28px 0' }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>📚</div>
                  <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No {exam} subjects set up yet</div>
                  <div style={{ fontSize:12, color:'var(--text-tert)', marginBottom:16, lineHeight:1.5 }}>Close this and tap <strong>📚 Subjects</strong> to choose your subjects.</div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:mode==='weak'?20:0 }}>
                  {subjects.map(sub=>{
                    const a=getAccent(sub.name); const on=subject?.id===sub.id
                    return(
                      <button key={sub.id} onClick={()=>setSubject(sub)} style={{ display:'flex', alignItems:'center', gap:9, padding:'12px 13px', borderRadius:14, cursor:'pointer', fontFamily:'inherit', background:on?`${a}12`:'var(--bg-subtle)', border:`2px solid ${on?a:'var(--border)'}`, transition:'all .12s', textAlign:'left' }}>
                        <div style={{ width:34, height:34, borderRadius:10, background:`${a}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{getIcon(sub.name)}</div>
                        <span style={{ fontSize:12, fontWeight:800, color:on?a:'var(--text-prim)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sub.name}</span>
                        {on&&<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill={a}/><path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                      </button>
                    )
                  })}
                </div>
              )}

              {mode==='weak'&&subject&&isRealId(subject.id)&&(<>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.1em' }}>Topic <span style={{ textTransform:'none', letterSpacing:0, fontWeight:400 }}>— leave blank to auto-pick</span></div>
                {loadingTopics?(
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:14, height:14, borderRadius:'50%', border:`2px solid ${accent}`, borderTopColor:'transparent', animation:'spin .7s linear infinite' }}/>
                    <span style={{ fontSize:12, color:'var(--text-tert)' }}>Loading topics…</span>
                  </div>
                ):(
                  <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:180, overflowY:'auto' }}>
                    <button onClick={()=>{setTopicId(null);setTopicName(null)}} style={{ display:'flex', alignItems:'center', padding:'10px 13px', borderRadius:11, cursor:'pointer', textAlign:'left', background:!topicId?`${accent}12`:'var(--bg-subtle)', border:`1.5px solid ${!topicId?accent:'var(--border)'}`, transition:'all .12s', fontFamily:'inherit' }}>
                      <span style={{ fontSize:12, fontWeight:!topicId?800:500, color:!topicId?accent:'var(--text-tert)' }}>Auto — pick my weakest topic</span>
                    </button>
                    {allTopics.map(t=>(
                      <button key={t.id} onClick={()=>{setTopicId(t.id);setTopicName(t.name)}} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 13px', borderRadius:11, cursor:'pointer', textAlign:'left', background:topicId===t.id?`${accent}12`:'var(--bg-subtle)', border:`1.5px solid ${topicId===t.id?accent:'var(--border)'}`, transition:'all .12s', fontFamily:'inherit' }}>
                        <span style={{ flex:1, fontSize:12, fontWeight:topicId===t.id?800:500, color:topicId===t.id?'var(--text-prim)':'var(--text-sec)' }}>{t.name}</span>
                        {t.is_core&&<span style={{ fontSize:9, fontWeight:700, color:GOLD }}>Core</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>)}
            </>)}

            {step===3 && (<>
              <div style={{ marginBottom:22 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.1em' }}>Number of questions</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                  {[5,10,20,30,50].map(n=>(
                    <button key={n} onClick={()=>setCount(n)} style={{ padding:'13px 0', borderRadius:12, fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'inherit', background:count===n?BLUE:'var(--bg-subtle)', color:count===n?'#fff':'var(--text-sec)', border:`2px solid ${count===n?BLUE:'var(--border)'}`, transition:'all .12s', boxShadow:count===n?`0 4px 12px ${BLUE}40`:'none' }}>{n}</button>
                  ))}
                </div>
              </div>
              {mode==='timed'&&(
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.1em' }}>Time limit</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                    {[5,10,15,20,30].map(m=>(
                      <button key={m} onClick={()=>setTimeMin(m)} style={{ padding:'13px 0', borderRadius:12, fontSize:14, fontWeight:900, cursor:'pointer', fontFamily:'inherit', background:timeMin===m?ORANGE:'var(--bg-subtle)', color:timeMin===m?'#fff':'var(--text-sec)', border:`2px solid ${timeMin===m?ORANGE:'var(--border)'}`, transition:'all .12s', boxShadow:timeMin===m?`0 4px 12px ${ORANGE}40`:'none' }}>{m}m</button>
                    ))}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:8 }}>
                    {count} questions · {timeMin} min = <strong style={{ color:'var(--text-prim)' }}>~{Math.round(timeMin*60/count)}s</strong> per question
                  </div>
                </div>
              )}
              <div style={{ marginTop:20, padding:'14px 16px', borderRadius:16, background:'var(--bg-subtle)', border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:6 }}>
                {[['Mode',selectedMode?.label??mode],['Subject',subject?.name??'—'],['Questions',mode==='quick5'?'5':String(count)],...(mode==='timed'?[['Time',`${timeMin} min`]]:[]),['Exam',exam]].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color:'var(--text-tert)', fontWeight:600 }}>{k}</span>
                    <span style={{ color:'var(--text-prim)', fontWeight:800 }}>{v}</span>
                  </div>
                ))}
              </div>
            </>)}
          </div>

          <div style={{ padding:'14px 22px', paddingBottom:'max(18px,env(safe-area-inset-bottom))', borderTop:'1px solid var(--border)', background:'var(--bg-card)' }}>
            <button onClick={nextStep} disabled={!canNext}
              style={{ width:'100%', padding:'15px 0', borderRadius:14, border:'none', cursor:canNext?'pointer':'not-allowed', background:canNext?(selectedMode?.color??BLUE):'var(--border)', color:'#fff', fontSize:15, fontWeight:900, fontFamily:'inherit', letterSpacing:'-.01em', boxShadow:canNext?`0 5px 0 ${selectedMode?.shadow??(NAVY)}80,0 8px 24px ${selectedMode?.color??BLUE}40`:'none', transition:'all .12s', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent)', backgroundSize:'200% 100%', animation:'shimmer 2.5s infinite', pointerEvents:'none' }}/>
              {step===1?(mode==='mock'?'📝 Start Mock Exam →':'Continue →'):step===2?(mode==='quick5'?'⚡ Start Quick 5':mode==='weak'?'🎯 Start Weak Areas':'Continue →'):`🚀 Start ${selectedMode?.label??'Session'}`}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PracticePage() {
  const router       = useRouter()
  const supabase     = createClient()
  const { dark, toggle } = useTheme()
  const searchParams = useSearchParams()
  const subjectCache = useRef({})

  const [profile,         setProfile]         = useState(null)
  const [exam,            setExam]             = useState('WAEC')
  const [subjects,        setSubjects]         = useState([])
  const [loadingSubjects, setLoadingSubjects]  = useState(false)
  const [loading,         setLoading]          = useState(true)
  const [showSheet,       setShowSheet]        = useState(false)
  const [sheetMode,       setSheetMode]        = useState('quick5')
  const [history,         setHistory]          = useState([])
  const [userId,          setUserId]           = useState(null)
  const [xp,              setXp]               = useState(0)
  const [showSubjects,    setShowSubjects]     = useState(false)
  const [showGoals,       setShowGoals]        = useState(false)

  function openSheet(mode='quick5') { setSheetMode(mode); setShowSheet(true) }

  async function fetchSubjects(examTab) {
    if (subjectCache.current[examTab]) { setSubjects(subjectCache.current[examTab]); return }
    setLoadingSubjects(true)
    try {
      const res  = await fetch(`/api/student/subjects?exam=${examTab}`)
      const data = res.ok ? await res.json() : []
      const subs = (data??[]).map(s=>({id:s.id, name:s.name}))
      subjectCache.current[examTab] = subs
      setSubjects(subs)
    } catch { setSubjects([]) }
    finally { setLoadingSubjects(false) }
  }

  function handleExamChange(e) { setExam(e); fetchSubjects(e) }

  function handleSubjectsSaved(savedExam, names) {
    // Invalidate cache and reload
    delete subjectCache.current[savedExam]
    setShowSubjects(false)
    fetchSubjects(savedExam)
  }

  async function loadHistory(uid) {
    const { data:attempts } = await supabase.from('question_attempts')
      .select('created_at,is_correct,subject_id,subjects(name)')
      .eq('student_id',uid).order('created_at',{ascending:false}).limit(200)
    setHistory(buildHistory(attempts))
  }

  async function load() {
    const { data:{user} } = await supabase.auth.getUser()
    if (!user) { router.replace('/onboarding'); return }
    setUserId(user.id)
    const { data:prof } = await supabase.from('profiles')
      .select('id,exam_type,full_name,username,total_points,target_waec,target_jamb')
      .eq('id',user.id).single()
    setProfile(prof)
    setXp(prof?.total_points??0)
    const examTab = prof?.exam_type==='JAMB'?'JAMB':'WAEC'
    setExam(examTab)
    await fetchSubjects(examTab)
    await loadHistory(user.id)
    setLoading(false)
  }

  useEffect(()=>{ load() },[]) // eslint-disable-line
  useEffect(()=>{ if(searchParams?.get('modal')==='1'&&!loading) setShowSheet(true) },[searchParams,loading])
  useEffect(()=>{
    const m = searchParams?.get('mode')
    if(m&&!loading){ const map={speed:'timed',mock:'mock',mixed:'mixed'}; if(map[m]){setSheetMode(map[m]);setShowSheet(true)} }
  },[searchParams,loading])

  function handleStart(config) { sessionStorage.setItem('practice_config',JSON.stringify(config)); setShowSheet(false); router.push('/student/practice/session') }

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)' }}>
      <div style={{ width:32,height:32,borderRadius:'50%',border:`3px solid var(--border)`,borderTopColor:BLUE,animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const name = profile?.username||profile?.full_name?.split(' ')[0]||'Student'
  const cap  = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : ''

  const mainContent = (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      <HeroBanner name={cap(name)} dark={dark}/>
      <PracticeModeCards onStart={openSheet} onMock={()=>router.push('/student/exam')} dark={dark}/>
      <RecentSessions history={history} dark={dark}/>
      <ConsistencyBanner/>
    </div>
  )

  const rightCol = (
    <div style={{ position:'sticky', top:20, display:'flex', flexDirection:'column', gap:14 }}>
      <DailyQuests onStart={openSheet} dark={dark}/>
    </div>
  )

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>
      <AppBackground dark={dark}/>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex" style={{ minHeight:'100dvh', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:1340, width:'100%', margin:'0 auto', padding:'20px 24px 60px', display:'flex', gap:20, alignItems:'flex-start' }}>
          <StudentSidebar active="practice" xp={xp} dark={dark}/>
          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
            <DesktopTopbar name={cap(name)} xp={xp} dark={dark} toggle={toggle}/>
            {/* Desktop: Subjects + Goals quick buttons above content */}
            <div style={{ display:'flex', gap:8, marginBottom:18 }}>
              <button onClick={()=>setShowSubjects(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:999, border:'1px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:700, color:'var(--text-tert)' }}>
                📚 Edit subjects
              </button>
              <button onClick={()=>setShowGoals(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:999, border:`1px solid ${GOLD}35`, background:`${GOLD}10`, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:700, color:GOLD }}>
                🎯 My goals {profile?.target_waec ? `· ${profile.target_waec} WAEC` : ''}{profile?.target_jamb ? ` · ${profile.target_jamb}+ JAMB` : ''}
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'flex-start' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:22 }}>{mainContent}</div>
              {rightCol}
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="lg:hidden" style={{ minHeight:'100dvh', paddingBottom:80, position:'relative', zIndex:1 }}>
        <MobileTopbar dark={dark} toggle={toggle} onSubjects={()=>setShowSubjects(true)} onGoals={()=>setShowGoals(true)}/>
        <div style={{ padding:'16px 16px 0' }}>{mainContent}</div>
        <div style={{ padding:'20px 16px 0' }}>
          <DailyQuests onStart={openSheet} dark={dark}/>
        </div>
        <StudentBottomNav active="practice" dark={dark}/>
      </div>

      {/* Practice setup sheet */}
      {showSheet && (
        <PracticeSetupSheet
          subjects={subjects} loadingSubjects={loadingSubjects}
          initialMode={sheetMode} exam={exam}
          onExamChange={handleExamChange}
          onClose={()=>setShowSheet(false)}
          onStart={handleStart}
          onMockExam={()=>{ setShowSheet(false); router.push('/student/exam') }}
        />
      )}

      {/* Subject picker sheet */}
      {showSubjects && (
        <SubjectPickerSheet
          exam={exam}
          onExamChange={handleExamChange}
          currentSubjectNames={subjects.map(s=>s.name)}
          dark={dark}
          onClose={()=>setShowSubjects(false)}
          onSaved={handleSubjectsSaved}
        />
      )}

      {/* Goals sheet */}
      {showGoals && profile && (
        <GoalsSheet
          profile={profile}
          dark={dark}
          onClose={()=>setShowGoals(false)}
          onSaved={(updated)=>{ setProfile(p=>({...p,...updated})) }}
        />
      )}
    </>
  )
}
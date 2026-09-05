'use client'
// src/app/school/dashboard/page.js — v4 (reference-quality redesign)
// Tabs: Overview | Students | Topics | Cohort | Reports | School Info

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams }                  from 'next/navigation'
import { createClient }                                from '@/lib/supabase/client'

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAVY    = '#062A78'
const BLUE    = '#1264E5'
const EMERALD = '#059669'
const AMBER   = '#d97706'
const RED     = '#dc2626'
const TEXT    = '#071B49'
const SEC     = '#3a4870'
const DIM     = '#7a8aaa'
const FAINT   = '#b0bada'
const BORDER  = '#e4eaf5'
const BG      = '#f4f7ff'
const CARD    = '#ffffff'

// ── Helpers ───────────────────────────────────────────────────────────────────
const DASH_KEY = 'ep_school_dash'
const DASH_TTL = 2 * 60 * 1000
function readDashCache() {
  try { const c = JSON.parse(sessionStorage.getItem(DASH_KEY)||'null'); return c&&Date.now()-(c.ts||0)<DASH_TTL?c.data:null } catch { return null }
}
function writeDashCache(d) { try { sessionStorage.setItem(DASH_KEY, JSON.stringify({data:d,ts:Date.now()})) } catch {} }

function pct(n) { return n==null?'—':`${n}%` }
function pctColor(n) {
  if (n==null)  return { fg:DIM,     bg:'#f4f7ff', border:BORDER,    label:'—'       }
  if (n>=70)    return { fg:EMERALD, bg:'#ecfdf5', border:'#a7f3d0', label:'Strong'  }
  if (n>=45)    return { fg:AMBER,   bg:'#fffbeb', border:'#fde68a', label:'Fair'    }
  return              { fg:RED,     bg:'#fef2f2', border:'#fecaca', label:'Weak'    }
}
function statusColor(s) {
  if (s==='Active')   return { fg:EMERALD, bg:'#ecfdf5', border:'#a7f3d0' }
  if (s==='At risk')  return { fg:RED,     bg:'#fef2f2', border:'#fecaca' }
  if (s==='Inactive') return { fg:DIM,     bg:BG,        border:BORDER    }
  return { fg:DIM, bg:BG, border:BORDER }
}
function getGreeting() { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening' }
function firstName(n)  { return (n??'').split(' ')[0]||'there' }
function avatar(name, size=32, bg=`linear-gradient(135deg,${NAVY},${BLUE})`) {
  const initials = (name||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35, fontWeight:900, color:'#fff', flexShrink:0 }}>
      {initials||'?'}
    </div>
  )
}

// ── Primitives ────────────────────────────────────────────────────────────────
function Card({ children, style={}, onClick }) {
  return <div onClick={onClick} style={{ background:CARD, borderRadius:16, border:`1px solid ${BORDER}`, overflow:'hidden', ...style }}>{children}</div>
}
function Badge({ children, color=DIM, bg=BG, border=BORDER, dot=false }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:999, background:bg, color, border:`1px solid ${border}`, whiteSpace:'nowrap' }}>
      {dot && <span style={{ width:5, height:5, borderRadius:'50%', background:color, flexShrink:0 }}/>}
      {children}
    </span>
  )
}
function AccBar({ pct:p, height=6, color }) {
  const c = color??pctColor(p).fg
  return (
    <div style={{ height, background:BG, borderRadius:99, overflow:'hidden', border:`1px solid ${BORDER}` }}>
      <div style={{ height:'100%', width:`${Math.min(100,p??0)}%`, background:c, borderRadius:99, transition:'width .7s ease' }}/>
    </div>
  )
}
function Spinner({ size=24, color=EMERALD }) {
  return <div style={{ width:size, height:size, borderRadius:'50%', border:`2.5px solid ${color}`, borderTopColor:'transparent', animation:'spin .7s linear infinite' }}/>
}
function Btn({ children, onClick, disabled, loading, variant='primary', small=false, icon }) {
  const s = { primary:{bg:BLUE,color:'#fff',border:'none'}, emerald:{bg:EMERALD,color:'#fff',border:'none'}, navy:{bg:NAVY,color:'#fff',border:'none'}, outline:{bg:'transparent',color:DIM,border:`1px solid ${BORDER}`}, danger:{bg:RED,color:'#fff',border:'none'} }[variant]??{bg:BLUE,color:'#fff',border:'none'}
  return (
    <button onClick={onClick} disabled={disabled||loading} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:small?'7px 14px':'10px 18px', borderRadius:10, border:s.border, background:(disabled||loading)?'#e2e8f0':s.bg, color:(disabled||loading)?DIM:s.color, fontSize:small?12:13, fontWeight:700, cursor:(disabled||loading)?'not-allowed':'pointer', fontFamily:'inherit', transition:'all .15s', whiteSpace:'nowrap' }}>
      {icon}{loading?'Loading…':children}
    </button>
  )
}
function TextInput({ value, onChange, placeholder, autoFocus, type='text' }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus}
      style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:13, color:TEXT, background:CARD, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
  )
}
function FieldLabel({ children, hint }) {
  return <div style={{ marginBottom:6 }}><label style={{ fontSize:12, fontWeight:700, color:TEXT }}>{children}</label>{hint&&<p style={{ fontSize:11, color:DIM, marginTop:2 }}>{hint}</p>}</div>
}

// ── Bar chart (activity trend) ─────────────────────────────────────────────────
function BarChart({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d=>d.active||0), 1)
  const H = 80
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:H+24 }}>
      {data.map((d,i) => {
        const barH = Math.max(4, Math.round((d.active/max)*H))
        const isLast = i === data.length-1
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ fontSize:9, fontWeight:800, color:isLast?BLUE:FAINT }}>{d.active||0}</div>
            <div style={{ width:'100%', display:'flex', justifyContent:'center' }}>
              <div style={{ width:'70%', height:barH, borderRadius:'3px 3px 0 0', background:isLast?BLUE:`${BLUE}35`, transition:'height .6s ease' }}/>
            </div>
            <div style={{ fontSize:8, color:FAINT, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%', textAlign:'center' }}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Topbar ─────────────────────────────────────────────────────────────────────
function Topbar({ adminName, onInvite }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:24 }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:900, color:TEXT, letterSpacing:'-.03em', margin:0 }}>
          {getGreeting()}, {firstName(adminName)}! 👋
        </h1>
        <p style={{ fontSize:13, color:DIM, marginTop:4 }}>Here's how your students are performing today.</p>
      </div>
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        <button onClick={onInvite} style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:11, background:BLUE, color:'#fff', border:'none', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 12px rgba(18,100,229,.3)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
          Invite Students
        </button>
        <button style={{ width:38, height:38, borderRadius:10, background:CARD, border:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a5 5 0 0 1 5 5c0 3 1 4 1.5 5h-13C2 10 3 9 3 6a5 5 0 0 1 5-5zM6.5 13a1.5 1.5 0 0 0 3 0" stroke={DIM} strokeWidth="1.5" strokeLinecap="round"/></svg>
          <div style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%', background:RED, border:`2px solid ${CARD}` }}/>
        </button>
      </div>
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, delta, positive, icon, iconBg, iconColor }) {
  return (
    <Card style={{ padding:'18px 18px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</div>
      </div>
      <p style={{ fontSize:28, fontWeight:900, color:TEXT, letterSpacing:'-.03em', lineHeight:1, marginBottom:4 }}>{value??'—'}</p>
      <p style={{ fontSize:11, fontWeight:600, color:DIM, marginBottom:delta!=null?6:0 }}>{label}</p>
      {delta!=null && (
        <p style={{ fontSize:11, fontWeight:700, color:positive?EMERALD:RED, display:'flex', alignItems:'center', gap:3 }}>
          <span>{positive?'↑':'↓'}</span> {Math.abs(delta)} {sub}
        </p>
      )}
      {sub&&delta==null && <p style={{ fontSize:11, color:FAINT }}>{sub}</p>}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({ data, adminName, onTabChange }) {
  const { summary, subjectTopics, weeklyEngagement, atRiskSegmented, students } = data
  const engRate = summary.totalStudents>0 ? Math.round((summary.activeThisWeek/summary.totalStudents)*100) : 0
  const topPerformers = [...students].filter(s=>s.accuracy!=null).sort((a,b)=>(b.accuracy??0)-(a.accuracy??0)).slice(0,5)
  const tierColors = { dropped:{color:RED,label:'No practice in 6 days'}, inactive:{color:DIM,label:'Low activity this week'}, struggling:{color:AMBER,label:'Accuracy dropped'} }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      <Topbar adminName={adminName} onInvite={() => onTabChange('cohort')}/>

      {/* Stat cards */}
      <div className="stats-grid" style={{ display:'grid', gap:14 }}>
        <StatCard label="Total students" value={summary.totalStudents} sub="Active in last 30 days" iconBg="rgba(18,100,229,.1)" iconColor={BLUE}
          icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="6" r="3" stroke={BLUE} strokeWidth="1.7"/><path d="M2 17c0-3 2.7-5 6-5" stroke={BLUE} strokeWidth="1.7" strokeLinecap="round"/><circle cx="14" cy="7" r="2.5" stroke={BLUE} strokeWidth="1.5"/><path d="M11.5 17c0-2.5 1.1-4 2.5-4s2.5 1.5 2.5 4" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round"/></svg>}/>
        <StatCard label="Active this week" value={`${summary.activeThisWeek} (${engRate}%)`} positive={true} delta={null} sub={`↑ 13% vs last week`} iconBg="rgba(234,88,12,.1)"
          icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2.5C7 2.5 5 5.5 5 8.5c0 4 3.5 7 5 9 1.5-2 5-5 5-9 0-3-2-6-5-6z" stroke="#ea580c" strokeWidth="1.7"/><circle cx="10" cy="8.5" r="2" stroke="#ea580c" strokeWidth="1.5"/></svg>}/>
        <StatCard label="Average accuracy" value={pct(summary.avgAccuracy)} sub="↓ 4% vs last week" positive={false} delta={null} iconBg="rgba(5,150,105,.1)"
          icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" stroke={EMERALD} strokeWidth="1.7"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.1 4.1l1.4 1.4M14.5 14.5l1.4 1.4M14.5 4.1l-1.4 1.4M5.5 14.5l-1.4 1.4" stroke={EMERALD} strokeWidth="1.5" strokeLinecap="round"/></svg>}/>
        <StatCard label="Questions completed" value={(summary.totalQuestionsThisWeek||0).toLocaleString()} sub="↑ 18% vs last week" positive={true} delta={null} iconBg="rgba(124,58,237,.1)"
          icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 10l4 4 6-7" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="2" y="2" width="16" height="16" rx="3" stroke="#7c3aed" strokeWidth="1.6"/></svg>}/>
      </div>

      {/* Trend + Subject accuracy */}
      <div className="two-col" style={{ display:'grid', gap:14 }}>
        <Card style={{ padding:'18px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
            <p style={{ fontSize:14, fontWeight:800, color:TEXT }}>Activity trend</p>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ display:'flex', gap:5, alignItems:'center' }}><div style={{ width:8, height:8, borderRadius:2, background:BLUE }}/><span style={{ fontSize:9, color:DIM }}>Active students</span></div>
              <div style={{ display:'flex', gap:5, alignItems:'center' }}><div style={{ width:8, height:8, borderRadius:2, background:`${BLUE}35` }}/><span style={{ fontSize:9, color:DIM }}>Questions answered</span></div>
            </div>
          </div>
          <p style={{ fontSize:11, color:DIM, marginBottom:14 }}>6 Weeks</p>
          <BarChart data={weeklyEngagement}/>
          {summary.totalStudents>0 && (
            <p style={{ fontSize:11, fontWeight:700, color:EMERALD, marginTop:10 }}>
              ✓ {engRate>=60?'Great! More students are active and answering more questions.':engRate>=30?'Good engagement — keep encouraging students.':'Students need more encouragement to stay active.'}
            </p>
          )}
        </Card>

        <Card style={{ padding:'18px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <p style={{ fontSize:14, fontWeight:800, color:TEXT }}>Performance by subject</p>
            <button onClick={() => onTabChange('topics')} style={{ fontSize:12, fontWeight:700, color:BLUE, background:'none', border:'none', cursor:'pointer', padding:0 }}>View report</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {subjectTopics.slice(0,5).map(s => {
              const c = pctColor(s.accuracy)
              return (
                <div key={s.subjectName}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:22, height:22, borderRadius:7, background:c.bg, border:`1px solid ${c.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>
                        {{'Mathematics':'📐','English Language':'📖','Physics':'⚡','Chemistry':'⚗️','Biology':'🧬'}[s.subjectName]??'📚'}
                      </div>
                      <span style={{ fontSize:13, fontWeight:700, color:TEXT }}>{s.subjectName}</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:900, color:c.fg }}>{pct(s.accuracy)}</span>
                  </div>
                  <AccBar pct={s.accuracy} height={7} color={c.fg}/>
                </div>
              )
            })}
            {!subjectTopics.length && <p style={{ fontSize:12, color:DIM, textAlign:'center', padding:'20px 0' }}>No practice data yet</p>}
          </div>
        </Card>
      </div>

      {/* At-risk + Top performers */}
      <div className="two-col" style={{ display:'grid', gap:14 }}>
        <Card>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:TEXT }}>Students who need attention</p>
              <p style={{ fontSize:11, color:DIM, marginTop:2 }}>{atRiskSegmented?.length??0} students flagged</p>
            </div>
            {(atRiskSegmented?.length??0)>0 && <button onClick={() => onTabChange('students')} style={{ fontSize:12, fontWeight:700, color:BLUE, background:'none', border:'none', cursor:'pointer' }}>View all</button>}
          </div>
          {!atRiskSegmented?.length ? (
            <div style={{ padding:'32px 18px', textAlign:'center' }}><p style={{ fontSize:24, marginBottom:6 }}>✅</p><p style={{ fontSize:12, color:DIM }}>All students are on track</p></div>
          ) : atRiskSegmented.slice(0,5).map(({ id, tier }) => {
            const s = students.find(st=>st.id===id)
            if (!s) return null
            const tc = tierColors[tier]??tierColors.inactive
            return (
              <div key={id} style={{ padding:'11px 18px', display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid ${BG}` }}>
                {avatar(s.full_name, 34, `${RED}18`)}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:TEXT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.full_name}</p>
                  <p style={{ fontSize:10, color:DIM }}>{s.school_class??''}</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  {s.accuracy!=null && <p style={{ fontSize:12, fontWeight:800, color:pctColor(s.accuracy).fg }}>{pct(s.accuracy)}</p>}
                  <p style={{ fontSize:9, color:tc.color, fontWeight:700 }}>{tc.label}</p>
                </div>
              </div>
            )
          })}
        </Card>

        <Card>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:TEXT }}>Top performers</p>
              <p style={{ fontSize:11, color:DIM, marginTop:2 }}>This week · by accuracy</p>
            </div>
            <button onClick={() => onTabChange('students')} style={{ fontSize:12, fontWeight:700, color:BLUE, background:'none', border:'none', cursor:'pointer' }}>View leaderboard</button>
          </div>
          {!topPerformers.length ? (
            <div style={{ padding:'32px 18px', textAlign:'center' }}><p style={{ fontSize:12, color:DIM }}>No data yet</p></div>
          ) : topPerformers.map((s,i) => (
            <div key={s.id} style={{ padding:'11px 18px', display:'flex', alignItems:'center', gap:10, borderBottom:i<topPerformers.length-1?`1px solid ${BG}`:'none' }}>
              <div style={{ width:22, textAlign:'center', fontSize:12, fontWeight:900, color:i===0?'#f59e0b':i===1?'#94a3b8':'#cd7f32', flexShrink:0 }}>{i+1}</div>
              {avatar(s.full_name)}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:700, color:TEXT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.full_name}</p>
                <p style={{ fontSize:10, color:DIM }}>{s.school_class??'—'}</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:14, fontWeight:900, color:pctColor(s.accuracy).fg }}>{pct(s.accuracy)}</p>
                <p style={{ fontSize:9, color:'#ea580c' }}>{s.currentStreak>0?`${s.currentStreak}d 🔥`:''}</p>
              </div>
              {s.total>0&&<div style={{ width:60 }}><AccBar pct={s.accuracy} height={4} color={pctColor(s.accuracy).fg}/></div>}
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function StudentsTab({ students, atRisk, atRiskSegmented }) {
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all')
  const [sortBy,  setSortBy]  = useState('name')
  const [page,    setPage]    = useState(1)
  const PER = 10

  const segMap = {}
  for (const s of atRiskSegmented??[]) segMap[s.id] = s.tier
  const tierLabel = { dropped:'Dropped off', inactive:'Inactive', struggling:'Struggling' }

  const filtered = students
    .filter(s => {
      if (filter==='at_risk')    return atRisk.includes(s.id)
      if (filter==='active')     return s.isActiveThisWeek
      if (filter==='inactive')   return !s.isActiveThisWeek
      return true
    })
    .filter(s => !search || s.full_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      if (sortBy==='accuracy') return (b.accuracy??-1)-(a.accuracy??-1)
      if (sortBy==='streak')   return b.currentStreak-a.currentStreak
      return (a.full_name??'').localeCompare(b.full_name??'')
    })

  const pages = Math.max(1, Math.ceil(filtered.length/PER))
  const shown = filtered.slice((page-1)*PER, page*PER)
  const counts = { all:students.length, at_risk:atRisk.length, active:students.filter(s=>s.isActiveThisWeek).length, inactive:students.filter(s=>!s.isActiveThisWeek).length }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:900, color:TEXT, margin:0 }}>Students</h2>
          <p style={{ fontSize:13, color:DIM, marginTop:3 }}>Manage and monitor all students in your school.</p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:1, minWidth:180, position:'relative' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }}><circle cx="6" cy="6" r="4" stroke={DIM} strokeWidth="1.5"/><path d="M10 10l2 2" stroke={DIM} strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search students by name…"
            style={{ width:'100%', padding:'9px 12px 9px 30px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:13, color:TEXT, background:CARD, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}/>
        </div>
        <div style={{ display:'flex', background:NAVY, borderRadius:11, padding:3, gap:2 }}>
          {[{id:'all',l:`All (${counts.all})`},{id:'at_risk',l:`At risk (${counts.at_risk})`},{id:'active',l:`Active (${counts.active})`},{id:'inactive',l:`Inactive (${counts.inactive})`}].map(f=>(
            <button key={f.id} onClick={()=>{setFilter(f.id);setPage(1)}} style={{ padding:'7px 13px', borderRadius:8, fontSize:11, fontWeight:700, border:'none', cursor:'pointer', background:filter===f.id?CARD:'transparent', color:filter===f.id?TEXT:'rgba(255,255,255,.6)', transition:'all .13s' }}>
              {f.l}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:'auto' }}>
          <span style={{ fontSize:11, color:DIM }}>Sort by:</span>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:'7px 10px', borderRadius:8, border:`1px solid ${BORDER}`, fontSize:12, color:TEXT, background:CARD, cursor:'pointer', fontFamily:'inherit' }}>
            <option value="name">Name</option>
            <option value="accuracy">Accuracy</option>
            <option value="streak">Streak</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Card>
        {/* Header */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 90px 80px 70px', gap:8, padding:'10px 18px', borderBottom:`1px solid ${BORDER}`, background:BG }}>
          {['Student','Class','Accuracy','Streak','Questions','Status'].map(h=>(
            <span key={h} style={{ fontSize:10, fontWeight:800, color:FAINT, letterSpacing:'.07em', textAlign:h==='Student'?'left':'center', textTransform:'uppercase' }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {!shown.length ? (
          <div style={{ padding:'48px', textAlign:'center' }}>
            <p style={{ fontSize:28, marginBottom:8 }}>👥</p>
            <p style={{ fontSize:13, color:DIM }}>No students match</p>
          </div>
        ) : shown.map((s,i) => {
          const tier = segMap[s.id]
          const sc   = s.isActiveThisWeek ? statusColor('Active') : atRisk.includes(s.id) ? statusColor('At risk') : statusColor('Inactive')
          const statusLabel = s.isActiveThisWeek ? 'Active' : atRisk.includes(s.id) ? 'At risk' : 'Inactive'
          return (
            <div key={s.id} style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 90px 80px 70px', gap:8, padding:'12px 18px', borderBottom:i<shown.length-1?`1px solid ${BG}`:'none', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                {avatar(s.full_name, 34)}
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:TEXT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.full_name}</p>
                  {tier && <p style={{ fontSize:10, color:{dropped:RED,inactive:DIM,struggling:AMBER}[tier] }}>{tierLabel[tier]}</p>}
                </div>
              </div>
              <p style={{ fontSize:12, color:DIM, textAlign:'center' }}>{s.school_class??'—'}</p>
              <p style={{ fontSize:13, fontWeight:800, color:pctColor(s.accuracy).fg, textAlign:'center' }}>{pct(s.accuracy)}</p>
              <p style={{ fontSize:12, color:s.currentStreak>0?'#ea580c':DIM, textAlign:'center' }}>{s.currentStreak>0?`${s.currentStreak}d 🔥`:'—'}</p>
              <p style={{ fontSize:12, fontWeight:700, color:SEC, textAlign:'center' }}>{s.total??0}</p>
              <div style={{ display:'flex', justifyContent:'center' }}>
                <Badge color={sc.fg} bg={sc.bg} border={sc.border} dot>{statusLabel}</Badge>
              </div>
            </div>
          )
        })}
      </Card>

      {/* Pagination */}
      {pages>1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <p style={{ fontSize:12, color:DIM }}>Showing {(page-1)*PER+1}–{Math.min(page*PER,filtered.length)} of {filtered.length} students</p>
          <div style={{ display:'flex', gap:6 }}>
            {Array.from({length:pages},(_,i)=>i+1).slice(Math.max(0,page-3),page+2).map(p=>(
              <button key={p} onClick={()=>setPage(p)} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${p===page?BLUE:BORDER}`, background:p===page?BLUE:CARD, color:p===page?'#fff':DIM, fontSize:12, fontWeight:700, cursor:'pointer' }}>{p}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TOPICS TAB
// ─────────────────────────────────────────────────────────────────────────────
function TopicsTab({ subjectTopics }) {
  const [selected, setSelected] = useState('')
  const [search,   setSearch]   = useState('')
  const [sortBy,   setSortBy]   = useState('performance')

  useEffect(() => { if (subjectTopics.length&&!selected) setSelected(subjectTopics[0].subjectName) }, [subjectTopics,selected])

  const subject = subjectTopics.find(s=>s.subjectName===selected)
  const topics = (subject?.topics??[])
    .filter(t=>!search||t.topicName?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>sortBy==='performance'?(a.accuracy??0)-(b.accuracy??0):(a.topicName??'').localeCompare(b.topicName??''))

  if (!subjectTopics.length) return (
    <Card style={{ padding:'48px 24px', textAlign:'center' }}>
      <p style={{ fontSize:36, marginBottom:10 }}>📚</p>
      <p style={{ fontSize:14, fontWeight:800, color:TEXT, marginBottom:4 }}>No topic data yet</p>
      <p style={{ fontSize:12, color:DIM }}>Topic performance appears once students start practising</p>
    </Card>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:900, color:TEXT, margin:0 }}>Topics</h2>
          <p style={{ fontSize:13, color:DIM, marginTop:3 }}>Track performance across topics.</p>
        </div>
        <Btn variant="outline" small icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 9h10M3 6h6M5 3h2" stroke={DIM} strokeWidth="1.5" strokeLinecap="round"/></svg>}>Export report</Btn>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:6 }}>
          <button style={{ padding:'7px 14px', borderRadius:9, fontSize:12, fontWeight:700, border:`1px solid ${NAVY}`, background:NAVY, color:'#fff', cursor:'pointer' }}>All Subjects</button>
          {subjectTopics.slice(0,4).map(s=>(
            <button key={s.subjectName} onClick={()=>setSelected(s.subjectName)} style={{ padding:'7px 14px', borderRadius:9, fontSize:12, fontWeight:700, border:`1px solid ${selected===s.subjectName?NAVY:BORDER}`, background:selected===s.subjectName?NAVY:CARD, color:selected===s.subjectName?'#fff':DIM, cursor:'pointer', transition:'all .13s' }}>
              {s.subjectName.split(' ')[0]}
            </button>
          ))}
        </div>
        <div style={{ flex:1, minWidth:150 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search topics…"
            style={{ width:'100%', padding:'8px 12px', borderRadius:9, border:`1px solid ${BORDER}`, fontSize:12, color:TEXT, background:CARD, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:11, color:DIM }}>Sort by:</span>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:'7px 10px', borderRadius:8, border:`1px solid ${BORDER}`, fontSize:12, color:TEXT, background:CARD, fontFamily:'inherit', cursor:'pointer' }}>
            <option value="performance">Performance</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Table header */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 100px 80px 80px 100px', gap:8, padding:'9px 16px', background:BG, borderRadius:10, border:`1px solid ${BORDER}` }}>
        {['Topic','Subject','Avg Accuracy','Questions','Students','Trend'].map(h=>(
          <span key={h} style={{ fontSize:10, fontWeight:800, color:FAINT, letterSpacing:'.07em', textTransform:'uppercase', textAlign:h==='Topic'?'left':'center' }}>{h}</span>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {!topics.length ? (
          <Card style={{ padding:'32px', textAlign:'center' }}><p style={{ fontSize:12, color:DIM }}>No topics found</p></Card>
        ) : topics.map(t => {
          const c = pctColor(t.accuracy)
          const students = subject?.topics?.length ?? 0
          return (
            <Card key={t.topicId} style={{ padding:'13px 16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 100px 80px 80px 100px', gap:8, alignItems:'center' }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:TEXT }}>{t.topicName}</p>
                  <AccBar pct={t.accuracy} height={3} color={c.fg}/>
                </div>
                <p style={{ fontSize:12, color:DIM, textAlign:'center' }}>{selected}</p>
                <p style={{ fontSize:13, fontWeight:900, color:c.fg, textAlign:'center' }}>{pct(t.accuracy)}</p>
                <p style={{ fontSize:12, color:SEC, textAlign:'center' }}>{t.total??0}</p>
                <p style={{ fontSize:12, color:SEC, textAlign:'center' }}>{Math.min(t.total??0, students)}/{students}</p>
                <div style={{ display:'flex', justifyContent:'center' }}>
                  <Badge color={c.fg} bg={c.bg} border={c.border}>{c.label}</Badge>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      {topics.length>0 && <p style={{ fontSize:12, color:DIM }}>Showing 1 to {topics.length} of {topics.length} topics <button onClick={()=>{}} style={{ color:BLUE, background:'none', border:'none', cursor:'pointer', fontWeight:700, fontSize:12 }}>View all topics →</button></p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COHORT TAB  (with slots management)
// ─────────────────────────────────────────────────────────────────────────────
function CohortTab({ cohort, allCohorts, totalStudents, slotsTotal, slotsUsed, onCohortCreated, data }) {
  const [selected,     setSelected]     = useState(cohort?.id ?? null)
  const [copied,       setCopied]       = useState(false)
  const [showNew,      setShowNew]      = useState(!cohort)
  const [cohortName,   setCohortName]   = useState('')
  const [cohortSession,setCohortSession]= useState('')
  const [saving,       setSaving]       = useState(false)
  const [saveError,    setSaveError]    = useState(null)
  const [addingSlots,  setAddingSlots]  = useState(false)
  const [slotCount,    setSlotCount]    = useState(10)

  const selectedCohort = allCohorts.find(c=>c.id===selected) ?? cohort
  const slotsLeft = Math.max(0, (slotsTotal||0) - (slotsUsed||0))

  function copyCode() {
    if (!selectedCohort) return
    navigator.clipboard.writeText(selectedCohort.invite_code)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function handleCreate() {
    if (!cohortName.trim()) return
    setSaving(true); setSaveError(null)
    try {
      const res  = await fetch('/api/school/cohort', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:cohortName.trim(), session:cohortSession.trim() }) })
      const data = await res.json()
      if (data.error) { setSaveError(data.error); return }
      onCohortCreated?.(data.cohort)
      setShowNew(false); setSelected(data.cohort.id); setCohortName(''); setCohortSession('')
    } catch { setSaveError('Failed — try again') }
    finally { setSaving(false) }
  }

  const currentYear = new Date().getFullYear()
  const sessionSuggest = `${currentYear}/${currentYear+1}`

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:900, color:TEXT, margin:0 }}>Cohort Management</h2>
          <p style={{ fontSize:13, color:DIM, marginTop:3 }}>Create, manage and track your cohorts.</p>
        </div>
        <Btn variant="navy" onClick={() => setShowNew(o=>!o)} icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}>
          Create cohort
        </Btn>
      </div>

      <div className="cohort-layout" style={{ display:'grid', gridTemplateColumns:'260px 1fr 280px', gap:18, alignItems:'start' }}>

        {/* Left: Cohort list */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <p style={{ fontSize:10, fontWeight:800, color:FAINT, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:4 }}>Your cohorts</p>
          {allCohorts.length===0 && (
            <div style={{ padding:'24px 16px', textAlign:'center', background:CARD, borderRadius:14, border:`1px solid ${BORDER}` }}>
              <p style={{ fontSize:12, color:DIM }}>No cohorts yet. Create your first one.</p>
            </div>
          )}
          {allCohorts.map(c => (
            <button key={c.id} onClick={() => setSelected(c.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:14, border:`1.5px solid ${selected===c.id?BLUE:BORDER}`, background:selected===c.id?`${BLUE}06`:CARD, cursor:'pointer', textAlign:'left', transition:'all .13s' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:c.is_active?`${EMERALD}15`:`${DIM}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1L14 4.5V9C14 12.5 11.4 15.5 8 16C4.6 15.5 2 12.5 2 9V4.5L8 1Z" stroke={c.is_active?EMERALD:DIM} strokeWidth="1.5"/></svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:TEXT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
                  {c.is_active && <Badge color={EMERALD} bg="#ecfdf5" border="#a7f3d0">Active</Badge>}
                </div>
                <p style={{ fontSize:10, color:DIM }}>{c.session||'—'} · {c.is_active?totalStudents:0} students</p>
              </div>
            </button>
          ))}
        </div>

        {/* Centre: Cohort detail */}
        {selectedCohort ? (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Card>
              <div style={{ padding:'16px 20px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <p style={{ fontSize:17, fontWeight:900, color:TEXT }}>{selectedCohort.name}</p>
                  {selectedCohort.session && <p style={{ fontSize:12, color:DIM, marginTop:2 }}>{selectedCohort.session}</p>}
                </div>
                {selectedCohort.is_active && <Badge color={EMERALD} bg="#ecfdf5" border="#a7f3d0">Active</Badge>}
              </div>
              {/* Invite code */}
              <div style={{ padding:'20px', background:'linear-gradient(135deg,#ecfdf5,#f0fdfa)', textAlign:'center' }}>
                <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.12em', color:EMERALD, textTransform:'uppercase', marginBottom:10 }}>Student Invite Code</p>
                <div style={{ display:'inline-flex', alignItems:'center', gap:14, padding:'14px 22px', borderRadius:14, background:CARD, border:`1.5px solid ${EMERALD}30` }}>
                  <span style={{ fontSize:32, fontWeight:900, color:'#065f46', letterSpacing:'.4em', fontFamily:'monospace' }}>{selectedCohort.invite_code}</span>
                  <button onClick={copyCode} style={{ padding:'8px 14px', borderRadius:9, fontSize:11, fontWeight:800, cursor:'pointer', border:`1.5px solid #a7f3d0`, background:copied?'#ecfdf5':CARD, color:EMERALD, transition:'all .15s' }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p style={{ fontSize:11, color:'#059669', marginTop:10 }}>Students enter this code in ExamPrep → Profile → Connect your school</p>
              </div>
              <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <p style={{ fontSize:13, color:SEC }}>Created: <strong>{new Date(selectedCohort.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</strong></p>
                  <p style={{ fontSize:13, color:SEC }}>Subjects: <strong>{data?.summary?.subjectCount??'4 subjects'}</strong></p>
                  <p style={{ fontSize:13, color:SEC }}>Class teacher: <strong>{data?.adminName??'—'}</strong></p>
                </div>
                <Btn variant="emerald" small onClick={() => {
                  const link = `${window.location.origin}/join/${selectedCohort.invite_code}`
                  navigator.clipboard?.writeText(link)
                  alert('Invite link copied!')
                }}>📤 Share invite link</Btn>
              </div>
            </Card>

            {/* Create new form */}
            {showNew && (
              <Card style={{ padding:'20px' }}>
                <p style={{ fontSize:14, fontWeight:800, color:TEXT, marginBottom:4 }}>{cohort?'Create a new cohort':'Create your first cohort'}</p>
                <p style={{ fontSize:12, color:DIM, marginBottom:16 }}>{cohort?`This will archive "${cohort.name}"`:'Get an invite code for your students'}</p>
                {cohort && <div style={{ padding:'10px 14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, marginBottom:14 }}><p style={{ fontSize:12, fontWeight:700, color:AMBER }}>⚠ Archiving "{cohort.name}"</p><p style={{ fontSize:12, color:AMBER, marginTop:3 }}>Student data is kept — they'll need to rejoin the new cohort.</p></div>}
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div><FieldLabel>Cohort name *</FieldLabel><TextInput value={cohortName} onChange={e=>setCohortName(e.target.value)} placeholder="e.g. SS3 Science 2026" autoFocus/></div>
                  <div><FieldLabel hint={`e.g. ${sessionSuggest}`}>Academic session (optional)</FieldLabel><TextInput value={cohortSession} onChange={e=>setCohortSession(e.target.value)} placeholder={`e.g. ${sessionSuggest}`}/></div>
                  {saveError && <p style={{ fontSize:12, color:RED, padding:'10px 12px', background:'#fef2f2', borderRadius:8, border:'1px solid #fecaca' }}>{saveError}</p>}
                  <div style={{ display:'flex', gap:10 }}>
                    <Btn variant="outline" onClick={() => { setShowNew(false); setSaveError(null) }}>Cancel</Btn>
                    <Btn variant="emerald" onClick={handleCreate} loading={saving} disabled={!cohortName.trim()}>Create cohort →</Btn>
                  </div>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <Card style={{ padding:'48px 24px', textAlign:'center' }}>
            <p style={{ fontSize:28, marginBottom:12 }}>🏫</p>
            <p style={{ fontSize:14, fontWeight:800, color:TEXT, marginBottom:6 }}>No cohort selected</p>
            <Btn variant="navy" onClick={() => setShowNew(true)}>Create your first cohort →</Btn>
          </Card>
        )}

        {/* Right: Performance + Subscription */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {selectedCohort?.is_active && (
            <Card>
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${BORDER}` }}>
                <p style={{ fontSize:14, fontWeight:800, color:TEXT }}>Cohort performance</p>
              </div>
              <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:10 }}>
                <div>
                  <p style={{ fontSize:11, color:DIM, marginBottom:2 }}>Average accuracy</p>
                  <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                    <p style={{ fontSize:26, fontWeight:900, color:pctColor(data?.summary?.avgAccuracy).fg }}>{pct(data?.summary?.avgAccuracy)}</p>
                    <span style={{ fontSize:11, color:EMERALD }}>↑ 6% vs last 30 days</span>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize:11, color:DIM, marginBottom:4 }}>Active this week</p>
                  <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                    <p style={{ fontSize:20, fontWeight:900, color:TEXT }}>{data?.summary?.activeThisWeek||0}/{data?.summary?.totalStudents||0}</p>
                    <span style={{ fontSize:11, color:EMERALD }}>↑ 13% vs last week</span>
                  </div>
                </div>
                <BarChart data={data?.weeklyEngagement?.slice(-5)??[]}/>
              </div>
              <div style={{ padding:'12px 18px', borderTop:`1px solid ${BORDER}` }}>
                <button onClick={() => {}} style={{ fontSize:12, fontWeight:700, color:BLUE, background:'none', border:'none', cursor:'pointer', padding:0 }}>View cohort details →</button>
              </div>
            </Card>
          )}

          {/* Subscription / Slots */}
          <Card>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <p style={{ fontSize:14, fontWeight:800, color:TEXT }}>Student Slots</p>
              <Badge color={EMERALD} bg="#ecfdf5" border="#a7f3d0" dot>Active</Badge>
            </div>
            <div style={{ padding:'16px 18px' }}>
              <div style={{ display:'flex', justify:'space-between', marginBottom:10 }}>
                <div>
                  <p style={{ fontSize:11, color:DIM }}>Slots used</p>
                  <p style={{ fontSize:22, fontWeight:900, color:TEXT }}>{slotsUsed||0} <span style={{ fontSize:13, fontWeight:600, color:DIM }}>/ {slotsTotal||0}</span></p>
                </div>
                <div>
                  <p style={{ fontSize:11, color:DIM }}>Remaining</p>
                  <p style={{ fontSize:22, fontWeight:900, color:slotsLeft<=5?RED:EMERALD }}>{slotsLeft}</p>
                </div>
              </div>
              <div style={{ height:8, background:BG, borderRadius:99, border:`1px solid ${BORDER}`, overflow:'hidden', marginBottom:12 }}>
                <div style={{ height:'100%', width:`${Math.min(100,((slotsUsed||0)/(slotsTotal||1))*100)}%`, background:slotsLeft<=5?RED:BLUE, borderRadius:99, transition:'width .6s' }}/>
              </div>
              {slotsLeft<=5 && <p style={{ fontSize:11, color:RED, fontWeight:700, marginBottom:10 }}>⚠ Running low on slots. Add more to invite more students.</p>}
              <p style={{ fontSize:11, color:DIM, marginBottom:14 }}>Each slot = 1 student who can join your school. Students are counted when they join a cohort using your invite code.</p>
              <Btn variant="navy" onClick={() => setAddingSlots(true)}>+ Add more slots</Btn>
            </div>
            {addingSlots && (
              <div style={{ padding:'14px 18px', borderTop:`1px solid ${BORDER}`, background:BG }}>
                <p style={{ fontSize:13, fontWeight:700, color:TEXT, marginBottom:10 }}>Add slots</p>
                <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                  {[10,25,50,100].map(n=>(
                    <button key={n} onClick={() => setSlotCount(n)} style={{ flex:1, padding:'10px 0', borderRadius:10, fontSize:13, fontWeight:900, border:`2px solid ${slotCount===n?BLUE:BORDER}`, background:slotCount===n?`${BLUE}10`:CARD, color:slotCount===n?BLUE:DIM, cursor:'pointer' }}>{n}</button>
                  ))}
                </div>
                <p style={{ fontSize:12, color:DIM, marginBottom:12 }}>Adding {slotCount} slots. Contact support to complete purchase.</p>
                <div style={{ display:'flex', gap:8 }}>
                  <Btn variant="outline" small onClick={() => setAddingSlots(false)}>Cancel</Btn>
                  <Btn variant="navy" small onClick={() => { alert(`Request sent for ${slotCount} slots. Our team will contact you.`); setAddingSlots(false) }}>Request slots</Btn>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function ReportsTab({ schoolName }) {
  const [period,     setPeriod]     = useState('month')
  const [generating, setGenerating] = useState(null)

  const REPORTS = [
    { type:'management', label:'Performance Summary', sub:'Overview of student performance across all subjects.',   icon:'📊', color:BLUE   },
    { type:'subjects',   label:'Subject Analysis',    sub:'Detailed performance breakdown by subject.',              icon:'📚', color:EMERALD },
    { type:'topics',     label:'Topic Analysis',      sub:'Performance breakdown by topics and subtopics.',          icon:'📋', color:AMBER  },
    { type:'students',   label:'Student Progress',    sub:'Individual student progress and improvement.',            icon:'👥', color:NAVY   },
  ]

  async function generateReport(type) {
    setGenerating(type)
    try {
      const res  = await fetch(`/api/school/report?type=${type}&period=${period}`)
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:210mm;height:297mm;border:none;'
      document.body.appendChild(iframe)
      iframe.contentDocument.write(`<!DOCTYPE html><html><head><title>Report</title><style>body{font-family:sans-serif;padding:20mm;}</style></head><body><h1>${data.schoolName??schoolName}</h1></body></html>`)
      iframe.contentDocument.close()
      setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 2000) }, 500)
    } catch { alert('Failed to generate') } finally { setGenerating(null) }
  }

  const RECENT = [
    { name:'May 2025 – Performance Summary', type:'Performance Summary', period:'May 1–31, 2025', generated:'May 31, 2025' },
    { name:'SS3 Mathematics Analysis',       type:'Subject Analysis',    period:'May 1–31, 2025', generated:'May 31, 2025' },
    { name:'At Risk Students Report',        type:'Student Progress',    period:'May 1–31, 2025', generated:'May 30, 2025' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:900, color:TEXT, margin:0 }}>Reports</h2>
          <p style={{ fontSize:13, color:DIM, marginTop:3 }}>View and export performance reports.</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:12, color:DIM }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight:4 }}><rect x="1" y="2" width="10" height="9" rx="1.5" stroke={DIM} strokeWidth="1.3"/><path d="M4 1v2M8 1v2M1 5h10" stroke={DIM} strokeWidth="1.3" strokeLinecap="round"/></svg>
            May 1–May 31, 2025
          </span>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{ padding:'7px 12px', borderRadius:9, border:`1px solid ${BORDER}`, fontSize:12, color:TEXT, background:CARD, fontFamily:'inherit', cursor:'pointer' }}>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Report cards */}
      <div className="reports-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {REPORTS.map(r => (
          <Card key={r.type} style={{ padding:'20px' }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`${r.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, marginBottom:12 }}>{r.icon}</div>
            <p style={{ fontSize:13, fontWeight:800, color:TEXT, marginBottom:4 }}>{r.label}</p>
            <p style={{ fontSize:11, color:DIM, lineHeight:1.5, marginBottom:16 }}>{r.sub}</p>
            <button onClick={() => generateReport(r.type)} disabled={!!generating} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:r.color, background:'none', border:'none', cursor:'pointer', padding:0, opacity:generating?.5:1 }}>
              {generating===r.type?'Generating…':'View report →'}
            </button>
          </Card>
        ))}
      </div>

      {/* Recent reports */}
      <div>
        <p style={{ fontSize:14, fontWeight:800, color:TEXT, marginBottom:14 }}>Recent reports</p>
        <Card>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 140px 140px 100px 80px', gap:8, padding:'9px 18px', background:BG, borderBottom:`1px solid ${BORDER}` }}>
            {['Report Name','Type','Period','Generated','Actions'].map(h=>(
              <span key={h} style={{ fontSize:10, fontWeight:800, color:FAINT, letterSpacing:'.07em', textTransform:'uppercase' }}>{h}</span>
            ))}
          </div>
          {RECENT.map((r,i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 140px 140px 100px 80px', gap:8, padding:'13px 18px', borderBottom:i<RECENT.length-1?`1px solid ${BG}`:'none', alignItems:'center' }}>
              <p style={{ fontSize:13, fontWeight:600, color:TEXT }}>{r.name}</p>
              <p style={{ fontSize:12, color:DIM }}>{r.type}</p>
              <p style={{ fontSize:12, color:DIM }}>{r.period}</p>
              <p style={{ fontSize:12, color:DIM }}>{r.generated}</p>
              <button style={{ padding:'6px 12px', borderRadius:8, background:NAVY, color:'#fff', fontSize:11, fontWeight:700, border:'none', cursor:'pointer' }}>Download</button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOL INFO TAB
// ─────────────────────────────────────────────────────────────────────────────
function SchoolInfoTab({ school, subscription, onSaved }) {
  const [name,   setName]   = useState(school?.name    ?? '')
  const [city,   setCity]   = useState(school?.city    ?? '')
  const [state,  setState]  = useState(school?.state   ?? '')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState(null)

  const NIGERIAN_STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara']

  async function handleSave() {
    if (!name.trim()) { setError('School name is required'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/school/setup', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ schoolName:name.trim(), city:city.trim(), state }) })
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      setSaved(true); setTimeout(()=>setSaved(false),2500)
      onSaved?.({ name:name.trim(), city:city.trim(), state })
    } catch { setError('Failed to save') } finally { setSaving(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div>
        <h2 style={{ fontSize:20, fontWeight:900, color:TEXT, margin:0 }}>School Information</h2>
        <p style={{ fontSize:13, color:DIM, marginTop:3 }}>Manage your school details and settings.</p>
      </div>

      <div className="school-info-grid" style={{ display:'grid', gridTemplateColumns:'1fr 280px 260px', gap:18, alignItems:'start' }}>

        {/* School details */}
        <Card style={{ padding:'22px' }}>
          <p style={{ fontSize:14, fontWeight:800, color:TEXT, marginBottom:18 }}>School details</p>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px', background:BG, borderRadius:12, border:`1px solid ${BORDER}`, marginBottom:20 }}>
            <div style={{ width:48, height:48, borderRadius:13, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:14, fontWeight:900, color:'#FFB800' }}>{(name||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?'}</span>
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:TEXT }}>{name||'Your School'}</p>
              <p style={{ fontSize:12, color:DIM }}>Secondary School</p>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <FieldLabel>School name</FieldLabel>
              <TextInput value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. T.Tech Academy"/>
            </div>
            <div>
              <FieldLabel>Address</FieldLabel>
              <TextInput value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g. 123 Education Drive, Lagos"/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <FieldLabel>Phone</FieldLabel>
                <TextInput type="tel" value="" onChange={()=>{}} placeholder="+234 801 234 5678"/>
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <TextInput type="email" value="" onChange={()=>{}} placeholder="info@yourschool.edu.ng"/>
              </div>
            </div>
            <div>
              <FieldLabel>State</FieldLabel>
              <select value={state} onChange={e=>setState(e.target.value)} style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:13, color:state?TEXT:DIM, background:CARD, fontFamily:'inherit', boxSizing:'border-box' }}>
                <option value="">Select state</option>
                {NIGERIAN_STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {error && <p style={{ fontSize:12, color:RED, padding:'9px 12px', background:'#fef2f2', borderRadius:8, border:'1px solid #fecaca' }}>{error}</p>}
            {saved && <p style={{ fontSize:12, color:EMERALD, padding:'9px 12px', background:'#ecfdf5', borderRadius:8, border:'1px solid #a7f3d0' }}>✓ Saved successfully</p>}
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <Btn variant="navy" onClick={handleSave} loading={saving} disabled={!name.trim()}>Save changes</Btn>
            </div>
          </div>
        </Card>

        {/* Subscription */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Card style={{ padding:'20px' }}>
            <p style={{ fontSize:14, fontWeight:800, color:TEXT, marginBottom:16 }}>Subscription</p>
            <div style={{ display:'flex', align:'center', justifyContent:'space-between', marginBottom:8 }}>
              <p style={{ fontSize:14, fontWeight:800, color:TEXT }}>Premium Plan</p>
              <Badge color={EMERALD} bg="#ecfdf5" border="#a7f3d0">Active</Badge>
            </div>
            <p style={{ fontSize:12, color:DIM, marginBottom:14 }}>Next billing date<br/><strong style={{ color:TEXT }}>June 15, 2025</strong></p>
            <div style={{ display:'flex', flexDirection:'column', gap:6, padding:'12px', background:BG, borderRadius:10, border:`1px solid ${BORDER}`, marginBottom:16, fontSize:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:DIM }}>Students limit</span><span style={{ fontWeight:700, color:TEXT }}>{subscription?.slotsTotal||100} students</span></div>
              <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:DIM }}>Subjects</span><span style={{ fontWeight:700, color:TEXT }}>All subjects</span></div>
            </div>
            <Btn variant="navy" onClick={() => alert('Manage subscription — contact support')}>Manage subscription</Btn>
          </Card>

          <Card style={{ padding:'20px' }}>
            <p style={{ fontSize:14, fontWeight:800, color:TEXT, marginBottom:14 }}>School settings</p>
            {[
              { label:'General settings', sub:'Manage school preferences', icon:'⚙️' },
              { label:'Teachers', sub:'Manage teachers and permissions', icon:'👨‍🏫' },
              { label:'Billing & payments', sub:'Manage billing and payment methods', icon:'💳' },
            ].map((s,i,arr) => (
              <button key={s.label} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 0', borderBottom:i<arr.length-1?`1px solid ${BORDER}`:'none', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottomStyle:'solid', borderBottomColor:i<arr.length-1?BORDER:'transparent', borderBottomWidth:'1px' }}>
                <span style={{ fontSize:16 }}>{s.icon}</span>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:TEXT }}>{s.label}</p>
                  <p style={{ fontSize:11, color:DIM }}>{s.sub}</p>
                </div>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke={FAINT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ))}
            <button style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 0 0', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
              <span style={{ fontSize:16 }}>⚠️</span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:700, color:RED }}>Danger zone</p>
                <p style={{ fontSize:11, color:DIM }}>Delete school account</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke={FAINT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </Card>
        </div>

        {/* Contact + website */}
        <Card style={{ padding:'20px' }}>
          <p style={{ fontSize:14, fontWeight:800, color:TEXT, marginBottom:16 }}>Contact information</p>
          {[
            { label:'Address', value:'123 Education Drive, Lagos, Nigeria' },
            { label:'Phone',   value:'+234 801 234 5678' },
            { label:'Email',   value:'info@techacademy.edu.ng' },
            { label:'Website', value:'www.ttechacademy.edu.ng' },
          ].map(r=>(
            <div key={r.label} style={{ marginBottom:12 }}>
              <p style={{ fontSize:11, color:DIM, marginBottom:2 }}>{r.label}</p>
              <p style={{ fontSize:13, fontWeight:600, color:TEXT }}>{r.value}</p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ── Responsive CSS ─────────────────────────────────────────────────────────────
const CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  .stats-grid { grid-template-columns: repeat(4,1fr) !important; }
  .two-col    { grid-template-columns: 1fr 1fr !important; }
  .cohort-layout { grid-template-columns: 260px 1fr 280px !important; }
  .school-info-grid { grid-template-columns: 1fr 280px 260px !important; }
  .reports-grid { grid-template-columns: repeat(4,1fr) !important; }
  @media (max-width: 1100px) {
    .cohort-layout { grid-template-columns: 200px 1fr 240px !important; }
    .school-info-grid { grid-template-columns: 1fr 260px !important; }
    .school-info-grid > :last-child { display: none; }
  }
  @media (max-width: 900px) {
    .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
    .two-col    { grid-template-columns: 1fr !important; }
    .cohort-layout { grid-template-columns: 1fr !important; }
    .school-info-grid { grid-template-columns: 1fr !important; }
    .reports-grid { grid-template-columns: repeat(2,1fr) !important; }
  }
  @media (max-width: 640px) {
    .reports-grid { grid-template-columns: 1fr !important; }
  }
`

// ── Main page ──────────────────────────────────────────────────────────────────
// Need a ref to data inside CohortTab — pass it down via context-like prop trick
let _dashData = null

function DashboardInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const tab          = searchParams.get('tab') ?? 'overview'

  const supabase = createClient()
  const [data,      setData]      = useState(() => readDashCache())
  const [loading,   setLoading]   = useState(() => !readDashCache())
  const [error,     setError]     = useState(null)
  const [adminName, setAdminName] = useState('')

  const load = useCallback(async (force=false) => {
    if (!force) { const c=readDashCache(); if(c){setData(c);setLoading(false);return} }
    setLoading(true)
    const {data:{user}} = await supabase.auth.getUser()
    if (!user) { router.push('/school-login'); return }
    const [res, profileRes] = await Promise.all([
      fetch('/api/school/dashboard'),
      supabase.from('profiles').select('full_name').eq('id',user.id).single(),
    ])
    const d = await res.json()
    if (d.error) { setError(d.error); setLoading(false); return }
    writeDashCache(d); setData(d)
    setAdminName(profileRes.data?.full_name ?? '')
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { load() }, [load])

  function goTab(id) {
    const p = new URLSearchParams(searchParams); p.set('tab',id)
    router.push(`/school/dashboard?${p.toString()}`)
  }

  function handleCohortCreated(newCohort) {
    setData(prev => prev ? { ...prev, cohort:newCohort, allCohorts:[newCohort,...(prev.allCohorts??[])], summary:{...prev.summary,totalStudents:0} } : prev)
  }

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'100px 0', gap:14 }}>
      <Spinner size={38} color={EMERALD}/>
      <p style={{ fontSize:13, color:DIM }}>Loading school data…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'100px 16px', textAlign:'center' }}>
      <div>
        <p style={{ fontSize:36, marginBottom:12 }}>⚠️</p>
        <p style={{ fontSize:14, fontWeight:700, color:SEC, marginBottom:10 }}>{error}</p>
        <button onClick={()=>load(true)} style={{ color:EMERALD, fontSize:13, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Try again</button>
      </div>
    </div>
  )

  const { cohort, allCohorts, summary, students, subjectTopics, weeklyEngagement, atRisk, atRiskSegmented, school } = data
  // Make data available to CohortTab
  _dashData = { ...data, adminName }

  return (
    <>
      <style>{CSS}</style>
      {tab==='overview'  && <OverviewTab  data={{...data,adminName}} adminName={adminName} onTabChange={goTab}/>}
      {tab==='students'  && <StudentsTab  students={students} atRisk={atRisk} atRiskSegmented={atRiskSegmented??[]}/>}
      {tab==='topics'    && <TopicsTab    subjectTopics={subjectTopics}/>}
      {tab==='cohort'    && <CohortTab    cohort={cohort} allCohorts={allCohorts} totalStudents={summary.totalStudents} slotsTotal={school?.slots_total??100} slotsUsed={summary.totalStudents} onCohortCreated={handleCohortCreated} data={data}/>}
      {tab==='reports'   && <ReportsTab   schoolName={school?.name??''}/>}
      {tab==='settings'  && <SchoolInfoTab school={school} subscription={{ slotsTotal:school?.slots_total??100 }} onSaved={info => setData(d => d?{...d,school:{...d.school,...info}}:d)}/>}
    </>
  )
}

export default function SchoolDashboardPage() {
  return <Suspense fallback={null}><DashboardInner/></Suspense>
}
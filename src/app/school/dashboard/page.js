'use client'
// src/app/school/dashboard/page.js
// Implementation of school_dashboard_full.html design in Next.js
// Real data from /api/school/dashboard

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CACHE_KEY = 'ep_sdash_v3'
const CACHE_TTL = 2 * 60 * 1000
function readCache() { try { const c=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null'); return c&&Date.now()-c.ts<CACHE_TTL?c.d:null } catch { return null } }
function writeCache(d) { try { sessionStorage.setItem(CACHE_KEY,JSON.stringify({d,ts:Date.now()})) } catch {} }

function pct(n) { return n==null?'—':`${Math.round(n)}%` }
function initials(name='?') { return (name||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?' }
function getGreeting() { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening' }
function statusOf(s) {
  const d=s.daysSinceLastPractice??999
  if(d>=21) return {l:'Inactive',c:'#7a8aaa',bg:'#f4f7ff',border:'#e4eaf5'}
  if(d>=14) return {l:'Slipping',c:'#d97706',bg:'#FFFBEB',border:'#fde68a'}
  if(s.accuracy!=null&&s.accuracy<40) return {l:'Weak',c:'#dc2626',bg:'#FEF2F2',border:'#fecaca'}
  if(d<=7) return {l:'Active',c:'#059669',bg:'#ECFDF5',border:'#a7f3d0'}
  return {l:'Slipping',c:'#d97706',bg:'#FFFBEB',border:'#fde68a'}
}
function needsAttention(s) { const d=s.daysSinceLastPractice??999; return d>=14||(d<=7&&s.accuracy!=null&&s.accuracy<40) }
function perfCol(a) { return a>=70?'#059669':a>=45?'#d97706':'#dc2626' }
function perfBg(a)  { return a>=70?'#ECFDF5':a>=45?'#FFFBEB':'#FEF2F2' }
function perfLabel(a){ return a>=70?'Strong':a>=45?'Fair':'Weak' }
const SUBJ_ICON={'Mathematics':'📐','English Language':'📖','Use of English':'📖','Physics':'⚡','Chemistry':'⚗️','Biology':'🧬','Economics':'📊','Government':'🏛️','Geography':'🌍'}
const SUBJ_BG={'Mathematics':'#EBF1FE','English Language':'#ECFDF5','Use of English':'#ECFDF5','Physics':'#F5F3FF','Chemistry':'#ECFDF5','Biology':'#FEF2F2','Economics':'#FEF3C7'}
function sIcon(n){return SUBJ_ICON[n]||'📚'}
function sBg(n){return SUBJ_BG[n]||'#f4f7ff'}

const CSS=`
@keyframes spin{to{transform:rotate(360deg)}}
*{box-sizing:border-box}
.sdash{display:flex;min-height:100vh;background:#eef0f8;font-family:inherit}
.sd-sidebar{width:220px;background:#fff;flex-shrink:0;display:flex;flex-direction:column;border-right:1px solid #e8eaf2;position:fixed;top:0;left:0;bottom:0;z-index:40;overflow-y:auto}
.sd-brand{padding:20px 18px 16px;border-bottom:1px solid #f0f2f8;display:flex;align-items:center;gap:8px}
.sd-logo{width:32px;height:32px;border-radius:8px;background:#062A78;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#FFB800;flex-shrink:0}
.sd-nav{padding:12px 10px;flex:1;display:flex;flex-direction:column;gap:2px}
.sd-group{font-size:9px;font-weight:700;color:#b0bada;letter-spacing:.07em;text-transform:uppercase;padding:8px 8px 4px}
.nav-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:9px;cursor:pointer;border:none;background:transparent;width:100%;text-align:left;font-family:inherit;transition:background .12s;color:#7a8aaa;font-size:12px;font-weight:500}
.nav-item:hover{background:#f4f7ff;color:#3a4870}
.nav-item.active{background:#1264E5;color:#fff}
.sd-footer{padding:12px 10px;border-top:1px solid #f0f2f8;margin-top:auto}
.sd-school-btn{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;background:#f4f7ff;border:1px solid #e4eaf5;cursor:pointer;width:100%;text-align:left;font-family:inherit}
.sd-school-av{width:28px;height:28px;border-radius:7px;background:#062A78;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#FFB800;flex-shrink:0}
.sd-invite-btn{margin:8px 10px 0;padding:10px 12px;background:#1264E5;border-radius:9px;text-align:center;cursor:pointer;border:none;width:calc(100% - 20px);font-family:inherit}
.sd-main{flex:1;display:flex;flex-direction:column;min-width:0;margin-left:220px}
.sd-topbar{display:flex;align-items:center;justify-content:space-between;padding:18px 24px 0;gap:12px}
.sd-topbar-title{font-size:22px;font-weight:700;color:#071B49;letter-spacing:-.03em}
.sd-topbar-right{display:flex;align-items:center;gap:10px}
.sd-search{position:relative}
.sd-search input{padding:7px 12px 7px 32px;border-radius:20px;border:1px solid #e4eaf5;background:#fff;font-size:12px;color:#3a4870;outline:none;width:180px;font-family:inherit}
.sd-search-ico{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#b0bada;font-size:14px;pointer-events:none}
.sd-user{display:flex;align-items:center;gap:7px;padding:5px 10px 5px 5px;border-radius:20px;background:#fff;border:1px solid #e4eaf5}
.sd-user-av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#1264E5);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff}
.sd-content{padding:20px 24px;display:flex;flex-direction:column;gap:18px}
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.stat-card{background:#fff;border-radius:14px;padding:18px 16px;border:1px solid #f0f2f8}
.stat-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:12px}
.stat-val{font-size:24px;font-weight:700;color:#071B49;letter-spacing:-.03em;line-height:1}
.stat-label{font-size:11px;color:#7a8aaa;margin-top:4px;font-weight:500}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.panel{background:#fff;border-radius:14px;border:1px solid #f0f2f8;overflow:hidden}
.panel-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #f4f7ff}
.panel-title{font-size:13px;font-weight:700;color:#071B49}
.panel-sub{font-size:11px;color:#b0bada;margin-top:1px}
.view-btn{font-size:11px;font-weight:700;color:#1264E5;background:none;border:none;cursor:pointer;font-family:inherit;padding:0}
.bars{display:flex;align-items:flex-end;gap:6px;height:100px}
.bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
.bar-val{font-size:8px;font-weight:700;color:#b0bada}
.bar-rect{width:100%;border-radius:4px 4px 0 0}
.bar-label{font-size:8px;color:#b0bada;white-space:nowrap;text-align:center}
.subj-row{display:flex;align-items:center;gap:10px;padding:8px 18px}
.subj-icon{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
.subj-name{flex:1;font-size:12px;font-weight:600;color:#071B49}
.subj-bar-wrap{width:80px;height:5px;background:#f0f2f8;border-radius:99px;overflow:hidden}
.subj-bar{height:100%;border-radius:99px}
.subj-pct{font-size:11px;font-weight:700;min-width:30px;text-align:right}
.badge{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;white-space:nowrap}
.th-row{display:grid;gap:8px;padding:8px 18px;background:#f9faff;border-bottom:1px solid #f0f2f8}
.th{font-size:10px;font-weight:700;color:#b0bada;letter-spacing:.05em;text-transform:uppercase;text-align:center}
.st-row{display:grid;gap:8px;padding:10px 18px;border-bottom:1px solid #f9faff;align-items:center}
.st-row:last-child{border-bottom:none}
.st-av{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
.st-name{font-size:12px;font-weight:600;color:#071B49;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-class{font-size:10px;color:#b0bada}
.st-center{text-align:center;font-size:12px;color:#3a4870;font-weight:600}
.tab-btn{font-size:11px;font-weight:600;padding:5px 12px;border-radius:7px;border:none;cursor:pointer;font-family:inherit;transition:all .12s;background:#f4f7ff;color:#7a8aaa}
.tab-btn.active{background:#1264E5;color:#fff;font-weight:700}
.pill{font-size:10px;font-weight:700;padding:4px 11px;border-radius:99px;border:1.5px solid #e4eaf5;background:#fff;color:#7a8aaa;cursor:pointer;font-family:inherit;transition:all .12s;white-space:nowrap}
.pill.active{border-color:#1264E5;background:#EBF1FE;color:#1264E5}
.cohort-code{font-size:28px;font-weight:700;letter-spacing:.4em;font-family:monospace;color:#065f46}
.copy-btn{padding:7px 14px;border-radius:8px;background:#ecfdf5;border:1px solid #a7f3d0;color:#059669;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
.slots-bar-wrap{height:7px;background:#f0f2f8;border-radius:99px;overflow:hidden;margin:8px 0}
.slots-bar{height:100%;border-radius:99px}
.sd-mob-hdr{display:none;position:sticky;top:0;z-index:40;background:rgba(255,255,255,.97);backdrop-filter:blur(14px);border-bottom:1px solid #e4eaf5;padding:10px 16px;align-items:center;gap:10px}
.sd-mob-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:50;background:rgba(255,255,255,.97);border-top:1px solid #e4eaf5;box-shadow:0 -2px 16px rgba(6,42,120,.06);padding-bottom:env(safe-area-inset-bottom)}
.sd-mob-nav-row{display:flex}
.sd-mob-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 4px 8px;background:none;border:none;border-top:2.5px solid transparent;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}
.sd-mob-btn.active{border-top-color:#1264E5}
.sd-mob-ico{font-size:18px;line-height:1}
.sd-mob-lbl{font-size:9px;font-weight:600;color:#7a8aaa;text-transform:uppercase;letter-spacing:.04em}
.sd-mob-btn.active .sd-mob-lbl{color:#1264E5;font-weight:800}
@media(max-width:768px){
  .sd-sidebar{display:none!important}
  .sd-mob-hdr{display:flex!important}
  .sd-mob-nav{display:block!important}
  .sd-main{margin-left:0!important;padding-bottom:calc(64px + env(safe-area-inset-bottom))}
  .sd-topbar{display:none!important}
  .stat-grid{grid-template-columns:repeat(2,1fr)!important}
  .two-col{grid-template-columns:1fr!important}
  .sd-cohort-cols{grid-template-columns:1fr!important}
  .sd-settings-cols{grid-template-columns:1fr!important}
  .sd-settings-side{display:none!important}
  .sd-content{padding:14px}
}
@media(max-width:480px){.sd-content{padding:12px}}
`

const TABS=[
  {id:'overview',label:'Overview',icon:'📊'},
  {id:'students',label:'Students',icon:'👥'},
  {id:'performance',label:'Performance',icon:'📈'},
  {id:'cohort',label:'Cohort',icon:'🏫'},
  {id:'settings',label:'Settings',icon:'⚙️'},
]

// ── OverviewTab
function OverviewTab({data,adminName,goTab}){
  const {summary={},weeklyEngagement=[],subjectTopics=[],students=[]}=data
  const active=students.filter(s=>(s.daysSinceLastPractice??999)<=7)
  const engRate=summary.totalStudents>0?Math.round((active.length/summary.totalStudents)*100):0
  const attn=students.filter(needsAttention).slice(0,4)
  const top=[...students].filter(s=>s.accuracy!=null&&s.total>=5).sort((a,b)=>(b.accuracy??0)-(a.accuracy??0)).slice(0,4)
  const maxBar=Math.max(...(weeklyEngagement||[]).map(w=>w.active||0),1)
  const bars=(weeklyEngagement||[]).slice(-6)
  const RANK=['#FFB800','#94a3b8','#cd7f32','#7a8aaa']
  return(
    <div className="sd-content">
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:'#071B49',letterSpacing:'-.03em'}}>{getGreeting()}{adminName?`, ${adminName.split(' ')[0]}`:''}! 👋</div>
          <div style={{fontSize:13,color:'#7a8aaa',marginTop:4}}>{summary.totalStudents>0?`${active.length} of ${summary.totalStudents} students active this week.`:'Set up your cohort to start tracking.'}</div>
        </div>
        <button onClick={()=>goTab('cohort')} style={{display:'flex',alignItems:'center',gap:7,padding:'10px 18px',borderRadius:11,background:'#1264E5',color:'#fff',border:'none',fontSize:13,fontWeight:800,cursor:'pointer'}}>
          + Invite Students
        </button>
      </div>
      <div className="stat-grid">
        {[
          {label:'Total students',val:summary.totalStudents??0,ico:'👥',bg:'#EBF1FE'},
          {label:'Active this week',val:`${active.length} (${engRate}%)`,ico:'🔥',bg:'#FEF3C7'},
          {label:'Average accuracy',val:summary.avgAccuracy!=null?`${Math.round(summary.avgAccuracy)}%`:'—',ico:'🎯',bg:'#ECFDF5'},
          {label:'Questions this week',val:(summary.totalQuestionsThisWeek||0).toLocaleString(),ico:'✅',bg:'#F5F3FF'},
        ].map(c=>(
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{background:c.bg}}>{c.ico}</div>
            <div className="stat-val">{c.val}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Practice activity</div><div className="panel-sub">Active students per week</div></div>
            <span style={{fontSize:10,fontWeight:700,color:'#b0bada',textTransform:'uppercase',letterSpacing:'.08em'}}>Last 6 weeks</span>
          </div>
          <div style={{padding:'14px 18px 10px'}}>
            {bars.length?(
              <div className="bars">
                {bars.map((w,i)=>{
                  const h=Math.max(4,Math.round(((w.active||0)/maxBar)*96))
                  const last=i===bars.length-1
                  return(
                    <div key={i} className="bar-col">
                      <div className="bar-val" style={{color:last?'#1264E5':'#b0bada'}}>{w.active||0}</div>
                      <div className="bar-rect" style={{height:h,background:last?'#1264E5':'#D0DCF9'}}/>
                      <div className="bar-label" style={{color:last?'#1264E5':'#b0bada',fontWeight:last?700:400}}>{w.label}</div>
                    </div>
                  )
                })}
              </div>
            ):<div style={{height:100,display:'flex',alignItems:'center',justifyContent:'center',color:'#b0bada',fontSize:12}}>No activity data yet</div>}
            {summary.totalStudents>0&&<p style={{fontSize:11,color:engRate>=60?'#059669':engRate>=30?'#d97706':'#dc2626',fontWeight:700,marginTop:8}}>{engRate>=60?`↑ ${engRate}% of students practised this week.`:engRate>=30?`${engRate}% engagement — encourage more practice.`:`Only ${engRate}% active — students need a push.`}</p>}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Performance by subject</div><div className="panel-sub">Class average accuracy</div></div>
            <button className="view-btn" onClick={()=>goTab('performance')}>View report</button>
          </div>
          <div style={{padding:'10px 0'}}>
            {subjectTopics.length?subjectTopics.slice(0,5).map(s=>(
              <div key={s.subjectName} className="subj-row">
                <div className="subj-icon" style={{background:sBg(s.subjectName)}}>{sIcon(s.subjectName)}</div>
                <div className="subj-name">{s.subjectName}</div>
                <div className="subj-bar-wrap"><div className="subj-bar" style={{width:`${Math.min(100,s.accuracy??0)}%`,background:perfCol(s.accuracy)}}/></div>
                <div className="subj-pct" style={{color:perfCol(s.accuracy)}}>{pct(s.accuracy)}</div>
              </div>
            )):<div style={{padding:'24px',textAlign:'center',color:'#b0bada',fontSize:12}}>No practice data yet</div>}
          </div>
        </div>
      </div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Needs attention</div><div className="panel-sub">{attn.length} student{attn.length!==1?'s':''} flagged</div></div>
            {attn.length>0&&<button className="view-btn" onClick={()=>goTab('students')}>View all →</button>}
          </div>
          {!attn.length?(
            <div style={{padding:'32px 18px',textAlign:'center'}}><div style={{fontSize:28,marginBottom:8}}>✅</div><div style={{fontSize:12,color:'#7a8aaa'}}>All students active in the last two weeks.</div></div>
          ):attn.map((s,i)=>{
            const d=s.daysSinceLastPractice??999
            const reason=d>=14?`No practice in ${d} days`:`Low accuracy (${pct(s.accuracy)})`
            const rc=statusOf(s)
            return(
              <div key={s.id} className="st-row" style={{gridTemplateColumns:'1fr auto auto',borderBottom:i<attn.length-1?'1px solid #f9faff':'none'}}>
                <div style={{display:'flex',alignItems:'center',gap:9}}>
                  <div className="st-av" style={{background:rc.c}}>{initials(s.full_name)}</div>
                  <div><div className="st-name">{s.full_name}</div><div className="st-class">{reason}</div></div>
                </div>
                <div style={{fontSize:12,color:'#7a8aaa'}}>{s.accuracy!=null?pct(s.accuracy):'—'}</div>
                <span className="badge" style={{background:rc.bg,color:rc.c,border:`1px solid ${rc.border}`}}>{rc.l}</span>
              </div>
            )
          })}
        </div>
        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Top performers</div><div className="panel-sub">By accuracy · 5+ questions</div></div>
            <button className="view-btn" onClick={()=>goTab('students')}>View leaderboard →</button>
          </div>
          {!top.length?(
            <div style={{padding:'32px 18px',textAlign:'center',color:'#b0bada',fontSize:12}}>Students need 5+ questions to appear here.</div>
          ):top.map((s,i)=>(
            <div key={s.id} className="st-row" style={{gridTemplateColumns:'24px 1fr auto auto',borderBottom:i<top.length-1?'1px solid #f9faff':'none'}}>
              <span style={{fontSize:13,fontWeight:700,color:RANK[i]||'#7a8aaa'}}>{i+1}</span>
              <div style={{display:'flex',alignItems:'center',gap:9}}>
                <div className="st-av" style={{background:'#1264E5'}}>{initials(s.full_name)}</div>
                <div><div className="st-name">{s.full_name}</div><div className="st-class">{s.total} questions</div></div>
              </div>
              <span style={{fontSize:12,color:'#d97706',fontWeight:700}}>{s.currentStreak>0?`${s.currentStreak}d 🔥`:''}</span>
              <span style={{fontSize:14,fontWeight:700,color:perfCol(s.accuracy)}}>{pct(s.accuracy)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── StudentsTab
function StudentsTab({students=[],cohortName=''}){
  const [filter,setFilter]=useState('all')
  const [search,setSearch]=useState('')
  const [sort,setSort]=useState('name')
  const [page,setPage]=useState(1)
  const PER=8
  const lastLabel=d=>d==null?'—':d===0?'Today':d===1?'Yesterday':`${d}d ago`
  const counts={all:students.length,active:students.filter(s=>(s.daysSinceLastPractice??999)<=7).length,slipping:students.filter(s=>{const d=s.daysSinceLastPractice??999;return d>=8&&d<21}).length,inactive:students.filter(s=>(s.daysSinceLastPractice??999)>=21).length,attention:students.filter(needsAttention).length}
  let list=[...students]
  if(filter==='active') list=list.filter(s=>(s.daysSinceLastPractice??999)<=7)
  if(filter==='slipping') list=list.filter(s=>{const d=s.daysSinceLastPractice??999;return d>=8&&d<21})
  if(filter==='inactive') list=list.filter(s=>(s.daysSinceLastPractice??999)>=21)
  if(filter==='attention') list=list.filter(needsAttention)
  if(search) list=list.filter(s=>(s.full_name||'').toLowerCase().includes(search.toLowerCase()))
  if(sort==='accuracy') list.sort((a,b)=>(b.accuracy??-1)-(a.accuracy??-1))
  else if(sort==='questions') list.sort((a,b)=>(b.total??0)-(a.total??0))
  else list.sort((a,b)=>(a.full_name||'').localeCompare(b.full_name||''))
  const pages=Math.max(1,Math.ceil(list.length/PER))
  const shown=list.slice((page-1)*PER,page*PER)
  const FILTERS=[{id:'all',l:`All (${counts.all})`},{id:'active',l:`Active (${counts.active})`},{id:'slipping',l:`Slipping (${counts.slipping})`},{id:'inactive',l:`Inactive (${counts.inactive})`},{id:'attention',l:`⚠ Attention (${counts.attention})`}]
  return(
    <div className="sd-content">
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div><div style={{fontSize:18,fontWeight:700,color:'#071B49',letterSpacing:'-.02em'}}>Students</div><div style={{fontSize:12,color:'#7a8aaa',marginTop:2}}>{students.length} students{cohortName?` · ${cohortName}`:''}</div></div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{position:'relative'}}>
            <span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'#b0bada',fontSize:13}}>🔍</span>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search…" style={{padding:'7px 10px 7px 28px',borderRadius:9,border:'1px solid #e4eaf5',background:'#fff',fontSize:12,outline:'none',fontFamily:'inherit',width:160}}/>
          </div>
          <select value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}} style={{padding:'7px 10px',borderRadius:9,border:'1px solid #e4eaf5',background:'#fff',fontSize:12,color:'#3a4870',outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
            <option value="name">Sort: Name</option><option value="accuracy">Sort: Accuracy</option><option value="questions">Sort: Questions</option>
          </select>
        </div>
      </div>
      <div style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:4,scrollbarWidth:'none'}}>
        {FILTERS.map(f=><button key={f.id} className={`pill${filter===f.id?' active':''}`} onClick={()=>{setFilter(f.id);setPage(1)}}>{f.l}</button>)}
      </div>
      <div className="panel">
        <div className="th-row" style={{gridTemplateColumns:'1fr 80px 80px 90px 70px'}}>
          <div className="th" style={{textAlign:'left'}}>Student</div>
          <div className="th">Accuracy</div><div className="th">Questions</div><div className="th">Last active</div><div className="th">Status</div>
        </div>
        {!shown.length?<div style={{padding:'48px',textAlign:'center',color:'#b0bada',fontSize:12}}>No students match</div>:shown.map((s,i)=>{
          const st=statusOf(s)
          return(
            <div key={s.id} className="st-row" style={{gridTemplateColumns:'1fr 80px 80px 90px 70px',borderBottom:i<shown.length-1?'1px solid #f9faff':'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:9,minWidth:0}}>
                <div className="st-av" style={{background:'#1264E5'}}>{initials(s.full_name)}</div>
                <div style={{minWidth:0}}><div className="st-name">{s.full_name}</div>{s.school_class&&<div className="st-class">{s.school_class}</div>}</div>
              </div>
              <div className="st-center" style={{color:s.accuracy!=null?perfCol(s.accuracy):'#7a8aaa'}}>{pct(s.accuracy)}</div>
              <div className="st-center">{(s.total||0).toLocaleString()}</div>
              <div className="st-center" style={{fontSize:11}}>{lastLabel(s.daysSinceLastPractice)}</div>
              <div style={{display:'flex',justifyContent:'center'}}><span className="badge" style={{background:st.bg,color:st.c,border:`1px solid ${st.border}`}}>{st.l}</span></div>
            </div>
          )
        })}
      </div>
      {pages>1&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:11,color:'#7a8aaa'}}>Showing {(page-1)*PER+1}–{Math.min(page*PER,list.length)} of {list.length}</span>
        <div style={{display:'flex',gap:5}}>{Array.from({length:pages},(_,i)=>i+1).slice(Math.max(0,page-3),page+2).map(p=><button key={p} onClick={()=>setPage(p)} style={{width:28,height:28,borderRadius:7,border:`1px solid ${p===page?'#1264E5':'#e4eaf5'}`,background:p===page?'#1264E5':'#fff',color:p===page?'#fff':'#7a8aaa',fontSize:11,fontWeight:700,cursor:'pointer'}}>{p}</button>)}</div>
      </div>}
    </div>
  )
}

// ── PerformanceTab
function PerformanceTab({subjectTopics=[]}){
  const [activeSubj,setActiveSubj]=useState(null)
  const [topicSort,setTopicSort]=useState('worst')
  useEffect(()=>{if(subjectTopics.length&&!activeSubj)setActiveSubj(subjectTopics[0].subjectName)},[subjectTopics])
  const subject=subjectTopics.find(s=>s.subjectName===activeSubj)
  let topics=[...(subject?.topics||[])]
  if(topicSort==='best') topics.sort((a,b)=>(b.accuracy??0)-(a.accuracy??0))
  else if(topicSort==='name') topics.sort((a,b)=>(a.topicName||'').localeCompare(b.topicName||''))
  else topics.sort((a,b)=>(a.accuracy??0)-(b.accuracy??0))
  const strong=(subject?.topics||[]).filter(t=>t.accuracy!=null&&t.accuracy>=70).sort((a,b)=>b.accuracy-a.accuracy)
  const weak=(subject?.topics||[]).filter(t=>t.accuracy!=null&&t.accuracy<50).sort((a,b)=>a.accuracy-b.accuracy)
  if(!subjectTopics.length) return<div className="sd-content"><div className="panel" style={{padding:'48px 24px',textAlign:'center'}}><div style={{fontSize:40,marginBottom:12}}>📊</div><div style={{fontSize:14,fontWeight:700,color:'#071B49',marginBottom:6}}>No performance data yet</div><div style={{fontSize:12,color:'#7a8aaa'}}>Data appears once students start practising.</div></div></div>
  return(
    <div className="sd-content">
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div><div style={{fontSize:18,fontWeight:700,color:'#071B49',letterSpacing:'-.02em'}}>Performance</div><div style={{fontSize:12,color:'#7a8aaa',marginTop:2}}>Subject and topic breakdown</div></div>
      </div>
      <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4,scrollbarWidth:'none'}}>
        {subjectTopics.map(s=><button key={s.subjectName} className={`tab-btn${activeSubj===s.subjectName?' active':''}`} onClick={()=>setActiveSubj(s.subjectName)} style={{whiteSpace:'nowrap'}}>{sIcon(s.subjectName)} {s.subjectName.replace('English Language','English').replace('Further Mathematics','Further Maths')} — {pct(s.accuracy)}</button>)}
      </div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><div className="panel-title">💪 Strong topics <span style={{fontSize:11,color:'#059669',fontWeight:700}}>&nbsp;{strong.length} topics ≥ 70%</span></div></div>
          <div style={{padding:'8px 0'}}>
            {!strong.length?<div style={{padding:'24px 18px',textAlign:'center',color:'#b0bada',fontSize:12}}>No topics at 70%+ yet</div>:strong.slice(0,4).map((t,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 18px',borderBottom:i<3?'1px solid #f9faff':'none'}}>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,color:'#071B49',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.topicName}</div><div style={{height:4,background:'#f0f2f8',borderRadius:99,marginTop:4,overflow:'hidden'}}><div style={{height:'100%',width:`${t.accuracy}%`,background:'#059669',borderRadius:99}}/></div></div>
                <span style={{fontSize:12,fontWeight:700,color:'#059669',flexShrink:0}}>{t.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><div className="panel-title">⚠️ Needs work <span style={{fontSize:11,color:'#dc2626',fontWeight:700}}>&nbsp;{weak.length} topics below 50%</span></div></div>
          <div style={{padding:'8px 0'}}>
            {!weak.length?<div style={{padding:'24px 18px',textAlign:'center',color:'#b0bada',fontSize:12}}>No topics below 50%. Great!</div>:weak.slice(0,4).map((t,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 18px',borderBottom:i<3?'1px solid #f9faff':'none'}}>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,color:'#071B49',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.topicName}</div><div style={{height:4,background:'#f0f2f8',borderRadius:99,marginTop:4,overflow:'hidden'}}><div style={{height:'100%',width:`${t.accuracy}%`,background:'#dc2626',borderRadius:99}}/></div></div>
                <span style={{fontSize:12,fontWeight:700,color:'#dc2626',flexShrink:0}}>{t.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">All topics — {activeSubj}</div>
          <select value={topicSort} onChange={e=>setTopicSort(e.target.value)} style={{padding:'5px 8px',borderRadius:7,border:'1px solid #e4eaf5',fontSize:11,color:'#3a4870',outline:'none',fontFamily:'inherit'}}>
            <option value="worst">Weakest first</option><option value="best">Strongest first</option><option value="name">A → Z</option>
          </select>
        </div>
        <div className="th-row" style={{gridTemplateColumns:'1fr 90px 80px 80px'}}>
          <div className="th" style={{textAlign:'left'}}>Topic</div><div className="th">Accuracy</div><div className="th">Questions</div><div className="th">Status</div>
        </div>
        {!topics.length?<div style={{padding:'32px',textAlign:'center',color:'#b0bada',fontSize:12}}>No topics found</div>:topics.map((t,i)=>(
          <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 90px 80px 80px',gap:8,padding:'10px 18px',borderBottom:i<topics.length-1?'1px solid #f9faff':'none',alignItems:'center'}}>
            <div><div style={{fontSize:12,color:'#071B49',fontWeight:600}}>{t.topicName}</div><div style={{height:3,background:'#f0f2f8',borderRadius:99,marginTop:4,overflow:'hidden'}}><div style={{height:'100%',width:`${t.accuracy??0}%`,background:perfCol(t.accuracy),borderRadius:99}}/></div></div>
            <div style={{textAlign:'center',fontSize:12,fontWeight:700,color:perfCol(t.accuracy)}}>{pct(t.accuracy)}</div>
            <div style={{textAlign:'center',fontSize:12,color:'#3a4870'}}>{t.total??0}</div>
            <div style={{display:'flex',justifyContent:'center'}}><span className="badge" style={{background:perfBg(t.accuracy),color:perfCol(t.accuracy)}}>{perfLabel(t.accuracy)}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── CohortTab
function CohortTab({cohort,allCohorts=[],totalStudents=0,slotsTotal=0,slotsUsed=0,onCohortCreated}){
  const [selected,setSelected]=useState(cohort?.id??null)
  const [showCreate,setShowCreate]=useState(!cohort)
  const [cohortName,setCohortName]=useState('')
  const [cohortSess,setCohortSess]=useState('')
  const [saving,setSaving]=useState(false)
  const [saveErr,setSaveErr]=useState(null)
  const [codeCopied,setCodeCopied]=useState(false)
  const [linkCopied,setLinkCopied]=useState(false)
  const [msgCopied,setMsgCopied]=useState(false)
  const sel=allCohorts.find(c=>c.id===selected)??cohort
  const slotsLeft=Math.max(0,(slotsTotal||0)-(slotsUsed||0))
  const slotsP=slotsTotal>0?Math.round((slotsUsed/slotsTotal)*100):0
  const inviteLink=sel?`${typeof window!=='undefined'?window.location.origin:''}/join/${sel.invite_code}`:''
  function copyCode(){navigator.clipboard?.writeText(sel?.invite_code||'');setCodeCopied(true);setTimeout(()=>setCodeCopied(false),2000)}
  function copyLink(){navigator.clipboard?.writeText(inviteLink);setLinkCopied(true);setTimeout(()=>setLinkCopied(false),2000)}
  function shareMsg(){
    const msg=`📚 Join our ExamPrep school!\n\nHi! Your school has set up an ExamPrep study group. Practice WAEC & JAMB questions, track your progress, and compete with classmates.\n\n👉 Join here: ${inviteLink}\nOr enter code: ${sel?.invite_code}\n\nGo to ExamPrep → Profile → Connect your school → Enter code`
    if(typeof navigator!=='undefined'&&navigator.share){navigator.share({text:msg}).catch(()=>{});return}
    navigator.clipboard?.writeText(msg);setMsgCopied(true);setTimeout(()=>setMsgCopied(false),2500)
  }
  async function handleCreate(){
    if(!cohortName.trim())return
    setSaving(true);setSaveErr(null)
    try{
      const res=await fetch('/api/school/cohort',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:cohortName.trim(),session:cohortSess.trim()})})
      const d=await res.json()
      if(d.error){setSaveErr(d.error);return}
      onCohortCreated?.(d.cohort);setShowCreate(false);setSelected(d.cohort.id);setCohortName('');setCohortSess('')
    }catch{setSaveErr('Failed — try again')}finally{setSaving(false)}
  }
  const yr=new Date().getFullYear()
  return(
    <div className="sd-content">
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div><div style={{fontSize:18,fontWeight:700,color:'#071B49',letterSpacing:'-.02em'}}>Cohort & Invite</div><div style={{fontSize:12,color:'#7a8aaa',marginTop:2}}>Create and manage your student cohorts</div></div>
        <button onClick={()=>setShowCreate(o=>!o)} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:10,background:'#062A78',color:'#fff',border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>+ {showCreate?'Cancel':'New cohort'}</button>
      </div>
      <div className="sd-cohort-cols" style={{display:'grid',gridTemplateColumns:'180px 1fr 220px',gap:14,alignItems:'start'}}>
        <div>
          <div style={{fontSize:9,fontWeight:700,color:'#b0bada',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10}}>Your cohorts</div>
          {!allCohorts.length?<div className="panel" style={{padding:'20px 14px',textAlign:'center'}}><div style={{fontSize:12,color:'#7a8aaa',marginBottom:10}}>No cohorts yet.</div><button onClick={()=>setShowCreate(true)} style={{padding:'7px 14px',borderRadius:8,background:'#062A78',color:'#fff',border:'none',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Create first →</button></div>:allCohorts.map(c=>(
            <div key={c.id} onClick={()=>{setSelected(c.id);setShowCreate(false)}} style={{padding:'10px 12px',borderRadius:11,border:`1.5px solid ${selected===c.id?'#1264E5':'#e4eaf5'}`,background:selected===c.id?'#EBF1FE':'#fff',cursor:'pointer',marginBottom:6}}>
              <div style={{fontSize:12,fontWeight:700,color:'#071B49'}}>{c.name}</div>
              <div style={{fontSize:10,color:'#7a8aaa',marginTop:2}}>{c.session||'—'} · {c.is_active?totalStudents:0} students</div>
              {c.is_active&&<span className="badge" style={{background:'#ECFDF5',color:'#059669',marginTop:5,display:'inline-flex'}}>Active</span>}
            </div>
          ))}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {showCreate&&<div className="panel" style={{padding:22}}>
            <div style={{fontSize:15,fontWeight:700,color:'#071B49',marginBottom:4}}>{cohort?'Create a new cohort':'Create your first cohort'}</div>
            <div style={{fontSize:12,color:'#7a8aaa',marginBottom:18}}>{cohort?'Creating a new cohort archives the current one.':'You\'ll get an invite code to share with students.'}</div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><label style={{fontSize:11,fontWeight:700,color:'#071B49',display:'block',marginBottom:5}}>Cohort name *</label><input value={cohortName} onChange={e=>setCohortName(e.target.value)} placeholder="e.g. SS3 Science 2026/2027" autoFocus style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e4eaf5',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/></div>
              <div><label style={{fontSize:11,fontWeight:700,color:'#071B49',display:'block',marginBottom:5}}>Academic session <span style={{fontWeight:400,color:'#b0bada'}}>(optional)</span></label><input value={cohortSess} onChange={e=>setCohortSess(e.target.value)} placeholder={`e.g. ${yr}/${yr+1}`} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e4eaf5',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/></div>
              {saveErr&&<div style={{fontSize:12,color:'#dc2626',padding:'9px 12px',background:'#fef2f2',borderRadius:8,border:'1px solid #fecaca'}}>{saveErr}</div>}
              <div style={{display:'flex',gap:10}}>
                {cohort&&<button onClick={()=>setShowCreate(false)} style={{padding:'9px 16px',borderRadius:9,border:'1px solid #e4eaf5',background:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',color:'#7a8aaa'}}>Cancel</button>}
                <button onClick={handleCreate} disabled={saving||!cohortName.trim()} style={{flex:1,padding:'9px 16px',borderRadius:9,background:saving||!cohortName.trim()?'#e2e8f0':'#059669',color:saving||!cohortName.trim()?'#7a8aaa':'#fff',border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{saving?'Creating…':'Create cohort →'}</button>
              </div>
            </div>
          </div>}
          {sel&&!showCreate&&<div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">{sel.name}</div><div className="panel-sub">{sel.session||'Active cohort'} · {totalStudents} students joined</div></div>
              {sel.is_active&&<span className="badge" style={{background:'#ECFDF5',color:'#059669'}}>Active</span>}
            </div>
            <div style={{padding:24,background:'linear-gradient(135deg,#ECFDF5,#F0FDF4)',textAlign:'center',borderBottom:'1px solid #e4eaf5'}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:'.14em',color:'#059669',textTransform:'uppercase',marginBottom:12}}>Student invite code</div>
              <div style={{display:'inline-flex',alignItems:'center',gap:14,padding:'14px 24px',borderRadius:14,background:'#fff',border:'2px solid rgba(5,150,105,.2)'}}>
                <div className="cohort-code">{sel.invite_code}</div>
                <button className="copy-btn" onClick={copyCode} style={codeCopied?{background:'#059669',color:'#fff'}:{}}>{codeCopied?'Copied! ✓':'Copy code'}</button>
              </div>
              <div style={{fontSize:11,color:'#059669',marginTop:10}}>Students: ExamPrep → Profile → Connect your school → Enter code</div>
            </div>
            <div style={{padding:'16px 20px'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#071B49',marginBottom:10}}>Share with students</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button onClick={shareMsg} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:10,background:'#062A78',color:'#fff',border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>📤 {msgCopied?'Copied! ✓':'Share invite message'}</button>
                <button onClick={copyLink} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:10,background:'#f4f7ff',color:'#3a4870',border:'1px solid #e4eaf5',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>🔗 {linkCopied?'Copied! ✓':'Copy invite link'}</button>
              </div>
              <div style={{fontSize:11,color:'#7a8aaa',marginTop:10,lineHeight:1.6}}>The invite message is ready to paste into WhatsApp or SMS — it includes the link and the code.</div>
            </div>
          </div>}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="panel">
            <div className="panel-head" style={{padding:'12px 16px'}}><div className="panel-title">Student slots</div><span className="badge" style={{background:'#ECFDF5',color:'#059669'}}>● Active</span></div>
            <div style={{padding:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:6}}>
                <div><div style={{fontSize:10,color:'#7a8aaa'}}>Used</div><div style={{fontSize:22,fontWeight:700,color:'#071B49'}}>{slotsUsed} <span style={{fontSize:13,fontWeight:500,color:'#7a8aaa'}}>/ {slotsTotal}</span></div></div>
                <div style={{textAlign:'right'}}><div style={{fontSize:10,color:'#7a8aaa'}}>Free</div><div style={{fontSize:22,fontWeight:700,color:slotsLeft<=5?'#dc2626':'#059669'}}>{slotsLeft}</div></div>
              </div>
              <div className="slots-bar-wrap"><div className="slots-bar" style={{width:`${slotsP}%`,background:slotsLeft<=5?'#dc2626':'#1264E5'}}/></div>
              {slotsLeft<=5&&<div style={{fontSize:11,color:'#dc2626',fontWeight:700,marginBottom:6}}>⚠ Running low on slots.</div>}
              <div style={{fontSize:11,color:'#7a8aaa',lineHeight:1.6,marginTop:6}}>Each slot = one student with full premium access.</div>
              <div style={{marginTop:12,padding:12,background:'#f4f7ff',borderRadius:10,border:'1px solid #e4eaf5'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#071B49',marginBottom:6}}>Need more slots?</div>
                <div style={{display:'flex',gap:6}}>
                  <a href="mailto:schools@examprep.ng" style={{flex:1,padding:'7px 0',borderRadius:8,background:'#062A78',color:'#fff',textDecoration:'none',fontSize:10,fontWeight:700,textAlign:'center'}}>✉ Email us</a>
                  <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer" style={{flex:1,padding:'7px 0',borderRadius:8,background:'#25D366',color:'#fff',textDecoration:'none',fontSize:10,fontWeight:700,textAlign:'center'}}>WhatsApp</a>
                </div>
              </div>
            </div>
          </div>
          <div className="panel" style={{padding:'14px 16px'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#071B49',marginBottom:10}}>How slots work</div>
            {[['🎟','Each slot covers one student.'],['📲','Students join via the invite code.'],['⭐','Joined students get full access.'],['➕','Contact us to add more slots.']].map(([ico,txt],i)=><div key={i} style={{display:'flex',gap:8,fontSize:11,color:'#7a8aaa',marginBottom:i<3?8:0}}><span>{ico}</span>{txt}</div>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SettingsTab
function SettingsTab({school,onSaved}){
  const [name,setName]=useState(school?.name??'')
  const [city,setCity]=useState(school?.city??'')
  const [state,setState]=useState(school?.state??'')
  const [saving,setSaving]=useState(false)
  const [saved,setSaved]=useState(false)
  const [error,setError]=useState(null)
  const STATES=['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara']
  async function handleSave(){
    if(!name.trim()){setError('School name is required');return}
    setSaving(true);setError(null)
    try{
      const res=await fetch('/api/school/setup',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({schoolName:name.trim(),city:city.trim(),state})})
      const d=await res.json()
      if(d.error){setError(d.error);return}
      setSaved(true);setTimeout(()=>setSaved(false),2500);onSaved?.({name:name.trim(),city:city.trim(),state})
    }catch{setError('Failed to save')}finally{setSaving(false)}
  }
  return(
    <div className="sd-content">
      <div style={{fontSize:18,fontWeight:700,color:'#071B49',letterSpacing:'-.02em'}}>Settings</div>
      <div className="sd-settings-cols" style={{display:'grid',gridTemplateColumns:'1fr 220px',gap:14}}>
        <div className="panel" style={{padding:22}}>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:12,background:'#f4f7ff',borderRadius:11,border:'1px solid #e4eaf5',marginBottom:18}}>
            <div style={{width:44,height:44,borderRadius:11,background:'#062A78',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#FFB800',flexShrink:0}}>{initials(name||'?')}</div>
            <div><div style={{fontSize:14,fontWeight:700,color:'#071B49'}}>{name||'Your School'}</div><div style={{fontSize:11,color:'#7a8aaa'}}>{city||'—'}{state?`, ${state}`:''}</div></div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={{fontSize:11,fontWeight:700,color:'#071B49',display:'block',marginBottom:5}}>School name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Excellence Academy" style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e4eaf5',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/></div>
            <div><label style={{fontSize:11,fontWeight:700,color:'#071B49',display:'block',marginBottom:5}}>Address</label><input value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g. 12 Awolowo Road, Lagos" style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e4eaf5',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/></div>
            <div><label style={{fontSize:11,fontWeight:700,color:'#071B49',display:'block',marginBottom:5}}>State</label><select value={state} onChange={e=>setState(e.target.value)} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e4eaf5',fontSize:13,color:state?'#071B49':'#b0bada',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}><option value="">Select state</option>{STATES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            {error&&<div style={{fontSize:12,color:'#dc2626',padding:'9px 12px',background:'#fef2f2',borderRadius:8,border:'1px solid #fecaca'}}>{error}</div>}
            {saved&&<div style={{fontSize:12,color:'#059669',padding:'9px 12px',background:'#ecfdf5',borderRadius:8,border:'1px solid #a7f3d0'}}>✓ Saved successfully</div>}
            <div style={{textAlign:'right'}}><button onClick={handleSave} disabled={saving} style={{padding:'9px 20px',borderRadius:9,background:saving?'#e2e8f0':'#062A78',color:saving?'#7a8aaa':'#fff',border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{saving?'Saving…':'Save changes'}</button></div>
          </div>
        </div>
        <div className="sd-settings-side" style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="panel" style={{padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:'#071B49',marginBottom:10}}>Support</div>
            <a href="mailto:schools@examprep.ng" style={{display:'flex',alignItems:'center',gap:7,padding:'9px 12px',borderRadius:9,background:'#f4f7ff',border:'1px solid #e4eaf5',textDecoration:'none',color:'#071B49',fontSize:12,fontWeight:600,marginBottom:7}}>✉ schools@examprep.ng</a>
            <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',gap:7,padding:'9px 12px',borderRadius:9,background:'#ECFDF5',border:'1px solid #a7f3d0',textDecoration:'none',color:'#059669',fontSize:12,fontWeight:600}}>WhatsApp support</a>
          </div>
          <div className="panel" style={{padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:'#dc2626',marginBottom:7}}>Danger zone</div>
            <div style={{fontSize:11,color:'#7a8aaa',marginBottom:10,lineHeight:1.5}}>Delete your school account permanently. This cannot be undone.</div>
            <button style={{padding:'7px 14px',borderRadius:8,background:'transparent',border:'1.5px solid #dc2626',color:'#dc2626',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Delete account</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page
function DashboardInner(){
  const router=useRouter()
  const searchParams=useSearchParams()
  const tab=searchParams.get('tab')?? 'overview'
  const supabase=createClient()
  const [data,setData]=useState(()=>readCache())
  const [loading,setLoading]=useState(()=>!readCache())
  const [error,setError]=useState(null)
  const [adminName,setAdminName]=useState('')
  const load=useCallback(async(force=false)=>{
    if(!force){const c=readCache();if(c){setData(c);setAdminName(c.adminName||'');setLoading(false);return}}
    setLoading(true)
    try{
      const {data:{user}}=await supabase.auth.getUser()
      if(!user){router.push('/school-login');return}
      const [dashRes,profRes]=await Promise.all([fetch('/api/school/dashboard'),supabase.from('profiles').select('full_name').eq('id',user.id).single()])
      const d=await dashRes.json()
      if(d.error){setError(d.error);setLoading(false);return}
      const name=profRes.data?.full_name??d.adminName??''
      const enriched={...d,adminName:name}
      writeCache(enriched);setData(enriched);setAdminName(name)
    }catch{setError('Failed to load. Please refresh.')}
    finally{setLoading(false)}
  },[router,supabase])
  useEffect(()=>{load()},[load])
  function goTab(id){const p=new URLSearchParams(searchParams);p.set('tab',id);router.push(`/school/dashboard?${p.toString()}`)}
  function handleCohortCreated(c){setData(prev=>prev?{...prev,cohort:c,allCohorts:[c,...(prev.allCohorts??[])],summary:{...prev.summary,totalStudents:0}}:prev)}
  const schoolInitials=data?.school?.name?initials(data.school.name):'EP'
  const effectiveName=adminName||data?.adminName||''
  if(loading) return<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:14,background:'#eef0f8'}}><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style><div style={{width:36,height:36,borderRadius:'50%',border:'3px solid #1264E5',borderTopColor:'transparent',animation:'spin .7s linear infinite'}}/><div style={{fontSize:13,color:'#7a8aaa'}}>Loading school data…</div></div>
  if(error) return<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:12,background:'#eef0f8'}}><div style={{fontSize:36}}>⚠️</div><div style={{fontSize:14,fontWeight:700,color:'#3a4870'}}>{error}</div><button onClick={()=>load(true)} style={{color:'#1264E5',fontSize:13,background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Try again</button></div>
  if(!data) return null
  const {cohort,allCohorts=[],summary={},students=[],subjectTopics=[],weeklyEngagement=[],school}=data
  return(
    <>
      <style>{CSS}</style>
      <div className="sdash">
        {/* Desktop Sidebar */}
        <aside className="sd-sidebar">
          <div className="sd-brand">
            <div className="sd-logo">EX</div>
            <div><div style={{fontSize:12,fontWeight:600,color:'#071B49',lineHeight:1.2}}>ExamPrep</div><div style={{fontSize:10,color:'#9aa3b8'}}>School Dashboard</div></div>
          </div>
          <nav className="sd-nav">
            <div className="sd-group">Main</div>
            {TABS.filter(t=>t.id!=='settings').map(t=>(
              <button key={t.id} className={`nav-item${tab===t.id?' active':''}`} onClick={()=>goTab(t.id)}>
                <span style={{fontSize:15}}>{t.icon}</span> {t.label}
              </button>
            ))}
            <div className="sd-group" style={{marginTop:8}}>Account</div>
            <button className={`nav-item${tab==='settings'?' active':''}`} onClick={()=>goTab('settings')}>
              <span style={{fontSize:15}}>⚙️</span> Settings
            </button>
          </nav>
          <div className="sd-footer">
            <button className="sd-school-btn" onClick={()=>goTab('settings')}>
              <div className="sd-school-av">{schoolInitials}</div>
              <div style={{minWidth:0,flex:1}}><div style={{fontSize:11,fontWeight:700,color:'#071B49',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{school?.name||'My School'}</div>{school?.city&&<div style={{fontSize:9,color:'#7a8aaa'}}>{school.city}{school.state?`, ${school.state}`:''}</div>}</div>
              <span style={{fontSize:12,color:'#b0bada',flexShrink:0}}>›</span>
            </button>
            <button className="sd-invite-btn" onClick={()=>goTab('cohort')}>
              <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginBottom:3}}>Invite students</div>
              <div style={{fontSize:11,fontWeight:700,color:'#FFB800'}}>Get invite code →</div>
            </button>
          </div>
        </aside>
        {/* Mobile Header */}
        <header className="sd-mob-hdr">
          <div className="sd-logo" style={{width:28,height:28,borderRadius:7,fontSize:9}}>EX</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:800,color:'#071B49',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{school?.name||'School Dashboard'}</div>{effectiveName&&<div style={{fontSize:10,color:'#7a8aaa'}}>{effectiveName}</div>}</div>
          <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#062A78,#1264E5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff'}}>{initials(effectiveName||'A')}</div>
        </header>
        {/* Main */}
        <div className="sd-main">
          <div className="sd-topbar">
            <div className="sd-topbar-title">{{overview:'Overview',students:'Students',performance:'Performance',cohort:'Cohort & Invite',settings:'Settings'}[tab]||'Dashboard'}</div>
            <div className="sd-topbar-right">
              <div className="sd-search"><span className="sd-search-ico">🔍</span><input type="text" placeholder="Search students…"/></div>
              <div className="sd-user"><div className="sd-user-av">{initials(effectiveName||'A')}</div><span style={{fontSize:11,fontWeight:600,color:'#071B49'}}>{effectiveName||'School Admin'}</span></div>
            </div>
          </div>
          {tab==='overview'    &&<OverviewTab data={{...data,adminName:effectiveName}} adminName={effectiveName} goTab={goTab}/>}
          {tab==='students'    &&<StudentsTab students={students} cohortName={cohort?.name||''}/>}
          {tab==='performance' &&<PerformanceTab subjectTopics={subjectTopics}/>}
          {tab==='cohort'      &&<CohortTab cohort={cohort} allCohorts={allCohorts} totalStudents={summary.totalStudents??0} slotsTotal={school?.slots_total??100} slotsUsed={summary.totalStudents??0} onCohortCreated={handleCohortCreated}/>}
          {tab==='settings'    &&<SettingsTab school={school} onSaved={info=>setData(d=>d?{...d,school:{...d.school,...info}}:d)}/>}
        </div>
        {/* Mobile Bottom Nav */}
        <nav className="sd-mob-nav">
          <div className="sd-mob-nav-row">
            {TABS.map(t=>(
              <button key={t.id} className={`sd-mob-btn${tab===t.id?' active':''}`} onClick={()=>goTab(t.id)}>
                <span className="sd-mob-ico">{t.icon}</span>
                <span className="sd-mob-lbl">{t.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </>
  )
}

export default function SchoolDashboardPage(){
  return<Suspense fallback={null}><DashboardInner/></Suspense>
}
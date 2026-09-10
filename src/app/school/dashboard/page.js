'use client'
// src/app/school/dashboard/page.js
// School admin dashboard — 5 tabs: Overview, Students, Performance, Cohort, Settings.
// Navigation (sidebar + mobile) is handled by SchoolNav in layout.js.
// Data from /api/school/dashboard.

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Cache ──────────────────────────────────────────────────────────────────────
const CACHE_KEY = 'ep_sdash_v3'
const CACHE_TTL = 2 * 60 * 1000
function readCache()  { try { const c=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null'); return c&&Date.now()-c.ts<CACHE_TTL?c.d:null } catch { return null } }
function writeCache(d){ try { sessionStorage.setItem(CACHE_KEY,JSON.stringify({d,ts:Date.now()})) } catch {} }

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(n)      { return n==null?'—':`${Math.round(n)}%` }
function initials(n='?') { return (n||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?' }
function getGreeting(){ const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening' }

function statusOf(s) {
  const d=s.daysSinceLastPractice??999
  if(d>=21) return {l:'Inactive',c:'#7a8aaa',bg:'#f4f7ff',border:'#e4eaf5'}
  if(d>=14) return {l:'Slipping',c:'#d97706',bg:'#FFFBEB',border:'#fde68a'}
  if(s.accuracy!=null&&s.accuracy<40) return {l:'Weak',c:'#dc2626',bg:'#FEF2F2',border:'#fecaca'}
  if(d<=7)  return {l:'Active', c:'#059669',bg:'#ECFDF5',border:'#a7f3d0'}
  return {l:'Slipping',c:'#d97706',bg:'#FFFBEB',border:'#fde68a'}
}
function needsAttention(s){ const d=s.daysSinceLastPractice??999; return d>=14||(d<=7&&s.accuracy!=null&&s.accuracy<40) }
function perfCol(a)  { return a>=70?'#059669':a>=45?'#d97706':'#dc2626' }
function perfBg(a)   { return a>=70?'#ECFDF5':a>=45?'#FFFBEB':'#FEF2F2' }
function perfLabel(a){ return a>=70?'Strong':a>=45?'Fair':'Weak' }

const SUBJ_ICON={'Mathematics':'📐','English Language':'📖','Use of English':'📖','Physics':'⚡','Chemistry':'⚗️','Biology':'🧬','Economics':'📊','Government':'🏛️','Geography':'🌍'}
const SUBJ_BG  ={'Mathematics':'#EBF1FE','English Language':'#ECFDF5','Use of English':'#ECFDF5','Physics':'#F5F3FF','Chemistry':'#ECFDF5','Biology':'#FEF2F2','Economics':'#FEF3C7'}
function sIcon(n){ return SUBJ_ICON[n]||'📚' }
function sBg(n)  { return SUBJ_BG[n]  ||'#f4f7ff' }

// ── Shared CSS ─────────────────────────────────────────────────────────────────
const CSS=`
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
*{box-sizing:border-box}

/* ── Content wrapper ── */
.sd-content{padding:24px 0 40px;display:flex;flex-direction:column;gap:20px;animation:fadeUp .22s ease}

/* ── Stat cards ── */
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.stat-card{
  background:#fff;border-radius:20px;padding:22px 20px 18px;
  box-shadow:0 2px 12px rgba(6,42,120,.06),0 0 0 1px rgba(6,42,120,.04);
  border:none;transition:box-shadow .15s,transform .15s;cursor:default
}
.stat-card:hover{box-shadow:0 6px 24px rgba(6,42,120,.1),0 0 0 1px rgba(6,42,120,.06);transform:translateY(-2px)}
.stat-badge{
  width:52px;height:52px;border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  margin-bottom:16px;flex-shrink:0
}
.stat-val{font-size:28px;font-weight:800;color:#071B49;letter-spacing:-.04em;line-height:1;margin-bottom:5px}
.stat-label{font-size:12px;color:#8896b3;font-weight:500;letter-spacing:.01em}
.stat-delta{font-size:11px;font-weight:700;margin-top:8px}

/* ── Overview three-column layout ── */
.ov-grid{display:grid;grid-template-columns:1fr 1fr 320px;gap:16px;align-items:start}
.ov-main{display:flex;flex-direction:column;gap:16px}

/* ── Panel (card) ── */
.panel{
  background:#fff;border-radius:20px;overflow:hidden;
  box-shadow:0 2px 12px rgba(6,42,120,.06),0 0 0 1px rgba(6,42,120,.04)
}
.panel-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 14px}
.panel-title{font-size:14px;font-weight:700;color:#071B49;letter-spacing:-.01em}
.panel-sub{font-size:11px;color:#b0bada;margin-top:2px}
.view-btn{font-size:11px;font-weight:700;color:#1264E5;background:none;border:none;cursor:pointer;font-family:inherit;padding:4px 10px;border-radius:8px;background:#EBF1FE}

/* ── Bar chart ── */
.bars{display:flex;align-items:flex-end;gap:8px;height:110px;padding:0 20px 14px}
.bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px}
.bar-val{font-size:9px;font-weight:700}
.bar-rect{width:100%;border-radius:6px 6px 0 0;min-height:4px}
.bar-label{font-size:9px;color:#b0bada;white-space:nowrap}

/* ── Donut chart ── */
.donut-wrap{display:flex;flex-direction:column;align-items:center;padding:20px 20px 10px}
.donut-svg{transform:rotate(-90deg)}
.donut-label{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none}

/* ── Subject rows ── */
.subj-row{display:flex;align-items:center;gap:10px;padding:9px 20px;border-top:1px solid #f4f7ff}
.subj-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.subj-name{flex:1;font-size:12px;font-weight:600;color:#071B49;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.subj-bar-wrap{width:70px;height:5px;background:#f0f2f8;border-radius:99px;overflow:hidden;flex-shrink:0}
.subj-bar{height:100%;border-radius:99px}
.subj-pct{font-size:11px;font-weight:700;min-width:32px;text-align:right;flex-shrink:0}

/* ── Right sidebar ── */
.ov-sidebar{display:flex;flex-direction:column;gap:16px}
.invite-card{
  background:linear-gradient(135deg,#062A78 0%,#1264E5 100%);
  border-radius:20px;padding:22px;color:#fff;
  box-shadow:0 4px 20px rgba(6,42,120,.25)
}
.invite-code-box{
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);
  border-radius:12px;padding:14px 16px;margin:14px 0 10px;
  font-size:22px;font-weight:800;letter-spacing:.3em;
  font-family:monospace;color:#fff;text-align:center
}
.invite-copy-btn{
  width:100%;padding:10px;border-radius:11px;border:none;
  background:rgba(255,255,255,.15);color:#fff;font-size:12px;
  font-weight:700;cursor:pointer;font-family:inherit;
  transition:background .13s
}
.invite-copy-btn:hover{background:rgba(255,255,255,.25)}

/* ── Attention list ── */
.attn-row{display:flex;align-items:center;gap:10px;padding:10px 20px;border-top:1px solid #f4f7ff}
.attn-av{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0}

/* ── Student table ── */
.badge{display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:3px 9px;border-radius:99px;white-space:nowrap}
.th-row{display:grid;gap:8px;padding:10px 20px;background:#f8f9ff;border-bottom:1px solid #eef0f8}
.th{font-size:10px;font-weight:700;color:#b0bada;letter-spacing:.06em;text-transform:uppercase;text-align:center}
.st-row{display:grid;gap:8px;padding:12px 20px;border-bottom:1px solid #f4f7ff;align-items:center}
.st-row:last-child{border-bottom:none}
.st-av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0}
.st-name{font-size:13px;font-weight:600;color:#071B49;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-sub{font-size:10px;color:#b0bada;margin-top:1px}
.st-center{text-align:center;font-size:12px;color:#3a4870;font-weight:600}

/* ── Other tabs ── */
.tab-btn{font-size:11px;font-weight:600;padding:5px 12px;border-radius:8px;border:none;cursor:pointer;font-family:inherit;transition:all .12s;background:#f4f7ff;color:#7a8aaa}
.tab-btn.active{background:#1264E5;color:#fff;font-weight:700}
.pill{font-size:10px;font-weight:700;padding:4px 11px;border-radius:99px;border:1.5px solid #e4eaf5;background:#fff;color:#7a8aaa;cursor:pointer;font-family:inherit;transition:all .12s;white-space:nowrap}
.pill.active{border-color:#1264E5;background:#EBF1FE;color:#1264E5}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.cohort-code{font-size:28px;font-weight:700;letter-spacing:.4em;font-family:monospace;color:#065f46}
.copy-btn{padding:7px 14px;border-radius:8px;background:#ecfdf5;border:1px solid #a7f3d0;color:#059669;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
.slots-bar-wrap{height:7px;background:#f0f2f8;border-radius:99px;overflow:hidden;margin:8px 0}
.slots-bar{height:100%;border-radius:99px}
.sd-page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;flex-wrap:wrap;gap:10px}
.sd-page-title{font-size:22px;font-weight:800;color:#071B49;letter-spacing:-.03em}
.sd-search-bar{position:relative}
.sd-search-bar input{padding:8px 12px 8px 34px;border-radius:10px;border:1px solid #e4eaf5;background:#fff;font-size:12px;color:#3a4870;outline:none;width:200px;font-family:inherit}
.sd-search-bar svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none}

@media(max-width:1100px){.ov-grid{grid-template-columns:1fr 1fr!important}.ov-sidebar{grid-column:1/-1;flex-direction:row;flex-wrap:wrap}.ov-sidebar>*{flex:1;min-width:240px}}
@media(max-width:768px){
  .stat-grid{grid-template-columns:repeat(2,1fr)!important}
  .ov-grid{grid-template-columns:1fr!important}
  .ov-sidebar{flex-direction:column}
  .two-col{grid-template-columns:1fr!important}
  .sd-cohort-cols{grid-template-columns:1fr!important}
  .sd-settings-cols{grid-template-columns:1fr!important}
  .sd-settings-side{display:none!important}
  .sd-search-bar{display:none!important}
}
@media(max-width:480px){.sd-content{padding:14px 0 32px}.stat-grid{gap:10px}}
`

const TABS=[
  {id:'overview',    label:'Overview',    icon:'📊'},
  {id:'students',    label:'Students',    icon:'👥'},
  {id:'performance', label:'Performance', icon:'📈'},
  {id:'cohort',      label:'Cohort',      icon:'🏫'},
  {id:'settings',    label:'Settings',    icon:'⚙️'},
]

// ── Stat badge SVG icons ───────────────────────────────────────────────────────
function IconStudents({c}){return(<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="10" cy="8" r="4" stroke={c} strokeWidth="1.8"/><path d="M3 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5" stroke={c} strokeWidth="1.8" strokeLinecap="round"/><circle cx="19" cy="9" r="3" stroke={c} strokeWidth="1.6"/><path d="M16 21c0-3 1.5-4.5 3-4.5s3 1.5 3 4.5" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>)}
function IconActive({c}){return(<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M13 3v4M13 19v4M3 13h4M19 13h4" stroke={c} strokeWidth="1.8" strokeLinecap="round"/><circle cx="13" cy="13" r="5" stroke={c} strokeWidth="1.8"/><circle cx="13" cy="13" r="2" fill={c}/></svg>)}
function IconAccuracy({c}){return(<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M4 18l5-6 4 4 5-7 4 4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>)}
function IconQuestions({c}){return(<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="4" y="4" width="18" height="18" rx="4" stroke={c} strokeWidth="1.8"/><path d="M9 10h8M9 13h8M9 16h5" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>)}

// ── Donut chart ────────────────────────────────────────────────────────────────
function DonutChart({value, size=110, color='#1264E5', bg='#EEF2FF'}){
  const r=40, cx=55, cy=55
  const circ=2*Math.PI*r
  const filled=circ*(value/100)
  return(
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} viewBox="0 0 110 110" className="donut-svg">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={bg} strokeWidth="12"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${filled} ${circ-filled}`} strokeLinecap="round"/>
      </svg>
      <div className="donut-label">
        <div style={{fontSize:18,fontWeight:800,color:'#071B49',lineHeight:1}}>{value}%</div>
        <div style={{fontSize:9,color:'#b0bada',marginTop:2}}>accuracy</div>
      </div>
    </div>
  )
}

// ── OverviewTab ────────────────────────────────────────────────────────────────
function OverviewTab({data,adminName,goTab,cohort}){
  const [copied,setCopied]=useState(false)
  const {summary={},weeklyEngagement=[],subjectTopics=[],students=[]}=data
  const active=students.filter(s=>(s.isActiveThisWeek))
  const engRate=summary.totalStudents>0?Math.round((active.length/summary.totalStudents)*100):0
  const attn=students.filter(needsAttention).slice(0,4)
  const recentStudents=[...students]
    .filter(s=>s.total>0)
    .sort((a,b)=>(b.total??0)-(a.total??0))
    .slice(0,6)
  const maxBar=Math.max(...(weeklyEngagement||[]).map(w=>w.active||0),1)
  const bars=(weeklyEngagement||[]).slice(-6)
  const avgAcc=summary.avgAccuracy!=null?Math.round(summary.avgAccuracy):0
  const inviteCode=cohort?.invite_code??null

  function copyCode(){
    if(!inviteCode) return
    navigator.clipboard?.writeText(inviteCode)
    setCopied(true); setTimeout(()=>setCopied(false),2000)
  }

  // Stat cards config
  const STATS=[
    {
      label:'Total students', val:summary.totalStudents??0,
      Icon:IconStudents, iconColor:'#7C3AED', iconBg:'#F3F0FF',
      delta: engRate>0?`${engRate}% active this week`:null, deltaColor:'#7C3AED',
    },
    {
      label:'Active this week', val:active.length,
      Icon:IconActive, iconColor:'#1264E5', iconBg:'#EBF1FE',
      delta: summary.totalStudents>0?`of ${summary.totalStudents} enrolled`:null, deltaColor:'#1264E5',
    },
    {
      label:'Average accuracy', val:summary.avgAccuracy!=null?`${Math.round(summary.avgAccuracy)}%`:'—',
      Icon:IconAccuracy, iconColor:'#059669', iconBg:'#ECFDF5',
      delta: summary.avgAccuracy>=70?'Above target':summary.avgAccuracy>=45?'Approaching target':summary.avgAccuracy!=null?'Below target':null,
      deltaColor: summary.avgAccuracy>=70?'#059669':summary.avgAccuracy>=45?'#d97706':'#dc2626',
    },
    {
      label:'Questions this week', val:(summary.totalQuestionsThisWeek||0).toLocaleString(),
      Icon:IconQuestions, iconColor:'#d97706', iconBg:'#FEF3C7',
      delta: summary.lessonsThisWeek>0?`${summary.lessonsThisWeek} lessons completed`:null, deltaColor:'#d97706',
    },
  ]

  return(
    <div className="sd-content">

      {/* ── Page header ── */}
      <div className="sd-page-header">
        <div>
          <div className="sd-page-title">{getGreeting()}{adminName?`, ${adminName.split(' ')[0]}`:''}! 👋</div>
          <div style={{fontSize:13,color:'#8896b3',marginTop:4}}>
            {summary.totalStudents>0
              ?`${active.length} of ${summary.totalStudents} students active this week.`
              :'Set up your cohort to start tracking students.'}
          </div>
        </div>
        <button onClick={()=>goTab('cohort')} style={{display:'flex',alignItems:'center',gap:8,padding:'11px 20px',borderRadius:13,background:'#1264E5',color:'#fff',border:'none',fontSize:13,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 14px rgba(18,100,229,.3)'}}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
          Invite students
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="stat-grid">
        {STATS.map(({label,val,Icon,iconColor,iconBg,delta,deltaColor})=>(
          <div key={label} className="stat-card">
            <div className="stat-badge" style={{background:iconBg}}>
              <Icon c={iconColor}/>
            </div>
            <div className="stat-val">{val}</div>
            <div className="stat-label">{label}</div>
            {delta&&<div className="stat-delta" style={{color:deltaColor}}>{delta}</div>}
          </div>
        ))}
      </div>

      {/* ── Three-column layout ── */}
      <div className="ov-grid">

        {/* Left — bar chart */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Weekly activity</div>
              <div className="panel-sub">Active students per week</div>
            </div>
            <span style={{fontSize:10,fontWeight:700,color:'#b0bada',background:'#f4f7ff',padding:'4px 10px',borderRadius:8}}>Last {bars.length} weeks</span>
          </div>
          {bars.length?(
            <div className="bars">
              {bars.map((w,i)=>{
                const h=Math.max(6,Math.round(((w.active||0)/maxBar)*96))
                const last=i===bars.length-1
                return(
                  <div key={i} className="bar-col">
                    <div className="bar-val" style={{color:last?'#1264E5':'#b0bada'}}>{w.active||0}</div>
                    <div className="bar-rect" style={{height:h,background:last?'#1264E5':'#D0DCF9'}}/>
                    <div className="bar-label" style={{color:last?'#1264E5':'#b0bada',fontWeight:last?700:500}}>{w.label}</div>
                  </div>
                )
              })}
            </div>
          ):(
            <div style={{height:110,display:'flex',alignItems:'center',justifyContent:'center',color:'#b0bada',fontSize:12,padding:'0 20px'}}>
              No activity data yet
            </div>
          )}
          {summary.totalStudents>0&&(
            <div style={{padding:'0 20px 16px'}}>
              <div style={{fontSize:11,fontWeight:700,color:engRate>=60?'#059669':engRate>=30?'#d97706':'#dc2626',background:engRate>=60?'#ECFDF5':engRate>=30?'#FFFBEB':'#FEF2F2',padding:'7px 12px',borderRadius:10}}>
                {engRate>=60?`↑ ${engRate}% of students active — great engagement.`:engRate>=30?`${engRate}% engagement — encourage more practice.`:`Only ${engRate}% active this week — students need a push.`}
              </div>
            </div>
          )}
        </div>

        {/* Middle — subject performance + donut */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Subject performance</div>
              <div className="panel-sub">Class average accuracy</div>
            </div>
            <button className="view-btn" onClick={()=>goTab('performance')}>Full report</button>
          </div>
          {subjectTopics.length?(
            <>
              {/* Donut + subject list */}
              <div style={{display:'flex',alignItems:'center',gap:16,padding:'12px 20px 4px'}}>
                <DonutChart value={avgAcc} color={perfCol(avgAcc)} bg='#EEF2FF'/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,color:'#b0bada',marginBottom:6}}>Overall cohort accuracy</div>
                  <div style={{fontSize:22,fontWeight:800,color:perfCol(avgAcc),letterSpacing:'-.03em'}}>{avgAcc}%</div>
                  <span className="badge" style={{background:perfBg(avgAcc),color:perfCol(avgAcc),marginTop:6}}>{perfLabel(avgAcc)}</span>
                </div>
              </div>
              <div style={{padding:'4px 0 8px'}}>
                {subjectTopics.slice(0,4).map(s=>(
                  <div key={s.subjectName} className="subj-row">
                    <div className="subj-icon" style={{background:sBg(s.subjectName)}}>{sIcon(s.subjectName)}</div>
                    <div className="subj-name">{s.subjectName.replace('English Language','English').replace('Further Mathematics','Further Maths')}</div>
                    <div className="subj-bar-wrap"><div className="subj-bar" style={{width:`${Math.min(100,s.accuracy??0)}%`,background:perfCol(s.accuracy)}}/></div>
                    <div className="subj-pct" style={{color:perfCol(s.accuracy)}}>{pct(s.accuracy)}</div>
                  </div>
                ))}
              </div>
            </>
          ):(
            <div style={{padding:'40px 20px',textAlign:'center',color:'#b0bada',fontSize:12}}>
              <div style={{fontSize:32,marginBottom:10}}>📊</div>
              No practice data yet
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="ov-sidebar">

          {/* Invite card */}
          <div className="invite-card">
            <div style={{fontSize:11,fontWeight:800,color:'rgba(255,255,255,.6)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:4}}>Student invite code</div>
            <div style={{fontSize:14,fontWeight:700,color:'#fff',lineHeight:1.4}}>
              {inviteCode?'Share this code with your students':'Create a cohort to get your invite code'}
            </div>
            {inviteCode?(
              <>
                <div className="invite-code-box">{inviteCode}</div>
                <button className="invite-copy-btn" onClick={copyCode}>
                  {copied?'✓ Copied!':'Copy code'}
                </button>
                <div style={{fontSize:10,color:'rgba(255,255,255,.5)',marginTop:8,lineHeight:1.5}}>
                  Students: ExamPrep → Profile → Connect school → Enter code
                </div>
              </>
            ):(
              <button onClick={()=>goTab('cohort')} className="invite-copy-btn" style={{marginTop:14}}>
                Create cohort →
              </button>
            )}
          </div>

          {/* Needs attention */}
          {attn.length>0&&(
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Needs attention</div>
                  <div className="panel-sub">{attn.length} student{attn.length!==1?'s':''} flagged</div>
                </div>
                <button className="view-btn" onClick={()=>goTab('students')}>View all</button>
              </div>
              {attn.slice(0,4).map((s,i)=>{
                const d=s.daysSinceLastPractice??999
                const reason=d>=14?`${d}d inactive`:`${pct(s.accuracy)} accuracy`
                const rc=statusOf(s)
                return(
                  <div key={s.id} className="attn-row" style={{borderTop:i===0?'none':'1px solid #f4f7ff'}}>
                    <div className="attn-av" style={{background:rc.c}}>{initials(s.full_name)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:'#071B49',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.full_name}</div>
                      <div style={{fontSize:10,color:'#b0bada',marginTop:1}}>{reason}</div>
                    </div>
                    <span className="badge" style={{background:rc.bg,color:rc.c,border:`1px solid ${rc.border}`}}>{rc.l}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Student table ── */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Students</div>
            <div className="panel-sub">{recentStudents.length > 0 ? 'Sorted by most questions answered' : 'No activity yet'}</div>
          </div>
          <button className="view-btn" onClick={()=>goTab('students')}>View all</button>
        </div>
        {recentStudents.length?(
          <>
            <div className="th-row" style={{gridTemplateColumns:'1fr 90px 90px 90px 80px'}}>
              <div className="th" style={{textAlign:'left'}}>Student</div>
              <div className="th">Questions</div>
              <div className="th">Accuracy</div>
              <div className="th">Last active</div>
              <div className="th">Status</div>
            </div>
            {recentStudents.map((s,i)=>{
              const st=statusOf(s)
              const lastLabel=(d)=>d==null?'—':d===0?'Today':d===1?'Yesterday':`${d}d ago`
              return(
                <div key={s.id} className="st-row" style={{gridTemplateColumns:'1fr 90px 90px 90px 80px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
                    <div className="st-av" style={{background:'#1264E5'}}>{initials(s.full_name)}</div>
                    <div style={{minWidth:0}}>
                      <div className="st-name">{s.full_name}</div>
                      <div className="st-sub">{s.exam_type??''}</div>
                    </div>
                  </div>
                  <div className="st-center">{(s.total||0).toLocaleString()}</div>
                  <div className="st-center" style={{color:s.accuracy!=null?perfCol(s.accuracy):'#b0bada',fontWeight:700}}>{pct(s.accuracy)}</div>
                  <div className="st-center" style={{fontSize:11,color:'#8896b3'}}>{lastLabel(s.daysSinceLastPractice)}</div>
                  <div style={{display:'flex',justifyContent:'center'}}>
                    <span className="badge" style={{background:st.bg,color:st.c,border:`1px solid ${st.border}`}}>{st.l}</span>
                  </div>
                </div>
              )
            })}
          </>
        ):(
          <div style={{padding:'40px 20px',textAlign:'center',color:'#b0bada',fontSize:12}}>
            <div style={{fontSize:32,marginBottom:10}}>👥</div>
            Students will appear here once they join and start practising.
          </div>
        )}
      </div>
    </div>
  )
}

// ── StudentsTab ────────────────────────────────────────────────────────────────
function StudentsTab({students=[],cohortName=''}){
  const [filter,setFilter]=useState('all')
  const [search,setSearch]=useState('')
  const [sort,setSort]=useState('name')
  const [page,setPage]=useState(1)
  const PER=8
  const lastLabel=d=>d==null?'—':d===0?'Today':d===1?'Yesterday':`${d}d ago`
  const counts={
    all:students.length,
    active:students.filter(s=>(s.daysSinceLastPractice??999)<=7).length,
    slipping:students.filter(s=>{const d=s.daysSinceLastPractice??999;return d>=8&&d<21}).length,
    inactive:students.filter(s=>(s.daysSinceLastPractice??999)>=21).length,
    attention:students.filter(needsAttention).length
  }
  let list=[...students]
  if(filter==='active')   list=list.filter(s=>(s.daysSinceLastPractice??999)<=7)
  if(filter==='slipping') list=list.filter(s=>{const d=s.daysSinceLastPractice??999;return d>=8&&d<21})
  if(filter==='inactive') list=list.filter(s=>(s.daysSinceLastPractice??999)>=21)
  if(filter==='attention')list=list.filter(needsAttention)
  if(search) list=list.filter(s=>(s.full_name||'').toLowerCase().includes(search.toLowerCase()))
  if(sort==='accuracy')  list.sort((a,b)=>(b.accuracy??-1)-(a.accuracy??-1))
  else if(sort==='questions') list.sort((a,b)=>(b.total??0)-(a.total??0))
  else list.sort((a,b)=>(a.full_name||'').localeCompare(b.full_name||''))
  const pages=Math.max(1,Math.ceil(list.length/PER))
  const shown=list.slice((page-1)*PER,page*PER)
  const FILTERS=[
    {id:'all',      l:`All (${counts.all})`},
    {id:'active',   l:`Active (${counts.active})`},
    {id:'slipping', l:`Slipping (${counts.slipping})`},
    {id:'inactive', l:`Inactive (${counts.inactive})`},
    {id:'attention',l:`⚠ Attention (${counts.attention})`},
  ]
  return(
    <div className="sd-content">
      <div className="sd-page-header">
        <div>
          <div className="sd-page-title">Students</div>
          <div style={{fontSize:12,color:'#7a8aaa',marginTop:2}}>{students.length} students{cohortName?` · ${cohortName}`:''}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <div className="sd-search-bar">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="#b0bada" strokeWidth="1.3"/>
              <path d="M10 10l2.5 2.5" stroke="#b0bada" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={e=>{setSearch(e.target.value);setPage(1)}}
              placeholder="Search students…"
            />
          </div>
          <select value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}} style={{padding:'7px 10px',borderRadius:9,border:'1px solid #e4eaf5',background:'#fff',fontSize:12,color:'#3a4870',outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
            <option value="name">Sort: Name</option>
            <option value="accuracy">Sort: Accuracy</option>
            <option value="questions">Sort: Questions</option>
          </select>
        </div>
      </div>
      <div style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:4,scrollbarWidth:'none'}}>
        {FILTERS.map(f=><button key={f.id} className={`pill${filter===f.id?' active':''}`} onClick={()=>{setFilter(f.id);setPage(1)}}>{f.l}</button>)}
      </div>
      <div className="panel">
        <div className="th-row" style={{gridTemplateColumns:'1fr 80px 80px 90px 70px'}}>
          <div className="th" style={{textAlign:'left'}}>Student</div>
          <div className="th">Accuracy</div>
          <div className="th">Questions</div>
          <div className="th">Last active</div>
          <div className="th">Status</div>
        </div>
        {!shown.length
          ?<div style={{padding:'48px',textAlign:'center',color:'#b0bada',fontSize:12}}>No students match</div>
          :shown.map((s,i)=>{
            const st=statusOf(s)
            return(
              <div key={s.id} className="st-row" style={{gridTemplateColumns:'1fr 80px 80px 90px 70px',borderBottom:i<shown.length-1?'1px solid #f9faff':'none'}}>
                <div style={{display:'flex',alignItems:'center',gap:9,minWidth:0}}>
                  <div className="st-av" style={{background:'#1264E5'}}>{initials(s.full_name)}</div>
                  <div style={{minWidth:0}}>
                    <div className="st-name">{s.full_name}</div>
                    {s.school_class&&<div className="st-class">{s.school_class}</div>}
                  </div>
                </div>
                <div className="st-center" style={{color:s.accuracy!=null?perfCol(s.accuracy):'#7a8aaa'}}>{pct(s.accuracy)}</div>
                <div className="st-center">{(s.total||0).toLocaleString()}</div>
                <div className="st-center" style={{fontSize:11}}>{lastLabel(s.daysSinceLastPractice)}</div>
                <div style={{display:'flex',justifyContent:'center'}}><span className="badge" style={{background:st.bg,color:st.c,border:`1px solid ${st.border}`}}>{st.l}</span></div>
              </div>
            )
          })
        }
      </div>
      {pages>1&&(
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:11,color:'#7a8aaa'}}>Showing {(page-1)*PER+1}–{Math.min(page*PER,list.length)} of {list.length}</span>
          <div style={{display:'flex',gap:5}}>
            {Array.from({length:pages},(_,i)=>i+1).slice(Math.max(0,page-3),page+2).map(p=>(
              <button key={p} onClick={()=>setPage(p)} style={{width:28,height:28,borderRadius:7,border:`1px solid ${p===page?'#1264E5':'#e4eaf5'}`,background:p===page?'#1264E5':'#fff',color:p===page?'#fff':'#7a8aaa',fontSize:11,fontWeight:700,cursor:'pointer'}}>{p}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── PerformanceTab ─────────────────────────────────────────────────────────────
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
  const weak  =(subject?.topics||[]).filter(t=>t.accuracy!=null&&t.accuracy<50 ).sort((a,b)=>a.accuracy-b.accuracy)

  if(!subjectTopics.length) return(
    <div className="sd-content">
      <div className="sd-page-title">Performance</div>
      <div className="panel" style={{padding:'48px 24px',textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:12}}>📊</div>
        <div style={{fontSize:14,fontWeight:700,color:'#071B49',marginBottom:6}}>No performance data yet</div>
        <div style={{fontSize:12,color:'#7a8aaa'}}>Data appears once students start practising.</div>
      </div>
    </div>
  )
  return(
    <div className="sd-content">
      <div className="sd-page-header">
        <div>
          <div className="sd-page-title">Performance</div>
          <div style={{fontSize:12,color:'#7a8aaa',marginTop:2}}>Subject and topic breakdown</div>
        </div>
      </div>
      <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4,scrollbarWidth:'none'}}>
        {subjectTopics.map(s=>(
          <button key={s.subjectName} className={`tab-btn${activeSubj===s.subjectName?' active':''}`} onClick={()=>setActiveSubj(s.subjectName)} style={{whiteSpace:'nowrap'}}>
            {sIcon(s.subjectName)} {s.subjectName.replace('English Language','English').replace('Further Mathematics','Further Maths')} — {pct(s.accuracy)}
          </button>
        ))}
      </div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><div className="panel-title">💪 Strong topics <span style={{fontSize:11,color:'#059669',fontWeight:700}}>&nbsp;{strong.length} topics ≥ 70%</span></div></div>
          <div style={{padding:'8px 0'}}>
            {!strong.length
              ?<div style={{padding:'24px 18px',textAlign:'center',color:'#b0bada',fontSize:12}}>No topics at 70%+ yet</div>
              :strong.slice(0,4).map((t,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 18px',borderBottom:i<3?'1px solid #f9faff':'none'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:'#071B49',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.topicName}</div>
                    <div style={{height:4,background:'#f0f2f8',borderRadius:99,marginTop:4,overflow:'hidden'}}><div style={{height:'100%',width:`${t.accuracy}%`,background:'#059669',borderRadius:99}}/></div>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:'#059669',flexShrink:0}}>{t.accuracy}%</span>
                </div>
              ))
            }
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><div className="panel-title">⚠️ Needs work <span style={{fontSize:11,color:'#dc2626',fontWeight:700}}>&nbsp;{weak.length} topics below 50%</span></div></div>
          <div style={{padding:'8px 0'}}>
            {!weak.length
              ?<div style={{padding:'24px 18px',textAlign:'center',color:'#b0bada',fontSize:12}}>No topics below 50%. Great!</div>
              :weak.slice(0,4).map((t,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 18px',borderBottom:i<3?'1px solid #f9faff':'none'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:'#071B49',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.topicName}</div>
                    <div style={{height:4,background:'#f0f2f8',borderRadius:99,marginTop:4,overflow:'hidden'}}><div style={{height:'100%',width:`${t.accuracy}%`,background:'#dc2626',borderRadius:99}}/></div>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:'#dc2626',flexShrink:0}}>{t.accuracy}%</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">All topics — {activeSubj}</div>
          <select value={topicSort} onChange={e=>setTopicSort(e.target.value)} style={{padding:'5px 8px',borderRadius:7,border:'1px solid #e4eaf5',fontSize:11,color:'#3a4870',outline:'none',fontFamily:'inherit'}}>
            <option value="worst">Weakest first</option>
            <option value="best">Strongest first</option>
            <option value="name">A → Z</option>
          </select>
        </div>
        <div className="th-row" style={{gridTemplateColumns:'1fr 90px 80px 80px'}}>
          <div className="th" style={{textAlign:'left'}}>Topic</div>
          <div className="th">Accuracy</div>
          <div className="th">Questions</div>
          <div className="th">Status</div>
        </div>
        {!topics.length
          ?<div style={{padding:'32px',textAlign:'center',color:'#b0bada',fontSize:12}}>No topics found</div>
          :topics.map((t,i)=>(
            <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 90px 80px 80px',gap:8,padding:'10px 18px',borderBottom:i<topics.length-1?'1px solid #f9faff':'none',alignItems:'center'}}>
              <div>
                <div style={{fontSize:12,color:'#071B49',fontWeight:600}}>{t.topicName}</div>
                <div style={{height:3,background:'#f0f2f8',borderRadius:99,marginTop:4,overflow:'hidden'}}><div style={{height:'100%',width:`${t.accuracy??0}%`,background:perfCol(t.accuracy),borderRadius:99}}/></div>
              </div>
              <div style={{textAlign:'center',fontSize:12,fontWeight:700,color:perfCol(t.accuracy)}}>{pct(t.accuracy)}</div>
              <div style={{textAlign:'center',fontSize:12,color:'#3a4870'}}>{t.total??0}</div>
              <div style={{display:'flex',justifyContent:'center'}}><span className="badge" style={{background:perfBg(t.accuracy),color:perfCol(t.accuracy)}}>{perfLabel(t.accuracy)}</span></div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ── CohortTab ──────────────────────────────────────────────────────────────────
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

  function copyCode(){ navigator.clipboard?.writeText(sel?.invite_code||''); setCodeCopied(true); setTimeout(()=>setCodeCopied(false),2000) }
  function copyLink(){ navigator.clipboard?.writeText(inviteLink); setLinkCopied(true); setTimeout(()=>setLinkCopied(false),2000) }
  function shareMsg(){
    const msg=`📚 Join our ExamPrep school!\n\nHi! Your school has set up an ExamPrep study group. Practice WAEC & JAMB questions, track your progress, and compete with classmates.\n\n👉 Join here: ${inviteLink}\nOr enter code: ${sel?.invite_code}\n\nGo to ExamPrep → Profile → Connect your school → Enter code`
    if(typeof navigator!=='undefined'&&navigator.share){navigator.share({text:msg}).catch(()=>{});return}
    navigator.clipboard?.writeText(msg); setMsgCopied(true); setTimeout(()=>setMsgCopied(false),2500)
  }
  async function handleCreate(){
    if(!cohortName.trim()) return
    setSaving(true); setSaveErr(null)
    try{
      const res=await fetch('/api/school/cohort',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:cohortName.trim(),session:cohortSess.trim()})})
      const d=await res.json()
      if(d.error){setSaveErr(d.error);return}
      onCohortCreated?.(d.cohort); setShowCreate(false); setSelected(d.cohort.id); setCohortName(''); setCohortSess('')
    }catch{setSaveErr('Failed — try again')}finally{setSaving(false)}
  }
  const yr=new Date().getFullYear()
  return(
    <div className="sd-content">
      <div className="sd-page-header">
        <div>
          <div className="sd-page-title">Cohort & Invite</div>
          <div style={{fontSize:12,color:'#7a8aaa',marginTop:2}}>Create and manage your student cohorts</div>
        </div>
        <button onClick={()=>setShowCreate(o=>!o)} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:10,background:'#062A78',color:'#fff',border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          + {showCreate?'Cancel':'New cohort'}
        </button>
      </div>
      <div className="sd-cohort-cols" style={{display:'grid',gridTemplateColumns:'180px 1fr 220px',gap:14,alignItems:'start'}}>
        <div>
          <div style={{fontSize:9,fontWeight:700,color:'#b0bada',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10}}>Your cohorts</div>
          {!allCohorts.length?(
            <div className="panel" style={{padding:'20px 14px',textAlign:'center'}}>
              <div style={{fontSize:12,color:'#7a8aaa',marginBottom:10}}>No cohorts yet.</div>
              <button onClick={()=>setShowCreate(true)} style={{padding:'7px 14px',borderRadius:8,background:'#062A78',color:'#fff',border:'none',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Create first →</button>
            </div>
          ):allCohorts.map(c=>(
            <div key={c.id} onClick={()=>{setSelected(c.id);setShowCreate(false)}} style={{padding:'10px 12px',borderRadius:11,border:`1.5px solid ${selected===c.id?'#1264E5':'#e4eaf5'}`,background:selected===c.id?'#EBF1FE':'#fff',cursor:'pointer',marginBottom:6}}>
              <div style={{fontSize:12,fontWeight:700,color:'#071B49'}}>{c.name}</div>
              <div style={{fontSize:10,color:'#7a8aaa',marginTop:2}}>{c.session||'—'} · {c.is_active?totalStudents:0} students</div>
              {c.is_active&&<span className="badge" style={{background:'#ECFDF5',color:'#059669',marginTop:5,display:'inline-flex'}}>Active</span>}
            </div>
          ))}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {showCreate&&(
            <div className="panel" style={{padding:22}}>
              <div style={{fontSize:15,fontWeight:700,color:'#071B49',marginBottom:4}}>{cohort?'Create a new cohort':'Create your first cohort'}</div>
              <div style={{fontSize:12,color:'#7a8aaa',marginBottom:18}}>{cohort?'Creating a new cohort archives the current one.':'You\'ll get an invite code to share with students.'}</div>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#071B49',display:'block',marginBottom:5}}>Cohort name *</label>
                  <input value={cohortName} onChange={e=>setCohortName(e.target.value)} placeholder="e.g. SS3 Science 2026/2027" autoFocus style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e4eaf5',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'#071B49',display:'block',marginBottom:5}}>Academic session <span style={{fontWeight:400,color:'#b0bada'}}>(optional)</span></label>
                  <input value={cohortSess} onChange={e=>setCohortSess(e.target.value)} placeholder={`e.g. ${yr}/${yr+1}`} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e4eaf5',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
                {saveErr&&<div style={{fontSize:12,color:'#dc2626',padding:'9px 12px',background:'#fef2f2',borderRadius:8,border:'1px solid #fecaca'}}>{saveErr}</div>}
                <div style={{display:'flex',gap:10}}>
                  {cohort&&<button onClick={()=>setShowCreate(false)} style={{padding:'9px 16px',borderRadius:9,border:'1px solid #e4eaf5',background:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',color:'#7a8aaa'}}>Cancel</button>}
                  <button onClick={handleCreate} disabled={saving||!cohortName.trim()} style={{flex:1,padding:'9px 16px',borderRadius:9,background:saving||!cohortName.trim()?'#e2e8f0':'#059669',color:saving||!cohortName.trim()?'#7a8aaa':'#fff',border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{saving?'Creating…':'Create cohort →'}</button>
                </div>
              </div>
            </div>
          )}
          {sel&&!showCreate&&(
            <div className="panel">
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
            </div>
          )}
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
            {[['🎟','Each slot covers one student.'],['📲','Students join via the invite code.'],['⭐','Joined students get full access.'],['➕','Contact us to add more slots.']].map(([ico,txt],i)=>(
              <div key={i} style={{display:'flex',gap:8,fontSize:11,color:'#7a8aaa',marginBottom:i<3?8:0}}><span>{ico}</span>{txt}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SettingsTab ────────────────────────────────────────────────────────────────
const STATES=['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara']

function SettingsTab({school,onSaved}){
  const [name,  setName]  = useState(school?.name ??'')
  const [city,  setCity]  = useState(school?.city ??'')
  const [state, setState] = useState(school?.state??'')
  const [saving,setSaving]= useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleSave(){
    if(!name.trim()){setError('School name is required');return}
    setSaving(true); setError(null)
    try{
      const res=await fetch('/api/school/setup',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({schoolName:name.trim(),city:city.trim(),state})})
      const d=await res.json()
      if(d.error){setError(d.error);return}
      setSaved(true); setTimeout(()=>setSaved(false),2500); onSaved?.({name:name.trim(),city:city.trim(),state})
    }catch{setError('Failed to save')}finally{setSaving(false)}
  }

  async function handleDelete(){
    setDeleting(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/school-login')
    } catch {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return(
    <div className="sd-content">
      <div className="sd-page-title">Settings</div>
      <div className="sd-settings-cols" style={{display:'grid',gridTemplateColumns:'1fr 220px',gap:14}}>
        <div className="panel" style={{padding:22}}>
          {/* School identity preview */}
          <div style={{display:'flex',alignItems:'center',gap:12,padding:12,background:'#f4f7ff',borderRadius:11,border:'1px solid #e4eaf5',marginBottom:20}}>
            <div style={{width:44,height:44,borderRadius:11,background:'#062A78',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#FFB800',flexShrink:0}}>{initials(name||'?')}</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:'#071B49'}}>{name||'Your School'}</div>
              <div style={{fontSize:11,color:'#7a8aaa'}}>{city||'—'}{state?`, ${state}`:''}</div>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:'#071B49',display:'block',marginBottom:5}}>School name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Excellence Academy" style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e4eaf5',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:'#071B49',display:'block',marginBottom:5}}>City</label>
              <input value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g. Lagos" style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e4eaf5',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:'#071B49',display:'block',marginBottom:5}}>State</label>
              <select value={state} onChange={e=>setState(e.target.value)} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e4eaf5',fontSize:13,color:state?'#071B49':'#b0bada',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}>
                <option value="">Select state</option>
                {STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {error&&<div style={{fontSize:12,color:'#dc2626',padding:'9px 12px',background:'#fef2f2',borderRadius:8,border:'1px solid #fecaca'}}>{error}</div>}
            {saved&&<div style={{fontSize:12,color:'#059669',padding:'9px 12px',background:'#ecfdf5',borderRadius:8,border:'1px solid #a7f3d0'}}>✓ Changes saved</div>}
            <div style={{textAlign:'right'}}>
              <button onClick={handleSave} disabled={saving} style={{padding:'9px 20px',borderRadius:9,background:saving?'#e2e8f0':'#062A78',color:saving?'#7a8aaa':'#fff',border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                {saving?'Saving…':'Save changes'}
              </button>
            </div>
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
            <div style={{fontSize:11,color:'#7a8aaa',marginBottom:10,lineHeight:1.5}}>Sign out and remove access to this dashboard.</div>
            {!showDeleteConfirm?(
              <button onClick={()=>setShowDeleteConfirm(true)} style={{padding:'7px 14px',borderRadius:8,background:'transparent',border:'1.5px solid #dc2626',color:'#dc2626',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',width:'100%'}}>
                Sign out
              </button>
            ):(
              <div>
                <div style={{fontSize:11,color:'#dc2626',marginBottom:8,fontWeight:600}}>Are you sure?</div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>setShowDeleteConfirm(false)} style={{flex:1,padding:'7px 0',borderRadius:8,border:'1px solid #e4eaf5',background:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',color:'#7a8aaa'}}>Cancel</button>
                  <button onClick={handleDelete} disabled={deleting} style={{flex:1,padding:'7px 0',borderRadius:8,border:'none',background:'#dc2626',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{deleting?'…':'Sign out'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
function DashboardInner(){
  const router       = useRouter()
  const searchParams = useSearchParams()
  const tab          = searchParams.get('tab') ?? 'overview'
  const supabase     = createClient()

  const [data,      setData]      = useState(()=>readCache())
  const [loading,   setLoading]   = useState(()=>!readCache())
  const [error,     setError]     = useState(null)
  const [adminName, setAdminName] = useState('')

  const load = useCallback(async(force=false)=>{
    if(!force){ const c=readCache(); if(c){ setData(c); setAdminName(c.adminName||''); setLoading(false); return } }
    setLoading(true)
    try{
      const {data:{user}}=await supabase.auth.getUser()
      if(!user){ router.push('/school-login'); return }
      const [dashRes,profRes]=await Promise.all([
        fetch('/api/school/dashboard'),
        supabase.from('profiles').select('full_name').eq('id',user.id).single()
      ])
      const d=await dashRes.json()
      if(d.error){ setError(d.error); setLoading(false); return }
      const name=profRes.data?.full_name??d.adminName??''
      const enriched={...d,adminName:name}
      writeCache(enriched); setData(enriched); setAdminName(name)
    }catch{ setError('Failed to load. Please refresh.') }
    finally{ setLoading(false) }
  },[router,supabase])

  useEffect(()=>{ load() },[load])

  function goTab(id){
    const p=new URLSearchParams(searchParams)
    p.set('tab',id)
    router.push(`/school/dashboard?${p.toString()}`)
  }
  function handleCohortCreated(c){
    setData(prev=>prev?{...prev,cohort:c,allCohorts:[c,...(prev.allCohorts??[])],summary:{...prev.summary,totalStudents:0}}:prev)
  }

  const effectiveName = adminName||data?.adminName||''

  // ── Loading state
  if(loading) return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:14}}>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <div style={{width:36,height:36,borderRadius:'50%',border:'3px solid #1264E5',borderTopColor:'transparent',animation:'spin .7s linear infinite'}}/>
      <div style={{fontSize:13,color:'#7a8aaa'}}>Loading school data…</div>
    </div>
  )

  // ── Error state
  if(error) return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:12}}>
      <div style={{fontSize:36}}>⚠️</div>
      <div style={{fontSize:14,fontWeight:700,color:'#3a4870'}}>{error}</div>
      <button onClick={()=>load(true)} style={{color:'#1264E5',fontSize:13,background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Try again</button>
    </div>
  )

  if(!data) return null

  const {cohort,allCohorts=[],summary={},students=[],subjectTopics=[],weeklyEngagement=[],school}=data

  return(
    <>
      <style>{CSS}</style>
      {tab==='overview'    && <OverviewTab    data={{...data,adminName:effectiveName}} adminName={effectiveName} goTab={goTab} cohort={cohort}/>}
      {tab==='students'    && <StudentsTab    students={students} cohortName={cohort?.name||''}/>}
      {tab==='performance' && <PerformanceTab subjectTopics={subjectTopics}/>}
      {tab==='cohort'      && <CohortTab      cohort={cohort} allCohorts={allCohorts} totalStudents={summary.totalStudents??0} slotsTotal={school?.slots_total??100} slotsUsed={summary.totalStudents??0} onCohortCreated={handleCohortCreated}/>}
      {tab==='settings'    && <SettingsTab    school={school} onSaved={info=>setData(d=>d?{...d,school:{...d.school,...info}}:d)}/>}
    </>
  )
}

export default function SchoolDashboardPage(){
  return <Suspense fallback={null}><DashboardInner/></Suspense>
}
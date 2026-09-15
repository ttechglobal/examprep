'use client'
// src/app/school/dashboard/tabs/OverviewTab.js

import { useState }                                           from 'react'
import { pct, initials, getGreeting, lastLabel, statusOf, needsAttention, perfCol, perfBg, perfLabel, sIcon, sBg, avColor, TIER_META } from './shared'

// ── Mini icons ──────────────────────────────────────────────────────────────────
function IconStudents({ c })  { return <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="10" cy="8" r="4" stroke={c} strokeWidth="1.8"/><path d="M3 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5" stroke={c} strokeWidth="1.8" strokeLinecap="round"/><circle cx="19" cy="9" r="3" stroke={c} strokeWidth="1.6"/><path d="M16 21c0-3 1.5-4.5 3-4.5s3 1.5 3 4.5" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg> }
function IconActive({ c })    { return <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M13 3v4M13 19v4M3 13h4M19 13h4" stroke={c} strokeWidth="1.8" strokeLinecap="round"/><circle cx="13" cy="13" r="5" stroke={c} strokeWidth="1.8"/><circle cx="13" cy="13" r="2" fill={c}/></svg> }
function IconAccuracy({ c })  { return <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M4 18l5-6 4 4 5-7 4 4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function IconQuestions({ c }) { return <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="4" y="4" width="18" height="18" rx="4" stroke={c} strokeWidth="1.8"/><path d="M9 10h8M9 13h8M9 16h5" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg> }

// ── Donut chart ─────────────────────────────────────────────────────────────────
function DonutChart({ value, size = 110, color = '#1264E5', bg = '#EEF2FF' }) {
  const r = 40, cx = 55, cy = 55
  const circ  = 2 * Math.PI * r
  const filled = circ * ((value ?? 0) / 100)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 110 110" className="donut-svg">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={bg}    strokeWidth="12"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"/>
      </svg>
      <div className="donut-label">
        <div style={{ fontSize: 18, fontWeight: 800, color: '#071B49', lineHeight: 1 }}>{value ?? '—'}%</div>
        <div style={{ fontSize: 9,  color: '#b0bada', marginTop: 2 }}>accuracy</div>
      </div>
    </div>
  )
}

export default function OverviewTab({ data, adminName, goTab, cohort }) {
  const [copied, setCopied] = useState(false)
  const { summary = {}, weeklyEngagement = [], subjectTopics = [], students = [], atRiskSegmented = [] } = data

  // Active students — derived from isActiveThisWeek (which now comes from daysSinceLastPractice in API)
  const activeStudents = students.filter(s => s.isActiveThisWeek)
  const engRate = summary.totalStudents > 0
    ? Math.round((activeStudents.length / summary.totalStudents) * 100) : 0

  // Needs attention — uses the now-fixed daysSinceLastPractice field
  const attn = students.filter(needsAttention).slice(0, 5)

  // Top students by questions answered (30d), only those with any activity
  const topStudents = [...students]
    .filter(s => (s.total ?? 0) > 0)
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    .slice(0, 6)

  const bars    = (weeklyEngagement || []).slice(-4)
  const maxBar  = Math.max(...bars.map(w => w.active || 0), 1)
  const avgAcc  = summary.avgAccuracy != null ? Math.round(summary.avgAccuracy) : null
  const inviteCode = cohort?.invite_code ?? null

  function copyCode() {
    if (!inviteCode) return
    navigator.clipboard?.writeText(inviteCode)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const STATS = [
    {
      label: 'Total students',      val: summary.totalStudents ?? 0,
      Icon: IconStudents,           iconColor: '#7C3AED', iconBg: '#F3F0FF',
      delta: engRate > 0 ? `${engRate}% active this week` : null,
      deltaColor: '#7C3AED',
    },
    {
      label: 'Active this week',    val: activeStudents.length,
      Icon: IconActive,             iconColor: '#1264E5', iconBg: '#EBF1FE',
      delta: summary.totalStudents > 0 ? `of ${summary.totalStudents} enrolled` : null,
      deltaColor: '#1264E5',
    },
    {
      label: 'Average accuracy',
      val: avgAcc != null ? `${avgAcc}%` : '—',
      Icon: IconAccuracy,           iconColor: '#059669', iconBg: '#ECFDF5',
      delta: avgAcc != null
        ? avgAcc >= 70 ? 'Above target ✓' : avgAcc >= 45 ? 'Approaching target' : 'Below target'
        : null,
      deltaColor: avgAcc != null ? (avgAcc >= 70 ? '#059669' : avgAcc >= 45 ? '#d97706' : '#dc2626') : '#b0bada',
    },
    {
      label: 'Questions this week', val: (summary.totalQuestionsThisWeek || 0).toLocaleString(),
      Icon: IconQuestions,          iconColor: '#d97706', iconBg: '#FEF3C7',
      delta: summary.totalQuestionsThisWeek > 0 ? `across ${activeStudents.length} active student${activeStudents.length !== 1 ? 's' : ''}` : null,
      deltaColor: '#d97706',
    },
  ]

  return (
    <div className="sd-content">

      {/* ── Header ── */}
      <div className="sd-page-header">
        <div>
          <div className="sd-page-title">
            {getGreeting()}{adminName ? `, ${(() => { const parts = adminName.trim().split(/\s+/); const first = parts[0] ?? ''; return (first.endsWith('.') && parts.length > 1) ? parts[1] : first; })()}` : ''}! 👋
          </div>
          <div className="sd-page-sub">
            {summary.totalStudents > 0
              ? `${activeStudents.length} of ${summary.totalStudents} students active this week.`
              : 'Set up your cohort to start tracking students.'}
          </div>
        </div>
        <button onClick={() => goTab('cohort')} style={{
          display:'flex', alignItems:'center', gap:8, padding:'11px 20px',
          borderRadius:13, background:'#1264E5', color:'#fff', border:'none',
          fontSize:13, fontWeight:800, cursor:'pointer',
          boxShadow:'0 4px 14px rgba(18,100,229,.3)',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Invite students
        </button>
      </div>

      {/* ── At-risk banner (uses atRiskSegmented — was never shown before) ── */}
      {atRiskSegmented.length > 0 && (
        <div style={{
          background:'#FFFBEB', border:'1px solid #fde68a', borderRadius:14,
          padding:'12px 18px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap',
        }}>
          <span style={{ fontSize:20 }}>⚠️</span>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#92400e' }}>
              {atRiskSegmented.length} student{atRiskSegmented.length !== 1 ? 's' : ''} need attention
            </div>
            <div style={{ fontSize:11, color:'#b45309', marginTop:2 }}>
              {[
                atRiskSegmented.filter(s => s.tier === 'dropped').length    > 0 ? `${atRiskSegmented.filter(s => s.tier === 'dropped').length} dropped off this week`    : null,
                atRiskSegmented.filter(s => s.tier === 'inactive').length   > 0 ? `${atRiskSegmented.filter(s => s.tier === 'inactive').length} long-term inactive`         : null,
                atRiskSegmented.filter(s => s.tier === 'struggling').length > 0 ? `${atRiskSegmented.filter(s => s.tier === 'struggling').length} active but struggling`     : null,
              ].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button onClick={() => goTab('students')} className="view-btn">View students →</button>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="stat-grid">
        {STATS.map(({ label, val, Icon, iconColor, iconBg, delta, deltaColor }) => (
          <div key={label} className="stat-card">
            <div className="stat-badge" style={{ background: iconBg }}><Icon c={iconColor}/></div>
            <div className="stat-val">{val}</div>
            <div className="stat-label">{label}</div>
            {delta && <div className="stat-delta" style={{ color: deltaColor }}>{delta}</div>}
          </div>
        ))}
      </div>

      {/* ── Three-column grid ── */}
      <div className="ov-grid">

        {/* Left — weekly bar chart */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Weekly activity</div>
              <div className="panel-sub">Active students per week</div>
            </div>
            <span style={{ fontSize:10, fontWeight:700, color:'#b0bada', background:'#f4f7ff', padding:'4px 10px', borderRadius:8 }}>
              Last {bars.length} weeks
            </span>
          </div>

          {bars.length ? (
            <>
              <div className="bars">
                {bars.map((w, i) => {
                  const h    = Math.max(6, Math.round(((w.active || 0) / maxBar) * 96))
                  const last = i === bars.length - 1
                  return (
                    <div key={i} className="bar-col">
                      <div className="bar-val"  style={{ color: last ? '#1264E5' : '#b0bada' }}>{w.active || 0}</div>
                      <div className="bar-rect" style={{ height: h, background: last ? '#1264E5' : '#D0DCF9' }}/>
                      <div className="bar-label" style={{ color: last ? '#1264E5' : '#b0bada', fontWeight: last ? 700 : 500 }}>{w.label}</div>
                    </div>
                  )
                })}
              </div>
              {summary.totalStudents > 0 && (
                <div style={{ padding:'0 20px 16px' }}>
                  <div style={{
                    fontSize:11, fontWeight:700, padding:'7px 12px', borderRadius:10,
                    color:   engRate >= 60 ? '#059669' : engRate >= 30 ? '#d97706' : '#dc2626',
                    background: engRate >= 60 ? '#ECFDF5' : engRate >= 30 ? '#FFFBEB' : '#FEF2F2',
                  }}>
                    {engRate >= 60 ? `↑ ${engRate}% active — great engagement.`
                      : engRate >= 30 ? `${engRate}% engagement — encourage more practice.`
                      : `Only ${engRate}% active this week — students need a push.`}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ height:110, display:'flex', alignItems:'center', justifyContent:'center', color:'#b0bada', fontSize:12, padding:'0 20px' }}>
              No activity data yet
            </div>
          )}
        </div>

        {/* Middle — subject performance */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Subject performance</div>
              <div className="panel-sub">Cohort accuracy · last 30 days</div>
            </div>
            <button className="view-btn" onClick={() => goTab('performance')}>Full report</button>
          </div>

          {subjectTopics.length ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 20px 4px' }}>
                <DonutChart value={avgAcc} color={avgAcc != null ? perfCol(avgAcc) : '#b0bada'} bg="#EEF2FF"/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, color:'#b0bada', marginBottom:6 }}>Overall cohort accuracy</div>
                  <div style={{ fontSize:22, fontWeight:800, color: avgAcc != null ? perfCol(avgAcc) : '#b0bada', letterSpacing:'-.03em' }}>
                    {avgAcc != null ? `${avgAcc}%` : '—'}
                  </div>
                  {avgAcc != null && (
                    <span className="badge" style={{ background: perfBg(avgAcc), color: perfCol(avgAcc), marginTop:6 }}>
                      {perfLabel(avgAcc)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ padding:'4px 0 8px' }}>
                {subjectTopics.slice(0, 4).map(s => (
                  <div key={s.subjectName} className="subj-row">
                    <div className="subj-icon" style={{ background: sBg(s.subjectName) }}>{sIcon(s.subjectName)}</div>
                    <div className="subj-name">{s.subjectName.replace('English Language','English').replace('Further Mathematics','Further Maths')}</div>
                    <div className="subj-bar-wrap"><div className="subj-bar" style={{ width:`${Math.min(100, s.accuracy ?? 0)}%`, background: perfCol(s.accuracy) }}/></div>
                    <div className="subj-pct" style={{ color: perfCol(s.accuracy) }}>{pct(s.accuracy)}</div>
                  </div>
                ))}
                {subjectTopics.length > 4 && (
                  <button onClick={() => goTab('performance')} style={{ display:'block', width:'100%', padding:'9px 20px', background:'none', border:'none', borderTop:'1px solid #f4f7ff', fontSize:11, fontWeight:700, color:'#1264E5', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
                    + {subjectTopics.length - 4} more subjects →
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding:'40px 20px', textAlign:'center', color:'#b0bada', fontSize:12 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>📊</div>
              No practice data yet
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="ov-sidebar">

          {/* Invite code card */}
          <div className="invite-card">
            <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,.6)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:4 }}>
              Student invite code
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:'#fff', lineHeight:1.4 }}>
              {inviteCode ? 'Share this code with your students' : 'Create a cohort to get your invite code'}
            </div>
            {inviteCode ? (
              <>
                <div className="invite-code-box">{inviteCode}</div>
                <button className="invite-copy-btn" onClick={copyCode}>{copied ? '✓ Copied!' : 'Copy code'}</button>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', marginTop:8, lineHeight:1.5 }}>
                  Students: ExamPrep → Profile → Connect school → Enter code
                </div>
              </>
            ) : (
              <button onClick={() => goTab('cohort')} className="invite-copy-btn" style={{ marginTop:14 }}>
                Create cohort →
              </button>
            )}
          </div>

          {/* Needs attention */}
          {attn.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Needs attention</div>
                  <div className="panel-sub">{attn.length} student{attn.length !== 1 ? 's' : ''} flagged</div>
                </div>
                <button className="view-btn" onClick={() => goTab('students')}>View all</button>
              </div>
              {attn.map((s, i) => {
                const d      = s.daysSinceLastPractice ?? 999
                const reason = d >= 14 ? `${d}d inactive` : `${pct(s.accuracy)} accuracy`
                const rc     = statusOf(s)
                return (
                  <div key={s.id} className="attn-row" style={{ borderTop: i === 0 ? 'none' : '1px solid #f4f7ff' }}>
                    <div className="attn-av" style={{ background: avColor(s.full_name) }}>{initials(s.full_name)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#071B49', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.full_name}</div>
                      <div style={{ fontSize:10, color:'#b0bada', marginTop:1 }}>{reason}</div>
                    </div>
                    <span className="badge" style={{ background:rc.bg, color:rc.c, border:`1px solid ${rc.border}` }}>{rc.l}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Student snapshot ── */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Top students</div>
            <div className="panel-sub">By questions answered · last 30 days</div>
          </div>
          <button className="view-btn" onClick={() => goTab('students')}>View all</button>
        </div>

        {topStudents.length ? (
          <>
            <div className="th-row" style={{ gridTemplateColumns:'1fr 90px 90px 90px 80px' }}>
              <div className="th" style={{ textAlign:'left' }}>Student</div>
              <div className="th">Questions</div>
              <div className="th">Accuracy</div>
              <div className="th">Last active</div>
              <div className="th">Status</div>
            </div>
            {topStudents.map(s => {
              const st = statusOf(s)
              return (
                <div key={s.id} className="st-row" style={{ gridTemplateColumns:'1fr 90px 90px 90px 80px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                    <div className="st-av" style={{ background: avColor(s.full_name) }}>{initials(s.full_name)}</div>
                    <div style={{ minWidth:0 }}>
                      <div className="st-name">{s.full_name}</div>
                      <div className="st-sub">{s.exam_type ?? ''}</div>
                    </div>
                  </div>
                  <div className="st-center">{(s.total || 0).toLocaleString()}</div>
                  <div className="st-center" style={{ color: s.accuracy != null ? perfCol(s.accuracy) : '#b0bada', fontWeight:700 }}>{pct(s.accuracy)}</div>
                  <div className="st-center" style={{ fontSize:11, color:'#8896b3' }}>{lastLabel(s.daysSinceLastPractice)}</div>
                  <div style={{ display:'flex', justifyContent:'center' }}>
                    <span className="badge" style={{ background:st.bg, color:st.c, border:`1px solid ${st.border}` }}>{st.l}</span>
                  </div>
                </div>
              )
            })}
          </>
        ) : (
          <div style={{ padding:'40px 20px', textAlign:'center', color:'#b0bada', fontSize:12 }}>
            <div style={{ fontSize:32, marginBottom:10 }}>👥</div>
            Students will appear here once they join and start practising.
          </div>
        )}
      </div>
    </div>
  )
}
'use client'
// src/app/school/dashboard/page.js
// Full redesign — inspired by the reference dashboard.
// Tab state lives in URL: /school/dashboard?tab=overview

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
function pct(n) { return n == null ? '—' : `${n}%` }
function pctColor(n) {
  if (n == null) return { fg: DIM,     bg: '#f4f7ff', border: BORDER,    label: '—'      }
  if (n >= 70)   return { fg: EMERALD, bg: '#ecfdf5', border: '#a7f3d0', label: 'Strong' }
  if (n >= 45)   return { fg: AMBER,   bg: '#fffbeb', border: '#fde68a', label: 'Fair'   }
  return               { fg: RED,     bg: '#fef2f2', border: '#fecaca', label: 'Weak'   }
}
function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
function firstName(name) { return (name ?? '').split(' ')[0] || 'there' }

// ── Primitives ────────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: TEXT, letterSpacing: '-.02em', margin: 0 }}>{children}</h2>
      {action}
    </div>
  )
}

function ViewAll({ onClick }) {
  return (
    <button onClick={onClick} style={{ fontSize: 12, fontWeight: 700, color: BLUE, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      View all
    </button>
  )
}

function AccBar({ pct: p, height = 6, color }) {
  const c = color ?? pctColor(p).fg
  return (
    <div style={{ height, background: BG, borderRadius: 99, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
      <div style={{ height: '100%', width: `${Math.min(100, p ?? 0)}%`, background: c, borderRadius: 99, transition: 'width .7s ease' }}/>
    </div>
  )
}

function Badge({ children, color = DIM, bg = BG, border = BORDER }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: bg, color, border: `1px solid ${border}`, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function FieldLabel({ children, hint }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TEXT }}>{children}</label>
      {hint && <p style={{ fontSize: 11, color: DIM, marginTop: 2 }}>{hint}</p>}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, autoFocus }) {
  return (
    <input value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus}
      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 13, color: TEXT, background: CARD, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color .15s' }}
    />
  )
}

function Btn({ children, onClick, disabled, loading, variant = 'primary', small = false }) {
  const styles = {
    primary:   { bg: BLUE,    color: '#fff', border: 'none' },
    emerald:   { bg: EMERALD, color: '#fff', border: 'none' },
    navy:      { bg: NAVY,    color: '#fff', border: 'none' },
    outline:   { bg: 'transparent', color: DIM, border: `1px solid ${BORDER}` },
    danger:    { bg: RED,     color: '#fff', border: 'none' },
  }
  const s = styles[variant] ?? styles.primary
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      padding: small ? '7px 14px' : '10px 18px',
      borderRadius: 10, border: s.border,
      background: (disabled || loading) ? '#e2e8f0' : s.bg,
      color: (disabled || loading) ? DIM : s.color,
      fontSize: small ? 12 : 13, fontWeight: 700,
      cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap',
    }}>
      {loading ? 'Loading…' : children}
    </button>
  )
}

// ── Stat card (top row) ───────────────────────────────────────────────────────
const STAT_THEMES = {
  blue:    { icon: '👥', iconBg: 'rgba(18,100,229,.1)',   iconColor: BLUE    },
  orange:  { icon: '🔥', iconBg: 'rgba(234,88,12,.1)',    iconColor: '#ea580c' },
  green:   { icon: '🎯', iconBg: 'rgba(5,150,105,.1)',    iconColor: EMERALD },
  purple:  { icon: '✏️', iconBg: 'rgba(124,58,237,.1)',   iconColor: '#7c3aed' },
}

function StatCard({ label, value, sub, delta, theme = 'blue', icon }) {
  const t = STAT_THEMES[theme] ?? STAT_THEMES.blue
  const positive = delta != null && delta > 0
  return (
    <Card style={{ padding: '18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: t.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>
          {icon ?? t.icon}
        </div>
      </div>
      <p style={{ fontSize: 28, fontWeight: 900, color: TEXT, lineHeight: 1, letterSpacing: '-.03em', marginBottom: 4 }}>{value ?? '—'}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: delta != null ? 6 : 0 }}>{label}</p>
      {delta != null && (
        <p style={{ fontSize: 11, fontWeight: 700, color: positive ? EMERALD : RED }}>
          {positive ? '↑' : '↓'} {Math.abs(delta)} {sub}
        </p>
      )}
      {sub && delta == null && <p style={{ fontSize: 11, color: FAINT }}>{sub}</p>}
    </Card>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ adminName, cohort, onInvite }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: '-.03em', margin: 0 }}>
          {getGreeting()}, {firstName(adminName)}! 👋
        </h1>
        <p style={{ fontSize: 13, color: DIM, marginTop: 4 }}>
          Here's how your school is performing today.
        </p>
      </div>
      <button onClick={onInvite} style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '10px 18px', borderRadius: 11,
        background: BLUE, color: '#fff', border: 'none',
        fontSize: 13, fontWeight: 800, cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(18,100,229,.3)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 15 }}>+</span> Invite Students
      </button>
    </div>
  )
}

// ── Weekly engagement sparkline ───────────────────────────────────────────────
function SparkLine({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.active), 1)
  const W = 260, H = 80
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (W - 20) + 10
    const y = H - 10 - ((d.active / max) * (H - 20))
    return [x, y]
  })
  const pathD = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  const areaD = `${pathD} L${pts[pts.length-1][0]},${H} L${pts[0][0]},${H} Z`
  const lastPt = pts[pts.length - 1]

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BLUE} stopOpacity=".2"/>
          <stop offset="100%" stopColor={BLUE} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkGrad)"/>
      <path d={pathD} stroke={BLUE} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 4 : 2.5}
          fill={i === pts.length - 1 ? BLUE : CARD}
          stroke={BLUE} strokeWidth="1.5"/>
      ))}
      {lastPt && (
        <g>
          <rect x={lastPt[0] - 20} y={lastPt[1] - 22} width={40} height={18} rx="5" fill={BLUE}/>
          <text x={lastPt[0]} y={lastPt[1] - 10} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="800">{data[data.length-1].active}</text>
        </g>
      )}
    </svg>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ data, adminName, onTabChange, onCohortCreated }) {
  const { summary, subjectTopics, weeklyEngagement, atRisk, atRiskSegmented, students, cohort } = data
  const engRate = summary.totalStudents > 0
    ? Math.round((summary.activeThisWeek / summary.totalStudents) * 100) : 0
  const streakLeaders = [...students].filter(s => s.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak).slice(0, 5)
  const topPerformers = [...students].filter(s => s.accuracy != null)
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0)).slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <Topbar adminName={adminName} cohort={cohort} onInvite={() => onTabChange('cohort')}/>

      {/* No cohort warning */}
      {!cohort && (
        <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a8f 100%)`, borderRadius: 16, padding: '20px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 900, marginBottom: 4 }}>Set up your first cohort</p>
            <p style={{ fontSize: 13, opacity: .8, lineHeight: 1.55 }}>Create a cohort to get an invite code and start tracking your students.</p>
          </div>
          <button onClick={() => onTabChange('cohort')} style={{ padding: '10px 20px', borderRadius: 10, background: '#fff', color: NAVY, fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            Create Cohort →
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }} className="stats-grid">
        <StatCard label="Total Students"   value={summary.totalStudents}   theme="blue"   delta={null} sub={null} />
        <StatCard label="Active This Week" value={summary.activeThisWeek}  theme="orange" delta={null} sub={`${engRate}% engagement`}/>
        <StatCard label="Avg Accuracy"     value={pct(summary.avgAccuracy)} theme="green" delta={null} sub="30-day average"/>
        <StatCard label="Questions Done"   value={summary.totalQuestionsThisWeek} theme="purple" delta={null} sub="this week"/>
      </div>

      {/* Two column: engagement chart + subject accuracy */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="two-col">

        {/* Engagement trend */}
        <Card style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>Activity Trend</p>
            <p style={{ fontSize: 11, color: DIM }}>Active students / week</p>
          </div>
          <p style={{ fontSize: 11, color: DIM, marginBottom: 16 }}>Last 4 weeks</p>
          <SparkLine data={weeklyEngagement}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {weeklyEngagement.map((w, i) => (
              <span key={i} style={{ fontSize: 9, color: FAINT }}>{w.label}</span>
            ))}
          </div>
        </Card>

        {/* Accuracy by subject */}
        <Card style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>Accuracy by Subject</p>
            <ViewAll onClick={() => onTabChange('topics')}/>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {subjectTopics.slice(0, 6).map(s => {
              const c = pctColor(s.accuracy)
              return (
                <div key={s.subjectName}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.fg, flexShrink: 0 }}/>
                      <span style={{ fontSize: 12, fontWeight: 600, color: SEC }}>{s.subjectName}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: c.fg }}>{pct(s.accuracy)}</span>
                  </div>
                  <AccBar pct={s.accuracy} height={6} color={c.fg}/>
                </div>
              )
            })}
            {subjectTopics.length === 0 && (
              <p style={{ fontSize: 12, color: DIM, textAlign: 'center', padding: '20px 0' }}>No practice data yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* Two column: at-risk + top performers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="two-col">

        {/* At-risk */}
        <Card>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>Needs Attention</p>
              <p style={{ fontSize: 11, color: DIM, marginTop: 2 }}>{atRiskSegmented?.length ?? 0} students flagged</p>
            </div>
            {(atRiskSegmented?.length ?? 0) > 0 && <ViewAll onClick={() => onTabChange('students')}/>}
          </div>
          <div>
            {!atRiskSegmented?.length ? (
              <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                <p style={{ fontSize: 24, marginBottom: 6 }}>✅</p>
                <p style={{ fontSize: 12, color: DIM }}>All students are on track</p>
              </div>
            ) : atRiskSegmented.slice(0, 5).map(({ id, tier }) => {
              const s = students.find(st => st.id === id)
              if (!s) return null
              const tierColors = {
                dropped:    { color: RED,   label: 'Dropped off' },
                inactive:   { color: DIM,   label: 'Inactive'    },
                struggling: { color: AMBER, label: 'Struggling'  },
              }
              const tc = tierColors[tier] ?? tierColors.inactive
              return (
                <div key={id} style={{ padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${BG}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: BG, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: tc.color, flexShrink: 0 }}>
                    {s.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.full_name}</p>
                    <p style={{ fontSize: 10, color: tc.color }}>{tc.label}</p>
                  </div>
                  {s.accuracy != null && <Badge color={pctColor(s.accuracy).fg} bg={pctColor(s.accuracy).bg} border={pctColor(s.accuracy).border}>{s.accuracy}%</Badge>}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Top performers */}
        <Card>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>Top Performers</p>
              <p style={{ fontSize: 11, color: DIM, marginTop: 2 }}>This week · by accuracy</p>
            </div>
            <ViewAll onClick={() => onTabChange('students')}/>
          </div>
          <div>
            {!topPerformers.length ? (
              <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: DIM }}>No data yet</p>
              </div>
            ) : topPerformers.map((s, i) => (
              <div key={s.id} style={{ padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < topPerformers.length - 1 ? `1px solid ${BG}` : 'none' }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: i === 0 ? '#FFB800' : i === 1 ? FAINT : FAINT, width: 18, textAlign: 'center', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${NAVY}, ${BLUE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {s.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.full_name}</p>
                  {s.currentStreak > 0 && <p style={{ fontSize: 10, color: '#ea580c' }}>{s.currentStreak}d streak 🔥</p>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 900, color: pctColor(s.accuracy).fg }}>{pct(s.accuracy)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Engagement status banner */}
      {summary.totalStudents > 0 && (() => {
        const c = engRate >= 60
          ? { bg: '#ecfdf5', border: '#a7f3d0', color: EMERALD, msg: `🎉 ${summary.activeThisWeek} of ${summary.totalStudents} students active this week — great engagement!` }
          : engRate >= 30
            ? { bg: '#fffbeb', border: '#fde68a', color: AMBER,   msg: `📢 ${summary.totalStudents - summary.activeThisWeek} students haven't studied this week — consider sending a reminder.` }
            : { bg: '#fef2f2', border: '#fecaca', color: RED,     msg: `⚠️ Only ${summary.activeThisWeek} of ${summary.totalStudents} students active — ${summary.totalStudents - summary.activeThisWeek} need a nudge.` }
        return (
          <div style={{ padding: '13px 18px', borderRadius: 12, background: c.bg, border: `1px solid ${c.border}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: c.color }}>{c.msg}</p>
          </div>
        )
      })()}
    </div>
  )
}

// ── Students tab ──────────────────────────────────────────────────────────────
function StudentsTab({ students, atRisk, atRiskSegmented }) {
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('all')
  const [sortBy,     setSortBy]     = useState('name')
  const [expandedId, setExpandedId] = useState(null)

  const segMap = {}
  for (const s of atRiskSegmented ?? []) segMap[s.id] = s.tier

  const tierLabel = { dropped: 'Dropped off', inactive: 'Inactive', struggling: 'Struggling' }
  const tierColor = { dropped: RED, inactive: DIM, struggling: AMBER }

  const filtered = students
    .filter(s => {
      if (filter === 'at_risk')    return atRisk.includes(s.id)
      if (filter === 'active')     return s.isActiveThisWeek
      if (filter === 'inactive')   return !s.isActiveThisWeek
      return true
    })
    .filter(s => !search || s.full_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'accuracy') return (b.accuracy ?? -1) - (a.accuracy ?? -1)
      if (sortBy === 'streak')   return b.currentStreak - a.currentStreak
      return (a.full_name ?? '').localeCompare(b.full_name ?? '')
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionTitle>{students.length} Students</SectionTitle>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
          style={{ flex: 1, minWidth: 180, padding: '9px 13px', borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 13, color: TEXT, background: CARD, outline: 'none', fontFamily: 'inherit' }}/>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'all',      label: `All (${students.length})` },
            { id: 'at_risk',  label: `⚠ At risk (${atRisk.length})` },
            { id: 'active',   label: 'Active' },
            { id: 'inactive', label: 'Inactive' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '8px 12px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${filter === f.id ? NAVY : BORDER}`,
              background: filter === f.id ? NAVY : CARD,
              color: filter === f.id ? '#fff' : DIM,
              transition: 'all .15s',
            }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <span style={{ fontSize: 11, color: DIM, alignSelf: 'center' }}>Sort:</span>
          {[{ id:'name',l:'Name'},{ id:'accuracy',l:'Accuracy'},{ id:'streak',l:'Streak'}].map(s => (
            <button key={s.id} onClick={() => setSortBy(s.id)} style={{
              padding: '6px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              background: sortBy === s.id ? BG : 'transparent',
              color: sortBy === s.id ? TEXT : DIM,
            }}>
              {s.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px', gap: 8, padding: '8px 16px', background: BG, borderRadius: 10, border: `1px solid ${BORDER}` }}>
        {['Student', 'Accuracy', 'Streak', 'Questions', 'Status'].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 800, color: FAINT, textTransform: 'uppercase', letterSpacing: '.08em', textAlign: h === 'Student' ? 'left' : 'center' }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.length === 0 && (
          <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 24, marginBottom: 8 }}>👥</p>
            <p style={{ fontSize: 13, color: DIM }}>No students match</p>
          </Card>
        )}
        {filtered.map(s => {
          const c      = pctColor(s.accuracy)
          const tier   = segMap[s.id]
          const isOpen = expandedId === s.id
          return (
            <div key={s.id}>
              <button onClick={() => setExpandedId(isOpen ? null : s.id)} style={{
                width: '100%', display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px',
                gap: 8, padding: '12px 16px', alignItems: 'center',
                background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
                cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s',
                borderColor: isOpen ? BLUE : BORDER,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: BG, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: TEXT, flexShrink: 0 }}>
                    {s.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.full_name}</p>
                    {tier && <p style={{ fontSize: 10, color: tierColor[tier] }}>{tierLabel[tier]}</p>}
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: c.fg, textAlign: 'center' }}>{pct(s.accuracy)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.currentStreak > 0 ? '#ea580c' : DIM, textAlign: 'center' }}>
                  {s.currentStreak > 0 ? `${s.currentStreak}d 🔥` : '—'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: SEC, textAlign: 'center' }}>{s.total ?? 0}</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Badge color={s.isActiveThisWeek ? EMERALD : DIM} bg={s.isActiveThisWeek ? '#ecfdf5' : BG} border={s.isActiveThisWeek ? '#a7f3d0' : BORDER}>
                    {s.isActiveThisWeek ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </button>

              {isOpen && (
                <div style={{ margin: '2px 0 6px 0', padding: '14px 16px', background: BG, border: `1px solid ${BLUE}`, borderRadius: '0 0 12px 12px', borderTop: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {[
                      { l: 'Accuracy',  v: pct(s.accuracy),       color: c.fg },
                      { l: 'Streak',    v: s.currentStreak > 0 ? `${s.currentStreak}d` : '—', color: '#ea580c' },
                      { l: 'Time / Q',  v: s.avgTimeSecs != null ? (s.avgTimeSecs >= 60 ? `${Math.floor(s.avgTimeSecs/60)}m${s.avgTimeSecs%60}s` : `${s.avgTimeSecs}s`) : '—', color: s.avgTimeSecs > 90 ? RED : EMERALD },
                      { l: 'Questions', v: s.total ?? 0,           color: BLUE },
                    ].map(stat => (
                      <div key={stat.l} style={{ background: CARD, borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: `1px solid ${BORDER}` }}>
                        <p style={{ fontSize: 16, fontWeight: 900, color: stat.color }}>{stat.v}</p>
                        <p style={{ fontSize: 9, color: DIM, marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>{stat.l}</p>
                      </div>
                    ))}
                  </div>
                  {Object.entries(s.subjectAcc ?? {}).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p style={{ fontSize: 10, fontWeight: 800, color: FAINT, textTransform: 'uppercase', letterSpacing: '.08em' }}>Subject accuracy</p>
                      {Object.entries(s.subjectAcc ?? {}).map(([sub, sa]) => {
                        const sacc = sa.total > 0 ? Math.round((sa.correct / sa.total) * 100) : null
                        const sc   = pctColor(sacc)
                        return (
                          <div key={sub} style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, padding: '9px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: SEC }}>{sub}</p>
                              <span style={{ fontSize: 12, fontWeight: 800, color: sc.fg }}>{pct(sacc)}</span>
                            </div>
                            <AccBar pct={sacc} height={4} color={sc.fg}/>
                            <p style={{ fontSize: 9, color: DIM, marginTop: 3 }}>{sa.total} attempts</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Topics tab ────────────────────────────────────────────────────────────────
function TopicsTab({ subjectTopics }) {
  const [selected, setSelected] = useState(subjectTopics[0]?.subjectName ?? '')
  const subject = subjectTopics.find(s => s.subjectName === selected)

  if (!subjectTopics.length) return (
    <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 36, marginBottom: 10 }}>📚</p>
      <p style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 4 }}>No topic data yet</p>
      <p style={{ fontSize: 12, color: DIM }}>Topic performance appears once students start practising</p>
    </Card>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionTitle>Topic Mastery <span style={{ fontSize: 12, fontWeight: 500, color: DIM }}>· weakest first · last 30 days</span></SectionTitle>

      {/* Subject tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {subjectTopics.map(s => {
          const on = selected === s.subjectName
          const c  = pctColor(s.accuracy)
          return (
            <button key={s.subjectName} onClick={() => setSelected(s.subjectName)} style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', border: `1.5px solid ${on ? NAVY : BORDER}`,
              background: on ? NAVY : CARD, color: on ? '#fff' : SEC,
              transition: 'all .15s',
            }}>
              {s.subjectName}
              {s.accuracy != null && (
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: on ? 'rgba(255,255,255,.2)' : c.bg, color: on ? '#fff' : c.fg }}>
                  {s.accuracy}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Subject summary banner */}
      {subject && (() => {
        const c = pctColor(subject.accuracy)
        return (
          <div style={{ padding: '14px 18px', borderRadius: 14, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{subject.subjectName}</p>
              <p style={{ fontSize: 12, color: DIM }}>{subject.topics.length} topics · {subject.topics.reduce((a,t) => a+t.total, 0)} attempts</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 26, fontWeight: 900, color: c.fg, letterSpacing: '-.03em' }}>{pct(subject.accuracy)}</p>
              <p style={{ fontSize: 10, color: DIM }}>class average</p>
            </div>
          </div>
        )
      })()}

      {/* Topic cards */}
      {subject && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {subject.topics.map(t => {
            const c = pctColor(t.accuracy)
            return (
              <div key={t.topicId} style={{ background: CARD, borderRadius: 12, border: `1px solid ${c.border}`, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{t.topicName}</p>
                    <p style={{ fontSize: 11, color: DIM, marginTop: 1 }}>{t.total} attempts · {t.correct} correct</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Badge color={c.fg} bg={c.bg} border={c.border}>{c.label}</Badge>
                    <span style={{ fontSize: 15, fontWeight: 900, color: c.fg }}>{t.accuracy}%</span>
                  </div>
                </div>
                <AccBar pct={t.accuracy} height={5} color={c.fg}/>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Cohort tab ────────────────────────────────────────────────────────────────
function CohortTab({ cohort, allCohorts, totalStudents, onCohortCreated }) {
  const [copied,  setCopied]  = useState(false)
  const [showNew, setShowNew] = useState(!cohort)

  // Cohort create form state
  const [cohortName,    setCohortName]    = useState('')
  const [cohortSession, setCohortSession] = useState('')
  const [saving,        setSaving]        = useState(false)
  const [saveError,     setSaveError]     = useState(null)

  function copyCode() {
    if (!cohort) return
    navigator.clipboard.writeText(cohort.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCreate() {
    if (!cohortName.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const res  = await fetch('/api/school/cohort', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cohortName.trim(), session: cohortSession.trim() }),
      })
      const data = await res.json()
      if (data.error) { setSaveError(data.error); return }
      onCohortCreated?.(data.cohort)
      setShowNew(false)
      setCohortName('')
      setCohortSession('')
    } catch { setSaveError('Failed — try again') }
    finally  { setSaving(false) }
  }

  const currentYear   = new Date().getFullYear()
  const sessionSuggest = `${currentYear}/${currentYear + 1}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
      <SectionTitle>Cohort Management</SectionTitle>

      {/* Active cohort */}
      {cohort && (
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 900, color: TEXT }}>{cohort.name}</p>
              {cohort.session && <p style={{ fontSize: 12, color: DIM, marginTop: 2 }}>{cohort.session}</p>}
            </div>
            <Badge color={EMERALD} bg="#ecfdf5" border="#a7f3d0">Active</Badge>
          </div>

          <div style={{ padding: '24px 20px', background: `linear-gradient(135deg, #ecfdf5, #f0fdfa)`, textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: EMERALD, marginBottom: 10 }}>
              Student Invite Code
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 }}>
              <p style={{ fontSize: 44, fontWeight: 900, color: '#065f46', letterSpacing: '.35em', fontFamily: 'monospace' }}>
                {cohort.invite_code}
              </p>
              <button onClick={copyCode} style={{
                padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                border: '1.5px solid #a7f3d0', background: copied ? '#ecfdf5' : CARD, color: EMERALD, transition: 'all .15s',
              }}>
                {copied ? '✓ Copied!' : 'Copy code'}
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#6ee7b7' }}>
              Students enter this code in ExamPrep → Profile → Connect your school
            </p>
          </div>

          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, color: SEC }}>
              <strong style={{ color: TEXT }}>{totalStudents}</strong> student{totalStudents !== 1 ? 's' : ''} joined
            </p>
            <button
              onClick={() => {
                const link = `${window.location.origin}/join/${cohort.invite_code}`
                if (navigator.share) navigator.share({ title: `Join ${cohort.name} on ExamPrep`, url: link })
                else { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) }
              }}
              style={{ padding: '9px 16px', borderRadius: 10, background: EMERALD, color: '#fff', fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer' }}
            >
              📤 Share invite link
            </button>
          </div>
        </Card>
      )}

      {/* Create new cohort */}
      <Card>
        <button
          onClick={() => setShowNew(o => !o)}
          style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>
              {cohort ? 'Create a new cohort' : 'Create your first cohort'}
            </p>
            <p style={{ fontSize: 12, color: DIM, marginTop: 2 }}>
              {cohort ? `Archives "${cohort.name}" and starts fresh` : 'Get an invite code for your students'}
            </p>
          </div>
          <span style={{ fontSize: 18, color: DIM, transform: showNew ? 'rotate(45deg)' : 'none', transition: 'transform .2s', display: 'inline-block' }}>+</span>
        </button>

        {showNew && (
          <div style={{ borderTop: `1px solid ${BORDER}`, padding: '20px' }}>
            {cohort && (
              <div style={{ padding: '11px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: AMBER }}>⚠ Heads up</p>
                <p style={{ fontSize: 12, color: AMBER, marginTop: 3, lineHeight: 1.55 }}>
                  "{cohort.name}" will be archived when you create a new cohort. All student data is kept — they just won't appear in the new cohort unless they rejoin.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <FieldLabel hint="e.g. SS3 Science, Year 11 Arts, WAEC Prep Class">Cohort name *</FieldLabel>
                <TextInput
                  value={cohortName}
                  onChange={e => setCohortName(e.target.value)}
                  placeholder="e.g. SS3 Science 2026"
                  autoFocus
                />
              </div>

              <div>
                <FieldLabel hint={`The academic session this cohort covers. e.g. ${sessionSuggest}`}>
                  Academic session <span style={{ fontWeight: 500, color: FAINT }}>(optional)</span>
                </FieldLabel>
                <TextInput
                  value={cohortSession}
                  onChange={e => setCohortSession(e.target.value)}
                  placeholder={`e.g. ${sessionSuggest}`}
                />
              </div>

              {saveError && (
                <p style={{ fontSize: 12, color: RED, padding: '10px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>{saveError}</p>
              )}

              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <Btn variant="outline" onClick={() => { setShowNew(false); setSaveError(null) }}>Cancel</Btn>
                <Btn variant="emerald" onClick={handleCreate} loading={saving} disabled={!cohortName.trim()}>
                  Create cohort →
                </Btn>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Past cohorts */}
      {allCohorts.filter(c => !c.is_active).length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: DIM, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Past Cohorts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {allCohorts.filter(c => !c.is_active).map(c => (
              <div key={c.id} style={{ padding: '12px 16px', background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: SEC }}>{c.name}</p>
                  {c.session && <p style={{ fontSize: 11, color: DIM }}>{c.session}</p>}
                </div>
                <span style={{ fontSize: 12, color: FAINT, fontFamily: 'monospace' }}>{c.invite_code}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Reports tab ───────────────────────────────────────────────────────────────
function ReportsTab({ schoolName }) {
  const [generating, setGenerating] = useState(null)
  const [period,     setPeriod]     = useState('month')

  async function generatePDF(type) {
    setGenerating(type)
    try {
      const res  = await fetch(`/api/school/report?type=${type}&period=${period}`)
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      const html   = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{margin:20mm}body{font-family:system-ui,sans-serif;font-size:12px;color:#111}*{box-sizing:border-box}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><h1>${data.schoolName ?? schoolName}</h1><p>${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p></body></html>`
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:210mm;height:297mm;border:none;'
      document.body.appendChild(iframe)
      iframe.contentDocument.write(html)
      iframe.contentDocument.close()
      setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 2000) }, 600)
    } catch { alert('Failed to generate report') }
    finally { setGenerating(null) }
  }

  async function downloadCSV() {
    setGenerating('csv')
    try {
      const res  = await fetch(`/api/school/report?type=students&period=${period}&format=csv`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `students_${period}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Download failed') }
    finally { setGenerating(null) }
  }

  const REPORTS = [
    { type: 'management', label: 'Management Report',   sub: 'Executive summary for school board or principal', icon: '📊', color: NAVY    },
    { type: 'subjects',   label: 'Subject Report',      sub: 'Per-subject topic breakdown for class teachers',  icon: '📚', color: EMERALD },
    { type: 'students',   label: 'Student Progress',    sub: 'Individual student table — accuracy, streak, lessons', icon: '👥', color: BLUE },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
      <SectionTitle>Reports & Exports</SectionTitle>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: DIM }}>Period:</p>
        {[{ id:'week', l:'Last 7 days' },{ id:'month', l:'Last 30 days' }].map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)} style={{
            padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${BORDER}`, background: period === p.id ? NAVY : CARD,
            color: period === p.id ? '#fff' : DIM, transition: 'all .15s',
          }}>
            {p.l}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {REPORTS.map(r => (
          <div key={r.type} style={{ padding: '16px 18px', borderRadius: 14, background: CARD, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 26, flexShrink: 0 }}>{r.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>{r.label}</p>
              <p style={{ fontSize: 11, color: DIM, marginTop: 2 }}>{r.sub}</p>
            </div>
            <button onClick={() => generatePDF(r.type)} disabled={!!generating} style={{
              padding: '9px 16px', borderRadius: 10, background: r.color, color: '#fff',
              fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer',
              opacity: generating ? .4 : 1, flexShrink: 0,
            }}>
              {generating === r.type ? '…' : '⬇ PDF'}
            </button>
          </div>
        ))}
        <div style={{ padding: '16px 18px', borderRadius: 14, background: CARD, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>Export to CSV</p>
            <p style={{ fontSize: 11, color: DIM, marginTop: 2 }}>Open in Excel, Google Sheets, or Numbers</p>
          </div>
          <button onClick={downloadCSV} disabled={!!generating} style={{
            padding: '9px 16px', borderRadius: 10, background: TEXT, color: '#fff',
            fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer', opacity: generating ? .4 : 1,
          }}>
            {generating === 'csv' ? '…' : '⬇ CSV'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Settings tab ──────────────────────────────────────────────────────────────
function SettingsTab({ school, onSaved }) {
  const [name,    setName]    = useState(school?.name    ?? '')
  const [city,    setCity]    = useState(school?.city    ?? '')
  const [state,   setState]   = useState(school?.state   ?? '')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState(null)

  const NIGERIAN_STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara']

  async function handleSave() {
    if (!name.trim()) { setError('School name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const res  = await fetch('/api/school/setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName: name.trim(), city: city.trim(), state }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onSaved?.({ name: name.trim(), city: city.trim(), state })
    } catch { setError('Failed to save — try again') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 560 }}>
      <SectionTitle>School Information</SectionTitle>

      <Card style={{ padding: '24px' }}>
        <p style={{ fontSize: 13, color: DIM, marginBottom: 24, lineHeight: 1.6 }}>
          Update your school's details. This information appears on reports and is visible to your students.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <FieldLabel hint="The official name of your school">School name *</FieldLabel>
            <TextInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Queen's College Lagos"/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel hint="City or town your school is in">City</FieldLabel>
              <TextInput value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Lagos"/>
            </div>
            <div>
              <FieldLabel>State</FieldLabel>
              <select value={state} onChange={e => setState(e.target.value)} style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${BORDER}`,
                fontSize: 13, color: state ? TEXT : DIM, background: CARD, outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}>
                <option value="">Select state</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: RED, padding: '10px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>{error}</p>
          )}

          {saved && (
            <p style={{ fontSize: 12, color: EMERALD, padding: '10px 12px', background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0' }}>
              ✓ School info saved successfully
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <Btn variant="navy" onClick={handleSave} loading={saving} disabled={!name.trim()}>
              Save changes
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ── Responsive grid CSS injected once ─────────────────────────────────────────
const GRID_CSS = `
  .stats-grid { grid-template-columns: repeat(4,1fr) !important; }
  .two-col    { grid-template-columns: 1fr 1fr !important; }
  @media (max-width: 900px) {
    .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
  }
  @media (max-width: 640px) {
    .stats-grid { grid-template-columns: 1fr 1fr !important; }
    .two-col    { grid-template-columns: 1fr !important; }
  }
`

// ── Main page ─────────────────────────────────────────────────────────────────
function DashboardInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const tab          = searchParams.get('tab') ?? 'overview'

  const supabase = createClient()
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [adminName, setAdminName] = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/school-login'); return }

    const [res, profileRes] = await Promise.all([
      fetch('/api/school/dashboard'),
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    ])

    const d = await res.json()
    if (d.error) { setError(d.error); setLoading(false); return }
    setData(d)
    setAdminName(profileRes.data?.full_name ?? '')
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { load() }, [load])

  function goTab(id) {
    const p = new URLSearchParams(searchParams)
    p.set('tab', id)
    router.push(`/school/dashboard?${p.toString()}`)
  }

  function handleCohortCreated(newCohort) {
    setData(prev => prev ? {
      ...prev, cohort: newCohort,
      allCohorts: [newCohort, ...(prev.allCohorts ?? [])],
      summary: { ...prev.summary, totalStudents: 0 },
    } : prev)
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: 14 }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', border: `3px solid ${EMERALD}`, borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }}/>
      <p style={{ fontSize: 13, color: DIM }}>Loading school data…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 16px', textAlign: 'center' }}>
      <div>
        <p style={{ fontSize: 36, marginBottom: 12 }}>⚠️</p>
        <p style={{ fontSize: 14, fontWeight: 700, color: SEC, marginBottom: 10 }}>{error}</p>
        <button onClick={load} style={{ color: EMERALD, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Try again</button>
      </div>
    </div>
  )

  const { cohort, allCohorts, summary, students, subjectTopics, weeklyEngagement, atRisk, atRiskSegmented, school } = data

  return (
    <>
      <style>{GRID_CSS}</style>
      {tab === 'overview'  && <OverviewTab  data={data} adminName={adminName} onTabChange={goTab} onCohortCreated={handleCohortCreated}/>}
      {tab === 'students'  && <StudentsTab  students={students} atRisk={atRisk} atRiskSegmented={atRiskSegmented ?? []}/>}
      {tab === 'topics'    && <TopicsTab    subjectTopics={subjectTopics}/>}
      {tab === 'cohort'    && <CohortTab    cohort={cohort} allCohorts={allCohorts} totalStudents={summary.totalStudents} onCohortCreated={handleCohortCreated}/>}
      {tab === 'reports'   && <ReportsTab   schoolName={school?.name ?? ''}/>}
      {tab === 'settings'  && <SettingsTab  school={school} onSaved={info => setData(d => d ? { ...d, school: { ...d.school, ...info } } : d)}/>}
    </>
  )
}

export default function SchoolDashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardInner/>
    </Suspense>
  )
}
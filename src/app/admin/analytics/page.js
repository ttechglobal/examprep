'use client'
// src/app/admin/analytics/page.js — v2
// Platform analytics: Overview, Engagement, Content, Retention.
// Period: 7d | 30d | 90d | 365d — all charts re-query on change.

import { useState, useEffect, useCallback } from 'react'

// ── Design tokens (match admin shell) ─────────────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GREEN  = '#10b981'
const ORANGE = '#f97316'
const PURPLE = '#7c3aed'
const RED    = '#ef4444'
const GOLD   = '#FFB800'
const TEAL   = '#0891b2'

const MODE_META = {
  topic:    { label: 'Topic Practice',   color: TEAL,   icon: '📋' },
  custom:   { label: 'Study Practice',   color: BLUE,   icon: '📖' },
  practice: { label: 'Study Practice',   color: BLUE,   icon: '📖' },
  quick5:   { label: 'Quick 5',          color: GREEN,  icon: '⚡' },
  timed:    { label: 'Speed Round',      color: ORANGE, icon: '⏱' },
  mock:     { label: 'Mock Exam',        color: PURPLE, icon: '📝' },
  battle:   { label: 'Battle',           color: RED,    icon: '⚔️' },
  unknown:  { label: 'Other',            color: '#94a3b8', icon: '•' },
}

const SUBJECT_COLORS = {
  'Chemistry':'#10b981','Physics':'#06b6d4','Biology':'#059669',
  'Mathematics':'#3b82f6','Further Mathematics':'#3b82f6',
  'English Language':'#8b5cf6','Use of English':'#8b5cf6',
  'Economics':'#f59e0b','Government':'#ef4444','Geography':'#14b8a6',
  'Literature in English':'#f9a8d4','Agricultural Science':'#86efac',
  'Commerce':'#818cf8','Accounting':'#fde68a',
}

function subjectColor(name) {
  return SUBJECT_COLORS[name] ?? '#6366f1'
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function fmtNum(n) {
  if (n == null) return '—'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000)    return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function fmtLabel(date, period) {
  if (!date) return ''
  if (period === '365d') {
    // date is YYYY-MM — show "Jan", "Feb" etc.
    const d = new Date(date + '-01')
    return d.toLocaleString('en-GB', { month: 'short' })
  }
  if (period === '90d') {
    // date is week start (Monday) — show "12 Aug"
    const d = new Date(date)
    return d.toLocaleString('en-GB', { day: 'numeric', month: 'short' })
  }
  // daily — show "Mon", "12"
  const d = new Date(date)
  return String(d.getDate())
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, pct, color = BLUE }) {
  const up   = pct > 0
  const zero = pct === 0 || pct == null
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>
          {icon}
        </div>
        {pct != null && (
          <span style={{ fontSize: 11, fontWeight: 800, color: zero ? '#94a3b8' : up ? GREEN : RED, background: zero ? '#f8fafc' : up ? '#f0fdf4' : '#fef2f2', border: `1px solid ${zero ? '#e2e8f0' : up ? '#bbf7d0' : '#fecaca'}`, borderRadius: 999, padding: '2px 8px' }}>
            {zero ? '—' : `${up ? '+' : ''}${pct}%`}
          </span>
        )}
      </div>
      <p style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-.03em', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginTop: 4 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

function BarChart({ data = [], color = BLUE, period, height = 80 }) {
  const max = Math.max(...data.map(d => d.count), 1)
  // Show a label every N bars depending on count
  const n = data.length
  const labelEvery = n <= 14 ? 1 : n <= 30 ? 3 : n <= 52 ? 4 : 2

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height }}>
        {data.map((d, i) => {
          const h = Math.max(2, Math.round((d.count / max) * (height - 4)))
          const isLast = i === data.length - 1
          return (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
              title={`${d.date}: ${d.count.toLocaleString()}`}>
              <div style={{ width: '100%', height: h, background: isLast ? color : `${color}55`, borderRadius: '2px 2px 0 0', transition: 'height .4s' }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, position: 'relative', height: 14 }}>
        {data.map((d, i) => {
          if (i % labelEvery !== 0 && i !== data.length - 1) return null
          const label = i === data.length - 1 ? 'Today' : fmtLabel(d.date, period)
          return (
            <div key={d.date} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HorizBar({ label, value, max, color, right }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', width: 130, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .6s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', width: 48, textAlign: 'right', flexShrink: 0 }}>{right}</span>
    </div>
  )
}

function SectionCard({ title, sub, children, right }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>{title}</p>
          {sub && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800, border: `1.5px solid ${active ? BLUE : '#e2e8f0'}`, background: active ? BLUE : '#fff', color: active ? '#fff' : '#64748b', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s' }}>
      {label}
    </button>
  )
}

function AccuracyBadge({ pct }) {
  const color = pct >= 70 ? GREEN : pct >= 45 ? ORANGE : RED
  return (
    <span style={{ fontSize: 11, fontWeight: 900, color, background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 999, padding: '2px 8px', flexShrink: 0 }}>
      {pct}% acc
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [period,  setPeriod]  = useState('30d')
  const [tab,     setTab]     = useState('overview')

  const load = useCallback((p) => {
    setLoading(true)
    setError(null)
    fetch(`/api/admin/analytics?period=${p}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load analytics'); setLoading(false) })
  }, [])

  useEffect(() => { load(period) }, [period, load])

  const PERIODS = [
    { key: '7d',   label: '7 days'  },
    { key: '30d',  label: '30 days' },
    { key: '90d',  label: '90 days' },
    { key: '365d', label: '1 year'  },
  ]

  const TABS = [
    { key: 'overview',   label: 'Overview'   },
    { key: 'engagement', label: 'Engagement' },
    { key: 'content',    label: 'Content'    },
  ]

  return (
    <div style={{ maxWidth: 960, fontFamily: 'inherit' }}>
      <style>{`* { box-sizing: border-box } @keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-.03em', marginBottom: 4 }}>Analytics</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Student engagement and platform health</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <Pill key={p.key} label={p.label} active={period === p.key} onClick={() => setPeriod(p.key)} />
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '10px 18px', fontSize: 13, fontWeight: 800, border: 'none', borderBottom: `2.5px solid ${tab === t.key ? BLUE : 'transparent'}`, background: 'transparent', color: tab === t.key ? BLUE : '#64748b', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '60px 0', justifyContent: 'center' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${BLUE}`, borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
          <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>Loading analytics…</span>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 32, marginBottom: 10 }}>⚠️</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{error}</p>
          <button onClick={() => load(period)} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: BLUE, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {!loading && !error && data && (
        <>
          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && <OverviewTab data={data} period={period} />}

          {/* ── ENGAGEMENT TAB ── */}
          {tab === 'engagement' && <EngagementTab data={data} period={period} />}

          {/* ── CONTENT TAB ── */}
          {tab === 'content' && <ContentTab data={data} period={period} />}
        </>
      )}
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ data, period }) {
  const { summary, charts } = data

  const periodLabel = { '7d': 'last 7 days', '30d': 'last 30 days', '90d': 'last 90 days', '365d': 'last year' }[period]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        <StatCard icon="👥" label="Total students"      value={fmtNum(summary.totalStudents)}       color={NAVY}   />
        <StatCard icon="✨" label="New students"         value={fmtNum(summary.newStudents)}         color={BLUE}   pct={summary.newStudentsPct} sub={`vs prior ${periodLabel}`} />
        <StatCard icon="🔥" label="Active students"      value={fmtNum(summary.uniqueActive)}        color={ORANGE} sub={`${summary.activeRate}% of all students`} />
        <StatCard icon="📝" label="Sessions completed"   value={fmtNum(summary.sessionsThisPeriod)}  color={PURPLE} pct={summary.sessionsPct} sub={`vs prior ${periodLabel}`} />
        <StatCard icon="✍️" label="Questions answered"   value={fmtNum(summary.attemptsThisPeriod)} color={TEAL}   />
        <StatCard icon="⏱" label="Avg session length"   value={fmtDuration(summary.avgDurationSecs)} color={GREEN} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <SectionCard
          title="Questions answered"
          sub={`Daily totals — ${periodLabel}`}
          right={<span style={{ fontSize: 18, fontWeight: 900, color: BLUE }}>{fmtNum(summary.attemptsThisPeriod)}</span>}
        >
          <BarChart data={charts.attempts} color={BLUE} period={period} />
        </SectionCard>

        <SectionCard
          title="New student signups"
          sub={`Daily totals — ${periodLabel}`}
          right={<span style={{ fontSize: 18, fontWeight: 900, color: GREEN }}>{fmtNum(summary.newStudents)}</span>}
        >
          <BarChart data={charts.signups} color={GREEN} period={period} />
        </SectionCard>
      </div>
    </div>
  )
}

// ── Engagement Tab ────────────────────────────────────────────────────────────
function EngagementTab({ data, period }) {
  const { modeBreakdown } = data
  const totalSessions = modeBreakdown.reduce((a, m) => a + m.sessions, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Mode breakdown */}
      <SectionCard title="Practice modes" sub="Which modes students use most">
        {modeBreakdown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>📊</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 }}>No session data yet for this period</p>
            <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
              Mode breakdown appears once students complete practice sessions.<br/>
              Make sure the <code style={{ fontSize: 11, background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>practice_sessions</code> migration has been applied in Supabase.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {modeBreakdown.map(m => {
              const meta = MODE_META[m.mode] ?? MODE_META.unknown
              const sharePct = totalSessions > 0 ? Math.round((m.sessions / totalSessions) * 100) : 0
              return (
                <div key={m.mode} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${meta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{meta.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AccuracyBadge pct={m.avg_accuracy} />
                        <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>{m.sessions.toLocaleString()} sessions</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${sharePct}%`, height: '100%', background: meta.color, borderRadius: 999, transition: 'width .6s ease' }} />
                    </div>
                    <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, display: 'block' }}>{sharePct}% of all sessions</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* Accuracy by mode — quick insight */}
      {modeBreakdown.length > 0 && (
        <SectionCard title="Accuracy by mode" sub="How well students perform in each mode">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {modeBreakdown.map(m => {
              const meta = MODE_META[m.mode] ?? MODE_META.unknown
              const col  = m.avg_accuracy >= 70 ? GREEN : m.avg_accuracy >= 45 ? ORANGE : RED
              return (
                <div key={m.mode} style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, marginBottom: 6 }}>{meta.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>{meta.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: col, letterSpacing: '-.02em', lineHeight: 1 }}>{m.avg_accuracy}%</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>avg accuracy</div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

// ── Content Tab ───────────────────────────────────────────────────────────────
function ContentTab({ data }) {
  const { summary, subjectBreakdown, topTopics, bottomTopics } = data
  const maxSubjectAttempts = Math.max(...(subjectBreakdown ?? []).map(s => s.attempts), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Content health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <StatCard icon="❓" label="Live questions"   value={fmtNum(summary.totalQuestions)}  color={PURPLE} />
        <StatCard icon="✅" label="Published lessons" value={fmtNum(summary.publishedLessons)} color={GREEN} />
      </div>

      {/* Subject breakdown */}
      <SectionCard title="Subject activity" sub="Attempts per subject — most active first">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(subjectBreakdown ?? []).map(s => (
            <HorizBar
              key={s.name}
              label={s.name}
              value={s.attempts}
              max={maxSubjectAttempts}
              color={subjectColor(s.name)}
              right={
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>{s.attempts.toLocaleString()}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: s.accuracy >= 70 ? GREEN : s.accuracy >= 45 ? ORANGE : RED }}>{s.accuracy}%</span>
                </span>
              }
            />
          ))}
          {!subjectBreakdown?.length && (
            <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No attempt data for this period.</p>
          )}
        </div>
      </SectionCard>

      {/* Best and worst topics side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <SectionCard title="Highest accuracy topics" sub="Students are getting these right">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(topTopics ?? []).map((t, i) => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', width: 16, flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                  <p style={{ fontSize: 10, color: '#94a3b8' }}>{t.attempts.toLocaleString()} attempts</p>
                </div>
                <AccuracyBadge pct={t.accuracy} />
              </div>
            ))}
            {!topTopics?.length && <p style={{ fontSize: 12, color: '#94a3b8' }}>Not enough data yet.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Lowest accuracy topics" sub="Students are struggling here">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(bottomTopics ?? []).map((t, i) => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', width: 16, flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                  <p style={{ fontSize: 10, color: '#94a3b8' }}>{t.attempts.toLocaleString()} attempts</p>
                </div>
                <AccuracyBadge pct={t.accuracy} />
              </div>
            ))}
            {!bottomTopics?.length && <p style={{ fontSize: 12, color: '#94a3b8' }}>Not enough data yet (min 5 attempts per topic).</p>}
          </div>
        </SectionCard>
      </div>

    </div>
  )
}
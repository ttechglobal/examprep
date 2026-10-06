'use client'
// src/components/admin/analytics/sections.jsx
// The blocks of the admin Analytics page. Each takes the API's section data
// (/api/admin/analytics) and renders one card; the page arranges them per tab.
// Shares and rates are worked out here from counts the database returned.

import { ANALYTICS_FEATURES, featureLabel } from '@/lib/analytics'
import { FEATURES } from '@/lib/plans'
import { LineChart, PairBars, Meter, DataTable } from './charts'
import s from './analytics.module.css'

const TZ = 'Africa/Lagos'
const fmt = n => (n ?? 0).toLocaleString('en-NG')
const pct = (part, whole) => (whole > 0 ? (100 * part) / whole : null)
const day = (iso, opts) => new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: TZ, ...opts })

function Card({ title, hint, children, className = '' }) {
  return <section className={`${s.card} ${className}`}>
    <div className={s.cardHead}><h2 className={s.cardTitle}>{title}</h2>{hint && <span className={s.cardHint}>{hint}</span>}</div>
    {children}
  </section>
}

/** "▲ 12% vs last week" — an arrow and a word, never colour alone. */
function Change({ now, before, label }) {
  if (before == null || now == null) return null
  if (before === 0) return <span className={s.kpiNote}>{now > 0 ? `new ${label}` : `none ${label}`}</span>
  const change = Math.round(((now - before) / before) * 100)
  const cls = change > 0 ? s.up : change < 0 ? s.down : s.flat
  return <span className={s.kpiNote}><span className={cls}>{change > 0 ? '▲' : change < 0 ? '▼' : '■'} {Math.abs(change)}%</span> {label}</span>
}

function Kpi({ icon, bg, label, value, children }) {
  return <div className={s.kpi}>
    <span className={s.kpiIcon} style={{ background: bg }} aria-hidden="true">{icon}</span>
    <span><span className={s.kpiLabel}>{label}</span><span className={s.kpiValue}>{value}</span>{children}</span>
  </div>
}

// ── Overview tiles ───────────────────────────────────────────────────────────
export function OverviewKpis({ k, days }) {
  return <div className={s.kpis}>
    <Kpi icon="👥" bg="#eef2ff" label="Active Today" value={fmt(k.active_today)}><Change now={k.active_today} before={k.active_yesterday} label="vs yesterday"/></Kpi>
    <Kpi icon="🗓" bg="#dcfce7" label="Active This Week" value={fmt(k.active_week)}><Change now={k.active_week} before={k.active_prev_week} label="vs last week"/></Kpi>
    <Kpi icon="💬" bg="#ede9fe" label="Questions Answered" value={fmt(k.questions)}><Change now={k.questions} before={k.questions_prev} label={`vs previous ${days} days`}/></Kpi>
    <Kpi icon="🧑‍🎓" bg="#ffedd5" label="New Students" value={fmt(k.new_students)}><Change now={k.new_students} before={k.new_prev} label={`vs previous ${days} days`}/></Kpi>
    <Kpi icon="👑" bg="#fee2e2" label="Premium Students" value={fmt(k.premium)}>
      <span className={s.kpiNote}>{k.students ? `${Math.round(100 * k.premium / k.students)}% of students · ${fmt(k.trial)} on trial` : '—'}</span>
    </Kpi>
  </div>
}

// ── Activity charts ──────────────────────────────────────────────────────────
export function DailyActive({ daily }) {
  const points = daily.map(d => ({ key: d.day, value: d.active, short: day(d.day, { day: 'numeric', month: 'short' }), long: day(d.day, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }))
  return <Card title="Daily Active Students" hint="answered a question, started a session or opened flashcards">
    {daily.some(d => d.active) ? <LineChart points={points} label="Daily active students" valueLabel="active students"/> : <p className={s.empty}>No activity in this period.</p>}
    <DataTable caption="Daily active students" rows={daily.map(d => ({ day: day(d.day, { day: 'numeric', month: 'short' }), active: d.active, questions: d.questions }))}
      columns={[{ key: 'day', label: 'Day' }, { key: 'active', label: 'Active students' }, { key: 'questions', label: 'Questions' }]}/>
  </Card>
}

export function DailyQuestions({ daily }) {
  const points = daily.map(d => ({ key: d.day, value: d.questions, short: day(d.day, { day: 'numeric', month: 'short' }), long: day(d.day, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }))
  return <Card title="Questions Answered per Day">
    {daily.some(d => d.questions) ? <LineChart points={points} label="Questions answered per day" valueLabel="questions"/> : <p className={s.empty}>No questions answered in this period.</p>}
  </Card>
}

export function NewReturning({ weeks }) {
  const groups = weeks.map(w => ({
    key: w.week_start, new: w.new_students, returning: w.returning_students,
    short: day(w.week_end, { day: 'numeric', month: 'short' }),
    long: `Week ${day(w.week_start, { day: 'numeric', month: 'short' })} – ${day(w.week_end, { day: 'numeric', month: 'short' })}`,
  }))
  return <Card title="New vs Returning Students" hint="per week, by last day">
    <PairBars label="New and returning active students per week" groups={groups}
      series={[{ key: 'new', label: 'New students', color: '--series-1' }, { key: 'returning', label: 'Returning students', color: '--series-2' }]}/>
    <DataTable caption="New vs returning students" rows={groups.map(g => ({ week: g.long, new: g.new, returning: g.returning }))}
      columns={[{ key: 'week', label: 'Week' }, { key: 'new', label: 'New' }, { key: 'returning', label: 'Returning' }]}/>
  </Card>
}

// ── Features ─────────────────────────────────────────────────────────────────
const order = rows => ANALYTICS_FEATURES.map(f => rows.find(r => r.feature === f.id) ?? { feature: f.id, students: 0, sessions: 0, started: 0, completed: 0 })

export function FeatureUsage({ features, activeStudents, full = false }) {
  const rows = order(features).sort((a, b) => b.students - a.students)
  return <Card title="Feature Usage" hint={`share of ${fmt(activeStudents)} active students`}>
    <table className={s.table}>
      <thead><tr><th>Feature</th><th className={s.num}>Students</th><th className={s.num}>Sessions</th><th>% of active</th>{full && <><th className={s.num}>Started</th><th className={s.num}>Completed</th><th>Completion</th></>}</tr></thead>
      <tbody>{rows.map(r => <tr key={r.feature}>
        <td>{featureLabel(r.feature)}</td>
        <td className={s.num}>{fmt(r.students)}</td>
        <td className={s.num}>{fmt(r.sessions)}</td>
        <td><Meter value={pct(r.students, activeStudents)}/></td>
        {full && <><td className={s.num}>{r.feature === 'flashcards' ? '—' : fmt(r.started)}</td>
          <td className={s.num}>{r.feature === 'flashcards' ? '—' : fmt(r.completed)}</td>
          <td>{r.feature === 'flashcards' || !r.started ? <span className={s.cardHint}>—</span> : <Meter value={pct(r.completed, r.started)} tone="series-3"/>}</td></>}
      </tr>)}</tbody>
    </table>
  </Card>
}

export function Completion({ features }) {
  const rows = order(features).filter(r => r.feature !== 'flashcards' && r.started > 0).sort((a, b) => b.started - a.started)
  return <Card title="Completion Rate" hint="sessions started vs finished">
    {!rows.length ? <p className={s.empty}>No sessions started yet. Starts are recorded from this release on.</p>
      : <table className={s.table}>
        <thead><tr><th>Feature</th><th className={s.num}>Started</th><th className={s.num}>Completed</th><th>Rate</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.feature}><td>{featureLabel(r.feature)}</td><td className={s.num}>{fmt(r.started)}</td><td className={s.num}>{fmt(r.completed)}</td>
          <td><Meter value={pct(r.completed, r.started)} tone="series-3"/></td></tr>)}</tbody>
      </table>}
  </Card>
}

// ── Learning ─────────────────────────────────────────────────────────────────
export function Subjects({ subjects, limit = 7, accuracy = false }) {
  const total = subjects.reduce((n, r) => n + r.questions, 0)
  const top = subjects.slice(0, limit)
  const rest = subjects.slice(limit).reduce((n, r) => n + r.questions, 0)
  const rows = rest ? [...top, { subject: 'Others', questions: rest }] : top
  return <Card title="Most Practised Subjects">
    {!rows.length ? <p className={s.empty}>No questions answered in this period.</p>
      : <table className={s.table}>
        <thead><tr><th>Subject</th><th className={s.num}>Questions</th>{accuracy && <><th className={s.num}>Students</th><th className={s.num}>Accuracy</th></>}<th>% of total</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.subject}><td>{r.subject}</td><td className={s.num}>{fmt(r.questions)}</td>
          {accuracy && <><td className={s.num}>{r.students != null ? fmt(r.students) : '—'}</td><td className={s.num}>{r.accuracy != null ? `${r.accuracy}%` : '—'}</td></>}
          <td><Meter value={pct(r.questions, total)}/></td></tr>)}</tbody>
      </table>}
  </Card>
}

export function Topics({ topics, title = 'Most Practised Topics', difficult = false }) {
  return <Card title={title} hint={difficult ? 'lowest accuracy, at least 20 answers' : undefined}>
    {!topics.length ? <p className={s.empty}>{difficult ? 'Not enough answers yet to rank topics.' : 'No topic practice in this period.'}</p>
      : <table className={s.table}>
        <thead><tr><th className={s.rank}>#</th><th>Topic</th><th>Subject</th><th className={s.num}>{difficult ? 'Accuracy' : 'Questions'}</th>{difficult && <th className={s.num}>Answers</th>}</tr></thead>
        <tbody>{topics.map((t, i) => <tr key={`${t.topic}-${t.subject}`}><td className={s.rank}>{i + 1}</td><td>{t.topic}</td><td>{t.subject}</td>
          <td className={s.num}>{difficult ? `${t.accuracy}%` : fmt(t.questions)}</td>{difficult && <td className={s.num}>{fmt(t.questions)}</td>}</tr>)}</tbody>
      </table>}
  </Card>
}

export function Exams({ exams }) {
  const students = exams.reduce((n, r) => n + r.students, 0)
  const questions = exams.reduce((n, r) => n + r.questions, 0)
  return <Card title="Exam Selection" hint="students can choose both">
    <table className={s.table}>
      <thead><tr><th>Exam</th><th className={s.num}>Students</th><th>Share</th><th className={s.num}>Questions</th><th>Share</th></tr></thead>
      <tbody>{exams.map(r => <tr key={r.exam}><td>{r.exam}</td><td className={s.num}>{fmt(r.students)}</td><td><Meter value={pct(r.students, students)}/></td>
        <td className={s.num}>{fmt(r.questions)}</td><td><Meter value={pct(r.questions, questions)}/></td></tr>)}</tbody>
    </table>
  </Card>
}

// ── Engagement ───────────────────────────────────────────────────────────────
export function EngagementKpis({ e, k }) {
  const per = (n, d) => (d ? (n / d).toFixed(1) : '—')
  return <div className={s.kpis}>
    <Kpi icon="👥" bg="#eef2ff" label="Active Students" value={fmt(e.active)}><Change now={k.active_period} before={k.active_prev} label="vs previous period"/></Kpi>
    <Kpi icon="📅" bg="#dcfce7" label="Study Days per Student" value={e.avg_study_days ?? '—'}><span className={s.kpiNote}>days with activity, this period</span></Kpi>
    <Kpi icon="🧩" bg="#ede9fe" label="Sessions per Student" value={per(e.sessions, e.active)}><span className={s.kpiNote}>{fmt(e.sessions)} sessions</span></Kpi>
    <Kpi icon="💬" bg="#ffedd5" label="Questions per Student" value={per(e.questions, e.active)}><span className={s.kpiNote}>{fmt(e.questions)} questions</span></Kpi>
  </div>
}

export function Habits({ e }) {
  const week = e.week_1_day + e.week_2_days + e.week_3plus_days
  return <Card title="This Week's Study Habits" hint="last 7 days">
    <ul className={s.list}>
      <li><span>New students this week</span><strong>{fmt(e.new_this_week)}</strong></li>
      <li><span>Returning students this week</span><strong>{fmt(e.returned_this_week)}</strong></li>
      <li><span>Studied on 1 day</span><strong>{fmt(e.week_1_day)}</strong></li>
      <li><span>Studied on 2 days</span><strong>{fmt(e.week_2_days)}</strong></li>
      <li><span>Studied on 3+ days (building a habit)</span><strong>{fmt(e.week_3plus_days)}{week ? ` · ${Math.round(100 * e.week_3plus_days / week)}%` : ''}</strong></li>
      <li><span>One-time users (joined, studied one day, not back)</span><strong>{fmt(e.one_time)}</strong></li>
    </ul>
  </Card>
}

function heatStyle(value) {
  if (value == null) return { background: '#f8fafc', color: 'var(--muted)' }
  const v = Math.max(0, Math.min(100, value))
  return { background: `color-mix(in srgb, var(--series-1) ${Math.round(8 + v * 0.8)}%, #ffffff)`, color: v > 55 ? '#fff' : 'var(--ink)' }
}

export function Retention({ cohorts }) {
  return <Card title="Retention by Join Week" hint="share of each week's new students active in the weeks after">
    <table className={s.table}>
      <thead><tr><th>Joined</th><th className={s.num}>Students</th>{[1, 2, 3, 4].map(w => <th key={w}>Week {w}</th>)}</tr></thead>
      <tbody>{cohorts.map(c => <tr key={c.cohort_start}>
        <td>{day(c.cohort_start, { day: 'numeric', month: 'short' })}</td><td className={s.num}>{fmt(c.size)}</td>
        {['week1', 'week2', 'week3', 'week4'].map(w => <td key={w}>{c.size ? <span className={s.heat} style={heatStyle(c[w])}>{c[w] == null ? '…' : `${c[w]}%`}</span> : <span className={s.cardHint}>—</span>}</td>)}
      </tr>)}</tbody>
    </table>
    <p className={s.cardHint} style={{ margin: '8px 0 0' }}>… = that week hasn&apos;t finished yet.</p>
  </Card>
}

// ── Conversion ───────────────────────────────────────────────────────────────
export function Conversion({ c, days }) {
  const rate = pct(c.trials_converted, c.trials_ended)
  return <Card title="Premium Conversion" hint={`last ${days} days`}>
    <ul className={s.list}>
      <li><span>Trials started</span><strong>{fmt(c.trials_started)}</strong></li>
      <li><span>Trials active now</span><strong>{fmt(c.trials_active)}</strong></li>
      <li><span>Trials ended</span><strong>{fmt(c.trials_ended)}</strong></li>
      <li><span>…of those, bought a plan</span><strong>{fmt(c.trials_converted)}</strong></li>
      <li><span>Plans activated (all students)</span><strong>{fmt(c.upgraded)}</strong></li>
      <li className={s.highlight}><span>Trial → Premium</span><strong>{rate == null ? '—' : `${rate.toFixed(1)}%`}</strong></li>
    </ul>
  </Card>
}

export function PlanMix({ c }) {
  const parts = [
    { key: 'free', label: 'Free', value: c.plan_free, color: '--series-1' },
    { key: 'trial', label: 'On trial', value: c.plan_trial, color: '--series-2' },
    { key: 'premium', label: 'Premium', value: c.plan_premium, color: '--series-3' },
  ]
  const total = parts.reduce((n, p) => n + p.value, 0)
  return <Card title="Students by Plan" hint="now">
    <div className={s.stack} role="img" aria-label={parts.map(p => `${p.label} ${p.value}`).join(', ')}>
      {parts.filter(p => p.value).map(p => <span key={p.key} style={{ width: `${(100 * p.value) / total}%`, background: `var(${p.color})` }}/>)}
    </div>
    <div className={s.stackLegend}>
      {parts.map(p => <span key={p.key}><i style={{ background: `var(${p.color})` }}/>{p.label}: <strong>{fmt(p.value)}</strong>{total ? ` (${Math.round((100 * p.value) / total)}%)` : ''}</span>)}
    </div>
    <ul className={s.list} style={{ marginTop: 12 }}>
      <li><span>Upgrade sheet shown (student-days)</span><strong>{fmt(c.upgrade_views)}</strong></li>
      <li><span>Tapped “Get Premium on WhatsApp”</span><strong>{fmt(c.upgrade_clicks)}</strong></li>
    </ul>
  </Card>
}

const TRIGGER = {
  mock: 'Mock Exam (locked)', topic: 'Topic locked', battle_friends: 'Battle vs Friends (locked)', general: 'Plans opened',
}
function triggerLabel(t) {
  if (t.reason === 'limit') return `${FEATURES[t.feature]?.name ?? t.feature} (daily limit)`
  return TRIGGER[t.feature] ?? `${FEATURES[t.feature]?.name ?? t.feature} (locked)`
}

export function Triggers({ triggers, days }) {
  return <Card title="Top Upgrade Triggers" hint={`last ${days} days`}>
    {!triggers.length ? <p className={s.empty}>No upgrade sheets shown yet.</p>
      : <table className={s.table}>
        <thead><tr><th>Trigger</th><th className={s.num}>Views</th><th className={s.num}>Students</th><th className={s.num}>Bought</th></tr></thead>
        <tbody>{triggers.map(t => <tr key={`${t.feature}-${t.reason}`}><td>{triggerLabel(t)}</td><td className={s.num}>{fmt(t.views)}</td>
          <td className={s.num}>{fmt(t.students)}</td><td className={s.num}>{fmt(t.conversions)}</td></tr>)}</tbody>
      </table>}
    <p className={s.cardHint} style={{ margin: '8px 0 0' }}>Bought = activated a plan within 30 days of first seeing it.</p>
  </Card>
}

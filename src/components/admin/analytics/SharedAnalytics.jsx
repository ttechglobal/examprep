'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { DailyActive, DailyQuestions, Subjects, Topics } from './sections'
import { featureLabel } from '@/lib/analytics'
import s from './analytics.module.css'

const SOURCES = { web: 'Web', app: 'Mobile / installed app', unknown: 'Unknown' }
const fmt = n => Number(n || 0).toLocaleString()
const date = value => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }) : '—'
const feature = id => id === 'app_practice' ? 'Practice (older app format)' : featureLabel(id)
function Card({ title, children }) { return <section className={s.card}><div className={s.cardHead}><h2 className={s.cardTitle}>{title}</h2></div>{children}</section> }
function Change({value,previous,days}) {
  const direction = value > previous ? 1 : value < previous ? -1 : 0
  return <span className={`${s.kpiNote} ${direction > 0 ? s.trendUp : direction < 0 ? s.trendDown : ''}`}>{direction > 0 ? '↗ ' : direction < 0 ? '↘ ' : ''}{previous > 0 ? `${direction > 0 ? '+' : ''}${Math.round(100 * (value-previous)/previous)}%` : value > 0 ? `+${fmt(value)} from zero` : 'No change'} vs previous {days === 1 ? '24 hours' : `${days} days`}</span>
}
function StudentTable({ rows, firstPractice = false }) {
  if (!rows.length) return <p className={s.empty}>{firstPractice ? 'No recent accounts waiting for their first completed practice.' : 'No practice reported in this period.'}</p>
  return <table className={s.table}><thead><tr><th>Student</th>{firstPractice ? <th>Joined</th> : <><th>Used on</th><th>Study days</th><th>Sessions</th><th>Questions</th><th>Last practice</th></>}</tr></thead><tbody>{rows.map(r => <tr key={r.id}><td><Link href={`/admin/users?student=${encodeURIComponent(r.id)}`}>{r.full_name || r.username || 'Name not added'}</Link></td>{firstPractice ? <td>{date(r.created_at)}</td> : <><td>{r.sources.map(source => SOURCES[source] || 'Unknown').join(', ')}</td><td>{fmt(r.study_days)}</td><td>{fmt(r.sessions)}</td><td>{fmt(r.questions)}</td><td>{date(r.last_activity)}</td></>}</tr>)}</tbody></table>
}
export default function SharedAnalytics() {
  const [tab, setTab] = useState('summary')
  const [days, setDays] = useState('30')
  const [exam, setExam] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const cache = useRef(new Map())
  const forced = useRef(0)
  useEffect(() => {
    const controller = new AbortController()
    const key = `${days}:${exam}`
    const force = refresh !== forced.current
    forced.current = refresh
    const hit = cache.current.get(key)
    if (!force && hit && Date.now() - hit.at < 300_000) {
      Promise.resolve().then(() => { if (!controller.signal.aborted) setState({ data: hit, loading: false, error: null }) })
      return () => controller.abort()
    }
    Promise.resolve().then(() => { if (!controller.signal.aborted) setState(previous => ({ ...previous, loading: true, error: null })) })
    const params = new URLSearchParams({ days })
    if (exam) params.set('exam', exam)
    if (force) params.set('refresh', '1')
    fetch(`/api/admin/analytics?${params}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Could not load analytics')
        if (controller.signal.aborted) return
        cache.current.set(key, body)
        setState({ data: body, loading: false, error: null })
      }).catch(error => { if (!controller.signal.aborted) setState(previous => ({ ...previous, loading: false, error: error.message })) })
    return () => controller.abort()
  }, [days, exam, refresh])
  const d = state.data?.range?.days === Number(days) && (state.data?.coverage?.exam || '') === exam ? state.data : null
  const k = d?.kpis
  return <div className={s.page} aria-busy={state.loading}>
    <div className={s.head}><div><h1 className={s.title}>Analytics</h1><p className={s.sub}>Who is practising, how they use ExamPrep and what needs attention.</p></div><div className={s.filters}>
      <label className={s.filter}>Period<select aria-label="Date range" value={days} onChange={e => setDays(e.target.value)}><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
      <label className={s.filter}>Exam<select value={exam} onChange={e => setExam(e.target.value)}><option value="">All exams</option><option value="WAEC">WAEC</option><option value="JAMB">JAMB</option></select></label>
      <button className={s.refreshButton} disabled={state.loading} onClick={() => setRefresh(n => n + 1)}>{state.loading ? 'Loading…' : 'Refresh'}</button>
    </div></div>
    <nav className={s.tabs} aria-label="Analytics views">{[['summary','Summary'],['activity','Student activity'],['learning','Learning']].map(([id,label]) => <button key={id} className={`${s.tab} ${tab === id ? s.tabOn : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>)}<Link className={s.businessLink} href="/admin/users">Plans & payments →</Link></nav>
    {state.error && <p role="alert" className={s.problem}>{state.error}</p>}
    {d && <p className={s.note}>{d.range.days === 1 ? 'Last 24 hours' : `${date(d.range.from)}–${date(d.range.to)}`} · Lagos time · Updated {new Date(d.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })}</p>}
    {!d ? !state.error && <p className={s.loading}>Loading analytics…</p> : <div style={{ opacity: state.loading ? .5 : 1 }}>
      {tab === 'summary' && <>
        <div className={s.kpis}>{[['Active students',k.active,k.active_prev],['Completed sessions',k.sessions,k.sessions_prev],['Questions answered',k.questions,k.questions_prev],['New accounts',k.new_students,k.new_prev]].map(([label,value,previous]) => <div className={s.kpi} key={label}><div><span className={s.kpiLabel}>{label}</span><strong className={s.kpiValue}>{fmt(value)}</strong><Change value={value} previous={previous} days={d.range.days} /></div></div>)}</div>
        {exam && <p className={s.note}>Practice is filtered by exam. New accounts counts all exams.</p>}
        <div className={s.gridHalf}><DailyActive daily={d.daily} hint="answered at least one question" /><Card title="Web and app use"><table className={s.table}><thead><tr><th>Used on</th><th>Students</th><th>Sessions</th><th>Questions</th></tr></thead><tbody>{d.platforms.map(p => <tr key={p.source}><td>{SOURCES[p.source]}</td><td>{fmt(p.students)}</td><td>{fmt(p.sessions)}</td><td>{fmt(p.questions)}</td></tr>)}</tbody></table><p className={s.coverageNote}>Students can use both. The overall total counts each account once. A phone browser counts as Web.</p></Card></div>
        <div className={s.gridHalf}><Card title="Most-used practice modes">{d.features.length ? <ul className={s.list}>{d.features.slice(0,3).map(f => <li key={f.feature}><span>{feature(f.feature)}</span><strong>{fmt(f.sessions)} sessions</strong></li>)}</ul> : <p className={s.empty}>No completed practice yet.</p>}</Card><Card title="Needs attention"><p><strong>{d.needs_start.length === 20 ? '20+' : fmt(d.needs_start.length)}</strong> recent accounts have not completed a first practice after 24 hours.</p><p><strong>{d.needs_return.length === 20 ? '20+' : fmt(d.needs_return.length)}</strong> previously practising students have no answers reported in the last 7 days.</p><button className={s.textButton} onClick={() => setTab('activity')}>Review students →</button><Link className={s.inlineLink} href="/admin/school-devices">School computer usage →</Link></Card></div>
      </>}
      {tab === 'activity' && <>
        <div className={s.kpis}><div className={s.kpi}><div><span className={s.kpiLabel}>Practised on 2+ days</span><strong className={s.kpiValue}>{fmt(k.repeat_students)}</strong><span className={s.kpiNote}>Of {fmt(k.active)} active students this period</span></div></div><div className={s.kpi}><div><span className={s.kpiLabel}>Questions per active student</span><strong className={s.kpiValue}>{k.active ? (k.questions/k.active).toFixed(1) : '—'}</strong></div></div></div>
        <DailyQuestions daily={d.daily} />
        <Card title="Recently practising students"><StudentTable rows={d.students} /><p className={s.coverageNote}>Most recent 30 active accounts. Days, sessions and questions cover the selected period.</p></Card>
        <Card title="No practice reported in the last 7 days"><StudentTable rows={d.needs_return} /><p className={s.coverageNote}>Up to 20 students who practised earlier in the selected period. Offline activity may not have uploaded yet.</p></Card>
        <Card title="Waiting for a first practice"><StudentTable rows={d.needs_start} firstPractice /><p className={s.coverageNote}>Up to 20 accounts that joined in this period, at least 24 hours ago, with no completed session. All exams.</p></Card>
      </>}
      {tab === 'learning' && <>
        <div className={s.gridHalf}><Subjects subjects={d.subjects} limit={12} accuracy /><Card title="Practice modes"><table className={s.table}><thead><tr><th>Mode</th><th>Students</th><th>Completed sessions</th></tr></thead><tbody>{d.features.map(f => <tr key={f.feature}><td>{feature(f.feature)}</td><td>{fmt(f.students)}</td><td>{fmt(f.sessions)}</td></tr>)}</tbody></table><p className={s.coverageNote}>1v1 counts one completed session per registered participant with recorded answers. Older app sessions do not retain every mode. Learn and flashcard insights need dedicated reporting when those features launch.</p></Card></div>
        <div className={s.gridHalf}><Topics topics={d.topics} /><Topics topics={d.difficult} title="Topics to review" difficult /></div>
        <p className={s.note}>Topics to review requires at least 20 answers from 3 students. Accuracy describes recorded practice.</p>
      </>}
      <details className={s.coverage}><summary>What is included?</summary><p>Signed-in student practice synced to the server. Anonymous identities and explicitly excluded test accounts are omitted. Offline practice appears after upload, on its original date.</p><p>Mobile / installed app identifies native account sync, including personal Windows use. Shared school computers are separate. Earlier unattributed activity is Web using the confirmed pre-mobile history. New activity without reliable evidence stays Unknown.</p><p>Activity means at least one answered question. New accounts and first-practice follow-up cover all exams. Source figures can overlap for students; questions and sessions are not counted twice.</p><p>Latest native account sync: {date(d.coverage.last_synced_app)}. Data is cached for five minutes; switching tabs does not reload it. Refresh has a 30-second cooldown.</p></details>
    </div>}
  </div>
}

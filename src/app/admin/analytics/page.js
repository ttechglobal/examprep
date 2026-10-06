'use client'
// src/app/admin/analytics/page.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// Analytics: how ExamPrep is used, in five tabs, each answering one question.
//   Overview     How is ExamPrep doing? (activity, features, subjects, conversion)
//   Engagement   Are students coming back and studying? (habits, retention)
//   Features     Which parts do students value? (usage, completion)
//   Learning     What are they studying and struggling with?
//   Conversion   Is free → paid working? (trials, plan mix, upgrade triggers)
// Filters (one row, apply to every tab): last 7 / 30 / 90 days · exam · plan
// (the student's plan now) · school.
// Active = answered a question, started a session or opened flashcards that
// day; opening the app alone doesn't count. Signed-in students only (guests'
// practice stays on their phones).
// Data: /api/admin/analytics (counted in Postgres, 20261008_analytics.sql).
// v2 replaces v1, whose numbers were cut off at 1,000 rows.
// v3: kinder to the database. A view you have already opened is kept for 5
// minutes here (switching tabs back and forth costs nothing) and for 5 minutes on
// the server; "Refresh" counts again. The first load used to fetch twice (the
// school filter list arriving re-ran the fetch); it fetches once now.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import {
  OverviewKpis, DailyActive, DailyQuestions, NewReturning, FeatureUsage, Completion, Subjects, Topics, Exams,
  EngagementKpis, Habits, Retention, Conversion, PlanMix, Triggers,
} from '@/components/admin/analytics/sections'
import s from '@/components/admin/analytics/analytics.module.css'

const TABS = [['overview', 'Overview'], ['engagement', 'Engagement'], ['features', 'Features'], ['learning', 'Learning'], ['conversion', 'Conversion']]

const KEEP_MS = 5 * 60_000

export default function AdminAnalyticsPage() {
  const [tab, setTab] = useState('overview')
  const [days, setDays] = useState('30')
  const [exam, setExam] = useState('')
  const [plan, setPlan] = useState('')
  const [school, setSchool] = useState('')
  const [schools, setSchools] = useState(null)
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [refresh, setRefresh] = useState(0)
  const kept = useRef(new Map())           // view key → { at, data }
  const haveSchools = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    const key = `${tab}|${days}|${exam}|${plan}|${school}`
    const forced = refresh > 0 && kept.current.get('forced') !== refresh
    const hit = kept.current.get(key)
    if (!forced && hit && Date.now() - hit.at < KEEP_MS) {
      Promise.resolve().then(() => setState({ loading: false, error: null, data: hit.data }))
      return
    }
    if (forced) kept.current.set('forced', refresh)
    const params = new URLSearchParams({ tab, days })
    if (exam) params.set('exam', exam)
    if (plan) params.set('plan', plan)
    if (school) params.set('school', school)
    if (!haveSchools.current) params.set('meta', '1')
    if (forced) params.set('refresh', '1')
    Promise.resolve().then(() => setState(prev => ({ ...prev, loading: true, error: null })))
    fetch(`/api/admin/analytics?${params}`, { signal: controller.signal })
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Could not load analytics')
        if (data.schools) { haveSchools.current = true; setSchools(data.schools) }
        kept.current.set(key, { at: Date.now(), data })
        setState({ loading: false, error: null, data })
      })
      .catch(err => { if (err.name !== 'AbortError') setState(prev => ({ ...prev, loading: false, error: err.message })) })
    return () => controller.abort()
  }, [tab, days, exam, plan, school, refresh])

  const d = state.data?.tab === tab ? state.data : null
  const n = Number(days)

  return <div className={s.page}>
    <div className={s.head}>
      <div>
        <h1 className={s.title}>Analytics</h1>
        <p className={s.sub}>How students use ExamPrep, and what to improve next.</p>
      </div>
      <div className={s.filters}>
        <button type="button" className={s.filter} onClick={() => setRefresh(n => n + 1)} disabled={state.loading}
          title="Count again (the numbers are kept for 5 minutes)" style={{ cursor: 'pointer', font: 'inherit', fontWeight: 700 }}>
          {state.loading ? 'Loading…' : 'Refresh'}{state.data?.at && !state.loading ? ` · counted ${new Date(state.data.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })}` : ''}
        </button>
        <label className={s.filter}>📅<select value={days} onChange={e => setDays(e.target.value)} aria-label="Date range">
          <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
        </select></label>
        <label className={s.filter}>Exam<select value={exam} onChange={e => setExam(e.target.value)}>
          <option value="">All exams</option><option value="WAEC">WAEC</option><option value="JAMB">JAMB</option>
        </select></label>
        <label className={s.filter}>Plan<select value={plan} onChange={e => setPlan(e.target.value)}>
          <option value="">All plans</option><option value="free">Free</option><option value="trial">On trial</option><option value="premium">Premium</option>
        </select></label>
        <label className={s.filter}>School<select value={school} onChange={e => setSchool(e.target.value)}>
          <option value="">All schools</option>
          {(schools ?? []).map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
        </select></label>
      </div>
    </div>

    <div className={s.tabs} role="tablist">
      {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id}
        className={`${s.tab} ${tab === id ? s.tabOn : ''}`} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    {plan && <p className={s.note}>Plan filter: students who are {plan === 'trial' ? 'on trial' : plan} now (not at the time they studied).</p>}

    {state.error ? <p className={s.problem}>{state.error}</p>
      : !d ? <p className={s.loading}>Loading analytics…</p>
      : <div style={{ opacity: state.loading ? 0.6 : 1, transition: 'opacity .15s' }}>
        {tab === 'overview' && <>
          <OverviewKpis k={d.kpis} days={n}/>
          <div className={s.grid2}><DailyActive daily={d.daily}/><NewReturning weeks={d.newReturning}/></div>
          <div className={s.grid3}>
            <FeatureUsage features={d.features} activeStudents={d.kpis.active_period}/>
            <Subjects subjects={d.subjects}/>
            <Topics topics={d.topics}/>
          </div>
          <div className={s.grid3}>
            <Completion features={d.features}/>
            <Conversion c={d.conversion} days={n}/>
            <Triggers triggers={d.triggers.slice(0, 6)} days={n}/>
          </div>
        </>}

        {tab === 'engagement' && <>
          <EngagementKpis e={d.engagement} k={d.kpis}/>
          <div className={s.gridHalf}><DailyActive daily={d.daily}/><DailyQuestions daily={d.daily}/></div>
          <div className={s.gridHalf}><NewReturning weeks={d.newReturning}/><Habits e={d.engagement}/></div>
          <Retention cohorts={d.retention}/>
        </>}

        {tab === 'features' && <>
          <p className={s.note}>Students and sessions count finished sessions. Started vs completed is recorded from this release on; Flashcards counts decks opened.</p>
          <FeatureUsage features={d.features} activeStudents={d.kpis.active_period} full/>
        </>}

        {tab === 'learning' && <>
          <div className={s.gridHalf}><Subjects subjects={d.subjects} limit={12} accuracy/><Exams exams={d.exams}/></div>
          <div className={s.gridHalf}><Topics topics={d.topics}/><Topics topics={d.difficult} title="Most Difficult Topics" difficult/></div>
        </>}

        {tab === 'conversion' && <>
          <div className={s.grid3}><Conversion c={d.conversion} days={n}/><PlanMix c={d.conversion}/><Triggers triggers={d.triggers} days={n}/></div>
        </>}
      </div>}
  </div>
}

'use client'
// src/app/student/progress/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Performance insight page. Local-first — works for guests and auth users.
//
// Data sources:
//   Activity chart    → ep_activity (localStorage, written by saveSessionLocally)
//   Session stats     → ep_session_history (localStorage)
//   Subject overview  → localMastery.getSubjectOverview (guests + instant load)
//                     → /api/student/mastery?exam&period (auth, background)
//   Topic breakdown   → localMastery.getPerformanceInsight (guests + instant)
//                     → /api/student/mastery?exam&subject&period (auth, background)
//   Subject trend     → localMastery.getSubjectTrend (guests + instant)
//                     → weekly_trend in drill-in API response (auth)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { usePoints }      from '@/contexts/PointsContext'
import { useTheme }       from '@/contexts/ThemeContext'
import { useStudentUser } from '@/app/student/layout'
import {
  getSubjectOverview,
  getPerformanceInsight,
  getSubjectTrend,
} from '@/lib/localMastery'
import { readLocalSessions } from '@/components/student/SessionHistory'
import Link from 'next/link'

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const RED    = '#f43f5e'

const SUBJ_COLOR = {
  'Mathematics':'#FF6A00','English Language':'#22c55e','Use of English':'#22c55e',
  'Physics':'#7C3AED','Chemistry':'#FFB800','Biology':'#18B7F2',
  'Further Mathematics':'#1264E5','Economics':'#f43f5e','Government':'#9b7ae0',
  'Geography':'#34d399','Literature in English':'#f9a8d4','default':'#1264E5',
}
const SUBJ_ICON = {
  'Mathematics':'🧮','English Language':'📖','Use of English':'📖','Physics':'⚡',
  'Chemistry':'⚗️','Biology':'🧬','Further Mathematics':'📐','Economics':'📊',
  'Government':'🏛️','Geography':'🌍','Literature in English':'📚','default':'📝',
}
const getColor = n => SUBJ_COLOR[n] ?? SUBJ_COLOR.default
const getIcon  = n => SUBJ_ICON[n]  ?? SUBJ_ICON.default

const PERIOD_OPTIONS = [
  { label: '1W',  days: 7  },
  { label: '2W',  days: 14 },
  { label: '1M',  days: 30 },
  { label: '3M',  days: 90 },
  { label: 'All', days: 0  },
]

// ── Local helpers ─────────────────────────────────────────────────────────────
const ACTIVITY_KEY = 'ep_activity'

// 'YYYY-MM-DD' in the device's local timezone.
// Never use toISOString() for date keys — it returns UTC and causes data to
// appear on the wrong day for students in non-UTC timezones (Nigeria = UTC+1).
function localDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Returns [Mon, Tue, Wed, Thu, Fri, Sat, Sun] question counts for the current week.
// Days in the future always return 0.
function readWeeklyActivity() {
  try {
    const raw      = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '{}')
    const today    = new Date()
    const todayStr = localDateStr(today)
    const monday   = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      const key = localDateStr(day)
      if (key > todayStr) return 0
      return raw[key] || 0
    })
  } catch {
    return [0, 0, 0, 0, 0, 0, 0]
  }
}

function deriveStats(sessions) {
  const total   = sessions.reduce((a,s) => a+(s.count||0), 0)
  const correct = sessions.reduce((a,s) => a+(s.correct||0), 0)
  return {
    questions: total,
    accuracy:  total > 0 ? Math.round((correct/total)*100) : 0,
  }
}

// ── UI primitives ─────────────────────────────────────────────────────────────
function Card({ children, style={} }) {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 2px 16px rgba(6,42,120,.06)', overflow:'hidden', ...style }}>
      {children}
    </div>
  )
}

function ExamToggle({ exam, exams, onChange }) {
  return (
    <div style={{ display:'inline-flex', background:'var(--bg-subtle)', borderRadius:13, padding:3, border:'1px solid var(--border)', gap:2 }}>
      {exams.map(e => {
        const on = e === exam
        return (
          <button key={e} onClick={() => onChange(e)}
            style={{ padding:'7px 18px', borderRadius:10, fontSize:13, fontWeight:on?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:on?BLUE:'transparent', color:on?'#fff':'var(--text-tert)', boxShadow:on?`0 2px 10px ${BLUE}40`:'none', transition:'all .15s' }}>
            {e}
          </button>
        )
      })}
    </div>
  )
}

function PeriodToggle({ period, onChange }) {
  return (
    <div style={{ display:'inline-flex', background:'var(--bg-subtle)', borderRadius:11, padding:3, border:'1px solid var(--border)', gap:2 }}>
      {PERIOD_OPTIONS.map(o => {
        const on = o.days === period
        return (
          <button key={o.days} onClick={() => onChange(o.days)}
            style={{ padding:'5px 12px', borderRadius:8, fontSize:11, fontWeight:on?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:on?NAVY:'transparent', color:on?GOLD:'var(--text-tert)', transition:'all .15s' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Stat cards ────────────────────────────────────────────────────────────────
function StatCards({ questions, accuracy, xp, dark }) {
  const items = [
    { icon:'📋', label:'Questions Answered', value: questions.toLocaleString(), color:BLUE   },
    { icon:'🎯', label:'Accuracy',           value: `${accuracy}%`,            color:ORANGE },
    { icon:'⚡', label:'Total XP',           value: xp.toLocaleString(),       color:GOLD   },
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
      {items.map((m,i) => (
        <Card key={i} style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ fontSize:16 }}>{m.icon}</span>
            <span style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', lineHeight:1.3 }}>{m.label}</span>
          </div>
          <div style={{ fontSize:20, fontWeight:900, color:m.color, letterSpacing:'-.03em' }}>{m.value}</div>
        </Card>
      ))}
    </div>
  )
}

// ── Activity chart ────────────────────────────────────────────────────────────
// Activity chart — Mon to Sun, local time.
// todayIdx derived from same formula as readWeeklyActivity so they always agree.
// Future days are pre-zeroed by readWeeklyActivity; we just render them dimly.
function ActivityChart({ activity, dark }) {
  const DAYS     = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const todayIdx = (new Date().getDay() + 6) % 7   // 0=Mon … 6=Sun
  const max      = Math.max(...activity, 1)
  const hasAny   = activity.some(v => v > 0)

  return (
    <Card style={{ padding:'20px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Practice Activity</span>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em' }}>This week</span>
      </div>

      <div style={{ display:'flex', alignItems:'flex-end', height:96, gap:6 }}>
        {DAYS.map((label, i) => {
          const count   = activity[i]
          const isFuture = i > todayIdx
          const isToday  = i === todayIdx
          // Bar height: scale to 80px max, floor at 4px if any count, 2px baseline
          const barH    = count > 0 ? Math.max(Math.round((count / max) * 80), 4) : 2

          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              {/* Count label — only show if there is data */}
              <span style={{ fontSize:9, fontWeight:800, color:'var(--text-tert)', visibility: count > 0 ? 'visible' : 'hidden' }}>
                {count}
              </span>
              {/* Bar */}
              <div style={{
                width: '100%',
                height: barH,
                borderRadius: '4px 4px 0 0',
                background: isToday
                  ? `linear-gradient(180deg, ${CYAN}, ${BLUE})`
                  : isFuture
                  ? 'var(--border)'
                  : BLUE,
                opacity: isToday ? 1 : isFuture ? 0.4 : count > 0 ? 0.65 : 0.15,
                transition: 'height .4s ease',
                minHeight: 2,
              }}/>
              {/* Day label */}
              <span style={{
                fontSize: 9,
                fontWeight: isToday ? 800 : 600,
                color: isToday ? BLUE : 'var(--text-tert)',
              }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {!hasAny && (
        <p style={{ textAlign:'center', marginTop:12, fontSize:12, color:'var(--text-tert)' }}>
          Complete a practice session to see your activity here.
        </p>
      )}
    </Card>
  )
}

// ── Trend sparkline ───────────────────────────────────────────────────────────
function TrendSparkline({ weeks, color }) {
  if (weeks.length < 2) return null
  const max = Math.max(...weeks.map(w => w.score), 1)
  const W = 120, H = 36
  const pts = weeks.map((w, i) => {
    const x = (i / (weeks.length-1)) * W
    const y = H - (w.score / 100) * H
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={W} height={H} style={{ overflow:'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {weeks.map((w,i) => {
        const x = (i/(weeks.length-1))*W
        const y = H-(w.score/100)*H
        return <circle key={i} cx={x} cy={y} r="3" fill={color}/>
      })}
    </svg>
  )
}

// ── Subject overview cards ────────────────────────────────────────────────────
function SubjectOverview({ subjects, exam, period, onDrillIn, dark }) {
  if (!subjects.length) return (
    <Card style={{ padding:'28px 20px', textAlign:'center' }}>
      <div style={{ fontSize:32, marginBottom:10 }}>📊</div>
      <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No data yet for {exam}</div>
      <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.6, marginBottom:16 }}>
        Complete practice sessions to see your performance here.
      </div>
      <Link href="/student/practice" style={{ textDecoration:'none' }}>
        <div style={{ display:'inline-block', padding:'10px 22px', borderRadius:999, background:BLUE, color:'#fff', fontSize:13, fontWeight:800 }}>Start Practising →</div>
      </Link>
    </Card>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {subjects.map((s, i) => {
        const col   = getColor(s.subject_name)
        const score = s.subject_score
        const trend = s.weekly_trend ?? []
        return (
          <button key={s.subject_id ?? i} onClick={() => onDrillIn(s)}
            style={{ all:'unset', cursor:'pointer', display:'block', width:'100%', boxSizing:'border-box' }}>
            <Card style={{ padding:'14px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:38, height:38, borderRadius:11, background:`${col}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                  {getIcon(s.subject_name)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', marginBottom:4 }}>{s.subject_name}</div>
                  <div style={{ fontSize:10, color:'var(--text-tert)' }}>{s.total_attempts} attempts</div>
                </div>
                {trend.length >= 2 && (
                  <div style={{ flexShrink:0 }}>
                    <TrendSparkline weeks={trend} color={col}/>
                  </div>
                )}
                <div style={{ textAlign:'right', flexShrink:0, minWidth:48 }}>
                  {score !== null
                    ? <div style={{ fontSize:20, fontWeight:900, color:col }}>{score}%</div>
                    : <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.4 }}>Keep<br/>practicing</div>
                  }
                  <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:2 }}>→</div>
                </div>
              </div>
            </Card>
          </button>
        )
      })}
    </div>
  )
}

// ── Topic drill-in ────────────────────────────────────────────────────────────
function TopicDrillIn({ subject, insight, trend, period, onPeriodChange, onBack, dark }) {
  const scoreColor = s => s >= 70 ? GREEN : s >= 40 ? GOLD : RED

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack}
          style={{ all:'unset', cursor:'pointer', width:36, height:36, borderRadius:11, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
          ←
        </button>
        <div>
          <div style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.025em' }}>{subject.subject_name}</div>
          <div style={{ fontSize:11, color:'var(--text-tert)' }}>{insight.total_attempts} attempts · {insight.weeks_of_data} week{insight.weeks_of_data!==1?'s':''} of data</div>
        </div>
      </div>

      {/* Trend chart */}
      {trend.length >= 2 && (
        <Card style={{ padding:'18px 20px' }}>
          <div style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:14 }}>
            Score trend
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', height:80, gap:6 }}>
            {trend.map((w,i) => {
              const col = scoreColor(w.score)
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ width:'100%', height:Math.max(Math.round((w.score/100)*64), 4), borderRadius:'4px 4px 0 0', background:col, opacity:0.8 }}/>
                  <span style={{ fontSize:8, color:'var(--text-tert)' }}>W{i+1}</span>
                </div>
              )
            })}
          </div>
          {trend.length === 1 && (
            <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:8 }}>
              Come back next week to see your trend.
            </div>
          )}
        </Card>
      )}

      {/* Period filter */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)' }}>Topic breakdown</span>
        <PeriodToggle period={period} onChange={onPeriodChange}/>
      </div>

      {/* Topics */}
      {!insight.topics.length ? (
        <Card style={{ padding:'24px', textAlign:'center' }}>
          <div style={{ fontSize:12, color:'var(--text-tert)' }}>No practice data for this period. Try a wider time range.</div>
        </Card>
      ) : (
        <Card>
          {insight.topics.map((t, i) => {
            const col = t.enough_data ? scoreColor(t.score) : 'var(--text-tert)'
            return (
              <div key={t.topic_id ?? i} style={{ padding:'13px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)', marginBottom:3 }}>{t.topic_name || 'Unknown topic'}</div>
                  {t.enough_data
                    ? (
                      <div style={{ height:5, borderRadius:999, background:'var(--bg-subtle)', overflow:'hidden', maxWidth:200 }}>
                        <div style={{ height:'100%', width:`${t.score}%`, borderRadius:999, background:col }}/>
                      </div>
                    )
                    : <div style={{ fontSize:10, color:'var(--text-tert)' }}>{t.attempts_needed} more attempt{t.attempts_needed!==1?'s':''} needed to score</div>
                  }
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  {t.enough_data
                    ? <div style={{ fontSize:16, fontWeight:900, color:col }}>{t.score}%</div>
                    : <div style={{ fontSize:11, color:'var(--text-tert)' }}>{t.total} / {5}</div>
                  }
                  <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:1 }}>{t.correct}/{t.total}</div>
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}

// ── Recent sessions ───────────────────────────────────────────────────────────
// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const { dark }            = useTheme()
  const { totalPoints: xp } = usePoints()
  const profile             = useStudentUser()
  const isGuest             = !!profile?.isGuest
  const isReady             = profile !== null

  const exams   = profile?.exam_types ?? ['WAEC']
  const [exam,   setExam]   = useState('WAEC')
  const [period, setPeriod] = useState(30)

  // Drill-in state — null = overview, object = selected subject
  const [drillSubject,  setDrillSubject]  = useState(null)
  const [drillInsight,  setDrillInsight]  = useState(null)
  const [drillTrend,    setDrillTrend]    = useState([])

  // Subject overview data
  const [subjects, setSubjects] = useState([])

  // Sync exam to profile default
  useEffect(() => {
    if (profile?.exam_type) setExam(profile.exam_type)
  }, [profile?.exam_type])

  // ── Load subject overview ──────────────────────────────────────────────────
  const loadOverview = useCallback(async (currentExam, currentPeriod) => {
    // 1. Instant local read
    const local = getSubjectOverview(currentExam)
    // Attach local trend to each subject
    const withTrend = local.map(s => ({
      ...s,
      weekly_trend: getSubjectTrend(currentExam, s.subject_id),
    }))
    setSubjects(withTrend)

    // 2. Background server fetch for auth users
    if (isGuest) return
    try {
      const res  = await fetch(`/api/student/mastery?exam=${currentExam}&period=${currentPeriod}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.subjects?.length) setSubjects(data.subjects)
    } catch {}
  }, [isGuest])

  useEffect(() => {
    if (!isReady) return
    setDrillSubject(null)
    loadOverview(exam, period)
  }, [isReady, exam, period, loadOverview])

  // ── Drill into a subject ───────────────────────────────────────────────────
  const handleDrillIn = useCallback(async (subject) => {
    setDrillSubject(subject)

    // 1. Instant local insight
    const local = getPerformanceInsight(exam, subject.subject_id, period)
    setDrillInsight(local)
    setDrillTrend(getSubjectTrend(exam, subject.subject_id))

    // 2. Background server fetch for auth users
    if (isGuest) return
    try {
      const res  = await fetch(`/api/student/mastery?exam=${exam}&subject=${subject.subject_id}&period=${period}`)
      if (!res.ok) return
      const data = await res.json()
      setDrillInsight(data)
      setDrillTrend(data.weekly_trend ?? [])
    } catch {}
  }, [exam, period, isGuest])

  const handleDrillPeriodChange = useCallback(async (newPeriod) => {
    setPeriod(newPeriod)
    if (!drillSubject) return

    const local = getPerformanceInsight(exam, drillSubject.subject_id, newPeriod)
    setDrillInsight(local)

    if (isGuest) return
    try {
      const res  = await fetch(`/api/student/mastery?exam=${exam}&subject=${drillSubject.subject_id}&period=${newPeriod}`)
      if (!res.ok) return
      const data = await res.json()
      setDrillInsight(data)
      setDrillTrend(data.weekly_trend ?? [])
    } catch {}
  }, [exam, drillSubject, isGuest])

  // ── Local stats ────────────────────────────────────────────────────────────
  const activity = isReady ? readWeeklyActivity() : [0,0,0,0,0,0,0]
  const sessions = isReady ? readLocalSessions()  : []
  const { questions=0, accuracy=0 } = isReady ? deriveStats(sessions) : {}

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (!isReady) return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {[100, 140, 200].map((h,i) => (
        <div key={i} style={{ height:h, borderRadius:20, background:'var(--bg-card)', border:'1px solid var(--border)', opacity:0.6 }}/>
      ))}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      <StatCards questions={questions} accuracy={accuracy} xp={xp||0} dark={dark}/>

      <ActivityChart activity={activity} dark={dark}/>

      {/* Subject / topic analysis */}
      {drillSubject && drillInsight ? (
        <TopicDrillIn
          subject={drillSubject}
          insight={drillInsight}
          trend={drillTrend}
          period={period}
          onPeriodChange={handleDrillPeriodChange}
          onBack={() => setDrillSubject(null)}
          dark={dark}
        />
      ) : (
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:14 }}>
            <ExamToggle exam={exam} exams={exams} onChange={e => { setExam(e); setDrillSubject(null) }}/>
            <PeriodToggle period={period} onChange={setPeriod}/>
          </div>
          <SubjectOverview
            subjects={subjects}
            exam={exam}
            period={period}
            onDrillIn={handleDrillIn}
            dark={dark}
          />
        </div>
      )}

      {isGuest && (
        <Card style={{ padding:'18px 20px', background:`${BLUE}08`, border:`1px solid ${BLUE}20` }}>
          <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)', marginBottom:6 }}>Save your progress</div>
          <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5, marginBottom:12 }}>
            Create a free account to keep your performance data across devices and never lose your history.
          </div>
          <Link href="/signup" style={{ textDecoration:'none' }}>
            <div style={{ padding:'10px 16px', borderRadius:11, background:BLUE, color:'#fff', fontSize:13, fontWeight:800, textAlign:'center' }}>
              Create free account →
            </div>
          </Link>
        </Card>
      )}
    </div>
  )
}
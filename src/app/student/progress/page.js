'use client'
// src/app/student/progress/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Progress page — Performance Trend Analysis
//
// What it shows:
//   1. Quick stats (questions answered, accuracy, XP)
//   2. Practice activity bar chart (this week)
//   3. Per-subject performance trend — selectable period (1W / 2W / 1M / 3M)
//      • Line chart showing score per period bucket
//      • Strong topics / weak topics for the selected period + subject
//      • Switch between subjects and WAEC/JAMB
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { usePoints }      from '@/contexts/PointsContext'
import { useTheme }       from '@/contexts/ThemeContext'
import { useStudentUser } from '@/app/student/layout'
import {
  getSubjectOverview,
  getPerformanceInsight,
  getSubjectTrend,
  backfillTopicNames,
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

// Period options — label shown in toggle, days back to query, bucket label for chart
const PERIODS = [
  { label:'1W',  days:7,  bucketLabel:'Days',  buckets:7  },
  { label:'2W',  days:14, bucketLabel:'Days',  buckets:14 },
  { label:'1M',  days:30, bucketLabel:'Weeks', buckets:4  },
  { label:'3M',  days:90, bucketLabel:'Weeks', buckets:12 },
]

// ── Local helpers ─────────────────────────────────────────────────────────────
const ACTIVITY_KEY = 'ep_activity'

function localDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

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

// Build daily-level buckets for a subject from localMastery raw data
// Returns array of { label, score, attempts } for the chart
function buildTrendBuckets(exam, subjectId, periodDays) {
  try {
    const raw = JSON.parse(localStorage.getItem('ep_local_mastery') || '{}')
    const subject = raw[exam]?.[subjectId]
    if (!subject) return []

    // Flatten all attempts with dates
    const allAttempts = []
    for (const topic of Object.values(subject.topics)) {
      for (const a of topic.attempts) {
        allAttempts.push({ d: a.d, c: a.c })
      }
    }

    if (!allAttempts.length) return []

    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

    if (periodDays <= 14) {
      // Daily buckets — show day name + date
      const buckets = []
      for (let i = periodDays - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const key = localDateStr(d)
        const dayAttempts = allAttempts.filter(a => a.d === key)
        const total = dayAttempts.length
        const correct = dayAttempts.filter(a => a.c).length
        const label = i === 0 ? 'Today'
          : i === 1 ? 'Yest'
          : `${DAY_NAMES[d.getDay()]} ${d.getDate()}`
        buckets.push({
          label,
          score: total >= 3 ? Math.round((correct/total)*100) : null,
          attempts: total,
        })
      }
      return buckets
    } else {
      // Weekly buckets — show "Week 1", "Week 2" with the date range as tooltip-style label
      const numWeeks = periodDays === 30 ? 4 : 12
      const buckets = []
      for (let i = numWeeks - 1; i >= 0; i--) {
        const weekEnd = new Date(today)
        weekEnd.setDate(today.getDate() - i * 7)
        const weekStart = new Date(weekEnd)
        weekStart.setDate(weekEnd.getDate() - 6)
        const startKey = localDateStr(weekStart)
        const endKey   = localDateStr(weekEnd)
        const weekAttempts = allAttempts.filter(a => a.d >= startKey && a.d <= endKey)
        const total = weekAttempts.length
        const correct = weekAttempts.filter(a => a.c).length
        const weekNum = numWeeks - i
        // Label: "Wk 1" with date underneath rendered separately; keep compact
        const dateLabel = `${weekStart.getDate()} ${MONTH_ABBR[weekStart.getMonth()]}`
        buckets.push({
          label: numWeeks <= 4 ? `Wk ${weekNum}\n${dateLabel}` : `Wk ${weekNum}`,
          score: total >= 3 ? Math.round((correct/total)*100) : null,
          attempts: total,
          weekNum,
          dateLabel,
        })
      }
      return buckets
    }
  } catch { return [] }
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
      {PERIODS.map(o => {
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
function StatCards({ questions, accuracy, xp }) {
  const items = [
    { icon:'📋', label:'Questions',  value: questions.toLocaleString(), color:BLUE   },
    { icon:'🎯', label:'Accuracy',   value: `${accuracy}%`,            color:ORANGE },
    { icon:'⚡', label:'Total XP',  value: xp.toLocaleString(),       color:GOLD   },
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
      {items.map((m,i) => (
        <Card key={i} style={{ padding:'14px 14px' }}>
          <div style={{ fontSize:16, marginBottom:6 }}>{m.icon}</div>
          <div style={{ fontSize:18, fontWeight:900, color:m.color, letterSpacing:'-.03em', lineHeight:1 }}>{m.value}</div>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', marginTop:4 }}>{m.label}</div>
        </Card>
      ))}
    </div>
  )
}

// ── Activity chart (this week) ────────────────────────────────────────────────
function ActivityChart({ activity }) {
  const DAYS     = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const todayIdx = (new Date().getDay() + 6) % 7
  const max      = Math.max(...activity, 1)
  const hasAny   = activity.some(v => v > 0)

  return (
    <Card style={{ padding:'18px 18px 14px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Practice Activity</span>
        <span style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em' }}>This week</span>
      </div>

      <div style={{ display:'flex', alignItems:'flex-end', height:80, gap:5 }}>
        {DAYS.map((label, i) => {
          const count    = activity[i]
          const isFuture = i > todayIdx
          const isToday  = i === todayIdx
          const barH     = count > 0 ? Math.max(Math.round((count / max) * 64), 4) : 2

          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
              <span style={{ fontSize:8, fontWeight:800, color:'var(--text-tert)', visibility: count > 0 ? 'visible' : 'hidden' }}>
                {count}
              </span>
              <div style={{
                width:'100%', height:barH, borderRadius:'4px 4px 0 0',
                background: isToday ? `linear-gradient(180deg,${CYAN},${BLUE})` : isFuture ? 'var(--border)' : BLUE,
                opacity: isToday ? 1 : isFuture ? 0.3 : count > 0 ? 0.7 : 0.15,
                transition:'height .4s ease', minHeight:2,
              }}/>
              <span style={{ fontSize:9, fontWeight: isToday ? 800 : 600, color: isToday ? BLUE : 'var(--text-tert)' }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {!hasAny && (
        <p style={{ textAlign:'center', marginTop:10, fontSize:11, color:'var(--text-tert)' }}>
          Complete a practice session to see your activity here.
        </p>
      )}
    </Card>
  )
}

// ── Performance trend line chart ──────────────────────────────────────────────
// Key design decision: we use a ResizeObserver to measure the container's
// actual pixel width, then compute every SVG coordinate in real pixels.
// The SVG is rendered at width=containerW, height=H (fixed) with NO viewBox
// scaling — so text, dots, and lines are always the right size regardless of
// container width. Width stretches freely; height never changes.
function TrendChart({ buckets, color }) {
  const containerRef = useRef(null)
  const [containerW, setContainerW] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    // Initial measurement
    setContainerW(el.getBoundingClientRect().width)
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width
      if (w && w > 0) setContainerW(w)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Fixed layout constants — never change with container width
  const PAD_L = 38   // room for y-axis labels
  const PAD_R = 14
  const PAD_T = 28   // room for score labels above dots
  const PAD_B = 30   // room for x-axis labels
  const H     = 210  // fixed height always

  const scored  = buckets.filter(b => b.score !== null)
  const hasData = scored.length >= 1

  const first = scored[0]?.score ?? null
  const last  = scored[scored.length - 1]?.score ?? null
  const delta = (first !== null && last !== null && scored.length >= 2) ? last - first : null

  const gridLines = [0, 25, 50, 75, 100]
  const step = buckets.length <= 7 ? 1 : buckets.length <= 14 ? 2 : 3

  // Only compute points once containerW is known
  const { allPoints, scoredPoints, segments } = useMemo(() => {
    if (!containerW) return { allPoints: [], scoredPoints: [], segments: [] }
    const chartW = containerW - PAD_L - PAD_R
    const chartH = H - PAD_T - PAD_B

    const pts = buckets.map((b, i) => {
      const xRatio = buckets.length > 1 ? i / (buckets.length - 1) : 0.5
      return {
        x: PAD_L + xRatio * chartW,
        y: PAD_T + chartH * (1 - (b.score ?? 0) / 100),
        score: b.score,
        i,
      }
    })

    const sp = pts.filter(p => p.score !== null)

    // Consecutive scored segments (gaps where score is null = no data that period)
    const segs = []
    let seg = []
    for (const p of pts) {
      if (p.score !== null) { seg.push(p) }
      else { if (seg.length >= 2) segs.push(seg); seg = [] }
    }
    if (seg.length >= 2) segs.push(seg)

    return { allPoints: pts, scoredPoints: sp, segments: segs }
  }, [containerW, buckets])

  const chartH = H - PAD_T - PAD_B

  return (
    <div>
      {/* Trend badge */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        {delta !== null && (
          <div style={{
            padding:'5px 12px', borderRadius:999, fontSize:12, fontWeight:800,
            background: delta > 5 ? `${GREEN}18` : delta < -5 ? `${RED}18` : `${GOLD}18`,
            color: delta > 5 ? GREEN : delta < -5 ? RED : GOLD,
            border: `1px solid ${delta > 5 ? GREEN : delta < -5 ? RED : GOLD}35`,
          }}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}&nbsp;
            {delta === 0 ? 'No change' : `${Math.abs(Math.round(delta))}% ${delta > 5 ? 'improvement' : delta < -5 ? 'decline' : 'change'}`}
          </div>
        )}
        <span style={{ fontSize:11, color:'var(--text-tert)' }}>
          {scored.length} session{scored.length !== 1 ? 's' : ''} with data
          {!hasData && ' — practice to see your trend'}
        </span>
      </div>

      {/* Full-width container — measured by ResizeObserver */}
      <div ref={containerRef} style={{ width:'100%' }}>
        {hasData && containerW > 0 && (
          <svg
            width={containerW}
            height={H}
            style={{ display:'block', overflow:'visible' }}
          >
            {/* Y-axis grid lines + labels */}
            {gridLines.map(g => {
              const y = PAD_T + chartH * (1 - g / 100)
              return (
                <g key={g}>
                  <line
                    x1={PAD_L} y1={y} x2={containerW - PAD_R} y2={y}
                    stroke="var(--border)"
                    strokeWidth={g === 0 ? 1.2 : 0.6}
                    strokeDasharray={g === 0 ? 'none' : '4,5'}
                  />
                  <text x={PAD_L - 5} y={y + 3.5} textAnchor="end"
                    fontSize="9" fontWeight="600" fill="var(--text-tert)">
                    {g}%
                  </text>
                </g>
              )
            })}

            {/* Area under line */}
            {segments.map((seg, si) => {
              if (seg.length < 2) return null
              const baseY = PAD_T + chartH
              const d = seg.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
              return <path key={si} d={`${d} L ${seg[seg.length-1].x.toFixed(1)} ${baseY} L ${seg[0].x.toFixed(1)} ${baseY} Z`} fill={color} opacity="0.09"/>
            })}

            {/* Trend line */}
            {segments.map((seg, si) => {
              if (seg.length < 2) return null
              const d = seg.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
              return <path key={si} d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
            })}

            {/* Dots + score labels */}
            {scoredPoints.map((p, j) => {
              const isFirst   = j === 0
              const isLast    = j === scoredPoints.length - 1
              const showLabel = scoredPoints.length <= 8 || isFirst || isLast
              const labelY    = p.y < PAD_T + 14 ? p.y + 16 : p.y - 9
              return (
                <g key={j}>
                  <circle cx={p.x} cy={p.y} r="5" fill={color} stroke="var(--bg-card)" strokeWidth="2.5"/>
                  {showLabel && (
                    <text x={p.x} y={labelY} textAnchor="middle" fontSize="10" fontWeight="800" fill={color}>
                      {p.score}%
                    </text>
                  )}
                </g>
              )
            })}

            {/* X-axis ticks + labels */}
            {allPoints.map((p, i) => {
              if (i % step !== 0 && i !== allPoints.length - 1) return null
              const b = buckets[i]
              const hasDate = b?.dateLabel && buckets.length <= 4
              return (
                <g key={i}>
                  <line x1={p.x} y1={PAD_T + chartH} x2={p.x} y2={PAD_T + chartH + 5}
                    stroke="var(--border)" strokeWidth="1"/>
                  <text x={p.x} y={H - (hasDate ? 15 : 4)} textAnchor="middle"
                    fontSize="9.5" fontWeight={b?.score !== null ? '700' : '500'}
                    fill={b?.score !== null ? 'var(--text-sec)' : 'var(--border)'}>
                    {b?.weekNum ? `Wk ${b.weekNum}` : b?.label}
                  </text>
                  {hasDate && (
                    <text x={p.x} y={H - 3} textAnchor="middle" fontSize="8" fill="var(--text-tert)">
                      {b.dateLabel}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}

// ── Topic strength/weakness lists ─────────────────────────────────────────────
function TopicLists({ insight }) {
  if (!insight?.topics?.length) return (
    <div style={{ textAlign:'center', padding:'16px 0', fontSize:12, color:'var(--text-tert)' }}>
      No topic data for this period yet.
    </div>
  )

  const scored = insight.topics.filter(t => t.enough_data)
  const strong = [...scored].sort((a,b) => b.score - a.score).slice(0, 3)
  const weak   = [...scored].sort((a,b) => a.score - b.score).slice(0, 3)

  if (!scored.length) return (
    <div style={{ textAlign:'center', padding:'16px 0', fontSize:12, color:'var(--text-tert)' }}>
      Need at least 5 attempts per topic to score. Keep practising!
    </div>
  )

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
      {/* Strong */}
      <div>
        <div style={{ fontSize:10, fontWeight:800, color:GREEN, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}>
          <span>💪</span> Strong
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {strong.map((t,i) => (
            <div key={t.topic_id??i} style={{ padding:'8px 10px', borderRadius:11, background:`${GREEN}0f`, border:`1px solid ${GREEN}20` }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-prim)', marginBottom:3, lineHeight:1.3 }}>
                {t.topic_name || 'Unknown'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ flex:1, height:4, borderRadius:999, background:'var(--bg-subtle)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${t.score}%`, borderRadius:999, background:GREEN }}/>
                </div>
                <span style={{ fontSize:10, fontWeight:900, color:GREEN, flexShrink:0 }}>{t.score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weak */}
      <div>
        <div style={{ fontSize:10, fontWeight:800, color:RED, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}>
          <span>⚠️</span> Needs Work
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {weak.map((t,i) => (
            <div key={t.topic_id??i} style={{ padding:'8px 10px', borderRadius:11, background:`${RED}0f`, border:`1px solid ${RED}20` }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-prim)', marginBottom:3, lineHeight:1.3 }}>
                {t.topic_name || 'Unknown'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ flex:1, height:4, borderRadius:999, background:'var(--bg-subtle)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${t.score}%`, borderRadius:999, background:RED }}/>
                </div>
                <span style={{ fontSize:10, fontWeight:900, color:RED, flexShrink:0 }}>{t.score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Subject selector tabs ─────────────────────────────────────────────────────
function SubjectTabs({ subjects, activeId, onSelect }) {
  if (!subjects.length) return null
  return (
    <div style={{ display:'flex', gap:8, overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:2, scrollbarWidth:'none' }}>
      {subjects.map(s => {
        const on  = s.subject_id === activeId
        const col = getColor(s.subject_name)
        return (
          <button key={s.subject_id} onClick={() => onSelect(s)}
            style={{
              flexShrink:0, padding:'8px 14px', borderRadius:12, border:'none', cursor:'pointer', fontFamily:'inherit',
              background: on ? col : 'var(--bg-card)',
              color: on ? '#fff' : 'var(--text-tert)',
              fontSize:12, fontWeight:on?800:600,
              border: `1.5px solid ${on ? col : 'var(--border)'}`,
              display:'flex', alignItems:'center', gap:6,
              transition:'all .15s',
            }}>
            <span>{getIcon(s.subject_name)}</span>
            <span>{s.subject_name.replace('English Language','English').replace('Further Mathematics','Further Maths').replace('Literature in English','Literature')}</span>
            {s.subject_score !== null && (
              <span style={{ fontSize:10, fontWeight:900, opacity: on ? 1 : 0.7 }}>{s.subject_score}%</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const { dark }            = useTheme()
  const { totalPoints: xp } = usePoints()
  const profile             = useStudentUser()
  const isGuest             = !!profile?.isGuest
  const isReady             = profile !== null

  const exams = profile?.exam_types ?? ['WAEC']
  const [exam,   setExam]   = useState('WAEC')
  const [period, setPeriod] = useState(30)

  // Subject-level state
  const [subjects,    setSubjects]    = useState([])   // overview list
  const [activeSubj,  setActiveSubj]  = useState(null) // selected subject object
  const [insight,     setInsight]     = useState(null) // topic breakdown
  const [trendBuckets,setTrendBuckets]= useState([])

  // Sync exam to profile default
  useEffect(() => {
    if (profile?.exam_type) setExam(profile.exam_type)
  }, [profile?.exam_type])

  // ── Load subject overview ──────────────────────────────────────────────────
  const loadOverview = useCallback(async (currentExam, currentPeriod) => {
    const local = getSubjectOverview(currentExam).map(s => ({
      ...s,
      weekly_trend: getSubjectTrend(currentExam, s.subject_id),
    }))
    setSubjects(local)

    // Auto-select first subject
    if (local.length) {
      setActiveSubj(prev => {
        const stillValid = prev && local.find(s => s.subject_id === prev.subject_id)
        return stillValid || local[0]
      })
    } else {
      setActiveSubj(null)
    }

    if (isGuest) return
    try {
      const res  = await fetch(`/api/student/mastery?exam=${currentExam}&period=${currentPeriod}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.subjects?.length) {
        setSubjects(data.subjects)
        setActiveSubj(prev => {
          const stillValid = prev && data.subjects.find(s => s.subject_id === prev.subject_id)
          return stillValid || data.subjects[0]
        })
      }
    } catch {}
  }, [isGuest])

  useEffect(() => {
    if (!isReady) return
    loadOverview(exam, period)
  }, [isReady, exam, period, loadOverview])

  // ── Load insight + trend for active subject ────────────────────────────────
  useEffect(() => {
    if (!activeSubj) { setInsight(null); setTrendBuckets([]); return }

    // Instant local insight
    const local = getPerformanceInsight(exam, activeSubj.subject_id, period)
    setInsight(local)

    // Build trend buckets from raw local mastery
    const buckets = buildTrendBuckets(exam, activeSubj.subject_id, period)
    setTrendBuckets(buckets)

    // Backfill any blank topic names from the API — fixes existing localStorage data
    ;(async () => {
      try {
        const res = await fetch(`/api/student/topics?subject_id=${activeSubj.subject_id}&exam=${exam}`)
        if (!res.ok) return
        const topics = await res.json()
        if (!Array.isArray(topics) || !topics.length) return
        const nameMap = {}
        for (const t of topics) if (t.id && t.name) nameMap[t.id] = t.name
        backfillTopicNames(exam, activeSubj.subject_id, nameMap)
        // Re-read insight after backfill so names appear immediately
        setInsight(getPerformanceInsight(exam, activeSubj.subject_id, period))
      } catch {}
    })()

    // Background server fetch for auth users
    if (isGuest) return
    ;(async () => {
      try {
        const res  = await fetch(`/api/student/mastery?exam=${exam}&subject=${activeSubj.subject_id}&period=${period}`)
        if (!res.ok) return
        const data = await res.json()
        setInsight(data)
      } catch {}
    })()
  }, [activeSubj?.subject_id, exam, period, isGuest])

  // ── Local stats ────────────────────────────────────────────────────────────
  const activity = isReady ? readWeeklyActivity() : [0,0,0,0,0,0,0]
  const sessions = isReady ? readLocalSessions()  : []
  const { questions=0, accuracy=0 } = isReady ? deriveStats(sessions) : {}

  const activeColor = activeSubj ? getColor(activeSubj.subject_name) : BLUE

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (!isReady) return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {[80, 120, 300].map((h,i) => (
        <div key={i} style={{ height:h, borderRadius:20, background:'var(--bg-card)', border:'1px solid var(--border)', opacity:0.6 }}/>
      ))}
    </div>
  )

  const periodLabel = PERIODS.find(p => p.days === period)?.label ?? '1M'
  const noSubjectData = !subjects.length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      <StatCards questions={questions} accuracy={accuracy} xp={xp||0} />

      <ActivityChart activity={activity} />

      {/* ── Performance Trend Analysis ── */}
      <Card style={{ padding:'18px' }}>
        {/* Header */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', marginBottom:4 }}>
            Performance Trend
          </div>
          <div style={{ fontSize:11, color:'var(--text-tert)' }}>
            Track how your scores change over time, per subject
          </div>
        </div>

        {/* Exam toggle + period toggle */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:16 }}>
          <ExamToggle exam={exam} exams={exams} onChange={e => { setExam(e); setActiveSubj(null) }}/>
          <PeriodToggle period={period} onChange={setPeriod}/>
        </div>

        {noSubjectData ? (
          <div style={{ textAlign:'center', padding:'28px 0' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>📊</div>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No data yet for {exam}</div>
            <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.6, marginBottom:16 }}>
              Complete practice sessions to see your performance trend here.
            </div>
            <Link href="/student/practice" style={{ textDecoration:'none' }}>
              <div style={{ display:'inline-block', padding:'10px 22px', borderRadius:999, background:BLUE, color:'#fff', fontSize:13, fontWeight:800 }}>Start Practising →</div>
            </Link>
          </div>
        ) : (
          <>
            {/* Subject selector */}
            <SubjectTabs subjects={subjects} activeId={activeSubj?.subject_id} onSelect={setActiveSubj}/>

            {/* Active subject trend */}
            {activeSubj && (
              <div style={{ marginTop:16 }}>
                {/* Subject header */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <div style={{ width:36, height:36, borderRadius:11, background:`${activeColor}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {getIcon(activeSubj.subject_name)}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)' }}>{activeSubj.subject_name}</div>
                    <div style={{ fontSize:10, color:'var(--text-tert)' }}>
                      {activeSubj.total_attempts} attempts · {periodLabel} view
                    </div>
                  </div>
                  {activeSubj.subject_score !== null && (
                    <div style={{ marginLeft:'auto', fontSize:22, fontWeight:900, color:activeColor }}>
                      {activeSubj.subject_score}%
                    </div>
                  )}
                </div>

                {/* Trend chart */}
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>
                    Score trend — {periodLabel}
                  </div>
                  <TrendChart buckets={trendBuckets} color={activeColor} periodDays={period}/>
                </div>

                {/* Link to full trends page */}
                <Link href={`/student/progress/trends?exam=${exam}&subject=${activeSubj.subject_id}`} style={{ textDecoration:'none', display:'block', marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 16px', borderRadius:11, border:`1px solid ${activeColor}30`, background:`${activeColor}08`, cursor:'pointer' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:activeColor }}>View full performance analysis</span>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5h8M7 3l3.5 3.5L7 10" stroke={activeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </Link>

                {/* Divider */}
                <div style={{ height:1, background:'var(--border)', margin:'4px 0 14px' }}/>

                {/* Topic strength/weakness */}
                <div style={{ fontSize:11, fontWeight:800, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>
                  Topics this period
                </div>
                <TopicLists insight={insight}/>

                {/* All topics — expandable row */}
                {insight?.topics?.length > 0 && (
                  <details style={{ marginTop:14 }}>
                    <summary style={{ fontSize:11, fontWeight:700, color:BLUE, cursor:'pointer', listStyle:'none', display:'flex', alignItems:'center', gap:4 }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      All {insight.topics.length} topics
                    </summary>
                    <div style={{ marginTop:10 }}>
                      {insight.topics.map((t,i) => {
                        const sc = t.enough_data ? (t.score >= 70 ? GREEN : t.score >= 40 ? GOLD : RED) : 'var(--text-tert)'
                        return (
                          <div key={t.topic_id??i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-prim)' }}>{t.topic_name||'Unknown'}</div>
                              {t.enough_data ? (
                                <div style={{ height:4, borderRadius:999, background:'var(--bg-subtle)', overflow:'hidden', marginTop:4, maxWidth:180 }}>
                                  <div style={{ height:'100%', width:`${t.score}%`, borderRadius:999, background:sc }}/>
                                </div>
                              ) : (
                                <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:2 }}>
                                  {t.attempts_needed} more attempt{t.attempts_needed!==1?'s':''} needed
                                </div>
                              )}
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                              {t.enough_data
                                ? <span style={{ fontSize:14, fontWeight:900, color:sc }}>{t.score}%</span>
                                : <span style={{ fontSize:11, color:'var(--text-tert)' }}>{t.total}/5</span>
                              }
                              <div style={{ fontSize:9, color:'var(--text-tert)', marginTop:1 }}>{t.correct}/{t.total}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </details>
                )}
              </div>
            )}
          </>
        )}
      </Card>

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
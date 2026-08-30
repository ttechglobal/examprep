'use client'
// src/app/student/progress/trends/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen performance analysis page.
// Accessed from the progress page "View full analysis →" link.
//
// Shows:
//   - All subjects side-by-side trend overview
//   - Large detailed chart for selected subject
//   - Full topic breakdown table
//   - Period selector + exam toggle
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams }  from 'next/navigation'
import { useTheme }         from '@/contexts/ThemeContext'
import { useStudentUser }   from '@/app/student/layout'
import {
  getSubjectOverview,
  getPerformanceInsight,
  backfillTopicNames,
} from '@/lib/localMastery'
import Link from 'next/link'

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GOLD   = '#FFB800'
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

const PERIODS = [
  { label:'1 Week',   days:7  },
  { label:'2 Weeks',  days:14 },
  { label:'1 Month',  days:30 },
  { label:'3 Months', days:90 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function localDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildTrendBuckets(exam, subjectId, periodDays) {
  try {
    const raw     = JSON.parse(localStorage.getItem('ep_local_mastery') || '{}')
    const subject = raw[exam]?.[subjectId]
    if (!subject) return []

    const allAttempts = []
    for (const topic of Object.values(subject.topics)) {
      for (const a of topic.attempts) allAttempts.push({ d: a.d, c: a.c })
    }
    if (!allAttempts.length) return []

    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const DAY_NAMES  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

    if (periodDays <= 14) {
      return Array.from({ length: periodDays }, (_, i) => {
        const d = new Date(today)
        d.setDate(today.getDate() - (periodDays - 1 - i))
        const key  = localDateStr(d)
        const day  = allAttempts.filter(a => a.d === key)
        const tot  = day.length
        const cor  = day.filter(a => a.c).length
        const lbl  = i === periodDays - 1 ? 'Today'
          : i === periodDays - 2 ? 'Yest'
          : `${DAY_NAMES[d.getDay()]} ${d.getDate()}`
        return { label: lbl, score: tot >= 3 ? Math.round((cor/tot)*100) : null, attempts: tot }
      })
    } else {
      const numWeeks = periodDays === 30 ? 4 : 12
      return Array.from({ length: numWeeks }, (_, i) => {
        const idx      = numWeeks - 1 - i
        const weekEnd  = new Date(today)
        weekEnd.setDate(today.getDate() - idx * 7)
        const weekStart = new Date(weekEnd)
        weekStart.setDate(weekEnd.getDate() - 6)
        const sk  = localDateStr(weekStart)
        const ek  = localDateStr(weekEnd)
        const wk  = allAttempts.filter(a => a.d >= sk && a.d <= ek)
        const tot = wk.length
        const cor = wk.filter(a => a.c).length
        const wn  = i + 1
        return {
          label: `Wk ${wn}`,
          score: tot >= 3 ? Math.round((cor/tot)*100) : null,
          attempts: tot,
          weekNum: wn,
          dateLabel: `${weekStart.getDate()} ${MONTH_ABBR[weekStart.getMonth()]}`,
        }
      })
    }
  } catch { return [] }
}

// ── Trend chart (same ResizeObserver approach as progress page) ───────────────
function TrendChart({ buckets, color, height = 240 }) {
  const containerRef = useRef(null)
  const [containerW, setContainerW] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerW(el.getBoundingClientRect().width)
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width
      if (w && w > 0) setContainerW(w)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const PAD_L = 40, PAD_R = 16, PAD_T = 32, PAD_B = 36
  const H     = height

  const scored  = buckets.filter(b => b.score !== null)
  const hasData = scored.length >= 1

  const { allPoints, scoredPoints, segments } = useMemo(() => {
    if (!containerW) return { allPoints:[], scoredPoints:[], segments:[] }
    const chartW = containerW - PAD_L - PAD_R
    const chartH = H - PAD_T - PAD_B
    const pts = buckets.map((b, i) => {
      const xR = buckets.length > 1 ? i / (buckets.length - 1) : 0.5
      return { x: PAD_L + xR * chartW, y: PAD_T + chartH * (1 - (b.score ?? 0) / 100), score: b.score, i }
    })
    const sp = pts.filter(p => p.score !== null)
    const segs = []; let seg = []
    for (const p of pts) {
      if (p.score !== null) { seg.push(p) }
      else { if (seg.length >= 2) segs.push(seg); seg = [] }
    }
    if (seg.length >= 2) segs.push(seg)
    return { allPoints: pts, scoredPoints: sp, segments: segs }
  }, [containerW, buckets, H])

  const chartH = H - PAD_T - PAD_B
  const step   = buckets.length <= 7 ? 1 : buckets.length <= 14 ? 2 : 3

  return (
    <div ref={containerRef} style={{ width:'100%' }}>
      {hasData && containerW > 0 && (
        <svg width={containerW} height={H} style={{ display:'block', overflow:'visible' }}>
          {/* Grid */}
          {[0,25,50,75,100].map(g => {
            const y = PAD_T + chartH * (1 - g / 100)
            return (
              <g key={g}>
                <line x1={PAD_L} y1={y} x2={containerW - PAD_R} y2={y}
                  stroke="var(--border)" strokeWidth={g === 0 ? 1.2 : 0.6}
                  strokeDasharray={g === 0 ? 'none' : '4,5'}/>
                <text x={PAD_L - 6} y={y + 3.5} textAnchor="end"
                  fontSize="10" fontWeight="600" fill="var(--text-tert)">{g}%</text>
              </g>
            )
          })}
          {/* Area */}
          {segments.map((seg, si) => {
            if (seg.length < 2) return null
            const baseY = PAD_T + chartH
            const d = seg.map((p,j) => `${j===0?'M':'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
            return <path key={si} d={`${d} L ${seg[seg.length-1].x.toFixed(1)} ${baseY} L ${seg[0].x.toFixed(1)} ${baseY} Z`} fill={color} opacity="0.1"/>
          })}
          {/* Line */}
          {segments.map((seg, si) => {
            if (seg.length < 2) return null
            const d = seg.map((p,j) => `${j===0?'M':'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
            return <path key={si} d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
          })}
          {/* Dots + labels */}
          {scoredPoints.map((p, j) => {
            const isFirst = j === 0, isLast = j === scoredPoints.length - 1
            const show = scoredPoints.length <= 10 || isFirst || isLast
            const ly   = p.y < PAD_T + 16 ? p.y + 17 : p.y - 10
            return (
              <g key={j}>
                <circle cx={p.x} cy={p.y} r="5.5" fill={color} stroke="var(--bg-card)" strokeWidth="2.5"/>
                {show && <text x={p.x} y={ly} textAnchor="middle" fontSize="10.5" fontWeight="800" fill={color}>{p.score}%</text>}
              </g>
            )
          })}
          {/* X-axis */}
          {allPoints.map((p, i) => {
            if (i % step !== 0 && i !== allPoints.length - 1) return null
            const b = buckets[i]
            const hasDate = b?.dateLabel && buckets.length <= 4
            return (
              <g key={i}>
                <line x1={p.x} y1={PAD_T + chartH} x2={p.x} y2={PAD_T + chartH + 5} stroke="var(--border)" strokeWidth="1"/>
                <text x={p.x} y={H - (hasDate ? 16 : 5)} textAnchor="middle"
                  fontSize="10" fontWeight={b?.score !== null ? '700' : '500'}
                  fill={b?.score !== null ? 'var(--text-sec)' : 'var(--border)'}>
                  {b?.weekNum ? `Wk ${b.weekNum}` : b?.label}
                </text>
                {hasDate && <text x={p.x} y={H - 3} textAnchor="middle" fontSize="8.5" fill="var(--text-tert)">{b.dateLabel}</text>}
              </g>
            )
          })}
        </svg>
      )}
      {!hasData && (
        <div style={{ height: H, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-tert)', fontSize:13 }}>
          No data yet for this period
        </div>
      )}
    </div>
  )
}

// ── Mini sparkline for subject cards ─────────────────────────────────────────
function Sparkline({ buckets, color, width = 80, height = 32 }) {
  const scored = buckets.filter(b => b.score !== null)
  if (scored.length < 2) return <div style={{ width, height }}/>

  const pts = scored.map((b, i) => ({
    x: 4 + (i / (scored.length - 1)) * (width - 8),
    y: 4 + (height - 8) * (1 - b.score / 100),
  }))
  const d = pts.map((p,i) => `${i===0?'M':'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const first = scored[0].score, last = scored[scored.length-1].score
  const trendColor = last > first ? GREEN : last < first ? RED : color

  return (
    <svg width={width} height={height} style={{ display:'block', overflow:'visible' }}>
      <path d={d} fill="none" stroke={trendColor} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="3" fill={trendColor}/>
    </svg>
  )
}

// ── Subject overview card ─────────────────────────────────────────────────────
function SubjectCard({ subject, exam, period, isActive, onClick }) {
  const [buckets, setBuckets] = useState([])
  const color = getColor(subject.subject_name)

  useEffect(() => {
    setBuckets(buildTrendBuckets(exam, subject.subject_id, period))
  }, [exam, subject.subject_id, period])

  const scored = buckets.filter(b => b.score !== null)
  const first  = scored[0]?.score ?? null
  const last   = scored[scored.length-1]?.score ?? null
  const delta  = (first !== null && last !== null && scored.length >= 2) ? last - first : null

  return (
    <button onClick={onClick} style={{
      padding:'14px 16px', borderRadius:16, border:`2px solid ${isActive ? color : 'var(--border)'}`,
      background: isActive ? `${color}10` : 'var(--bg-card)',
      cursor:'pointer', textAlign:'left', width:'100%', fontFamily:'inherit',
      transition:'all .15s', boxShadow: isActive ? `0 0 0 1px ${color}30` : 'none',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:18 }}>{getIcon(subject.subject_name)}</span>
          <div>
            <div style={{ fontSize:12, fontWeight:800, color:'var(--text-prim)', lineHeight:1.2 }}>
              {subject.subject_name.replace('English Language','English').replace('Further Mathematics','Further Maths').replace('Literature in English','Literature')}
            </div>
            <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:2 }}>
              {subject.total_attempts} attempts
            </div>
          </div>
        </div>
        {subject.subject_score !== null && (
          <div style={{ fontSize:18, fontWeight:900, color, flexShrink:0 }}>{subject.subject_score}%</div>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Sparkline buckets={buckets} color={color} width={80} height={28}/>
        {delta !== null && (
          <span style={{ fontSize:10, fontWeight:800, color: delta > 5 ? GREEN : delta < -5 ? RED : 'var(--text-tert)' }}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {Math.abs(Math.round(delta))}%
          </span>
        )}
      </div>
    </button>
  )
}

// ── Topic table — desktop / topic cards — mobile ──────────────────────────────
function TopicTable({ insight, color, isMobile }) {
  const topics = insight?.topics ?? []
  if (!topics.length) return (
    <div style={{ padding:'24px 0', textAlign:'center', color:'var(--text-tert)', fontSize:13 }}>
      No topic data for this period. Keep practising!
    </div>
  )

  const sorted = [...topics].sort((a,b) => {
    if (a.enough_data && !b.enough_data) return -1
    if (!a.enough_data && b.enough_data) return 1
    return (b.score ?? -1) - (a.score ?? -1)
  })

  if (isMobile) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {sorted.map((t, i) => {
          const sc = t.enough_data
            ? (t.score >= 70 ? GREEN : t.score >= 40 ? GOLD : RED)
            : 'var(--text-tert)'
          const label = t.score >= 70 ? 'Strong' : t.score >= 40 ? 'Average' : 'Weak'
          return (
            <div key={t.topic_id ?? i} style={{ padding:'12px 14px', borderRadius:14, border:'1px solid var(--border)', background:'var(--bg-subtle)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: t.enough_data ? 8 : 0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)', flex:1, marginRight:8 }}>
                  {t.topic_name || 'Unknown'}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <span style={{ fontSize:11, color:'var(--text-tert)' }}>{t.correct}/{t.total}</span>
                  {t.enough_data ? (
                    <span style={{ fontSize:11, fontWeight:800, color:sc, padding:'2px 8px', borderRadius:999, background:`${sc}18`, border:`1px solid ${sc}30` }}>
                      {label}
                    </span>
                  ) : (
                    <span style={{ fontSize:11, color:'var(--text-tert)' }}>{t.attempts_needed} more</span>
                  )}
                </div>
              </div>
              {t.enough_data && (
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1, height:5, borderRadius:999, background:'var(--bg-card)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${t.score}%`, background:sc, borderRadius:999 }}/>
                  </div>
                  <span style={{ fontSize:13, fontWeight:900, color:sc, flexShrink:0 }}>{t.score}%</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 140px 80px', gap:12, padding:'8px 12px', borderBottom:'2px solid var(--border)' }}>
        {['Topic','Attempts','Score','Status'].map(h => (
          <div key={h} style={{ fontSize:10, fontWeight:800, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.07em' }}>{h}</div>
        ))}
      </div>
      {sorted.map((t, i) => {
        const sc = t.enough_data
          ? (t.score >= 70 ? GREEN : t.score >= 40 ? GOLD : RED)
          : 'var(--text-tert)'
        const label = t.score >= 70 ? 'Strong' : t.score >= 40 ? 'Average' : 'Weak'
        return (
          <div key={t.topic_id ?? i} style={{
            display:'grid', gridTemplateColumns:'1fr 80px 140px 80px', gap:12,
            padding:'11px 12px', borderBottom:'1px solid var(--border)',
            background: i % 2 === 0 ? 'transparent' : 'var(--bg-subtle)',
            alignItems:'center',
          }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-prim)' }}>{t.topic_name || 'Unknown'}</div>
            <div style={{ fontSize:12, color:'var(--text-tert)' }}>{t.correct}/{t.total}</div>
            <div>
              {t.enough_data ? (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ flex:1, height:5, borderRadius:999, background:'var(--bg-subtle)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${t.score}%`, background:sc, borderRadius:999 }}/>
                  </div>
                  <span style={{ fontSize:12, fontWeight:800, color:sc, flexShrink:0 }}>{t.score}%</span>
                </div>
              ) : (
                <span style={{ fontSize:11, color:'var(--text-tert)' }}>{t.attempts_needed} more needed</span>
              )}
            </div>
            <div>
              {t.enough_data
                ? <span style={{ fontSize:10, fontWeight:800, color:sc, padding:'3px 8px', borderRadius:999, background:`${sc}18`, border:`1px solid ${sc}30` }}>{label}</span>
                : <span style={{ fontSize:10, color:'var(--text-tert)' }}>—</span>
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TrendsPage() {
  const { dark }   = useTheme()
  const profile    = useStudentUser()
  const params     = useSearchParams()
  const isReady    = profile !== null

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = e => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const exams = profile?.exam_types ?? ['WAEC']
  const [exam,   setExam]   = useState(params.get('exam') ?? 'WAEC')
  const [period, setPeriod] = useState(30)

  const [subjects,    setSubjects]    = useState([])
  const [activeSubj,  setActiveSubj]  = useState(null)
  const [insight,     setInsight]     = useState(null)
  const [trendBuckets,setTrendBuckets]= useState([])
  // On mobile, whether to show subject list or detail panel
  const [mobileView, setMobileView]   = useState('list') // 'list' | 'detail'

  const loadOverview = useCallback(() => {
    const local = getSubjectOverview(exam)
    setSubjects(local)
    if (local.length) {
      const paramSubjId = params.get('subject')
      const match = paramSubjId && local.find(s => s.subject_id === paramSubjId)
      setActiveSubj(prev => {
        const stillValid = prev && local.find(s => s.subject_id === prev.subject_id)
        return stillValid || match || local[0]
      })
      // If a subject is pre-selected via URL param, go straight to detail on mobile
      if (paramSubjId) setMobileView('detail')
    }
  }, [exam, params])

  useEffect(() => { if (isReady) loadOverview() }, [isReady, exam, period, loadOverview])

  useEffect(() => {
    if (!activeSubj) { setInsight(null); setTrendBuckets([]); return }
    setInsight(getPerformanceInsight(exam, activeSubj.subject_id, period))
    setTrendBuckets(buildTrendBuckets(exam, activeSubj.subject_id, period))
    ;(async () => {
      try {
        const res = await fetch(`/api/student/topics?subject_id=${activeSubj.subject_id}&exam=${exam}`)
        if (!res.ok) return
        const topics = await res.json()
        if (!Array.isArray(topics)) return
        const nameMap = {}
        for (const t of topics) if (t.id && t.name) nameMap[t.id] = t.name
        backfillTopicNames(exam, activeSubj.subject_id, nameMap)
        setInsight(getPerformanceInsight(exam, activeSubj.subject_id, period))
      } catch {}
    })()
  }, [activeSubj?.subject_id, exam, period])

  const activeColor = activeSubj ? getColor(activeSubj.subject_name) : BLUE
  const periodLabel = PERIODS.find(p => p.days === period)?.label ?? '1 Month'
  const first = trendBuckets.filter(b=>b.score!==null)[0]?.score ?? null
  const last  = [...trendBuckets].filter(b=>b.score!==null).pop()?.score ?? null
  const delta = (first !== null && last !== null) ? last - first : null

  function handleSubjectSelect(s) {
    setActiveSubj(s)
    if (isMobile) setMobileView('detail')
  }

  if (!isReady) return (
    <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>
      {[60,300,200].map((h,i) => (
        <div key={i} style={{ height:h, borderRadius:20, background:'var(--bg-card)', border:'1px solid var(--border)', opacity:.6 }}/>
      ))}
    </div>
  )

  // ── Controls bar (shared between mobile and desktop) ──
  const ControlsBar = () => (
    <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
      <div style={{ display:'inline-flex', background:'var(--bg-subtle)', borderRadius:13, padding:3, border:'1px solid var(--border)', gap:2 }}>
        {exams.map(e => {
          const on = e === exam
          return (
            <button key={e} onClick={() => { setExam(e); setActiveSubj(null); setMobileView('list') }}
              style={{ padding:'6px 16px', borderRadius:10, fontSize:13, fontWeight:on?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:on?BLUE:'transparent', color:on?'#fff':'var(--text-tert)', transition:'all .15s' }}>
              {e}
            </button>
          )
        })}
      </div>
      <div style={{ display:'inline-flex', background:'var(--bg-subtle)', borderRadius:11, padding:3, border:'1px solid var(--border)', gap:2 }}>
        {PERIODS.map(o => {
          const on = o.days === period
          return (
            <button key={o.days} onClick={() => setPeriod(o.days)}
              style={{ padding:'5px 11px', borderRadius:8, fontSize:11, fontWeight:on?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:on?NAVY:'transparent', color:on?GOLD:'var(--text-tert)', transition:'all .15s' }}>
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── Detail panel (shared between mobile and desktop) ──
  const DetailPanel = () => !activeSubj ? null : (
    <>
      <div style={{ padding: isMobile ? '16px' : '20px 24px', borderRadius:20, border:'1px solid var(--border)', background:'var(--bg-card)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' }}>
          <div style={{ width:40, height:40, borderRadius:13, background:`${activeColor}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
            {getIcon(activeSubj.subject_name)}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)' }}>{activeSubj.subject_name}</div>
            <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>{activeSubj.total_attempts} attempts · {periodLabel}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
            {activeSubj.subject_score !== null && (
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:24, fontWeight:900, color:activeColor, lineHeight:1 }}>{activeSubj.subject_score}%</div>
                <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:1 }}>Overall</div>
              </div>
            )}
            {delta !== null && (
              <div style={{
                padding:'7px 12px', borderRadius:11, fontSize:12, fontWeight:800, textAlign:'center',
                background: delta > 5 ? `${GREEN}18` : delta < -5 ? `${RED}18` : '#88888818',
                color: delta > 5 ? GREEN : delta < -5 ? RED : 'var(--text-tert)',
                border: `1px solid ${delta > 5 ? GREEN : delta < -5 ? RED : 'var(--border)'}40`,
              }}>
                {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {Math.abs(Math.round(delta))}%
                <div style={{ fontSize:9, fontWeight:600, marginTop:2, opacity:.8 }}>
                  {delta > 5 ? 'Improving' : delta < -5 ? 'Declining' : 'Steady'}
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize:11, fontWeight:800, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>
          Score trend — {periodLabel}
        </div>
        <TrendChart buckets={trendBuckets} color={activeColor} height={isMobile ? 180 : 260}/>
      </div>

      <div style={{ padding: isMobile ? '16px' : '20px 24px', borderRadius:20, border:'1px solid var(--border)', background:'var(--bg-card)' }}>
        <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', marginBottom:14 }}>
          Topic Breakdown — {periodLabel}
        </div>
        <TopicTable insight={insight} color={activeColor} isMobile={isMobile}/>
      </div>
    </>
  )

  // ── MOBILE layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {mobileView === 'detail' ? (
            <button onClick={() => setMobileView('list')} style={{ padding:'8px 12px', borderRadius:11, border:'1px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:'inherit' }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M10.5 6.5h-8M6 3L2.5 6.5 6 10" stroke="var(--text-tert)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)' }}>Subjects</span>
            </button>
          ) : (
            <Link href="/student/progress" style={{ textDecoration:'none' }}>
              <div style={{ padding:'8px 12px', borderRadius:11, border:'1px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M10.5 6.5h-8M6 3L2.5 6.5 6 10" stroke="var(--text-tert)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)' }}>Back</span>
              </div>
            </Link>
          )}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>
              {mobileView === 'detail' && activeSubj ? activeSubj.subject_name : 'Performance Analysis'}
            </div>
          </div>
        </div>

        <ControlsBar/>

        {mobileView === 'list' ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em' }}>
              Tap a subject to see its trend
            </div>
            {subjects.length === 0 && (
              <div style={{ padding:'20px', borderRadius:16, border:'1px solid var(--border)', background:'var(--bg-card)', textAlign:'center', color:'var(--text-tert)', fontSize:12 }}>
                No practice data yet for {exam}.
              </div>
            )}
            {subjects.map(s => (
              <SubjectCard key={s.subject_id} subject={s} exam={exam} period={period}
                isActive={s.subject_id === activeSubj?.subject_id}
                onClick={() => handleSubjectSelect(s)}/>
            ))}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <DetailPanel/>
          </div>
        )}
      </div>
    )
  }

  // ── DESKTOP layout ─────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <Link href="/student/progress" style={{ textDecoration:'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:11, border:'1px solid var(--border)', background:'var(--bg-card)', cursor:'pointer' }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M10.5 6.5h-8M6 3L2.5 6.5 6 10" stroke="var(--text-tert)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)' }}>Back</span>
          </div>
        </Link>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em' }}>Performance Analysis</h1>
          <p style={{ margin:0, fontSize:12, color:'var(--text-tert)', marginTop:3 }}>Your score trends across subjects and topics</p>
        </div>
        <div style={{ marginLeft:'auto' }}>
          <ControlsBar/>
        </div>
      </div>

      {/* Two-column grid */}
      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20, alignItems:'flex-start' }}>
        {/* Left: subject list */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:11, fontWeight:800, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>Subjects</div>
          {subjects.length === 0 && (
            <div style={{ padding:'20px 16px', borderRadius:16, border:'1px solid var(--border)', background:'var(--bg-card)', textAlign:'center', color:'var(--text-tert)', fontSize:12 }}>
              No practice data yet for {exam}.
            </div>
          )}
          {subjects.map(s => (
            <SubjectCard key={s.subject_id} subject={s} exam={exam} period={period}
              isActive={s.subject_id === activeSubj?.subject_id}
              onClick={() => handleSubjectSelect(s)}/>
          ))}
        </div>

        {/* Right: detail */}
        <div style={{ display:'flex', flexDirection:'column', gap:16, minWidth:0 }}>
          {!activeSubj ? (
            <div style={{ padding:'48px 24px', borderRadius:20, border:'1px solid var(--border)', background:'var(--bg-card)', textAlign:'center', color:'var(--text-tert)', fontSize:13 }}>
              Select a subject on the left to see its trend.
            </div>
          ) : <DetailPanel/>}
        </div>
      </div>
    </div>
  )
}
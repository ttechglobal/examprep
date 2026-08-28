'use client'
// src/app/student/progress/page.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// Local-first. Profile from layout context (instant).
// Activity: ep_activity localStorage (written by session save — same as home).
// Session stats: derived from ep_session_history (written by session save).
// Subject mastery: background fetch for auth users, empty state for guests.
// No blocking spinner — skeleton while layout resolves.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { usePoints }       from '@/contexts/PointsContext'
import { useTheme }        from '@/contexts/ThemeContext'
import { useStudentUser }  from '@/app/student/layout'
import { readLocalSessions } from '@/components/student/SessionHistory'
import Link from 'next/link'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const PURPLE = '#7C3AED'
const RED    = '#f43f5e'

const ACTIVITY_KEY  = 'ep_activity'
const MASTERY_KEY   = 'ep_mastery_cache'
const MASTERY_SECS  = 600

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

function readWeeklyActivity() {
  try {
    const data   = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '{}')
    const counts = [0, 0, 0, 0, 0, 0, 0]
    const today  = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      counts[i] = data[d.toISOString().slice(0, 10)] || 0
    }
    return counts
  } catch { return [0, 0, 0, 0, 0, 0, 0] }
}

function deriveStatsFromSessions(sessions) {
  if (!sessions.length) return {}
  const total    = sessions.reduce((a, s) => a + (s.count || 0), 0)
  const correct  = sessions.reduce((a, s) => a + (s.correct || 0), 0)
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  return {
    questions: { value: total },
    accuracy:  { value: accuracy },
    xp:        { value: 0 },  // comes from PointsContext
    streak:    { value: 0 },
  }
}

function Card({ children, style={} }) {
  return <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 2px 16px rgba(6,42,120,.06)', overflow:'hidden', ...style }}>{children}</div>
}
function SectionLabel({ children, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
      <span style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.025em' }}>{children}</span>
      {right}
    </div>
  )
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function HeroBanner({ name, dark }) {
  return (
    <div style={{ borderRadius:22, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY} 0%,#0a1f5e 60%,#0e2875 100%)`:`linear-gradient(135deg,${NAVY} 0%,#0c2360 50%,#1040a0 100%)`, padding:'24px 28px', display:'flex', alignItems:'flex-end', minHeight:120 }}>
      <div style={{ position:'absolute', top:0, right:0, width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.1) 0%,transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ flex:1, zIndex:1 }}>
        <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', color:'rgba(255,255,255,.45)', marginBottom:6 }}>Your Progress</div>
        <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-.035em', lineHeight:1.15, marginBottom:6 }}>Great job, {name}! 👋</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.55)' }}>You're getting better every day. Keep up the consistency!</div>
      </div>
      <div style={{ width:150, height:130, flexShrink:0, alignSelf:'flex-end', zIndex:1 }}>
        <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'bottom center', filter:'drop-shadow(0 4px 16px rgba(0,0,0,.4))', display:'block' }} onError={e=>{e.currentTarget.style.display='none'}}/>
      </div>
    </div>
  )
}

// ─── STAT CARDS ───────────────────────────────────────────────────────────────
const STATS_META = [
  { key:'questions', icon:'📋', label:'Questions Answered', color:BLUE,   darkBg:`${BLUE}18` },
  { key:'accuracy',  icon:'🎯', label:'Accuracy',           color:ORANGE, darkBg:`${ORANGE}18` },
  { key:'xp',        icon:'⚡', label:'XP Earned',          color:GOLD,   darkBg:`${GOLD}18` },
  { key:'streak',    icon:'🔥', label:'Streak',             color:RED,    darkBg:`${RED}18` },
]
function StatCards({ stats, xp, dark }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
      {STATS_META.map(m => {
        const s   = stats[m.key] ?? {}
        const val = m.key === 'xp' ? xp : (s.value ?? 0)
        return (
          <Card key={m.key} style={{ padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:dark?m.darkBg:`${m.color}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{m.icon}</div>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', lineHeight:1.3 }}>{m.label}</span>
            </div>
            <div style={{ fontSize:24, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em', lineHeight:1 }}>
              {m.key==='accuracy'?`${val}%`:m.key==='streak'?val:val.toLocaleString()}
              {m.key==='streak'&&<span style={{ fontSize:13, fontWeight:700, color:'var(--text-tert)', marginLeft:4 }}>days</span>}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ─── PRACTICE ACTIVITY BAR CHART ─────────────────────────────────────────────
function PracticeActivity({ activity, dark }) {
  const days     = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const max      = Math.max(...activity, 1)
  const todayIdx = (new Date().getDay()+6)%7
  return (
    <Card style={{ padding:'20px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Practice Activity</span>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em' }}>This week</span>
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', height:140, gap:8 }}>
        {days.map((d,i)=>{
          const val   = activity[i]||0
          const barH  = max>0 ? Math.max(Math.round((val/max)*110), val>0?8:3) : 3
          const isToday = i===todayIdx
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              {val>0 && <span style={{ fontSize:9, fontWeight:800, color:'var(--text-tert)' }}>{val}</span>}
              {val===0 && <span style={{ fontSize:9, color:'transparent' }}>0</span>}
              <div style={{ width:'100%', height:barH, borderRadius:'5px 5px 0 0', background:isToday?`linear-gradient(180deg,${CYAN},${BLUE})`:BLUE, opacity:isToday?1:val>0?0.6:0.13, transition:'height .5s ease', minHeight:3 }}/>
              <span style={{ fontSize:9, fontWeight:isToday?800:600, color:isToday?BLUE:'var(--text-tert)' }}>{d}</span>
            </div>
          )
        })}
      </div>
      {activity.every(v => v === 0) && (
        <div style={{ textAlign:'center', marginTop:12, fontSize:12, color:'var(--text-tert)' }}>
          Complete a practice session to see your activity here.
        </div>
      )}
    </Card>
  )
}

// ─── SUBJECT MASTERY ─────────────────────────────────────────────────────────
function SubjectMastery({ subjects, exam, onExamChange, exams, dark }) {
  if (!subjects.length) return (
    <Card style={{ padding:'28px 20px', textAlign:'center' }}>
      <div style={{ fontSize:32, marginBottom:10 }}>📊</div>
      <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No subject data yet</div>
      <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.6, marginBottom:16 }}>Complete practice sessions to see your accuracy per subject.</div>
      <Link href="/student/practice" style={{ textDecoration:'none' }}>
        <div style={{ display:'inline-block', padding:'10px 22px', borderRadius:999, background:BLUE, color:'#fff', fontSize:13, fontWeight:800 }}>Start Practising →</div>
      </Link>
    </Card>
  )

  const sorted = [...subjects].sort((a,b)=>(b.accuracy??0)-(a.accuracy??0))
  return (
    <div>
      <SectionLabel right={
        <div style={{ display:'inline-flex', background:dark?'rgba(255,255,255,.04)':'rgba(6,42,120,.04)', borderRadius:13, padding:3, border:'1px solid var(--border)', gap:2 }}>
          {exams.map(e=>{
            const on=e===exam
            return <button key={e} onClick={()=>onExamChange(e)} style={{ padding:'7px 18px', borderRadius:10, fontSize:13, fontWeight:on?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:on?BLUE:'transparent', color:on?'#fff':'var(--text-tert)', boxShadow:on?`0 2px 10px ${BLUE}40`:'none', transition:'all .15s' }}>{e}</button>
          })}
        </div>
      }>
        Subject Mastery <span style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)', marginLeft:4 }}>({exam})</span>
      </SectionLabel>
      <Card>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 160px 80px', padding:'9px 18px', borderBottom:'1px solid var(--border)', background:dark?'rgba(255,255,255,.02)':'rgba(6,42,120,.02)' }}>
          {['Subject','Accuracy','Questions'].map((h,i)=>(
            <div key={i} style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)', textAlign:i>0?'right':'left' }}>{h}</div>
          ))}
        </div>
        {sorted.map((s,i)=>{
          const col = getColor(s.name)
          const acc = s.accuracy??0
          return (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 160px 80px', padding:'13px 18px', alignItems:'center', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:10, background:`${col}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{getIcon(s.name)}</div>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>{s.name}</span>
              </div>
              <div style={{ paddingRight:16 }}>
                <div style={{ height:6, borderRadius:999, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${acc}%`, borderRadius:999, background:col }}/>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:13, fontWeight:900, color:col }}>{acc}%</div>
                <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:1 }}>{(s.questions||0).toLocaleString()}</div>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

// ─── STUDY BUDDY ─────────────────────────────────────────────────────────────
function StudyBuddyRecommends({ dark }) {
  const recs = [
    { icon:'📈', color:GREEN, bg:`${GREEN}18`, title:'Keep practising daily!', body:'Consistent daily practice is the fastest path to exam readiness.', cta:null },
    { icon:'🎯', color:RED,   bg:`${RED}18`,   title:'Try a Mock Exam', body:'Simulate the real exam format. Timed, full-length, no peeking.', cta:'Take Mock Exam', ctaColor:NAVY, href:'/student/practice?mode=mock' },
    { icon:'⚡', color:GOLD,  bg:`${GOLD}18`,  title:'Quick 5 challenge', body:'5 random questions, fast. A great way to stay sharp on the go.', cta:'Quick 5', ctaColor:BLUE, href:'/student/practice?mode=quick5' },
  ]
  return (
    <Card style={{ padding:'18px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:30, height:30, objectFit:'contain' }} onError={e=>{e.currentTarget.style.display='none'}}/>
        </div>
        <span style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Study Buddy Recommends</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {recs.map((r,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px', borderRadius:14, background:dark?'rgba(255,255,255,.03)':'rgba(6,42,120,.02)', border:'1px solid var(--border)' }}>
            <div style={{ width:36, height:36, borderRadius:11, background:r.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{r.icon}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', marginBottom:3 }}>{r.title}</div>
              <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.5 }}>{r.body}</div>
            </div>
            {r.cta && (
              <Link href={r.href||'#'} style={{ textDecoration:'none', flexShrink:0 }}>
                <button style={{ padding:'8px 12px', borderRadius:10, border:'none', cursor:'pointer', background:r.ctaColor, color:'#fff', fontSize:11, fontWeight:800, fontFamily:'inherit', whiteSpace:'nowrap' }}>{r.cta}</button>
              </Link>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── RECENT SESSIONS ─────────────────────────────────────────────────────────
function RecentSessions({ sessions, dark }) {
  const scoreColor = pct => pct >= 70 ? GREEN : pct >= 40 ? GOLD : RED
  if (!sessions.length) return (
    <Card style={{ padding:'28px 20px', textAlign:'center' }}>
      <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
      <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No sessions yet</div>
      <div style={{ fontSize:12, color:'var(--text-tert)' }}>Complete a practice session and your history will appear here.</div>
    </Card>
  )
  return (
    <div>
      <SectionLabel>Recent Sessions</SectionLabel>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
        {sessions.slice(0,6).map((s,i)=>{
          const col = scoreColor(s.pct)
          return (
            <Card key={i} style={{ padding:'14px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.subject}</div>
                  <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:2 }}>{s.mode}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:col }}>{s.pct}%</div>
                  <div style={{ fontSize:9, color:'var(--text-tert)' }}>{s.correct}/{s.count}</div>
                </div>
              </div>
              <div style={{ height:5, borderRadius:999, background:'var(--bg-subtle)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${s.pct}%`, borderRadius:999, background:col }}/>
              </div>
              <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:6 }}>{s.date}</div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const { dark }            = useTheme()
  const { totalPoints: xp } = usePoints()
  const profile             = useStudentUser()
  const isGuest             = !!profile?.isGuest
  const isReady             = profile !== null

  // All local — read synchronously
  const activity  = isReady ? readWeeklyActivity() : [0,0,0,0,0,0,0]
  const sessions  = isReady ? readLocalSessions() : []
  const stats     = isReady ? deriveStatsFromSessions(sessions) : {}

  // Exam state from profile
  const exams = profile?.exam_types ?? ['WAEC','JAMB']
  const [exam, setExam] = useState('WAEC')

  useEffect(() => {
    if (profile?.exam_type) setExam(profile.exam_type)
  }, [profile?.exam_type])

  // Subject mastery — background fetch for auth users, cached
  const [subjects, setSubjects] = useState(() => {
    try { const c = JSON.parse(localStorage.getItem(MASTERY_KEY)||'{}'); return c.data ?? [] } catch { return [] }
  })

  useEffect(() => {
    if (!isReady || isGuest) return
    const cached = (() => { try { return JSON.parse(localStorage.getItem(MASTERY_KEY)||'{}') } catch { return {} } })()
    if (cached.data?.length && (Date.now() - (cached.ts||0)) < MASTERY_SECS*1000) return

    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Aggregate accuracy per subject from question_attempts
        const subs = exam === 'WAEC'
          ? (profile?.subjects_waec ?? profile?.subjects ?? [])
          : (profile?.subjects_jamb ?? profile?.subjects ?? [])
        if (!subs.length) return

        const rows = []
        for (const name of subs) {
          const { data } = await supabase
            .from('question_attempts')
            .select('is_correct')
            .eq('student_id', user.id)
            .eq('subject_name', name)
            .limit(200)
          if (data?.length) {
            const correct  = data.filter(r => r.is_correct).length
            const accuracy = Math.round((correct / data.length) * 100)
            rows.push({ name, accuracy, questions: data.length })
          } else {
            rows.push({ name, accuracy: 0, questions: 0 })
          }
        }
        localStorage.setItem(MASTERY_KEY, JSON.stringify({ data: rows, ts: Date.now() }))
        setSubjects(rows)
      } catch {}
    })()
  }, [isReady, isGuest, exam])

  const name = profile?.full_name?.split(' ')[0] || profile?.username || 'Student'
  const cap  = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : ''

  if (!isReady) return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {[120, 160, 200].map((h,i) => (
        <div key={i} style={{ height:h, borderRadius:20, background:'var(--bg-card)', border:'1px solid var(--border)', opacity:0.6 }}/>
      ))}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <style>{`@media(min-width:1024px){.prog-grid{display:grid!important;grid-template-columns:1fr 300px!important;gap:20px!important;align-items:flex-start!important}}`}</style>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'inline-flex', background:dark?'rgba(255,255,255,.04)':'rgba(6,42,120,.04)', borderRadius:13, padding:3, border:'1px solid var(--border)', gap:2 }}>
          {exams.map(e=>{
            const on=e===exam
            return <button key={e} onClick={()=>setExam(e)} style={{ padding:'7px 18px', borderRadius:10, fontSize:13, fontWeight:on?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:on?BLUE:'transparent', color:on?'#fff':'var(--text-tert)', boxShadow:on?`0 2px 10px ${BLUE}40`:'none', transition:'all .15s' }}>{e}</button>
          })}
        </div>
        <span style={{ fontSize:11, color:'var(--text-tert)' }}>{exam} data</span>
      </div>

      <HeroBanner name={cap(name)} dark={dark}/>
      <StatCards stats={stats} xp={xp} dark={dark}/>

      <div className="prog-grid" style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <PracticeActivity activity={activity} dark={dark}/>
          <SubjectMastery subjects={subjects} exam={exam} onExamChange={setExam} exams={exams} dark={dark}/>
          <RecentSessions sessions={sessions} dark={dark}/>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <StudyBuddyRecommends dark={dark}/>
          <div style={{ borderRadius:20, background:`${BLUE}08`, border:`1px solid ${BLUE}20`, padding:'20px 24px', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:38, flexShrink:0 }}>📈</div>
            <div>
              <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', marginBottom:4 }}>Stay consistent, achieve greatness!</div>
              <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5 }}>Small steps every day lead to big results.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
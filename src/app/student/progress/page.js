'use client'
// src/app/student/progress/page.js — v1
// Progress page matching design spec.
// Stats: Questions Answered, Accuracy, XP Earned, Streak (4 cards only)
// Sections: Practice Activity bar chart, Subject Mastery (with WAEC/JAMB switcher),
//           Accuracy & Completion by Subject, Study Buddy Recommends, Topic to Improve
// Desktop: sidebar + 2-col layout. Mobile: topbar + single col + bottom nav.

import { useState, useEffect } from 'react'
import { usePoints } from '@/contexts/PointsContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// ─── BRAND ────────────────────────────────────────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const PURPLE = '#7C3AED'
const RED    = '#f43f5e'

// ─── SUBJECT META ─────────────────────────────────────────────────────────────
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

// ─── BG ───────────────────────────────────────────────────────────────────────

// ─── CARD ─────────────────────────────────────────────────────────────────────
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



// ─── HERO BANNER ─────────────────────────────────────────────────────────────
function HeroBanner({ name, dark }) {
  return (
    <div style={{ borderRadius:22, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY} 0%,#0a1f5e 60%,#0e2875 100%)`:`linear-gradient(135deg,${NAVY} 0%,#0c2360 50%,#1040a0 100%)`, padding:'24px 28px', display:'flex', alignItems:'flex-end', minHeight:120 }}>
      <div style={{ position:'absolute', top:0, right:0, width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.1) 0%,transparent 70%)', pointerEvents:'none' }}/>
      {[[GOLD,14,'16%','top'],[CYAN,9,'30%','top'],['#fff',11,'22%','top'],[GOLD,8,'10%','bottom']].map(([c,fs,pos,side],i)=>(
        <div key={i} style={{ position:'absolute', [side]:side==='top'?'18px':'18px', right:pos, fontSize:fs, color:c, opacity:.5 }}>✦</div>
      ))}
      <div style={{ flex:1, zIndex:1 }}>
        <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', color:'rgba(255,255,255,.45)', marginBottom:6 }}>Your Progress</div>
        <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-.035em', lineHeight:1.15, marginBottom:6 }}>
          Great job, {name}! 👋
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.55)' }}>You're getting better every day. Keep up the consistency!</div>
      </div>
      {/* Mascot */}
      <div style={{ width:150, height:130, flexShrink:0, alignSelf:'flex-end', zIndex:1 }}>
        <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'bottom center', filter:'drop-shadow(0 4px 16px rgba(0,0,0,.4))', display:'block' }} onError={e=>{e.currentTarget.style.display='none'}}/>
      </div>
    </div>
  )
}

// ─── 4 STAT CARDS ────────────────────────────────────────────────────────────
const STATS_META = [
  { key:'questions', icon:'📋', label:'Questions Answered', color:BLUE,   darkBg:`${BLUE}18` },
  { key:'accuracy',  icon:'🎯', label:'Accuracy',           color:ORANGE, darkBg:`${ORANGE}18` },
  { key:'xp',        icon:'⚡', label:'XP Earned',          color:GOLD,   darkBg:`${GOLD}18` },
  { key:'streak',    icon:'🔥', label:'Streak',             color:RED,    darkBg:`${RED}18` },
]

function StatCards({ stats, dark }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
      {STATS_META.map(m => {
        const s = stats[m.key] ?? {}
        const up = s.delta >= 0
        return (
          <Card key={m.key} style={{ padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:dark?m.darkBg:`${m.color}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{m.icon}</div>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', lineHeight:1.3 }}>{m.label}</span>
            </div>
            <div style={{ fontSize:24, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em', lineHeight:1, marginBottom:6 }}>
              {m.key==='accuracy'?`${s.value??78}%`:m.key==='streak'?`${s.value??12}`:(s.value??0).toLocaleString()}
              {m.key==='streak'&&<span style={{ fontSize:13, fontWeight:700, color:'var(--text-tert)', marginLeft:4 }}>days</span>}
            </div>
            {s.delta!=null ? (
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ fontSize:10, fontWeight:800, color:up?GREEN:RED }}>
                  {up?'↑':'↓'}{Math.abs(s.delta)}{m.key==='accuracy'?'%':''} vs last week
                </span>
              </div>
            ) : m.key==='streak' ? (
              <div style={{ fontSize:10, color:'var(--text-tert)' }}>Best: {s.best??21} days</div>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}

// ─── EXAM SWITCHER ────────────────────────────────────────────────────────────
function ExamSwitcher({ exams, active, onChange, dark }) {
  return (
    <div style={{ display:'inline-flex', background:dark?'rgba(255,255,255,.04)':'rgba(6,42,120,.04)', borderRadius:13, padding:3, border:'1px solid var(--border)', gap:2 }}>
      {exams.map(e => {
        const on = e === active
        return (
          <button key={e} onClick={()=>onChange(e)} style={{ padding:'7px 18px', borderRadius:10, fontSize:13, fontWeight:on?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:on?BLUE:'transparent', color:on?'#fff':'var(--text-tert)', boxShadow:on?`0 2px 10px ${BLUE}40`:'none', transition:'all .15s' }}>{e}</button>
        )
      })}
    </div>
  )
}

// ─── PERIOD SWITCHER ─────────────────────────────────────────────────────────
function PeriodDropdown({ period, onChange, dark }) {
  const opts = ['This Week','This Month','This Year','All Time']
  return (
    <div style={{ position:'relative' }}>
      <select value={period} onChange={e=>onChange(e.target.value)} style={{ appearance:'none', padding:'7px 28px 7px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-prim)', fontSize:12, fontWeight:700, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
        {opts.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><path d="M2 4l3 3 3-3" stroke="var(--text-tert)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  )
}

// ─── PRACTICE ACTIVITY BAR CHART ─────────────────────────────────────────────
function PracticeActivity({ activity, period, onPeriodChange, dark }) {
  const days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const max   = Math.max(...activity, 1)
  const todayIdx = (new Date().getDay()+6)%7

  return (
    <Card style={{ padding:'20px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Practice Activity</span>
        <PeriodDropdown period={period} onChange={onPeriodChange} dark={dark}/>
      </div>

      {/* Y-axis + bars */}
      <div style={{ display:'flex', gap:0, alignItems:'flex-end', height:160 }}>
        {/* Y labels */}
        <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', height:'100%', paddingBottom:20, marginRight:8, alignItems:'flex-end' }}>
          {[200,150,100,50,0].map(v=>(
            <span key={v} style={{ fontSize:9, color:'var(--text-tert)', fontWeight:600 }}>{v}</span>
          ))}
        </div>
        {/* Bars */}
        <div style={{ flex:1, display:'flex', alignItems:'flex-end', gap:8, borderLeft:'1px solid var(--border)', paddingLeft:8 }}>
          {days.map((d,i)=>{
            const val   = activity[i]||0
            const barH  = max>0 ? Math.round((val/max)*120) : 2
            const isToday = i===todayIdx
            return (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                {val>0 && <span style={{ fontSize:9, fontWeight:800, color:'var(--text-tert)' }}>{val}</span>}
                {val===0 && <span style={{ fontSize:9, color:'transparent' }}>0</span>}
                <div style={{ width:'100%', height:barH||3, borderRadius:'5px 5px 0 0', background:isToday?`linear-gradient(180deg,${CYAN},${BLUE})`:BLUE, opacity:isToday?1:0.6, transition:'height .5s ease', minHeight:3 }}/>
                <span style={{ fontSize:9, fontWeight:isToday?800:600, color:isToday?BLUE:'var(--text-tert)' }}>{d}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

// ─── SUBJECT MASTERY ─────────────────────────────────────────────────────────
function SubjectMastery({ subjects, exam, onExamChange, exams, dark }) {
  const sorted = [...subjects].sort((a,b)=>b.accuracy-a.accuracy)

  return (
    <div>
      <SectionLabel right={
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <ExamSwitcher exams={exams} active={exam} onChange={onExamChange} dark={dark}/>
          <Link href="/student/progress/mastery" style={{ fontSize:11, fontWeight:700, color:BLUE, textDecoration:'none' }}>View full report →</Link>
        </div>
      }>
        Subject Mastery <span style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)', marginLeft:4 }}>({exam})</span>
      </SectionLabel>

      <Card>
        {/* Header row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 160px 80px', gap:0, padding:'9px 18px', borderBottom:'1px solid var(--border)', background:dark?'rgba(255,255,255,.02)':'rgba(6,42,120,.02)' }}>
          {['Subject','Accuracy','Questions'].map((h,i)=>(
            <div key={i} style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)', textAlign:i>0?'right':'left' }}>{h}</div>
          ))}
        </div>
        {sorted.map((s, i) => {
          const col   = getColor(s.name)
          const acc   = s.accuracy??0
          const barW  = `${acc}%`
          return (
            <Link key={i} href={`/student/progress/subject/${encodeURIComponent(s.name)}?exam=${exam}`} style={{ textDecoration:'none' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 160px 80px', gap:0, padding:'13px 18px', alignItems:'center', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background .1s' }}
                onMouseEnter={e=>e.currentTarget.style.background=dark?'rgba(255,255,255,.03)':'rgba(6,42,120,.02)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                {/* Subject name + icon */}
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:`${col}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{getIcon(s.name)}</div>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>{s.name}</span>
                </div>
                {/* Accuracy bar */}
                <div style={{ paddingRight:16 }}>
                  <div style={{ height:6, borderRadius:999, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:barW, borderRadius:999, background:col, transition:'width .6s ease' }}/>
                  </div>
                </div>
                {/* Numbers */}
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, fontWeight:900, color:col }}>{acc}%</div>
                  <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:1 }}>{(s.questions||0).toLocaleString()}</div>
                </div>
              </div>
            </Link>
          )
        })}
      </Card>
    </div>
  )
}

// ─── ACCURACY & COMPLETION BY SUBJECT ─────────────────────────────────────────
function AccuracyCompletion({ subjects, exam, dark }) {
  return (
    <div>
      <SectionLabel>Accuracy & Completion by Subject <span style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)', marginLeft:4 }}>({exam})</span></SectionLabel>
      <Card style={{ padding:'18px 20px' }}>
        {/* Legend */}
        <div style={{ display:'flex', gap:14, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:BLUE }}/>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)' }}>Accuracy (%)</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:ORANGE }}/>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)' }}>Completion (%)</span>
          </div>
        </div>
        {subjects.map((s, i) => (
          <div key={i} style={{ marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text-prim)' }}>{s.name}</span>
              <div style={{ display:'flex', gap:12 }}>
                <span style={{ fontSize:11, fontWeight:800, color:BLUE }}>{s.accuracy}%</span>
                <span style={{ fontSize:11, fontWeight:800, color:ORANGE }}>{s.completion}%</span>
              </div>
            </div>
            {/* Accuracy bar */}
            <div style={{ height:7, borderRadius:999, background:dark?'rgba(255,255,255,.07)':'rgba(6,42,120,.06)', overflow:'hidden', marginBottom:4 }}>
              <div style={{ height:'100%', width:`${s.accuracy}%`, borderRadius:999, background:BLUE, transition:'width .6s ease' }}/>
            </div>
            {/* Completion bar */}
            <div style={{ height:7, borderRadius:999, background:dark?'rgba(255,255,255,.07)':'rgba(6,42,120,.06)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${s.completion}%`, borderRadius:999, background:ORANGE, transition:'width .6s ease' }}/>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── STUDY BUDDY RECOMMENDS ───────────────────────────────────────────────────
function StudyBuddyRecommends({ subjects, dark }) {
  const recs = [
    { icon:'⭐', color:GOLD,   bg:`${GOLD}18`,   title:'Focus on Physics', body:'Your accuracy in Physics is lower than your average.', cta:'Practice Now', ctaColor:BLUE, href:'/student/practice?mode=quick5' },
    { icon:'📈', color:GREEN,  bg:`${GREEN}18`,  title:'Keep the streak alive!', body:"You're on a 12-day streak. Amazing! Try to beat your best of 21 days.", cta:null },
    { icon:'🎯', color:RED,    bg:`${RED}18`,    title:'Try a Mock Exam', body:"You've completed 3 mock exams. Attempt more to improve your exam readiness.", cta:'Take Mock Exam', ctaColor:NAVY, href:'/student/exam' },
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
        {recs.map((r, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px', borderRadius:14, background:dark?'rgba(255,255,255,.03)':'rgba(6,42,120,.02)', border:'1px solid var(--border)' }}>
            <div style={{ width:36, height:36, borderRadius:11, background:r.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{r.icon}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', marginBottom:3 }}>{r.title}</div>
              <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.5 }}>{r.body}</div>
            </div>
            {r.cta && (
              <Link href={r.href||'#'} style={{ textDecoration:'none', flexShrink:0 }}>
                <button style={{ padding:'8px 12px', borderRadius:10, border:'none', cursor:'pointer', background:r.ctaColor, color:'#fff', fontSize:11, fontWeight:800, fontFamily:'inherit', whiteSpace:'nowrap', boxShadow:`0 3px 10px ${r.ctaColor}40` }}>{r.cta}</button>
              </Link>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── TOPIC TO IMPROVE ────────────────────────────────────────────────────────
function TopicToImprove({ topics, exam, dark }) {
  return (
    <Card style={{ padding:'18px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Topics to Improve</span>
        <button style={{ fontSize:11, fontWeight:700, color:BLUE, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0 }}>View all</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {topics.map((t, i) => {
          const col = getColor(t.subject)
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px', borderRadius:14, background:dark?'rgba(255,255,255,.03)':'rgba(6,42,120,.02)', border:'1px solid var(--border)' }}>
              <div style={{ width:36, height:36, borderRadius:11, background:`${col}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{getIcon(t.subject)}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:800, color:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</div>
                <div style={{ fontSize:10, color:'var(--text-tert)' }}>{t.subject}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:14, fontWeight:900, color:RED }}>
                  {t.accuracy}%
                </div>
                <div style={{ fontSize:9, color:'var(--text-tert)' }}>Accuracy</div>
              </div>
              <Link href={`/student/practice?mode=weak&subject=${encodeURIComponent(t.subject)}`} style={{ textDecoration:'none', flexShrink:0 }}>
                <button style={{ padding:'7px 12px', borderRadius:9, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:11, fontWeight:800, fontFamily:'inherit' }}>Practice</button>
              </Link>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── MOTIVATIONAL BANNER ─────────────────────────────────────────────────────
function MotivationalBanner({ dark }) {
  return (
    <div style={{ borderRadius:20, overflow:'hidden', position:'relative', background:dark?`${NAVY}cc`:`linear-gradient(135deg,#f0f6ff,#e8f0ff)`, border:`1px solid ${BLUE}18`, padding:'20px 20px 20px 24px', display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ position:'absolute', right:-10, bottom:-10, width:120, height:120, borderRadius:'50%', background:'rgba(18,100,229,.05)', pointerEvents:'none' }}/>
      <div style={{ fontSize:38, flexShrink:0 }}>📈</div>
      <div style={{ flex:1, zIndex:1 }}>
        <div style={{ fontSize:14, fontWeight:900, color:dark?'#fff':'var(--text-prim)', marginBottom:4 }}>Stay consistent, achieve greatness!</div>
        <div style={{ fontSize:12, color:dark?'rgba(255,255,255,.55)':'var(--text-tert)', lineHeight:1.5 }}>Small steps every day lead to big results.</div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const router = useRouter()
  const { dark } = useTheme()

  const [profile,   setProfile]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [exam,      setExam]      = useState('WAEC')
  const [exams,     setExams]     = useState(['WAEC','JAMB'])
  const [period,    setPeriod]    = useState('This Week')
  const { totalPoints: xp } = usePoints()
  const [stats,     setStats]     = useState({})
  const [activity,  setActivity]  = useState([0,0,0,0,0,0,0])
  const [subjects,  setSubjects]  = useState([])
  const [topics,    setTopics]    = useState([])

  async function load() {
    try {
      const supabase = createClient()
      const { data:{session} } = await supabase.auth.getSession()
      if (session?.user) {
        const { data:prof } = await supabase.from('profiles').select('username,full_name,total_points,exam_types').eq('id',session.user.id).single()
        if (prof) {
          setProfile(prof)
          if (prof.exam_types?.length) setExams(prof.exam_types)
          setExam(prof.exam_types?.[0]||'WAEC')
        }
        // Try real activity
        const mon = new Date(); mon.setDate(mon.getDate()-((mon.getDay()+6)%7)); mon.setHours(0,0,0,0)
        const { data:att } = await supabase.from('question_attempts').select('created_at').eq('student_id',session.user.id).gte('created_at',mon.toISOString())
        if (att?.length) {
          const c=[0,0,0,0,0,0,0]; att.forEach(a=>{const d=new Date(a.created_at);c[(d.getDay()+6)%7]++}); setActivity(c)
        } else setActivity([0,0,0,0,0,0,0])
      }
    } catch(e){ console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(()=>{ load() },[]) // eslint-disable-line
  // subjects, stats, topics populate from real Supabase data when available

  const name = profile?.username||profile?.full_name?.split(' ')[0]||'Evelyn'
  const cap  = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : ''

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'80px 0' }}>
      <div style={{ width:32,height:32,borderRadius:'50%',border:`3px solid var(--border)`,borderTopColor:BLUE,animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // Shared content blocks
  const heroEl      = <HeroBanner name={cap(name)} dark={dark}/>
  const statsEl     = <StatCards stats={stats} dark={dark}/>
  const activityEl  = <PracticeActivity activity={activity} period={period} onPeriodChange={setPeriod} dark={dark}/>
  const masteryEl   = <SubjectMastery subjects={subjects} exam={exam} onExamChange={setExam} exams={exams} dark={dark}/>
  const accuracyEl  = <AccuracyCompletion subjects={subjects} exam={exam} dark={dark}/>
  const motEl       = <MotivationalBanner dark={dark}/>
  const buddyEl     = <StudyBuddyRecommends subjects={subjects} dark={dark}/>
  const topicsEl    = <TopicToImprove topics={topics} exam={exam} dark={dark}/>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Exam switcher */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <ExamSwitcher exams={exams} active={exam} onChange={setExam} dark={dark}/>
        <span style={{ fontSize:11, color:'var(--text-tert)' }}>{exam} data</span>
      </div>

      {heroEl}
      {statsEl}
      {activityEl}
      {masteryEl}
      {accuracyEl}
      {buddyEl}
      {topicsEl}
      {motEl}
    </div>
  )
}
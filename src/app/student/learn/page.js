'use client'
// src/app/student/learn/page.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// Local-first. Profile + subjects from layout context (instant).
// Lesson progress: localStorage first (ep_lesson_progress), then background
// Supabase fetch for auth users only. Guests see empty "Continue Learning".
// Activity stats: read from ep_activity (same key home page uses).
// No blocking spinner — skeleton renders while layout resolves.
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

const SUBJ_COLOR = {
  'Mathematics':'#FF6A00','English Language':'#22c55e','Use of English':'#22c55e',
  'Physics':'#7C3AED','Chemistry':'#1264E5','Biology':'#18B7F2',
  'Further Mathematics':'#062A78','Economics':'#f43f5e','Government':'#9b7ae0',
  'Geography':'#34d399','Literature in English':'#f9a8d4','default':'#1264E5',
}
const SUBJ_ICON = {
  'Mathematics':'🧮','English Language':'📖','Use of English':'📖','Physics':'⚡',
  'Chemistry':'⚗️','Biology':'🧬','Further Mathematics':'📐','Economics':'📊',
  'Government':'🏛️','Geography':'🌍','Literature in English':'📚','default':'📝',
}
const getColor = n => SUBJ_COLOR[n] ?? SUBJ_COLOR.default
const getIcon  = n => SUBJ_ICON[n]  ?? SUBJ_ICON.default

const PROGRESS_KEY   = 'ep_lesson_progress'
const PROGRESS_SYNC  = 'ep_lesson_sync'
const SYNC_SECS      = 300

function readLocalProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]') } catch { return [] }
}
function writeLocalProgress(lessons) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(lessons.slice(0, 20))) } catch {}
}

function Card({ children, style={} }) {
  return <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 2px 16px rgba(6,42,120,.06)', overflow:'hidden', ...style }}>{children}</div>
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero({ name, dark }) {
  const [hov, setHov] = useState(false)
  return (
    <div style={{ borderRadius:22, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY} 0%,#0a1f5e 55%,#112f90 100%)`:`linear-gradient(135deg,${NAVY} 0%,#0c2360 45%,#1548b8 100%)`, minHeight:160, display:'flex', alignItems:'stretch' }}>
      <div style={{ position:'absolute', top:-30, right:160, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.18) 0%,transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:-40, right:60, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,184,0,.1) 0%,transparent 70%)', pointerEvents:'none' }}/>
      {[[GOLD,14,'22%','top',14],[CYAN,9,'38%','top',22],['#fff',11,'14%','top',32],[GOLD,7,'28%','bottom',18]].map(([c,fs,right,side,top],i)=>(
        <div key={i} style={{ position:'absolute', [side]:top, right, fontSize:fs, color:c, opacity:.55 }}>✦</div>
      ))}
      <div style={{ position:'absolute', right:290, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:10, opacity:.85 }}>
        {[{bg:'rgba(24,183,242,.2)',icon:'🌍'},{bg:'rgba(18,100,229,.25)',icon:'⚗️'},{bg:'rgba(124,58,237,.2)',icon:'⚡'}].map((b,i)=>(
          <div key={i} style={{ width:44, height:44, borderRadius:14, background:b.bg, border:'1px solid rgba(255,255,255,.15)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{b.icon}</div>
        ))}
      </div>
      <div style={{ flex:1, padding:'28px 32px', zIndex:1, maxWidth:480 }}>
        <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.14em', color:'rgba(255,255,255,.5)', marginBottom:8 }}>EXL · Interactive Learning</div>
        <div style={{ fontSize:26, fontWeight:900, color:'#fff', letterSpacing:'-.04em', lineHeight:1.15, marginBottom:8 }}>EXL Learning World</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.55)', lineHeight:1.6, marginBottom:20 }}>An interactive learning platform to learn by doing.</div>
        <Link href="/student/learn/world" style={{ textDecoration:'none', display:'inline-block' }}>
          <button onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 22px', borderRadius:13, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:900, fontSize:14, background:hov?CYAN:BLUE, color:'#fff', boxShadow:hov?`0 6px 20px ${CYAN}50`:`0 4px 16px ${BLUE}50`, transition:'all .15s' }}>
            Explore Learning World
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </Link>
        <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:12, padding:'4px 10px', borderRadius:999, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:GREEN }}/>
          <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,.65)', letterSpacing:'.08em' }}>CHEMISTRY · PHYSICS — LIVE NOW</span>
        </div>
      </div>
      <div style={{ width:200, flexShrink:0, position:'relative', alignSelf:'flex-end', zIndex:1 }}>
        <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:'100%', height:170, objectFit:'contain', objectPosition:'bottom center', display:'block', filter:'drop-shadow(0 6px 20px rgba(0,0,0,.45))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
      </div>
    </div>
  )
}

// ─── LEARN TOOLS ─────────────────────────────────────────────────────────────
const TOOLS = [
  { key:'flashcards', icon:<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="2" y="6" width="20" height="14" rx="3" fill="rgba(255,255,255,.25)"/><rect x="6" y="2" width="20" height="14" rx="3" fill="rgba(255,255,255,.18)"/><rect x="4" y="4" width="20" height="15" rx="3" fill="rgba(255,255,255,.9)"/><text x="14" y="15" textAnchor="middle" fontSize="11" fill={PURPLE} fontWeight="900">?</text></svg>, bg:`linear-gradient(135deg,${PURPLE} 0%,#5b21b6 100%)`, glowColor:PURPLE, label:'Flashcards', tags:['Active Recall','Smart Practice'], tagColor:PURPLE, desc:'Guess the answer before you flip. Practice, learn and earn XP!', dailyLabel:'Daily Goal', dailyVal:14, dailyMax:20, dailyUnit:'cards', ctaLabel:'Start Studying', ctaColor:PURPLE, href:'/student/learn/flashcards' },
  { key:'formulas',   icon:<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="4" fill="rgba(255,255,255,.15)"/><text x="14" y="19" textAnchor="middle" fontSize="15" fill="#fff" fontWeight="900">fx</text></svg>, bg:`linear-gradient(135deg,${GREEN} 0%,#15803d 100%)`, glowColor:GREEN, label:'Key Formulas', tags:['Memorise','Understand','Apply'], tagColor:GREEN, desc:'Learn key formulas with examples and quick checks.', dailyLabel:'Daily Goal', dailyVal:8, dailyMax:15, dailyUnit:'formulas', ctaLabel:'Explore Formulas', ctaColor:GREEN, href:'/student/learn/formulas' },
]

function LearnToolCard({ tool, subjects, dark }) {
  const [subj, setSubj] = useState('')
  const pct = Math.round((tool.dailyVal / tool.dailyMax) * 100)
  return (
    <Card style={{ display:'flex', flexDirection:'column', overflow:'visible' }}>
      <div style={{ padding:'22px 22px 0', display:'flex', gap:14, alignItems:'flex-start' }}>
        <div style={{ width:56, height:56, borderRadius:18, background:tool.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 6px 20px ${tool.glowColor}40` }}>{tool.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:5 }}>
            {tool.tags.map(t=>(<span key={t} style={{ fontSize:9, fontWeight:800, color:tool.tagColor, background:`${tool.tagColor}14`, border:`1px solid ${tool.tagColor}25`, padding:'2px 7px', borderRadius:999 }}>{t}</span>))}
          </div>
          <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', marginBottom:4 }}>{tool.label}</div>
          <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5 }}>{tool.desc}</div>
        </div>
      </div>
      <div style={{ padding:'16px 22px 0' }}>
        <div style={{ position:'relative' }}>
          <select value={subj} onChange={e=>setSubj(e.target.value)} style={{ width:'100%', appearance:'none', padding:'10px 36px 10px 14px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-subtle)', color:subj?'var(--text-prim)':'var(--text-tert)', fontSize:13, fontWeight:600, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
            <option value="">Select Subject</option>
            {subjects.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><path d="M2 4.5l4 4 4-4" stroke="var(--text-tert)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
      <div style={{ padding:'12px 22px 0' }}>
        <Link href={subj?`${tool.href}/${encodeURIComponent(subj)}`:tool.href} style={{ textDecoration:'none', display:'block' }}>
          <button style={{ width:'100%', padding:'13px', borderRadius:13, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:900, fontSize:14, background:tool.ctaColor, color:'#fff', boxShadow:`0 4px 16px ${tool.glowColor}40`, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {tool.ctaLabel}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </Link>
      </div>
      <div style={{ padding:'16px 22px 20px', borderTop:'1px solid var(--border)', marginTop:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)' }}>{tool.dailyLabel}</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:11, fontWeight:800, color:'var(--text-prim)' }}>{tool.dailyVal} / {tool.dailyMax} {tool.dailyUnit}</span>
            <div style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 7px', borderRadius:999, background:`${ORANGE}14` }}>
              <span style={{ fontSize:10 }}>🛡️</span>
              <span style={{ fontSize:9, fontWeight:800, color:ORANGE }}>+20 XP</span>
            </div>
          </div>
        </div>
        <div style={{ height:8, borderRadius:999, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)', overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, borderRadius:999, background:tool.ctaColor, transition:'width .6s ease', boxShadow:`0 0 8px ${tool.glowColor}50` }}/>
        </div>
      </div>
    </Card>
  )
}

// ─── ACTIVITY TODAY — reads from local session history ─────────────────────────
function ActivityToday({ dark }) {
  const sessions = readLocalSessions()
  const today    = new Date().toISOString().slice(0, 10)
  const todaySessions = sessions.filter(s => s.date && new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short' }) === s.date)

  // Derive stats from today's local sessions
  const questions = todaySessions.reduce((a, s) => a + (s.count || 0), 0)
  const correct   = todaySessions.reduce((a, s) => a + (s.correct || 0), 0)
  const accuracy  = questions > 0 ? Math.round((correct / questions) * 100) : 0

  const stats = [
    { icon:'📖', label:'Lessons Completed', value: todaySessions.length, color:BLUE },
    { icon:'🎯', label:'Questions Answered', value: questions,           color:ORANGE },
    { icon:'📈', label:'Accuracy',           value: `${accuracy}%`,     color:GREEN },
  ]

  return (
    <Card style={{ padding:'20px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
        <div style={{ width:28, height:28, borderRadius:9, background:`${BLUE}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>📊</div>
        <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Your Activity Today</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0 }}>
        {stats.map((s,i)=>(
          <div key={i} style={{ padding:'0 12px', borderRight:i<2?'1px solid var(--border)':'none', textAlign:'center' }}>
            <div style={{ fontSize:20, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', marginBottom:4, lineHeight:1.3 }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:900, color:s.color, letterSpacing:'-.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>
      {questions === 0 && (
        <div style={{ marginTop:16, padding:'12px 14px', borderRadius:12, background:dark?'rgba(255,255,255,.03)':'rgba(6,42,120,.03)', border:'1px solid var(--border)', textAlign:'center' }}>
          <div style={{ fontSize:12, color:'var(--text-tert)' }}>No practice sessions today yet.</div>
          <Link href="/student/practice" style={{ textDecoration:'none' }}>
            <div style={{ marginTop:8, display:'inline-block', padding:'7px 16px', borderRadius:999, background:BLUE, color:'#fff', fontSize:12, fontWeight:800 }}>Start a session →</div>
          </Link>
        </div>
      )}
    </Card>
  )
}

// ─── CONTINUE LEARNING ────────────────────────────────────────────────────────
function ContinueLearning({ lessons, dark }) {
  if (!lessons.length) return null
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.025em' }}>Continue Learning</span>
        <Link href="/student/learn/all" style={{ textDecoration:'none', fontSize:12, fontWeight:700, color:BLUE }}>View all</Link>
      </div>
      <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
        {lessons.map((l,i)=>{
          const col = getColor(l.subject)
          const pct = l.pct ?? 0
          return (
            <Card key={i} style={{ minWidth:200, flexShrink:0 }}>
              <div style={{ height:56, background:`${col}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>{getIcon(l.subject)}</div>
              <div style={{ padding:'12px 14px 14px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:col, marginBottom:3, textTransform:'uppercase', letterSpacing:'.06em' }}>{l.subject}</div>
                <div style={{ fontSize:12, fontWeight:900, color:'var(--text-prim)', lineHeight:1.3, marginBottom:8 }}>{l.topic}</div>
                <div style={{ height:5, borderRadius:999, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)', overflow:'hidden', marginBottom:5 }}>
                  <div style={{ height:'100%', width:`${pct}%`, borderRadius:999, background:col }}/>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)' }}>{pct}% complete</span>
                  <Link href={`/student/learn/lesson/${l.id}`} style={{ textDecoration:'none', fontSize:11, fontWeight:800, color:col }}>Continue →</Link>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── MOTIVATIONAL FOOTER ─────────────────────────────────────────────────────
function MotivationalFooter({ dark }) {
  return (
    <div style={{ borderRadius:20, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY},#0a1f5e)`:`linear-gradient(135deg,#f0f6ff,#e8f0ff)`, border:`1px solid ${BLUE}18`, padding:'20px 20px 20px 150px', minHeight:110, display:'flex', alignItems:'center' }}>
      <div style={{ position:'absolute', bottom:0, left:0, width:140, height:110 }}>
        <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'bottom left', filter:'drop-shadow(0 2px 8px rgba(0,0,0,.2))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
      </div>
      <div style={{ position:'absolute', top:14, right:'14%', fontSize:14, color:GOLD, opacity:.5 }}>✦</div>
      <div style={{ position:'absolute', top:28, right:'9%', fontSize:9, color:BLUE, opacity:.4 }}>✦</div>
      <div style={{ zIndex:1 }}>
        <div style={{ fontSize:15, fontWeight:900, color:dark?'#fff':'var(--text-prim)', letterSpacing:'-.02em', marginBottom:4 }}>Every concept you learn today,<br/>brings you closer to your goals! 🚀</div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const { dark }            = useTheme()
  const profile             = useStudentUser()
  const isGuest             = !!profile?.isGuest
  const isReady             = profile !== null

  const [lessons, setLessons] = useState(() => readLocalProgress())

  // Derive subjects from profile — same logic as practice page
  const subjects = (() => {
    if (!profile) return []
    const examType = profile.exam_type ?? 'WAEC'
    return examType === 'JAMB'
      ? (profile.subjects_jamb ?? profile.subjects ?? [])
      : (profile.subjects_waec ?? profile.subjects ?? [])
  })()

  // Background sync lesson progress for auth users
  useEffect(() => {
    if (!isReady || isGuest) return

    const lastSync = Number(localStorage.getItem(PROGRESS_SYNC) ?? '0')
    if ((Date.now() - lastSync) < SYNC_SECS * 1000) return  // fresh enough

    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('lesson_id,subject,topic,pct_complete')
          .eq('student_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(20)

        if (progress?.length) {
          const normalised = progress.map(p => ({ id:p.lesson_id, subject:p.subject, topic:p.topic, pct:p.pct_complete||0 }))
          writeLocalProgress(normalised)
          localStorage.setItem(PROGRESS_SYNC, String(Date.now()))
          setLessons(normalised)
        }
      } catch {}
    })()
  }, [isReady, isGuest])

  const name = profile?.full_name?.split(' ')[0] || profile?.username || 'Student'

  // Skeleton while layout resolves
  if (!isReady) return (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      <div style={{ height:160, borderRadius:22, background:`linear-gradient(135deg,${NAVY},#0d2872)`, opacity:0.7 }}/>
      <div style={{ height:200, borderRadius:20, background:'var(--bg-card)', border:'1px solid var(--border)' }}/>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      <Hero name={name} dark={dark}/>

      <div>
        <div style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em', marginBottom:4 }}>Learn Tools</div>
        <div style={{ fontSize:13, color:'var(--text-tert)', marginBottom:16 }}>Powerful tools to help you learn smarter and remember better.</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
          {TOOLS.map(tool => <LearnToolCard key={tool.key} tool={tool} subjects={subjects} dark={dark}/>)}
        </div>
      </div>

      <ActivityToday dark={dark}/>
      {lessons.length > 0 && <ContinueLearning lessons={lessons} dark={dark}/>}
      <MotivationalFooter dark={dark}/>
    </div>
  )
}
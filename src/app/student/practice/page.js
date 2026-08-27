'use client'
// src/app/student/practice/page.js — v14
// Modes: Custom Practice | Quick 5 | Speed Round | Mock Exam
// Custom: subject + exam type (same step) → count → time (optional) → study vs practice

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/contexts/ThemeContext'
import { StudentSidebar, StudentBottomNav } from '@/components/student/StudentNav'
import DailyQuests from '@/components/student/DailyQuests'
import { DesktopTopbar, MobileTopbar } from '@/components/student/StudentTopbar'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const PURPLE = '#7C3AED'
const RED    = '#f43f5e'

const ACCENT = {
  'Chemistry':'#9b7ae0','Physics':'#18B7F2','Biology':'#4ade80',
  'Mathematics':'#FFB800','Further Mathematics':'#FFB800',
  'English Language':'#a78bfa','Use of English':'#a78bfa',
  'Economics':'#fcd34d','Government':'#f87171','Geography':'#34d399',
  'Literature in English':'#f9a8d4','Agricultural Science':'#86efac',
  'Commerce':'#818cf8','Accounting':'#fde68a','default':'#9b7ae0',
}
const SUBJ_ICON = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📝',
}
const getAccent = n => ACCENT[n] ?? ACCENT.default
const getIcon   = n => SUBJ_ICON[n] ?? SUBJ_ICON.default
const isRealId  = id => id && id !== '00000000-0000-0000-0000-000000000001' && /^[0-9a-f-]{36}$/.test(id)

const LAST_SUBJECT_KEY = 'exl_last_practice_subject'
function saveLastSubject(s) { try { if (s?.id) sessionStorage.setItem(LAST_SUBJECT_KEY, JSON.stringify({id:s.id,name:s.name})) } catch {} }
function loadLastSubject() { try { const r = sessionStorage.getItem(LAST_SUBJECT_KEY); return r ? JSON.parse(r) : null } catch { return null } }
function pickDefault(subjects, exam) {
  if (!subjects.length) return null
  const saved = loadLastSubject()
  if (saved) { const m = subjects.find(s => s.id === saved.id); if (m) return m }
  if (exam === 'JAMB') { const u = subjects.find(s => /english/i.test(s.name)); if (u) return u }
  if (exam === 'WAEC') { const e = subjects.find(s => s.name === 'English Language'); if (e) return e }
  return subjects[0]
}

function buildHistory(attempts) {
  if (!attempts?.length) return []
  const sessions = []; let sess = null
  for (const a of attempts) {
    const ts = new Date(a.created_at).getTime()
    const subName = a.subjects?.name ?? 'Unknown'
    const newSess = !sess || subName !== sess.subject || (sess.lastTs - ts) > 30*60*1000
    if (newSess) { if (sess) sessions.push(sess); sess = { subject:subName, lastTs:ts, date:new Date(a.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}), count:0, correct:0, mode:'Practice' } }
    sess.lastTs = ts; sess.count++; if (a.is_correct) sess.correct++
  }
  if (sess) sessions.push(sess)
  return sessions.slice(0,8).map(s => ({ ...s, pct: s.count ? Math.round((s.correct/s.count)*100) : 0 }))
}

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function AppBackground({ dark }) {
  return (
    <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage: dark ? 'radial-gradient(circle,rgba(255,255,255,.03) 1px,transparent 1px)' : 'radial-gradient(circle,rgba(6,42,120,.06) 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>
      {dark ? (<>
        <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', background:'rgba(18,100,229,.08)', filter:'blur(70px)', top:-100, right:-80 }}/>
        <div style={{ position:'absolute', width:280, height:280, borderRadius:'50%', background:'rgba(6,42,120,.15)', filter:'blur(60px)', bottom:-80, left:-80 }}/>
      </>) : (<>
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(18,100,229,.05)', filter:'blur(60px)', top:-60, right:-40 }}/>
        <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'rgba(255,106,0,.04)', filter:'blur(50px)', bottom:-40, left:-50 }}/>
      </>)}
    </div>
  )
}

function Card({ children, style={} }) {
  return <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', overflow:'hidden', ...style }}>{children}</div>
}

function SecLabel({ children, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
      <span style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.025em' }}>{children}</span>
      {right}
    </div>
  )
}

// ─── SUBJECT PICKER SHEET ─────────────────────────────────────────────────────
const COMPULSORY = {
  WAEC: ['English Language', 'Mathematics'],
  JAMB: ['Use of English', 'Mathematics'],
}

function SubjectPickerSheet({ exam, savedWaec, savedJamb, onClose, onSaved, dark }) {
  const [allAvail,  setAllAvail]  = useState([])
  const [selected,  setSelected]  = useState(new Set(exam === 'WAEC' ? savedWaec : savedJamb))
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [activeTab, setActiveTab] = useState(exam)

  const compulsory = COMPULSORY[activeTab] ?? []

  useEffect(() => {
    setLoading(true)
    setSelected(new Set(activeTab === 'WAEC' ? savedWaec : savedJamb))
    fetch('/api/admin/subjects')
      .then(r => r.json())
      .then(d => {
        const all = Array.isArray(d) ? d : (d.subjects ?? [])
        setAllAvail(all.filter(s => s.exam_type === activeTab && s.is_active !== false))
      })
      .catch(() => setAllAvail([]))
      .finally(() => setLoading(false))
  }, [activeTab])

  useEffect(() => {
    setSelected(prev => {
      const next = new Set(prev)
      compulsory.forEach(s => next.add(s))
      return next
    })
  }, [activeTab])

  function toggle(name) {
    if (compulsory.includes(name)) return
    setSelected(prev => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s })
  }

  async function save() {
    if (selected.size === 0) { setError('Select at least one subject.'); return }
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/student/subjects', {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ exam: activeTab, subjects: [...selected] }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error ?? 'Save failed')
      onSaved(activeTab, [...selected])
    } catch(e) { setError(e.message || 'Could not save.') }
    finally { setSaving(false) }
  }

  const selCount = selected.size

  return (
    <>
      <style>{`.spb{position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:flex-end;flex-direction:column}.sps{width:100%;max-width:540px;background:var(--bg-card);border-radius:26px 26px 0 0;border-top:1px solid var(--border);max-height:92vh;display:flex;flex-direction:column;animation:su .28s cubic-bezier(.22,.61,.36,1)}@keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}@media(min-width:768px){.spb{justify-content:center}.sps{border-radius:22px;border:1px solid var(--border);max-height:84vh;animation:fi .22s ease}}@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="spb" onClick={e => e.target===e.currentTarget&&onClose()}>
        <div className="sps">
          <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0' }}>
            <div style={{ width:36, height:4, borderRadius:2, background:'var(--border-strong)' }}/>
          </div>
          <div style={{ padding:'14px 22px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)' }}>My subjects</div>
              <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>
                {selCount > 0 ? <><span style={{ fontWeight:800, color:BLUE }}>{selCount}</span> selected for {activeTab}</> : `Choose your ${activeTab} subjects`}
              </div>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', background:'var(--bg-subtle)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'var(--text-tert)', fontFamily:'inherit' }}>×</button>
          </div>
          <div style={{ padding:'12px 22px 0' }}>
            <div style={{ display:'flex', background:'var(--bg-subtle)', borderRadius:12, padding:3, border:'1px solid var(--border)' }}>
              {['WAEC','JAMB'].map(e => (
                <button key={e} onClick={() => setActiveTab(e)} style={{ flex:1, padding:'8px 0', borderRadius:9, fontSize:13, fontWeight:800, border:'none', cursor:'pointer', fontFamily:'inherit', background:activeTab===e?BLUE:'transparent', color:activeTab===e?'#fff':'var(--text-tert)', transition:'all .15s' }}>{e}</button>
              ))}
            </div>
            <div style={{ marginTop:8, padding:'7px 10px', borderRadius:9, background:dark?'rgba(255,184,0,.08)':'rgba(255,184,0,.07)', border:'1px solid rgba(255,184,0,.2)', fontSize:11, color:'var(--text-tert)' }}>
              🔒 <strong style={{ color:'var(--text-prim)' }}>Compulsory:</strong> {compulsory.join(' · ')}
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'14px 22px' }}>
            {loading ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[...Array(8)].map((_,i) => <div key={i} style={{ height:88, borderRadius:16, background:'var(--bg-subtle)', animation:'pulse2 1.4s infinite' }}/>)}
              </div>
            ) : !allAvail.length ? (
              <div style={{ textAlign:'center', padding:'32px 0' }}>
                <div style={{ fontSize:32, marginBottom:10 }}>📚</div>
                <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)' }}>No {activeTab} subjects yet</div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {allAvail.map(sub => {
                  const a = getAccent(sub.name); const on = selected.has(sub.name); const locked = compulsory.includes(sub.name)
                  return (
                    <button key={sub.id??sub.name} onClick={() => toggle(sub.name)}
                      style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', padding:'14px 13px', borderRadius:16, border:`2px solid ${on?a:'var(--border)'}`, background:on?`${a}10`:'var(--bg-subtle)', cursor:locked?'default':'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .12s', position:'relative' }}>
                      {locked && <div style={{ position:'absolute', top:7, right:7, fontSize:10 }}>🔒</div>}
                      {on && !locked && (
                        <div style={{ position:'absolute', top:9, right:9, width:20, height:20, borderRadius:'50%', background:a, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      )}
                      <div style={{ fontSize:22, marginBottom:8 }}>{getIcon(sub.name)}</div>
                      <div style={{ fontSize:12, fontWeight:800, color:on?a:'var(--text-prim)', lineHeight:1.3, paddingRight:locked||on?20:0 }}>{sub.name}</div>
                      <div style={{ fontSize:10, marginTop:3, color:(sub.topic_count??0)>0?'var(--text-tert)':ORANGE, fontWeight:600 }}>
                        {locked ? 'Compulsory' : (sub.topic_count??0)>0 ? `${sub.topic_count} topics` : 'Coming soon'}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          {error && <div style={{ margin:'0 22px', padding:'10px 14px', borderRadius:11, background:`${RED}12`, border:`1px solid ${RED}30`, fontSize:13, color:RED }}>{error}</div>}
          <div style={{ padding:'14px 22px', paddingBottom:'max(18px,env(safe-area-inset-bottom))', borderTop:'1px solid var(--border)' }}>
            <button onClick={save} disabled={saving||selCount===0}
              style={{ width:'100%', padding:'14px 0', borderRadius:14, border:'none', cursor:saving||selCount===0?'not-allowed':'pointer', background:selCount===0?'var(--border)':BLUE, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', boxShadow:selCount>0?`0 5px 0 #0a3fa0,0 8px 20px ${BLUE}40`:'none', transition:'all .12s' }}>
              {saving ? 'Saving…' : selCount===0 ? 'Select at least one subject' : `Save ${selCount} subject${selCount!==1?'s':''} for ${activeTab} →`}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── GOALS SHEET ──────────────────────────────────────────────────────────────
function GoalsSheet({ profile, onClose, onSaved, dark }) {
  const [waecAs,    setWaecAs]   = useState(profile?.target_waec ?? '')
  const [jambScore, setJambScore]= useState(profile?.target_jamb ? String(profile.target_jamb) : '')
  const [saving,    setSaving]   = useState(false)
  const [saved,     setSaved]    = useState(false)
  const [error,     setError]    = useState('')

  const WAEC_OPTIONS = ["1 A","2 A's","3 A's","4 A's","5 A's","6 A's","7 A's","8 A's","9 A's"]
  const JAMB_OPTIONS = ['180','200','220','240','250','260','270','280','300','320','350']

  async function save() {
    setSaving(true); setError('')
    try {
      const supabase = createClient()
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const { error:err } = await supabase.from('profiles').update({ target_waec: waecAs||null, target_jamb: jambScore?parseInt(jambScore):null }).eq('id', user.id)
      if (err) throw new Error(err.message)
      setSaved(true)
      setTimeout(() => { onSaved({ target_waec:waecAs, target_jamb:jambScore }); onClose() }, 900)
    } catch { setError('Could not save. Please try again.') }
    finally { setSaving(false) }
  }

  return (
    <>
      <style>{`.gb{position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:flex-end;flex-direction:column}.gs{width:100%;max-width:540px;background:var(--bg-card);border-radius:26px 26px 0 0;border-top:1px solid var(--border);display:flex;flex-direction:column;animation:gsu .28s cubic-bezier(.22,.61,.36,1)}@keyframes gsu{from{transform:translateY(100%)}to{transform:translateY(0)}}@media(min-width:768px){.gb{justify-content:center}.gs{border-radius:22px;border:1px solid var(--border);animation:gfi .22s ease}}@keyframes gfi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="gb" onClick={e => e.target===e.currentTarget&&onClose()}>
        <div className="gs">
          <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0' }}><div style={{ width:36, height:4, borderRadius:2, background:'var(--border-strong)' }}/></div>
          <div style={{ padding:'14px 22px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
            <div><div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)' }}>My exam goals</div><div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>Set what you want to achieve</div></div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', background:'var(--bg-subtle)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'var(--text-tert)', fontFamily:'inherit' }}>×</button>
          </div>
          <div style={{ padding:'22px', display:'flex', flexDirection:'column', gap:28 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:`${BLUE}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🎓</div>
                <div><div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)' }}>WAEC target</div><div style={{ fontSize:11, color:'var(--text-tert)' }}>How many A grades?</div></div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {WAEC_OPTIONS.map(opt => { const on=waecAs===opt; return <button key={opt} onClick={() => setWaecAs(on?'':opt)} style={{ padding:'9px 15px', borderRadius:999, border:`2px solid ${on?BLUE:'var(--border)'}`, background:on?`${BLUE}12`:'var(--bg-subtle)', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:on?800:600, color:on?BLUE:'var(--text-sec)', transition:'all .12s' }}>{opt}</button> })}
              </div>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:`${ORANGE}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>📋</div>
                <div><div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)' }}>JAMB target</div><div style={{ fontSize:11, color:'var(--text-tert)' }}>Out of 400</div></div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {JAMB_OPTIONS.map(score => { const on=jambScore===score; return <button key={score} onClick={() => setJambScore(on?'':score)} style={{ padding:'9px 15px', borderRadius:999, border:`2px solid ${on?ORANGE:'var(--border)'}`, background:on?`${ORANGE}12`:'var(--bg-subtle)', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:on?800:600, color:on?ORANGE:'var(--text-sec)', transition:'all .12s' }}>{score}+</button> })}
              </div>
            </div>
          </div>
          {error && <div style={{ margin:'0 22px', padding:'10px 14px', borderRadius:11, background:`${RED}12`, border:`1px solid ${RED}30`, fontSize:13, color:RED }}>{error}</div>}
          <div style={{ padding:'14px 22px', paddingBottom:'max(18px,env(safe-area-inset-bottom))', borderTop:'1px solid var(--border)' }}>
            <button onClick={save} disabled={saving} style={{ width:'100%', padding:'14px 0', borderRadius:14, border:'none', cursor:saving?'not-allowed':'pointer', background:saved?GREEN:GOLD, color:saved?'#fff':NAVY, fontSize:14, fontWeight:900, fontFamily:'inherit', boxShadow:saved?'0 5px 0 #16a34a':`0 5px 0 #b45309,0 8px 20px ${GOLD}40`, transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {saved ? '✓ Saved!' : saving ? 'Saving…' : '⚡ Save my goals'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── HERO BANNER ──────────────────────────────────────────────────────────────
function HeroBanner({ dark }) {
  return (
    <div style={{ borderRadius:22, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,#062A78,#0a1f5e,#0e2875)`:`linear-gradient(135deg,#062A78,#0c2360,#1040a0)`, padding:'22px 24px', display:'flex', alignItems:'center', minHeight:110 }}>
      <div style={{ position:'absolute', top:0, right:0, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.12) 0%,transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:14, right:'38%', fontSize:14, color:GOLD, opacity:.5 }}>✦</div>
      <div style={{ position:'absolute', top:28, right:'34%', fontSize:8, color:CYAN, opacity:.6 }}>✦</div>
      <div style={{ position:'absolute', bottom:18, right:'40%', fontSize:10, color:GOLD, opacity:.4 }}>✦</div>
      <div style={{ flex:1, zIndex:1 }}>
        <div style={{ fontSize:21, fontWeight:900, color:'#fff', letterSpacing:'-.03em', lineHeight:1.2, marginBottom:6 }}>Practice makes progress!</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.55)' }}>Stay consistent and you'll crush your goals.</div>
      </div>
      <div style={{ width:100, height:100, flexShrink:0, zIndex:1 }}>
        <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:'100%', height:'100%', objectFit:'contain', filter:'drop-shadow(0 4px 12px rgba(0,0,0,.35))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
      </div>
    </div>
  )
}

// ─── PRACTICE MODE CARDS ──────────────────────────────────────────────────────
const MODES = [
  {
    key:'custom',
    iconBg:`linear-gradient(135deg,${BLUE},#0a4fc8)`,
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="2"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>,
    label:'Custom Practice',
    desc:'Pick subject, count & mode',
    body:'Customise exactly how you want to practise — subject, questions, time, and style.',
    xp:'+XP', color:BLUE, shadow:'#0a3fa0',
  },
  {
    key:'quick5',
    iconBg:`linear-gradient(135deg,${GREEN},#16a34a)`,
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    label:'Quick 5',
    desc:'5 random questions',
    body:'Fast, no fuss. Five random questions from your subjects to keep you sharp.',
    xp:'+50 XP', color:GREEN, shadow:'#166534',
  },
  {
    key:'timed',
    iconBg:`linear-gradient(135deg,${ORANGE},#d94e00)`,
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" stroke="#fff" strokeWidth="2"/><path d="M12 9v4l3 2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M9 2h6M12 2v3" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>,
    label:'Speed Round',
    desc:'Race the clock',
    body:'Answer questions under time pressure. Trains your exam speed and focus.',
    xp:'+60 XP', color:ORANGE, shadow:'#b84200',
  },
  {
    key:'mock',
    iconBg:`linear-gradient(135deg,${PURPLE},#4c1d95)`,
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="#fff" strokeWidth="2"/><path d="M8 8h8M8 12h8M8 16h5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>,
    label:'Mock Exam',
    desc:'Full exam simulation',
    body:'Simulate a real WAEC or JAMB exam. Full length, timed, no peeking at answers.',
    xp:'+200 XP', color:PURPLE, shadow:'#3b0764',
  },
]

function PracticeModeCards({ onStart, dark }) {
  const [hov, setHov] = useState(null)
  return (
    <div>
      <SecLabel>Practice Modes</SecLabel>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {MODES.map(m => (
          <div key={m.key} onClick={() => onStart(m.key)}
            onMouseEnter={() => setHov(m.key)} onMouseLeave={() => setHov(null)}
            style={{ borderRadius:20, border:`1px solid ${hov===m.key?m.color+'55':'var(--border)'}`, background:'var(--bg-card)', cursor:'pointer', padding:'20px 18px', display:'flex', flexDirection:'column', gap:14, transition:'all .18s', boxShadow:hov===m.key?`0 8px 28px ${m.color}22`:'0 2px 12px rgba(6,42,120,.05)', transform:hov===m.key?'translateY(-2px)':'none' }}>
            <div style={{ width:48, height:48, borderRadius:16, background:m.iconBg, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${m.color}45`, flexShrink:0 }}>{m.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', marginBottom:3 }}>{m.label}</div>
              <div style={{ fontSize:11, fontWeight:700, color:m.color, marginBottom:6 }}>{m.desc}</div>
              <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5 }}>{m.body}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <button style={{ fontSize:13, fontWeight:800, color:m.color, background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' }}>Start ›</button>
              <span style={{ fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:999, background:`${m.color}14`, color:m.color, border:`1px solid ${m.color}25` }}>{m.xp}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── RECENT SESSIONS ──────────────────────────────────────────────────────────
function RecentSessions({ history, dark }) {
  if (!history.length) return (
    <Card style={{ padding:'28px 20px', textAlign:'center' }}>
      <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
      <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No sessions yet</div>
      <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.6 }}>Start a practice session and your history will appear here.</div>
    </Card>
  )
  return (
    <div>
      <SecLabel>Recent Sessions</SecLabel>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
        {history.slice(0,4).map((h,i) => {
          const col = h.pct>=70?GREEN:h.pct>=40?GOLD:'#f87171'
          return (
            <Card key={i} style={{ padding:'16px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', lineHeight:1.3, marginBottom:3 }}>{h.subject}</div>
                  <div style={{ fontSize:10, color:'var(--text-tert)' }}>{h.mode}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0, marginLeft:8 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:col }}>{h.pct}%</div>
                  <div style={{ fontSize:9, color:'var(--text-tert)' }}>{h.correct}/{h.count}</div>
                </div>
              </div>
              <div style={{ fontSize:10, color:'var(--text-tert)', marginBottom:8 }}>{h.date}</div>
              <div style={{ height:5, borderRadius:999, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${h.pct}%`, borderRadius:999, background:col }}/>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── CUSTOM PRACTICE SETUP SHEET ──────────────────────────────────────────────
// Step 1: Pick subject (includes exam type toggle)
// Step 2: Configure (count, time toggle, study vs practice)
export function PracticeSetupSheet({ subjects, loadingSubjects, initialMode='custom', onClose, onStart, onMockExam, exam, onExamChange }) {
  const [mode,       setMode]      = useState(initialMode)
  const [step,       setStep]      = useState(1)

  // Custom config
  const [subject,    setSubject]   = useState(() => pickDefault(subjects, exam))
  const [count,      setCount]     = useState(20)
  const [useTimer,   setUseTimer]  = useState(false)
  const [timeMin,    setTimeMin]   = useState(30)
  const [sessionType,setSessionType] = useState('practice') // 'study' | 'practice'

  // Quick5 subject pick
  const [q5Subject,  setQ5Subject] = useState(() => pickDefault(subjects, exam))

  // Speed round subject + time
  const [spSubject,  setSpSubject] = useState(() => pickDefault(subjects, exam))
  const [spCount,    setSpCount]   = useState(20)
  const [spTime,     setSpTime]    = useState(30)  // seconds per question

  useEffect(() => {
    const def = pickDefault(subjects, exam)
    setSubject(def); setQ5Subject(def); setSpSubject(def)
  }, [subjects, exam])

  const accent = getAccent(subject?.name ?? '')

  function go() {
    if (mode === 'mock') { onMockExam?.(); return }
    if (mode === 'quick5') {
      const s = q5Subject || subjects[0]
      if (!s) return
      saveLastSubject(s)
      const cfg = { subjects:[s.name], subject_id:s.id, examType:exam, count:5, mode:'quick5', sessionType:'practice', answerMode:'instant' }
      sessionStorage.setItem('practice_config', JSON.stringify(cfg))
      onStart?.(cfg); return
    }
    if (mode === 'timed') {
      const s = spSubject || subjects[0]
      if (!s) return
      saveLastSubject(s)
      const cfg = { subjects:[s.name], subject_id:s.id, examType:exam, count:spCount, mode:'timed', sessionType:'practice', speedSecs: spTime }
      sessionStorage.setItem('practice_config', JSON.stringify(cfg))
      onStart?.(cfg); return
    }
    // Custom
    if (!subject) return
    saveLastSubject(subject)
    const cfg = {
      subjects: [subject.name], subject_id: subject.id, examType: exam,
      count, mode:'practice', sessionType,
      durationSecs: useTimer ? timeMin*60 : null,
    }
    sessionStorage.setItem('practice_config', JSON.stringify(cfg))
    onStart?.(cfg)
  }

  function nextStep() {
    if (mode === 'mock') { onMockExam?.(); return }
    if (mode === 'quick5' || mode === 'timed') { go(); return }
    // Custom: step 1 → step 2
    if (step === 1) { setStep(2); return }
    go()
  }

  function prevStep() { if (step > 1) setStep(s => s - 1) }

  const isCustom = mode === 'custom'
  const totalSteps = isCustom ? 2 : 1
  const canNext = mode === 'mock' ? true : mode === 'quick5' ? !!q5Subject : mode === 'timed' ? !!spSubject : step===1 ? !!subject : true

  const modeAccent = { custom:BLUE, quick5:GREEN, timed:ORANGE, mock:PURPLE }[mode] ?? BLUE
  const modeShadow = { custom:'#0a3fa0', quick5:'#166534', timed:'#b84200', mock:'#3b0764' }[mode] ?? '#0a3fa0'

  const btnLabel = mode === 'mock' ? '📝 Start Mock Exam' :
                   mode === 'quick5' ? '⚡ Start Quick 5' :
                   mode === 'timed' ? '⏱ Start Speed Round' :
                   step === 1 ? 'Continue →' : `🚀 Start ${sessionType === 'study' ? 'Study' : 'Practice'} Session`

  return (
    <>
      <style>{`@keyframes sheet-up{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes sheet-in{from{opacity:0;transform:scale(.97) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}.ps-backdrop{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:flex-end}.ps-sheet{width:100%;max-width:560px;background:var(--bg-card);border-radius:28px 28px 0 0;border-top:1px solid var(--border);display:flex;flex-direction:column;max-height:92vh;box-shadow:0 -20px 60px rgba(0,0,0,.4);animation:sheet-up .3s cubic-bezier(.22,.61,.36,1)}@media(min-width:768px){.ps-backdrop{justify-content:center}.ps-sheet{border-radius:24px;border:1px solid var(--border);max-height:86vh;animation:sheet-in .25s ease}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div className="ps-backdrop" onClick={e => e.target===e.currentTarget&&onClose()}>
        <div className="ps-sheet">
          {/* Handle */}
          <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0' }}>
            <div style={{ width:40, height:4, borderRadius:2, background:'var(--border-strong)' }}/>
          </div>

          {/* Header */}
          <div style={{ padding:'16px 22px 14px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid var(--border)' }}>
            {step > 1 && (
              <button onClick={prevStep} style={{ width:34, height:34, borderRadius:10, background:'var(--bg-subtle)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>
                {step===1 ? 'How do you want to practise?' : 'Configure your session'}
              </div>
              {/* Step dots */}
              {isCustom && (
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:6 }}>
                  {Array.from({length:totalSteps},(_,i) => (
                    <div key={i} style={{ height:4, borderRadius:999, transition:'all .25s', background:i<step?modeAccent:'var(--border)', width:i===step-1?24:i<step?16:10 }}/>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:'50%', background:'var(--bg-subtle)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'var(--text-tert)', fontFamily:'inherit', flexShrink:0 }}>×</button>
          </div>

          {/* Body */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px 22px' }}>

            {/* ── STEP 1 ── */}
            {step === 1 && (<>
              {/* Mode selector */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.1em' }}>Mode</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { key:'custom', emoji:'🎛️', label:'Custom Practice', tag:'You choose', color:BLUE,   desc:'Pick subject, question count, time limit and mode.' },
                    { key:'quick5', emoji:'⚡',  label:'Quick 5',         tag:'~4 min',   color:GREEN,  desc:'5 random questions. Fast and focused.' },
                    { key:'timed',  emoji:'⏱️',  label:'Speed Round',     tag:'Race it',  color:ORANGE, desc:'Race through questions under a time limit.' },
                    { key:'mock',   emoji:'📝',  label:'Mock Exam',        tag:'Full sim', color:PURPLE, desc:'A full-length timed exam simulation.' },
                  ].map(m => {
                    const on = mode === m.key
                    return (
                      <button key={m.key} onClick={() => setMode(m.key)}
                        style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:16, border:`2px solid ${on?m.color:'var(--border)'}`, background:on?`${m.color}0d`:'var(--bg-subtle)', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .15s' }}>
                        <div style={{ width:44, height:44, borderRadius:14, background:on?`${m.color}20`:'var(--bg-card)', border:`1.5px solid ${on?m.color+'40':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{m.emoji}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                            <span style={{ fontSize:14, fontWeight:900, color:on?m.color:'var(--text-prim)' }}>{m.label}</span>
                            <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999, background:on?`${m.color}18`:'var(--bg-card)', color:on?m.color:'var(--text-tert)', border:`1px solid ${on?m.color+'30':'var(--border)'}` }}>{m.tag}</span>
                          </div>
                          <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.4 }}>{m.desc}</div>
                        </div>
                        {on && <div style={{ width:20, height:20, borderRadius:'50%', background:m.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Subject + Exam type (shown for all non-mock modes) */}
              {mode !== 'mock' && (<>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.1em' }}>Exam · Subject</div>

                {/* Exam toggle */}
                <div style={{ display:'inline-flex', background:'var(--bg-subtle)', borderRadius:11, padding:3, border:'1px solid var(--border)', marginBottom:12 }}>
                  {['WAEC','JAMB'].map(e => (
                    <button key={e} onClick={() => onExamChange(e)}
                      style={{ padding:'7px 22px', borderRadius:8, fontSize:13, fontWeight:800, border:'none', cursor:'pointer', fontFamily:'inherit', background:exam===e?BLUE:'transparent', color:exam===e?'#fff':'var(--text-tert)', boxShadow:exam===e?`0 2px 8px ${BLUE}50`:'none', transition:'all .15s' }}>{e}</button>
                  ))}
                </div>

                {/* Subject grid */}
                {loadingSubjects ? (
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 0' }}>
                    <div style={{ width:14, height:14, borderRadius:'50%', border:`2px solid ${BLUE}`, borderTopColor:'transparent', animation:'spin .7s linear infinite' }}/>
                    <span style={{ fontSize:13, color:'var(--text-tert)' }}>Loading subjects…</span>
                  </div>
                ) : !subjects.length ? (
                  <div style={{ textAlign:'center', padding:'20px 0' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text-tert)' }}>No {exam} subjects set up yet</div>
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {subjects.map(sub => {
                      const a = getAccent(sub.name)
                      const currentSubj = mode==='quick5' ? q5Subject : mode==='timed' ? spSubject : subject
                      const on = currentSubj?.id === sub.id
                      return (
                        <button key={sub.id} onClick={() => {
                          if (mode==='quick5') setQ5Subject(sub)
                          else if (mode==='timed') setSpSubject(sub)
                          else setSubject(sub)
                        }}
                          style={{ display:'flex', alignItems:'center', gap:9, padding:'11px 13px', borderRadius:14, cursor:'pointer', fontFamily:'inherit', background:on?`${a}12`:'var(--bg-subtle)', border:`2px solid ${on?a:'var(--border)'}`, transition:'all .12s', textAlign:'left' }}>
                          <div style={{ width:32, height:32, borderRadius:10, background:`${a}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{getIcon(sub.name)}</div>
                          <span style={{ fontSize:12, fontWeight:800, color:on?a:'var(--text-prim)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sub.name}</span>
                          {on && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill={a}/><path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Speed round time config here (shown inline) */}
                {mode === 'timed' && (<>
                  <div style={{ marginTop:20 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.1em' }}>Questions</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                      {[10,20,30,40].map(n => (
                        <button key={n} onClick={() => setSpCount(n)}
                          style={{ padding:'12px 0', borderRadius:12, fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'inherit', background:spCount===n?ORANGE:'var(--bg-subtle)', color:spCount===n?'#fff':'var(--text-sec)', border:`2px solid ${spCount===n?ORANGE:'var(--border)'}`, transition:'all .12s' }}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop:14 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.1em' }}>Time per question</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6 }}>
                      {[10,20,30,60,90,120].map(s => (
                        <button key={s} onClick={() => setSpTime(s)}
                          style={{ padding:'11px 0', borderRadius:11, fontSize:12, fontWeight:900, cursor:'pointer', fontFamily:'inherit', background:spTime===s?ORANGE:'var(--bg-subtle)', color:spTime===s?'#fff':'var(--text-sec)', border:`2px solid ${spTime===s?ORANGE:'var(--border)'}`, transition:'all .12s' }}>{s}s</button>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:8 }}>
                      {spTime} seconds per question · {spCount} questions = ~{Math.round(spTime*spCount/60)} min total
                    </div>
                  </div>
                </>)}
              </>)}
            </>)}

            {/* ── STEP 2: Custom config ── */}
            {step === 2 && isCustom && (<>

              {/* Number of questions */}
              <div style={{ marginBottom:22 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.1em' }}>Number of questions</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                  {[10,20,30,40,50].map(n => (
                    <button key={n} onClick={() => setCount(n)}
                      style={{ padding:'13px 0', borderRadius:12, fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'inherit', background:count===n?BLUE:'var(--bg-subtle)', color:count===n?'#fff':'var(--text-sec)', border:`2px solid ${count===n?BLUE:'var(--border)'}`, transition:'all .12s', boxShadow:count===n?`0 4px 12px ${BLUE}40`:'none' }}>{n}</button>
                  ))}
                </div>
              </div>

              {/* Session type */}
              <div style={{ marginBottom:22 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.1em' }}>Session type</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    { key:'study',    emoji:'📖', label:'Study Mode',    desc:'See the answer & explanation right away. Great for learning.' },
                    { key:'practice', emoji:'📝', label:'Practice Mode', desc:'Submit first, review all answers at the end. Builds exam focus.' },
                  ].map(t => {
                    const on = sessionType === t.key
                    return (
                      <button key={t.key} onClick={() => setSessionType(t.key)}
                        style={{ display:'flex', flexDirection:'column', gap:8, padding:'14px', borderRadius:16, border:`2px solid ${on?BLUE:'var(--border)'}`, background:on?`${BLUE}08`:'var(--bg-subtle)', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .14s' }}>
                        <span style={{ fontSize:22 }}>{t.emoji}</span>
                        <div>
                          <div style={{ fontSize:13, fontWeight:900, color:on?BLUE:'var(--text-prim)', marginBottom:3 }}>{t.label}</div>
                          <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.4 }}>{t.desc}</div>
                        </div>
                        {on && <div style={{ marginTop:'auto', width:18, height:18, borderRadius:'50%', background:BLUE, display:'flex', alignItems:'center', justifyContent:'center' }}><svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2L7.5 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Timer toggle */}
              <div style={{ marginBottom:22 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: useTimer ? 10 : 0 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)' }}>Add a time limit</div>
                    <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>Optional — applies to the whole session</div>
                  </div>
                  <button onClick={() => setUseTimer(t => !t)}
                    style={{ width:44, height:26, borderRadius:999, border:'none', cursor:'pointer', background:useTimer?BLUE:'var(--border)', transition:'background .2s', position:'relative', flexShrink:0 }}>
                    <div style={{ position:'absolute', top:3, left: useTimer?20:3, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.2)' }}/>
                  </button>
                </div>
                {useTimer && (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                    {[10,15,20,30,45].map(m => (
                      <button key={m} onClick={() => setTimeMin(m)}
                        style={{ padding:'12px 0', borderRadius:12, fontSize:14, fontWeight:900, cursor:'pointer', fontFamily:'inherit', background:timeMin===m?BLUE:'var(--bg-subtle)', color:timeMin===m?'#fff':'var(--text-sec)', border:`2px solid ${timeMin===m?BLUE:'var(--border)'}`, transition:'all .12s' }}>{m}m</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div style={{ padding:'14px 16px', borderRadius:16, background:'var(--bg-subtle)', border:'1px solid var(--border)' }}>
                {[
                  ['Subject', subject?.name ?? '—'],
                  ['Exam', exam],
                  ['Questions', String(count)],
                  ['Session', sessionType === 'study' ? 'Study (instant feedback)' : 'Practice (review at end)'],
                  ...(useTimer ? [['Time limit', `${timeMin} minutes`]] : []),
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'4px 0' }}>
                    <span style={{ color:'var(--text-tert)', fontWeight:600 }}>{k}</span>
                    <span style={{ color:'var(--text-prim)', fontWeight:800 }}>{v}</span>
                  </div>
                ))}
              </div>
            </>)}
          </div>

          {/* CTA */}
          <div style={{ padding:'14px 22px', paddingBottom:'max(18px,env(safe-area-inset-bottom))', borderTop:'1px solid var(--border)', background:'var(--bg-card)' }}>
            <button onClick={nextStep} disabled={!canNext}
              style={{ width:'100%', padding:'15px 0', borderRadius:14, border:'none', cursor:canNext?'pointer':'not-allowed', background:canNext?modeAccent:'var(--border)', color:'#fff', fontSize:15, fontWeight:900, fontFamily:'inherit', letterSpacing:'-.01em', boxShadow:canNext?`0 5px 0 ${modeShadow},0 8px 24px ${modeAccent}40`:'none', transition:'all .12s', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent)', backgroundSize:'200% 100%', animation:'shimmer 2.5s infinite', pointerEvents:'none' }}/>
              {btnLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PracticePage() {
  const router       = useRouter()
  const supabase     = createClient()
  const { dark }     = useTheme()
  const searchParams = useSearchParams()
  const subjectCache = useRef({})

  const [profile,         setProfile]        = useState(null)
  const [exam,            setExam]           = useState('WAEC')
  const [subjects,        setSubjects]       = useState([])
  const [loadingSubjects, setLoadingSubjects]= useState(false)
  const [loading,         setLoading]        = useState(true)
  const [showSheet,       setShowSheet]      = useState(false)
  const [sheetMode,       setSheetMode]      = useState('custom')
  const [history,         setHistory]        = useState([])
  const [xp,              setXp]             = useState(0)
  const [showSubjects,    setShowSubjects]   = useState(false)
  const [showGoals,       setShowGoals]      = useState(false)

  function openSheet(mode='custom') { setSheetMode(mode); setShowSheet(true) }

  async function fetchSubjects(examTab) {
    if (subjectCache.current[examTab]) { setSubjects(subjectCache.current[examTab]); return }
    setLoadingSubjects(true)
    try {
      const res  = await fetch(`/api/student/subjects?exam=${examTab}`)
      const data = res.ok ? await res.json() : []
      const subs = (data ?? []).map(s => ({id:s.id, name:s.name}))
      subjectCache.current[examTab] = subs
      setSubjects(subs)
    } catch { setSubjects([]) }
    finally { setLoadingSubjects(false) }
  }

  function handleExamChange(e) { setExam(e); fetchSubjects(e) }

  function handleSubjectsSaved(savedExam) {
    delete subjectCache.current[savedExam]
    setShowSubjects(false)
    fetchSubjects(savedExam)
  }

  async function loadHistory(uid) {
    const { data:attempts } = await supabase.from('question_attempts')
      .select('created_at,is_correct,subject_id,subjects(name)')
      .eq('student_id', uid).order('created_at', {ascending:false}).limit(200)
    setHistory(buildHistory(attempts))
  }

  async function load() {
    const { data:{user} } = await supabase.auth.getUser()
    if (!user) { router.replace('/onboarding'); return }
    const { data:prof } = await supabase.from('profiles')
      .select('id,exam_type,full_name,username,total_points,target_waec,target_jamb')
      .eq('id', user.id).single()
    setProfile(prof)
    setXp(prof?.total_points ?? 0)
    const examTab = prof?.exam_type==='JAMB' ? 'JAMB' : 'WAEC'
    setExam(examTab)
    await fetchSubjects(examTab)
    await loadHistory(user.id)
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line
  useEffect(() => { if (searchParams?.get('modal')==='1' && !loading) setShowSheet(true) }, [searchParams, loading])
  useEffect(() => {
    const m = searchParams?.get('mode')
    if (m && !loading) {
      const map = { speed:'timed', mock:'mock', custom:'custom', quick5:'quick5' }
      if (map[m]) { setSheetMode(map[m]); setShowSheet(true) }
    }
  }, [searchParams, loading])

  function handleStart(config) {
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    setShowSheet(false)
    router.push('/student/practice/session')
  }

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid var(--border)`, borderTopColor:BLUE, animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const name = profile?.username || profile?.full_name?.split(' ')[0] || 'Student'
  const cap  = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

  const mainContent = (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      <HeroBanner dark={dark}/>
      <DailyQuests onStart={openSheet}/>
      <PracticeModeCards onStart={openSheet} dark={dark}/>
      <RecentSessions history={history} dark={dark}/>
    </div>
  )

  const rightCol = null

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}} @keyframes pulse2{0%,100%{opacity:.6}50%{opacity:.3}} *{box-sizing:border-box}`}</style>
      <AppBackground dark={dark}/>

      {/* DESKTOP */}
      <div className="hidden lg:flex" style={{ minHeight:'100dvh', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:1340, width:'100%', margin:'0 auto', padding:'20px 24px 60px', display:'flex', gap:20, alignItems:'flex-start' }}>
          <StudentSidebar active="practice" xp={xp} dark={dark}/>
          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
            <DesktopTopbar name={cap(name)} xp={xp} searchPlaceholder="Search topics, questions, exams…"/>
            <div style={{ display:'flex', gap:8, marginBottom:18 }}>
              <button onClick={() => setShowSubjects(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:999, border:'1px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:700, color:'var(--text-tert)' }}>📚 Edit subjects</button>
              <button onClick={() => setShowGoals(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:999, border:`1px solid ${GOLD}35`, background:`${GOLD}10`, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:700, color:GOLD }}>
                🎯 My goals{profile?.target_waec ? ` · ${profile.target_waec} WAEC` : ''}{profile?.target_jamb ? ` · ${profile.target_jamb}+ JAMB` : ''}
              </button>
            </div>
            <div>{mainContent}</div>
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="lg:hidden" style={{ minHeight:'100dvh', paddingBottom:80, position:'relative', zIndex:1 }}>
        <MobileTopbar title="Practice" xp={xp}/>
        <div style={{ padding:'12px 16px 0', display:'flex', gap:8 }}>
          <button onClick={() => setShowSubjects(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:999, border:'1px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:700, color:'var(--text-tert)' }}>📚 Subjects</button>
          <button onClick={() => setShowGoals(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:999, border:`1px solid ${GOLD}35`, background:`${GOLD}10`, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:700, color:GOLD }}>🎯 Goals</button>
        </div>
        <div style={{ padding:'14px 16px 0' }}>{mainContent}</div>
        <StudentBottomNav active="practice" dark={dark}/>
      </div>

      {showSheet && (
        <PracticeSetupSheet
          subjects={subjects} loadingSubjects={loadingSubjects}
          initialMode={sheetMode} exam={exam}
          onExamChange={handleExamChange}
          onClose={() => setShowSheet(false)}
          onStart={handleStart}
          onMockExam={() => { setShowSheet(false); router.push('/student/exam') }}
        />
      )}

      {showSubjects && (
        <SubjectPickerSheet
          exam={exam}
          savedWaec={subjectCache.current['WAEC']?.map(s=>s.name) ?? []}
          savedJamb={subjectCache.current['JAMB']?.map(s=>s.name) ?? []}
          dark={dark}
          onClose={() => setShowSubjects(false)}
          onSaved={handleSubjectsSaved}
        />
      )}

      {showGoals && profile && (
        <GoalsSheet
          profile={profile} dark={dark}
          onClose={() => setShowGoals(false)}
          onSaved={updated => setProfile(p => ({...p,...updated}))}
        />
      )}
    </>
  )
}
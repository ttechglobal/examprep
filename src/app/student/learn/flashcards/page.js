'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import SubjectIcon from '@/components/ui/SubjectIcon'
import { useRouter } from 'next/navigation'
import { loadFlashcards } from '@/lib/flashcardCache'
import { FLASHCARD_PROGRESS_KEY, subjectCategory, subjectColor, subjectProgress, subjectArtwork } from '@/lib/flashcards'
import s from './flashcards.module.css'

function readProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(FLASHCARD_PROGRESS_KEY) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch { return {} }
}
function Meter({ value, label }) {
  return <div className={s.meter} role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${value}%` }} /></div>
}
function SubjectArt({ name, large = false }) {
  const art = subjectArtwork(name)
  return <span className={`${s.subjectArt} ${large ? s.largeArt : ''}`} style={{ backgroundImage: `url('${art.url}')`, backgroundPosition: art.position, backgroundSize: '200% 200%' }} aria-hidden="true" />
}
function Empty({ title, children, retry }) {
  return <div className={s.empty}><span aria-hidden="true">▤</span><h2>{title}</h2><p>{children}</p>{retry && <button className={s.primary} onClick={retry}>Try again</button>}<Link href="/student/learn" className={s.textLink}>Explore other ways to learn →</Link></div>
}
const getData = loadFlashcards

export default function FlashcardsPage() {
  const router = useRouter()
  const [view, setView] = useState('subjects')
  const [subjects, setSubjects] = useState([])
  const [subject, setSubject] = useState(null)
  const [topics, setTopics] = useState([])
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All subjects')
  const request = useRef(0)
  async function loadSubjects({ refresh = false } = {}) {
    const id = ++request.current
    setLoading(true); setError(null)
    try { const data = await getData('', { refresh }); if (id === request.current) setSubjects(data.subjects || []) }
    catch (e) { if (id === request.current) setError(e.message) }
    finally { if (id === request.current) setLoading(false) }
  }
  useEffect(() => {
    const tracker = request
    const id = ++tracker.current
    getData().then(data => {
      if (id === tracker.current) { setSubjects(data.subjects || []); setProgress(readProgress()) }
    }).catch(e => { if (id === tracker.current) setError(e.message) })
      .finally(() => { if (id === tracker.current) setLoading(false) })
    return () => { tracker.current++ }
  }, [])
  async function openSubject(selected) {
    const id = ++request.current
    setSubject(selected); setView('topics'); setSearch(''); setTopics([]); setLoading(true); setError(null)
    try { const data = await getData(`?subjectName=${encodeURIComponent(selected.name)}`); if (id === request.current) setTopics(data.topics || []) }
    catch (e) { if (id === request.current) setError(e.message) }
    finally { if (id === request.current) setLoading(false) }
  }
  function openTopic(selected, selectedSubject = subject) {
    const params = new URLSearchParams({ topicId: selected.id, topicName: selected.name, subjectName: selectedSubject.name })
    if (selected.topic_ids?.length) params.set('topicIds', selected.topic_ids.join(','))
    router.push('/student/learn/flashcards/session?' + params)
  }

  function goHome() { request.current++; setView('subjects'); setSearch(''); setLoading(false); setError(null) }
  const recent = Object.values(progress).filter(p => p?.topicObj && p?.subjectObj && p?.lastStudied && !p.completed).sort((a, b) => b.lastStudied - a.lastStudied)[0]
  const history = Object.values(progress).filter(p => p?.topicObj && p?.subjectObj && p?.lastStudied && subjects.some(item => item.name === p.subjectName)).sort((a, b) => b.lastStudied - a.lastStudied).slice(0, 3)
  const categories = ['All subjects', ...new Set(subjects.map(item => subjectCategory(item.name)))]
  const visibleSubjects = subjects.filter(item => (category === 'All subjects' || subjectCategory(item.name) === category) && item.name.toLowerCase().includes(search.trim().toLowerCase()))
  const visibleTopics = topics.filter(item => item.name.toLowerCase().includes(search.trim().toLowerCase()))
  const total = topics.reduce((sum, item) => sum + item.card_count, 0)
  const gotIt = topics.reduce((sum, item) => sum + Math.min(item.card_count, progress[item.id]?.done || 0), 0)
  return <div className={s.page}>
    {view === 'topics' && <button className={s.textLink} onClick={goHome}>← All subjects</button>}
    {view === 'subjects' && <>
      <header className={s.hero}><div><span className={s.eyebrow}>QUICK RECALL · LASTING CONFIDENCE</span><h1>Flashcards</h1><h2>Remember faster. Forget less.</h2><p>Short recall sessions, one topic at a time. Pick a subject and put your memory to work.</p></div><div className={s.heroArt} aria-hidden="true"><span>✦</span><div>✧</div><b>QUICK<br />RECALL</b></div></header>
      {recent && !loading && subjects.some(item => item.name === recent.subjectName) && <section className={s.continueBanner} style={{ '--accent': subjectColor(recent.subjectName) }}><SubjectArt name={recent.subjectName} /><div><span className={s.eyebrow}>PICK UP WHERE YOU LEFT OFF</span><h2>Continue your study</h2><p>{recent.subjectName} · {recent.topicName}</p><Meter value={subjectProgress({ recent }, recent.subjectName, recent.total).percent} label="Saved Got it progress" /><small>{recent.done || 0} / {recent.total} marked Got it · Saved on this device</small></div><button onClick={() => openTopic(recent.topicObj, recent.subjectObj)}>Continue studying →</button></section>}
      <div className={s.sectionHead}><div><h2>Explore your subjects</h2><p>Available flashcards across the subject library.</p></div><div className={s.libraryActions}><span className={s.count}>{subjects.length} subjects</span><button className={s.textLink} disabled={loading} onClick={() => loadSubjects({ refresh: true })}>Refresh library</button></div></div>
      {!loading && subjects.length > 0 && <div className={s.filters}><div className={s.categories} role="group" aria-label="Subject category">{categories.map(item => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><input aria-label="Search subjects" placeholder="Search subjects…" value={search} onChange={e => setSearch(e.target.value)} /></div>}
      {loading ? <p className={s.loading} role="status">Loading your flashcard library…</p> : error ? <Empty title="We couldn’t load your subjects" retry={loadSubjects}>{error}</Empty> : !subjects.length ? <Empty title="No flashcards available yet">Your subject library will appear here when cards are added. Explore lessons or practise questions in the meantime.</Empty> : !visibleSubjects.length ? <Empty title="No matching subjects">Try another category or a shorter search.</Empty> : <div className={s.subjectGrid}>{visibleSubjects.map(item => {
        const studied = subjectProgress(progress, item.name, item.card_count)
        return <button key={item.id} className={s.subjectCard} style={{ '--accent': subjectColor(item.name) }} onClick={() => openSubject(item)}><SubjectArt name={item.name} /><div className={s.subjectBody}><small>{subjectCategory(item.name)}</small><h3>{item.name}</h3><p>▤ {item.card_count} {item.card_count === 1 ? 'card' : 'cards'}</p><Meter value={studied.percent} label={`${item.name}: cards marked Got it`} /><footer><span>{studied.known ? `${studied.percent}% got it` : 'Not started'}</span><b aria-hidden="true">→</b></footer></div></button>
      })}</div>}
      {!loading && !error && history.length > 0 && <section className={s.history}><h2>Recently studied</h2><div>{history.map(item => <button key={item.topicObj.id} onClick={() => openTopic(item.topicObj, item.subjectObj)}><span>{item.subjectName}</span><strong>{item.topicName}</strong><small>{item.completed ? 'Review this topic' : 'Continue studying'} →</small></button>)}</div></section>}
    </>}
    {view === 'topics' && <div style={{ '--accent': subjectColor(subject.name) }}>
      <header className={s.subjectHero}><SubjectArt name={subject.name} large /><div><span className={s.eyebrow}>FLASHCARD TOPICS</span><h1>{subject.name}</h1><p>Pick a topic and start a quick recall session.</p></div></header>
      {!loading && !error && topics.length > 0 && <div className={s.subjectStats}><span><strong>{total}</strong>Total cards</span><span><strong>{gotIt}</strong>Marked Got it</span><span><strong>{Math.max(0, total - gotIt)}</strong>To review</span><Meter value={total ? Math.round(gotIt / total * 100) : 0} label="Subject Got it progress" /></div>}
      {topics.length > 0 && <input className={s.topicSearch} aria-label="Search topics" placeholder="Find a topic…" value={search} onChange={e => setSearch(e.target.value)} />}
      {loading ? <p className={s.loading} role="status">Loading topics…</p> : error ? <Empty title="We couldn’t load these topics" retry={() => openSubject(subject)}>{error}</Empty> : !topics.length ? <Empty title={`No flashcards for ${subject.name} yet`}>Choose another subject to keep studying.</Empty> : !visibleTopics.length ? <Empty title="No matching topics">Try a different search.</Empty> : <div className={s.topicList}>{visibleTopics.map(item => {
        const saved = progress[item.id]
        const known = Math.min(item.card_count, saved?.done || 0)
        const percent = item.card_count ? Math.round(known / item.card_count * 100) : 0
        return <button key={item.id} className={s.topicRow} onClick={() => openTopic(item)}><span className={s.topicIcon}><SubjectIcon name={subject.name} color="var(--accent)" size={30} /></span><div><h3>{item.name}</h3><p>{item.card_count} cards · {saved?.lastStudied ? `${known} marked Got it` : 'Not started'}</p><Meter value={percent} label={`${item.name}: Got it progress`} /></div><span className={s.topicPercent}>{percent}%</span><span className={s.topicAction}>{saved?.completed ? 'Review' : saved?.lastStudied ? 'Continue' : 'Start'} →</span></button>
      })}</div>}
    </div>}

  </div>
}

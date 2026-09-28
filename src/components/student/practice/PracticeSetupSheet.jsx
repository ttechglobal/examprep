'use client'
// src/components/student/practice/PracticeSetupSheet.jsx — v3
// ─────────────────────────────────────────────────────────────────────────────
// "How do you want to practice?" and the short setup for each mode, opened
// from the Practice page. Styles: ./setupSheet.module.css.
//
//   Mode           Screens                                         Taps to start*
//   Topic          exam + subject → topic                          2
//   Custom         exam + subject → questions, mode, timer         2
//   Quick 5        exam + subject                                  1
//   Speed Round    exam + subject, questions, seconds each         1
//   Mock Exam      → /student/practice/mock (choose WAEC or JAMB)
//   Battle         → /student/battle
//   * with the last subject used already picked
//
// Everything has a sensible default, so a student can go straight through.
// The exam switch (WAEC / JAMB) sits above the subjects, because the exam
// decides which subjects there are (hooks/useExamSubjects.js).
//
// Props
//   profile       the student (useStudentUser)
//   initialScreen 'modes' | 'topic' | 'custom' | 'quick5' | 'timed'
//   initialSessionType  'practice' | 'study' (Custom)
//   onStart(config)  a practice config for /student/practice/session
//   onMock()  onBattle()  onClose()
//
// v3: redesign. Custom is two screens instead of two-plus-summary; no summary
//     screen; Mock goes to the exam chooser instead of straight to WAEC;
//     subjects load per exam through the shared hook. Back from a mode's first
//     screen shows the mode list (× closes).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import LazyImage from '@/components/ui/LazyImage'
import PlayfulTitle from '@/components/ui/PlayfulTitle'
import SubjectIcon from '@/components/ui/SubjectIcon'
import { getSubjectAccent } from '@/lib/subjectAccents'
import { useTheme } from '@/contexts/ThemeContext'
import { useExamSubjects } from '@/hooks/useExamSubjects'
import { SETUP_MASCOT } from './art'
import s from './setupSheet.module.css'

const cx = (...names) => names.filter(Boolean).join(' ')

const TONE = {
  topic: '#1264E5', custom: '#7C3AED', quick5: '#F59E0B',
  timed: '#EF4444', mock: '#16A34A', battle: '#F97316',
}

const MODES = [
  { key: 'topic',  name: 'Topic Practice',  desc: 'Pick a subject and topic, then practise only questions from that topic.', icon: <BookIcon /> },
  { key: 'custom', name: 'Custom Practice', desc: 'Choose your subject, number of questions, timer and more.',              icon: <ListIcon /> },
  { key: 'quick5', name: 'Quick 5',         desc: '5 random questions for a fast challenge.',                               icon: <BoltIcon /> },
  { key: 'timed',  name: 'Speed Round',     desc: 'Beat the clock and test your speed.',                                    icon: <ClockIcon /> },
  { key: 'mock',   name: 'Mock Exam',       desc: 'Full exam simulation. WAEC or JAMB.',                                    icon: <ChecklistIcon /> },
  { key: 'battle', name: 'Battle Mode',     desc: 'Play against the computer or challenge your friends.',                   icon: <SwordsIcon /> },
]

const TITLES = {
  modes: 'Practice Mode', topic: 'Topic Practice', 'topic-pick': 'Topic Practice',
  custom: 'Custom Practice', 'custom-prefs': 'Custom Practice', quick5: 'Quick 5', timed: 'Speed Round',
}
const STEPS = { topic: '1 of 2', 'topic-pick': '2 of 2', custom: '1 of 2', 'custom-prefs': '2 of 2' }

const CUSTOM_COUNTS = [5, 10, 20, 30, 50]
const CUSTOM_TIMERS = [0, 5, 10, 20, 30]                // minutes; 0 = no timer
const SPEED_COUNTS  = [10, 20, 30, 40]
const SPEED_SECS    = [10, 20, 30, 60, 90, 120]

// The last subject practised this session is picked again.
const LAST_SUBJECT_KEY = 'exl_last_practice_subject'
function rememberSubject(subject) {
  try { sessionStorage.setItem(LAST_SUBJECT_KEY, subject.name) } catch {}
}
function defaultSubject(subjects) {
  let last = null
  try { last = sessionStorage.getItem(LAST_SUBJECT_KEY) } catch {}
  return subjects.find(x => x.name === last) ?? subjects[0] ?? null
}

export default function PracticeSetupSheet({ profile, initialScreen = 'modes', initialSessionType = 'practice', onStart, onMock, onBattle, onClose }) {
  const { dark } = useTheme()
  const [stack, setStack] = useState([initialScreen])
  const screen = stack[stack.length - 1]
  const mode   = screen.split('-')[0]                    // 'topic-pick' → 'topic'
  const tone   = TONE[mode] ?? TONE.topic

  const [exam, setExam] = useState(() => profile?.exam_types?.[0] ?? profile?.exam_type ?? 'WAEC')
  const { subjects, loading: subjectsLoading, hasAny } = useExamSubjects(profile, exam)
  const [subject, setSubject] = useState(null)

  const [topic,        setTopic]        = useState(null)
  const [count,        setCount]        = useState(10)
  const [sessionType,  setSessionType]  = useState(initialSessionType)
  const [timerMins,    setTimerMins]    = useState(0)
  const [speedCount,   setSpeedCount]   = useState(20)
  const [speedSecs,    setSpeedSecs]    = useState(30)

  // Keep a valid subject picked as the exam or its subjects change.
  useEffect(() => {
    setSubject(current => subjects.find(x => x.name === current?.name) ?? defaultSubject(subjects))
  }, [subjects])

  // Escape closes, like the × button.
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const go   = next => setStack(st => [...st, next])
  // Back steps through the screens, then to the mode list; × closes.
  const back = () => {
    if (stack.length > 1) setStack(st => st.slice(0, -1))
    else if (screen !== 'modes') setStack(['modes'])
    else onClose()
  }

  function pickMode(key) {
    if (key === 'mock')   return onMock()
    if (key === 'battle') return onBattle()
    go(key)
  }

  // ── Starting ───────────────────────────────────────────────────────────────
  const ready = !!subject?.id
  function base() {
    rememberSubject(subject)
    return { subjects: [subject.name], subject_id: subject.id, examType: exam }
  }
  function start() {
    if (screen === 'topic-pick') return onStart({ ...base(), count: 20, mode: 'practice', sessionType: 'practice', topic_id: topic.id, topicName: topic.name })
    if (screen === 'quick5')     return onStart({ ...base(), count: 5, mode: 'quick5', sessionType: 'practice', answerMode: 'instant' })
    if (screen === 'timed')      return onStart({ ...base(), count: speedCount, mode: 'timed', sessionType: 'practice', speedSecs })
    if (screen === 'custom-prefs') {
      return onStart({ ...base(), count, mode: 'practice', sessionType, durationSecs: timerMins ? timerMins * 60 : null })
    }
  }

  const footer = {
    topic:          { label: 'Choose Topic',       action: () => go('topic-pick'),   enabled: ready },
    'topic-pick':   { label: 'Start Topic Practice', action: start,                   enabled: !!topic },
    custom:         { label: 'Next',               action: () => go('custom-prefs'), enabled: ready },
    'custom-prefs': { label: 'Start Practice',     action: start,                     enabled: ready },
    quick5:         { label: 'Start Quick 5',      action: start,                     enabled: ready },
    timed:          { label: 'Start Speed Round',  action: start,                     enabled: ready },
  }[screen]

  const waitingForSubjects = !ready && subjectsLoading
  const offlineNoIds = !ready && !subjectsLoading && subjects.length > 0 && subjects.every(x => !x.id)

  // Rendered into <body>: inside the page it would sit under the app's bottom
  // nav, which covered the Start button on phones.
  return createPortal(
    <div className={s.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.panel} role="dialog" aria-modal="true" aria-labelledby="setup-title" style={{ '--tone': tone }}>
        <div className={s.bar}>
          <button type="button" className={s.barBtn} onClick={back}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M12.5 4 6.5 10l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>
          <div className={s.barTitle} id="setup-title">
            {TITLES[screen]}
            {STEPS[screen] && <span className={s.step}>Step {STEPS[screen]}</span>}
          </div>
          <button type="button" className={cx(s.barBtn, s.barClose)} onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className={s.body}>
          {screen === 'modes' && <ModePicker onPick={pickMode} />}

          {(screen === 'topic' || screen === 'custom' || screen === 'quick5' || screen === 'timed') && (
            <>
              <h2 className={s.heading}>{screen === 'topic' ? 'Choose a subject' : screen === 'custom' ? 'Choose your subject' : 'Pick a subject'}</h2>
              <p className={s.hint}>
                {screen === 'topic' ? 'Next, you’ll pick the topic to drill.'
                  : screen === 'quick5' ? '5 random questions from this subject, with answers as you go.'
                  : screen === 'timed' ? 'Answer each question before the clock runs out.'
                  : 'Pick the exam, then the subject.'}
              </p>
              <SubjectPicker
                exam={exam} onExam={e => { setExam(e); setTopic(null) }}
                subjects={subjects} hasAny={hasAny} loading={subjectsLoading}
                selected={subject} onSelect={x => { setSubject(x); setTopic(null) }} dark={dark}
              />
              {screen === 'timed' && (
                <>
                  <p className={s.label}>Questions</p>
                  <Chips values={SPEED_COUNTS} value={speedCount} onChange={setSpeedCount} />
                  <p className={s.label}>Time per question</p>
                  <Chips values={SPEED_SECS} value={speedSecs} onChange={setSpeedSecs} format={v => `${v}s`} />
                  <p className={s.note}>About {Math.max(1, Math.round((speedSecs * speedCount) / 60))} minutes in total.</p>
                </>
              )}
            </>
          )}

          {screen === 'topic-pick' && subject && (
            <TopicPicker exam={exam} subject={subject} selected={topic} onSelect={setTopic} onChangeSubject={back} dark={dark} />
          )}

          {screen === 'custom-prefs' && (
            <>
              <h2 className={s.heading}>Set up your session</h2>
              <p className={s.hint}>{subject?.name} · {exam}</p>
              <p className={s.label}>Number of questions</p>
              <Chips values={CUSTOM_COUNTS} value={count} onChange={setCount} />
              <p className={s.label}>Practice mode</p>
              <div className={s.pair}>
                {[
                  { key: 'study',    title: 'Study Practice',   desc: 'See the answer and explanation after each question.' },
                  { key: 'practice', title: 'Practice Session', desc: 'Answer all the questions, then see your results.' },
                ].map(o => (
                  <button key={o.key} type="button" className={cx(s.option, sessionType === o.key && s.optionOn)}
                    onClick={() => setSessionType(o.key)} aria-pressed={sessionType === o.key}>
                    <span className={s.optionTitle}>{o.title}</span>
                    <span className={s.optionDesc}>{o.desc}</span>
                  </button>
                ))}
              </div>
              <p className={s.label}>Timer <span style={{ fontWeight: 500, color: 'var(--text-tert)' }}>(optional)</span></p>
              <Chips values={CUSTOM_TIMERS} value={timerMins} onChange={setTimerMins} wide
                format={v => (v ? `${v} min` : 'No timer')} />
            </>
          )}
        </div>

        {footer && (
          <div className={s.footer}>
            {waitingForSubjects && <p className={s.ctaNote}>Loading your subjects…</p>}
            {offlineNoIds && <p className={s.ctaNote}>Connect to the internet once to load your subjects.</p>}
            <button type="button" className={s.cta} onClick={footer.action} disabled={!footer.enabled}>
              {footer.label}
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ── Mode picker ──────────────────────────────────────────────────────────────
function ModePicker({ onPick }) {
  return (
    <>
      <div className={s.intro}>
        <div className={s.mascot} aria-hidden="true"><LazyImage src={SETUP_MASCOT} /></div>
        <PlayfulTitle as="h2" className={s.introTitle} lead="How do you want to" accent="practice?" stacked />
        <p className={s.introSub}>Choose a mode and start improving today.</p>
      </div>
      <div className={s.modeList}>
        {MODES.map(m => (
          <button key={m.key} type="button" className={s.modeRow} style={{ '--tone': TONE[m.key] }} onClick={() => onPick(m.key)}>
            <span className={s.modeIcon} aria-hidden="true">{m.icon}</span>
            <span style={{ minWidth: 0 }}>
              <span className={s.modeName}>{m.name}</span>
              <span className={s.modeDesc}>{m.desc}</span>
            </span>
            <svg className={s.modeArrow} width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7.5 4l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        ))}
      </div>
    </>
  )
}

// ── Exam switch + subjects ───────────────────────────────────────────────────
function SubjectPicker({ exam, onExam, subjects, hasAny, loading, selected, onSelect, dark }) {
  return (
    <>
      <div className={s.switch} role="tablist" aria-label="Exam">
        {['WAEC', 'JAMB'].map(e => (
          <button key={e} type="button" role="tab" aria-selected={exam === e}
            className={cx(s.switchBtn, exam === e && s.switchOn)} onClick={() => onExam(e)}>{e}</button>
        ))}
      </div>

      {!hasAny ? (
        <div className={s.empty}>
          You haven&apos;t added {exam} subjects yet.<br />
          <Link href="/student/profile">Add them in your profile →</Link>
        </div>
      ) : (
        <div className={s.subjects}>
          {subjects.map(sub => {
            const on = selected?.name === sub.name
            const accent = getSubjectAccent(sub.name, dark)
            return (
              <button key={sub.name} type="button" className={cx(s.subject, on && s.subjectOn)}
                onClick={() => onSelect(sub)} disabled={!sub.id && loading} aria-pressed={on}>
                <span className={s.subjectIcon} style={{ background: accent.accentBg }} aria-hidden="true">
                  <SubjectIcon name={sub.name} color={accent.accent} size={18} />
                </span>
                <span className={s.subjectName}>{sub.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

// ── Topics for one subject ───────────────────────────────────────────────────
function TopicPicker({ exam, subject, selected, onSelect, onChangeSubject, dark }) {
  const [state, setState] = useState({ topics: [], loading: true, failed: false })
  const accent = getSubjectAccent(subject.name, dark)

  useEffect(() => {
    let cancelled = false
    setState({ topics: [], loading: true, failed: false })
    fetch(`/api/student/topics?subject_id=${subject.id}&exam=${exam}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => { if (!cancelled) setState({ topics: Array.isArray(d) ? d : [], loading: false, failed: false }) })
      .catch(() => { if (!cancelled) setState({ topics: [], loading: false, failed: true }) })
    return () => { cancelled = true }
  }, [subject.id, exam])

  return (
    <>
      <h2 className={s.heading}>Pick a topic</h2>
      <p className={s.hint}>Questions will come only from this topic.</p>
      <div className={s.chosen}>
        <span className={s.subjectIcon} style={{ background: accent.accentBg }} aria-hidden="true">
          <SubjectIcon name={subject.name} color={accent.accent} size={18} />
        </span>
        {subject.name} · {exam}
        <button type="button" className={s.barBtn} onClick={onChangeSubject} style={{ color: 'var(--s-blue)' }}>Change</button>
      </div>

      {state.loading ? (
        <div className={s.loadingRow}><span className={s.spinner} /> Loading topics…</div>
      ) : state.failed ? (
        <div className={s.empty}>Couldn&apos;t load the topics. Check your connection and try again.</div>
      ) : !state.topics.length ? (
        <div className={s.empty}>No topics for this subject yet.</div>
      ) : (
        <div className={s.topics}>
          {state.topics.map((t, i) => (
            <button key={t.id} type="button" className={cx(s.topic, selected?.id === t.id && s.topicOn)}
              onClick={() => onSelect(t)} aria-pressed={selected?.id === t.id}>
              <span className={s.topicNum}>{t.order_index ?? i + 1}</span>
              <span className={s.topicName}>
                {t.name}
                {t.question_count > 0 && <span className={s.topicCount}>{t.question_count} questions</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// ── Chips ────────────────────────────────────────────────────────────────────
function Chips({ values, value, onChange, format = v => String(v), wide = false }) {
  return (
    <div className={cx(s.chips, wide && s.chipsWide)}>
      {values.map(v => (
        <button key={v} type="button" className={cx(s.chip, value === v && s.chipOn)}
          onClick={() => onChange(v)} aria-pressed={value === v}>{format(v)}</button>
      ))}
    </div>
  )
}

// ── Icons (white, on the coloured tiles) ─────────────────────────────────────
function BookIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 5.5C9.3 4.5 7 4 4.5 4 3.7 4 3 4.7 3 5.5V17c0 .8.7 1.5 1.5 1.5 2.3 0 4.5.5 6.5 1.5V5.5z" /><path d="M13 5.5c1.7-1 4-1.5 6.5-1.5.8 0 1.5.7 1.5 1.5V17c0 .8-.7 1.5-1.5 1.5-2.3 0-4.5.5-6.5 1.5V5.5z" opacity=".8" /></svg>
}
function ListIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="3.5" width="16" height="17" rx="3" stroke="currentColor" strokeWidth="2" /><path d="M8 8.5h8M8 12h8M8 15.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
}
function BoltIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 2 4.5 13.5H11L10 22l9.5-12H13z" /></svg>
}
function ClockIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5" stroke="currentColor" strokeWidth="2" /><path d="M12 9.5v4.5l3 2M9.5 2.5h5M12 2.5V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
}
function ChecklistIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="3.5" width="16" height="17" rx="3" stroke="currentColor" strokeWidth="2" /><path d="M7.5 9l1.5 1.5 3-3M7.5 15l1.5 1.5 3-3M14 9.5h2.5M14 15.5h2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function SwordsIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4l9.5 9.5M4 4h3.5L15 11.5M4 4v3.5L11.5 15M20 4l-9.5 9.5M20 4h-3.5M20 4v3.5M14.5 17.5l3 3M17.5 14.5l3 3M6.5 17.5l-3 3M9.5 14.5l-3 3M13 16l3-3M11 16l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

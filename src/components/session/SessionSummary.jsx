'use client'
// src/components/session/SessionSummary.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The end-of-session summary for practice and mock exams: score, correct /
// incorrect / skipped / time, performance by topic (weakest first) and, for a
// JAMB mock, by subject; then Try Again, Review Answers, Back to Practice.
// Styles: ./summary.module.css. Artwork: ./art.js (SUMMARY_TROPHY).
//
// Props
//   questions, answers   answers[i] = { selectedIdx, isCorrect } | null
//   config               { mode, subjects[], topicName }
//   xpAwarded, streakDays, durationSecs
//   subjectBreakdown     [{ name, correct, total }] (JAMB mock) or undefined
//   onRetry, retryNote   "Try Again" and the line under it
//   onReview, onHome
//
// Replaces components/student/SessionResults.jsx (v4): new design; the mock's
// subject breakdown is part of the summary instead of a card appended below it.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import LazyImage from '@/components/ui/LazyImage'
import { SUMMARY_TROPHY } from './art'
import { ArrowRight, ChevronLeft, ChevronRight, Check, Cross, Clock, Book, Retry, Home } from './icons'
import s from './summary.module.css'
import { sessionResults, topicPerformance, sessionName } from '@/lib/sessionReview'

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)
const toneFor = p => (p >= 70 ? '#16a34a' : p >= 50 ? '#f59e0b' : '#e11d48')

function formatTime(secs) {
  const seconds = Number.isFinite(secs) ? Math.max(0, Math.round(secs)) : 0
  const m = Math.floor(seconds / 60), sec = seconds % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

function headline(accuracy, name) {
  const done = `${name === 'Mock Exam' ? 'Mock exam' : name === 'Study' ? 'Study session' : name === 'Practice' ? 'Practice session' : name} done!`
  if (accuracy >= 80) return [`${done} 🎉`, 'Excellent work. Keep it up!']
  if (accuracy >= 60) return [`${done} 🎉`, 'Great effort! Keep it up.']
  if (accuracy >= 40) return [`${done} 💪`, 'Good effort. Review the ones you missed.']
  return [`${done} 🔥`, 'Every session makes you sharper. Review and go again.']
}

function Bar({ name, correct, total }) {
  const p = pct(correct, total)
  return (
    <div className={s.topic} style={{ '--tone': toneFor(p) }}>
      <span className={s.topicTile} aria-hidden="true"><Book size={18} /></span>
      <span className={s.topicName}>{name}<small>{correct} of {total} correct</small></span>
      <span className={s.track}><span className={s.fill} style={{ width: `${p}%`, display: 'block' }} /></span>
      <span className={s.pct}>{p}%</span>
    </div>
  )
}

export default function SessionSummary({
  questions, answers, config, xpAwarded = 0, streakDays = 0, durationSecs = 0,
  subjectBreakdown, onRetry, retryNote, onReview, onHome,
}) {
  const [trophyShown, setTrophyShown] = useState(false)
  const { total, correct, skipped, wrong: incorrect, missed, percent: accuracy } = sessionResults(questions, answers)
  const isMock    = config?.mode === 'mock'
  const name = sessionName(config)
  const [title, sub] = headline(accuracy, name)
  const allTopics = topicPerformance(questions, answers)
  const topics = allTopics.slice(0, 6)

  const stats = [
    { label: 'Correct',   value: correct,   tone: '#16a34a', icon: <Check size={16} width={3} /> },
    { label: 'Incorrect', value: incorrect, tone: '#e11d48', icon: <Cross size={16} width={3} /> },
    { label: 'Skipped',   value: skipped,   tone: '#f59e0b', icon: <b style={{ fontSize: 15 }}>!</b> },
    { label: 'Time',      value: formatTime(durationSecs), tone: '#1264e5', icon: <Clock size={16} /> },
  ]

  return (
    <div className={s.page}>
      <header className={s.bar}>
        <button type="button" className={s.barBack} onClick={onHome} aria-label="Back to Practice"><ChevronLeft /></button>
        <h1>{name} Summary</h1>
        <span />
      </header>

      <div className={s.wrap}>
        <section className={s.hero} aria-label="Score">
          <div className={s.heroText}>
            <h2 className={s.heroTitle}>{title}</h2>
            <p className={s.heroSub}>{sub}</p>
            <p className={s.score}>{accuracy}%</p>
            <p className={s.scoreSub}>{correct} out of {total} correct{config?.subjects?.length ? ` · ${config.subjects.join(' · ')}` : ''}</p>
            <div className={s.chips}>
              {xpAwarded > 0 && <span className={s.chip}>⚡ +{xpAwarded} XP</span>}
              {streakDays > 0 && <span className={s.chip}>🔥 {streakDays}-day streak</span>}
            </div>
          </div>
          <div className={s.trophy} aria-hidden="true">
            {!trophyShown && '🏆'}
            <LazyImage src={SUMMARY_TROPHY} onLoaded={() => setTrophyShown(true)} />
          </div>
          <span className={s.sparkle} style={{ top: '14%', right: '40%' }} aria-hidden="true">✦</span>
          <span className={s.sparkle} style={{ top: '30%', right: '6%' }} aria-hidden="true">✦</span>
        </section>

        <section className={`${s.card} ${s.stats}`} aria-label="Results">
          {stats.map(st => (
            <div key={st.label} className={s.stat} style={{ '--tone': st.tone }}>
              <span className={s.statIcon} aria-hidden="true">{st.icon}</span>
              <span className={s.statValue}>{st.value}</span>
              <span className={s.statLabel}>{st.label}</span>
            </div>
          ))}
        </section>

        <section className={`${s.card} ${s.perf}`} aria-label="Performance">
          <div className={s.perfHead}>
            <span className={s.perfIcon} aria-hidden="true">🎯</span>
            <div>
              <h2>Performance by topic</h2>
              <p>{!topics.length ? 'Topic performance will appear when questions are available.' : topics.some(t => t.percent < 70) ? 'Focus on these topics next.' : 'Strong across the board.'}</p>
            </div>
          </div>
          {subjectBreakdown?.length > 0 && (
            <>
              <p className={s.perfLabel}>By subject</p>
              {subjectBreakdown.map(b => <Bar key={b.name} {...b} />)}
              <p className={s.perfLabel}>By topic</p>
            </>
          )}
          {topics.length ? topics.map(t => <Bar key={t.id} {...t} />) : <p className={s.empty}>No topic data for this session.</p>}
          {allTopics.length > topics.length && <p className={s.empty}>Showing the {topics.length} topics with the lowest scores out of {allTopics.length}.</p>}
        </section>

        <div className={s.actions}>
          <button type="button" className={s.action} onClick={onRetry}>
            <span className={s.actionIcon} aria-hidden="true"><Retry /></span>
            <strong>Try Again</strong>
            <span>{retryNote ?? (isMock ? 'Take another mock' : 'Start a new session')}</span>
            <ChevronRight />
          </button>
          <button type="button" className={`${s.action} ${s.primary}`} onClick={() => onReview('all')}>
            <span className={s.actionIcon} aria-hidden="true"><Book size={18} /></span>
            <strong>Review Answers</strong>
            <span>See questions and explanations</span>
            <ChevronRight />
          </button>
          {missed > 0 && <button type="button" className={s.row} onClick={() => onReview('missed')}>
            <span className={s.rowIcon} aria-hidden="true"><Book /></span>
            <span><strong>Review incorrect and skipped</strong><span>{incorrect} incorrect · {skipped} skipped</span></span>
            <ArrowRight />
          </button>}
          <button type="button" className={s.row} onClick={onHome}>
            <span className={s.rowIcon} aria-hidden="true"><Home /></span>
            <span><strong>Back to Practice</strong><span>Choose a new session</span></span>
            <ArrowRight />
          </button>
        </div>
      </div>
    </div>
  )
}

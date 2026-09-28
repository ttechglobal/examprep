'use client'
// src/components/student/practice/PracticeSections.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The sections of the Practice page (app/student/practice/page.js):
//   PracticeHero · PrimaryModes · MoreModes · RecentSessions · NoSubjects
// Styles: ./practice.module.css. Artwork: ./art.js.
// Every section renders complete without its images.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LazyImage from '@/components/ui/LazyImage'
import ArtCard, { ArtCardRow } from '@/components/ui/ArtCard'
import SubjectIcon from '@/components/ui/SubjectIcon'
import { getSubjectAccent } from '@/lib/subjectAccents'
import { appDay, addDays } from '@/lib/dates'
import { HERO_IMAGE, TOPIC_CARD, MOCK_CARD } from './art'
import s from './practice.module.css'

const cx = (...names) => names.filter(Boolean).join(' ')

// ── Hero ─────────────────────────────────────────────────────────────────────
// Phones: "Let's / practice!". Wider: "Golden, let's practice!" with tags.
export function PracticeHero({ name }) {
  return (
    <section className={s.hero} aria-label="Practice">
      <div className={s.heroArt} aria-hidden="true">
        <span className={cx(s.sparkle, s.sparkle1)}>✦</span>
        <span className={cx(s.sparkle, s.sparkle2)}>✦</span>
        <LazyImage src={HERO_IMAGE} />
      </div>

      <div className={s.heroText}>
        <div className={s.tags} aria-hidden="true">
          <span className={s.tag}>📘 Practice</span>
          <span className={s.tag}>🧩 Master Topics</span>
        </div>
        <h1 className={s.title}>
          <span className={s.titleNarrow}>Let&apos;s<br /><span className={s.titleAccent}>practice!</span></span>
          <span className={s.titleWide}>{name}, <span className={s.titleAccent}>let&apos;s practice!</span></span>
        </h1>
        <p className={s.sub}>Choose a mode, pick a topic, and keep improving. 🎯</p>
      </div>
    </section>
  )
}

// ── Topic Practice / Mock Exam ───────────────────────────────────────────────
export function PrimaryModes({ onTopic, onMock }) {
  return (
    <ArtCardRow>
      <ArtCard
        onClick={onTopic} art={TOPIC_CARD} tall={240}
        chipBoxed chipIcon={<OpenBookIcon />} chip="Topic practice"
        title="Drill a Specific Topic"
        desc="Pick a subject and topic, then practise only questions from that topic."
        cta="Choose Topic" ctaStyle="white" ctaInk="#1D4ED8"
      />
      <ArtCard
        onClick={onMock} art={MOCK_CARD} tall={240}
        chipBoxed chipIcon={<PaperIcon />} chip="Mock exam"
        title="Full Exam Simulation"
        desc="Timed, no peeking. Experience the real exam feel and boost your confidence."
        cta="Start Mock" ctaStyle="white" ctaInk="#6D28D9"
      />
    </ArtCardRow>
  )
}

// ── More practice modes ──────────────────────────────────────────────────────
// Wide screens can hide the row (remembered on this device); phones get a
// "See all" that opens the full mode picker instead.
const MORE_MODES = [
  { key: 'quick5', title: 'Quick 5',         short: '5 random questions fast',           desc: '5 random questions for a fast challenge.',  tone: '#F59E0B', icon: <BoltIcon /> },
  { key: 'custom', title: 'Custom Practice', short: 'Choose exam, subject & number',     desc: 'Choose exam, subject, number of questions.', tone: '#7C3AED', icon: <ShuffleIcon /> },
  { key: 'study',  title: 'Study Practice',  short: 'Practice with instant explanations', desc: 'Practice with instant explanations.',        tone: '#1264E5', icon: <LayersIcon /> },
]
const HIDE_KEY = 'ep_practice_modes_hidden'

export function MoreModes({ onPick, onSeeAll }) {
  const [hidden, setHidden] = useState(false)
  useEffect(() => { try { setHidden(localStorage.getItem(HIDE_KEY) === '1') } catch {} }, [])
  function toggle() {
    setHidden(h => {
      try { localStorage.setItem(HIDE_KEY, h ? '0' : '1') } catch {}
      return !h
    })
  }

  return (
    <section aria-label="More practice modes">
      <div className={s.sectionHead}>
        <h2 className={s.sectionTitle}>More Practice Modes</h2>
        <button type="button" className={cx(s.headLink, s.seeAllNarrow)} onClick={onSeeAll}>See all →</button>
        <button type="button" className={cx(s.headLink, s.toggleWide)} onClick={toggle} aria-expanded={!hidden}>
          {hidden ? 'Show modes' : 'Hide modes'}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ transform: hidden ? 'rotate(180deg)' : 'none' }}>
            <path d="M3 9l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {/* Hidden only on wide screens: phones always show the three tiles. */}
      <div className={s.modes} data-hidden={hidden || undefined}>
        {MORE_MODES.map(m => (
          <button key={m.key} type="button" className={s.mode} onClick={() => onPick(m.key)} style={{ '--tone': m.tone }}>
            <span className={s.modeIcon} aria-hidden="true">{m.icon}</span>
            <span style={{ minWidth: 0 }}>
              <span className={s.modeTitle}>{m.title}</span>
              <span className={`${s.modeDesc} ${s.modeDescNarrow}`}>{m.short}</span>
              <span className={`${s.modeDesc} ${s.modeDescWide}`}>{m.desc}</span>
            </span>
            <svg className={s.chevron} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
    </section>
  )
}

// ── Recent sessions ──────────────────────────────────────────────────────────
const MODE_LABEL = { practice: 'Practice', study: 'Study', quick5: 'Quick 5', timed: 'Speed Round', mock: 'Mock Exam' }

function scoreColor(pct) {
  if (pct >= 70) return '#10B981'
  if (pct >= 50) return '#F59E0B'
  return '#EF4444'
}

// "Today, 4:32 PM" · "Yesterday, 6:40 PM" · "24 Sep, 1:10 PM" (Nigerian time)
function formatWhen(session) {
  if (!session.at) return session.date ?? ''
  const day   = appDay(session.at)
  const today = appDay()
  const time  = new Date(session.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' })
  const label = day === today ? 'Today'
    : day === addDays(today, -1) ? 'Yesterday'
    : new Date(session.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })
  return `${label}, ${time}`
}

function topicLine(session) {
  if (session.topic) return `Topic: ${session.topic}`
  const mode = MODE_LABEL[session.mode] ?? 'Practice'
  return session.mode === 'mock' ? mode : `${mode} · Mixed topics`
}

export function RecentSessions({ sessions, loading, dark }) {
  return (
    <section className={s.sessions} aria-label="Recent sessions">
      <div className={s.sectionHead}>
        <h2 className={s.sectionTitle}>Recent Sessions</h2>
        <Link href="/student/progress" className={s.headLink}>View all →</Link>
      </div>

      <div className={s.panel}>
        {loading && !sessions.length ? (
          <div aria-hidden="true">{[0, 1, 2].map(i => <div key={i} className={s.skeleton} />)}</div>
        ) : !sessions.length ? (
          <div className={s.empty}>
            <div style={{ fontSize: 28 }} aria-hidden="true">📋</div>
            <p className={s.emptyTitle}>No sessions yet</p>
            Your practice sessions will show up here.
          </div>
        ) : (
          <ul className={s.list}>
            {sessions.map(session => {
              const accent = getSubjectAccent(session.subject, dark)
              const color  = scoreColor(session.pct)
              return (
                <li key={session.id ?? `${session.subject}-${session.at}`} className={s.row} style={{ '--score': color }}>
                  <span className={s.subjectIcon} style={{ background: accent.accentBg }} aria-hidden="true">
                    <SubjectIcon name={session.subject} color={accent.accent} size={20} />
                  </span>
                  <span className={s.who}>
                    <span className={s.subject}>{session.subject}</span>
                    <span className={s.topic}>{topicLine(session)}</span>
                  </span>
                  <span className={s.counts}>{session.count} questions • {session.correct} correct</span>
                  <span className={s.meter}>
                    <span className={s.track}><span className={s.fill} style={{ width: `${session.pct}%` }} /></span>
                    <span className={s.pct}>{session.pct}%</span>
                  </span>
                  <span className={s.when}>{formatWhen(session)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

// ── No subjects yet ──────────────────────────────────────────────────────────
export function NoSubjects({ isGuest }) {
  return (
    <div className={cx(s.panel, s.setup)}>
      <div style={{ fontSize: 40 }} aria-hidden="true">📚</div>
      <p className={s.setupTitle}>Set up your subjects first</p>
      <p className={s.setupText}>
        {isGuest
          ? 'Go to your profile to pick the subjects you want to practise. Your choices are saved on this device.'
          : 'Head to your profile to choose your exam subjects so we can show you the right practice questions.'}
      </p>
      <Link href="/student/profile" className={s.setupCta}>Go to Profile →</Link>
    </div>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────
function OpenBookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11 5.5C9.3 4.5 7 4 4.5 4 3.7 4 3 4.7 3 5.5V17c0 .8.7 1.5 1.5 1.5 2.3 0 4.5.5 6.5 1.5V5.5z" />
      <path d="M13 5.5c1.7-1 4-1.5 6.5-1.5.8 0 1.5.7 1.5 1.5V17c0 .8-.7 1.5-1.5 1.5-2.3 0-4.5.5-6.5 1.5V5.5z" opacity=".75" />
    </svg>
  )
}

function PaperIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h8l4 4v12.5A1.5 1.5 0 0 1 16.5 21h-10A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z" fill="currentColor" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 2 4.5 13.5H11L10 22l9.5-12H13z" />
    </svg>
  )
}

function ShuffleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7h3.5c2 0 3.3 1 4.3 2.6l2.4 4.8c1 1.6 2.3 2.6 4.3 2.6H21M3 17h3.5c1.4 0 2.5-.5 3.3-1.4M14.2 8.4c.8-.9 1.9-1.4 3.3-1.4H21M18 4l3 3-3 3M18 14l3 3-3 3"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LayersIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 2.5 8 12 13l9.5-5L12 3z" fill="currentColor" />
      <path d="M2.5 12 12 17l9.5-5M2.5 16 12 21l9.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

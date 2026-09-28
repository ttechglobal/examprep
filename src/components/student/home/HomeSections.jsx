'use client'
// src/components/student/home/HomeSections.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The sections of the student home (app/student/home/page.js):
//   Hero · ModeCards · ExamTargets · BoardCard · GuestNudge
// (The week chart is components/student/WeekActivityCard.jsx.)
// Styles: ./home.module.css. Artwork: ./art.js.
//
// Every section renders complete without its images; the artwork loads
// lazily on top (components/ui/LazyImage.jsx).
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import LazyImage from '@/components/ui/LazyImage'
import ArtCard, { ArtCardRow } from '@/components/ui/ArtCard'
import { avatarLook } from '@/lib/leaderboard/avatar'
import { appHour } from '@/lib/dates'
import { HERO_IMAGE, PRACTICE_CARD, BATTLE_CARD } from './art'
import s from './home.module.css'

const cx = (...names) => names.filter(Boolean).join(' ')

// ── Hero ─────────────────────────────────────────────────────────────────────
// Phones: "Good morning, / Golden! 👋". Wider: "👋 Golden, let's go again!"
function partOfDay(hour = appHour()) {
  if (hour < 12) return 'Good morning,'
  if (hour < 17) return 'Good afternoon,'
  return 'Good evening,'
}

export function Hero({ name }) {
  return (
    <section className={s.hero} aria-label="Welcome">
      <div className={s.heroArt} aria-hidden="true">
        <span className={cx(s.sparkle, s.sparkle1)}>✦</span>
        <span className={cx(s.sparkle, s.sparkle2)}>✦</span>
        <span className={cx(s.sparkle, s.sparkle3)}>✦</span>
        <LazyImage src={HERO_IMAGE} />
      </div>

      <p className={s.greetKicker} suppressHydrationWarning>{partOfDay()}</p>
      <h1 className={s.greetTitle}>
        <span className={s.greetNarrow}>{name}! 👋</span>
        <span className={s.greetWide}>👋 {name}, <span className={s.greetAccent}>let&apos;s go again!</span></span>
      </h1>
      <p className={s.greetSub}>Practice. Play. Improve. Pass your exams. 🎯</p>
    </section>
  )
}

// ── Practice / Battle cards ──────────────────────────────────────────────────
export function ModeCards() {
  return (
    <div className={s.modesWrap}>
      <ArtCardRow>
        <ArtCard
          href="/student/practice" art={PRACTICE_CARD}
          chipIcon="📘" chip="Practice mode" title="Start Practising"
          desc="Answer questions, track your progress and master each topic."
          cta="Start Practising"
        />
        <ArtCard
          href="/student/battle" art={BATTLE_CARD}
          chipIcon="🎮" chip="Battle mode" title="Battle Now"
          desc="Play against the computer or challenge your friends."
          cta="Go to Battle"
        />
      </ArtCardRow>
    </div>
  )
}

// ── Exam Targets ─────────────────────────────────────────────────────────────
function gradeColor(grade = '') {
  const g = grade.toUpperCase()
  if (g.startsWith('A')) return '#16a34a'
  if (g.startsWith('B')) return '#1264e5'
  if (g.startsWith('C')) return '#ea580c'
  return '#dc2626'
}

function Goal({ icon, label, value, children }) {
  return (
    <div className={cx(s.panel, s.goal)}>
      <span className={s.goalIcon} aria-hidden="true">{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div className={s.caps}>{label}</div>
        <div className={s.goalValue}>{value}</div>
      </div>
      {children}
    </div>
  )
}

export function ExamTargets({ university, course, jamb, waec }) {
  const empty = !university && !course && !jamb && !waec.length

  return (
    <section className={s.targets} aria-label="Exam targets">
      <div className={s.panelHead}>
        <h2 className={s.panelTitle}>Exam Targets</h2>
        <Link href="/student/profile" className={s.panelLink}>Edit →</Link>
      </div>

      {empty ? (
        <div className={cx(s.panel, s.emptyTargets)}>
          <div style={{ fontSize: 22 }} aria-hidden="true">🎯</div>
          <p className={s.emptyTitle}>Set your targets</p>
          <p className={s.emptyText}>Add your dream university, course and grade targets.</p>
          <Link href="/student/profile" className={s.smallCta}>Add targets →</Link>
        </div>
      ) : (
        <>
          {(university || course || jamb) && (
            <div className={s.goalRow}>
              {university && <Goal icon={<CapIcon />} label="University" value={university} />}
              {course && <Goal icon={<BookIcon />} label="Course" value={course} />}
              {jamb && (
                <Goal icon={<TargetIcon />} label="JAMB target" value="UTME score">
                  <span className={s.jambScore}>{jamb}</span>
                </Goal>
              )}
            </div>
          )}
          {waec.length > 0 && (
            <div className={s.panel}>
              <div className={s.caps}>WAEC targets</div>
              <div className={s.chips}>
                {waec.map(([subject, grade]) => (
                  <span key={subject} className={s.chip} style={{ '--chip': gradeColor(grade) }}>
                    {subject} <b>{grade}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

// allTime: the week has no activity yet, so the server sent all-time XP.
export function BoardCard({ rows, loading, allTime }) {
  return (
    <section className={cx(s.panel, s.board)} aria-label="Leaderboard">
      <div className={s.panelHead}>
        <h2 className={s.panelTitle}>Leaderboard</h2>
        <Link href="/student/leaderboard" className={s.panelLink}>See all →</Link>
      </div>
      <div className={cx(s.caps, s.boardSub)}>National · {allTime ? 'all time' : 'this week'}</div>

      {loading && !rows.length ? (
        <div className={s.rows} aria-hidden="true">
          {[0, 1, 2, 3].map(i => <div key={i} className={s.skeletonRow} />)}
        </div>
      ) : !rows.length ? (
        <p className={s.boardEmpty}>🏆<br />Practise to appear on the board!</p>
      ) : (
        <ol className={s.rows} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map(entry => {
            const look = avatarLook(entry)
            return (
              <li key={entry.student_id} className={cx(s.row, entry.is_me && s.rowMe)}>
                <span className={cx(s.place, MEDALS[entry.rank] && s.medal)}>{MEDALS[entry.rank] ?? entry.rank}</span>
                <span className={s.avatar} style={{ background: look.background, color: look.color }} aria-hidden="true">{look.text}</span>
                <span className={s.rowName}>{entry.is_me ? 'You' : entry.name}</span>
                <span className={s.rowXp}>{(entry.xp || 0).toLocaleString()}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

// ── Guest nudge ──────────────────────────────────────────────────────────────
export function GuestNudge() {
  return (
    <section className={cx(s.panel, s.guest)} aria-label="Save your progress">
      <div style={{ fontSize: 26 }} aria-hidden="true">☁️</div>
      <div>
        <p className={s.guestTitle}>Back up your progress</p>
        <p className={s.guestText}>You&apos;re practising as a guest. Create a free account to save your XP and streak.</p>
        <Link href="/onboarding?mode=signup" className={s.smallCta}>Create free account →</Link>
      </div>
    </section>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────
function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 5.5C3 4.7 3.7 4 4.5 4H10c1.1 0 2 .9 2 2v14c0-.8-.7-1.5-1.5-1.5h-6C3.7 18.5 3 17.8 3 17V5.5z" fill="currentColor" opacity=".9" />
      <path d="M21 5.5c0-.8-.7-1.5-1.5-1.5H14c-1.1 0-2 .9-2 2v14c0-.8.7-1.5 1.5-1.5h6c.8 0 1.5-.7 1.5-1.5V5.5z" fill="currentColor" opacity=".6" />
    </svg>
  )
}

function CapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4 1.5 9 12 14l10.5-5L12 4z" fill="currentColor" />
      <path d="M5.5 11.2V16c0 1.4 2.9 3 6.5 3s6.5-1.6 6.5-3v-4.8L12 14.3l-6.5-3.1z" fill="currentColor" opacity=".7" />
      <path d="M21 9.5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    </svg>
  )
}

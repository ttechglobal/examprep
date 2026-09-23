// src/app/page.js — Landing page (students)
// ─────────────────────────────────────────────────────────────────────────────
// Positioning: practice can be fun. Battle mode leads.
// Server component; only the nav (theme toggle) and install buttons run in
// the browser. Layout is CSS media queries, so phones never flash the
// desktop layout. Schools have their own page at /schools.
// Pricing: no amounts on this page. Every new account gets a 7-day Pro trial.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import SiteNav from '@/components/landing/SiteNav'
import SiteFooter from '@/components/landing/SiteFooter'
import InstallButton from '@/components/landing/InstallButton'
import FaqList from '@/components/landing/FaqList'
import { Phone, BattleScreen, ExplanationScreen, ProgressScreen, LeaderboardCard } from '@/components/landing/Mockups'
import s from '@/components/landing/landing.module.css'

export const metadata = {
  title: 'ExamPrep A1: Practice that feels like a game | WAEC & JAMB',
  description: 'Battle the computer on real WAEC and JAMB past questions, climb your class leaderboard and understand every answer. Start with a 7-day free trial.',
  openGraph: {
    title: 'ExamPrep A1: Practice that feels like a game',
    description: 'Real WAEC and JAMB past questions, battles, streaks and step-by-step explanations. 7-day free trial.',
    images: ['/images/examprep_logo.png'],
    type: 'website',
  },
}

const START = '/onboarding?mode=signup'

const MODES = [
  { icon: '⚔️', bg: 'rgba(18,100,229,.12)',  title: 'Battle',         tag: 'New',             text: 'You vs the computer, question for question, against the clock.' },
  { icon: '⚡', bg: 'rgba(34,197,94,.12)',   title: 'Quick 5',        tag: 'About 5 minutes', text: 'Five random questions, fast. The easiest way to keep your streak alive.' },
  { icon: '⏱',  bg: 'rgba(255,106,0,.12)',   title: 'Speed Round',    tag: 'Beat the clock',  text: 'Answer as many as you can before the timer runs out.' },
  { icon: '🎯', bg: 'rgba(24,183,242,.12)',  title: 'Topic Practice', text: 'Pick one topic and drill it until it clicks.' },
  { icon: '📖', bg: 'rgba(155,122,224,.14)', title: 'Study Practice', text: 'See the explanation straight after every answer, at your own pace.' },
  { icon: '📝', bg: 'rgba(255,184,0,.14)',   title: 'Mock Exam',      tag: 'Exam conditions', text: 'A full timed paper, set out like the real WAEC or JAMB exam.' },
]

const LEVELS = [
  { icon: '🙂', bg: 'rgba(34,197,94,.14)',  title: 'Easy',   text: 'Where everyone starts',        pct: 45, color: '#22c55e' },
  { icon: '😤', bg: 'rgba(255,184,0,.16)',  title: 'Medium', text: 'Unlocks after 3 wins',          pct: 65, color: '#f59e0b' },
  { icon: '🔥', bg: 'rgba(239,68,68,.14)',  title: 'Hard',   text: 'Unlocks after 8 wins',          pct: 80, color: '#ef4444' },
]

const FAQS = [
  { q: 'Is ExamPrep A1 free?',
    a: 'You can start for free. Every new account gets 7 days of ExamPrep A1 Pro, so you can try every mode, including battles, before you decide.' },
  { q: 'What is battle mode?',
    a: 'You play against the computer on real past questions. You both answer the same question against a timer, and correct answers score points. Win enough battles and the computer moves up to Medium, then Hard.' },
  { q: 'Which exams and subjects are covered?',
    a: 'WAEC and JAMB, using real past questions. You choose your exam and subjects when you sign up.' },
  { q: 'Does it work on my phone?',
    a: 'Yes. ExamPrep A1 is built for phones and installs straight from your browser, with no app store needed. On iPhone, use Safari’s Share button, then Add to Home Screen.' },
  { q: 'How do I join my class?',
    a: 'If your school uses ExamPrep A1, your teacher will give you a class code. Enter it in the app to join your class and its leaderboard.' },
  { q: 'What happens when my 7 days end?',
    a: 'You choose whether to continue with ExamPrep A1 Pro. Your progress, streak and XP stay on your account.' },
]

export default function LandingPage() {
  return (
    <div className={s.page}>
      <SiteNav audience="students" />

      <main>
        {/* ── Hero ── */}
        <section className={s.hero}>
          <div className={`${s.wrap} ${s.heroGrid}`}>
            <div>
              <h1 className={s.heroTitle}>Practice that feels like <span className={s.accent}>a game.</span></h1>
              <p className={s.heroSub}>
                Battle the computer on real WAEC and JAMB past questions, climb your class leaderboard,
                and understand every answer. Your first 7 days of Pro are free.
              </p>
              <div className={s.heroActions}>
                <InstallButton size="lg" />
                <Link href={START} className={`${s.btn} ${s.btnGhost} ${s.btnLg}`}>Start practising free</Link>
              </div>
              <p className={s.heroNote}>Already have an account? <Link href="/onboarding?mode=signin">Sign in</Link></p>
              <ul className={s.chips}>
                <li><span className={s.dot} />7-day free trial</li>
                <li><span className={s.dot} />Real WAEC &amp; JAMB past questions</li>
                <li><span className={s.dot} />No app store needed</li>
              </ul>
            </div>
            <div className={s.stage}>
              <Phone label="Battle mode: you against the computer on a Biology question"><BattleScreen /></Phone>
              <div className={`${s.float} ${s.floatA}`} aria-hidden="true">
                <span className={s.floatEmoji}>🔥</span><span>9-day streak<small>Don’t break it!</small></span>
              </div>
              <div className={`${s.float} ${s.floatB}`} aria-hidden="true">
                <span className={s.floatEmoji}>🏆</span><span>#1 in SS3A<small>This week</small></span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Battle ── */}
        <section className={s.sectionAlt}>
          <div className={`${s.wrap} ${s.split}`}>
            <div>
              <h2 className={s.h2}>You vs the computer.</h2>
              <p className={s.lead}>
                Pick a subject and go head-to-head on real past questions. Answer before the timer runs out,
                and before the computer does. Every correct answer puts points on the board.
              </p>
              <p className={s.kicker}>Win, and it fights back harder.</p>
            </div>
            <div className={s.ladder} role="list" aria-label="Battle difficulty levels">
              {LEVELS.map(l => (
                <div key={l.title} className={s.rung} role="listitem">
                  <span className={s.rungBadge} style={{ background: l.bg }} aria-hidden="true">{l.icon}</span>
                  <div>
                    <p className={s.rungTitle}>{l.title}</p>
                    <p className={s.rungText}>{l.text} · computer gets about {l.pct}% right</p>
                  </div>
                  <span className={s.rungMeter} aria-hidden="true"><span style={{ width: `${l.pct}%`, background: l.color }} /></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Modes ── */}
        <section className={s.section}>
          <div className={`${s.wrap} ${s.center}`}>
            <h2 className={s.h2}>A way to practise for every mood.</h2>
            <p className={s.lead}>Five minutes on the bus or a full mock exam on Saturday. Pick what fits.</p>
            <ul className={s.modes} style={{ textAlign: 'left' }}>
              {MODES.map(md => (
                <li key={md.title} className={s.mode}>
                  <span className={s.modeIcon} style={{ background: md.bg }} aria-hidden="true">{md.icon}</span>
                  <div>
                    <p className={s.modeTitle}>{md.title}{md.tag && <span className={s.modeTag}>{md.tag}</span>}</p>
                    <p className={s.modeText}>{md.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Explanations ── */}
        <section className={s.sectionAlt}>
          <div className={`${s.wrap} ${s.split} ${s.splitFlip}`}>
            <div>
              <h2 className={s.h2}>Fun, but you actually learn.</h2>
              <p className={s.lead}>
                Every question comes with a step-by-step explanation: the idea behind it, the working,
                and why each wrong option is wrong.
              </p>
              <p className={s.lead}>So the next question like it is easy too.</p>
            </div>
            <Phone label="A physics question with a step-by-step explanation"><ExplanationScreen /></Phone>
          </div>
        </section>

        {/* ── Compete ── */}
        <section className={s.section}>
          <div className={`${s.wrap} ${s.split}`}>
            <div>
              <h2 className={s.h2}>Keep your streak. Climb the board.</h2>
              <ul className={s.points}>
                <li className={s.point}>
                  <span className={s.pointIcon} aria-hidden="true">📅</span>
                  <div><p className={s.pointTitle}>Daily challenge</p><p className={s.pointText}>A fresh challenge every day to keep you sharp.</p></div>
                </li>
                <li className={s.point}>
                  <span className={s.pointIcon} aria-hidden="true">🔥</span>
                  <div><p className={s.pointTitle}>Streaks and XP</p><p className={s.pointText}>Every day you practise keeps your streak alive and earns XP.</p></div>
                </li>
                <li className={s.point}>
                  <span className={s.pointIcon} aria-hidden="true">🏆</span>
                  <div><p className={s.pointTitle}>Leaderboards</p><p className={s.pointText}>See where you rank in your school and across Nigeria.</p></div>
                </li>
              </ul>
            </div>
            <LeaderboardCard />
          </div>
        </section>

        {/* ── Progress ── */}
        <section className={s.sectionAlt}>
          <div className={`${s.wrap} ${s.split} ${s.splitFlip}`}>
            <div>
              <h2 className={s.h2}>Watch yourself get better.</h2>
              <p className={s.lead}>
                ExamPrep A1 tracks every subject and topic you practise, so you can see what’s improving
                and what to work on next.
              </p>
            </div>
            <Phone label="Student home showing progress by subject and weak topics"><ProgressScreen /></Phone>
          </div>
        </section>

        {/* ── Install ── */}
        <section className={s.section}>
          <div className={s.wrap}>
            <div className={s.installCard}>
              <div>
                <h2 className={s.h2}>Get the app in seconds.</h2>
                <p className={s.lead}>ExamPrep A1 installs straight from your browser. No app store needed.</p>
                <ul className={s.installList}>
                  <li><span className={s.tick}>✓</span><span><strong>Android:</strong> tap Install and confirm.</span></li>
                  <li><span className={s.tick}>✓</span><span><strong>iPhone:</strong> in Safari, tap Share, then Add to Home Screen.</span></li>
                  <li><span className={s.tick}>✓</span><span><strong>Laptop:</strong> install from Chrome or Edge.</span></li>
                </ul>
              </div>
              <div className={s.sheetActions}>
                <InstallButton size="lg" />
                <Link href={START} className={`${s.btn} ${s.btnGhost}`}>Or start in your browser</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className={s.sectionAlt}>
          <div className={`${s.wrap} ${s.center}`}>
            <h2 className={s.h2}>Questions students ask</h2>
            <FaqList items={FAQS} />
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className={s.final}>
          <div className={s.wrap}>
            <h2 className={s.finalTitle}>Make practice the fun part of your day.</h2>
            <p className={s.finalText}>Start your 7-day free trial and play your first battle today.</p>
            <div className={s.finalActions}>
              <InstallButton size="lg" />
              <Link href={START} className={`${s.btn} ${s.btnGhost} ${s.btnLg}`}>Start practising free</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
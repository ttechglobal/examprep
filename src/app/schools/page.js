// src/app/schools/page.js — Landing page (schools)
// ─────────────────────────────────────────────────────────────────────────────
// Two selling points: 1) practice becomes fun, so students actually do it,
// 2) teachers see insight into how students are learning.
// Positioned as a partner in WAEC/JAMB preparation. No pricing, no
// ambassador content. Schools can see the demo.
// Note: /schools is NOT covered by the /school/:path* middleware matcher,
// so it stays public.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import SiteNav from '@/components/landing/SiteNav'
import SiteFooter from '@/components/landing/SiteFooter'
import FaqList from '@/components/landing/FaqList'
import { Phone, BattleScreen, LeaderboardCard, SchoolDashboard } from '@/components/landing/Mockups'
import s from '@/components/landing/landing.module.css'

export const metadata = {
  title: 'ExamPrep A1 for Schools | WAEC & JAMB preparation',
  description: 'ExamPrep A1 makes practice fun for your students and shows your teachers how they are learning, topic by topic.',
  openGraph: {
    title: 'ExamPrep A1 for Schools',
    description: 'Practice your students enjoy, and insight your teachers can act on.',
    images: ['/images/examprep_logo.png'],
    type: 'website',
  },
}

const SIGNUP = '/school-signup'
const DEMO   = '/demo'

const STEPS = [
  { title: 'Sign up your school',         text: 'Create your school account in a few minutes.' },
  { title: 'Create your classes',         text: 'Set up each class and share its code with your students.' },
  { title: 'Students join and practise',  text: 'They enter the code in the app and start practising on real past questions.' },
  { title: 'Teachers see the insight',    text: 'Your dashboard fills up as students practise, topic by topic.' },
]

const FAQS = [
  { q: 'How do students join?',
    a: 'Each class gets its own code. Students enter it in the app and are linked to that class straight away.' },
  { q: 'What can teachers see?',
    a: 'How each class is doing by subject and by topic, which topics are weakest, how often students practise, and which students need extra support.' },
  { q: 'Does it replace our teachers?',
    a: 'No. ExamPrep A1 gives students more practice and gives teachers better information. The teaching stays with your teachers.' },
  { q: 'Which exams does it cover?',
    a: 'WAEC and JAMB. Questions are real past questions, tagged by exam, year and topic.' },
  { q: 'Can parents follow their child’s progress?',
    a: 'Yes. Parents can receive a weekly progress report by email.' },
  { q: 'Can we see it before signing up?',
    a: 'Yes. Open the demo to try the student experience, including battle mode, without creating an account.' },
]

export default function SchoolsPage() {
  return (
    <div className={s.page}>
      <SiteNav audience="schools" />

      <main>
        {/* ── Hero ── */}
        <section className={s.hero}>
          <div className={`${s.wrap} ${s.heroGrid}`}>
            <div>
              <h1 className={`${s.heroTitle} ${s.heroTitleWide}`}>Help your students <span className={s.accentCool}>prepare better</span> for WAEC and JAMB.</h1>
              <p className={s.heroSub}>
                ExamPrep A1 makes practice fun for your students, and shows your teachers exactly how they are learning.
              </p>
              <div className={s.heroActions}>
                <Link href={SIGNUP} className={`${s.btn} ${s.btnBlue} ${s.btnLg}`}>Get started</Link>
                <Link href={DEMO} className={`${s.btn} ${s.btnGhost} ${s.btnLg}`}>See a demo</Link>
              </div>
              <p className={s.heroNote}>Already using ExamPrep A1? <Link href="/school-login">School sign in</Link></p>
              <ul className={s.chips}>
                <li><span className={s.dot} />Real WAEC &amp; JAMB past questions</li>
                <li><span className={s.dot} />Topic-by-topic insight</li>
                <li><span className={s.dot} />Weekly parent reports</li>
              </ul>
            </div>
            <div className={s.stage}>
              <Phone label="A student playing a battle on a Biology question"><BattleScreen /></Phone>
              <div className={`${s.float} ${s.floatA}`} aria-hidden="true">
                <span className={s.floatEmoji}>⚔️</span><span>Students play<small>Real past questions</small></span>
              </div>
              <div className={`${s.float} ${s.floatB}`} aria-hidden="true">
                <span className={s.floatEmoji}>📊</span><span>Teachers see<small>Every answer, by topic</small></span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Selling point 1: fun ── */}
        <section className={s.sectionAlt}>
          <div className={`${s.wrap} ${s.split}`}>
            <div>
              <h2 className={s.h2}>Practice your students actually want to do.</h2>
              <p className={s.lead}>
                Revision works when students keep coming back. Battles against the computer, daily challenges,
                streaks and a class leaderboard turn exam practice into something students choose to do.
              </p>
              <ul className={s.points}>
                <li className={s.point}>
                  <span className={s.pointIcon} aria-hidden="true">⚔️</span>
                  <div><p className={s.pointTitle}>Battles on real past questions</p><p className={s.pointText}>Students race the computer and the clock, and the computer gets tougher as they win.</p></div>
                </li>
                <li className={s.point}>
                  <span className={s.pointIcon} aria-hidden="true">🏆</span>
                  <div><p className={s.pointTitle}>Class and school leaderboards</p><p className={s.pointText}>Friendly competition keeps whole classes practising.</p></div>
                </li>
                <li className={s.point}>
                  <span className={s.pointIcon} aria-hidden="true">📖</span>
                  <div><p className={s.pointTitle}>Explanations that teach</p><p className={s.pointText}>Every question explains the idea behind it, not just the right option.</p></div>
                </li>
              </ul>
            </div>
            <LeaderboardCard />
          </div>
        </section>

        {/* ── Selling point 2: insight ── */}
        <section className={s.section}>
          <div className={`${s.wrap} ${s.split} ${s.splitFlip}`}>
            <div>
              <h2 className={s.h2}>See how your students are learning.</h2>
              <p className={s.lead}>
                Every question a student answers feeds your dashboard. Teachers see which topics the class understands,
                where it is struggling and who needs support, while there is still time to act.
              </p>
              <ul className={s.points}>
                <li className={s.point}>
                  <span className={s.pointIcon} aria-hidden="true">📊</span>
                  <div><p className={s.pointTitle}>Subject and topic breakdown</p><p className={s.pointText}>Not just “Chemistry is weak”. Which Chemistry topics, and by how much.</p></div>
                </li>
                <li className={s.point}>
                  <span className={s.pointIcon} aria-hidden="true">🚨</span>
                  <div><p className={s.pointTitle}>Students who need support</p><p className={s.pointText}>Spot who is falling behind early, not after the mock exam.</p></div>
                </li>
                <li className={s.point}>
                  <span className={s.pointIcon} aria-hidden="true">📈</span>
                  <div><p className={s.pointTitle}>Weekly engagement</p><p className={s.pointText}>See how often each class practises, week by week.</p></div>
                </li>
                <li className={s.point}>
                  <span className={s.pointIcon} aria-hidden="true">📧</span>
                  <div><p className={s.pointTitle}>Weekly parent reports</p><p className={s.pointText}>Parents get a summary of their child’s practice by email.</p></div>
                </li>
              </ul>
            </div>
            <SchoolDashboard />
          </div>
        </section>

        {/* ── Partner / how it works ── */}
        <section className={s.sectionAlt}>
          <div className={s.wrap}>
            <h2 className={s.h2}>A partner in exam preparation.</h2>
            <p className={s.lead}>
              We work alongside your teachers. ExamPrep A1 gives students practice they enjoy, and gives teachers
              the information they need to focus revision where it matters.
            </p>
            <ol className={s.steps}>
              {STEPS.map(st => (
                <li key={st.title} className={s.step}>
                  <p className={s.stepTitle}>{st.title}</p>
                  <p className={s.stepText}>{st.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className={s.section}>
          <div className={`${s.wrap} ${s.center}`}>
            <h2 className={s.h2}>Questions schools ask</h2>
            <FaqList items={FAQS} />
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className={s.final}>
          <div className={s.wrap}>
            <h2 className={s.finalTitle}>Prepare your students better, starting this term.</h2>
            <p className={s.finalText}>See what your students will experience, or set up your school today.</p>
            <div className={s.finalActions}>
              <Link href={SIGNUP} className={`${s.btn} ${s.btnBlue} ${s.btnLg}`}>Get started</Link>
              <Link href={DEMO} className={`${s.btn} ${s.btnGhost} ${s.btnLg}`}>See a demo</Link>
            </div>
            <p className={s.finalText} style={{ marginTop: 22, fontSize: 14 }}>
              Prefer to talk first? Email <a href="mailto:schools@examprep.ng" style={{ color: '#fff', fontWeight: 800 }}>schools@examprep.ng</a>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
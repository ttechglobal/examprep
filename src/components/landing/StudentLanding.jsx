import Link from 'next/link'
import SiteNav from './SiteNav'
import SiteFooter from './SiteFooter'
import { Phone, BattleScreen } from './Mockups'
import ReferralActions from '@/app/r/[code]/ReferralActions'
import { TRIAL_DAYS, PLANS } from '@/lib/plans'
import s from './landing.module.css'
import m from './studentLanding.module.css'

const BENEFITS = [
  { icon: '🎯', title: 'Know what to focus on', text: 'Weekly challenges target topics that appear frequently in past questions. Our analysis across exam years helps you give important topics more practice.' },
  { icon: '⚔️', title: 'Make every session count', text: 'Turn JAMB and WAEC past questions into a game. Play against the computer, build speed and make regular practice a habit.' },
  { icon: '💡', title: 'Understand it. Then master it.', text: 'Learn interactively with explanations, then practise topic by topic to strengthen the areas you find difficult.' },
  { icon: '🏆', title: 'Stay motivated to improve', text: 'Earn XP, compete on the leaderboard and track your progress as you work towards your target score.' },
]

export default function StudentLanding({ invitation }) {
  let downloadUrl = null
  try {
    const url = new URL(process.env.NEXT_PUBLIC_MOBILE_APP_DOWNLOAD_URL || '')
    if (url.protocol === 'https:') downloadUrl = url.href
  } catch { /* APK is still being prepared. */ }
  const entryPlan = PLANS[0]

  return (
    <div className={s.page}>
      <SiteNav audience="students" />
      <main>
        <section className={`${s.hero} ${m.hero}`}>
          <div className={`${s.wrap} ${s.heroGrid}`}>
            <div>
              <p className={m.eyebrow}>{invitation ? `${invitation.firstName} invited you to ExamPrep A1` : 'YOUR JAMB GOAL. YOUR NEXT STEP.'}</p>
              <h1 className={s.heroTitle}>Your dream score starts with <span className={s.accent}>better practice.</span></h1>
              <p className={s.heroSub}>Work towards the JAMB score you want—and prepare for WAEC too. Turn past questions into a game, understand your mistakes and build confidence, one topic at a time.</p>
              <div className={s.heroActions}>
                <a href="#start-practising" className={`${s.btn} ${s.btnGold} ${s.btnLg}`}>Start practising for free</a>
              </div>
              <p className={s.heroNote}>{TRIAL_DAYS} days of Pro free. Start learning in your browser today.</p>
            </div>
            <div className={`${s.stage} ${m.stage}`}>
              <Phone label="Example of practising past questions against the computer"><BattleScreen /></Phone>
              <span className={m.previewLabel}>A glimpse of your next practice session</span>
            </div>
          </div>
        </section>

        <section id="start-practising" className={`${s.wrap} ${m.access}`} aria-labelledby="start-title">
          <div className={m.accessIntro}>
            <p className={m.eyebrow}>START HERE</p>
            <h2 id="start-title" className={s.h2}>Ready when you are.</h2>
            <p className={s.lead}>Start in your browser now. Our Android app is on the way.</p>
            <p className={m.offline}><span aria-hidden="true">📥</span> <strong>Offline practice · Coming soon</strong><br />Download questions and keep practising without internet when offline access launches.</p>
            <p className={m.affordable}>Start free. Affordable Pro plans from ₦{entryPlan.price.toLocaleString('en-NG')} for {entryPlan.months} months after your trial.</p>
          </div>
          <ReferralActions code={invitation?.code} downloadUrl={downloadUrl} />
        </section>

        <section className={m.benefits} aria-labelledby="benefits-title">
          <div className={s.wrap}>
            <h2 id="benefits-title" className={s.h2}>Practise with a purpose.</h2>
            <p className={s.lead}>Less guessing what to study. More time getting better.</p>
            <div className={m.grid}>
              {BENEFITS.map(item => <article className={m.benefit} key={item.title}>
                <span className={m.icon} aria-hidden="true">{item.icon}</span>
                <h3>{item.title}</h3><p>{item.text}</p>
              </article>)}
            </div>
          </div>
        </section>

        <section className={`${s.final} ${m.final}`}>
          <div className={s.wrap}>
            <h2 className={s.finalTitle}>Take one step closer to your target score.</h2>
            <p className={s.finalText}>Your next practice session is a good place to start.</p>
            <a href="#start-practising" className={`${s.btn} ${s.btnGold} ${s.btnLg}`}>Start practising for free</a>
            <p className={s.heroNote}>Already learning with us? <Link href="/onboarding?mode=signin">Sign in</Link></p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

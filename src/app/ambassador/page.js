// src/app/ambassador/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Teacher Ambassador Program — public info page.
//
// One link to share when anyone asks "how does the ambassador program work?"
// The model: a teacher recommends ExamPrep A1 to their students. Students sign
// up through the teacher's referral link or code. When a student pays, the
// teacher is credited a percentage, visible on their own dashboard. Bringing a
// whole school on board is welcome but optional.
//
// Applications go to the Google Form and land in Google Sheets. Submitting
// does not guarantee a place: we review and contact selected teachers.
//
// Server component: no client JS needed. The FAQ uses native <details>,
// buttons use CSS :active for the press effect. Metadata below controls the
// WhatsApp / social link preview.
//
// TO EDIT:
//   • GOOGLE_FORM_URL    — paste the real form link
//   • COMMISSION_RATE    — the ambassador's share. Stated in the FAQ only.
//                          Plan prices are deliberately NOT shown on this page.
//   • SCREENSHOTS        — drop real screenshots into /public/images/ambassador/
//                          and set `image` to swap out the built-in mockups
// ─────────────────────────────────────────────────────────────────────────────

import styles from './ambassador.module.css'
import { whatsappLink } from '@/lib/contact'
import { TRIAL_DAYS } from '@/lib/plans'

// ── Links ─────────────────────────────────────────────────────────────────────
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeKMOeCcqMQB5Srt3iqfYPlbETgyoipbp7qRyIF3fLHm7g59g/viewform?usp=header'
const WHATSAPP_URL    = whatsappLink('Hi, I have a question about the ExamPrep A1 Teacher Ambassador Program')

// ── Commission ────────────────────────────────────────────────────────────────
// Stated in the FAQ only, by design. Everywhere else the page says "a percentage".
const COMMISSION_RATE = 0.2
const COMMISSION_PCT  = `${COMMISSION_RATE * 100}%`

export const metadata = {
  title:       'Teacher Ambassador Program | ExamPrep A1',
  description: 'Recommend ExamPrep A1, the gamified WAEC and JAMB learning app, to your students and earn when they subscribe. Free to join.',
  openGraph: {
    title:       'ExamPrep A1 Teacher Ambassador Program',
    description: 'Recommend a gamified learning app to your students and earn when they subscribe.',
    images:      ['/images/examprep_logo.png'],
    type:        'website',
  },
}

// ── Screenshots ───────────────────────────────────────────────────────────────
// Set `image` to a path in /public (e.g. '/images/ambassador/explanation.png')
// to show a real screenshot instead of the built-in mockup.
const SCREENSHOTS = {
  explanation: { image: null, alt: 'A past question with its step-by-step explanation' },
  battle:      { image: null, alt: 'Battle mode: a student competing against the computer on a past question' },
}

const FEATURES = [
  { icon: '⚔️', title: 'Battle the computer',        text: 'Students compete head-to-head against the computer while answering real past questions.' },
  { icon: '🔥', title: 'XP, streaks and levels',     text: 'Every question earns XP. Streaks and levels make revision a daily habit.' },
  { icon: '🏆', title: 'Missions and leaderboards',  text: 'Daily goals and school and national leaderboards give students a reason to keep going.' },
  { icon: '📚', title: 'Real WAEC and JAMB questions', text: 'Organised by subject, topic and year, with step-by-step explanations.' },
]

const STEPS = [
  { title: 'Apply',                    text: 'Fill the short form. It takes about three minutes.' },
  { title: 'We review and select',     text: 'Applying does not guarantee a place. We reach out to the teachers we select.' },
  { title: 'Share with your students', text: 'You get a referral link and code. Students sign up with it.' },
  { title: 'Earn when they pay',       text: 'A percentage of each payment is credited to you, visible on your dashboard.' },
]

const FAQS = [
  {
    q: 'Do I need to pay anything to join?',
    a: 'No. Joining the program is completely free.',
  },
  {
    q: 'How much do I earn?',
    a: `You earn ${COMMISSION_PCT} of whatever each student pays. There is no limit on how many students you can refer.`,
  },
  {
    q: 'Do I get paid just for students signing up?',
    a: 'No. You earn when a student you referred actually pays, not when they sign up.',
  },
  {
    q: 'Can students try the app before paying?',
    a: `Yes. Every new student gets ${TRIAL_DAYS} days of everything free, and some features stay free after that.`,
  },
  {
    q: 'How do you know which students are mine?',
    a: 'Students sign up through your referral link, or enter your referral code when they register. Every payment from a student linked to you is credited to you.',
  },
  {
    q: 'Can I see how I’m doing?',
    a: 'Yes. Your own dashboard shows who signed up with your link or code, who has paid, and what you have earned. It is fully transparent.',
  },
  {
    q: 'What happens after I fill the form?',
    a: 'We review every application. Submitting the form does not automatically make you an ambassador. If you are selected, we reach out to you directly.',
  },
  {
    q: 'Do I have to convince students to pay?',
    a: 'No. Just recommend the app. You should never pressure students or parents to pay.',
  },
  {
    q: 'Can I bring my whole school on board?',
    a: 'Yes, you are welcome to. Tell us when we speak and we will help you present it to your school. Students from your school who sign up with your link or code count toward your earnings.',
  },
]

const TERMS = [
  'Ambassadors earn a percentage of payments actually received from students who signed up using their referral link or code.',
  'Submitting the application form does not guarantee selection as an ambassador.',
  'Each student is linked to the ambassador whose link or code they used when signing up.',
  'Refunded or reversed payments are removed from your earnings.',
  'You may not misrepresent ExamPrep A1, make promises on our behalf (such as guaranteed results or discounts we have not approved), or pressure students or parents to pay.',
  'Creating fake or duplicate accounts to earn commission is not allowed.',
  'ExamPrep A1 may update the program terms with notice to ambassadors. Earnings already made are not affected.',
  'ExamPrep A1 may remove ambassadors who break these terms.',
]

// ── Small pieces ──────────────────────────────────────────────────────────────
function ApplyButton({ children = 'Apply to become an ambassador' }) {
  return (
    <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer" className={`${styles.btn} ${styles.btnGold}`}>
      {children}
    </a>
  )
}

function Phone({ shot, children }) {
  return (
    <div className={styles.phone}>
      {shot.image ? (
        <div className={styles.screen}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot.image} alt={shot.alt} />
        </div>
      ) : children}
    </div>
  )
}

function ExplanationMock() {
  return (
    <div className={`${styles.screen} ${styles.mLight}`} role="img" aria-label={SCREENSHOTS.explanation.alt}>
      <div className={styles.mTop}>
        <div className={styles.mTopRow}><span>Physics</span><span className={styles.mTopMuted}>3/5</span></div>
        <div className={styles.mBar}><span /></div>
      </div>
      <div className={styles.mBody}>
        <span className={styles.mTag}>WAEC 2019 · Waves</span>
        <p className={styles.mQ}>A wave has a frequency of 50 Hz and a wavelength of 2 m. What is its speed?</p>
        <div className={`${styles.mOpt} ${styles.mOptRight}`}><span className={styles.mOptLetter}>✓</span>100 m/s</div>
        <div className={`${styles.mOpt} ${styles.mOptWrong}`}><span className={styles.mOptLetter}>✗</span>25 m/s</div>
        <div className={styles.mOpt}><span className={styles.mOptLetter}>C</span>52 m/s</div>
        <div className={styles.mExplain}>
          <div className={styles.mExplainTitle}>💡 Why it’s 100 m/s</div>
          <div className={styles.mStep}><span className={styles.mStepNum}>1</span><span>Every wave obeys v = f × λ.</span></div>
          <div className={styles.mStep}><span className={styles.mStepNum}>2</span><span>v = 50 × 2 = 100 m/s.</span></div>
          <div className={styles.mStep}><span className={styles.mStepNum}>3</span><span>25 m/s comes from dividing instead of multiplying.</span></div>
        </div>
      </div>
    </div>
  )
}

function BattleMock() {
  const tiles = [
    { l: 'A', t: 'Mitochondrion', c: '#3B82F6' },
    { l: 'B', t: 'Ribosome',      c: '#22C55E' },
    { l: 'C', t: 'Nucleus',       c: '#F97316' },
    { l: 'D', t: 'Vacuole',       c: '#8B5CF6' },
  ]
  return (
    <div className={`${styles.screen} ${styles.mBattle}`} role="img" aria-label={SCREENSHOTS.battle.alt}>
      <div className={styles.mVs}>
        <span className={styles.mVsSide}>You<span className={styles.mVsScore}>30</span></span>
        <span className={styles.mVsMid}>VS</span>
        <span className={styles.mVsSide}>CPU<span className={styles.mVsScore}>20</span></span>
      </div>
      <span className={styles.mTimer}>⏱ 0:18</span>
      <div className={styles.mBattleCard}>Which organelle is known as the powerhouse of the cell?</div>
      <div className={styles.mTiles}>
        {tiles.map(t => (
          <div key={t.l} className={styles.mTile} style={{ background: t.c, boxShadow: `0 4px 0 ${t.c}99` }}>
            <span className={styles.mTileLetter}>{t.l}</span>{t.t}
          </div>
        ))}
      </div>
    </div>
  )
}

// Sample data, for illustration only. No amounts are shown on purpose.
function AmbassadorDashMock() {
  const recent = [
    { name: 'Chidi O.', status: 'Subscribed', credited: true },
    { name: 'Aisha B.', status: 'Subscribed', credited: true },
    { name: 'Tunde A.', status: 'Subscribed', credited: true },
    { name: 'Ngozi E.', status: 'Signed up',  credited: false },
  ]
  return (
    <div className={styles.dash} role="img" aria-label="Ambassador dashboard showing students signed up, students who subscribed">
      <div className={styles.dashHead}>
        <span className={styles.dashTitle}>Your dashboard</span>
        <span className={styles.dashMeta}>This term</span>
      </div>
      <div className={styles.dashKpis}>
        <div className={styles.dashKpi}><div className={styles.dashKpiNum}>48</div><div className={styles.dashKpiLabel}>Signed up</div></div>
        <div className={styles.dashKpi}><div className={styles.dashKpiNum}>14</div><div className={styles.dashKpiLabel}>Subscribed</div></div>
      </div>
      <div className={styles.dashSub}>Recent activity</div>
      {recent.map(r => (
        <div key={r.name} className={styles.dashRow}>
          <span className={styles.dashName}>{r.name}</span>
          <span className={styles.dashPlan}>{r.status}</span>
          <span className={r.credited ? styles.dashCredit : styles.dashPending}>{r.credited ? 'Credited' : 'Free trial'}</span>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AmbassadorPage() {
  return (
    <div className={styles.page}>
      {/* Nav */}
      <header className={styles.nav}>
        <div className={`${styles.wrap} ${styles.navInner}`}>
          <a href="/" className={styles.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/examprep_logo.png" alt="" width={30} height={30} />
            ExamPrep A1
          </a>
          <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer" className={styles.navLink}>Apply now</a>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={`${styles.wrap} ${styles.heroGrid}`}>
            <div>
              <h1 className={styles.heroTitle}>
                Recommend <span className={styles.heroMark}>ExamPrep A1</span> to your students.
                Earn when they <span className={styles.heroMark}>subscribe</span>.
              </h1>
              <p className={styles.heroSub}>
                Become a Teacher Ambassador. Share your link, and earn when your students pay.
              </p>
              <div className={styles.heroActions}>
                <ApplyButton />
                <a href="#how-it-works" className={`${styles.btn} ${styles.btnGhost}`}>See how it works</a>
              </div>
            </div>

            <div className={styles.passStage} aria-hidden="true">
              <div className={styles.pass}>
                <div className={styles.passTop}>
                  <span className={styles.passBrand}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/examprep_logo.png" alt="" width={22} height={22} />
                    ExamPrep A1
                  </span>
                  <span className={styles.passChip}>★ Ambassador</span>
                </div>
                <p className={styles.passRole}>Teacher Ambassador</p>
                <p className={styles.passSchool}>Your referral code · ADEOLA24</p>
                <div className={styles.passStats}>
                  <div className={styles.passStat}>
                    <div className={styles.passStatNum}>64</div>
                    <div className={styles.passStatLabel}>Students signed up</div>
                  </div>
                  <div className={styles.passStat}>
                    <div className={styles.passStatNum}>18</div>
                    <div className={styles.passStatLabel}>Have subscribed</div>
                  </div>
                </div>
                <div className={styles.passEarn}>
                  <span className={styles.passEarnIcon}>₦</span>
                  You earn every time they pay
                </div>
              </div>
              <div className={styles.passFloat}>
                <span style={{ fontSize: 20 }}>🎉</span>
                <div>
                  <div className={styles.passFloatTitle}>A student subscribed</div>
                  <div className={styles.passFloatSub}>Credited to you</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What is ExamPrep A1 */}
        <section className={`${styles.section} ${styles.sectionDark}`}>
          <div className={styles.wrap}>
            <h2 className={styles.h2}>A gamified learning app for WAEC and JAMB</h2>
            <p className={styles.lead}>
              Students can practise normally, or battle the computer while answering real past questions.
              It works on any phone, straight from the browser.
            </p>

            <div className={styles.showcase}>
              <figure className={styles.shot}>
                <Phone shot={SCREENSHOTS.explanation}><ExplanationMock /></Phone>
                <figcaption className={styles.caption}>
                  <div className={styles.captionTitle}>Practise normally</div>
                  <div className={styles.captionText}>Real past questions with step-by-step explanations.</div>
                </figcaption>
              </figure>
              <figure className={styles.shot}>
                <Phone shot={SCREENSHOTS.battle}><BattleMock /></Phone>
                <figcaption className={styles.caption}>
                  <div className={styles.captionTitle}>Battle the computer</div>
                  <div className={styles.captionText}>Compete on actual past questions, game style.</div>
                </figcaption>
              </figure>
            </div>

            <ul className={styles.features}>
              {FEATURES.map(f => (
                <li key={f.title} className={styles.feature}>
                  <span className={styles.featureIcon} aria-hidden="true">{f.icon}</span>
                  <div>
                    <h3 className={styles.featureTitle}>{f.title}</h3>
                    <p className={styles.featureText}>{f.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* The program */}
        <section className={styles.section}>
          <div className={`${styles.wrap} ${styles.programGrid}`}>
            <div className={styles.programText}>
              <h2 className={styles.h2}>What is the Teacher Ambassador Program?</h2>
              <p>
                Recommend ExamPrep A1 to your students. They sign up with your referral link or code,
                and when they pay, you earn a percentage of their payment.
              </p>
              </div>
            <aside className={styles.earnCard}>
              <h3 className={styles.earnTitle}>What you earn</h3>
              <p className={styles.earnText}>
                A percentage of every payment made by a student you referred.
              </p>
              <ul className={styles.earnList}>
                <li><span className={styles.tick}>✓</span>Paid when students pay</li>
                <li><span className={styles.tick}>✓</span>No limit on how many students you can refer</li>
                <li><span className={styles.tick}>✓</span>Free to join, nothing to buy</li>
              </ul>
            </aside>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className={styles.section} style={{ paddingTop: 0 }}>
          <div className={styles.wrap}>
            <h2 className={styles.h2}>How it works</h2>
            <p className={styles.lead}>Four simple steps.</p>
            <ol className={styles.steps}>
              {STEPS.map((s, i) => (
                <li key={s.title} className={`${styles.step} ${i === STEPS.length - 1 ? styles.stepLast : ''}`}>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepText}>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Dashboard */}
        <section className={`${styles.section} ${styles.sectionWhite}`}>
          <div className={`${styles.wrap} ${styles.dashGrid}`}>
            <div>
              <h2 className={styles.h2}>Your own dashboard. Nothing hidden.</h2>
              <p className={styles.dashLead}>
                See who signed up with your link, who has subscribed, and what you have earned.
              </p>
            </div>
            <div>
              <AmbassadorDashMock />
              <p className={styles.dashNote}>Sample data, for illustration.</p>
            </div>
          </div>
        </section>

        {/* Who can apply */}
        <section className={styles.section} style={{ paddingBottom: 0 }}>
          <div className={`${styles.wrap} ${styles.whoGrid}`}>
            <div>
              <h2 className={styles.h2}>Who can apply?</h2>
              <p className={styles.whoNote}>
                No sales experience needed. You are recommending something that helps your students.
              </p>
            </div>
            <ul className={styles.whoList}>
              <li><span className={styles.tick}>✓</span>Teachers currently working in a Nigerian secondary school, public or private.</li>
              <li><span className={styles.tick}>✓</span>Anyone with a genuine working relationship with students preparing for WAEC or JAMB: lesson teachers, exam officers, heads of department, administrators.</li>
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className={styles.section}>
          <div className={styles.wrap}>
            <h2 className={styles.h2}>Questions teachers ask</h2>
            <p className={styles.lead}>Can’t find your answer? Message us on WhatsApp.</p>
            <div className={styles.faq}>
              {FAQS.map(f => (
                <details key={f.q} className={styles.faqItem}>
                  <summary>
                    {f.q}
                    <span className={styles.faqPlus} aria-hidden="true"><span>+</span></span>
                  </summary>
                  <div className={styles.faqAnswer}><p>{f.a}</p></div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Terms */}
        <section className={styles.section} style={{ paddingTop: 0 }}>
          <div className={styles.wrap}>
            <h2 className={styles.h2}>Program terms</h2>
            <p className={styles.lead}>A summary of the key terms. Selected ambassadors receive the full details.</p>
            <div className={styles.terms}>
              <ol className={styles.termsList}>
                {TERMS.map(t => <li key={t}>{t}</li>)}
              </ol>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className={styles.final}>
          <div className={styles.wrap}>
            <h2 className={styles.finalTitle}>Your students are already preparing. Help them prepare better.</h2>
            <p className={styles.finalText}>
              Apply in about three minutes. We review every application and reach out to the teachers we select.
            </p>
            <div className={styles.finalActions}>
              <ApplyButton />
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={`${styles.btn} ${styles.btnWhatsapp}`}>
                Ask a question on WhatsApp
              </a>
            </div>
            <p className={styles.finalNote}>By applying, you agree to the program terms above.</p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footerInner}`}>
          <span>© {new Date().getFullYear()} ExamPrep A1. Built for Nigerian secondary school students.</span>
          <a href="/">Go to ExamPrep A1</a>
        </div>
      </footer>
    </div>
  )
}

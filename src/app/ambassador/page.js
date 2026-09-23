// src/app/ambassador/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Teacher Ambassador Program — public info page.
//
// One link to share when anyone asks "how does the ambassador program work?"
// Explains the app, the program and the terms, then sends interested
// teachers to the Google Form. Responses land in Google Sheets.
//
// Server component: no client JS needed. The FAQ uses native <details>,
// buttons use CSS :active for the press effect. Metadata below controls the
// WhatsApp / social link preview.
//
// TO EDIT:
//   • GOOGLE_FORM_URL — paste the real form link
//   • SCREENSHOTS     — drop real screenshots into /public/images/ambassador/
//                       and set `image` to swap out the built-in mockups
// ─────────────────────────────────────────────────────────────────────────────

import styles from './ambassador.module.css'

// ── Links ─────────────────────────────────────────────────────────────────────
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeKMOeCcqMQB5Srt3iqfYPlbETgyoipbp7qRyIF3fLHm7g59g/viewform?usp=header'
const WHATSAPP_URL    = 'https://wa.me/2348166528437?text=Hi%2C%20I%20have%20a%20question%20about%20the%20ExamPrep%20A1%20Teacher%20Ambassador%20Program'
const PRICE_PER_YEAR  = '₦5,000'

export const metadata = {
  title:       'Teacher Ambassador Program | ExamPrep A1',
  description: 'Introduce ExamPrep A1 to your school and earn a percentage of every student subscription. Free to join. Schools pay nothing.',
  openGraph: {
    title:       'ExamPrep A1 Teacher Ambassador Program',
    description: 'Help your students pass WAEC and JAMB, and earn while you do it.',
    images:      ['/images/examprep_logo.png'],
    type:        'website',
  },
}

// ── Screenshots ───────────────────────────────────────────────────────────────
// Set `image` to a path in /public (e.g. '/images/ambassador/explanation.png')
// to show a real screenshot instead of the built-in mockup.
const SCREENSHOTS = {
  explanation: { image: null, alt: 'A past question with its step-by-step explanation' },
  battle:      { image: null, alt: 'Battle mode against the computer' },
  progress:    { image: null, alt: 'Student progress showing weak topics' },
}

const FEATURES = [
  { icon: '📚', title: 'Real WAEC and JAMB past questions', text: 'Organised by subject, topic and year, so students practise exactly what shows up in the exam.' },
  { icon: '💡', title: 'Explanations that teach',             text: 'Step-by-step working that explains the idea behind the answer, not just which option is right.' },
  { icon: '⏱',  title: 'Many ways to practise',               text: 'Topic practice, study mode, quick 5-question drills, timed speed rounds and full mock exams.' },
  { icon: '⚔️', title: 'Battle mode',                          text: 'Students go head-to-head against the computer on real exam questions. Revision that feels like a game.' },
  { icon: '🗂',  title: 'Daily challenges, flashcards, formulas', text: 'Short, regular revision that keeps students coming back every day.' },
  { icon: '📈', title: 'Progress and leaderboards',            text: 'Students see their weak topics and what to study next, and compete on school and national leaderboards.' },
]

const STEPS = [
  { title: 'Apply',                         text: 'Fill the short application form. It takes about three minutes.' },
  { title: 'We review and select',          text: 'We go through every application and reach out to selected ambassadors with the full details, including your commission rate.' },
  { title: 'Introduce ExamPrep A1 to your school', text: 'Tell your principal or school management about the app. We give you materials to share and can join a call or visit to present it with you.' },
  { title: 'The school comes on board',     text: 'Once the school approves, we set it up and students join with the school’s own code.' },
  { title: 'You earn',                      text: 'For every student from your school who pays for ExamPrep A1, you earn a percentage of their payment.' },
]

const FAQS = [
  {
    q: 'Do I need to pay anything to join?',
    a: 'No. Joining the program is completely free.',
  },
  {
    q: 'Does the school have to pay?',
    a: `No. The school only needs to approve ExamPrep A1 for its students. Students pay for the app themselves.`,
  },
  {
    q: 'How much will I earn?',
    a: 'You earn a percentage of every student subscription from the schools you bring on board. There is no limit: more paying students and more schools means more earnings. We share the exact rate with ambassadors once they are selected.',
  },
  {
    q: 'What happens after I fill the form?',
    a: 'Our team reviews every application. If you are selected, we contact you directly with the full program details and help you prepare to introduce ExamPrep A1 to your school.',
  },
  {
    q: 'How do you know which students came from my school?',
    a: 'Each school gets its own code, and students join through it. Every paying student linked to your school counts toward your earnings.',
  },
  {
    q: 'What if another teacher from my school also applies?',
    a: 'The first ambassador to register a school and get it approved is credited for that school.',
  },
  {
    q: 'Do I have to convince every student to pay?',
    a: 'No. Your role is to bring the school on board. You should never pressure students or parents to pay.',
  },
  {
    q: 'Can I introduce more than one school?',
    a: 'Yes. You earn from every school you bring on board.',
  },
  {
    q: 'Can I see how I’m doing?',
    a: 'Yes. We send you a regular summary of the students who have joined and paid from your school.',
  },
]

const TERMS = [
  'Ambassadors earn a percentage of payments actually received from students at schools they introduced and that ExamPrep A1 approved. The rate is shared with you when you are selected.',
  'A school counts as yours only after it is registered through your application and approved by ExamPrep A1. ExamPrep A1 may decline a school at its discretion.',
  'Submitting the application form does not guarantee selection as an ambassador.',
  'Refunded or reversed payments are removed from your earnings.',
  'You may not misrepresent ExamPrep A1, make promises on our behalf (such as guaranteed results or discounts we have not approved), or offer payments to school staff to win approval.',
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

function ProgressMock() {
  const subjects = [
    { icon: '📐', name: 'Mathematics', pct: 74, color: '#FFB800' },
    { icon: '⚗️', name: 'Chemistry',   pct: 58, color: '#9b7ae0' },
    { icon: '🧬', name: 'Biology',     pct: 81, color: '#4ade80' },
  ]
  return (
    <div className={`${styles.screen} ${styles.mDark}`} role="img" aria-label={SCREENSHOTS.progress.alt}>
      <div>
        <div className={styles.mHello}>Good evening, Tolu</div>
        <div className={styles.mHelloSub}>WAEC 2027 · 3 subjects</div>
      </div>
      <div className={styles.mStreak}>
        <div><strong>🔥 9</strong>day streak</div>
        <div><strong>✦ 1,240</strong>XP</div>
      </div>
      {subjects.map(s => (
        <div key={s.name} className={styles.mSubj}>
          <span>{s.icon}</span>
          <span className={styles.mSubjName}>{s.name}</span>
          <span className={styles.mSubjBar}><span style={{ width: `${s.pct}%`, background: s.color }} /></span>
          <span className={styles.mSubjPct} style={{ color: s.color }}>{s.pct}%</span>
        </div>
      ))}
      <div className={styles.mWeakTitle}>Work on these next</div>
      <div>
        <span className={styles.mWeak}>Mole concept</span>
        <span className={styles.mWeak}>Quadratic equations</span>
        <span className={styles.mWeak}>Electrolysis</span>
      </div>
    </div>
  )
}

function SchoolDashMock() {
  const weak = [
    { t: 'Mole concept',          p: 38 },
    { t: 'Logarithms',            p: 44 },
    { t: 'Genetics',              p: 51 },
    { t: 'Electromagnetic induction', p: 55 },
  ]
  return (
    <div className={styles.dash} role="img" aria-label="School dashboard showing topics the class is struggling with">
      <div className={styles.dashHead}>
        <span className={styles.dashTitle}>SS3 overview</span>
        <span className={styles.dashMeta}>This week</span>
      </div>
      <div className={styles.dashKpis}>
        <div className={styles.dashKpi}><div className={styles.dashKpiNum}>142</div><div className={styles.dashKpiLabel}>Active students</div></div>
        <div className={styles.dashKpi}><div className={styles.dashKpiNum}>6,380</div><div className={styles.dashKpiLabel}>Questions answered</div></div>
        <div className={styles.dashKpi}><div className={styles.dashKpiNum} style={{ color: '#059669' }}>+12%</div><div className={styles.dashKpiLabel}>Average score</div></div>
      </div>
      <div className={styles.dashSub}>Topics your class is struggling with</div>
      {weak.map(w => (
        <div key={w.t} className={styles.dashRow}>
          <span>{w.t}</span>
          <span className={styles.dashTrack}><span style={{ width: `${w.p}%` }} /></span>
          <span className={styles.dashPct}>{w.p}%</span>
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
              <h1 className={styles.heroTitle}>Help your students pass WAEC and JAMB, and earn while you do it.</h1>
              <p className={styles.heroSub}>
                Join the ExamPrep A1 Teacher Ambassador Program. Introduce ExamPrep A1 to your school,
                and earn a percentage of every student subscription that comes from your school.
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
                <p className={styles.passSchool}>Your school · WAEC &amp; JAMB</p>
                <div className={styles.passStats}>
                  <div className={styles.passStat}>
                    <div className={styles.passStatNum}>128</div>
                    <div className={styles.passStatLabel}>Students joined</div>
                  </div>
                  <div className={styles.passStat}>
                    <div className={styles.passStatNum}>96</div>
                    <div className={styles.passStatLabel}>Paid this year</div>
                  </div>
                </div>
                <div className={styles.passEarn}>
                  <span className={styles.passEarnIcon}>₦</span>
                  You earn on every student who pays
                </div>
              </div>
              <div className={styles.passFloat}>
                <span style={{ fontSize: 20 }}>🏫</span>
                <div>
                  <div className={styles.passFloatTitle}>School approved</div>
                  <div className={styles.passFloatSub}>Students can now join</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What is ExamPrep A1 */}
        <section className={`${styles.section} ${styles.sectionDark}`}>
          <div className={styles.wrap}>
            <h2 className={styles.h2}>What is ExamPrep A1?</h2>
            <p className={styles.lead}>
              ExamPrep A1 is a study app built for Nigerian secondary school students preparing for WAEC and JAMB.
              Students don’t just read past questions. They practise them, understand them, and see exactly
              where they are weak. It works on any phone, straight from the browser.
            </p>

            <div className={styles.showcase}>
              <figure className={styles.shot}>
                <Phone shot={SCREENSHOTS.explanation}><ExplanationMock /></Phone>
                <figcaption className={styles.caption}>
                  <div className={styles.captionTitle}>Every answer explained</div>
                  <div className={styles.captionText}>Step-by-step, including why the wrong options are wrong.</div>
                </figcaption>
              </figure>
              <figure className={styles.shot}>
                <Phone shot={SCREENSHOTS.battle}><BattleMock /></Phone>
                <figcaption className={styles.caption}>
                  <div className={styles.captionTitle}>Revision that feels like a game</div>
                  <div className={styles.captionText}>Timed battles against the computer on real questions.</div>
                </figcaption>
              </figure>
              <figure className={styles.shot}>
                <Phone shot={SCREENSHOTS.progress}><ProgressMock /></Phone>
                <figcaption className={styles.caption}>
                  <div className={styles.captionTitle}>Students know what to study next</div>
                  <div className={styles.captionText}>Progress by subject, with weak topics called out.</div>
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

            <div className={styles.schoolBlock}>
              <div>
                <h3 className={styles.schoolTitle}>Schools and teachers get a dashboard too</h3>
                <p className={styles.schoolText}>
                  The school dashboard shows which topics students are collectively struggling with,
                  how each class is performing week by week, and how engaged each student is.
                  Parents can also receive weekly progress reports by email.
                </p>
              </div>
              <SchoolDashMock />
            </div>
          </div>
        </section>

        {/* The program */}
        <section className={styles.section}>
          <div className={`${styles.wrap} ${styles.programGrid}`}>
            <div className={styles.programText}>
              <h2 className={styles.h2}>What is the Teacher Ambassador Program?</h2>
              <p>
                Teachers know their schools better than anyone. You know the principal, you know the students,
                and you know how hard they work for these exams.
              </p>
              <p>
                The Teacher Ambassador Program lets you bring ExamPrep A1 to your school and get rewarded for it.
                You introduce the app to your school’s management. Once the school approves it and students
                start using it, you earn a percentage of every student subscription from that school.
              </p>
            </div>
            <aside className={styles.earnCard}>
              <h3 className={styles.earnTitle}>What you earn</h3>
              <p className={styles.earnText}>
                A percentage of every student who pays for ExamPrep A1 at the schools you bring on board.
                We share the exact rate with ambassadors once they are selected.
              </p>
              <ul className={styles.earnList}>
                <li><span className={styles.tick}>✓</span>No limit on how much you can earn</li>
                <li><span className={styles.tick}>✓</span>Bring more than one school and earn from each</li>
                <li><span className={styles.tick}>✓</span>Free to join, nothing to buy</li>
              </ul>
            </aside>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className={styles.section} style={{ paddingTop: 0 }}>
          <div className={styles.wrap}>
            <h2 className={styles.h2}>How it works</h2>
            <p className={styles.lead}>Five steps from applying to earning.</p>
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

        {/* Who can apply */}
        <section className={`${styles.section} ${styles.sectionWhite}`}>
          <div className={`${styles.wrap} ${styles.whoGrid}`}>
            <div>
              <h2 className={styles.h2}>Who can apply?</h2>
              <p className={styles.whoNote}>
                No sales experience is needed. You are recommending something that helps your students.
              </p>
            </div>
            <ul className={styles.whoList}>
              <li><span className={styles.tick}>✓</span>Teachers currently working in a Nigerian secondary school, public or private.</li>
              <li><span className={styles.tick}>✓</span>Anyone with a genuine working relationship with a school: administrators, exam officers, heads of department, lesson teachers.</li>
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
              Apply in about three minutes. We review every application and contact selected ambassadors directly.
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
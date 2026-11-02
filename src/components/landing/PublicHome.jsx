import Image from 'next/image'
import Link from 'next/link'
import PublicNav from './PublicNav'
import PublicFooter from './PublicFooter'
import { SCHOOL_PARTNERSHIP_URL } from '@/lib/contact'
import s from './publicWebsite.module.css'

const START = '/download'
const FAQS = [
  ['Which exams can I practise for?', 'ExamPrep A1 supports WAEC and JAMB past-question practice. Choose your exam, subject and practice mode in the app.'],
  ['Can I use it offline?', 'You can start practising online in your browser today. Downloadable past questions and lessons are part of the native app experience being prepared; a public download is not available on this website yet.'],
  ['Can I battle the computer or a friend?', 'Computer battles are available in the browser app. Friend battles are still being prepared for public launch, so there is no public live-match action on this page yet.'],
  ['How does school mode work?', 'The desktop school experience is designed for learners to take turns on one computer. Its analytics describe activity on that computer, not distinct learners or combined activity across the school. Public desktop download and activation availability will be confirmed before release.'],
  ['Which platforms are available?', 'Use the browser app on your phone, tablet or computer now. The Android APK and desktop app are being prepared. There are no public app-store or installer links here yet.'],
]

export function PracticePreview({ small = false }) {
  return <div className={`${s.quiz} ${small ? s.smallQuiz : ''}`}>
    <div className={s.previewTop}><span>JAMB · Chemistry</span><span>Practice preview</span></div>
    <p className={s.question}>Which formula represents water?</p>
    <div className={s.answers}><span><b>A</b> NaCl</span><span className={s.correct}><b>B</b> H₂O <i aria-hidden="true">✓</i></span><span><b>C</b> CO₂</span></div>
    {!small && <p className={s.answerNote}>Understand the answer: water contains two hydrogen atoms and one oxygen atom.</p>}
  </div>
}

export default function PublicHome() {
  return <div className={s.site}>
    <PublicNav home />
    <main id="main-content" className={s.outcomeHome}>
      <div className={s.heroBackdrop}>
      <section className={`${s.wrap} ${s.hero} ${s.outcomeHero}`} aria-labelledby="hero-title">
        <div className={s.heroCopy}>
          <p className={s.eyebrow}>YOUR JAMB GOAL. YOUR NEXT STEP.</p>
          <h1 id="hero-title">Walk into JAMB <span className={s.highlight}>better prepared.</span></h1>
          <p className={s.heroBody}>Dreaming of 300+? Turn that ambition into regular practice that builds understanding, speed and confidence—for JAMB and WAEC.</p>
          <div className={s.actions}><Link href={START} className={s.button}>Start practising <span aria-hidden="true">↗</span></Link><a href="#practice" className={s.secondary}>Explore the app <span aria-hidden="true">↓</span></a></div>
          <p className={s.supporting}>Learn it. Practise it. Go in with more confidence.</p>
        </div>
        <div className={`${s.heroArt} ${s.goalArt}`}>
          <div className={s.goalSticker}><span>YOUR GOAL</span><strong>300<span>+</span></strong><p>in JAMB? Let’s work towards it.</p></div>
          <Image className={s.zara} src="/images/website/zara-portrait.webp" alt="Zara cheering you on as you work towards your exam goal" width={411} height={450} sizes="(max-width: 767px) 45vw, 275px" priority />
          <div className={s.heroQuiz}><PracticePreview small /></div>
          <div className={s.practiceLoop}><span>Try</span><b aria-hidden="true">→</b><span>Understand</span><b aria-hidden="true">→</b><span>Improve</span></div>
          <span className={s.artCaption}>Illustrative practice preview</span>
        </div>
      </section>
      <div className={`${s.wrap} ${s.outcomeStrip}`} aria-label="What you are working towards"><span><b>01</b> Understand more</span><span><b>02</b> Answer with confidence</span><span><b>03</b> Build exam readiness</span></div>
      </div>

      <section id="practice" className={`${s.section} ${s.practiceSection}`} aria-labelledby="practice-title">
        <div className={`${s.wrap} ${s.practiceGrid}`}>
          <div>
            <p className={s.eyebrow}>GIVE YOUR GOAL A ROUTINE</p>
            <h2 id="practice-title">Make “I don’t get it” your next breakthrough.</h2>
            <p className={s.intro}>Better preparation starts with knowing what to work on. Use past questions to find the gaps, then practise at a pace you can keep.</p>
            <ul className={s.practiceChoices}>
              <li><span className={s.choiceIcon} aria-hidden="true">◎</span><div><h3>Turn weak topics into stronger ones</h3><p>Focus your topic practice on the ideas that need more work.</p></div></li>
              <li><span className={s.choiceIcon} aria-hidden="true">ϟ</span><div><h3>Make a little progress, more often</h3><p>Quick sessions and weekly challenges give you a reason to keep practising.</p></div></li>
              <li><span className={s.choiceIcon} aria-hidden="true">◷</span><div><h3>Get familiar with the pressure</h3><p>Use timed mocks to rehearse your pace before exam day.</p></div></li>
            </ul>
            <Link href={START} className={s.textLink}>Take the next step towards your goal <span aria-hidden="true">→</span></Link>
          </div>
          <figure className={s.setupFigure}>
            <div className={s.setupHeading}><span>YOUR SESSION, YOUR PACE</span><strong>How do you want to practise?</strong><p>Review at the end, or learn as you go.</p></div>
            <Image src="/images/website/session-type.webp" width={351} height={194} sizes="(max-width: 767px) 85vw, 420px" alt="App session setup showing Practice and Study choices: answer at your pace and review everything at the end" />
            <figcaption>App session setup preview</figcaption>
          </figure>
        </div>
      </section>

      <section id="battles" className={`${s.wrap} ${s.section}`} aria-labelledby="battles-title">
        <div className={s.sectionHeading}><p className={s.eyebrow}>WHEN PRACTICE FEELS LIKE PLAY</p><h2 id="battles-title">Make practice something to look forward to.</h2><p className={s.intro}>A battle gives you a reason to try again. Keep learning while you test your focus and pace.</p></div>
        <div className={s.battleGrid}>
          <article className={`${s.battlePanel} ${s.computer}`}>
            <div><p className={s.panelLabel}>BATTLE THE COMPUTER</p><h3>Think quicker. Stay focused.</h3><p>Turn past questions into a race against the computer—and practise thinking under pressure.</p></div>
            <div className={s.computerArt}><Image src="/images/website/robot.webp" width={500} height={433} alt="The ExamPrep computer battle robot" sizes="(max-width: 767px) 150px, 190px" /><div className={s.sampleRound}><span>Sample quiz round</span><strong>What is 12 × 8?</strong><b>96</b></div></div>
            <Link href={START} className={s.panelAction}>Make your next practice a battle <span aria-hidden="true">→</span></Link>
          </article>
          <article className={`${s.battlePanel} ${s.friends}`}>
            <div><p className={s.panelLabel}>BATTLE WITH FRIENDS</p><h3>Bring a friend. Find your spark.</h3><p>A little friendly competition can make showing up for practice feel more exciting.</p><span className={s.status}>Live friend battles · Coming soon</span></div>
            <div className={s.friendArt}><div><Image src="/images/website/zara-portrait.webp" width={411} height={450} alt="" sizes="170px" /><span>You</span></div><b>VS</b><div><Image src="/images/website/friend.webp" width={480} height={480} alt="" sizes="170px" /><span>A friend</span></div></div>
            <Link href={START} className={s.panelAction}>Explore the app <span aria-hidden="true">→</span></Link>
          </article>
        </div>
      </section>

      <section id="lessons" className={`${s.section} ${s.lessonSection}`} aria-labelledby="lessons-title">
        <div className={`${s.wrap} ${s.split}`}>
          <div><Image src="/images/website/book.svg" width={52} height={52} alt="" /><p className={s.eyebrow}>BEYOND MEMORISING THE ANSWER</p><h2 id="lessons-title">Know why it’s right. Be ready for the next one.</h2><p className={s.intro}>A familiar answer is a start. Understanding the idea helps you face a different question with more confidence. Learn, check your understanding and try again.</p><p className={s.note}>Explore learning tools in your browser now. Focused lessons and offline lesson downloads are being prepared in the native app.</p><Link href={START} className={s.textLink}>Build your understanding <span aria-hidden="true">→</span></Link></div>
          <figure className={s.lessonFigure}><div className={s.figureBar}><span>Chemistry</span><strong>Acids, bases &amp; indicators</strong></div><Image src="/images/website/lesson.webp" width={715} height={355} sizes="(max-width: 767px) 92vw, 560px" alt="Lesson preview explaining indicator colour changes: litmus turns red in acids and blue in bases" /><figcaption>Native app lesson preview</figcaption></figure>
        </div>
      </section>

      <section className={`${s.wrap} ${s.section} ${s.split}`} aria-labelledby="rewards-title">
        <div><p className={s.eyebrow}>KEEP YOUR GOAL IN SIGHT</p><h2 id="rewards-title">See your effort. Keep your momentum.</h2><p className={s.intro}>It’s easier to keep going when you can see the work you’ve put in. Follow your progress, build XP and find a little motivation on the leaderboard.</p><p className={s.note}>Your real goal is exam readiness. The rewards help make the journey worth coming back to.</p><Link href={START} className={s.textLink}>Build your practice habit <span aria-hidden="true">→</span></Link></div>
        <div className={s.rewardsPreview}>
          <div className={s.rewardsHeader}><Image src="/images/website/trophy.webp" width={53} height={51} alt="" /><div><strong>A little friendly competition</strong><p>Example leaderboard · illustrative data</p></div></div>
          <ol className={s.exampleBoard} aria-label="Illustrative leaderboard, not live rankings"><li><span className={s.rank}>1</span><span>Learner A</span><b>720 XP</b></li><li><span className={s.rank}>2</span><span>Learner B</span><b>640 XP</b></li><li><span className={s.rank}>3</span><span>Learner C</span><b>580 XP</b></li></ol>
          <p className={s.exampleNote}>Your own progress starts with your own practice.</p>
        </div>
      </section>

      <section id="schools" className={`${s.section} ${s.schoolSection}`} aria-labelledby="schools-title"><div className={`${s.wrap} ${s.split}`}>
        <div><p className={s.eyebrow}>THE SAME GOAL. A SHARED SPACE.</p><h2 id="schools-title">Help your students feel more prepared.</h2><p className={s.intro}>Bring engaging JAMB and WAEC practice into your school. Let learners take turns, strengthen their understanding and get more comfortable with exam questions.</p><p className={s.note}>Review practice activity on each computer. School reports are local to that computer; they do not identify individual learners or combine devices.</p><Link href="/schools" className={s.button}>Explore school practice <span aria-hidden="true">→</span></Link></div>
        <figure className={s.schoolFigure}><Image src="/images/website/school-home.webp" width={1280} height={960} sizes="(max-width: 767px) 92vw, 560px" alt="Desktop school mode preview with shared practice, computer battles and recent practice history" /><figcaption>Desktop app preview · example school · public release being prepared</figcaption></figure>
      </div></section>

      <section className={`${s.wrap} ${s.partnership}`} aria-labelledby="partnership-title"><div><p className={s.eyebrow}>LET’S PREPARE THEM TOGETHER</p><h2 id="partnership-title">Your students have big goals. Let’s help them prepare.</h2><p>We’re partnering with selected schools to support stronger preparation for JAMB and WAEC through consistent, engaging practice.</p><a href={SCHOOL_PARTNERSHIP_URL} className={s.button}>Contact the team <span aria-hidden="true">↗</span></a><span className={s.contactHint}>Talk to us on WhatsApp about a school partnership.</span></div><div className={s.partnershipArt}><Image src="/images/website/friend.webp" width={480} height={480} sizes="(max-width:767px) 200px, 320px" alt="A student focused on learning with books and practice" /><span>More practice.<br />Stronger preparation.</span></div></section>

      <section className={`${s.wrap} ${s.section} ${s.faqSection}`} aria-labelledby="faq-title"><div><p className={s.eyebrow}>A FEW USEFUL ANSWERS</p><h2 id="faq-title">Before you get started.</h2></div><dl className={s.faq}>{FAQS.map(([q,a]) => <div key={q}><dt>{q}</dt><dd>{a}</dd></div>)}</dl></section>
      <section className={s.final}><div className={s.wrap}><p className={s.eyebrow}>BIG GOALS START WITH A NEXT STEP</p><h2>Your goal is big. Start with one session.</h2><p className={s.finalPitch}>Give yourself more chances to understand, improve and feel ready.</p><Link href={START} className={s.button}>Start practising <span aria-hidden="true">→</span></Link><p>Choose Android or web · Browser practice available now</p></div></section>
    </main>
    <PublicFooter />
  </div>
}

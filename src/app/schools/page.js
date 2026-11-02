import Image from 'next/image'
import Link from 'next/link'
import PublicNav from '@/components/landing/PublicNav'
import PublicFooter from '@/components/landing/PublicFooter'
import { SCHOOL_PARTNERSHIP_URL } from '@/lib/contact'
import { publicMetadata } from '@/lib/publicWebsite'
import s from '@/components/landing/publicWebsite.module.css'

export const metadata = publicMetadata({ title: 'ExamPrep A1 for Schools | Better prepared for JAMB & WAEC', description: 'Help your students build understanding and exam confidence through engaging JAMB and WAEC practice. Talk to us about a selected-school partnership.', path: '/schools' })

export default function SchoolsPage() {
  return <div className={s.site}>
    <PublicNav />
    <main id="main-content">
      <section className={`${s.wrap} ${s.schoolHero}`}>
        <p className={s.eyebrow}>EXAMPREP A1 FOR SCHOOLS</p>
        <h1>Big goals for your students. Better preparation, together.</h1>
        <p className={s.intro}>Help your students approach JAMB and WAEC with stronger understanding and more confidence. Bring regular, engaging practice into their school day.</p>
        <p className={s.note}>The desktop school experience is being prepared for public release. The images below show the current app design with example data.</p>
        <div className={s.actions}><a href={SCHOOL_PARTNERSHIP_URL} className={s.button}>Discuss a school partnership</a><Link href="/download" className={s.secondary}>Explore student practice →</Link></div>
        <div className={s.schoolGallery}>
          <figure className={s.schoolFigure}><Image src="/images/website/school-home.webp" width={1280} height={960} alt="School app preview with shared practice and computer battle entry points" sizes="(max-width: 767px) 92vw, 560px" priority /><figcaption>Shared school home · example school</figcaption></figure>
          <figure className={s.schoolFigure}><Image src="/images/website/school-analytics.webp" width={1280} height={1100} alt="School topic analytics preview showing activity on one shared computer" sizes="(max-width: 767px) 92vw, 560px" /><figcaption>Topic analytics · illustrative local activity</figcaption></figure>
        </div>
      </section>
      <section className={`${s.section} ${s.practiceSection}`}><div className={`${s.wrap} ${s.split}`}>
        <div><p className={s.eyebrow}>MAKE PREPARATION PART OF THE ROUTINE</p><h2>More chances to practise. More chances to understand.</h2><p className={s.intro}>Give learners a space to work through exam questions, learn from mistakes and try again.</p></div>
        <div className={s.schoolFacts}>
          <div><h3>Build familiarity with exam questions</h3><p>Learners take turns practising past questions and playing computer battles on shared computers.</p></div>
          <div><h3>See what needs more practice</h3><p>Review topic-level activity on each computer to guide further practice. Session counts are not distinct learners, and reports do not combine devices.</p></div>
          <div><h3>Plan the right next step</h3><p>Talk with our team about availability and what fits your school. Public desktop downloads and activation are still being prepared.</p></div>
        </div>
      </div></section>
      <section className={`${s.wrap} ${s.partnership}`}><div><p className={s.eyebrow}>SELECTED-SCHOOL PARTNERSHIPS</p><h2>Let’s work towards your students’ goals.</h2><p>We’re partnering with selected schools to support stronger preparation for JAMB and WAEC. Tell us about your students and the goals you’re working towards.</p><a href={SCHOOL_PARTNERSHIP_URL} className={s.button}>Contact the team <span aria-hidden="true">↗</span></a><span className={s.contactHint}>Start the conversation on WhatsApp.</span></div><div className={s.partnershipArt}><Image src="/images/website/friend.webp" width={480} height={480} alt="A student focused on learning" sizes="(max-width:767px) 160px, 320px" /><span>Stronger preparation.<br />Shared ambition.</span></div></section>
      <p className={`${s.wrap} ${s.downloadSignin}`}>Already using the existing web school portal? <Link href="/school-login">School sign in</Link></p>
    </main>
    <PublicFooter />
  </div>
}

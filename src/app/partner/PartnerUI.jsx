import Link from 'next/link'
import { whatsappLink } from '@/lib/contact'
import s from './partner.module.css'
import Zara from '@/components/onboarding/Zara'

export const partnerSupport = whatsappLink('Hi, I need help with my ExamPrep A1 Teacher Ambassador account.')

export function PartnerBrand() {
  return <Link href="/ambassador" className={s.brand}><span className={s.brandMark}>E</span><span>ExamPrep A1<small className={s.brandCaption}>Teacher Ambassador</small></span></Link>
}

export function PartnerIcon({ name }) {
  const paths = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    referrals: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2" /></>,
    students: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5" /></>,
    support: <><path d="M21 11a9 9 0 0 1-9 9H4l-1 1v-9a9 9 0 0 1 18-1Z" /><path d="M8 10h8M8 14h5" /></>,
  }
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export function PartnerAuthFrame({ children }) {
  return <div className={s.page}><div className={s.authShell}>
    <aside className={s.authStory}>
      <PartnerBrand />
      <div className={s.storyBody}>
        <span className={s.storyBadge}>GOOD TEACHERS. GREATER POSSIBILITIES.</span>
        <h2>Help your students<br />go further.</h2>
        <p>Bring your classroom to ExamPrep A1. Give your students a place to practise, build confidence, and prepare for WAEC and JAMB.</p>
        <div className={s.storySteps}>
          <div><PartnerIcon name="referrals" /><span><strong>Your link, your community</strong>Share one personal referral link with your students.</span></div>
          <div><PartnerIcon name="students" /><span><strong>See your impact</strong>Follow signups and subscriptions in one place.</span></div>
          <div><PartnerIcon name="overview" /><span><strong>Earn as they progress</strong>Earn commission on their first paid subscription.</span></div>
        </div>
      </div>
      <span className={s.storyFoot}>A little encouragement can change a student’s future.</span>
    </aside>
    <main className={s.authMain}>
      <div className={s.mobileBrand}><PartnerBrand /></div>
      <div className={s.authGreeting}><Zara size={76} /><div className={s.authBubble}><strong>A little support. A bigger impact.</strong><p>Welcome, teacher. Let’s help your students go further.</p></div></div>
      {children}
      <p className={s.authHelp}>Need a hand? <a href={partnerSupport} target="_blank" rel="noopener noreferrer">Chat with us on WhatsApp ↗</a></p>
    </main>
  </div></div>
}

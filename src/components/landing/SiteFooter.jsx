// src/components/landing/SiteFooter.jsx
import Link from 'next/link'
import s from './landing.module.css'

export default function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.wrap}>
        <div className={s.footerGrid}>
          <div>
            <Link href="/" className={s.brand}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/examprep_logo.png" alt="" width={30} height={30} />
              <span>ExamPrep <span className={s.brandA1}>A1</span></span>
            </Link>
            <p className={s.footerAbout}>Fun, focused WAEC and JAMB practice for Nigerian secondary school students.</p>
          </div>
          <div className={s.footerCol}>
            <p className={s.footerHead}>Students</p>
            <Link href="/onboarding?mode=signup">Start free trial</Link>
            <Link href="/onboarding?mode=signin">Sign in</Link>
          </div>
          <div className={s.footerCol}>
            <p className={s.footerHead}>Schools</p>
            <Link href="/schools">For schools</Link>
            <Link href="/demo">See a demo</Link>
            <Link href="/school-signup">Get started</Link>
            <Link href="/school-login">School sign in</Link>
          </div>
          <div className={s.footerCol}>
            <p className={s.footerHead}>Contact</p>
            <a href="mailto:schools@examprep.ng">schools@examprep.ng</a>
          </div>
        </div>
        <div className={s.footerBase}>
          <span>© {new Date().getFullYear()} ExamPrep A1</span>
          <span>Built for Nigerian secondary school students</span>
        </div>
      </div>
    </footer>
  )
}
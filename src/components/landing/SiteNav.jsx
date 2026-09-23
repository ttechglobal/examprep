'use client'
// src/components/landing/SiteNav.jsx
// Sticky nav for the marketing pages. Students / Schools are real links
// ( / and /schools ), so each audience has its own shareable URL.
// Theme toggle uses the app-wide ThemeContext, so it controls the same
// setting as the student app instead of a separate copy.

import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'
import InstallButton from './InstallButton'
import s from './landing.module.css'

export default function SiteNav({ audience = 'students' }) {
  const { toggle } = useTheme()
  const isSchools = audience === 'schools'

  return (
    <header className={s.nav}>
      <div className={`${s.wrap} ${s.navInner}`}>
        <Link href="/" className={s.brand} aria-label="ExamPrep A1 home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/examprep_logo.png" alt="" width={32} height={32} />
          <span className={s.brandText}>ExamPrep <span className={s.brandA1}>A1</span></span>
        </Link>

        <nav className={s.audience} aria-label="Choose audience">
          <Link href="/" aria-current={!isSchools ? 'page' : undefined}>Students</Link>
          <Link href="/schools" aria-current={isSchools ? 'page' : undefined}>Schools</Link>
        </nav>

        <div className={s.navRight}>
          <Link href={isSchools ? '/school-login' : '/onboarding?mode=signin'} className={`${s.navLink} ${s.desktopOnly}`}>Sign in</Link>
          <button type="button" className={s.themeBtn} onClick={toggle} aria-label="Switch between light and dark theme">
            <span className={s.iconMoon} aria-hidden="true">🌙</span>
            <span className={s.iconSun} aria-hidden="true">☀️</span>
          </button>
          {isSchools
            ? <Link href="/school-signup" className={`${s.btn} ${s.btnBlue} ${s.btnSm} ${s.desktopOnly}`}>Get started</Link>
            : <InstallButton label="Install" variant="blue" size="sm" className={s.desktopOnly} />}
        </div>
      </div>
    </header>
  )
}
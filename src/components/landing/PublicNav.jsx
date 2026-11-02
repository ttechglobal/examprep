'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef } from 'react'
import s from './publicWebsite.module.css'

export default function PublicNav({ start = '/download', home = false }) {
  const menu = useRef(null)
  const links = [['Practice', '/#practice'], ['Battles', '/#battles'], ['Lessons', '/#lessons'], ['For schools', '/schools']]
  function closeMenu() { if (menu.current) menu.current.open = false }
  return <header className={s.header}>
    <a href="#main-content" className={s.skip}>Skip to content</a>
    <div className={`${s.wrap} ${s.navInner}`}>
      <Link href="/" className={s.brand} aria-label="ExamPrep A1 home">
        <Image src="/images/website/logo.webp" width={40} height={40} alt="" priority />
        <span>ExamPrep <b>A1</b></span>
      </Link>
      <nav className={s.desktopNav} aria-label="Main navigation">
        {links.map(([label, href]) => <Link href={home && href.startsWith('/#') ? href.slice(1) : href} key={label}>{label}</Link>)}
      </nav>
      <div className={s.navActions}><Link href="/onboarding?mode=signin">Sign in</Link><Link href={start} className={s.button}>Start practising</Link></div>
      <details ref={menu} className={s.mobileMenu} onKeyDown={event => {
        if (event.key === 'Escape') { closeMenu(); menu.current?.querySelector('summary')?.focus() }
      }}>
        <summary>Menu <span aria-hidden="true">☰</span></summary>
        <nav aria-label="Mobile navigation">
          {links.map(([label, href]) => <Link href={home && href.startsWith('/#') ? href.slice(1) : href} onClick={closeMenu} key={label}>{label}</Link>)}
          <Link href="/onboarding?mode=signin" onClick={closeMenu}>Sign in</Link>
          <Link href={start} className={s.button} onClick={closeMenu}>Start practising</Link>
        </nav>
      </details>
    </div>
  </header>
}

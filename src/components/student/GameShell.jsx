'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePoints } from '@/contexts/PointsContext'
import { getRankProgress } from '@/lib/ranks'
import { useStudentActivity } from '@/hooks/useStudentActivity'
import IllustratedIcon from '@/components/battle/IllustratedIcon'
import { readBattlePreferences } from '@/lib/battlePreferences'
import { gameFonts } from './gameFonts'
import s from './GameShell.module.css'

const NAV = [
  ['home','Home','/student/home','home'],
  ['practice','Practice','/student/practice','practice'],
  ['battle','Battle','/student/battle','battle'],
  ['mock','Mock','/student/practice/mock','mock'],
  ['flashcards','Flashcards','/student/learn/flashcards','cards'],
  ['progress','Progress','/student/progress','chart'],
  ['learn','Learn','/student/learn','book'],
  ['leaderboard','Leaderboard','/student/leaderboard','trophy'],
]

export function GameGlyph({ name, size = 28 }) {
  const paths = {
    home: <><path d="m3 11 9-8 9 8v10h-6v-7H9v7H3Z"/></>,
    practice: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m12 1 2 3M23 12l-3 2M12 23l-2-3M1 12l3-2"/></>,
    battle: <><path d="m4 3 6 2 10 13-3 3L5 8Zm16 0-6 2L4 18l3 3L19 8Z"/><path d="m2 16 6 6m8-6 6 6"/></>,
    mock: <><rect x="4" y="3" width="16" height="19" rx="3"/><path d="m8 12 3 3 6-7"/></>,
    cards: <><rect x="3" y="5" width="13" height="16" rx="2"/><path d="M9 2h12v16M7 10h5m-5 4h3"/></>,
    chart: <><path d="M4 21V12h4v9m3 0V8h4v13m3 0V4h4v17M3 8l6-5 5 2 7-4"/></>,
    book: <><path d="M12 5C8 2 3 3 2 4v16c3-2 7-1 10 1 3-2 7-3 10-1V4c-3-2-7-1-10 1Zm0 0v16"/></>,
    trophy: <><path d="M7 3h10v8a5 5 0 0 1-10 0Zm0 2H3v4c0 3 2 4 5 4m9-8h4v4c0 3-2 4-5 4m-4 3v5m-5 1h10"/></>,
    settings: <><path d="m10 2 4 0 1 4 4-1 2 4-3 3 3 3-2 4-4-1-1 4h-4l-1-4-4 1-2-4 3-3-3-3 2-4 4 1Z"/><circle cx="12" cy="12" r="3"/></>,
    menu: <path d="M4 5h16M4 12h16M4 19h16"/>,
    sound: <><path d="M3 9h4l5-5v16l-5-5H3Z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
    flag: <><path d="M5 22V3m0 0c5-4 9 4 15 0v11c-6 4-10-4-15 0"/></>,
    send: <><path d="m2 10 20-8-8 20-4-8Zm8 4L22 2"/></>,
    arrow: <path d="m8 4 8 8-8 8"/>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={name === 'menu' || name === 'arrow' ? 'none' : 'currentColor'} fillOpacity=".12" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">{paths[name] ?? paths.book}</svg>
}

export function GameLogo({ className = '' }) {
  return <Image className={`${s.logo} ${className}`} src="/images/battle/design/logo.png" alt="ExamPrep A1" width={360} height={120} priority/>
}

export function PlayerStats({ profile }) {
  const { totalPoints } = usePoints()
  const { tier, rank, pct } = getRankProgress(totalPoints || 0)
  const { stats } = useStudentActivity('week', { userId: profile?.id, isGuest: !profile?.id || profile?.isGuest, ready: !!profile })
  const tierLevel = Math.max(1, rank - tier.min + 1)
  const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X'][tierLevel - 1] ?? tierLevel
  return <div className={s.stats} aria-label="Your progress">
    <div className={s.stat}><IllustratedIcon name="xp" size={26}/><strong>{(totalPoints || 0).toLocaleString()} <small>XP</small></strong></div>
    <div className={`${s.stat} ${s.rank}`}><IllustratedIcon name="shield" size={36}/><div><strong>{tier.tier} {roman}</strong><div className={s.rankTrack}><span style={{width:`${pct}%`}}/></div></div></div>
    <div className={s.stat}><IllustratedIcon name="flame" size={30}/><div><strong>{stats.streak ?? 0}</strong><small>Day Streak</small></div></div>
  </div>
}

export default function GameShell({ children, profile, immersive = false }) {
  const [drawer, setDrawer] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const path = usePathname()
  useEffect(() => {
    const update = () => setReducedMotion(readBattlePreferences().reducedMotion)
    const frame = requestAnimationFrame(update)
    window.addEventListener('battle-preferences-change',update)
    return () => {cancelAnimationFrame(frame);window.removeEventListener('battle-preferences-change',update)}
  },[])
  return <div className={`${s.shell} ${gameFonts} ${immersive ? s.immersive : ''}`} data-reduced-motion={reducedMotion || undefined}>
    {!immersive && <>
      {drawer && <button className={s.scrim} aria-label="Close navigation" onClick={() => setDrawer(false)}/>}
      <aside className={`${s.sidebar} ${drawer ? s.drawerOpen : ''}`} aria-label="Main navigation">
        <Link className={s.homeMark} href="/student/home" aria-label="ExamPrep home"><IllustratedIcon name="mark" size={44}/></Link>
        <nav>{NAV.map(([id,label,href,icon]) => {
          const active = id === 'battle' ? path.startsWith(href) : id === 'practice' ? path === href : path === href || (id === 'home' && path === '/student')
          return <Link key={id} href={href} className={active ? s.navActive : ''} aria-current={active ? 'page' : undefined} onClick={() => setDrawer(false)}><GameGlyph name={icon}/><span>{label}</span></Link>
        })}</nav>
        <Link className={s.settingsLink} href="/student/profile" onClick={() => setDrawer(false)}><GameGlyph name="settings"/><span>Settings</span></Link>
      </aside>
    </>}
    <div className={s.world}>
      <div className={s.scenery} aria-hidden="true"><Image src="/images/battle/design/courtyard.png" alt="" fill sizes="100vw" quality={75} priority className={s.sceneryArt}/></div>
      {!immersive && <header className={s.header}>
        <button className={s.menu} aria-label={drawer ? 'Close navigation' : 'Open navigation'} aria-expanded={drawer} onClick={() => setDrawer(v => !v)}><GameGlyph name="menu"/></button>
        <Link href="/student/home" className={s.brandLink}><GameLogo/></Link>
        <PlayerStats profile={profile}/>
        <Link href="/student/profile" className={s.avatar} aria-label="Your profile"><span className={s.avatarPortrait}><Image src="/images/battle/design/guide.png" alt="" width={100} height={91}/></span><span className={s.avatarChevron}>⌄</span></Link>
      </header>}
      {children}
    </div>
  </div>
}


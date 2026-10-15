'use client'
// Mobile student shell: real brand mark, live XP and accessible theme switch.
import Image from 'next/image'
import Link from 'next/link'
import { usePoints } from '@/contexts/PointsContext'
import { useTheme } from '@/contexts/ThemeContext'
import AppIcon from '@/components/ui/AppIcon'
import s from './MobileTopbar.module.css'
import { getRankProgress } from '@/lib/ranks'

export function StudentBrand() {
  return <Link href="/student/home" className={s.brand} aria-label="ExamPrep A1 home">
    <span className={s.mark}><Image src="/icons/launch-mark.webp" alt="" width={42} height={42} priority/></span>
    <strong>ExamPrep A1</strong>
  </Link>
}

function HeaderControls({ children }) {
  const { dark, toggle } = useTheme()
  const { totalPoints } = usePoints()
  const xpLabel = totalPoints >= 10000 ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(totalPoints) : totalPoints.toLocaleString()
  return <div className={s.controls}>
      <Link href="/student/progress" className={s.xp} aria-label={`${totalPoints.toLocaleString()} XP, view progress`}>
        <span className={s.bolt}><AppIcon name="bolt" size={19}/></span><span suppressHydrationWarning>{xpLabel}<small>XP</small></span>
      </Link>
      {children}
      <button type="button" className={s.theme} onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}><AppIcon name={dark ? 'sun' : 'moon'} size={20}/></button>
    </div>
}

export default function MobileTopbar() {
  return <header className={s.bar}><StudentBrand/><HeaderControls/></header>
}

export function DesktopTopbar({ name }) {
  const { totalPoints } = usePoints()
  return <header className={s.desktopBar}>
    <input className={s.search} aria-label="Search topics, questions and exams" placeholder="Search topics, questions, exams…"/>
    <HeaderControls><Link href="/student/profile" className={s.profile} aria-label={`${name || 'Student'}, view profile`}>
      <span className={s.avatar}>{(name || 'A1').slice(0,2).toUpperCase()}</span>
      <span className={s.profileName}><strong>{name || 'Student'}</strong><small>{getRankProgress(totalPoints || 0).name}</small></span>
    </Link></HeaderControls>
  </header>
}

'use client'
// Mobile student shell: real brand mark, live XP and accessible theme switch.
import Image from 'next/image'
import Link from 'next/link'
import { usePoints } from '@/contexts/PointsContext'
import { useTheme } from '@/contexts/ThemeContext'
import AppIcon from '@/components/ui/AppIcon'
import s from './MobileTopbar.module.css'

export default function MobileTopbar({ activeId, pageTitle }) {
  const { dark, toggle } = useTheme()
  const { totalPoints } = usePoints()
  const xpLabel = totalPoints >= 10000 ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(totalPoints) : totalPoints.toLocaleString()
  return <header className={s.bar}>
    <Link href="/student/home" className={s.brand} aria-label="ExamPrep home">
      <span className={s.mark}><Image src="/icons/launch-mark.webp" alt="" width={42} height={42} priority/></span>
      <span><strong>{activeId === 'home' || activeId === 'practice' ? 'ExamPrep' : pageTitle}</strong><small>EXL Learning World</small></span>
    </Link>
    <div className={s.controls}>
      <Link href="/student/progress" className={s.xp} aria-label={`${totalPoints.toLocaleString()} XP, view progress`}>
        <span className={s.bolt}><AppIcon name="bolt" size={19}/></span><span suppressHydrationWarning>{xpLabel}<small>XP</small></span>
      </Link>
      <button type="button" className={s.theme} onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}><AppIcon name={dark ? 'sun' : 'moon'} size={20}/></button>
    </div>
  </header>
}

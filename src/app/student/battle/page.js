'use client'
import { useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BattleWorld, BattleSign, styles } from '@/components/battle/BattleWorld'
import BattleSettings from '@/components/battle/BattleSettings'
import IllustratedIcon from '@/components/battle/IllustratedIcon'
import { GameGlyph } from '@/components/student/GameShell'

// The battle hub. "Your recent battles" (RecentForm) returns with
// player-vs-player; the battle leaderboard is the competitive view for now.
export default function BattlePage() {
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  return <BattleWorld hub guide={{title:'Hey there!',text:'Ready to test your knowledge and climb the ranks?'}}
    header={<BattleSign crest title="Welcome to|battle mode">Test your knowledge. Sharpen your skills. Beat the computer!</BattleSign>}>
    <button type="button" className={`${styles.primary} ${styles.battleButton}`} onClick={() => router.push('/student/battle/setup')}>
      <Image src="/images/battle/design/robot-book.png" alt="" width={1353} height={1162} sizes="150px" priority/>
      <span><strong>BATTLE</strong><small>Play against the computer</small></span>
      <span className={styles.actionArrow} aria-hidden="true"><GameGlyph name="arrow"/></span>
    </button>
    <div className={styles.links}>
      <Link className={styles.secondary} href="/student/battle/leaderboard"><IllustratedIcon name="trophy" size={null} className={styles.linkIcon}/><span><strong>Leaderboard</strong><small>Top battlers this week</small></span><GameGlyph name="arrow"/></Link>
      <button type="button" className={styles.secondary} onClick={() => setSettingsOpen(true)}><IllustratedIcon name="settings" size={null} className={styles.linkIcon}/><span><strong>Settings</strong><small>Customize your battle</small></span><GameGlyph name="arrow"/></button>
    </div>
    {settingsOpen && <BattleSettings onClose={closeSettings}/>}
  </BattleWorld>
}

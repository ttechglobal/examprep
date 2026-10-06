'use client'
import { useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BattleWorld, BattleSign, styles } from '@/components/battle/BattleWorld'
import BattleSettings from '@/components/battle/BattleSettings'
import BattleMissions from '@/components/battle/BattleMissions'
import IllustratedIcon from '@/components/battle/IllustratedIcon'
import { GameGlyph } from '@/components/student/GameShell'
import { usePlan } from '@/contexts/PlanContext'

// The battle hub. "Your recent battles" (RecentForm) returns with
// player-vs-player; the battle leaderboard is the competitive view for now.
// Free plan: the Battle button says how many of today's free battles are
// left and offers Premium once they're gone (lib/plans.js).
export default function BattlePage() {
  const router = useRouter()
  const plan = usePlan()
  const battles = plan.access('battle')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  return <BattleWorld hub guide={{title:'Hey there!',text:'Ready to test your knowledge and climb the ranks?'}}
    header={<BattleSign crest title="Welcome to|battle mode">Test your knowledge. Sharpen your skills. Beat the computer!</BattleSign>}>
    <button type="button" className={`${styles.primary} ${styles.battleButton}`} onClick={() => { if (plan.gate('battle')) router.push('/student/battle/setup') }}>
      <Image src="/images/battle/design/robot-book.png" alt="" width={1353} height={1162} sizes="150px" priority/>
      <span><strong>BATTLE</strong><small>Play against the computer</small>
        {battles.limit != null && <small className={styles.allowance}>{battles.remaining > 0 ? `${battles.remaining} free ${battles.remaining === 1 ? 'battle' : 'battles'} left today` : '👑 Go Premium for more battles today'}</small>}</span>
      <span className={styles.actionArrow} aria-hidden="true"><GameGlyph name="arrow"/></span>
    </button>
    <BattleMissions/>
    <div className={styles.links}>
      <Link className={styles.secondary} href="/student/battle/leaderboard"><IllustratedIcon name="trophy" size={null} className={styles.linkIcon}/><span><strong>Leaderboard</strong><small>Top battlers this week</small></span><GameGlyph name="arrow"/></Link>
      <button type="button" className={styles.secondary} onClick={() => setSettingsOpen(true)}><IllustratedIcon name="settings" size={null} className={styles.linkIcon}/><span><strong>Settings</strong><small>Customize your battle</small></span><GameGlyph name="arrow"/></button>
    </div>
    {settingsOpen && <BattleSettings onClose={closeSettings}/>}
  </BattleWorld>
}

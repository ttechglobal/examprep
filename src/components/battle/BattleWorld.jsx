'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import GameShell, { GameGlyph } from '@/components/student/GameShell'
import { useStudentUser } from '@/app/student/layout'
import { usePoints } from '@/contexts/PointsContext'
import { useBattleExperience } from './BattleExperience'
import IllustratedIcon from './IllustratedIcon'
import styles from './BattleWorld.module.css'
export { styles }

const cx = (...names) => names.filter(Boolean).join(' ')

// One frame for every battle-world screen (BattleWorld.module.css):
//   bar     Exit (hub only: nothing else in the world can leave it) or Back on
//           the left; the player's XP and avatar on the right
//   stage   desktop: guide column | main column. Phones: one scrolling column.
//   header  the screen's board. Phones show it first, then the guide strip,
//           then the content; desktop keeps the guide in its own column.
//   main    scroll area + dock. The dock's actions stay on screen while long
//           selections scroll; on phones it sticks to the bottom.
//   onBack     shows a Back button in the bar
//   bar        false hides the bar (the countdown)
//   scrollKey  a new value scrolls back to the top (e.g. the next setup step)
//   centered   centre the content vertically (the hub always is)
export function BattleWorld({ children, header, hub = false, guide, dock, onBack, bar = true, wide = false, label = 'Battle mode', scrollKey, centered = false }) {
  const profile = useStudentUser()
  const experience = useBattleExperience()
  const stage = useRef(null), scroller = useRef(null)
  useEffect(() => {
    // Desktop scrolls the main column; phones scroll the whole stage.
    stage.current?.scrollTo({top:0})
    scroller.current?.scrollTo({top:0})
  }, [scrollKey])
  return <GameShell immersive profile={profile}>
    <section className={cx(styles.world, hub && styles.hub, centered && styles.centered, !guide && styles.noGuide, wide && styles.wide)} aria-label={label}>
      {bar && <div className={styles.bar}>
        {hub ? <button type="button" className={styles.barButton} onClick={experience?.exit}><GameGlyph name="arrow" size={18}/>Exit</button>
          : onBack ? <button type="button" className={styles.barButton} onClick={onBack}><GameGlyph name="arrow" size={18}/>Back</button>
          : <span/>}
        <PlayerBadge profile={profile}/>
      </div>}
      <div className={styles.stage} ref={stage}>
        {guide && <BattleGuide title={guide.title}>{guide.text}</BattleGuide>}
        <div className={styles.main}>
          <div className={styles.scroller} ref={scroller}><div className={styles.content}>
            {header}
            {guide && <BattleGuide strip title={guide.title}>{guide.text}</BattleGuide>}
            {children}
          </div></div>
          {dock && <footer className={styles.dock}>{dock}</footer>}
        </div>
      </div>
    </section>
  </GameShell>
}
// The player's XP and avatar (initials; there are no profile photos yet).
// Display only: inside the battle world, only the hub's Exit leaves it.
function PlayerBadge({ profile }) {
  const { totalPoints } = usePoints()
  const name = (profile?.full_name || profile?.username || '').trim()
  const initials = name ? name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() : 'ME'
  return <div className={styles.player} aria-label={`${name || 'You'}: ${(totalPoints || 0).toLocaleString()} XP`} role="group">
    <span className={styles.xpPill}><IllustratedIcon name="xp" size={null} className={styles.xpIcon}/><strong>{(totalPoints || 0).toLocaleString()}</strong><small>XP</small></span>
    <span className={styles.avatar} title={name || 'You'} aria-hidden="true">{initials}</span>
  </div>
}
// The mascot and its speech bubble: a column beside the content on desktop,
// a strip under the header on phones (`strip`; CSS shows one or the other).
export function BattleGuide({ title, children, strip = false }) {
  return <aside className={cx(styles.guide, strip && styles.guideStrip)} aria-label="Your battle guide">
    <div className={styles.figure}>
      <Image src="/images/battle/design/guide.png" alt="Your smiling A1 battle guide, pointing toward your next challenge" width={1317} height={1194} sizes={strip ? '140px' : '480px'} priority={!strip} loading={strip ? 'eager' : undefined} className={styles.mascot}/>
      <div className={styles.speech}><strong>{title}</strong><p>{children}</p></div>
    </div>
  </aside>
}
// The wooden board. `hero` adds the crossed-sword crest above it.
export function BattleSign({ title, children, crest = false, compact = false }) {
  const words = title.split('|')
  return <div className={cx(styles.signWrap, crest && styles.heroSign, compact && styles.compactSign)}>
    <div className={styles.sign}>
      {crest && <Image className={styles.crest} src="/images/battle/design/crest.png" alt="" width={1254} height={1254} sizes="220px" priority/>}
      <h1>{words.length > 1 && <span>{words[0]}</span>}<strong>{words.at(-1)}</strong></h1>
      {children && <p>{children}</p>}
    </div>
  </div>
}
export function BattleChoice({ icon, title, description, selected, large, onClick, direct, children, ...props }) {
  return <button type="button" className={cx(styles.card, selected && styles.selected, large && styles.large)} aria-pressed={!!selected} onClick={onClick} {...props}>
    {!direct && <span className={cx(styles.check, selected && styles.checked)} aria-hidden="true">{selected ? '✓' : ''}</span>}
    <IllustratedIcon name={icon} size={null} className={styles.cardIcon}/>
    <span className={styles.cardText}><strong>{title}</strong>{description && <small>{description}</small>}{children}</span>
    {direct && <span className={styles.cardArrow} aria-hidden="true"><GameGlyph name="arrow"/></span>}
  </button>
}
export function GameButton({ children, secondary = false, arrow = false, className = '', ...props }) {
  return <button type="button" className={cx(secondary ? styles.secondary : styles.primary, className)} {...props}>{children}{arrow && <span className={styles.actionArrow} aria-hidden="true"><GameGlyph name="arrow"/></span>}</button>
}
